import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/utils/supabaseAdmin';
import { uploadDoctorImage } from '@/utils/storage';
import { requireRole } from '@/utils/auth';

// GET: All doctors (admin, doctor, receptionist only)
export async function GET(request) {
    // Check authentication and authorization
    const { user, response: authError } = await requireRole(request, ['admin', 'doctor', 'receptionist']);

    if (authError) {
        return authError;
    }

    try {
        const { data, error } = await supabaseAdmin
            .from('doctors').select('*').order('full_name', { ascending: true });
        if (error) return NextResponse.json({ success: false, error: error.message }, { status: 400 });
        return NextResponse.json({ success: true, data });
    } catch (e) {
        console.error('GET /api/admin/doctors error:', e);
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
}

// POST: Add a new doctor (admin only)
export async function POST(request) {
    // Check authentication and authorization - admin only for creating doctors
    const { user, response: authError } = await requireRole(request, ['admin']);

    if (authError) {
        return authError;
    }

    try {
        const formData = await request.formData();
        const full_name = formData.get('full_name');
        const opd_hours = formData.get('opd_hours') || null;
        const qualifications = JSON.parse(formData.get('qualifications') || '[]');
        const specializations = JSON.parse(formData.get('specializations') || '[]');
        const opd_schedule = JSON.parse(formData.get('opd_schedule') || 'null');
        const fees = parseInt(formData.get('fees')) || 0;
        const imageFile = formData.get('image');

        // Validate required fields
        if (!full_name) {
            return NextResponse.json(
                { success: false, error: 'Full name is required' },
                { status: 400 }
            );
        }

        // Derive simple string fields for existing columns
        const specialization = specializations[0] || null;
        const qualification = qualifications.join(', ') || null;

        // Try inserting with all columns (extended schema).
        // If the extended columns don't exist yet, fall back to core-only insert.
        let doctor;
        const fullRow = { full_name, specialization, qualification, opd_hours, qualifications, specializations, opd_schedule, fees };
        const { data, error } = await supabaseAdmin
            .from('doctors').insert(fullRow).select().single();

        if (error) {
            // If the error is about an unknown column, retry with core columns only
            const isColumnError = error.message && (
                error.message.includes('column') ||
                error.message.includes('schema') ||
                error.message.includes('Could not find')
            );
            if (isColumnError) {
                console.warn('[doctors POST] Extended columns not available, falling back to core columns');
                const coreRow = { full_name, specialization, qualification };
                const { data: coreData, error: coreError } = await supabaseAdmin
                    .from('doctors').insert(coreRow).select().single();
                if (coreError) {
                    return NextResponse.json({ success: false, error: coreError.message }, { status: 400 });
                }
                doctor = coreData;
            } else {
                return NextResponse.json({ success: false, error: error.message }, { status: 400 });
            }
        } else {
            doctor = data;
        }

        if (imageFile && imageFile.size > 0) {
            const result = await uploadDoctorImage(imageFile, doctor.id);
            if (result.success) {
                await supabaseAdmin.from('doctors').update({ image_url: result.publicUrl }).eq('id', doctor.id);
            }
        }
        return NextResponse.json({ success: true, data: doctor });
    } catch (e) {
        console.error('POST /api/admin/doctors error:', e);
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
}
