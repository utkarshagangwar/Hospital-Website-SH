import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { rateLimitMiddleware } from '@/utils/rateLimit';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// POST: Accepts { refresh_token } and returns a new access token
export async function POST(request) {
    const { allowed, response: rateLimitResponse, headers } = rateLimitMiddleware(request, 20, 60000);
    if (!allowed) {
        return NextResponse.json(rateLimitResponse, { status: 429, headers });
    }

    try {
        const { refresh_token } = await request.json();

        if (!refresh_token) {
            return NextResponse.json(
                { success: false, error: 'refresh_token is required' },
                { status: 400 }
            );
        }

        const supabase = createClient(supabaseUrl, supabaseAnonKey);

        const { data, error } = await supabase.auth.refreshSession({ refresh_token });

        if (error || !data?.session) {
            return NextResponse.json(
                { success: false, error: error?.message || 'Failed to refresh session' },
                { status: 401 }
            );
        }

        return NextResponse.json({
            success: true,
            session: {
                access_token: data.session.access_token,
                refresh_token: data.session.refresh_token,
                expires_at: data.session.expires_at,
            },
        });
    } catch (err) {
        console.error('POST /api/auth/refresh error:', err);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}
