import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/utils/supabaseAdmin';
import { logAction } from '@/utils/auditLog';
import { requireRole, getCurrentUser } from '@/utils/auth';

// GET: Fetch all appointments (staff only)
export async function GET(request) {
    // Check authentication and authorization in one call (avoids double auth check)
    const { user, response: authError } = await requireRole(request, ['admin', 'doctor', 'receptionist']);

    if (authError) {
        return authError;
    }

    try {
        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status');
        const doctorId = searchParams.get('doctor_id');
        const patientId = searchParams.get('patient_id');
        const userId = user?.id;

        let query = supabaseAdmin
            .from('appointments')
            .select(`
        *,
        patient:patients(*),
        doctor:profiles!appointments_doctor_id_fkey(full_name, role)
      `)
            .order('appointment_date', { ascending: false });

        if (status) {
            query = query.eq('status', status);
        }

        if (doctorId) {
            query = query.eq('doctor_id', doctorId);
        }

        if (patientId) {
            query = query.eq('patient_id', patientId);
        }

        const { data, error } = await query;

        if (error) {
            return NextResponse.json(
                { success: false, error: error.message },
                { status: 400 }
            );
        }

        return NextResponse.json({ success: true, data });
    } catch (error) {
        console.error('GET appointments error:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}

// POST: Create a new appointment (public for booking, staff for management)
export async function POST(request) {
    try {
        // Check if user is authenticated (optional - for staff bookings)
        // Use getCurrentUser directly since auth is optional here
        const { user } = await getCurrentUser(request);
        const userId = user?.id;

        const body = await request.json();
        const {
            patient_id,
            doctor_id,
            appointment_date,
            appointment_time,
            notes,
            patient_name,
            mobile_number,
            gender,
            appointment_type,
            fees
        } = body;

        // Validate required fields
        if (!appointment_date) {
            return NextResponse.json(
                { success: false, error: 'Appointment date is required' },
                { status: 400 }
            );
        }

        // Validate doctor_id - must be provided and a valid UUID
        if (!doctor_id) {
            return NextResponse.json(
                { success: false, error: 'Doctor is required. Please select a doctor.' },
                { status: 400 }
            );
        }

        // Validate doctor_id format
        if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(doctor_id)) {
            return NextResponse.json(
                { success: false, error: 'Invalid doctor ID format' },
                { status: 400 }
            );
        }

        // Verify doctor exists in doctors table
        const { data: doctor } = await supabaseAdmin
            .from('doctors')
            .select('id')
            .eq('id', doctor_id)
            .single();

        if (!doctor) {
            return NextResponse.json(
                { success: false, error: 'Doctor not found' },
                { status: 404 }
            );
        }

        // Check if patient exists
        if (patient_id) {
            const { data: patient } = await supabaseAdmin
                .from('patients')
                .select('id')
                .eq('id', patient_id)
                .single();

            if (!patient) {
                return NextResponse.json(
                    { success: false, error: 'Patient not found' },
                    { status: 404 }
                );
            }
        }

        const { data, error } = await supabaseAdmin
            .from('appointments')
            .insert({
                patient_id,
                doctor_id,
                appointment_date,
                appointment_time,
                notes,
                status: 'pending',
                patient_name,
                mobile_number,
                gender,
                appointment_type,
                fees
            })
            .select()
            .single();

        if (error) {
            return NextResponse.json(
                { success: false, error: error.message },
                { status: 400 }
            );
        }

        // Log the action for audit
        await logAction(userId, 'created_appointment', data.id, 'appointments');

        return NextResponse.json({ success: true, data });
    } catch (error) {
        console.error('POST appointment error:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}
