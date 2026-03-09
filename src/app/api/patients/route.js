import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/utils/supabaseAdmin';
import { logAction } from '@/utils/auditLog';
import { requireRole } from '@/utils/auth';

// GET: Fetch all patients (admin/doctor/receptionist only)
export async function GET(request) {
    // Check authentication and authorization in one call (avoids double auth check)
    const { user, response: authError } = await requireRole(request, ['admin', 'doctor', 'receptionist']);
    
    if (authError) {
        return authError;
    }

    try {
        const { searchParams } = new URL(request.url);
        const search = searchParams.get('search');
        const userId = user?.id;

        let query = supabaseAdmin
            .from('patients')
            .select('*')
            .order('created_at', { ascending: false });

        if (search) {
            // Use parameterized query to prevent SQL injection
            const searchPattern = `%${search}%`;
            query = query.or(`full_name.ilike.${searchPattern},phone.ilike.${searchPattern}`);
        }

        const { data, error } = await query;

        if (error) {
            return NextResponse.json(
                { success: false, error: error.message },
                { status: 400 }
            );
        }

        // Log the action for audit
        await logAction(userId, 'viewed_all_patients', null, 'patients');

        return NextResponse.json({ success: true, data });
    } catch (error) {
        console.error('GET patients error:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}

// POST: Create a new patient record (staff only)
export async function POST(request) {
    // Check authentication and authorization in one call (avoids double auth check)
    const { user, response: authError } = await requireRole(request, ['admin', 'doctor', 'receptionist']);
    
    if (authError) {
        return authError;
    }

    try {
        const body = await request.json();
        const userId = user?.id;
        const { full_name, date_of_birth, gender, phone, address, blood_group } = body;

        // Validate required fields
        if (!full_name) {
            return NextResponse.json(
                { success: false, error: 'Full name is required' },
                { status: 400 }
            );
        }

        const { data, error } = await supabaseAdmin
            .from('patients')
            .insert({
                full_name,
                date_of_birth,
                gender,
                phone,
                address,
                blood_group,
                created_by: userId
            })
            .select()
            .single();

        if (error) {
            return NextResponse.json(
                { success: false, error: error.message },
                { status: 400 }
            );
        }

        // Log the action for audit
        await logAction(userId, 'created_patient', data.id, 'patients');

        return NextResponse.json({ success: true, data });
    } catch (error) {
        console.error('POST patient error:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}
