import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/utils/supabaseAdmin';

// GET: Fetch all services (public, used by home page and /services page)
export async function GET(request) {
    try {
        const { data, error } = await supabaseAdmin
            .from('services')
            .select('*')
            .order('created_at', { ascending: true });

        if (error) {
            // If table doesn't exist, return empty array
            if (error.code === '42P01' || error.message?.includes('relation')) {
                return NextResponse.json({ success: true, data: [] });
            }
            return NextResponse.json(
                { success: false, error: error.message },
                { status: 400 }
            );
        }

        return NextResponse.json({ success: true, data });
    } catch (error) {
        console.error('GET services error:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}
