import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/utils/supabaseAdmin';
import { requireRole } from '@/utils/auth';
import { logAction } from '@/utils/auditLog';

/**
 * POST /api/appointments/admin-save
 * Create or update an appointment in Supabase.
 * Uses service-role client — requires admin/doctor/receptionist authentication.
 *
 * Accepts body fields matching DB column names:
 *   appointment_date (required), appointment_time, status,
 *   notes, patient_name, appointment_type, fees, paid_amount, 
 *   doctor_id, id (for updates)
 */
export async function POST(request) {
    // Check authentication - require admin, doctor, or receptionist role
    const { user, response: authError } = await requireRole(request, ['admin', 'doctor', 'receptionist']);

    if (authError) {
        return authError;
    }

    const userId = user?.id;

    try {
        const body = await request.json();

        const {
            id: existingId,
            appointment_date,
            appointment_time,
            status,
            notes,
            patient_name,
            appointment_type,
            fees,
            paid_amount,
            doctor_id,
            mobile_number,
            gender,
        } = body;

        // If this is an update (existingId provided), allow partial updates
        if (existingId) {
            // Build only the fields that are provided
            const updateData = {};

            if (status) {
                // Map status values - handle both old and new status names
                const validStatuses = ['pending', 'confirmed', 'completed', 'cancelled', 'paid', 'unpaid', 'rejected'];
                updateData.status = validStatuses.includes(status.toLowerCase()) ? status : 'pending';
            }
            if (appointment_date) updateData.appointment_date = appointment_date;
            if (appointment_time !== undefined) updateData.appointment_time = appointment_time || null;
            if (notes !== undefined) updateData.notes = notes || null;
            if (patient_name !== undefined) updateData.patient_name = patient_name || null;
            if (appointment_type !== undefined) updateData.appointment_type = appointment_type || null;
            if (fees !== undefined) updateData.fees = parseInt(fees) || 0;
            if (paid_amount !== undefined) updateData.paid_amount = parseInt(paid_amount) || 0;
            if (mobile_number !== undefined) updateData.mobile_number = mobile_number || null;
            if (gender !== undefined) updateData.gender = gender || null;

            console.log('[admin-save] Updating record:', existingId, JSON.stringify(updateData));

            let { error } = await supabaseAdmin
                .from('appointments').update(updateData).eq('id', existingId);
            if (error) {
                console.error('[admin-save] update error:', error);
                return NextResponse.json({ success: false, error: error.message, details: error }, { status: 400 });
            }

            // Log the action for audit
            await logAction(userId, 'updated_appointment_via_admin_save', existingId, 'appointments');

            return NextResponse.json({ success: true, id: existingId });
        }

        // For new appointments, appointment_date is required
        if (!appointment_date) {
            return NextResponse.json(
                { success: false, error: 'appointment_date is required' },
                { status: 400 }
            );
        }

        // Validate doctor_id - it's required for new appointments
        if (!doctor_id) {
            return NextResponse.json(
                { success: false, error: 'doctor_id is required' },
                { status: 400 }
            );
        }

        // Validate that doctor_id is a valid UUID format
        if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(doctor_id)) {
            return NextResponse.json(
                { success: false, error: 'Invalid doctor_id format' },
                { status: 400 }
            );
        }

        // Verify the doctor exists in doctors table
        const { data: doctor } = await supabaseAdmin
            .from('doctors')
            .select('id')
            .eq('id', doctor_id)
            .single();

        if (!doctor) {
            return NextResponse.json(
                { success: false, error: 'Doctor not found or invalid' },
                { status: 404 }
            );
        }

        // Full record — base fields that should always exist
        const fullRecord = {
            doctor_id,
            appointment_date,
            appointment_time: appointment_time || null,
            status: (status && ['pending', 'confirmed', 'completed', 'cancelled', 'paid', 'unpaid', 'rejected'].includes(status.toLowerCase())) ? status : 'pending',
            notes: notes || null,
            patient_name: patient_name || null,
            appointment_type: appointment_type || null,
            fees: fees ? parseInt(fees) : 0,
            paid_amount: paid_amount ? parseInt(paid_amount) : 0,
        };

        console.log('[admin-save] Inserting record:', JSON.stringify(fullRecord));

        // Add optional fields if provided - these may not exist in older databases
        if (mobile_number) {
            fullRecord.mobile_number = mobile_number;
        }
        if (gender) {
            fullRecord.gender = gender;
        }

        console.log('[admin-save] Full record:', JSON.stringify(fullRecord));

        let { data, error } = await supabaseAdmin
            .from('appointments').insert(fullRecord).select('id').single();
        if (error) {
            console.error('[admin-save] insert error:', error);
            return NextResponse.json({ success: false, error: error.message, details: error }, { status: 400 });
        }

        // Log the action for audit
        await logAction(userId, 'created_appointment_via_admin_save', data.id, 'appointments');

        return NextResponse.json({ success: true, id: data.id });
    } catch (err) {
        console.error('[admin-save] unexpected error:', err);
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
}
