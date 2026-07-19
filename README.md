# Shivaji Hospital & Heart Care Centre — Website + Admin Platform

Public hospital website with online appointment booking, plus a role-based staff dashboard (appointments, doctors, services, settings, staff management) backed by Supabase. Built with Next.js 16 (App Router) and deployed as a single app — no separate backend service.

This document is written so a new developer can take over the project without a handover call: what exists, how it fits together, what's real vs. placeholder, and where to look first.

---

## 1. Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, React 19), all pages under `src/app` |
| Styling | Plain CSS per route/component (`*.css` files) + Tailwind v4 (`tailwindcss`, `@tailwindcss/postcss`) available but only lightly used |
| Database | Supabase Postgres (see `src/utils/schema.sql`) |
| Auth | Supabase Auth (email/password) for staff; session persisted client-side in `localStorage` (no server cookies/middleware) |
| File storage | Supabase Storage — `medical-files` (private) and `doctor-images` (public) buckets |
| PDF generation | `jspdf` (client-side, used for the appointment receipt) |
| Analytics | `@vercel/analytics` |
| Icons | Custom hand-rolled SVG icon set in `src/components/icons/index.jsx` (not an icon font/library) |
| Hosting target | Vercel-style Node hosting (Next.js `build`/`start`); no Vercel-only APIs are used, so it also runs fine on Render/any Node host |

`firebase` is listed in `package.json` and `src/utils/firebase.js` exists, but **nothing in the app imports it** — it's dead code left over from an earlier prototype. Safe to ignore or remove.

---

## 2. Repository Layout

```
src/
  app/
    page.js                    Home page (public)
    about/, contact/, doctors/, gallery/, reviews/   Public marketing pages
    book-appointment/page.js   Public appointment booking form + PDF receipt
    patient-portal/page.js     Patient login UI — see §6, this is a UI demo only
    admin/
      login/page.js            Staff login form
      dashboard/page.js        The staff/admin dashboard (single large client component)
    api/                       All backend routes (see §7)
  components/                  Header, Footer, Loader, CustomSelect/DatePicker/TimePicker, icons
  context/LoaderContext.js     Global page-loading overlay state
  utils/
    auth.js                    Server-side auth guards (requireAuth/requireRole/requirePermission)
    roles.js                   Role + permission definitions (single source of truth)
    supabaseAdmin.js            Server-only Supabase client using the service-role key
    storage.js                  Supabase Storage helpers (upload/delete/signed URLs)
    rateLimit.js                In-memory IP rate limiter for public POST endpoints
    auditLog.js                 Writes to the audit_logs table
    schema.sql                  Full Supabase schema — tables, RLS policies, triggers
    hospitalData.js             Unused legacy localStorage data layer — see §9
plans/                          Historical planning/security notes (not app code)
Admin_dashboard.html            Standalone static HTML mockup, not wired into the Next.js app
```

Path alias: `@/*` → `src/*` (see `jsconfig.json`).

---

## 3. Data Model (Supabase)

Full DDL lives in `src/utils/schema.sql` — run it in the Supabase SQL editor to provision a new environment. Tables:

- **profiles** — one row per staff Supabase Auth user. `role` is one of `admin`, `doctor`, `reception` (`receptionist` kept only as a legacy alias), `pathology_lab`, `medical_store`. Auto-created by a `handle_new_user` trigger on signup.
- **patients** — patient records created by staff (not by patients themselves — there's no patient self-registration flow, see §6).
- **appointments** — booking records. `status` is `pending | confirmed | completed | cancelled | paid | unpaid | rejected` (note: the public booking form and the admin dashboard use different subsets of this list — booking sets `pending`/`unpaid`, the dashboard's billing flow uses `paid`/`unpaid`/`rejected`/`cancelled`). Has both a relational `doctor_id`/`patient_id` and denormalized `patient_name`/`mobile_number`/`gender` so walk-in bookings work without a `patients` row.
- **medical_records** — diagnosis/prescription/file per patient visit; files point into the `medical-files` storage bucket.
- **doctors** — public-facing doctor profiles (name, specialization(s), qualifications, OPD schedule, fees, image). Extended with JSONB `opd_schedule`/`qualifications`/`specializations` columns for the richer admin-managed doctor cards.
- **reviews** — patient testimonials; `is_approved` gates public visibility, admin approves/rejects.
- **contact_messages** — contact form submissions, admin-only read.
- **audit_logs** — append-only action log (DPDPA compliance) written by `utils/auditLog.js` from most staff-side API routes.
- **services** — hospital services shown on the home page, admin-managed.
- **hospital_settings** — key/value store (`opdHours`, `contact`) used by the home page, header, footer and contact page.

Row Level Security is enabled on every table with policies matching the same admin/staff/public split enforced in the API layer (see `schema.sql` for the exact policies). Because all app writes go through the **service-role** client (`supabaseAdmin`, which bypasses RLS), the real access control lives in the API route guards described below — RLS is the defense-in-depth backstop, not the primary gate.

---

## 4. Roles & Permissions (`src/utils/roles.js`)

Two layers, both defined in one file so they can't drift apart:

1. **Roles** — `admin`, `doctor`, `reception`, `pathology_lab`, `medical_store` (`receptionist` is a legacy alias of `reception`). Roles decide which dashboard **tabs** are visible (`TABS_BY_ROLE`).
2. **Permissions** — fine-grained flags an admin can grant/revoke **per user**, stored in Supabase `app_metadata` (writable only by the service role, so staff can never self-escalate): `appointments_view`, `appointments_manage`, `patients_manage`, `medical_files`, `services_manage`, `doctors_manage`, `settings_manage`. If an admin hasn't set custom permissions for a user, `DEFAULT_PERMISSIONS_BY_ROLE` applies. `admin` always has every permission (hard-coded, can't be reduced — an admin can't lock themselves out).

Staff account management itself is **not** a permission — it's hard-locked to `role === 'admin'` via `requireRole(request, ['admin'])`, never via `requirePermission`.

Every admin-facing API route calls one of three guards from `utils/auth.js`:
- `requireAuth` — just needs a valid Supabase session.
- `requirePermission(request, 'x')` — needs the effective permission `x`.
- `requireRole(request, ['admin'])` — needs an exact role (used for staff management and hard deletes).

---

## 5. Authentication & Session Flow

There is **no server-side session/cookie** — auth is Bearer-token based:

1. `POST /api/auth/login` → Supabase `signInWithPassword`, returns `{ user, session: { access_token, refresh_token, expires_at } }`.
2. The client (`admin/login/page.js`) stores everything in `localStorage`: `adminAuth`, `authToken`, `refreshToken`, `tokenExpiresAt`, plus a separate **`sessionExpiresAt` = login time + 24h**, and cached `userRole`/`userId`/`userName`/`userPermissions`.
3. Every dashboard API call sends `Authorization: Bearer <authToken>`. `src/utils/auth.js`'s `getCurrentUser` validates that token against Supabase on each request (`supabase.auth.getUser(token)`).
4. The dashboard's `ensureValidToken()` silently calls `POST /api/auth/refresh` with the refresh token when the access token is within 60s of expiring — so the underlying Supabase session token rotates continuously.
5. **`sessionExpiresAt` is the hard ceiling**: even though the access token keeps refreshing, once 24h have passed since login the dashboard force-clears everything and redirects to `/admin/login`, regardless of token validity. Checked on mount and every 60s via `setInterval`.
6. `Header.js` reads the same `localStorage` keys (read-only) to decide whether the nav shows **"Admin Login"** or **"Dashboard"**, and `admin/login/page.js` redirects straight to `/admin/dashboard` on mount if a valid session already exists — so a logged-in admin/staff user isn't asked to log in again while browsing the public site, as long as they're on the same browser/device within the 24h window. This is a `localStorage` convenience, not a real cross-device session — clearing site data or switching browsers always requires a fresh login.

**First admin account:** `POST /api/auth/setup-admin` only works while zero `admin` profiles exist; it permanently 403s after the first admin is created. If `ADMIN_SETUP_SECRET` is set in the environment, the request must include it in an `x-setup-secret` header. All later staff accounts are created by an admin via the dashboard's Staff tab (`/api/admin/users`).

---

## 6. Public Site — Pages & Flows

- **Home (`/`)** — fetches `/api/admin/settings`, `/api/doctors`, `/api/services` client-side and renders hero, services, doctor carousel, contact strip.
- **About / Contact / Doctors / Gallery / Reviews** — mostly static content plus live `hospital_settings`/`doctors`/`reviews` where relevant. Contact page posts to `/api/contact` (rate-limited 3/min). Reviews page posts to `/api/reviews` (rate-limited 3/min for submission, 5/min for reads); new reviews are `is_approved: false` until an admin approves them.
- **Book Appointment (`/book-appointment`)** — the real booking flow:
  1. Loads doctors (`/api/doctors`) and existing bookings (`/api/appointments/available`, a public read that exposes only date/time/doctor/status, no patient data).
  2. Generates bookable time slots from each doctor's `opd_schedule` (10-minute increments across morning/evening windows), marks slots already taken as disabled, and restricts selectable dates to the doctor's configured working days (next 90 days).
  3. Submits to `POST /api/appointments` (rate-limited 5/min) with `status: 'pending'`.
  4. On success, shows a confirmation card and lets the patient **print or download a PDF receipt** generated client-side with `jspdf` — this is a receipt of the request, not proof of payment.
- **Patient Portal (`/patient-portal`) — UI DEMO ONLY.** The mobile number + OTP login is fully client-side fake state (`setOtpSent(true)` on submit, any 6-digit string "verifies"); it does not call any API, does not check a real patient record, and the "Upcoming Appointments"/"Prescriptions" shown after "login" are hardcoded sample data, not the patient's real records. The UI literally says *"This is a demo. In production, a real OTP would be sent."* Treat this page as a design placeholder, not a working feature, when scoping future work.

---

## 7. Staff / Admin Dashboard (`/admin/dashboard`)

Single client component (`src/app/admin/dashboard/page.js`), tab-based, tabs gated by role + permission (see §4). On mount it validates the `localStorage` session (§5) and calls `loadData()` to pull appointments/doctors/services/settings (and staff users, if admin) in parallel.

Tabs (`TABS_BY_ROLE`):

- **Appointments** (all staff roles) — list/search/filter bookings, change status (`paid`/`unpaid`/`rejected`/`cancelled`), edit details, record `paid_amount` against `fees`, add/delete appointments directly (`handleAddAppointment`/`handleSaveAppointment`, posting to `/api/appointments/admin-save`), and upload/view/delete medical files per appointment (signed URLs, 1-hour expiry, via `/api/appointments/[id]/files`).
- **Doctors** (`doctors_manage`) — add/edit/delete doctor profiles: qualifications, specializations, OPD schedule (morning/evening windows, working days, fees), profile image upload to the `doctor-images` bucket.
- **Services** (`services_manage`) — add/edit/delete the services shown on the home page.
- **Settings** (`settings_manage`) — edit OPD hours and contact info (phone/WhatsApp/email/address), stored in `hospital_settings` and consumed site-wide.
- **Staff** (admin only) — create staff accounts (email/password/full name/role), grant/revoke individual permissions overriding role defaults, delete accounts. Every mutation here is audit-logged.

Logout (`handleLogout`) clears every `localStorage` auth key — the same `clearSession()` helper the 24h expiry check uses, so there's one code path for "end the session."

---

## 8. API Route Reference

Base path `/api`. `Public` = no auth. `Permission: x` = `requirePermission(request, 'x')`. `Role: admin` = `requireRole(request, ['admin'])`.

| Route | Methods | Access | Notes |
|---|---|---|---|
| `/auth/login` | POST | Public (5/min rate limit) | Returns session + effective permissions |
| `/auth/logout` | POST | Bearer token | Signs out of Supabase |
| `/auth/refresh` | POST | Public (20/min) | Exchanges refresh token for new access token |
| `/auth/setup-admin` | GET, POST | Public until first admin exists (3/min) | Bootstraps the first admin account |
| `/appointments` | GET, POST | GET: `appointments_view`. POST: public (5/min) | POST is the patient-facing booking endpoint |
| `/appointments/available` | GET | Public | Date/time/doctor/status only, no patient data |
| `/appointments/admin-save` | POST | `appointments_manage` | Staff create/update (upsert by `id`) |
| `/appointments/[id]` | GET, PATCH, DELETE | `appointments_manage` (GET uses same) | DELETE is a soft-delete (`status: cancelled`) |
| `/appointments/[id]/files` | GET, POST, DELETE | `medical_files` | Signed URLs (1h); path-traversal guarded on delete |
| `/admin/appointments` | GET | `appointments_view` | |
| `/admin/appointments/[id]` | DELETE | `appointments_manage` | **Hard** delete (vs. the soft-delete above) |
| `/admin/doctors` | GET, POST | `appointments_view` / `doctors_manage` | POST falls back to core columns if extended schema columns are missing |
| `/admin/doctors/[id]` | PUT, DELETE | `doctors_manage` | |
| `/admin/services` | GET, POST | `appointments_view` / `services_manage` | |
| `/admin/services/[id]` | PUT, DELETE | `services_manage` | |
| `/admin/settings` | GET, PUT | Public (GET) / `settings_manage` (PUT) | Only `opdHours`/`contact` keys allowed |
| `/admin/users` | GET, POST | `Role: admin` | Staff account list/create |
| `/admin/users/[id]` | PUT, DELETE | `Role: admin` | |
| `/admin/reviews` | GET, PATCH | `Role: admin` | Approve/reject reviews |
| `/doctors` | GET, POST | Public (GET) / `doctors_manage` (POST) | Public listing used by home/booking pages |
| `/doctors/[id]` | GET, PATCH, DELETE | Mixed / `doctors_manage` | |
| `/services` | GET | Public | |
| `/reviews` | GET, POST | Public, rate-limited (5/min read, 3/min write) | POST always creates `is_approved: false` |
| `/contact` | POST | Public (3/min) | |
| `/patients` | GET, POST | `patients_manage` | |
| `/patients/[id]` | GET, PATCH, DELETE | `patients_manage` (GET/PATCH) / `Role: admin` (DELETE) | |
| `/medical-records` | GET, POST | `medical_files` | Supports multipart upload |

---

## 9. Known Legacy / Non-Functional Code (read before touching)

- **`src/utils/hospitalData.js`** — a full localStorage-backed CRUD layer for services/doctors/appointments/settings from an earlier prototype, before the Supabase API existed. `src/app/page.js` still imports `getHospitalData`/`initializeData` from it but **never calls them** — the home page actually fetches live data from the API routes. This file is dead code; don't extend it, and it's a safe deletion candidate once confirmed unused elsewhere.
- **`src/utils/firebase.js`** — configured but not imported anywhere in `src/app` or `src/components`. Dead code (or a placeholder for a feature that was never wired up).
- **`Admin_dashboard.html`** (repo root) — a standalone static HTML/Tailwind-CDN mockup, not part of the Next.js build, not linked from any route. Looks like an early design reference.
- **Patient Portal** — see §6, entirely front-end demo state, no backend.
- **`src/utils/rateLimit.js`** — in-memory `Map`, explicitly documented in its own comments as not durable across serverless cold starts / multiple instances. Fine for a single long-running Node process (e.g. Render); if this ever moves to Vercel serverless functions or scales to multiple instances, replace with Redis/Upstash-backed limiting or it silently stops limiting anything.
- **`plans/*.md`** — historical planning notes (security review, session management), not code; useful background reading but may be out of date relative to the current implementation.

---

## 10. Environment Variables

Set in `.env.local` for local dev (never commit real values):

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=        # server-only — never expose to the client
ADMIN_SETUP_SECRET=               # optional, gates /api/auth/setup-admin
NEXT_PUBLIC_FIREBASE_*            # present but unused (see §9) — safe to omit
```

`SUPABASE_SERVICE_ROLE_KEY` is used by `utils/supabaseAdmin.js` and `utils/storage.js`, both of which are hard-guarded to throw if imported client-side (`storage.js` explicitly checks `typeof window !== 'undefined'`).

---

## 11. Local Development

```bash
npm install
# create .env.local with the Supabase vars above
# run src/utils/schema.sql in the Supabase SQL editor for a fresh project
npm run dev      # http://localhost:3000
```

Other scripts: `npm run build`, `npm run start` (production server), `npm run lint` (ESLint, flat config in `eslint.config.mjs`, extends `eslint-config-next`).

First-time setup: hit `GET /api/auth/setup-admin` to check `setupRequired`, then `POST` an email/password/full_name to create the first admin, then log in at `/admin/login`.

---

## 12. Security Notes Worth Knowing

- Global security headers (CSP, X-Frame-Options, HSTS, etc.) are set in `next.config.mjs` for every route.
- All public-facing mutation endpoints (`login`, `contact`, `reviews` POST, `appointments` POST, `refresh`, `setup-admin`) are rate-limited per-IP.
- Every staff-side mutation that touches appointments, patients, doctors, or staff accounts writes an `audit_logs` row via `utils/auditLog.js` (userId, action, target table/id, timestamp) — check there first when investigating "who changed this."
- File deletion on `/api/appointments/[id]/files` explicitly rejects paths containing `..` or not prefixed with the appointment's own folder, to prevent path traversal across appointments' medical files.
- The admin session model (§5) is `localStorage`-based with a 24h absolute ceiling. It is convenient but is **not** equivalent to a secure httpOnly-cookie session — if this app ever needs to defend against XSS-stolen tokens more strictly, that's the component to revisit.
