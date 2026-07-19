## 🔐 Security Implementation Prompt for Shivaji Hospital Website

---

> You are a security engineer. Implement the following security improvements for the **Shivaji Hospital** website — a full-stack **Next.js 16 (App Router)** application using **React 19**, **TailwindCSS v4**, **Supabase** (PostgreSQL + Storage) for data/auth, **Firebase** for admin Google Auth, and deployed on **Vercel**.
>
> The project structure uses `/src/app/` with App Router, API routes at `/src/app/api/`, and already has basic HTTP security headers (CSP, HSTS, X-Frame-Options, etc.) in `next.config.mjs`.
>
> Implement ALL of the following security features. For each one, show the exact file path and complete code — do not skip or summarize any implementation.
>
> ---
>
> ### 1. 🔒 Strengthen Content Security Policy (CSP) in `next.config.mjs`
> - Remove any wildcard (`*`) sources from `script-src`, `style-src`, `img-src`, and `connect-src`
> - Add exact origins only: Supabase project URL, Firebase domains (`*.googleapis.com`, `*.firebaseapp.com`), Vercel Analytics (`*.vercel-insights.com`)
> - Add `frame-ancestors 'none'` to block clickjacking
> - Add `base-uri 'self'` and `form-action 'self'`
> - Enable `upgrade-insecure-requests`
> - Add a `report-uri` or `report-to` directive pointing to `/api/csp-report` (create this API route to log violations server-side)
>
> ---
>
> ### 2. 🛡️ API Route Protection & Authorization Middleware
> - Create `/src/middleware.js` at the project root using Next.js Middleware
> - Protect all routes under `/admin/*` and `/api/*` (except public endpoints like `/api/csp-report`)
> - For `/admin/*`: verify the Firebase ID token from the request cookie (`firebase-token`). If missing or invalid, redirect to `/` with a `401` status
> - For `/api/*`: check for a valid session token (Supabase JWT or Firebase token passed as `Authorization: Bearer <token>` header). Return `401 JSON` if unauthorized
> - Add rate limiting logic using an in-memory map (or recommend `upstash/ratelimit` if Redis is available) — max 60 requests per IP per minute for API routes, max 10 per minute for `/api/book-appointment`
>
> ---
>
> ### 3. 🧹 Input Validation & Sanitization on All API Routes
> - Install and use `zod` for schema validation on every API route that accepts user input
> - For `/api/book-appointment`: validate `name` (string, 2–100 chars), `phone` (10-digit Indian format), `date` (ISO date, not in the past), `doctor_id` (UUID), `department` (enum of allowed values)
> - For `/api/contact` (if exists): validate `email` (valid format), `message` (max 1000 chars), `name` (max 100 chars)
> - For any admin API routes: validate all body fields strictly, reject unknown fields using `zod`'s `.strict()`
> - Sanitize all string inputs using `DOMPurify` (server-side via `isomorphic-dompurify`) to strip any HTML/script tags before storing to Supabase
> - Return structured error responses: `{ error: "Validation failed", details: [...] }` with HTTP `400`
>
> ---
>
> ### 4. 🔑 Secure Environment Variable Audit & Hardening
> - Create a `/src/lib/env.js` file that uses `zod` to validate all required environment variables at startup
> - Required variables to validate: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_FIREBASE_API_KEY`, `NEXT_PUBLIC_FIREBASE_PROJECT_ID`, `NEXT_PUBLIC_FIREBASE_APP_ID`
> - Throw a clear error at build/start time if any are missing or malformed
> - Ensure `SUPABASE_SERVICE_ROLE_KEY` is **never** prefixed with `NEXT_PUBLIC_` — add a runtime check that throws if this key is accidentally exposed to the client
> - Add a comment guide in the file explaining which variables are safe for the client vs server-only
>
> ---
>
> ### 5. 🔐 Supabase Row-Level Security (RLS) Policies
> - Write SQL migration files (in `/supabase/migrations/`) to enable and enforce RLS on all tables
> - For the `appointments` table: authenticated users can only `SELECT` their own rows (`auth.uid() = patient_id`); only service-role can `INSERT`/`UPDATE`/`DELETE`
> - For the `doctors` table: allow public `SELECT`; restrict `INSERT`/`UPDATE`/`DELETE` to service-role only
> - For the `reviews` table: allow public `SELECT`; allow authenticated users to `INSERT` only their own review; no `UPDATE`/`DELETE` for users
> - For Supabase Storage (doctor images bucket): allow public `SELECT`; restrict `INSERT`/`DELETE` to service-role
> - Add comments in each SQL file explaining the policy intent
>
> ---
>
> ### 6. 🚦 Rate Limiting & Brute-Force Protection
> - In `/src/middleware.js`, implement IP-based rate limiting using an in-memory sliding window (or `@upstash/ratelimit` + `@upstash/redis` if env vars are available)
> - Limits: `/api/book-appointment` → 5 requests/minute per IP; `/api/contact` → 3 requests/minute per IP; all other `/api/*` → 30 requests/minute per IP
> - On limit exceeded, return HTTP `429` with `{ error: "Too many requests. Please try again later." }` and a `Retry-After` header
> - Log the IP and endpoint to the console (server-side) when a limit is triggered
>
> ---
>
> ### 7. 🍪 Secure Cookie Configuration for Auth Tokens
> - Wherever Firebase ID tokens or session tokens are stored in cookies, enforce these attributes: `HttpOnly`, `Secure`, `SameSite=Strict`, `Path=/`, and set `Max-Age` to 3600 (1 hour)
> - Create a helper `/src/lib/auth-cookies.js` with `setAuthCookie(res, token)` and `clearAuthCookie(res)` functions that enforce these settings consistently
> - Ensure no sensitive tokens are stored in `localStorage` or `sessionStorage` anywhere in the codebase — add a comment audit note for each location where storage is used
>
> ---
>
> ### 8. 📋 Audit Logging for Admin Actions
> - Create a Supabase table `admin_audit_log` with columns: `id` (UUID), `admin_email` (text), `action` (text), `target_table` (text), `target_id` (text), `timestamp` (timestamptz), `ip_address` (text)
> - Create a server-side helper `/src/lib/audit-log.js` with a `logAdminAction({ adminEmail, action, targetTable, targetId, ipAddress })` function that inserts into this table using the Supabase service-role client
> - Call this function in all admin API routes for actions like: creating/updating/deleting a doctor, updating appointment status, deleting a review
> - Write the SQL migration for this table in `/supabase/migrations/`
>
> ---
>
> ### 9. 🧩 Dependency & Supply Chain Security
> - Add a `/scripts/security-audit.sh` bash script that runs: `npm audit --audit-level=high`, checks for outdated packages with `npm outdated`, and outputs a summary report
> - Add a `security-audit` entry in `package.json` scripts: `"security-audit": "bash scripts/security-audit.sh"`
> - Create a `/.github/workflows/security.yml` GitHub Actions workflow that runs this audit on every pull request to `main` and fails the PR if high/critical vulnerabilities are found
> - Add a `.npmrc` file with `audit=true` and `fund=false`
>
> ---
>
> ### 10. 🛑 Error Handling — Never Leak Stack Traces
> - Create a global error handler utility at `/src/lib/api-error.js` with a `sendError(res, statusCode, message)` function that returns only safe, generic messages to the client
> - Wrap all API route handlers in a `withErrorHandler(handler)` HOF that catches unhandled errors, logs the full error server-side (using `console.error`), and returns a generic `500` response to the client
> - Ensure no API route ever returns raw error objects, stack traces, Supabase error details, or database column names in the response body
> - Apply this wrapper to every existing API route
>
> ---
>
> After implementing all of the above, provide:
> 1. A checklist summary of what was implemented and which files were created/modified
> 2. Any manual steps required (e.g., enabling RLS in Supabase dashboard, setting env vars in Vercel, applying SQL migrations)
> 3. Any security recommendations that require third-party services (e.g., Upstash for Redis-backed rate limiting, Sentry for error monitoring)

---
