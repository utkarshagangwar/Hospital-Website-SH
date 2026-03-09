import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// POST: Signs out the current user
export async function POST(request) {
    try {
        // Get the access token from the authorization header
        const authHeader = request.headers.get('authorization');
        const accessToken = authHeader?.replace('Bearer ', '');

        // Create client for auth operations
        const supabase = createClient(supabaseUrl, supabaseAnonKey);

        // If we have a token, sign out with it
        if (accessToken) {
            await supabase.auth.setSession(accessToken);
            await supabase.auth.signOut();
        }

        return NextResponse.json({
            success: true,
            message: 'Logged out successfully'
        });
    } catch (error) {
        console.error('POST logout error:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}
