import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/utils/supabaseAdmin';
import { logAction } from '@/utils/auditLog';
import { requireRole } from '@/utils/auth';

// GET: Fetch all reviews including unapproved (admin only)
export async function GET(request) {
    // Check authentication and authorization in one call (avoids double auth check)
    const { user, response: authError } = await requireRole(request, ['admin']);
    
    if (authError) {
        return authError;
    }
    
    const userId = user?.id;

    try {
        const { searchParams } = new URL(request.url);
        const includeUnapproved = searchParams.get('include_unapproved') === 'true';

        let query = supabaseAdmin
            .from('reviews')
            .select('*')
            .order('created_at', { ascending: false });

        if (!includeUnapproved) {
            query = query.eq('is_approved', true);
        }

        const { data, error } = await query;

        if (error) {
            return NextResponse.json(
                { success: false, error: error.message },
                { status: 400 }
            );
        }

        return NextResponse.json({ success: true, data });
    } catch (error) {
        console.error('GET admin reviews error:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}

// PATCH: Approve or reject a review (admin only)
export async function PATCH(request) {
    // Check authentication and authorization in one call (avoids double auth check)
    const { user, response: authError } = await requireRole(request, ['admin']);
    
    if (authError) {
        return authError;
    }
    
    const userId = user?.id;

    try {
        const body = await request.json();
        const { id, is_approved } = body;

        // Validate required fields
        if (!id || is_approved === undefined) {
            return NextResponse.json(
                { success: false, error: 'Review ID and approval status are required' },
                { status: 400 }
            );
        }

        // Check if review exists
        const { data: existing } = await supabaseAdmin
            .from('reviews')
            .select('*')
            .eq('id', id)
            .single();

        if (!existing) {
            return NextResponse.json(
                { success: false, error: 'Review not found' },
                { status: 404 }
            );
        }

        const { data, error } = await supabaseAdmin
            .from('reviews')
            .update({ is_approved })
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
        await logAction(userId, is_approved ? 'approved_review' : 'rejected_review', id, 'reviews');

        return NextResponse.json({
            success: true,
            message: is_approved ? 'Review approved' : 'Review rejected',
            data
        });
    } catch (error) {
        console.error('PATCH admin review error:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}
