import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { rateLimitMiddleware } from '@/utils/rateLimit';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// POST: Accepts { email, password } and signs in via Supabase Auth
export async function POST(request) {
    // Apply rate limiting: 5 attempts per 60 seconds for login endpoint
    const { allowed, response: rateLimitResponse, headers } = rateLimitMiddleware(request, 5, 60000);
    
    if (!allowed) {
        return NextResponse.json(
            rateLimitResponse,
            { 
                status: 429,
                headers
            }
        );
    }
    
    try {
        const body = await request.json();
        const { email, password } = body;

        // Validate required fields
        if (!email || !password) {
            return NextResponse.json(
                { success: false, error: 'Email and password are required' },
                { status: 400 }
            );
        }

        // Create client for auth operations
        const supabase = createClient(supabaseUrl, supabaseAnonKey);

        // Sign in with email and password
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (error) {
            return NextResponse.json(
                { success: false, error: error.message },
                { status: 401 }
            );
        }

        // Get user's role from profiles
        const { data: profile } = await supabase
            .from('profiles')
            .select('role, full_name')
            .eq('id', data.user.id)
            .single();

        return NextResponse.json({
            success: true,
            data: {
                user: {
                    id: data.user.id,
                    email: data.user.email,
                    role: profile?.role || null,
                    full_name: profile?.full_name || null
                },
                session: {
                    access_token: data.session.access_token,
                    refresh_token: data.session.refresh_token,
                    expires_at: data.session.expires_at
                }
            }
        });
    } catch (error) {
        console.error('POST login error:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}
