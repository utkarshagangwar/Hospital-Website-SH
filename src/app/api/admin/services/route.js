import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/utils/supabaseAdmin';
import { requireRole } from '@/utils/auth';

const isTableMissing = (err) =>
    err?.message?.includes('schema cache') ||
    err?.message?.includes("relation") ||
    err?.code === '42P01';

// GET: All services (admin, doctor, receptionist only)
export async function GET(request) {
    // Check authentication and authorization
    const { user, response: authError } = await requireRole(request, ['admin', 'doctor', 'receptionist']);

    if (authError) {
        return authError;
    }

    try {
        const { data, error } = await supabaseAdmin
            .from('services').select('*').order('created_at', { ascending: true });

        // If the table doesn't exist yet, return empty array instead of crashing
        if (error) {
            if (isTableMissing(error)) {
                console.warn('[admin/services] services table not found in Supabase. Run the schema SQL to create it.');
                return NextResponse.json({ success: true, data: [] });
            }
            return NextResponse.json({ success: false, error: error.message }, { status: 400 });
        }
        return NextResponse.json({ success: true, data });
    } catch (e) {
        console.error('GET /api/admin/services error:', e);
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
}

// POST: Add a new service (admin only)
export async function POST(request) {
    // Check authentication and authorization - admin only for creating services
    const { user, response: authError } = await requireRole(request, ['admin']);

    if (authError) {
        return authError;
    }

    try {
        const body = await request.json();
        const { name, description } = body;

        // Validate required fields
        if (!name || typeof name !== 'string' || name.trim().length === 0) {
            return NextResponse.json(
                { success: false, error: 'Name is required and must be a non-empty string' },
                { status: 400 }
            );
        }

        // Validate name length
        if (name.trim().length > 255) {
            return NextResponse.json(
                { success: false, error: 'Name must be less than 255 characters' },
                { status: 400 }
            );
        }

        // Validate description if provided
        if (description !== undefined && description !== null && typeof description !== 'string') {
            return NextResponse.json(
                { success: false, error: 'Description must be a string' },
                { status: 400 }
            );
        }

        const { data, error } = await supabaseAdmin
            .from('services').insert({ name: name.trim(), description: description?.trim() || null }).select().single();

        if (error) return NextResponse.json({ success: false, error: error.message }, { status: 400 });
        return NextResponse.json({ success: true, data });
    } catch (e) {
        console.error('POST /api/admin/services error:', e);
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
}
