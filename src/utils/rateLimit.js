/**
 * Rate limiting utility for API routes
 * 
 * IMPORTANT - Serverless Compatibility:
 * This in-memory implementation works for single-server deployments.
 * For Vercel/serverless deployments, consider using:
 * - Vercel KV (Redis): https://vercel.com/docs/storage/vercel-kv
 * - Upstash Redis: https://upstash.com/
 * - Or external rate limiting services like Cloudflare Workers
 * 
 * In serverless, each function invocation may have a different memory space,
 * making in-memory rate limiting less effective without durable storage.
 */

// In-memory store for rate limiting
// Structure: Map<ip, Array<timestamp>>
// Note: In serverless, this resets on each function cold start
const rateLimitStore = new Map();

// Track last cleanup time to reduce cleanup frequency
let lastCleanup = Date.now();
const CLEANUP_INTERVAL_MS = 60000; // Cleanup every minute

// Default configuration
const DEFAULT_WINDOW_MS = 60000; // 1 minute
const DEFAULT_MAX_REQUESTS = 10; // 10 requests per minute

/**
 * Clean up old entries from the rate limit store
 * This prevents memory leaks in long-running processes
 * Called periodically to remove expired entries
 */
function cleanupOldEntries(windowMs) {
    const now = Date.now();
    const windowStart = now - windowMs;

    for (const [ip, timestamps] of rateLimitStore.entries()) {
        const recentTimestamps = timestamps.filter(time => time > windowStart);

        if (recentTimestamps.length === 0) {
            // Remove entries with no recent requests
            rateLimitStore.delete(ip);
        } else {
            // Update with filtered timestamps
            rateLimitStore.set(ip, recentTimestamps);
        }
    }

    lastCleanup = now;
}

/**
 * Check if a request should be rate limited
 * @param {string} ip - The client IP address
 * @param {number} maxRequests - Maximum requests allowed in the window (default: 10)
 * @param {number} windowMs - Time window in milliseconds (default: 60000 = 1 minute)
 * @returns {{allowed: boolean, remaining: number, resetTime: number}} - Rate limit status
 */
export function checkRateLimit(ip, maxRequests = DEFAULT_MAX_REQUESTS, windowMs = DEFAULT_WINDOW_MS) {
    const now = Date.now();
    const windowStart = now - windowMs;

    // Get existing timestamps for this IP
    const requests = rateLimitStore.get(ip) || [];

    // Filter to only recent requests within the window
    const recentRequests = requests.filter(time => time > windowStart);

    // Check if limit exceeded
    if (recentRequests.length >= maxRequests) {
        // Calculate when the rate limit will reset
        const oldestRequest = Math.min(...recentRequests);
        const resetTime = oldestRequest + windowMs;

        return {
            allowed: false,
            remaining: 0,
            resetTime
        };
    }

    // Add current request timestamp
    recentRequests.push(now);
    rateLimitStore.set(ip, recentRequests);

    // Cleanup old entries periodically (every minute)
    if (Date.now() - lastCleanup > CLEANUP_INTERVAL_MS) {
        cleanupOldEntries(windowMs);
    }

    return {
        allowed: true,
        remaining: maxRequests - recentRequests.length,
        resetTime: now + windowMs
    };
}

/**
 * Higher-level helper to create rate limit headers for HTTP responses
 * @param {string} ip - The client IP address
 * @param {number} maxRequests - Maximum requests allowed in the window
 * @param {number} windowMs - Time window in milliseconds
 * @returns {Object} - Headers to include in the response
 */
export function getRateLimitHeaders(ip, maxRequests = DEFAULT_MAX_REQUESTS, windowMs = DEFAULT_WINDOW_MS) {
    const now = Date.now();
    const windowStart = now - windowMs;
    const requests = rateLimitStore.get(ip) || [];
    const recentRequests = requests.filter(time => time > windowStart);
    const remaining = Math.max(0, maxRequests - recentRequests.length);
    const resetTime = recentRequests.length > 0
        ? Math.min(...recentRequests) + windowMs
        : now + windowMs;

    return {
        'X-RateLimit-Limit': maxRequests.toString(),
        'X-RateLimit-Remaining': remaining.toString(),
        'X-RateLimit-Reset': Math.ceil(resetTime / 1000).toString()
    };
}

/**
 * Get client IP from Next.js request
 * Handles various proxy configurations
 * @param {Request} request - Next.js request object
 * @returns {string} - Client IP address
 */
export function getClientIp(request) {
    // Check for X-Forwarded-For header (common with proxies)
    const forwarded = request.headers.get('x-forwarded-for');
    if (forwarded) {
        // Take the first IP in the chain
        return forwarded.split(',')[0].trim();
    }

    // Check for X-Real-IP header
    const realIp = request.headers.get('x-real-ip');
    if (realIp) {
        return realIp;
    }

    // Fall back to a default identifier (less reliable)
    // In production, you might want to use a more sophisticated method
    return 'unknown';
}

/**
 * Middleware helper to check rate limit and return standard response
 * @param {Request} request - Next.js request object
 * @param {number} maxRequests - Maximum requests allowed
 * @param {number} windowMs - Time window in milliseconds
 * @returns {{allowed: boolean, response?: NextResponse, headers: Object}} - Result and optional response
 */
export function rateLimitMiddleware(request, maxRequests = DEFAULT_MAX_REQUESTS, windowMs = DEFAULT_WINDOW_MS) {
    const ip = getClientIp(request);
    const result = checkRateLimit(ip, maxRequests, windowMs);
    const headers = getRateLimitHeaders(ip, maxRequests, windowMs);

    if (!result.allowed) {
        return {
            allowed: false,
            response: {
                success: false,
                error: 'Rate limit exceeded. Please try again later.',
                retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000)
            },
            headers: {
                ...headers,
                'Retry-After': Math.ceil((result.resetTime - Date.now()) / 1000).toString()
            }
        };
    }

    return {
        allowed: true,
        headers
    };
}
