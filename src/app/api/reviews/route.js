import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/utils/supabaseAdmin';
import { rateLimitMiddleware } from '@/utils/rateLimit';

// Rate limit configuration: 5 requests per minute for public endpoints
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW = 60000; // 1 minute

// GET: Fetch all approved reviews (public, used by /reviews page)
export async function GET(request) {
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

        const { searchParams } = new URL(request.url);
        const limit = searchParams.get('limit') || 10;

        const { data, error } = await supabaseAdmin
            .from('reviews')
            .select('*')
            .eq('is_approved', true)
            .order('created_at', { ascending: false })
            .limit(parseInt(limit));

        if (error) {
            return NextResponse.json(
                { success: false, error: error.message },
                { status: 400, headers: rateLimitResult.headers }
            );
        }

        return NextResponse.json(
            { success: true, data },
            { headers: rateLimitResult.headers }
        );
    } catch (error) {
        console.error('GET reviews error:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}

// POST: Submit a new review
export async function POST(request) {
    try {
        // Apply rate limiting (stricter for POST - 3 per minute)
        const rateLimitResult = rateLimitMiddleware(request, 3, RATE_LIMIT_WINDOW);
        
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
        const { patient_name, rating, comment } = body;

        // Validate required fields
        if (!patient_name || !rating) {
            return NextResponse.json(
                { success: false, error: 'Patient name and rating are required' },
                { status: 400, headers: rateLimitResult.headers }
            );
        }

        // Validate rating is a number and in range
        const ratingNum = parseInt(rating);
        if (isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5) {
            return NextResponse.json(
                { success: false, error: 'Rating must be a number between 1 and 5' },
                { status: 400, headers: rateLimitResult.headers }
            );
        }

        const { data, error } = await supabaseAdmin
            .from('reviews')
            .insert({
                patient_name,
                rating,
                comment,
                is_approved: false // Reviews need admin approval
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
            message: 'Review submitted successfully. It will be visible after approval.',
            data
        }, { headers: rateLimitResult.headers });
    } catch (error) {
        console.error('POST review error:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}
