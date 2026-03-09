import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/utils/supabaseAdmin';
import { logAction } from '@/utils/auditLog';
import { uploadMedicalFile, getMedicalFileUrl } from '@/utils/storage';
import { requireRole } from '@/utils/auth';

// GET: Fetch records by patient_id (staff/doctor only)
export async function GET(request) {
    // Check authentication and authorization in one call (avoids double auth check)
    const { user, response: authError } = await requireRole(request, ['admin', 'doctor']);

    if (authError) {
        return authError;
    }

    try {
        const { searchParams } = new URL(request.url);
        const patientId = searchParams.get('patient_id');
        const userId = user?.id;

        if (!patientId) {
            return NextResponse.json(
                { success: false, error: 'Patient ID is required' },
                { status: 400 }
            );
        }

        const { data, error } = await supabaseAdmin
            .from('medical_records')
            .select(`
        *,
        doctor:profiles!medical_records_doctor_id_fkey(full_name, specialization),
        patient:patients!medical_records_patient_id_fkey(full_name)
      `)
            .eq('patient_id', patientId)
            .order('visit_date', { ascending: false });

        if (error) {
            return NextResponse.json(
                { success: false, error: error.message },
                { status: 400 }
            );
        }

        // Log the action for audit
        await logAction(userId, 'viewed_medical_records', patientId, 'medical_records');

        return NextResponse.json({ success: true, data });
    } catch (error) {
        console.error('GET medical records error:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}

// POST: Create a new medical record (doctor only, with optional file upload)
export async function POST(request) {
    // Check authentication and authorization in one call (avoids double auth check)
    const { user, response: authError } = await requireRole(request, ['admin', 'doctor']);

    if (authError) {
        return authError;
    }

    try {
        const userId = user?.id;
        const contentType = request.headers.get('content-type');

        let body;
        let file = null;

        if (contentType && contentType.includes('multipart/form-data')) {
            const formData = await request.formData();
            body = {};

            // Extract text fields and file
            for (const [key, value] of formData.entries()) {
                if (key !== 'file') {
                    body[key] = value;
                } else {
                    file = value;
                }
            }
        } else {
            body = await request.json();
        }

        const { patient_id, doctor_id, diagnosis, prescription, visit_date, file_url } = body;

        // Validate required fields
        if (!patient_id) {
            return NextResponse.json(
                { success: false, error: 'Patient ID is required' },
                { status: 400 }
            );
        }

        // Handle file upload if provided
        let uploadedFileUrl = file_url;
        if (file) {
            const uploadResult = await uploadMedicalFile(file, patient_id);
            if (uploadResult.success) {
                uploadedFileUrl = uploadResult.filePath;
            }
        }

        const { data, error } = await supabaseAdmin
            .from('medical_records')
            .insert({
                patient_id,
                doctor_id: doctor_id || userId,
                diagnosis,
                prescription,
                visit_date: visit_date || new Date().toISOString().split('T')[0],
                file_url: uploadedFileUrl
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
        await logAction(userId, 'created_medical_record', data.id, 'medical_records');

        return NextResponse.json({ success: true, data });
    } catch (error) {
        console.error('POST medical record error:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}
