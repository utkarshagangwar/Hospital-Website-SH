'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLoader } from '@/context/LoaderContext';
import { Calendar, Check, Close, ClipboardList, Stethoscope, UserCircle, Menu } from '@/components/icons';
import { ASSIGNABLE_ROLES, ROLE_LABELS, PERMISSIONS, TAB_PERMISSIONS, DEFAULT_PERMISSIONS_BY_ROLE, getEffectivePermissions } from '@/utils/roles';
import CustomSelect from '@/components/CustomSelect';
import CustomDatePicker from '@/components/CustomDatePicker';
import CustomTimePicker from '@/components/CustomTimePicker';
import './dashboard.css';

export default function AdminDashboard() {
    const router = useRouter();
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [activeTab, setActiveTab] = useState('appointments');
    const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [appointments, setAppointments] = useState([]);
    const [doctors, setDoctors] = useState([]);
    const [services, setServices] = useState([]);
    const [settings, setSettings] = useState({
        opdHours: { weekdays: '', saturday: '', sunday: '' },
        contact: { phone: '', whatsapp: '', email: '', address: '' }
    });
    const [editMode, setEditMode] = useState(null);
    const [formData, setFormData] = useState({});
    const [uploadedFiles, setUploadedFiles] = useState([]);
    const [fileUploadLoading, setFileUploadLoading] = useState(false);
    const [fileUploadMsg, setFileUploadMsg] = useState(null);
    const [staffUsers, setStaffUsers] = useState([]);
    const [userRole, setUserRole] = useState(null);
    const [currentUserId, setCurrentUserId] = useState(null);
    const { showLoader, hideLoader } = useLoader();

    // Helper: refresh the access token if it has expired or will expire in <60s
    const ensureValidToken = async () => {
        const expiresAt = parseInt(localStorage.getItem('tokenExpiresAt') || '0', 10);
        const nowInSeconds = Math.floor(Date.now() / 1000);
        // Refresh if token is expired or will expire within the next 60 seconds
        if (expiresAt - nowInSeconds < 60) {
            const refreshToken = localStorage.getItem('refreshToken');
            if (!refreshToken) {
                // No refresh token -- force re-login
                router.push('/admin/login');
                return null;
            }
            try {
                const res = await fetch('/api/auth/refresh', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ refresh_token: refreshToken }),
                });
                const data = await res.json();
                if (data.success) {
                    localStorage.setItem('authToken', data.session.access_token);
                    localStorage.setItem('refreshToken', data.session.refresh_token);
                    localStorage.setItem('tokenExpiresAt', data.session.expires_at);
                    return data.session.access_token;
                } else {
                    // Refresh failed -- force re-login
                    localStorage.removeItem('adminAuth');
                    localStorage.removeItem('authToken');
                    localStorage.removeItem('refreshToken');
                    localStorage.removeItem('tokenExpiresAt');
                    router.push('/admin/login');
                    return null;
                }
            } catch (err) {
                console.error('Token refresh error:', err);
                router.push('/admin/login');
                return null;
            }
        }
        return localStorage.getItem('authToken');
    };

    // Helper function to get auth headers (async -- refreshes token if needed)
    const getAuthHeaders = async () => {
        const token = await ensureValidToken();
        return token ? { 'Authorization': `Bearer ${token}` } : {};
    };

    // Filters for appointments
    const [appointmentSearch, setAppointmentSearch] = useState('');
    const [appointmentDateFilter, setAppointmentDateFilter] = useState('');
    const [appointmentDateTab, setAppointmentDateTab] = useState('today');

    const loadData = async () => {
        setIsLoading(true);
        showLoader(300); // Show loader with 300ms minimum
        try {
            const headers = await getAuthHeaders();
            if (!headers['Authorization']) return; // Redirected to login
            const role = localStorage.getItem('userRole');
            const isAdmin = role === 'admin';
            const [aptsRes, docsRes, svcRes, settingsRes, usersRes] = await Promise.all([
                fetch('/api/admin/appointments', { headers }),
                fetch('/api/admin/doctors', { headers }),
                fetch('/api/admin/services', { headers }),
                fetch('/api/admin/settings', { headers }),
                isAdmin ? fetch('/api/admin/users', { headers }) : Promise.resolve(null),
            ]);
            const [aptsJson, docsJson, svcJson, settingsJson, usersJson] = await Promise.all([
                aptsRes.json(), docsRes.json(), svcRes.json(), settingsRes.json(),
                usersRes ? usersRes.json() : Promise.resolve(null),
            ]);
            if (aptsJson.success) setAppointments(aptsJson.data || []);
            if (docsJson.success) setDoctors(docsJson.data || []);
            if (svcJson.success) setServices(svcJson.data || []);
            if (settingsJson.success && settingsJson.data) setSettings(settingsJson.data);
            if (usersJson?.success) setStaffUsers(usersJson.data || []);
        } catch (err) {
            console.error('Load data error:', err);
        } finally {
            setIsLoading(false);
            hideLoader();
        }
    };

    // Clears every auth key this app writes to localStorage. Shared by the
    // 24h-expiry check and the explicit logout button so both sign the user
    // out the same, complete way.
    const clearSession = () => {
        localStorage.removeItem('adminAuth');
        localStorage.removeItem('authToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('tokenExpiresAt');
        localStorage.removeItem('sessionExpiresAt');
        localStorage.removeItem('userRole');
        localStorage.removeItem('userId');
        localStorage.removeItem('userName');
        localStorage.removeItem('userPermissions');
    };

    // True once 24h have passed since login, regardless of how many times the
    // short-lived access token itself has been silently refreshed in that
    // window. This is the hard ceiling on the session.
    const isSessionExpired = () => {
        const sessionExpiresAt = parseInt(localStorage.getItem('sessionExpiresAt') || '0', 10);
        return !sessionExpiresAt || Date.now() > sessionExpiresAt;
    };

    useEffect(() => {
        const auth = localStorage.getItem('adminAuth');
        const token = localStorage.getItem('authToken');

        if (auth === 'true' && token && !isSessionExpired()) {
            setIsAuthenticated(true);
            setUserRole(localStorage.getItem('userRole'));
            setCurrentUserId(localStorage.getItem('userId'));
            loadData();
        } else {
            clearSession();
            router.push('/admin/login');
        }

        // Also catch the 24h boundary passing while the dashboard tab is left
        // open the whole time (no reload to re-trigger the check above).
        const interval = setInterval(() => {
            if (isSessionExpired()) {
                clearSession();
                router.push('/admin/login');
            }
        }, 60 * 1000);

        return () => clearInterval(interval);
    }, [router]);

    const handleLogout = () => {
        clearSession();
        router.push('/admin/login');
    };

    // ── Staff management (admin only — server enforces this too) ──
    const handleAddStaff = () => {
        setEditMode('add-staff');
        setFormData({
            full_name: '', email: '', password: '', role: 'reception',
            useDefaultAccess: true,
            permissions: DEFAULT_PERMISSIONS_BY_ROLE['reception'] || [],
        });
    };

    const handleEditStaff = (staff) => {
        setEditMode(`edit-staff-${staff.id}`);
        const role = staff.role || 'reception';
        setFormData({
            id: staff.id, full_name: staff.full_name, email: staff.email, role, password: '',
            useDefaultAccess: !staff.custom_permissions,
            permissions: staff.custom_permissions || DEFAULT_PERMISSIONS_BY_ROLE[role] || [],
        });
    };

    // When the admin switches role in the form, refresh the checkbox set to
    // that role's defaults (unless they've already customised access)
    const handleStaffRoleChange = (role) => {
        setFormData(prev => ({
            ...prev,
            role,
            permissions: prev.useDefaultAccess ? (DEFAULT_PERMISSIONS_BY_ROLE[role] || []) : prev.permissions,
        }));
    };

    const toggleStaffPermission = (permId) => {
        setFormData(prev => ({
            ...prev,
            useDefaultAccess: false,
            permissions: prev.permissions.includes(permId)
                ? prev.permissions.filter(p => p !== permId)
                : [...prev.permissions, permId],
        }));
    };

    const handleSaveStaff = async () => {
        const authHeaders = await getAuthHeaders();
        // useDefaultAccess → null = "follow the role's defaults";
        // otherwise send the admin's hand-picked access list
        const permissionsPayload = formData.useDefaultAccess ? null : formData.permissions;
        let res;
        if (editMode === 'add-staff') {
            res = await fetch('/api/admin/users', {
                method: 'POST',
                headers: { ...authHeaders, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    full_name: formData.full_name,
                    email: formData.email,
                    password: formData.password,
                    role: formData.role,
                    permissions: permissionsPayload,
                }),
            });
        } else {
            const id = editMode.replace('edit-staff-', '');
            const payload = { full_name: formData.full_name, role: formData.role, permissions: permissionsPayload };
            if (formData.password) payload.password = formData.password;
            res = await fetch(`/api/admin/users/${id}`, {
                method: 'PUT',
                headers: { ...authHeaders, 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
        }
        const result = await res.json();
        if (result.success) {
            alert(editMode === 'add-staff' ? 'Staff account created!' : 'Staff account updated!');
            await loadData();
            setEditMode(null);
        } else {
            alert(`Error: ${result.error || 'Failed to save staff account'}`);
        }
    };

    const handleDeleteStaff = async (id) => {
        const authHeaders = await getAuthHeaders();
        const res = await fetch(`/api/admin/users/${id}`, { method: 'DELETE', headers: authHeaders });
        const result = await res.json();
        if (result.success) {
            alert('Staff account removed.');
            await loadData();
        } else {
            alert(`Error: ${result.error || 'Failed to delete staff account'}`);
        }
        setConfirmDeleteId(null);
    };

    // OPD Hours & Contact saved to Supabase hospital_settings
    const handleSaveOpdHours = async () => {
        const authHeaders = await getAuthHeaders();
        await fetch('/api/admin/settings', {
            method: 'PUT',
            headers: { ...authHeaders, 'Content-Type': 'application/json' },
            body: JSON.stringify({ key: 'opdHours', value: formData }),
        });
        await loadData();
        setEditMode(null);
        alert('OPD Hours updated successfully!');
    };

    const handleSaveContact = async () => {
        const authHeaders = await getAuthHeaders();
        await fetch('/api/admin/settings', {
            method: 'PUT',
            headers: { ...authHeaders, 'Content-Type': 'application/json' },
            body: JSON.stringify({ key: 'contact', value: formData }),
        });
        await loadData();
        setEditMode(null);
        alert('Contact information updated successfully!');
    };

    // Service Management
    const handleAddService = () => {
        setEditMode('add-service');
        setFormData({ name: '', description: '', icon: null });
    };

    const handleEditService = (service) => {
        setEditMode(`edit-service-${service.id}`);
        setFormData(service);
    };

    const handleSaveService = async () => {
        const authHeaders = await getAuthHeaders();
        if (editMode === 'add-service') {
            await fetch('/api/admin/services', {
                method: 'POST',
                headers: { ...authHeaders, 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });
            alert('Service added successfully!');
        } else {
            const id = editMode.replace('edit-service-', '');
            await fetch(`/api/admin/services/${id}`, {
                method: 'PUT',
                headers: { ...authHeaders, 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });
            alert('Service updated successfully!');
        }
        await loadData();
        setEditMode(null);
    };

    const handleDeleteService = async (id) => {
        const authHeaders = await getAuthHeaders();
        const res = await fetch(`/api/admin/services/${id}`, { method: 'DELETE', headers: authHeaders });
        const result = await res.json();
        if (result.success) {
            alert('Service deleted successfully!');
            await loadData();
        } else {
            alert(`Error: ${result.error || 'Failed to delete service'}`);
        }
        setConfirmDeleteId(null);
    };

    // Doctor Management
    const handleAddDoctor = () => {
        setEditMode('add-doctor');
        setFormData({
            name: '',
            qualifications: [],
            specializations: [],
            image: null,
            _imageFile: null,
            opdHours: '',
            fees: 0,
            opdSchedule: {
                workingDays: [1, 2, 3, 4, 5, 6],
                morningSlot: { start: '09:00', end: '14:00' },
                eveningSlot: { start: '17:00', end: '20:00' },
                eveningSlotEnabled: true
            }
        });
    };

    const handleEditDoctor = (doctor) => {
        setEditMode(`edit-doctor-${doctor.id}`);
        const schedule = doctor.opd_schedule || {
            workingDays: [1, 2, 3, 4, 5, 6],
            morningSlot: { start: '09:00', end: '14:00' },
            eveningSlot: { start: '17:00', end: '20:00' },
            eveningSlotEnabled: true
        };
        // Backward compat: if eveningSlotEnabled is not set, default to true
        if (schedule.eveningSlotEnabled === undefined) schedule.eveningSlotEnabled = true;
        setFormData({
            id: doctor.id,
            name: doctor.full_name,
            qualifications: Array.isArray(doctor.qualifications) ? doctor.qualifications : doctor.qualification ? [doctor.qualification] : [],
            specializations: Array.isArray(doctor.specializations) ? doctor.specializations : doctor.specialization ? [doctor.specialization] : [],
            image: doctor.image_url || null,
            _imageFile: null,
            opdHours: doctor.opd_hours || '',
            fees: doctor.fees || 0,
            opdSchedule: schedule
        });
    };

    const handleSaveDoctor = async () => {
        const fd = new FormData();
        fd.append('full_name', formData.name || '');
        fd.append('qualifications', JSON.stringify(formData.qualifications || []));
        fd.append('specializations', JSON.stringify(formData.specializations || []));
        fd.append('opd_hours', formData.opdHours || '');
        fd.append('fees', formData.fees || 0);
        fd.append('opd_schedule', JSON.stringify(formData.opdSchedule || {}));
        if (formData._imageFile) fd.append('image', formData._imageFile);

        const authHeaders = await getAuthHeaders();
        let res;
        if (editMode === 'add-doctor') {
            res = await fetch('/api/admin/doctors', {
                method: 'POST',
                headers: authHeaders,
                body: fd
            });
        } else {
            const id = editMode.replace('edit-doctor-', '');
            res = await fetch(`/api/admin/doctors/${id}`, {
                method: 'PUT',
                headers: authHeaders,
                body: fd
            });
        }

        const result = await res.json();
        if (result.success) {
            alert(editMode === 'add-doctor' ? 'Doctor added successfully!' : 'Doctor updated successfully!');
            await loadData();
            setEditMode(null);
        } else {
            alert(`Error: ${result.error || 'Failed to save doctor'}`);
        }
    };

    const [confirmDeleteId, setConfirmDeleteId] = useState(null);

    const handleDeleteDoctor = async (id) => {
        const authHeaders = await getAuthHeaders();
        const res = await fetch(`/api/admin/doctors/${id}`, { method: 'DELETE', headers: authHeaders });
        const result = await res.json();
        if (result.success) {
            alert('Doctor deleted successfully!');
            await loadData();
        } else {
            alert(`Error: ${result.error || 'Failed to delete doctor'}`);
        }
        setConfirmDeleteId(null);
    };

    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            setFormData(prev => ({ ...prev, _imageFile: file }));
            const reader = new FileReader();
            reader.onloadend = () => { setFormData(prev => ({ ...prev, image: reader.result })); };
            reader.readAsDataURL(file);
        }
    };

    // Appointment Management
    const handleAddAppointment = () => {
        setEditMode('add-appointment');
        setFormData({
            patient_name: '',
            appointment_date: '',
            appointment_time: '',
            appointment_type: '',
            fees: 0,
            status: 'unpaid'
        });
        setUploadedFiles([]);
        setFileUploadMsg(null);
    };

    // Derive paymentStatus from existing status - keep original value for consistency
    const derivePaymentStatus = (status) => {
        // Return the status as-is to maintain consistency between table and edit form
        const s = (status || '').toLowerCase();
        // Map old status values to new ones for backward compatibility
        if (s === 'confirmed') return 'paid';
        if (s === 'cancelled') return 'rejected';
        if (s === 'pending') return 'unpaid';
        // Return original if already one of the new values
        if (s === 'paid' || s === 'unpaid' || s === 'rejected') return s;
        return 'unpaid'; // default
    };

    // Fetch files for an appointment
    const fetchAppointmentFiles = async (appointmentId) => {
        try {
            const authHeaders = await getAuthHeaders();
            const res = await fetch(`/api/appointments/${appointmentId}/files`, { headers: authHeaders });
            const json = await res.json();
            if (json.success) {
                setUploadedFiles(json.data || []);
            }
        } catch (err) {
            console.error('Error fetching files:', err);
        }
    };

    // Handle file upload
    const handleFileUpload = async (e) => {
        const files = Array.from(e.target.files);
        if (!files.length) return;

        // Extract appointment ID from editMode
        const appointmentId = editMode.split('-').pop();

        // Validate file sizes (10MB limit)
        const MAX_SIZE = 10 * 1024 * 1024;
        for (const file of files) {
            if (file.size > MAX_SIZE) {
                setFileUploadMsg({ type: 'error', text: `File "${file.name}" exceeds 10MB limit.` });
                e.target.value = '';
                return;
            }
        }

        setFileUploadLoading(true);
        setFileUploadMsg(null);

        try {
            const authHeaders = await getAuthHeaders();
            for (const file of files) {
                const fd = new FormData();
                fd.append('file', file);

                const res = await fetch(`/api/appointments/${appointmentId}/files`, {
                    method: 'POST',
                    headers: authHeaders,
                    body: fd,
                });
                const json = await res.json();
                if (!json.success) {
                    setFileUploadMsg({ type: 'error', text: json.error || 'Upload failed.' });
                    setFileUploadLoading(false);
                    e.target.value = '';
                    return;
                }
            }
            setFileUploadMsg({ type: 'success', text: 'File(s) uploaded successfully!' });
            await fetchAppointmentFiles(appointmentId);
        } catch (err) {
            setFileUploadMsg({ type: 'error', text: 'Upload failed: ' + err.message });
        }
        setFileUploadLoading(false);
        e.target.value = '';
    };

    // Handle file delete
    const handleFileDelete = async (filePath, recordId) => {
        if (!confirm('Delete this file?')) return;
        const appointmentId = editMode.split('-').pop();
        try {
            const authHeaders = await getAuthHeaders();
            const res = await fetch(`/api/appointments/${appointmentId}/files`, {
                method: 'DELETE',
                headers: { ...authHeaders, 'Content-Type': 'application/json' },
                body: JSON.stringify({ filePath, recordId }),
            });
            const json = await res.json();
            if (json.success) {
                await fetchAppointmentFiles(appointmentId);
            } else {
                alert(json.error || 'Delete failed.');
            }
        } catch (err) {
            alert('Delete failed: ' + err.message);
        }
    };

    const handleEditAppointment = (apt) => {
        setEditMode(`edit-appointment-${apt.id}`);
        setFormData({
            id: apt.id,
            patient_name: apt.patient_name || '',
            appointment_date: apt.appointment_date || '',
            appointment_time: apt.appointment_time || '',
            appointment_type: apt.appointment_type || '',
            fees: apt.fees || 0,
            status: (apt.status || 'unpaid'), // Use actual status value directly
        });
        setUploadedFiles([]);
        setFileUploadMsg(null);
        fetchAppointmentFiles(apt.id);
    };

    const handleSaveAppointment = async () => {
        setEditMode(null);
        setUploadedFiles([]);
        setFileUploadMsg(null);
        try {
            const authHeaders = await getAuthHeaders();
            const res = await fetch('/api/appointments/admin-save', {
                method: 'POST',
                headers: { ...authHeaders, 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });
            const json = await res.json();
            if (json.success) {
                alert(formData.id ? 'Appointment updated successfully!' : 'Appointment added successfully!');
                await loadData();
            } else {
                alert('Error: ' + (json.error || 'Unknown error'));
            }
        } catch (err) {
            alert('Error saving appointment: ' + err.message);
        }
    };

    const handleDeleteAppointment = async (id) => {
        const authHeaders = await getAuthHeaders();
        const res = await fetch(`/api/admin/appointments/${id}`, { method: 'DELETE', headers: authHeaders });
        const result = await res.json();
        if (result.success) {
            alert('Appointment deleted successfully!');
            await loadData();
        } else {
            alert(`Error: ${result.error || 'Failed to delete appointment'}`);
        }
        setConfirmDeleteId(null);
    };

    // Handle inline status update for appointments
    const handleStatusChange = async (appointmentId, newStatus) => {
        try {
            const authHeaders = await getAuthHeaders();
            const res = await fetch('/api/appointments/admin-save', {
                method: 'POST',
                headers: { ...authHeaders, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: appointmentId,
                    status: newStatus,
                }),
            });
            const json = await res.json();
            if (json.success) {
                // Update local state immediately using functional update to get latest state
                setAppointments(prevAppointments =>
                    prevAppointments.map(apt =>
                        apt.id === appointmentId ? { ...apt, status: newStatus } : apt
                    )
                );
            } else {
                alert('Error updating status: ' + (json.error || 'Unknown error'));
            }
        } catch (err) {
            alert('Error updating status: ' + err.message);
        }
    };

    if (!isAuthenticated || isLoading) {
        return null;
    }

    // Calculate stats based on payment status (paid/unpaid/rejected)
    const totalAppointments = appointments.length;
    // Paid appointments count
    const paidAppointments = appointments.filter(a => derivePaymentStatus(a.status) === 'paid').length;
    // Unpaid appointments count (exclude rejected)
    const unpaidAppointments = appointments.filter(a => derivePaymentStatus(a.status) === 'unpaid').length;
    // Total revenue - only from paid appointments, using fees field
    const totalRevenue = appointments
        .filter(a => derivePaymentStatus(a.status) === 'paid')
        .reduce((sum, apt) => sum + (apt.fees || 0), 0);

    // Unpaid revenue - sum of fees for unpaid appointments
    const unpaidRevenue = appointments
        .filter(a => derivePaymentStatus(a.status) === 'unpaid')
        .reduce((sum, apt) => sum + (apt.fees || 0), 0);

    // Today's appointments count
    const todayLocal = (() => {
        const n = new Date();
        return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;
    })();
    const todayAppointments = appointments.filter(a => (a.appointment_date || '') === todayLocal).length;

    // Upcoming appointments count (future dates, non-rejected)
    const upcomingAppointments = appointments.filter(a =>
        (a.appointment_date || '') > todayLocal && derivePaymentStatus(a.status) !== 'rejected'
    ).length;

    // ── UI helpers ────────────────────────────────────────────────────────────
    const dateStr = new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
    const tabLabels = { appointments: 'Appointments', services: 'Services', doctors: 'Doctors', settings: 'Settings', staff: 'Staff & Roles' };
    const ctaLabels = { appointments: 'Appointment', services: 'Service', doctors: 'Doctor', staff: 'Staff' };

    // Tabs follow the user's EFFECTIVE permissions (admin-granted overrides
    // beat role defaults). Staff tab is hard-locked to the admin role.
    const myPermissions = (() => {
        try {
            const stored = JSON.parse(localStorage.getItem('userPermissions') || 'null');
            return getEffectivePermissions(userRole, stored);
        } catch { return getEffectivePermissions(userRole, null); }
    })();
    const allowedTabs = [
        ...Object.entries(TAB_PERMISSIONS).filter(([, perm]) => myPermissions.includes(perm)).map(([tab]) => tab),
        ...(userRole === 'admin' ? ['staff'] : []),
    ];
    const AVATAR_COLORS = [
        { color: '#B8551F', bg: 'rgba(232,112,58,0.12)' }, { color: '#2A5240', bg: 'rgba(75,122,92,0.12)' },
        { color: '#A6740E', bg: 'rgba(166,116,14,0.12)' }, { color: '#8A4A3D', bg: 'rgba(179,64,46,0.10)' },
        { color: '#6B5B3E', bg: 'rgba(107,91,62,0.12)' },
    ];
    const SERVICE_COLORS = [
        { color: '#B8551F', bg: 'rgba(232,112,58,0.12)' }, { color: '#2A5240', bg: 'rgba(75,122,92,0.12)' },
        { color: '#A6740E', bg: 'rgba(166,116,14,0.12)' }, { color: '#6B5B3E', bg: 'rgba(107,91,62,0.12)' },
        { color: '#8A4A3D', bg: 'rgba(179,64,46,0.10)' },
    ];

    // ── Design tokens — reads from the site's Ember & Verdant CSS custom properties ──

    const C = {
        pageBg: 'var(--color-ground)',
        white: 'var(--color-surface)',
        rowBg: 'var(--color-surface-2)',
        border: 'var(--color-border)',
        teal: 'var(--color-ember)',
        tealLight: 'var(--color-ember-tint)',
        coral: 'var(--color-ember-deep)',
        success: 'var(--color-success)',
        successLight: 'var(--color-success-tint)',
        warning: 'var(--color-warning)',
        warningLight: 'var(--color-warning-tint)',
        danger: 'var(--color-danger)',
        dangerLight: 'var(--color-danger-tint)',
        info: 'var(--color-verdant-deep)',
        infoLight: 'var(--color-verdant-tint)',
        txtPrimary: 'var(--color-ink)',
        txtSec: 'var(--color-muted)',
        txtMuted: 'var(--color-muted-2)',
    };
    const FF = { heading: "var(--font-display)", body: "var(--font-sans)" };

    // ── Type scale — one universal rule for the whole dashboard ──
    // A fixed-rem scale (not fluid clamp() — this is app/product UI, not a
    // marketing page) with five roles. Every "title"/"heading" role in this
    // file uses FS.subheading or FS.pageHeading, FF.heading, and weight 700;
    // every label/body/caption role uses FF.body at weight ≤600. Before this,
    // card titles, section titles, and table/form labels were scattered
    // across 12–15px ad hoc, so a "heading" (e.g. a card title at 14px)
    // frequently sat within 0–1px of ordinary body/label text (13px) right
    // next to it — no reliable way to tell heading from body at a glance.
    // A ~1.15x size bump alone read as too subtle to register as "a
    // heading" at a glance (confirmed live — the numbers were technically
    // right but didn't look like it), so the jump here is deliberately
    // decisive: pageHeading is ~1.7x body, subheading ~1.4x — plus the
    // weight jump to 700 and the color/family change already in place —
    // matching how obviously an h1/h2 stands out from body text on the main
    // site's own scale in globals.css, not just a same-ratio miniature of it.
    const FS = {
        caption: '11px',     // hints, timestamps, secondary meta
        label: '12px',       // form labels, table headers, badges, nav items
        body: '13px',        // table cells, descriptions, input text
        subheading: '18px',  // every card/section title — always larger than body
        pageHeading: '22px', // the top-bar page title only (e.g. "Appointments")
    };

    const styles = {
        pageWrapper: {
            minHeight: '100vh',
            background: C.pageBg,
            fontFamily: FF.body,
            display: 'flex',
            flexDirection: 'column',
        },
        // ── Sidebar ──────────────────────────────────────────────────────────
        // Position/width/transform live in the .admin-sidebar CSS class (see
        // dashboard.css) so the mobile collapse media query can control them —
        // inline styles always beat an external stylesheet, so those specific
        // properties can't be set here.
        sidebarWrap: {
            background: C.white,
            borderRight: `1px solid ${C.border}`,
            display: 'flex',
            flexDirection: 'column',
            zIndex: 100,
        },
        // Fixed to the same height as `navbar` below so the two border-bottoms
        // form one continuous line across the full page width.
        sidebarLogoBlock: {
            height: '58px',
            padding: '0 16px',
            display: 'flex',
            alignItems: 'center',
            borderBottom: `1px solid ${C.border}`,
            boxSizing: 'border-box',
        },
        logoRow: {
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
        },
        logoIcon: {
            width: '36px', height: '36px',
            background: C.teal,
            borderRadius: '10px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
        },
        logoBrandWrap: { display: 'flex', flexDirection: 'column', gap: '1px' },
        logoBrandName: {
            fontSize: '16px',
            fontWeight: 600,
            fontFamily: FF.heading,
            color: C.txtPrimary,
            lineHeight: 1.2,
        },
        logoSubtitle: {
            fontSize: '11.5px',
            color: C.txtMuted,
            fontFamily: FF.body,
            lineHeight: 1.2,
        },
        avatarRow: {
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '25px 16px 12px 16px',
            borderBottom: `1px solid ${C.border}`,
        },
        avatarCircle: {
            width: '34px', height: '34px',
            borderRadius: '50%',
            background: C.tealLight,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '14px',
            fontWeight: 600,
            color: C.teal,
            fontFamily: FF.heading,
            flexShrink: 0,
        },
        avatarInfo: { display: 'flex', flexDirection: 'column', justifyContent: 'center' },
        avatarName: { fontSize: '15px', fontWeight: 700, color: C.txtPrimary, fontFamily: FF.heading },
        avatarRole: { fontSize: '12px', color: C.txtMuted },
        sidebarNav: {
            flex: 1,
            overflowY: 'auto',
            padding: '10px 10px',
            display: 'flex',
            flexDirection: 'column',
            gap: '2px',
        },
        navItem: {
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '10px 12px',
            borderRadius: '10px',
            color: C.txtSec,
            cursor: 'pointer',
            fontWeight: 400,
            fontSize: '13px',
            fontFamily: FF.body,
            border: 'none',
            background: 'none',
            width: '100%',
            textAlign: 'left',
            transition: 'all 0.15s ease',
            borderLeft: '3px solid transparent',
        },
        navItemActive: {
            background: C.tealLight,
            color: C.teal,
            fontWeight: 600,
            borderLeft: `3px solid ${C.teal}`,
            borderRadius: '10px',
        },
        logoutBtn: {
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            width: '100%',
            padding: '10px 0px',
            background: 'none',
            border: 'none',
            borderRadius: '10px',
            color: C.danger,
            fontSize: '13px',
            fontFamily: FF.body,
            fontWeight: 600,
            cursor: 'pointer',
        },
        // ── Top Navbar ───────────────────────────────────────────────────────
        // Position/offset live in the .admin-navbar CSS class (dashboard.css)
        // so the mobile breakpoint can move it — see the note on sidebarWrap.
        navbar: {
            background: C.white,
            borderBottom: `1px solid ${C.border}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 24px',
            zIndex: 90,
            gap: '16px',
        },
        // display intentionally omitted: `.admin-mobile-toggle` in dashboard.css
        // controls it (none by default, flex only under the 880px breakpoint) —
        // an inline `display` here would always beat that CSS rule and force
        // the button to show at every width.
        mobileToggleBtn: {
            alignItems: 'center',
            justifyContent: 'center',
            width: '34px',
            height: '34px',
            borderRadius: '8px',
            border: `1px solid ${C.border}`,
            background: C.white,
            color: C.txtPrimary,
            cursor: 'pointer',
            flexShrink: 0,
        },
        navbarLeft: { display: 'flex', alignItems: 'center', gap: '14px', minWidth: 0 },
        navbarTitle: { fontSize: FS.pageHeading, fontWeight: 700, color: C.txtPrimary, fontFamily: FF.heading, whiteSpace: 'nowrap', letterSpacing: '-0.01em' },
        // display intentionally omitted: `.admin-live-chip` in dashboard.css hides
        // this entirely under 880px. Same reasoning as mobileToggleBtn above — an
        // inline `display` here would always beat that rule and the chip would
        // never actually disappear on narrow screens.
        liveChip: {
            alignItems: 'center', gap: '5px',
            fontSize: '11px', fontWeight: 600,
            color: C.success,
            background: C.successLight,
            borderRadius: '20px',
            padding: '3px 9px',
            fontFamily: FF.body,
            whiteSpace: 'nowrap',
            flexShrink: 0,
        },
        navbarRight: { display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 },
        // display intentionally omitted — see liveChip note; `.admin-date-chip`
        // hides this under 880px and needs to own `display` uncontested.
        dateChip: {
            fontSize: '12px',
            color: C.txtSec,
            background: C.rowBg,
            borderRadius: '8px',
            padding: '0 12px',
            height: '34px',
            alignItems: 'center',
            fontFamily: FF.body,
            border: `1px solid ${C.border}`,
            boxSizing: 'border-box',
            whiteSpace: 'nowrap',
            flexShrink: 0,
        },
        // `.admin-cta-btn-label` (dashboard.css) hides the text span under 480px
        // so only the leading "+" survives — that's what stops the button from
        // wrapping onto a second line and overlapping the date chip/logout
        // button, which is what happened before (fixed height + wrapped text
        // has nowhere to go but overlap its neighbors).
        ctaBtn: {
            background: C.coral,
            color: C.white,
            border: 'none',
            borderRadius: '8px',
            padding: '0 16px',
            height: '34px',
            fontWeight: 600,
            fontSize: '13px',
            fontFamily: FF.heading,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            boxSizing: 'border-box',
            whiteSpace: 'nowrap',
            flexShrink: 0,
        },
        // `.admin-logout-btn-label` mirrors the CTA button: text hides under
        // 480px, leaving just the (already self-explanatory) icon.
        navbarLogoutBtn: {
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            height: '34px',
            padding: '0 14px',
            background: 'none',
            border: `1px solid ${C.border}`,
            borderRadius: '8px',
            color: C.danger,
            fontSize: '13px',
            fontFamily: FF.body,
            fontWeight: 600,
            cursor: 'pointer',
            boxSizing: 'border-box',
            whiteSpace: 'nowrap',
            flexShrink: 0,
        },
        // ── Main area ────────────────────────────────────────────────────────
        // Padding moves to the .admin-main CSS class so it can shrink on
        // narrow screens; marginTop/marginBottom don't change per breakpoint
        // (navbar height is constant) so they stay inline.
        main: {
            marginTop: '58px',
            marginBottom: '40px',
            flex: 1,
        },
        // ── Stat cards ───────────────────────────────────────────────────────
        // auto-fit/minmax reflows these fluidly at any width instead of
        // forcing a fixed column count that would squeeze on narrow screens.
        statsGrid4: {
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
            gap: '16px',
            marginBottom: '16px',
        },
        statsGrid3: {
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
            gap: '16px',
            marginBottom: '24px',
        },
        statCard: (accentColor) => ({
            background: C.white,
            border: `1px solid ${C.border}`,
            borderRadius: '14px',
            padding: '18px 20px',
            borderTop: `3px solid ${accentColor}`,
            position: 'relative',
        }),
        statLabel: {
            fontSize: '15px',
            fontWeight: 600,
            fontFamily: FF.heading,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            color: C.txtMuted,
            marginBottom: '8px',
        },
        statValue: {
            fontSize: '26px',
            fontWeight: 600,
            color: C.txtPrimary,
            fontFamily: FF.heading,
            letterSpacing: '-0.02em',
        },
        statIconBubble: (color, bg) => ({
            position: 'absolute',
            top: '16px', right: '16px',
            width: '34px', height: '34px',
            borderRadius: '50%',
            background: bg,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: color,
        }),
        // ── Card panel ───────────────────────────────────────────────────────
        card: {
            background: C.white,
            border: `1px solid ${C.border}`,
            borderRadius: '14px',
            padding: '0',
            marginBottom: '20px',
            overflow: 'hidden',
        },
        cardHeader: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            borderBottom: `1px solid ${C.border}`,
        },
        cardTitle: {
            fontSize: FS.subheading,
            fontWeight: 700,
            color: C.txtPrimary,
            fontFamily: FF.heading,
            display: 'flex', alignItems: 'center', gap: '8px',
        },
        cardBody: { padding: '20px' },
        // ── Tabs ─────────────────────────────────────────────────────────────
        tabsRow: {
            display: 'flex',
            gap: '4px',
            padding: '0 20px',
            borderBottom: `1px solid ${C.border}`,
            background: C.white,
            overflowX: 'auto',
        },
        tab: {
            padding: '12px 16px',
            background: 'none',
            border: 'none',
            borderBottom: '2px solid transparent',
            color: C.txtMuted,
            fontWeight: 500,
            fontSize: '13px',
            fontFamily: FF.body,
            cursor: 'pointer',
            marginBottom: '-1px',
            transition: 'all 0.15s ease',
            whiteSpace: 'nowrap',
            flexShrink: 0,
        },
        tabActive: {
            color: C.teal,
            borderBottom: `2px solid ${C.teal}`,
            fontWeight: 600,
        },
        // ── Table ────────────────────────────────────────────────────────────
        table: { width: '100%', borderCollapse: 'collapse' },
        th: {
            textAlign: 'left',
            padding: '10px 16px',
            fontSize: '14px',
            fontWeight: 600,
            color: C.txtMuted,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            background: C.rowBg,
            fontFamily: FF.heading,
            borderBottom: `1px solid ${C.border}`,
        },
        td: {
            padding: '13px 16px',
            fontSize: '13px',
            color: C.txtPrimary,
            fontFamily: FF.body,
            borderBottom: `1px solid ${C.border}`,
        },
        // ── Buttons ──────────────────────────────────────────────────────────
        btnPrimary: {
            background: C.coral,
            color: C.white,
            border: 'none',
            borderRadius: '8px',
            padding: '9px 18px',
            fontWeight: 600,
            fontSize: '13px',
            fontFamily: FF.heading,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
        },
        btnSecondary: {
            background: C.white,
            color: C.info,
            border: `1px solid ${C.info}`,
            borderRadius: '8px',
            padding: '7px 14px',
            fontWeight: 600,
            fontSize: '12px',
            fontFamily: FF.body,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
        },
        btnDanger: {
            background: C.white,
            color: C.danger,
            border: `1px solid ${C.danger}`,
            borderRadius: '8px',
            padding: '7px 14px',
            fontWeight: 600,
            fontSize: '12px',
            fontFamily: FF.body,
            cursor: 'pointer',
        },
        // ── Form ─────────────────────────────────────────────────────────────
        input: {
            width: '100%',
            padding: '9px 13px',
            border: `1px solid ${C.border}`,
            borderRadius: '8px',
            fontSize: '13px',
            fontFamily: FF.body,
            background: C.rowBg,
            color: C.txtPrimary,
            outline: 'none',
            boxSizing: 'border-box',
        },
        label: {
            display: 'block',
            fontSize: '12px',
            fontWeight: 600,
            fontFamily: FF.body,
            color: C.txtSec,
            marginBottom: '5px',
        },
        formGrid: {
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))',
            gap: '14px',
            marginBottom: '16px',
        },
        actionCard: {
            background: C.rowBg,
            border: `1px solid ${C.border}`,
            borderLeft: `3px solid ${C.teal}`,
            borderRadius: '0 10px 10px 0',
            padding: '16px',
            marginBottom: '16px',
        },
        actionCardTitle: {
            fontSize: FS.subheading,
            fontWeight: 700,
            color: C.txtPrimary,
            fontFamily: FF.heading,
            marginBottom: '14px',
        },
        fileItem: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 12px',
            border: `1px solid ${C.border}`,
            borderRadius: '8px',
            marginBottom: '6px',
            background: C.white,
        },
        // ── Status badges ────────────────────────────────────────────────────
        statusBadge: (status) => {
            const s = derivePaymentStatus(status);
            if (s === 'paid') return { padding: '5px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 600, background: C.tealLight, color: C.teal, textTransform: 'capitalize', fontFamily: FF.body };
            if (s === 'rejected') return { padding: '5px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 600, background: C.dangerLight, color: C.danger, textTransform: 'capitalize', fontFamily: FF.body };
            return { padding: '5px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 600, background: C.warningLight, color: C.warning, textTransform: 'capitalize', fontFamily: FF.body };
        },
        // ── Doctor cards ─────────────────────────────────────────────────────
        doctorGrid: {
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '16px',
            padding: '20px',
        },
        doctorCard: {
            background: C.white,
            border: `1px solid ${C.border}`,
            borderRadius: '12px',
            padding: '18px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
        },
        doctorInitial: (color, bg) => ({
            width: '48px', height: '48px',
            borderRadius: '12px',
            background: bg,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '18px', fontWeight: 600,
            color: color,
            fontFamily: FF.heading,
            flexShrink: 0,
        }),
        // ── Service cards ────────────────────────────────────────────────────
        serviceRow: {
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            padding: '14px 20px',
            borderBottom: `1px solid ${C.border}`,
            flexWrap: 'wrap',
        },
        serviceIcon: (color, bg) => ({
            width: '40px', height: '40px',
            borderRadius: '10px',
            background: bg,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
            color: color,
        }),
        // ── Settings ─────────────────────────────────────────────────────────
        settingsSection: {
            background: C.white,
            border: `1px solid ${C.border}`,
            borderRadius: '14px',
            marginBottom: '16px',
            overflow: 'hidden',
        },
        settingsSectionHeader: {
            padding: '14px 20px',
            borderBottom: `1px solid ${C.border}`,
            fontSize: FS.subheading,
            fontWeight: 700,
            color: C.txtPrimary,
            fontFamily: FF.heading,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            flexWrap: 'wrap',
            background: C.rowBg,
        },
        settingsBody: { padding: '18px 20px' },
        settingsTitle: {
            fontSize: FS.subheading, fontWeight: 700, color: C.txtPrimary,
            fontFamily: FF.heading, marginBottom: '14px',
            display: 'flex', alignItems: 'center', gap: '8px',
        },
        // ── Empty state ──────────────────────────────────────────────────────
        emptyState: {
            textAlign: 'center',
            padding: '48px 24px',
        },
        emptyStateIcon: { fontSize: '40px', marginBottom: '12px' },
        emptyStateTitle: {
            fontSize: FS.subheading, fontWeight: 700,
            color: C.txtSec, marginBottom: '6px', fontFamily: FF.heading,
        },
        emptyStateSubtitle: { fontSize: FS.body, color: C.txtMuted, fontFamily: FF.body },
    };

    return (
        <div style={styles.pageWrapper}>
            {/* Global hover / scrollbar styles */}
            <style>{`
                .tr-hover:hover { background: var(--color-ground); }
                .nav-btn:hover { background: var(--color-ember-tint); color: var(--color-ember-deep); }
                ::-webkit-scrollbar { width: 5px; height: 5px; }
                ::-webkit-scrollbar-thumb { background: var(--color-border); border-radius: 4px; }
                @keyframes spin { 0%{transform:rotate(0deg)} 100%{transform:rotate(360deg)} }
            `}</style>

            {/* ── Sidebar ── */}
            <aside className={`admin-sidebar${isMobileSidebarOpen ? ' is-open' : ''}`} style={styles.sidebarWrap}>
                {/* Back to the public site — the marketing header is hidden on this
                    self-contained dashboard, so this is the only way out of it */}
                <Link href="/" style={{ ...styles.sidebarLogoBlock, textDecoration: 'none' }}>
                    <div style={styles.logoRow}>
                        <div style={styles.logoIcon}>
                            <svg width="17" height="17" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                                <path d="M3 11l9-8 9 8" />
                                <path d="M5 10v10a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V10" />
                            </svg>
                        </div>
                        <div style={styles.logoBrandWrap}>
                            <span style={styles.logoBrandName}>Shivaji Hospital</span>
                            <span style={styles.logoSubtitle}>← Back to website</span>
                        </div>
                    </div>
                </Link>
                {/* Admin avatar */}
                <div style={styles.avatarRow}>
                    <div style={styles.avatarCircle}>{(typeof window !== 'undefined' && (localStorage.getItem('userName') || '').charAt(0).toUpperCase()) || 'S'}</div>
                    <div style={styles.avatarInfo}>
                        <span style={styles.avatarName}>{(typeof window !== 'undefined' && localStorage.getItem('userName')) || 'Staff Panel'}</span>
                        <span style={styles.avatarRole}>{ROLE_LABELS[userRole] || 'Staff'}</span>
                    </div>
                </div>
                {/* Nav links — filtered by the logged-in user's role */}
                <nav style={styles.sidebarNav}>
                    {[
                        { id: 'appointments', label: 'Appointments', icon: <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg> },
                        { id: 'services', label: 'Services', icon: <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg> },
                        { id: 'doctors', label: 'Doctors', icon: <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg> },
                        { id: 'settings', label: 'Settings', icon: <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg> },
                        { id: 'staff', label: 'Staff & Roles', icon: <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg> },
                    ].filter(n => allowedTabs.includes(n.id)).map(n => (
                        <button
                            key={n.id}
                            className="nav-btn"
                            style={{ ...styles.navItem, ...(activeTab === n.id ? styles.navItemActive : {}) }}
                            onClick={() => { setActiveTab(n.id); setIsMobileSidebarOpen(false); }}
                        >
                            {n.icon}{n.label}
                        </button>
                    ))}
                </nav>
            </aside>

            {/* Dims the page and closes the sidebar when tapped, mobile only */}
            <div
                className={`admin-sidebar-backdrop${isMobileSidebarOpen ? ' is-open' : ''}`}
                onClick={() => setIsMobileSidebarOpen(false)}
            />

            {/* ── Top Navbar ── */}

            <header className="admin-navbar" style={styles.navbar}>
                <div style={styles.navbarLeft}>
                    <button
                        className="admin-mobile-toggle"
                        style={styles.mobileToggleBtn}
                        onClick={() => setIsMobileSidebarOpen((open) => !open)}
                        aria-label={isMobileSidebarOpen ? 'Close menu' : 'Open menu'}
                    >
                        {isMobileSidebarOpen ? <Close size={18} /> : <Menu size={18} />}
                    </button>
                    <span className="admin-navbar-title" style={styles.navbarTitle}>{tabLabels[activeTab] || 'Dashboard'}</span>
                    <span className="admin-live-chip" style={styles.liveChip}>
                        <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: C.success, display: 'inline-block' }} />
                        LIVE
                    </span>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <div style={styles.navbarRight}>
                        <span className="admin-date-chip" style={styles.dateChip}>{dateStr}</span>
                        {ctaLabels[activeTab] && (
                            <button
                                className="admin-cta-btn"
                                style={styles.ctaBtn}
                                onClick={activeTab === 'appointments' ? handleAddAppointment : activeTab === 'services' ? handleAddService : activeTab === 'doctors' ? handleAddDoctor : activeTab === 'staff' ? handleAddStaff : undefined}
                                aria-label={`Add ${ctaLabels[activeTab]}`}
                            >
                                +<span className="admin-cta-btn-label">&nbsp;Add {ctaLabels[activeTab]}</span>
                            </button>
                        )}
                    </div>
                    <button className="admin-logout-btn" style={styles.navbarLogoutBtn} onClick={handleLogout} aria-label="Logout">
                        <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
                        <span className="admin-logout-btn-label">Logout</span>
                    </button>
                </div>
            </header>

            {/* ── Main ── */}
            <main className="admin-main" style={styles.main}>

                {/* ── Appointments Tab ── */}
                {activeTab === 'appointments' && (
                    <div>
                        {/* 4-up stat cards */}
                        <div style={styles.statsGrid4}>
                            {[
                                { label: 'Total Appointments', value: totalAppointments, accent: C.teal, iconBg: C.tealLight, icon: <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg> },
                                { label: 'Paid', value: paidAppointments, accent: C.success, iconBg: C.successLight, icon: <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12" /></svg> },
                                { label: 'Unpaid', value: unpaidAppointments, accent: C.warning, iconBg: C.warningLight, icon: <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg> },
                                { label: 'Total Revenue', value: `₹${totalRevenue.toLocaleString()}`, accent: C.info, iconBg: C.infoLight, icon: <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg> },
                            ].map((s, i) => (
                                <div key={i} style={styles.statCard(s.accent)}>
                                    <div style={styles.statIconBubble(s.accent, s.iconBg)}>{s.icon}</div>
                                    <p style={styles.statLabel}>{s.label}</p>
                                    <p style={styles.statValue}>{s.value}</p>
                                </div>
                            ))}
                        </div>
                        {/* 3-up secondary stat cards */}
                        <div style={styles.statsGrid3}>
                            {[
                                { label: 'Unpaid Amount', value: `₹${unpaidRevenue.toLocaleString()}`, accent: C.danger, iconBg: C.dangerLight, icon: <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg> },
                                { label: "Today's Appointments", value: todayAppointments, accent: C.coral, iconBg: C.tealLight, icon: <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /><line x1="12" y1="14" x2="12" y2="18" /><line x1="10" y1="16" x2="14" y2="16" /></svg> },
                                { label: 'Upcoming', value: upcomingAppointments, accent: C.info, iconBg: C.infoLight, icon: <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg> },
                            ].map((s, i) => (
                                <div key={i} style={styles.statCard(s.accent)}>
                                    <div style={styles.statIconBubble(s.accent, s.iconBg)}>{s.icon}</div>
                                    <p style={styles.statLabel}>{s.label}</p>
                                    <p style={styles.statValue}>{s.value}</p>
                                </div>
                            ))}
                        </div>

                        {/* Table panel */}
                        <div style={styles.card}>
                            {/* Tab row */}
                            <div style={styles.tabsRow}>
                                {[
                                    { id: 'today', label: 'Today' },
                                    { id: 'upcoming', label: 'Upcoming' },
                                    { id: 'past-completed', label: 'Past Completed' },
                                    { id: 'rejected', label: 'Rejected' },
                                ].map(t => (
                                    <button key={t.id} style={{ ...styles.tab, ...(appointmentDateTab === t.id ? styles.tabActive : {}) }}
                                        onClick={() => { setAppointmentDateTab(t.id); setAppointmentSearch(''); setAppointmentDateFilter(''); }}>
                                        {t.label}
                                    </button>
                                ))}
                            </div>
                            <div style={styles.cardBody}>
                                {/* Search / filters */}
                                <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
                                    <input type="text" placeholder="Search by patient name…" value={appointmentSearch}
                                        onChange={e => setAppointmentSearch(e.target.value)}
                                        style={{ ...styles.input, flex: 1, minWidth: '200px' }} />
                                    {(appointmentDateTab === 'past-completed' || appointmentDateTab === 'upcoming') && (
                                        <div style={{ minWidth: '170px' }}>
                                            <CustomDatePicker
                                                value={appointmentDateFilter}
                                                onChange={setAppointmentDateFilter}
                                                placeholder="Filter by date"
                                            />
                                        </div>
                                    )}
                                    {(appointmentSearch || appointmentDateFilter) && (
                                        <button onClick={() => { setAppointmentSearch(''); setAppointmentDateFilter(''); }}
                                            style={styles.btnSecondary}>Clear</button>
                                    )}
                                </div>

                                {/* Edit form */}
                                {editMode && editMode.includes('appointment') && (
                                    <div style={styles.actionCard}>
                                        <h4 style={styles.actionCardTitle}>{editMode === 'add-appointment' ? 'Add New Appointment' : 'Edit Appointment'}</h4>
                                        <div style={styles.formGrid}>
                                            <div><label style={styles.label}>Patient Name</label>
                                                <input type="text" value={formData.patient_name || ''} onChange={e => setFormData({ ...formData, patient_name: e.target.value })} placeholder="e.g., John Doe" style={styles.input} /></div>
                                            <div><label style={styles.label}>Date</label>
                                                <CustomDatePicker value={formData.appointment_date || ''} onChange={v => setFormData({ ...formData, appointment_date: v })} /></div>
                                            <div><label style={styles.label}>Time</label>
                                                <CustomTimePicker value={formData.appointment_time || ''} onChange={v => setFormData({ ...formData, appointment_time: v })} /></div>
                                            <div><label style={styles.label}>Type</label>
                                                <input type="text" value={formData.appointment_type || ''} onChange={e => setFormData({ ...formData, appointment_type: e.target.value })} placeholder="e.g., Cardiology" style={styles.input} /></div>
                                            <div><label style={styles.label}>Fees (₹)</label>
                                                <input type="number" value={formData.fees || 0} onChange={e => setFormData({ ...formData, fees: parseInt(e.target.value) || 0 })} style={styles.input} /></div>
                                            <div><label style={styles.label}>Payment Status</label>
                                                <CustomSelect
                                                    value={derivePaymentStatus(formData.status)}
                                                    onChange={v => setFormData({ ...formData, status: v })}
                                                    options={[
                                                        { value: 'unpaid', label: 'Unpaid' },
                                                        { value: 'paid', label: 'Paid' },
                                                        { value: 'rejected', label: 'Rejected' },
                                                    ]}
                                                /></div>
                                        </div>
                                        {editMode && editMode !== 'add-appointment' && (
                                            <div style={{ background: C.white, padding: '14px', borderRadius: '8px', marginTop: '10px' }}>
                                                <h4 style={{ marginBottom: '10px', fontSize: FS.subheading, fontWeight: 700, fontFamily: FF.heading }}>Patient Files (Reports, Prescriptions, X-rays)</h4>
                                                <input type="file" multiple accept=".pdf,.jpg,.jpeg,.png" onChange={handleFileUpload} disabled={fileUploadLoading} style={styles.input} />
                                                <p style={{ fontSize: '11px', color: C.txtMuted, marginTop: '6px' }}>Accepted: PDF, JPG, PNG · Max 10 MB per file.</p>
                                                {fileUploadLoading && <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '10px' }}><div style={{ width: '16px', height: '16px', border: `2px solid ${C.teal}`, borderTop: '2px solid transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} /><span style={{ fontSize: '13px', color: C.teal }}>Uploading…</span></div>}
                                                {fileUploadMsg && <p style={{ marginTop: '10px', fontSize: '13px', color: fileUploadMsg.type === 'success' ? C.success : C.danger }}>{fileUploadMsg.text}</p>}
                                                {uploadedFiles.length > 0 && (
                                                    <div style={{ marginTop: '10px' }}>
                                                        <p style={{ fontWeight: 600, marginBottom: '8px', fontSize: '13px', fontFamily: FF.heading }}>Uploaded Files:</p>
                                                        {uploadedFiles.map(f => (
                                                            <div key={f.id} style={styles.fileItem}>
                                                                <span style={{ fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{f.fileName}</span>
                                                                <div style={{ display: 'flex', gap: '6px', marginLeft: '8px' }}>
                                                                    <a href={f.signedUrl} target="_blank" rel="noopener noreferrer" style={{ ...styles.btnSecondary, padding: '5px 10px', textDecoration: 'none', fontSize: '11px' }}>View</a>
                                                                    <button onClick={() => handleFileDelete(f.filePath, f.id)} style={{ ...styles.btnDanger, fontSize: '11px', padding: '5px 10px' }}>Delete</button>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                        <div style={{ display: 'flex', gap: '10px', marginTop: '14px' }}>
                                            <button onClick={handleSaveAppointment} style={styles.btnPrimary}>Save</button>
                                            <button onClick={() => { setEditMode(null); setUploadedFiles([]); setFileUploadMsg(null); }} style={styles.btnSecondary}>Cancel</button>
                                        </div>
                                    </div>
                                )}

                                {/* Table */}
                                <div style={{ overflowX: 'auto' }}>
                                    <table style={styles.table}>
                                        <thead><tr>
                                            {['Patient', 'Date', 'Time', 'Type', 'Fees', 'Status', 'Actions'].map(h => (
                                                <th key={h} style={styles.th}>{h}</th>
                                            ))}
                                        </tr></thead>
                                        <tbody>
                                            {appointments.filter(apt => {
                                                const td = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`;
                                                const ad = apt.appointment_date || ''; const as = derivePaymentStatus(apt.status);
                                                const ms = apt.patient_name?.toLowerCase().includes(appointmentSearch.toLowerCase()) || false;
                                                const md = appointmentDateFilter ? ad === appointmentDateFilter : true;
                                                let mt = true;
                                                if (appointmentDateTab === 'today') mt = ad === td;
                                                else if (appointmentDateTab === 'upcoming') mt = ad > td && as !== 'rejected';
                                                else if (appointmentDateTab === 'past-completed') mt = ad < td && as !== 'rejected';
                                                else if (appointmentDateTab === 'rejected') mt = as === 'rejected';
                                                return ms && md && mt;
                                            }).map(apt => (
                                                <tr key={apt.id} className="tr-hover">
                                                    <td style={styles.td}><strong>{apt.patient_name || ''}</strong></td>
                                                    <td style={styles.td}>{apt.appointment_date || ''}</td>
                                                    <td style={styles.td}>{apt.appointment_time || ''}</td>
                                                    <td style={styles.td}><span style={{ ...styles.statusBadge(apt.appointment_type), background: C.rowBg, color: C.txtSec, borderRadius: '6px' }}>{apt.appointment_type || ''}</span></td>
                                                    <td style={styles.td}>₹{apt.fees || 0}</td>
                                                    <td style={styles.td}>
                                                        <CustomSelect
                                                            value={derivePaymentStatus(apt.status)}
                                                            onChange={v => handleStatusChange(apt.id, v)}
                                                            options={[
                                                                { value: 'unpaid', label: 'Unpaid' },
                                                                { value: 'paid', label: 'Paid' },
                                                                { value: 'rejected', label: 'Rejected' },
                                                            ]}
                                                            triggerStyle={{ ...styles.statusBadge(apt.status), display: 'inline-flex', width: 'auto', border: 'none' }}
                                                        />
                                                    </td>
                                                    <td style={styles.td}>
                                                        <div style={{ display: 'flex', gap: '6px' }}>
                                                            <button onClick={() => handleEditAppointment(apt)} style={styles.btnSecondary}>Edit</button>
                                                            {confirmDeleteId === apt.id ? (
                                                                <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                                                    <span style={{ fontSize: '11px', color: C.danger, fontWeight: 600 }}>Confirm?</span>
                                                                    <button onClick={() => handleDeleteAppointment(apt.id)} style={{ ...styles.btnPrimary, background: C.danger, fontSize: '11px', padding: '5px 8px' }}>Yes</button>
                                                                    <button onClick={() => setConfirmDeleteId(null)} style={{ ...styles.btnSecondary, fontSize: '11px', padding: '5px 8px' }}>No</button>
                                                                </div>
                                                            ) : (
                                                                <button onClick={() => setConfirmDeleteId(apt.id)} style={styles.btnDanger}>Delete</button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                            {(() => {
                                                const td = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`;
                                                const filtered = appointments.filter(apt => {
                                                    const ad = apt.appointment_date || ''; const as = derivePaymentStatus(apt.status);
                                                    const ms = apt.patient_name?.toLowerCase().includes(appointmentSearch.toLowerCase()) || false;
                                                    const md = appointmentDateFilter ? ad === appointmentDateFilter : true;
                                                    let mt = true;
                                                    if (appointmentDateTab === 'today') mt = ad === td;
                                                    else if (appointmentDateTab === 'upcoming') mt = ad > td && as !== 'rejected';
                                                    else if (appointmentDateTab === 'past-completed') mt = ad < td && as !== 'rejected';
                                                    else if (appointmentDateTab === 'rejected') mt = as === 'rejected';
                                                    return ms && md && mt;
                                                });
                                                if (filtered.length > 0) return null;
                                                const msgs = { 'today': { icon: <Calendar size={32} />, title: 'No appointments today', sub: 'Use "+ Add Appointment" to schedule one.' }, 'upcoming': { icon: <Calendar size={32} />, title: 'No upcoming appointments', sub: 'Future bookings will appear here.' }, 'past-completed': { icon: <Check size={32} />, title: 'No past appointments', sub: 'Completed appointments will appear here.' }, 'rejected': { icon: <Close size={32} />, title: 'No rejected appointments', sub: 'Rejected appointments will appear here.' } };
                                                const m = msgs[appointmentDateTab] || { icon: <ClipboardList size={32} />, title: 'No appointments found', sub: 'Try adjusting your filters.' };
                                                return (<tr><td colSpan="7"><div style={styles.emptyState}><div style={{ ...styles.emptyStateIcon, display: 'flex', justifyContent: 'center', color: C.txtMuted }}>{m.icon}</div><p style={styles.emptyStateTitle}>{m.title}</p><p style={styles.emptyStateSubtitle}>{m.sub}</p></div></td></tr>);
                                            })()}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── Services Tab ── */}
                {activeTab === 'services' && (
                    <div>
                        {/* 3-up summary cards */}
                        <div style={styles.statsGrid3}>
                            {[
                                { label: 'Total Services', value: services.length, accent: C.teal, iconBg: C.tealLight, icon: <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg> },
                                { label: 'Active Services', value: services.length, accent: C.success, iconBg: C.successLight, icon: <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12" /></svg> },
                                { label: 'Categories', value: Math.min(services.length, 5), accent: C.info, iconBg: C.infoLight, icon: <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" /></svg> },
                            ].map((s, i) => (
                                <div key={i} style={styles.statCard(s.accent)}>
                                    <div style={styles.statIconBubble(s.accent, s.iconBg)}>{s.icon}</div>
                                    <p style={styles.statLabel}>{s.label}</p>
                                    <p style={styles.statValue}>{s.value}</p>
                                </div>
                            ))}
                        </div>

                        <div style={styles.card}>
                            <div style={styles.cardHeader}>
                                <span style={styles.cardTitle}>
                                    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M19 11H5m14 0a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-6a2 2 0 0 1 2-2m14 0V9a2 2 0 0 0-2-2M5 11V9a2 2 0 0 1 2-2m0 0V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v2M7 7h10" /></svg>
                                    Manage Services
                                </span>
                            </div>

                            {editMode && editMode.includes('service') && (
                                <div style={{ ...styles.actionCard, margin: '16px 20px' }}>
                                    <h4 style={styles.actionCardTitle}>{editMode === 'add-service' ? 'Add New Service' : 'Edit Service'}</h4>
                                    <div style={{ marginBottom: '12px' }}><label style={styles.label}>Service Name</label>
                                        <input type="text" value={formData.name || ''} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="e.g., Cardiology" style={styles.input} /></div>
                                    <div style={{ marginBottom: '12px' }}><label style={styles.label}>Description</label>
                                        <textarea value={formData.description || ''} onChange={e => setFormData({ ...formData, description: e.target.value })} placeholder="Service description" rows="3" style={{ ...styles.input, resize: 'vertical' }} /></div>
                                    <div style={{ display: 'flex', gap: '10px' }}>
                                        <button onClick={handleSaveService} style={styles.btnPrimary}>Save</button>
                                        <button onClick={() => setEditMode(null)} style={styles.btnSecondary}>Cancel</button>
                                    </div>
                                </div>
                            )}

                            {services.length === 0 ? (
                                <div style={styles.emptyState}><div style={{ ...styles.emptyStateIcon, display: 'flex', justifyContent: 'center', color: C.txtMuted }}><Stethoscope size={32} /></div><p style={styles.emptyStateTitle}>No services added yet</p><p style={styles.emptyStateSubtitle}>Click "+ Add Service" to create your first service.</p></div>
                            ) : (
                                services.map((svc, i) => {
                                    const sc = SERVICE_COLORS[i % SERVICE_COLORS.length];
                                    return (
                                        <div key={svc.id} style={styles.serviceRow}>
                                            <div style={styles.serviceIcon(sc.color, sc.bg)}>
                                                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8zm1-13h-2v4H7v2h4v4h2v-4h4v-2h-4z" /></svg>
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <p style={{ fontSize: FS.subheading, fontWeight: 700, color: C.txtPrimary, fontFamily: FF.heading, marginBottom: '2px' }}>{svc.name}</p>
                                                <p style={{ fontSize: '12px', color: C.txtSec, fontFamily: FF.body }}>{svc.description}</p>
                                            </div>
                                            <div style={{ display: 'flex', gap: '6px' }}>
                                                <button onClick={() => handleEditService(svc)} style={styles.btnSecondary}>Edit</button>
                                                {confirmDeleteId === svc.id ? (
                                                    <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                                        <span style={{ fontSize: '11px', color: C.danger, fontWeight: 600 }}>Confirm?</span>
                                                        <button onClick={() => handleDeleteService(svc.id)} style={{ ...styles.btnPrimary, background: C.danger, fontSize: '11px', padding: '5px 8px' }}>Yes</button>
                                                        <button onClick={() => setConfirmDeleteId(null)} style={{ ...styles.btnSecondary, fontSize: '11px', padding: '5px 8px' }}>No</button>
                                                    </div>
                                                ) : (
                                                    <button onClick={() => setConfirmDeleteId(svc.id)} style={styles.btnDanger}>Delete</button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                )}

                {/* ── Doctors Tab ── */}
                {activeTab === 'doctors' && (
                    <div>
                        {/* 4-up stat cards */}
                        <div style={styles.statsGrid4}>
                            {[
                                { label: 'Total Doctors', value: doctors.length, accent: C.teal, iconBg: C.tealLight, icon: <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg> },
                                { label: 'Active', value: doctors.length, accent: C.success, iconBg: C.successLight, icon: <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12" /></svg> },
                                { label: 'On Leave', value: 0, accent: C.warning, iconBg: C.warningLight, icon: <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg> },
                                { label: 'Specialties', value: new Set(doctors.flatMap(d => Array.isArray(d.specializations) ? d.specializations : [d.specialization]).filter(Boolean)).size, accent: C.info, iconBg: C.infoLight, icon: <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2v-4M9 21H5a2 2 0 0 1-2-2v-4m0 0h18" /></svg> },
                            ].map((s, i) => (
                                <div key={i} style={styles.statCard(s.accent)}>
                                    <div style={styles.statIconBubble(s.accent, s.iconBg)}>{s.icon}</div>
                                    <p style={styles.statLabel}>{s.label}</p>
                                    <p style={styles.statValue}>{s.value}</p>
                                </div>
                            ))}
                        </div>

                        {/* Edit form */}
                        {editMode && editMode.includes('doctor') && (
                            <div style={{ ...styles.card, marginBottom: '20px' }}>
                                <div style={styles.cardHeader}>
                                    <span style={styles.cardTitle}>{editMode === 'add-doctor' ? 'Add New Doctor' : 'Edit Doctor'}</span>
                                </div>
                                <div style={styles.cardBody}>
                                    <div style={styles.formGrid}>
                                        <div><label style={styles.label}>Doctor Name</label><input type="text" value={formData.name || ''} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="e.g., Dr. John Doe" style={styles.input} /></div>
                                        <div><label style={styles.label}>Qualifications (comma-separated)</label><input type="text" value={Array.isArray(formData.qualifications) ? formData.qualifications.join(', ') : ''} onChange={e => setFormData({ ...formData, qualifications: e.target.value.split(',').map(q => q.trim()) })} placeholder="e.g., MBBS, MD" style={styles.input} /></div>
                                        <div><label style={styles.label}>Specializations (comma-separated)</label><input type="text" value={Array.isArray(formData.specializations) ? formData.specializations.join(', ') : ''} onChange={e => setFormData({ ...formData, specializations: e.target.value.split(',').map(s => s.trim()) })} placeholder="e.g., Cardiology" style={styles.input} /></div>
                                        <div><label style={styles.label}>OPD Hours</label><input type="text" value={formData.opdHours || ''} onChange={e => setFormData({ ...formData, opdHours: e.target.value })} placeholder="e.g., Mon-Sat 9AM-2PM" style={styles.input} /></div>
                                        <div><label style={styles.label}>Consultation Fees (₹)</label><input type="number" value={formData.fees || 0} onChange={e => setFormData({ ...formData, fees: parseInt(e.target.value) || 0 })} min="0" style={styles.input} /></div>
                                    </div>
                                    <div style={{ marginBottom: '14px' }}>
                                        <label style={styles.label}>Working Days</label>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(100px,1fr))', gap: '8px', marginTop: '8px' }}>
                                            {[{ value: 0, label: 'Sunday' }, { value: 1, label: 'Monday' }, { value: 2, label: 'Tuesday' }, { value: 3, label: 'Wednesday' }, { value: 4, label: 'Thursday' }, { value: 5, label: 'Friday' }, { value: 6, label: 'Saturday' }].map(day => (
                                                <label key={day.value} style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '12px', fontFamily: FF.body }}>
                                                    <input type="checkbox" checked={formData.opdSchedule?.workingDays?.includes(day.value) || false}
                                                        onChange={e => { const cd = formData.opdSchedule?.workingDays || []; const nd = e.target.checked ? [...cd, day.value] : cd.filter(d => d !== day.value); setFormData({ ...formData, opdSchedule: { ...formData.opdSchedule, workingDays: nd.sort() } }); }}
                                                        style={{ cursor: 'pointer' }} />
                                                    {day.label}
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '14px', marginBottom: '14px' }}>
                                        <div>
                                            <label style={styles.label}>Morning Slot Start</label>
                                            <CustomTimePicker value={formData.opdSchedule?.morningSlot?.start || '09:00'} onChange={v => setFormData({ ...formData, opdSchedule: { ...formData.opdSchedule, morningSlot: { ...formData.opdSchedule?.morningSlot, start: v } } })} />
                                        </div>
                                        <div>
                                            <label style={styles.label}>Morning Slot End</label>
                                            <CustomTimePicker value={formData.opdSchedule?.morningSlot?.end || '14:00'} onChange={v => setFormData({ ...formData, opdSchedule: { ...formData.opdSchedule, morningSlot: { ...formData.opdSchedule?.morningSlot, end: v } } })} />
                                        </div>
                                    </div>
                                    <div style={{ marginBottom: '14px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                                            <label style={{ ...styles.label, margin: 0 }}>Evening Slot</label>
                                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '12px', fontFamily: FF.body }}>
                                                <span style={{ color: formData.opdSchedule?.eveningSlotEnabled !== false ? C.success : C.txtMuted }}>{formData.opdSchedule?.eveningSlotEnabled !== false ? 'Enabled' : 'Disabled'}</span>
                                                <div onClick={() => setFormData({ ...formData, opdSchedule: { ...formData.opdSchedule, eveningSlotEnabled: formData.opdSchedule?.eveningSlotEnabled === false } })}
                                                    style={{ width: '44px', height: '24px', borderRadius: '12px', background: formData.opdSchedule?.eveningSlotEnabled !== false ? C.teal : 'var(--color-border-strong)', position: 'relative', cursor: 'pointer', transition: 'background 0.2s' }}>
                                                    <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#fff', position: 'absolute', top: '2px', left: formData.opdSchedule?.eveningSlotEnabled !== false ? '22px' : '2px', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
                                                </div>
                                            </label>
                                        </div>
                                        {formData.opdSchedule?.eveningSlotEnabled !== false && (
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '14px' }}>
                                                <div><label style={styles.label}>Evening Start</label><CustomTimePicker value={formData.opdSchedule?.eveningSlot?.start || '17:00'} onChange={v => setFormData({ ...formData, opdSchedule: { ...formData.opdSchedule, eveningSlot: { ...formData.opdSchedule?.eveningSlot, start: v } } })} /></div>
                                                <div><label style={styles.label}>Evening End</label><CustomTimePicker value={formData.opdSchedule?.eveningSlot?.end || '20:00'} onChange={v => setFormData({ ...formData, opdSchedule: { ...formData.opdSchedule, eveningSlot: { ...formData.opdSchedule?.eveningSlot, end: v } } })} /></div>
                                            </div>
                                        )}
                                    </div>
                                    <div style={{ marginBottom: '14px' }}>
                                        <label style={styles.label}>Profile Image</label>
                                        <input type="file" accept="image/*" onChange={handleImageUpload} style={styles.input} />
                                        {formData.image && <div style={{ marginTop: '10px' }}><img src={formData.image} alt="Preview" style={{ maxWidth: '120px', borderRadius: '8px' }} /></div>}
                                    </div>
                                    <div style={{ display: 'flex', gap: '10px' }}>
                                        <button onClick={handleSaveDoctor} style={styles.btnPrimary}>Save</button>
                                        <button onClick={() => setEditMode(null)} style={styles.btnSecondary}>Cancel</button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Doctor cards grid */}
                        {doctors.length === 0 ? (
                            <div style={{ ...styles.card }}>
                                <div style={styles.emptyState}><div style={{ ...styles.emptyStateIcon, display: 'flex', justifyContent: 'center', color: C.txtMuted }}><UserCircle size={32} /></div><p style={styles.emptyStateTitle}>No doctors added yet</p><p style={styles.emptyStateSubtitle}>Click "+ Add Doctor" to add the first doctor profile.</p></div>
                            </div>
                        ) : (
                            <div style={styles.doctorGrid}>
                                {doctors.map((doc, i) => {
                                    const ac = AVATAR_COLORS[i % AVATAR_COLORS.length];
                                    const initials = (doc.full_name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
                                    const specs = (Array.isArray(doc.specializations) ? doc.specializations : [doc.specialization]).filter(Boolean).join(', ');
                                    return (
                                        <div key={doc.id} style={styles.doctorCard}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                {doc.image_url ? (
                                                    <img src={doc.image_url} alt={doc.full_name} style={{ width: '48px', height: '48px', borderRadius: '12px', objectFit: 'cover', flexShrink: 0 }} />
                                                ) : (
                                                    <div style={styles.doctorInitial(ac.color, ac.bg)}>{initials}</div>
                                                )}
                                                <div>
                                                    <p style={{ fontSize: FS.subheading, fontWeight: 700, color: C.txtPrimary, fontFamily: FF.heading, marginBottom: '2px' }}>{doc.full_name}</p>
                                                    <p style={{ fontSize: '11px', color: C.txtSec, fontFamily: FF.body }}>{specs || 'General'}</p>
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px', color: C.txtSec, fontFamily: FF.body }}>
                                                <span><strong>Quals:</strong> {(Array.isArray(doc.qualifications) ? doc.qualifications : [doc.qualification]).filter(Boolean).join(', ')}</span>
                                                <span><strong>OPD:</strong> {doc.opd_hours || '—'}</span>
                                                <span><strong>Fees:</strong> ₹{doc.fees || 0}</span>
                                            </div>
                                            <div style={{ display: 'flex', gap: '6px' }}>
                                                <button onClick={() => handleEditDoctor(doc)} style={{ ...styles.btnSecondary, flex: 1, justifyContent: 'center' }}>Edit</button>
                                                {confirmDeleteId === doc.id ? (
                                                    <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                                        <span style={{ fontSize: '11px', color: C.danger, fontWeight: 600 }}>Confirm?</span>
                                                        <button onClick={() => handleDeleteDoctor(doc.id)} style={{ ...styles.btnPrimary, background: C.danger, fontSize: '11px', padding: '5px 8px' }}>Yes</button>
                                                        <button onClick={() => setConfirmDeleteId(null)} style={{ ...styles.btnSecondary, fontSize: '11px', padding: '5px 8px' }}>No</button>
                                                    </div>
                                                ) : (
                                                    <button onClick={() => setConfirmDeleteId(doc.id)} style={{ ...styles.btnDanger, flex: 1, textAlign: 'center' }}>Delete</button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                {/* ── Settings Tab ── */}
                {activeTab === 'settings' && (
                    <div>
                        {/* OPD Hours */}
                        <div style={styles.settingsSection}>
                            <div style={styles.settingsSectionHeader}>
                                <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                                OPD Hours
                                {editMode !== 'opd-hours' && <button onClick={() => { setEditMode('opd-hours'); setFormData(settings.opdHours || {}); }} style={{ ...styles.btnSecondary, marginLeft: 'auto', fontSize: '11px', padding: '4px 12px' }}>Edit</button>}
                            </div>
                            <div style={styles.settingsBody}>
                                {editMode === 'opd-hours' ? (
                                    <div>
                                        <div style={{ marginBottom: '10px' }}><label style={styles.label}>Weekdays</label><input type="text" value={formData.weekdays || ''} onChange={e => setFormData({ ...formData, weekdays: e.target.value })} style={styles.input} /></div>
                                        <div style={{ marginBottom: '10px' }}><label style={styles.label}>Saturday</label><input type="text" value={formData.saturday || ''} onChange={e => setFormData({ ...formData, saturday: e.target.value })} style={styles.input} /></div>
                                        <div style={{ marginBottom: '14px' }}><label style={styles.label}>Sunday</label><input type="text" value={formData.sunday || ''} onChange={e => setFormData({ ...formData, sunday: e.target.value })} style={styles.input} /></div>
                                        <div style={{ display: 'flex', gap: '10px' }}><button onClick={handleSaveOpdHours} style={styles.btnPrimary}>Save</button><button onClick={() => setEditMode(null)} style={styles.btnSecondary}>Cancel</button></div>
                                    </div>
                                ) : (
                                    <div style={{ fontSize: '13px', color: C.txtSec, fontFamily: FF.body, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                        <p><strong style={{ color: C.txtPrimary }}>Weekdays:</strong> {settings.opdHours?.weekdays || '—'}</p>
                                        <p><strong style={{ color: C.txtPrimary }}>Saturday:</strong> {settings.opdHours?.saturday || '—'}</p>
                                        <p><strong style={{ color: C.txtPrimary }}>Sunday:</strong> {settings.opdHours?.sunday || '—'}</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Contact Information */}
                        <div style={styles.settingsSection}>
                            <div style={styles.settingsSectionHeader}>
                                <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.63 3.42 2 2 0 0 1 3.6 2h3A2 2 0 0 1 8.6 3.63 12.4 12.4 0 0 0 9.27 6a2 2 0 0 1-.45 2.11L7.91 9a16 16 0 0 0 6 6l.91-.91A2 2 0 0 1 17 13.73a12.4 12.4 0 0 0 2.37.67A2 2 0 0 1 22 16.92z" /></svg>
                                Contact Information
                                {editMode !== 'contact' && <button onClick={() => { setEditMode('contact'); setFormData(settings.contact || {}); }} style={{ ...styles.btnSecondary, marginLeft: 'auto', fontSize: '11px', padding: '4px 12px' }}>Edit</button>}
                            </div>
                            <div style={styles.settingsBody}>
                                {editMode === 'contact' ? (
                                    <div>
                                        <div style={{ marginBottom: '10px' }}><label style={styles.label}>Phone Number</label><input type="tel" value={formData.phone || ''} onChange={e => setFormData({ ...formData, phone: e.target.value })} style={styles.input} /></div>
                                        <div style={{ marginBottom: '10px' }}><label style={styles.label}>WhatsApp Number</label><input type="tel" value={formData.whatsapp || ''} onChange={e => setFormData({ ...formData, whatsapp: e.target.value })} style={styles.input} /></div>
                                        <div style={{ marginBottom: '10px' }}><label style={styles.label}>Email Address</label><input type="email" value={formData.email || ''} onChange={e => setFormData({ ...formData, email: e.target.value })} style={styles.input} /></div>
                                        <div style={{ marginBottom: '14px' }}><label style={styles.label}>Physical Address</label><textarea value={formData.address || ''} onChange={e => setFormData({ ...formData, address: e.target.value })} rows="2" style={{ ...styles.input, resize: 'vertical' }} /></div>
                                        <div style={{ display: 'flex', gap: '10px' }}><button onClick={handleSaveContact} style={styles.btnPrimary}>Save</button><button onClick={() => setEditMode(null)} style={styles.btnSecondary}>Cancel</button></div>
                                    </div>
                                ) : (
                                    <div style={{ fontSize: '13px', color: C.txtSec, fontFamily: FF.body, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                        <p><strong style={{ color: C.txtPrimary }}>Phone:</strong> {settings.contact?.phone || '—'}</p>
                                        <p><strong style={{ color: C.txtPrimary }}>WhatsApp:</strong> {settings.contact?.whatsapp || '—'}</p>
                                        <p><strong style={{ color: C.txtPrimary }}>Email:</strong> {settings.contact?.email || '—'}</p>
                                        <p><strong style={{ color: C.txtPrimary }}>Address:</strong> {settings.contact?.address || '—'}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* ── Staff & Roles Tab (admin only) ── */}
                {activeTab === 'staff' && userRole === 'admin' && (
                    <div>
                        {/* Add / Edit staff form */}
                        {(editMode === 'add-staff' || (editMode || '').startsWith('edit-staff-')) && (
                            <div style={styles.card}>
                                <div style={styles.cardHeader}>
                                    <span style={styles.cardTitle}>
                                        {editMode === 'add-staff' ? 'Add Staff Account' : 'Edit Staff Account'}
                                    </span>
                                </div>
                                <div style={styles.cardBody}>
                                    <div style={styles.formGrid}>
                                        <div>
                                            <label style={styles.label}>Full Name</label>
                                            <input type="text" value={formData.full_name || ''} onChange={e => setFormData({ ...formData, full_name: e.target.value })} style={styles.input} placeholder="e.g. Sunita Sharma" />
                                        </div>
                                        <div>
                                            <label style={styles.label}>Email</label>
                                            <input type="email" value={formData.email || ''} onChange={e => setFormData({ ...formData, email: e.target.value })} style={styles.input} placeholder="staff@shivajihospital.com" disabled={editMode !== 'add-staff'} />
                                        </div>
                                        <div>
                                            <label style={styles.label}>Role</label>
                                            <CustomSelect
                                                value={formData.role || 'reception'}
                                                onChange={handleStaffRoleChange}
                                                disabled={formData.id === currentUserId}
                                                options={ASSIGNABLE_ROLES.map(r => ({ value: r, label: ROLE_LABELS[r] || r }))}
                                            />
                                        </div>
                                        <div>
                                            <label style={styles.label}>{editMode === 'add-staff' ? 'Password (min 10 chars)' : 'New Password (leave blank to keep)'}</label>
                                            <input type="password" value={formData.password || ''} onChange={e => setFormData({ ...formData, password: e.target.value })} style={styles.input} placeholder="••••••••••" autoComplete="new-password" />
                                        </div>
                                    </div>

                                    {/* Access control — admin decides exactly what this user can do */}
                                    {formData.role !== 'admin' ? (
                                        <div style={{ ...styles.actionCard, borderLeft: 'none', borderRadius: '10px', marginTop: '4px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap', marginBottom: '12px' }}>
                                                <p style={{ ...styles.actionCardTitle, marginBottom: 0 }}>Access</p>
                                                <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: C.txtSec, fontFamily: FF.body, cursor: 'pointer' }}>
                                                    <input
                                                        type="checkbox"
                                                        checked={!!formData.useDefaultAccess}
                                                        onChange={e => setFormData(prev => ({
                                                            ...prev,
                                                            useDefaultAccess: e.target.checked,
                                                            permissions: e.target.checked ? (DEFAULT_PERMISSIONS_BY_ROLE[prev.role] || []) : prev.permissions,
                                                        }))}
                                                    />
                                                    Use the role's standard access
                                                </label>
                                            </div>
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: '8px' }}>
                                                {PERMISSIONS.map(p => (
                                                    <label key={p.id} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: formData.useDefaultAccess ? C.txtMuted : C.txtPrimary, fontFamily: FF.body, cursor: 'pointer' }}>
                                                        <input
                                                            type="checkbox"
                                                            checked={(formData.permissions || []).includes(p.id)}
                                                            onChange={() => toggleStaffPermission(p.id)}
                                                            disabled={!!formData.useDefaultAccess}
                                                        />
                                                        {p.label}
                                                    </label>
                                                ))}
                                            </div>
                                            {!formData.useDefaultAccess && (
                                                <p style={{ fontSize: '11px', color: C.txtMuted, fontFamily: FF.body, margin: '10px 0 0' }}>
                                                    Custom access overrides the role's defaults for this user. Staff management always stays admin-only.
                                                </p>
                                            )}
                                        </div>
                                    ) : (
                                        <p style={{ fontSize: '12px', color: C.txtMuted, fontFamily: FF.body, margin: '0 0 14px' }}>
                                            Administrators always have full access — including staff management.
                                        </p>
                                    )}

                                    <div style={{ display: 'flex', gap: '10px' }}>
                                        <button onClick={handleSaveStaff} style={styles.btnPrimary}>
                                            {editMode === 'add-staff' ? 'Create Account' : 'Save Changes'}
                                        </button>
                                        <button onClick={() => setEditMode(null)} style={styles.btnSecondary}>Cancel</button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Staff list */}
                        <div style={styles.card}>
                            <div style={styles.cardHeader}>
                                <span style={styles.cardTitle}>Staff Accounts &amp; Roles</span>
                                <span style={{ fontSize: '12px', color: C.txtMuted, fontFamily: FF.body }}>
                                    Only administrators can create, change, or remove accounts
                                </span>
                            </div>
                            {staffUsers.length === 0 ? (
                                <div style={styles.emptyState}>
                                    <div style={{ ...styles.emptyStateIcon, display: 'flex', justifyContent: 'center', color: C.txtMuted }}><UserCircle size={32} /></div>
                                    <p style={styles.emptyStateTitle}>No staff accounts yet</p>
                                    <p style={styles.emptyStateSubtitle}>Click "+ Add Staff" to create reception, pathology lab, or medical store accounts.</p>
                                </div>
                            ) : (
                                <div style={{ overflowX: 'auto' }}>
                                <table style={styles.table}>
                                    <thead>
                                        <tr>
                                            <th style={styles.th}>Name</th>
                                            <th style={styles.th}>Email</th>
                                            <th style={styles.th}>Role</th>
                                            <th style={styles.th}>Last Sign-in</th>
                                            <th style={styles.th}>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {staffUsers.map((u, i) => {
                                            const ac = AVATAR_COLORS[i % AVATAR_COLORS.length];
                                            const initials = (u.full_name || u.email || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
                                            const isSelf = u.id === currentUserId;
                                            return (
                                                <tr key={u.id} className="tr-hover">
                                                    <td style={styles.td}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                            <div style={styles.doctorInitial(ac.color, ac.bg)}>{initials}</div>
                                                            <span style={{ fontWeight: 600 }}>{u.full_name || '—'}{isSelf && <span style={{ color: C.txtMuted, fontWeight: 400 }}> (you)</span>}</span>
                                                        </div>
                                                    </td>
                                                    <td style={styles.td}>{u.email}</td>
                                                    <td style={styles.td}>
                                                        <span style={{ padding: '5px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 600, background: u.role === 'admin' ? C.tealLight : C.infoLight, color: u.role === 'admin' ? C.coral : C.info, fontFamily: FF.body }}>
                                                            {ROLE_LABELS[u.role] || u.role || 'No role'}
                                                        </span>
                                                        {u.custom_permissions && (
                                                            <span title={`Custom access: ${u.custom_permissions.join(', ') || 'none'}`} style={{ marginLeft: '6px', padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 600, background: C.warningLight, color: C.warning, fontFamily: FF.body }}>
                                                                Custom access
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td style={styles.td}>{u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Never'}</td>
                                                    <td style={styles.td}>
                                                        <div style={{ display: 'flex', gap: '6px' }}>
                                                            <button onClick={() => handleEditStaff(u)} style={styles.btnSecondary}>Edit</button>
                                                            {!isSelf && (confirmDeleteId === u.id ? (
                                                                <span style={{ display: 'inline-flex', gap: '4px', alignItems: 'center' }}>
                                                                    <span style={{ fontSize: '11px', color: C.danger, fontWeight: 600 }}>Confirm?</span>
                                                                    <button onClick={() => handleDeleteStaff(u.id)} style={{ ...styles.btnPrimary, background: C.danger, color: '#fff', fontSize: '11px', padding: '5px 8px' }}>Yes</button>
                                                                    <button onClick={() => setConfirmDeleteId(null)} style={{ ...styles.btnSecondary, fontSize: '11px', padding: '5px 8px' }}>No</button>
                                                                </span>
                                                            ) : (
                                                                <button onClick={() => setConfirmDeleteId(u.id)} style={styles.btnDanger}>Remove</button>
                                                            ))}
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                                </div>
                            )}
                        </div>

                        {/* Role explanation */}
                        <div style={styles.card}>
                            <div style={styles.cardHeader}>
                                <span style={styles.cardTitle}>What each role can access</span>
                            </div>
                            <div style={{ ...styles.cardBody, display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: '14px' }}>
                                {[
                                    ['Administrator', 'Everything — appointments, services, doctors, settings, and staff management.'],
                                    ['Doctor', 'Appointments, patients, and medical records.'],
                                    ['Reception', 'Appointments and patient registration at the front desk.'],
                                    ['Pathology Lab', 'Appointments plus uploading lab reports and medical files.'],
                                    ['Medical Store', 'View appointments to verify prescriptions. No edit access.'],
                                ].map(([role, desc]) => (
                                    <div key={role} style={{ padding: '12px 14px', background: C.rowBg, borderRadius: '10px', border: `1px solid ${C.border}` }}>
                                        <p style={{ fontSize: FS.subheading, fontWeight: 700, color: C.txtPrimary, fontFamily: FF.heading, marginBottom: '4px' }}>{role}</p>
                                        <p style={{ fontSize: '12px', color: C.txtSec, fontFamily: FF.body, margin: 0 }}>{desc}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

            </main>

        </div>
    );
}
