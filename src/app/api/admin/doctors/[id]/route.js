import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/utils/supabaseAdmin';
import { uploadDoctorImage } from '@/utils/storage';
import { requireRole } from '@/utils/auth';
import { logAction } from '@/utils/auditLog';

// PUT: Update doctor by ID (admin only)
export async function PUT(request, { params }) {
    // Check authentication and authorization - admin only for updating doctors
    const { user, response: authError } = await requireRole(request, ['admin']);

    if (authError) {
        return authError;
    }

    const userId = user?.id;

    try {
        // Next.js 15+: params is a Promise and must be awaited
        const { id } = await params;

        // Check if doctor exists before updating
        const { data: existing } = await supabaseAdmin
            .from('doctors')
            .select('id, full_name')
            .eq('id', id)
            .single();

        if (!existing) {
            return NextResponse.json(
                { success: false, error: 'Doctor not found' },
                { status: 404 }
            );
        }

        const formData = await request.formData();
        const full_name = formData.get('full_name');
        const opd_hours = formData.get('opd_hours') || null;
        const qualifications = JSON.parse(formData.get('qualifications') || '[]');
        const specializations = JSON.parse(formData.get('specializations') || '[]');
        const opd_schedule = JSON.parse(formData.get('opd_schedule') || 'null');
        const fees = parseInt(formData.get('fees')) || 0;
        const imageFile = formData.get('image');

        const specialization = specializations[0] || null;
        const qualification = qualifications.join(', ') || null;

        // Try updating with all columns (extended schema).
        // If the extended columns don't exist yet, fall back to core-only update.
        const fullUpdate = { full_name, specialization, qualification, opd_hours, qualifications, specializations, opd_schedule, fees };

        if (imageFile && imageFile.size > 0) {
            const result = await uploadDoctorImage(imageFile, id);
            if (result.success) fullUpdate.image_url = result.publicUrl;
        }

        const { data, error } = await supabaseAdmin
            .from('doctors').update(fullUpdate).eq('id', id).select().single();

        if (error) {
            // If the error is about an unknown column, retry with core columns only
            const isColumnError = error.message && (
                error.message.includes('column') ||
                error.message.includes('schema') ||
                error.message.includes('Could not find')
            );
            if (isColumnError) {
                console.warn('[doctors PUT] Extended columns not available, falling back to core columns');
                const coreUpdate = { full_name, specialization, qualification, opd_hours };
                if (fullUpdate.image_url) coreUpdate.image_url = fullUpdate.image_url;
                const { data: coreData, error: coreError } = await supabaseAdmin
                    .from('doctors').update(coreUpdate).eq('id', id).select().single();
                if (coreError) {
                    return NextResponse.json({ success: false, error: coreError.message }, { status: 400 });
                }
                // Log the action for audit
                await logAction(userId, 'updated_doctor', id, 'doctors');
                return NextResponse.json({ success: true, data: coreData });
            }
            return NextResponse.json({ success: false, error: error.message }, { status: 400 });
        }

        // Log the action for audit
        await logAction(userId, 'updated_doctor', id, 'doctors');

        return NextResponse.json({ success: true, data });
    } catch (e) {
        console.error('PUT /api/admin/doctors/[id] error:', e);
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
}

// DELETE: Remove doctor by ID (admin only)
export async function DELETE(request, { params }) {
    // Check authentication and authorization - admin only for deleting doctors
    const { user, response: authError } = await requireRole(request, ['admin']);

    if (authError) {
        return authError;
    }

    const userId = user?.id;

    try {
        // Next.js 15+: params is a Promise and must be awaited
        const { id } = await params;

        // Check if doctor exists before deleting
        const { data: existing } = await supabaseAdmin
            .from('doctors')
            .select('id, full_name')
            .eq('id', id)
            .single();

        if (!existing) {
            return NextResponse.json(
                { success: false, error: 'Doctor not found' },
                { status: 404 }
            );
        }

        const { error } = await supabaseAdmin.from('doctors').delete().eq('id', id);
        if (error) {
            return NextResponse.json({ success: false, error: error.message }, { status: 400 });
        }

        // Log the action for audit
        await logAction(userId, 'deleted_doctor', id, 'doctors');

        return NextResponse.json({ success: true });
    } catch (e) {
        console.error('DELETE /api/admin/doctors/[id] error:', e);
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
}
