import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/utils/supabaseAdmin';
import { requireRole } from '@/utils/auth';
import { logAction } from '@/utils/auditLog';

// PUT: Update service by ID (admin only)
export async function PUT(request, { params }) {
    // Check authentication and authorization - admin only for updating services
    const { user, response: authError } = await requireRole(request, ['admin']);

    if (authError) {
        return authError;
    }

    const userId = user?.id;

    try {
        const { id } = await params;

        // Check if service exists before updating
        const { data: existing } = await supabaseAdmin
            .from('services')
            .select('id, name')
            .eq('id', id)
            .single();

        if (!existing) {
            return NextResponse.json(
                { success: false, error: 'Service not found' },
                { status: 404 }
            );
        }

        const { name, description } = await request.json();

        // Validate name
        if (!name || typeof name !== 'string' || name.trim().length === 0) {
            return NextResponse.json(
                { success: false, error: 'Name is required and must be a non-empty string' },
                { status: 400 }
            );
        }

        const { data, error } = await supabaseAdmin
            .from('services')
            .update({ name: name.trim(), description: description?.trim() || null })
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
        await logAction(userId, 'updated_service', id, 'services');

        return NextResponse.json({ success: true, data });
    } catch (e) {
        console.error('PUT /api/admin/services/[id] error:', e);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}

// DELETE: Remove service by ID (admin only)
export async function DELETE(request, { params }) {
    // Check authentication and authorization - admin only for deleting services
    const { user, response: authError } = await requireRole(request, ['admin']);

    if (authError) {
        return authError;
    }

    const userId = user?.id;

    try {
        const { id } = await params;

        // Check if service exists before deleting
        const { data: existing } = await supabaseAdmin
            .from('services')
            .select('id, name')
            .eq('id', id)
            .single();

        if (!existing) {
            return NextResponse.json(
                { success: false, error: 'Service not found' },
                { status: 404 }
            );
        }

        const { error } = await supabaseAdmin.from('services').delete().eq('id', id);

        if (error) {
            return NextResponse.json(
                { success: false, error: error.message },
                { status: 400 }
            );
        }

        // Log the action for audit
        await logAction(userId, 'deleted_service', id, 'services');

        return NextResponse.json({ success: true });
    } catch (e) {
        console.error('DELETE /api/admin/services/[id] error:', e);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}
