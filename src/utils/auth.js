import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Singleton pattern: Cache the Supabase client instance
let supabaseAuthClient = null;

/**
 * Get the Supabase client for handling authentication (singleton pattern)
 */
export function getSupabaseAuthClient() {
    if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error('Missing Supabase environment variables');
    }

    // Return cached instance if available
    if (supabaseAuthClient) {
        return supabaseAuthClient;
    }

    // Create and cache the client
    supabaseAuthClient = createClient(supabaseUrl, supabaseAnonKey);
    return supabaseAuthClient;
}

/**
 * Extract and validate Bearer token from authorization header
 * @param {Request} request - The Next.js request object
 * @returns {string|null} - The access token or null if invalid/missing
 */
function extractBearerToken(request) {
    const authHeader = request.headers.get('authorization');

    if (!authHeader) {
        return null;
    }

    // Validate Bearer prefix
    const bearerPrefix = 'Bearer ';
    if (!authHeader.startsWith(bearerPrefix)) {
        return null;
    }

    // Extract token after 'Bearer '
    const accessToken = authHeader.slice(bearerPrefix.length).trim();

    // Validate token is not empty
    if (!accessToken) {
        return null;
    }

    return accessToken;
}

/**
 * Get the current user from the request cookies
 * @param {Request} request - The Next.js request object
 * @returns {Promise<{user: object|null, session: object|null}>}
 */
export async function getCurrentUser(request) {
    try {
        const supabase = getSupabaseAuthClient();

        // Get the access token from the authorization header with Bearer validation
        const accessToken = extractBearerToken(request);

        if (!accessToken) {
            return { user: null, session: null };
        }

        // Validate the access token directly using getUser
        const { data: { user }, error } = await supabase.auth.getUser(accessToken);

        if (error || !user) {
            console.error('getUser error:', error);
            return { user: null, session: null };
        }

        return { user, session: { access_token: accessToken } };
    } catch (error) {
        console.error('getCurrentUser error:', error);
        return { user: null, session: null };
    }
}

/**
 * Get the user's role from the profiles table
 * @param {string} userId - The user's ID
 * @returns {Promise<string|null>} - The user's role or null
 */
export async function getUserRole(userId) {
    try {
        const { createClient } = await import('@supabase/supabase-js');
        const { supabaseAdmin } = await import('./supabaseAdmin');

        const { data, error } = await supabaseAdmin
            .from('profiles')
            .select('role')
            .eq('id', userId)
            .single();

        if (error || !data) {
            return null;
        }

        return data.role;
    } catch (error) {
        console.error('getUserRole error:', error);
        return null;
    }
}

/**
 * Middleware helper that returns 401 if no valid session
 * @param {Request} request - The Next.js request object
 * @returns {Promise<{user: object|null, response: NextResponse|null}>} - Returns user object and null response if valid, or null user and error response if not
 */
export async function requireAuth(request) {
    const { user } = await getCurrentUser(request);

    if (!user) {
        return {
            user: null,
            response: NextResponse.json(
                { success: false, error: 'Authentication required' },
                { status: 401 }
            )
        };
    }

    return { user, response: null };
}

/**
 * Returns 403 if user's role is not in allowedRoles array
 * @param {Request} request - The Next.js request object
 * @param {string[]} allowedRoles - Array of allowed roles (e.g., ['admin', 'doctor'])
 * @param {object|null} preFetchedUser - Optional pre-fetched user object to avoid redundant validation
 * @returns {Promise<{user: object|null, response: NextResponse|null}>} - Returns user object and null response if authorized, or error response if not
 */
export async function requireRole(request, allowedRoles, preFetchedUser = null) {
    // Use pre-fetched user if provided, otherwise fetch fresh
    const user = preFetchedUser || (await getCurrentUser(request)).user;

    if (!user) {
        return {
            user: null,
            response: NextResponse.json(
                { success: false, error: 'Authentication required' },
                { status: 401 }
            )
        };
    }

    const role = await getUserRole(user.id);

    if (!role || !allowedRoles.includes(role)) {
        return {
            user: null,
            response: NextResponse.json(
                { success: false, error: 'Insufficient permissions' },
                { status: 403 }
            )
        };
    }

    return { user, response: null };
}
