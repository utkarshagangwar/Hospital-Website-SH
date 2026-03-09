import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/utils/supabaseAdmin';
import { rateLimitMiddleware } from '@/utils/rateLimit';

// Rate limit configuration: 3 requests per minute for contact form
const RATE_LIMIT_MAX = 3;
const RATE_LIMIT_WINDOW = 60000; // 1 minute

// POST: Save a contact form message to contact_messages table
export async function POST(request) {
    try {
        // Apply rate limiting
        const rateLimitResult = rateLimitMiddleware(request, RATE_LIMIT_MAX, RATE_LIMIT_WINDOW);

        if (!rateLimitResult.allowed) {
            return NextResponse.json(
                rateLimitResult.response,
                {
                    status: 429,
                    headers: rateLimitResult.headers
                }
            );
        }

        const body = await request.json();
        const { full_name, email, phone, message } = body;

        // Validate required fields
        if (!full_name || !message) {
            return NextResponse.json(
                { success: false, error: 'Full name and message are required' },
                { status: 400, headers: rateLimitResult.headers }
            );
        }

        // Validate email format if provided
        if (email) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                return NextResponse.json(
                    { success: false, error: 'Invalid email format' },
                    { status: 400, headers: rateLimitResult.headers }
                );
            }
        }

        const { data, error } = await supabaseAdmin
            .from('contact_messages')
            .insert({
                full_name,
                email,
                phone,
                message
            })
            .select()
            .single();

        if (error) {
            return NextResponse.json(
                { success: false, error: error.message },
                { status: 400, headers: rateLimitResult.headers }
            );
        }

        return NextResponse.json({
            success: true,
            message: 'Message sent successfully. We will get back to you soon.',
            data
        }, { headers: rateLimitResult.headers });
    } catch (error) {
        console.error('POST contact error:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}
