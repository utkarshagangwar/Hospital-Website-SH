import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/utils/supabaseAdmin';
import { logAction } from '@/utils/auditLog';
import { requireRole } from '@/utils/auth';

// GET: Fetch single patient with their appointments and records
export async function GET(request, { params }) {
    // Check authentication and authorization in one call (avoids double auth check)
    const { user, response: authError } = await requireRole(request, ['admin', 'doctor', 'receptionist']);
    
    if (authError) {
        return authError;
    }
    
    try {
        const { id } = params;
        const userId = user?.id;

        // Get patient details
        const { data: patient, error: patientError } = await supabaseAdmin
            .from('patients')
            .select('*')
            .eq('id', id)
            .single();

        if (patientError) {
            return NextResponse.json(
                { success: false, error: patientError.message },
                { status: 404 }
            );
        }

        // Get patient's appointments
        const { data: appointments } = await supabaseAdmin
            .from('appointments')
            .select(`
        *,
        doctor:profiles!appointments_doctor_id_fkey(full_name, specialization)
      `)
            .eq('patient_id', id)
            .order('appointment_date', { ascending: false });

        // Get patient's medical records
        const { data: medicalRecords } = await supabaseAdmin
            .from('medical_records')
            .select(`
        *,
        doctor:profiles!medical_records_doctor_id_fkey(full_name, specialization)
      `)
            .eq('patient_id', id)
            .order('visit_date', { ascending: false });

        // Log the action for audit
        await logAction(userId, 'viewed_patient', id, 'patients');

        return NextResponse.json({
            success: true,
            data: {
                ...patient,
                appointments,
                medical_records: medicalRecords
            }
        });
    } catch (error) {
        console.error('GET patient error:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}

// PATCH: Update patient details (staff only)
export async function PATCH(request, { params }) {
    // Check authentication and authorization in one call (avoids double auth check)
    const { user, response: authError } = await requireRole(request, ['admin', 'doctor', 'receptionist']);
    
    if (authError) {
        return authError;
    }
    
    try {
        const { id } = params;
        const body = await request.json();
        const userId = user?.id;
        const { full_name, date_of_birth, gender, phone, address, blood_group } = body;

        // Check if patient exists
        const { data: existing } = await supabaseAdmin
            .from('patients')
            .select('*')
            .eq('id', id)
            .single();

        if (!existing) {
            return NextResponse.json(
                { success: false, error: 'Patient not found' },
                { status: 404 }
            );
        }

        // Build update object
        const updateData = {};
        if (full_name) updateData.full_name = full_name;
        if (date_of_birth) updateData.date_of_birth = date_of_birth;
        if (gender) updateData.gender = gender;
        if (phone) updateData.phone = phone;
        if (address) updateData.address = address;
        if (blood_group) updateData.blood_group = blood_group;

        const { data, error } = await supabaseAdmin
            .from('patients')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            return NextResponse.json(
                { success: false, error: error.message },
                { status: 400 }
            );
        }

        // Log the action for audit
        await logAction(userId, 'updated_patient', id, 'patients');

        return NextResponse.json({ success: true, data });
    } catch (error) {
        console.error('PATCH patient error:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}

// DELETE: Delete patient (admin only)
export async function DELETE(request, { params }) {
    // Check authentication and authorization in one call (avoids double auth check)
    const { user, response: authError } = await requireRole(request, ['admin']);
    
    if (authError) {
        return authError;
    }
    
    try {
        const { id } = params;
        const userId = user?.id;

        // Check if patient exists
        const { data: existing } = await supabaseAdmin
            .from('patients')
            .select('*')
            .eq('id', id)
            .single();

        if (!existing) {
            return NextResponse.json(
                { success: false, error: 'Patient not found' },
                { status: 404 }
            );
        }

        const { error } = await supabaseAdmin
            .from('patients')
            .delete()
            .eq('id', id);

        if (error) {
            return NextResponse.json(
                { success: false, error: error.message },
                { status: 400 }
            );
        }

        // Log the action for audit
        await logAction(userId, 'deleted_patient', id, 'patients');

        return NextResponse.json({ success: true, message: 'Patient deleted successfully' });
    } catch (error) {
        console.error('DELETE patient error:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}
