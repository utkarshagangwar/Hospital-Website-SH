/**
 * Central role definitions for the staff access system.
 *
 * Roles:
 *  - admin         → full access, and the ONLY role that can manage staff accounts
 *  - doctor        → clinical access (appointments, patients, medical records)
 *  - reception     → front-desk: appointments and patients
 *  - receptionist  → legacy alias of reception (kept so existing accounts keep working)
 *  - pathology_lab → lab staff: view appointments, manage medical files/reports
 *  - medical_store → pharmacy staff: view appointments (to verify prescriptions)
 */

export const ROLES = {
    ADMIN: 'admin',
    DOCTOR: 'doctor',
    RECEPTION: 'reception',
    RECEPTIONIST: 'receptionist', // legacy alias
    PATHOLOGY_LAB: 'pathology_lab',
    MEDICAL_STORE: 'medical_store',
};

// Roles an admin can assign when creating/updating staff accounts
export const ASSIGNABLE_ROLES = [
    ROLES.ADMIN,
    ROLES.DOCTOR,
    ROLES.RECEPTION,
    ROLES.PATHOLOGY_LAB,
    ROLES.MEDICAL_STORE,
];

// Human-readable labels for the dashboard UI
export const ROLE_LABELS = {
    admin: 'Administrator',
    doctor: 'Doctor',
    reception: 'Reception',
    receptionist: 'Reception (legacy)',
    pathology_lab: 'Pathology Lab',
    medical_store: 'Medical Store',
};

// Every valid staff role
export const ALL_STAFF_ROLES = Object.values(ROLES);

// Who can VIEW appointments (all staff need this to do their job)
export const APPOINTMENT_VIEW_ROLES = [
    ROLES.ADMIN, ROLES.DOCTOR, ROLES.RECEPTION, ROLES.RECEPTIONIST,
    ROLES.PATHOLOGY_LAB, ROLES.MEDICAL_STORE,
];

// Who can CREATE/EDIT appointments (front-desk work)
export const APPOINTMENT_MANAGE_ROLES = [
    ROLES.ADMIN, ROLES.DOCTOR, ROLES.RECEPTION, ROLES.RECEPTIONIST,
];

// Who can view/manage patients
export const PATIENT_ROLES = [
    ROLES.ADMIN, ROLES.DOCTOR, ROLES.RECEPTION, ROLES.RECEPTIONIST,
];

// Who can access medical files and records (lab uploads reports here)
export const MEDICAL_FILE_ROLES = [
    ROLES.ADMIN, ROLES.DOCTOR, ROLES.RECEPTION, ROLES.RECEPTIONIST,
    ROLES.PATHOLOGY_LAB,
];

// Admin-only areas
export const ADMIN_ONLY = [ROLES.ADMIN];

// Which dashboard tabs each role may see (client-side gating; the APIs
// enforce the same rules server-side)
export const TABS_BY_ROLE = {
    admin: ['appointments', 'services', 'doctors', 'settings', 'staff'],
    doctor: ['appointments'],
    reception: ['appointments'],
    receptionist: ['appointments'],
    pathology_lab: ['appointments'],
    medical_store: ['appointments'],
};

/* ══════════════════════════════════════════════════════════════════
   Fine-grained permissions — admin can grant/revoke these PER USER,
   overriding what the role would give by default. Staff management
   itself is never a permission: it is hard-locked to the admin role.
   ══════════════════════════════════════════════════════════════════ */

export const PERMISSIONS = [
    { id: 'appointments_view', label: 'View appointments' },
    { id: 'appointments_manage', label: 'Create & edit appointments' },
    { id: 'patients_manage', label: 'Manage patients' },
    { id: 'medical_files', label: 'Medical files & lab reports' },
    { id: 'services_manage', label: 'Manage services' },
    { id: 'doctors_manage', label: 'Manage doctor profiles' },
    { id: 'settings_manage', label: 'Manage hospital settings' },
];

export const PERMISSION_IDS = PERMISSIONS.map(p => p.id);

// What each role gets when the admin has NOT set custom permissions
export const DEFAULT_PERMISSIONS_BY_ROLE = {
    admin: PERMISSION_IDS, // admin always has everything (cannot be reduced)
    doctor: ['appointments_view', 'appointments_manage', 'patients_manage', 'medical_files'],
    reception: ['appointments_view', 'appointments_manage', 'patients_manage', 'medical_files'],
    receptionist: ['appointments_view', 'appointments_manage', 'patients_manage', 'medical_files'],
    pathology_lab: ['appointments_view', 'medical_files'],
    medical_store: ['appointments_view'],
};

/**
 * Effective permissions for a user:
 *  - admins always get everything (so an admin can never lock themselves out)
 *  - a custom array set by the admin (stored in Supabase app_metadata) wins
 *  - otherwise fall back to the role's defaults
 */
export function getEffectivePermissions(role, customPermissions) {
    if (role === 'admin') return PERMISSION_IDS;
    if (Array.isArray(customPermissions)) {
        return customPermissions.filter(p => PERMISSION_IDS.includes(p));
    }
    return DEFAULT_PERMISSIONS_BY_ROLE[role] || [];
}

// Which dashboard tab needs which permission (staff tab is admin-only)
export const TAB_PERMISSIONS = {
    appointments: 'appointments_view',
    services: 'services_manage',
    doctors: 'doctors_manage',
    settings: 'settings_manage',
};
