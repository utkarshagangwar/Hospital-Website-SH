## 🔐 Admin Session Management & Login Guard Prompt

---

> You are a security engineer. Fix the **admin authentication session management** for the **Shivaji Hospital** website — a **Next.js 16 (App Router)** project using **Firebase** for admin Google Auth, deployed on **Vercel**.
>
> The admin login page is at `/admin` (or `/admin/login`) and the dashboard is at `/admin/dashboard`. The current issue is: after a successful login, pressing the browser back button or clicking the login link again still shows the admin login page instead of redirecting to the dashboard. There is also no session timeout implemented.
>
> Fix ALL of the following. Show exact file paths and complete code for every change — do not skip or summarize.
>
> ---
>
> ### 1. 🚫 Guard the Admin Login Page (Redirect If Already Authenticated)
>
> - In the admin login page component (`/src/app/admin/page.jsx` or `/src/app/admin/login/page.jsx`), add an auth state check at the very top using Firebase's `onAuthStateChanged`
> - If the user **is already authenticated** and the session is still valid (not expired — see Section 2), immediately redirect them to `/admin/dashboard` using `router.replace('/admin/dashboard')` — use `replace` not `push` so the login page is removed from history
> - Show a loading spinner while the auth state is being resolved — never flash the login form before the check completes
> - Use a `useEffect` with an `isLoading` state guard so the login form only renders after confirming the user is **not** authenticated
>
> ---
>
> ### 2. ⏱️ Implement 24-Hour Session Timeout
>
> - On every successful Firebase login, store the login timestamp in an `HttpOnly` cookie named `admin-session-start` using a server-side API route `/api/admin/create-session`:
>   - Cookie attributes: `HttpOnly`, `Secure`, `SameSite=Strict`, `Path=/admin`, `Max-Age=86400` (24 hours)
>   - Also store the Firebase ID token in a separate `HttpOnly` cookie named `admin-token` with the same attributes
> - Create a session validation utility at `/src/lib/admin-session.js` with:
>   - `isSessionValid()` — checks if `admin-session-start` cookie exists and is less than 86400 seconds old
>   - `getSessionAge()` — returns how many seconds old the session is
>   - `getSessionTimeRemaining()` — returns seconds remaining before expiry
>   - `clearSession()` — calls the `/api/admin/clear-session` route to delete both cookies server-side
> - On every page load inside `/admin/dashboard` and any `/admin/*` protected page, call `isSessionValid()` — if expired, call `clearSession()`, set a flag `?reason=timeout` and redirect to the login page
>
> ---
>
> ### 3. 🔒 Protect All Admin Routes via Next.js Middleware
>
> - In `/src/middleware.js`, add a matcher for `/admin/dashboard` and all `/admin/*` routes (except the login page itself)
> - On each request to a protected admin route:
>   - Check for the `admin-token` cookie — if missing, redirect to `/admin?reason=unauthorized`
>   - Check for the `admin-session-start` cookie — if older than 86400 seconds, redirect to `/admin?reason=timeout`
>   - If both cookies are valid, allow the request to proceed
> - On each request to the login page (`/admin` or `/admin/login`):
>   - If `admin-token` cookie exists AND session is still valid → redirect to `/admin/dashboard`
>   - This prevents back-button access to the login page
>
> ---
>
> ### 4. ⚠️ Session Timeout Warning UI (Before Auto-Logout)
>
> - Create a client component `/src/components/admin/SessionTimeoutWarning.jsx`
> - Show a warning modal/toast **5 minutes (300 seconds) before** the session expires
> - The warning must display:
>   - A countdown timer showing minutes and seconds remaining (e.g., "Your session expires in 4:32")
>   - A **"Stay Logged In"** button — clicking it calls `/api/admin/refresh-session` to issue a fresh session cookie and reset the timer
>   - A **"Logout Now"** button — clicking it calls `clearSession()` and redirects to `/admin`
> - If the user ignores the warning and the timer hits 0, automatically call `clearSession()` and redirect to `/admin?reason=timeout`
> - Mount this component inside the admin dashboard layout at `/src/app/admin/dashboard/layout.jsx` so it is active on all dashboard pages
>
> ---
>
> ### 5. 🔄 Create Required API Routes for Session Management
>
> Create the following server-side API routes:
>
> **`/src/app/api/admin/create-session/route.js`**
> - Accepts `POST` with `{ idToken }` in the body
> - Verifies the Firebase ID token using the Firebase Admin SDK
> - On success, sets both `admin-token` and `admin-session-start` cookies with the secure attributes listed in Section 2
> - Returns `{ success: true }`
> - On failure, returns `401`
>
> **`/src/app/api/admin/refresh-session/route.js`**
> - Accepts `POST` (no body needed)
> - Reads and re-validates the existing `admin-token` cookie via Firebase Admin SDK
> - If valid, resets the `admin-session-start` cookie to `Date.now()` (extending session another 24 hours)
> - Returns `{ success: true, expiresAt: <new timestamp> }`
> - If token is invalid or missing, returns `401`
>
> **`/src/app/api/admin/clear-session/route.js`**
> - Accepts `POST`
> - Deletes both `admin-token` and `admin-session-start` cookies by setting `Max-Age=0`
> - Returns `{ success: true }`
>
> ---
>
> ### 6. 🪧 Timeout & Unauthorized Reason Messages on Login Page
>
> - On the admin login page, read the `reason` query param from the URL (`useSearchParams`)
> - Display a **non-dismissible banner** above the login form for each case:
>   - `?reason=timeout` → Show: ⏱️ **"Your session has expired after 24 hours of inactivity. Please log in again to continue."** (amber/yellow banner)
>   - `?reason=unauthorized` → Show: 🚫 **"Access denied. You must be logged in to view that page."** (red banner)
> - The banner should disappear automatically when the user successfully logs in
> - Clear the `reason` query param from the URL after displaying the message using `router.replace('/admin')` to avoid showing stale banners on refresh
>
> ---
>
> ### 7. 🔥 Set Up Firebase Admin SDK (Server-Side)
>
> - Install `firebase-admin` package
> - Create `/src/lib/firebase-admin.js` that initializes the Firebase Admin SDK **once** using a singleton pattern (guard with `getApps().length === 0` check)
> - Use the following environment variables (add them to `.env.local` and document them):
>   - `FIREBASE_ADMIN_PROJECT_ID`
>   - `FIREBASE_ADMIN_CLIENT_EMAIL`
>   - `FIREBASE_ADMIN_PRIVATE_KEY` (handle `\n` newline replacement)
> - Export a `verifyIdToken(token)` helper function that wraps `admin.auth().verifyIdToken(token)` in a try/catch and returns `null` on failure instead of throwing
>
> ---
>
> ### 8. 🧹 Update the Logout Button
>
> - Find the existing logout button in the admin dashboard
> - Update its `onClick` handler to:
>   1. Call `POST /api/admin/clear-session` to delete server-side cookies
>   2. Call Firebase `signOut(auth)` to clear the client-side Firebase session
>   3. Redirect to `/admin` (no `reason` param — this is a voluntary logout, no message needed)
> - Disable the button and show a loading spinner while logout is in progress to prevent double-clicks
>
> ---
>
> After implementing all of the above, provide:
> 1. A checklist of all files created and modified
> 2. The exact `.env.local` variables to add (with placeholder values)
> 3. Instructions for generating Firebase Admin SDK credentials from the Firebase Console
> 4. A flow diagram (in plain text or ASCII) showing the full session lifecycle: Login → Dashboard → Warning → Timeout/Logout → Login page

---
