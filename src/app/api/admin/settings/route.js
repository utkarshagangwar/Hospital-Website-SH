import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/utils/supabaseAdmin';
import { requireRole } from '@/utils/auth';

const DEFAULT_SETTINGS = {
    opdHours: {
        weekdays: 'Monday - Friday: 9:00 AM - 2:00 PM, 5:00 PM - 8:00 PM',
        saturday: 'Saturday: 9:00 AM - 2:00 PM, 5:00 PM - 8:00 PM',
        sunday: 'Sunday: Closed',
    },
    contact: {
        phone: '9044952554',
        whatsapp: '9044952554',
        email: 'shivajiheartcare@gmail.com',
        address: '1/16, Awas Vikas, Farrukhabad, Uttar Pradesh',
    },
};

const isTableMissing = (err) =>
    err?.message?.includes('schema cache') ||
    err?.message?.includes('relation') ||
    err?.code === '42P01';

// GET: all hospital_settings as a structured object { opdHours, contact }
// Public endpoint - used by Header/Footer components
export async function GET() {
    try {
        const { data, error } = await supabaseAdmin.from('hospital_settings').select('*');

        // If the table doesn't exist yet, return defaults instead of crashing
        if (error) {
            if (isTableMissing(error)) {
                console.warn('[admin/settings] hospital_settings table not found. Run the schema SQL to create it.');
                return NextResponse.json({ success: true, data: DEFAULT_SETTINGS });
            }
            return NextResponse.json({ success: false, error: error.message }, { status: 400 });
        }

        // Convert rows to { key: value } map
        const result = {};
        (data || []).forEach(row => { result[row.key] = row.value; });

        // Fill in defaults for any missing keys
        return NextResponse.json({ success: true, data: { ...DEFAULT_SETTINGS, ...result } });
    } catch (e) {
        console.error('GET /api/admin/settings error:', e);
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
}

// PUT: upsert a setting { key, value } - admin only
export async function PUT(request) {
    // Check authentication and authorization - admin only for modifying settings
    const { user, response: authError } = await requireRole(request, ['admin']);

    if (authError) {
        return authError;
    }

    try {
        const body = await request.json();
        const { key, value } = body;

        // Validate required fields
        if (!key || typeof key !== 'string' || key.trim().length === 0) {
            return NextResponse.json(
                { success: false, error: 'Key is required and must be a non-empty string' },
                { status: 400 }
            );
        }

        // Validate key against allowed keys
        const allowedKeys = ['opdHours', 'contact'];
        if (!allowedKeys.includes(key)) {
            return NextResponse.json(
                { success: false, error: `Invalid key. Allowed keys: ${allowedKeys.join(', ')}` },
                { status: 400 }
            );
        }

        // Validate value is provided
        if (value === undefined || value === null) {
            return NextResponse.json(
                { success: false, error: 'Value is required' },
                { status: 400 }
            );
        }

        const { error } = await supabaseAdmin
            .from('hospital_settings')
            .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' });

        if (error) return NextResponse.json({ success: false, error: error.message }, { status: 400 });
        return NextResponse.json({ success: true });
    } catch (e) {
        console.error('PUT /api/admin/settings error:', e);
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
}
