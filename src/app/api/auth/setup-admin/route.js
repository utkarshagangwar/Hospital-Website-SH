import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/utils/supabaseAdmin';

// This endpoint creates the admin user for demo purposes
// POST: Creates admin user with predefined credentials
export async function POST(request) {
    try {
        const ADMIN_EMAIL = 'admin@shivajihospital.com';
        const ADMIN_PASSWORD = 'admin123';
        const ADMIN_NAME = 'Administrator';

        // Check if user already exists in auth
        const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();

        const existingUser = existingUsers?.users?.find(
            user => user.email === ADMIN_EMAIL
        );

        let userId;

        if (existingUser) {
            // User exists, get their ID
            userId = existingUser.id;
            console.log('Admin user already exists:', userId);
        } else {
            // Create new admin user
            const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
                email: ADMIN_EMAIL,
                password: ADMIN_PASSWORD,
                email_confirm: true, // Auto-confirm email
                user_metadata: {
                    full_name: ADMIN_NAME,
                    role: 'admin'
                }
            });

            if (createError) {
                console.error('Error creating user:', createError);
                return NextResponse.json(
                    { success: false, error: createError.message },
                    { status: 500 }
                );
            }

            userId = newUser.user.id;
            console.log('Created new admin user:', userId);
        }

        // Check if profile exists
        const { data: existingProfile } = await supabaseAdmin
            .from('profiles')
            .select('id, role')
            .eq('id', userId)
            .single();

        if (!existingProfile) {
            // Create profile with admin role
            const { error: profileError } = await supabaseAdmin
                .from('profiles')
                .insert({
                    id: userId,
                    full_name: ADMIN_NAME,
                    role: 'admin'
                });

            if (profileError) {
                console.error('Error creating profile:', profileError);
                return NextResponse.json(
                    { success: false, error: profileError.message },
                    { status: 500 }
                );
            }

            console.log('Created admin profile with role: admin');
        } else if (existingProfile.role !== 'admin') {
            // Update existing profile to admin role
            const { error: updateError } = await supabaseAdmin
                .from('profiles')
                .update({ role: 'admin' })
                .eq('id', userId);

            if (updateError) {
                console.error('Error updating profile:', updateError);
                return NextResponse.json(
                    { success: false, error: updateError.message },
                    { status: 500 }
                );
            }

            console.log('Updated profile role to: admin');
        }

        return NextResponse.json({
            success: true,
            message: 'Admin user setup complete',
            credentials: {
                email: ADMIN_EMAIL,
                password: ADMIN_PASSWORD
            }
        });

    } catch (error) {
        console.error('Setup admin error:', error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}

// GET: Check if admin user exists
export async function GET() {
    try {
        const ADMIN_EMAIL = 'admin@shivajihospital.com';

        const { data: users } = await supabaseAdmin.auth.admin.listUsers();
        const adminUser = users?.users?.find(user => user.email === ADMIN_EMAIL);

        if (!adminUser) {
            return NextResponse.json({
                exists: false,
                message: 'Admin user does not exist'
            });
        }

        // Check profile
        const { data: profile } = await supabaseAdmin
            .from('profiles')
            .select('role')
            .eq('id', adminUser.id)
            .single();

        return NextResponse.json({
            exists: true,
            userId: adminUser.id,
            email: adminUser.email,
            role: profile?.role || 'no profile',
            emailConfirmed: adminUser.email_confirmed_at ? true : false
        });

    } catch (error) {
        console.error('Check admin error:', error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}
