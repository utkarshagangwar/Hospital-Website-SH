import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/utils/supabaseAdmin';
import { requireRole } from '@/utils/auth';
import { logAction } from '@/utils/auditLog';
import { ADMIN_ONLY, ASSIGNABLE_ROLES, PERMISSION_IDS, getEffectivePermissions } from '@/utils/roles';

// Validate an optional custom-permissions array from the admin UI.
// Returns { ok, value } where value is null (= use role defaults) or a clean array.
function parsePermissions(permissions) {
    if (permissions === undefined || permissions === null) return { ok: true, value: null };
    if (!Array.isArray(permissions)) return { ok: false };
    const clean = permissions.filter(p => PERMISSION_IDS.includes(p));
    if (clean.length !== permissions.length) return { ok: false };
    return { ok: true, value: clean };
}

// GET: List all staff accounts with their roles (admin only)
export async function GET(request) {
    const { response: authError } = await requireRole(request, ADMIN_ONLY);
    if (authError) return authError;

    try {
        const [{ data: authData, error: authErr }, { data: profiles, error: profErr }] = await Promise.all([
            supabaseAdmin.auth.admin.listUsers({ perPage: 200 }),
            supabaseAdmin.from('profiles').select('id, full_name, role'),
        ]);

        if (authErr) return NextResponse.json({ success: false, error: authErr.message }, { status: 400 });
        if (profErr) return NextResponse.json({ success: false, error: profErr.message }, { status: 400 });

        const profileMap = new Map((profiles || []).map(p => [p.id, p]));

        const users = (authData?.users || []).map(u => {
            const role = profileMap.get(u.id)?.role || null;
            const custom = Array.isArray(u.app_metadata?.permissions) ? u.app_metadata.permissions : null;
            return {
                id: u.id,
                email: u.email,
                full_name: profileMap.get(u.id)?.full_name || u.user_metadata?.full_name || '',
                role,
                custom_permissions: custom,               // null = following role defaults
                permissions: getEffectivePermissions(role, custom),
                created_at: u.created_at,
                last_sign_in_at: u.last_sign_in_at,
            };
        });

        return NextResponse.json({ success: true, data: users });
    } catch (e) {
        console.error('GET /api/admin/users error:', e);
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
}

// POST: Create a staff account with a role (admin only)
export async function POST(request) {
    const { user: adminUser, response: authError } = await requireRole(request, ADMIN_ONLY);
    if (authError) return authError;

    try {
        const body = await request.json();
        const { email, password, full_name, role, permissions } = body || {};

        const parsedPerms = parsePermissions(permissions);
        if (!parsedPerms.ok) {
            return NextResponse.json(
                { success: false, error: `Invalid permissions. Allowed: ${PERMISSION_IDS.join(', ')}` },
                { status: 400 }
            );
        }

        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return NextResponse.json({ success: false, error: 'A valid email is required' }, { status: 400 });
        }
        if (!password || password.length < 10) {
            return NextResponse.json({ success: false, error: 'Password must be at least 10 characters' }, { status: 400 });
        }
        if (!full_name || !full_name.trim()) {
            return NextResponse.json({ success: false, error: 'Full name is required' }, { status: 400 });
        }
        if (!ASSIGNABLE_ROLES.includes(role)) {
            return NextResponse.json(
                { success: false, error: `Invalid role. Allowed: ${ASSIGNABLE_ROLES.join(', ')}` },
                { status: 400 }
            );
        }

        // Custom permissions live in app_metadata: only the service role can
        // write there, so a staff member can never grant themselves access
        const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: { full_name: full_name.trim(), role },
            app_metadata: parsedPerms.value ? { permissions: parsedPerms.value } : {},
        });

        if (createError) {
            return NextResponse.json({ success: false, error: createError.message }, { status: 400 });
        }

        const { error: profileError } = await supabaseAdmin
            .from('profiles')
            .upsert({ id: newUser.user.id, full_name: full_name.trim(), role });

        if (profileError) {
            // Roll back the auth user so we don't leave a role-less orphan account
            await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
            return NextResponse.json({ success: false, error: profileError.message }, { status: 400 });
        }

        await logAction(adminUser.id, `created_staff_user_${role}`, newUser.user.id, 'profiles');

        return NextResponse.json({
            success: true,
            data: { id: newUser.user.id, email, full_name: full_name.trim(), role },
        });
    } catch (e) {
        console.error('POST /api/admin/users error:', e);
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
}
