import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/utils/supabaseAdmin';
import { requireRole } from '@/utils/auth';
import { logAction } from '@/utils/auditLog';

// DELETE: Hard-delete an appointment by Supabase UUID (admin only)
export async function DELETE(request, { params }) {
    // Check authentication and authorization - admin only for hard deletes
    const { user, response: authError } = await requireRole(request, ['admin']);

    if (authError) {
        return authError;
    }

    const userId = user?.id;

    try {
        const { id } = await params;

        // Check if appointment exists before deleting
        const { data: existing } = await supabaseAdmin
            .from('appointments')
            .select('id, patient_name, doctor_id')
            .eq('id', id)
            .single();

        if (!existing) {
            return NextResponse.json(
                { success: false, error: 'Appointment not found' },
                { status: 404 }
            );
        }

        const { error } = await supabaseAdmin.from('appointments').delete().eq('id', id);

        if (error) {
            return NextResponse.json(
                { success: false, error: error.message },
                { status: 400 }
            );
        }

        // Log the action for audit
        await logAction(userId, 'deleted_appointment', id, 'appointments');

        return NextResponse.json({ success: true });
    } catch (e) {
        console.error('DELETE /api/admin/appointments/[id] error:', e);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}
