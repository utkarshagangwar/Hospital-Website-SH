import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/utils/supabaseAdmin';
import { requireRole } from '@/utils/auth';

// GET: All appointments (admin, doctor, receptionist only)
export async function GET(request) {
    // Check authentication and authorization
    const { user, response: authError } = await requireRole(request, ['admin', 'doctor', 'receptionist']);

    if (authError) {
        return authError;
    }

    try {
        const { data, error } = await supabaseAdmin
            .from('appointments')
            .select('*')
            .order('appointment_date', { ascending: false });
        if (error) return NextResponse.json({ success: false, error: error.message }, { status: 400 });
        return NextResponse.json({ success: true, data });
    } catch (e) {
        console.error('GET /api/admin/appointments error:', e);
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
}
