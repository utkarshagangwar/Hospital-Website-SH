import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/utils/supabaseAdmin';
import { requireRole } from '@/utils/auth';
import { logAction } from '@/utils/auditLog';
import { ADMIN_ONLY, ASSIGNABLE_ROLES, PERMISSION_IDS } from '@/utils/roles';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// PUT: Update a staff account's role / name / password (admin only)
export async function PUT(request, { params }) {
    const { user: adminUser, response: authError } = await requireRole(request, ADMIN_ONLY);
    if (authError) return authError;

    try {
        const { id } = await params;
        if (!UUID_RE.test(id)) {
            return NextResponse.json({ success: false, error: 'Invalid user id' }, { status: 400 });
        }

        const body = await request.json();
        const { role, full_name, password, permissions } = body || {};

        // Admins cannot change their OWN role — prevents accidentally locking
        // the last admin out of staff management. The edit form always submits
        // the currently-selected role even when the admin is only updating
        // their name or password, so this must only block an actual change,
        // not merely the field's presence in the payload.
        if (role && id === adminUser.id) {
            const { data: currentProfile } = await supabaseAdmin
                .from('profiles')
                .select('role')
                .eq('id', id)
                .single();

            if (currentProfile?.role !== role) {
                return NextResponse.json(
                    { success: false, error: 'You cannot change your own role' },
                    { status: 400 }
                );
            }
        }

        // Validate custom permissions:
        //  - undefined → don't touch
        //  - null      → clear custom grants (fall back to role defaults)
        //  - array     → must contain only known permission ids
        let permsToSet;
        if (permissions !== undefined) {
            if (permissions === null) {
                permsToSet = null;
            } else if (Array.isArray(permissions) && permissions.every(p => PERMISSION_IDS.includes(p))) {
                permsToSet = permissions;
            } else {
                return NextResponse.json(
                    { success: false, error: `Invalid permissions. Allowed: ${PERMISSION_IDS.join(', ')}` },
                    { status: 400 }
                );
            }
        }

        if (role && !ASSIGNABLE_ROLES.includes(role)) {
            return NextResponse.json(
                { success: false, error: `Invalid role. Allowed: ${ASSIGNABLE_ROLES.join(', ')}` },
                { status: 400 }
            );
        }

        if (password !== undefined && (!password || password.length < 10)) {
            return NextResponse.json(
                { success: false, error: 'Password must be at least 10 characters' },
                { status: 400 }
            );
        }

        // Update auth-level fields (password / custom permissions) if requested.
        // Permissions go in app_metadata — writable only with the service role,
        // so staff can never edit their own grants.
        const authUpdate = {};
        if (password) authUpdate.password = password;
        if (permsToSet !== undefined) authUpdate.app_metadata = { permissions: permsToSet };
        if (Object.keys(authUpdate).length > 0) {
            const { error: pwError } = await supabaseAdmin.auth.admin.updateUserById(id, authUpdate);
            if (pwError) {
                return NextResponse.json({ success: false, error: pwError.message }, { status: 400 });
            }
        }

        // Update profile fields
        const profileUpdate = {};
        if (role) profileUpdate.role = role;
        if (full_name && full_name.trim()) profileUpdate.full_name = full_name.trim();

        if (Object.keys(profileUpdate).length > 0) {
            const { error: profError } = await supabaseAdmin
                .from('profiles')
                .update(profileUpdate)
                .eq('id', id);
            if (profError) {
                return NextResponse.json({ success: false, error: profError.message }, { status: 400 });
            }
        }

        await logAction(adminUser.id, `updated_staff_user${role ? `_role_${role}` : ''}`, id, 'profiles');

        return NextResponse.json({ success: true });
    } catch (e) {
        console.error('PUT /api/admin/users/[id] error:', e);
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
}

// DELETE: Remove a staff account entirely (admin only)
export async function DELETE(request, { params }) {
    const { user: adminUser, response: authError } = await requireRole(request, ADMIN_ONLY);
    if (authError) return authError;

    try {
        const { id } = await params;
        if (!UUID_RE.test(id)) {
            return NextResponse.json({ success: false, error: 'Invalid user id' }, { status: 400 });
        }

        // Admins cannot delete themselves — guarantees at least one admin remains
        if (id === adminUser.id) {
            return NextResponse.json(
                { success: false, error: 'You cannot delete your own account' },
                { status: 400 }
            );
        }

        const { error: profError } = await supabaseAdmin.from('profiles').delete().eq('id', id);
        if (profError) {
            return NextResponse.json({ success: false, error: profError.message }, { status: 400 });
        }

        const { error: authErr } = await supabaseAdmin.auth.admin.deleteUser(id);
        if (authErr) {
            return NextResponse.json({ success: false, error: authErr.message }, { status: 400 });
        }

        await logAction(adminUser.id, 'deleted_staff_user', id, 'profiles');

        return NextResponse.json({ success: true });
    } catch (e) {
        console.error('DELETE /api/admin/users/[id] error:', e);
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
}
