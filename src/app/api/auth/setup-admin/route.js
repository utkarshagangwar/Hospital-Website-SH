import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/utils/supabaseAdmin';
import { rateLimitMiddleware } from '@/utils/rateLimit';

/**
 * First-run admin bootstrap.
 *
 * Security model:
 *  - Only works while NO admin account exists. Once any profile has role
 *    'admin', this endpoint permanently returns 403 — all later staff
 *    accounts must be created by an admin via /api/admin/users.
 *  - Credentials come from the request body (no hardcoded defaults) and
 *    the password is never echoed back.
 *  - If ADMIN_SETUP_SECRET is set in the environment, the request must
 *    supply it in the x-setup-secret header.
 */

async function adminExists() {
    const { data, error } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('role', 'admin')
        .limit(1);
    if (error) {
        // If the profiles table is missing we treat it as "no admin yet"
        if (error.code === '42P01' || error.message?.includes('relation')) return false;
        throw error;
    }
    return (data || []).length > 0;
}

export async function POST(request) {
    const { allowed, response: rateLimitResponse, headers } = rateLimitMiddleware(request, 3, 60000);
    if (!allowed) {
        return NextResponse.json(rateLimitResponse, { status: 429, headers });
    }

    try {
        if (await adminExists()) {
            return NextResponse.json(
                { success: false, error: 'Setup already completed. Ask an administrator to create accounts.' },
                { status: 403 }
            );
        }

        const setupSecret = process.env.ADMIN_SETUP_SECRET;
        if (setupSecret && request.headers.get('x-setup-secret') !== setupSecret) {
            return NextResponse.json(
                { success: false, error: 'Invalid setup secret' },
                { status: 403 }
            );
        }

        const body = await request.json();
        const { email, password, full_name } = body || {};

        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return NextResponse.json(
                { success: false, error: 'A valid email is required' },
                { status: 400 }
            );
        }
        if (!password || password.length < 10) {
            return NextResponse.json(
                { success: false, error: 'Password must be at least 10 characters' },
                { status: 400 }
            );
        }

        const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: { full_name: full_name || 'Administrator', role: 'admin' },
        });

        if (createError) {
            return NextResponse.json(
                { success: false, error: createError.message },
                { status: 500 }
            );
        }

        const { error: profileError } = await supabaseAdmin
            .from('profiles')
            .upsert({
                id: newUser.user.id,
                full_name: full_name || 'Administrator',
                role: 'admin',
            });

        if (profileError) {
            return NextResponse.json(
                { success: false, error: profileError.message },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            message: 'Admin account created. You can now log in.',
        });
    } catch (error) {
        console.error('Setup admin error:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}

// GET: report only whether setup is still needed (no emails or IDs leaked)
export async function GET() {
    try {
        const exists = await adminExists();
        return NextResponse.json({ setupRequired: !exists });
    } catch (error) {
        console.error('Check admin error:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}
