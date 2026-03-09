import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/utils/supabaseAdmin';

// GET: Fetch appointment availability (public - no patient data)
// Returns only doctor_id, appointment_date, appointment_time, status for booking page
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const doctorId = searchParams.get('doctor_id');
        const date = searchParams.get('date');

        let query = supabaseAdmin
            .from('appointments')
            .select('doctor_id, appointment_date, appointment_time, status')
            .neq('status', 'cancelled'); // Exclude cancelled appointments

        if (doctorId) {
            query = query.eq('doctor_id', doctorId);
        }

        if (date) {
            query = query.eq('appointment_date', date);
        }

        const { data, error } = await query;

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
        console.error('GET appointments/available error:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}
