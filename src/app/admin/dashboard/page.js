'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useLoader } from '@/context/LoaderContext';

export default function AdminDashboard() {
    const router = useRouter();
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [activeTab, setActiveTab] = useState('appointments');
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
    const { showLoader, hideLoader } = useLoader();

    // Helper function to get auth headers
    const getAuthHeaders = () => {
        const token = localStorage.getItem('authToken');
        return token ? { 'Authorization': `Bearer ${token}` } : {};
    };

    // Filters for appointments
    const [appointmentSearch, setAppointmentSearch] = useState('');
    const [appointmentDateFilter, setAppointmentDateFilter] = useState('');

    const loadData = async () => {
        setIsLoading(true);
        showLoader(300); // Show loader with 300ms minimum
        const headers = getAuthHeaders();
        try {
            const [aptsRes, docsRes, svcRes, settingsRes] = await Promise.all([
                fetch('/api/admin/appointments', { headers: getAuthHeaders() }),
                fetch('/api/admin/doctors', { headers: getAuthHeaders() }),
                fetch('/api/admin/services', { headers: getAuthHeaders() }),
                fetch('/api/admin/settings', { headers: getAuthHeaders() }),
            ]);
            const [aptsJson, docsJson, svcJson, settingsJson] = await Promise.all([
                aptsRes.json(), docsRes.json(), svcRes.json(), settingsRes.json()
            ]);
            if (aptsJson.success) setAppointments(aptsJson.data || []);
            if (docsJson.success) setDoctors(docsJson.data || []);
            if (svcJson.success) setServices(svcJson.data || []);
            if (settingsJson.success && settingsJson.data) setSettings(settingsJson.data);
        } catch (err) {
            console.error('Load data error:', err);
        } finally {
            setIsLoading(false);
            hideLoader();
        }
    };

    useEffect(() => {
        const auth = localStorage.getItem('adminAuth');
        const token = localStorage.getItem('authToken');
        if (auth === 'true' && token) {
            setIsAuthenticated(true);
            loadData();
        } else {
            router.push('/admin/login');
        }
    }, [router]);

    const handleLogout = () => {
        localStorage.removeItem('adminAuth');
        localStorage.removeItem('authToken');
        localStorage.removeItem('userRole');
        router.push('/admin/login');
    };

    // OPD Hours & Contact saved to Supabase hospital_settings
    const handleSaveOpdHours = async () => {
        await fetch('/api/admin/settings', {
            method: 'PUT',
            headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
            body: JSON.stringify({ key: 'opdHours', value: formData }),
        });
        await loadData();
        setEditMode(null);
        alert('OPD Hours updated successfully!');
    };

    const handleSaveContact = async () => {
        await fetch('/api/admin/settings', {
            method: 'PUT',
            headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
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
        if (editMode === 'add-service') {
            await fetch('/api/admin/services', {
                headers: getAuthHeaders(),
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });
            alert('Service added successfully!');
        } else {
            const id = editMode.replace('edit-service-', '');
            await fetch(`/api/admin/services/${id}`, {
                method: 'PUT',
                headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });
            alert('Service updated successfully!');
        }
        await loadData();
        setEditMode(null);
    };

    const handleDeleteService = async (id) => {
        const res = await fetch(`/api/admin/services/${id}`, { method: 'DELETE', headers: getAuthHeaders() });
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

        let res;
        if (editMode === 'add-doctor') {
            res = await fetch('/api/admin/doctors', {
                method: 'POST',
                headers: getAuthHeaders(),
                body: fd
            });
        } else {
            const id = editMode.replace('edit-doctor-', '');
            res = await fetch(`/api/admin/doctors/${id}`, {
                method: 'PUT',
                headers: getAuthHeaders(),
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
        const res = await fetch(`/api/admin/doctors/${id}`, { method: 'DELETE', headers: getAuthHeaders() });
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
            const res = await fetch(`/api/appointments/${appointmentId}/files`);
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
            for (const file of files) {
                const fd = new FormData();
                fd.append('file', file);

                const res = await fetch(`/api/appointments/${appointmentId}/files`, {
                    method: 'POST',
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
            const res = await fetch(`/api/appointments/${appointmentId}/files`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
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
            const res = await fetch('/api/appointments/admin-save', {
                method: 'POST',
                headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
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
        const res = await fetch(`/api/admin/appointments/${id}`, { method: 'DELETE', headers: getAuthHeaders() });
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
            const res = await fetch('/api/appointments/admin-save', {
                method: 'POST',
                headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
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
    const paidAppointments = appointments.filter(a => {
        const s = (a.status || '').toLowerCase();
        return s === 'paid';
    }).length;
    // Unpaid appointments count (exclude rejected)
    const unpaidAppointments = appointments.filter(a => {
        const s = (a.status || '').toLowerCase();
        return s === 'unpaid';
    }).length;
    // Total revenue - only from paid appointments, using fees field
    const totalRevenue = appointments
        .filter(a => (a.status || '').toLowerCase() === 'paid')
        .reduce((sum, apt) => sum + (apt.fees || 0), 0);

    const stats = [
        { label: 'Total Appointments', value: totalAppointments.toString() },
        { label: 'Paid', value: paidAppointments.toString() },
        { label: 'Unpaid', value: unpaidAppointments.toString() },
        { label: 'Total Revenue', value: `₹${totalRevenue.toLocaleString()}` },
    ];

    return (
        <div className="page-wrapper">
            {/* Admin Header */}
            <header className="modern-header" style={{ background: 'var(--color-text-primary)', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                <div className="container">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--space-3) 0' }}>
                        <div>
                            <h2 style={{ color: 'var(--color-white)', margin: 0, fontSize: 'var(--text-xl)' }}>
                                Shivaji Hospital - Admin Dashboard
                            </h2>
                        </div>
                        <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center' }}>
                            <button onClick={handleLogout} className="btn btn-primary" style={{ fontSize: 'var(--text-sm)' }}>
                                Logout
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            <section className="section">
                <div className="container">
                    {/* Stats Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 'var(--space-4)', marginBottom: 'var(--space-8)' }}>
                        {stats.map((stat, index) => (
                            <div key={index} className="card">
                                <p className="text-secondary" style={{ fontSize: 'var(--text-sm)', marginBottom: 'var(--space-1)' }}>
                                    {stat.label}
                                </p>
                                <h2 style={{ marginBottom: 0 }}>{stat.value}</h2>
                            </div>
                        ))}
                    </div>

                    {/* Tabs */}
                    <div style={{ marginBottom: 'var(--space-4)' }}>
                        <div style={{ display: 'flex', gap: 'var(--space-2)', borderBottom: '2px solid var(--color-border)', flexWrap: 'wrap' }}>
                            {['appointments', 'services', 'doctors', 'settings'].map((tab) => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    style={{
                                        padding: 'var(--space-3) var(--space-4)',
                                        background: 'none',
                                        border: 'none',
                                        borderBottom: activeTab === tab ? '2px solid var(--color-teal)' : '2px solid transparent',
                                        color: activeTab === tab ? 'var(--color-teal)' : 'var(--color-text-secondary)',
                                        fontWeight: activeTab === tab ? '600' : '400',
                                        fontFamily: 'var(--font-sans)',
                                        cursor: 'pointer',
                                        textTransform: 'capitalize',
                                        transition: 'all var(--transition-fast)',
                                        marginBottom: '-2px'
                                    }}
                                >
                                    {tab}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Appointments Tab */}
                    {activeTab === 'appointments' && (
                        <div className="card">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
                                <h3>Manage Appointments</h3>
                                <button onClick={handleAddAppointment} className="btn btn-primary">
                                    + Add Appointment
                                </button>
                            </div>

                            <div style={{ display: 'flex', gap: 'var(--space-3)', marginBottom: 'var(--space-4)', alignItems: 'center', flexWrap: 'wrap' }}>
                                <div className="form-group" style={{ margin: 0, flex: 1, minWidth: '200px' }}>
                                    <input
                                        type="text"
                                        placeholder="Search by patient name..."
                                        value={appointmentSearch}
                                        onChange={(e) => setAppointmentSearch(e.target.value)}
                                        style={{ width: '100%', padding: 'var(--space-2)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-base)' }}
                                    />
                                </div>
                                <div className="form-group" style={{ margin: 0, minWidth: '150px' }}>
                                    <input
                                        type="date"
                                        value={appointmentDateFilter}
                                        onChange={(e) => setAppointmentDateFilter(e.target.value)}
                                        style={{ width: '100%', padding: 'var(--space-2)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-base)' }}
                                    />
                                </div>
                                {(appointmentSearch || appointmentDateFilter) && (
                                    <button
                                        onClick={() => { setAppointmentSearch(''); setAppointmentDateFilter(''); }}
                                        className="btn btn-secondary"
                                        style={{ padding: '8px 16px', height: 'fit-content' }}
                                    >
                                        Clear Filters
                                    </button>
                                )}
                            </div>

                            {editMode && editMode.includes('appointment') && (
                                <div style={{ background: 'var(--color-accent-blue)', padding: 'var(--space-4)', borderRadius: 'var(--radius-lg)', marginBottom: 'var(--space-4)' }}>
                                    <h4 className="mb-3">{editMode === 'add-appointment' ? 'Add New Appointment' : 'Edit Appointment'}</h4>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-3)' }}>
                                        <div className="form-group">
                                            <label>Patient Name</label>
                                            <input
                                                type="text"
                                                value={formData.patient_name || ''}
                                                onChange={(e) => setFormData({ ...formData, patient_name: e.target.value })}
                                                placeholder="e.g., John Doe"
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label>Date</label>
                                            <input
                                                type="date"
                                                value={formData.appointment_date || ''}
                                                onChange={(e) => setFormData({ ...formData, appointment_date: e.target.value })}
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label>Time</label>
                                            <input
                                                type="time"
                                                value={formData.appointment_time || ''}
                                                onChange={(e) => setFormData({ ...formData, appointment_time: e.target.value })}
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label>Type</label>
                                            <input
                                                type="text"
                                                value={formData.appointment_type || ''}
                                                onChange={(e) => setFormData({ ...formData, appointment_type: e.target.value })}
                                                placeholder="e.g., Cardiology"
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label>Fees (₹)</label>
                                            <input
                                                type="number"
                                                value={formData.fees || 0}
                                                onChange={(e) => setFormData({ ...formData, fees: parseInt(e.target.value) || 0 })}
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label>Payment Status</label>
                                            <select
                                                value={formData.status || 'pending'}
                                                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                                style={{ width: '100%', padding: 'var(--space-2)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-base)' }}
                                            >
                                                <option value="paid">Paid</option>
                                                <option value="unpaid">Unpaid</option>
                                                <option value="rejected">Rejected</option>
                                            </select>
                                        </div>
                                    </div>

                                    {/* Patient Files Section */}
                                    {editMode && editMode !== 'add-appointment' && (
                                        <div style={{ background: 'white', padding: 'var(--space-4)', borderRadius: 'var(--radius-lg)', marginTop: 'var(--space-3)' }}>
                                            <h4 style={{ marginBottom: 'var(--space-3)', fontSize: 'var(--text-lg)' }}>Patient Files (Reports, Prescriptions, X-rays)</h4>
                                            <div className="form-group">
                                                <input
                                                    type="file"
                                                    multiple
                                                    accept=".pdf,.jpg,.jpeg,.png"
                                                    onChange={handleFileUpload}
                                                    disabled={fileUploadLoading}
                                                />
                                                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginTop: 'var(--space-1)' }}>Accepted: PDF, JPG, PNG. Max 10MB per file.</p>
                                            </div>
                                            {fileUploadLoading && (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginTop: 'var(--space-2)' }}>
                                                    <div style={{ width: '18px', height: '18px', border: '2px solid var(--color-teal)', borderTop: '2px solid transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                                                    <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-teal)' }}>Uploading...</span>
                                                </div>
                                            )}
                                            {fileUploadMsg && (
                                                <p style={{ marginTop: 'var(--space-2)', fontSize: 'var(--text-sm)', color: fileUploadMsg.type === 'success' ? '#2e7d32' : '#c62828' }}>
                                                    {fileUploadMsg.text}
                                                </p>
                                            )}
                                            {uploadedFiles.length > 0 && (
                                                <div style={{ marginTop: 'var(--space-3)' }}>
                                                    <p style={{ fontWeight: '600', marginBottom: 'var(--space-2)', fontSize: 'var(--text-sm)' }}>Uploaded Files:</p>
                                                    {uploadedFiles.map((f) => (
                                                        <div key={f.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--space-2)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-1)' }}>
                                                            <span style={{ fontSize: 'var(--text-sm)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{f.fileName}</span>
                                                            <div style={{ display: 'flex', gap: 'var(--space-1)', marginLeft: 'var(--space-2)', flexShrink: 0 }}>
                                                                <a
                                                                    href={f.signedUrl}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="btn btn-secondary"
                                                                    style={{ fontSize: 'var(--text-sm)', padding: 'var(--space-1) var(--space-2)', textDecoration: 'none' }}
                                                                >View</a>
                                                                <button
                                                                    onClick={() => handleFileDelete(f.filePath, f.id)}
                                                                    className="btn btn-secondary"
                                                                    style={{ fontSize: 'var(--text-sm)', padding: 'var(--space-1) var(--space-2)', color: '#f44336' }}
                                                                >Delete</button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-3)' }}>
                                        <button onClick={handleSaveAppointment} className="btn btn-primary">Save</button>
                                        <button onClick={() => { setEditMode(null); setUploadedFiles([]); setFileUploadMsg(null); }} className="btn btn-secondary">Cancel</button>
                                    </div>
                                </div>
                            )}

                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
                                            <th style={{ padding: 'var(--space-3)', textAlign: 'left' }}>Patient</th>
                                            <th style={{ padding: 'var(--space-3)', textAlign: 'left' }}>Date</th>
                                            <th style={{ padding: 'var(--space-3)', textAlign: 'left' }}>Time</th>
                                            <th style={{ padding: 'var(--space-3)', textAlign: 'left' }}>Type</th>
                                            <th style={{ padding: 'var(--space-3)', textAlign: 'left' }}>Fees</th>
                                            <th style={{ padding: 'var(--space-3)', textAlign: 'left' }}>Status</th>
                                            <th style={{ padding: 'var(--space-3)', textAlign: 'left' }}>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {appointments
                                            .filter(apt => {
                                                const matchesSearch = apt.patient_name?.toLowerCase().includes(appointmentSearch.toLowerCase()) || false;
                                                const matchesDate = appointmentDateFilter ? apt.appointment_date === appointmentDateFilter : true;
                                                return matchesSearch && matchesDate;
                                            })
                                            .map((apt) => (
                                                <tr key={apt.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                                                    <td style={{ padding: 'var(--space-3)' }}>{apt.patient_name || ''}</td>
                                                    <td style={{ padding: 'var(--space-3)' }}>{apt.appointment_date || ''}</td>
                                                    <td style={{ padding: 'var(--space-3)' }}>{apt.appointment_time || ''}</td>
                                                    <td style={{ padding: 'var(--space-3)' }}>{apt.appointment_type || ''}</td>
                                                    <td style={{ padding: 'var(--space-3)' }}>₹{apt.fees || 0}</td>
                                                    <td style={{ padding: 'var(--space-3)' }}>
                                                        <select
                                                            value={apt.status || 'pending'}
                                                            onChange={(e) => handleStatusChange(apt.id, e.target.value)}
                                                            style={{
                                                                padding: '6px 10px',
                                                                borderRadius: 'var(--radius-md)',
                                                                border: '1px solid var(--color-border)',
                                                                fontFamily: 'var(--font-sans)',
                                                                fontSize: 'var(--text-sm)',
                                                                background: (apt.status === 'Paid' || apt.status === 'paid' || apt.status === 'Confirmed' || apt.status === 'confirmed') ? '#e8f5e9' :
                                                                    (apt.status === 'Unpaid' || apt.status === 'unpaid' || apt.status === 'pending' || apt.status === 'Pending') ? '#fff3e0' :
                                                                        (apt.status === 'Rejected' || apt.status === 'cancelled') ? '#ffebee' : '#fff',
                                                                color: (apt.status === 'Paid' || apt.status === 'paid' || apt.status === 'Confirmed' || apt.status === 'confirmed') ? '#2e7d32' :
                                                                    (apt.status === 'Unpaid' || apt.status === 'unpaid' || apt.status === 'pending' || apt.status === 'Pending') ? '#e65100' :
                                                                        (apt.status === 'Rejected' || apt.status === 'cancelled') ? '#c62828' : '#1a1a2e',
                                                                cursor: 'pointer',
                                                                fontWeight: 500,
                                                                minWidth: '100px'
                                                            }}
                                                        >
                                                            <option value="paid">Paid</option>
                                                            <option value="unpaid">Unpaid</option>
                                                            <option value="rejected">Rejected</option>
                                                        </select>
                                                    </td>
                                                    <td style={{ padding: 'var(--space-3)' }}>
                                                        <div style={{ display: 'flex', gap: 'var(--space-1)' }}>
                                                            <button
                                                                onClick={() => handleEditAppointment(apt)}
                                                                className="btn btn-secondary"
                                                                style={{ fontSize: 'var(--text-sm)', padding: 'var(--space-1) var(--space-2)' }}
                                                            >
                                                                Edit
                                                            </button>
                                                            {confirmDeleteId === apt.id ? (
                                                                <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                                                    <span style={{ fontSize: 'var(--text-sm)', color: '#f44336', fontWeight: 600 }}>Confirm?</span>
                                                                    <button
                                                                        onClick={() => handleDeleteAppointment(apt.id)}
                                                                        className="btn btn-secondary"
                                                                        style={{ fontSize: 'var(--text-sm)', padding: '2px 10px', background: '#f44336', color: '#fff', border: 'none' }}
                                                                    >
                                                                        Yes
                                                                    </button>
                                                                    <button
                                                                        onClick={() => setConfirmDeleteId(null)}
                                                                        className="btn btn-secondary"
                                                                        style={{ fontSize: 'var(--text-sm)', padding: '2px 10px' }}
                                                                    >
                                                                        No
                                                                    </button>
                                                                </div>
                                                            ) : (
                                                                <button
                                                                    onClick={() => setConfirmDeleteId(apt.id)}
                                                                    className="btn btn-secondary"
                                                                    style={{ fontSize: 'var(--text-sm)', padding: 'var(--space-1) var(--space-2)', color: '#f44336' }}
                                                                >
                                                                    Delete
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Services Tab */}
                    {activeTab === 'services' && (
                        <div className="card">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
                                <h3>Manage Services</h3>
                                <button onClick={handleAddService} className="btn btn-primary">
                                    + Add Service
                                </button>
                            </div>

                            {editMode && editMode.includes('service') && (
                                <div style={{ background: 'var(--color-accent-blue)', padding: 'var(--space-4)', borderRadius: 'var(--radius-lg)', marginBottom: 'var(--space-4)' }}>
                                    <h4 className="mb-3">{editMode === 'add-service' ? 'Add New Service' : 'Edit Service'}</h4>
                                    <div className="form-group">
                                        <label>Service Name</label>
                                        <input
                                            type="text"
                                            value={formData.name || ''}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            placeholder="e.g., Cardiology"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Description</label>
                                        <textarea
                                            value={formData.description || ''}
                                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                            placeholder="Service description"
                                            rows="3"
                                        />
                                    </div>
                                    <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-3)' }}>
                                        <button onClick={handleSaveService} className="btn btn-primary">Save</button>
                                        <button onClick={() => setEditMode(null)} className="btn btn-secondary">Cancel</button>
                                    </div>
                                </div>
                            )}

                            <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
                                {services.map((service) => (
                                    <div key={service.id} style={{ padding: 'var(--space-3)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                                            <div style={{ flex: 1 }}>
                                                <h4>{service.name}</h4>
                                                <p className="text-secondary" style={{ marginTop: 'var(--space-1)' }}>{service.description}</p>
                                            </div>
                                            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                                                <button
                                                    onClick={() => handleEditService(service)}
                                                    className="btn btn-secondary"
                                                    style={{ fontSize: 'var(--text-sm)', padding: 'var(--space-1) var(--space-2)' }}
                                                >
                                                    Edit
                                                </button>
                                                {confirmDeleteId === service.id ? (
                                                    <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                                        <span style={{ fontSize: 'var(--text-sm)', color: '#f44336', fontWeight: 600 }}>Confirm?</span>
                                                        <button
                                                            onClick={() => handleDeleteService(service.id)}
                                                            className="btn btn-secondary"
                                                            style={{ fontSize: 'var(--text-sm)', padding: '2px 10px', background: '#f44336', color: '#fff', border: 'none' }}
                                                        >
                                                            Yes
                                                        </button>
                                                        <button
                                                            onClick={() => setConfirmDeleteId(null)}
                                                            className="btn btn-secondary"
                                                            style={{ fontSize: 'var(--text-sm)', padding: '2px 10px' }}
                                                        >
                                                            No
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <button
                                                        onClick={() => setConfirmDeleteId(service.id)}
                                                        className="btn btn-secondary"
                                                        style={{ fontSize: 'var(--text-sm)', padding: 'var(--space-1) var(--space-2)', color: '#f44336' }}
                                                    >
                                                        Delete
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Doctors Tab */}
                    {activeTab === 'doctors' && (
                        <div className="card">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
                                <h3>Manage Doctors</h3>
                                <button onClick={handleAddDoctor} className="btn btn-primary">
                                    + Add Doctor
                                </button>
                            </div>

                            {editMode && editMode.includes('doctor') && (
                                <div style={{ background: 'var(--color-accent-blue)', padding: 'var(--space-4)', borderRadius: 'var(--radius-lg)', marginBottom: 'var(--space-4)' }}>
                                    <h4 className="mb-3">{editMode === 'add-doctor' ? 'Add New Doctor' : 'Edit Doctor'}</h4>
                                    <div className="form-group">
                                        <label>Doctor Name</label>
                                        <input
                                            type="text"
                                            value={formData.name || ''}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            placeholder="e.g., Dr. John Doe"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Qualifications (comma-separated)</label>
                                        <input
                                            type="text"
                                            value={Array.isArray(formData.qualifications) ? formData.qualifications.join(', ') : ''}
                                            onChange={(e) => setFormData({ ...formData, qualifications: e.target.value.split(',').map(q => q.trim()) })}
                                            placeholder="e.g., MBBS, MD, DM"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Specializations (comma-separated)</label>
                                        <input
                                            type="text"
                                            value={Array.isArray(formData.specializations) ? formData.specializations.join(', ') : ''}
                                            onChange={(e) => setFormData({ ...formData, specializations: e.target.value.split(',').map(s => s.trim()) })}
                                            placeholder="e.g., Cardiology, Internal Medicine"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>OPD Hours</label>
                                        <input
                                            type="text"
                                            value={formData.opdHours || ''}
                                            onChange={(e) => setFormData({ ...formData, opdHours: e.target.value })}
                                            placeholder="e.g., Mon-Sat: 9 AM - 2 PM"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Consultation Fees (₹)</label>
                                        <input
                                            type="number"
                                            value={formData.fees || 0}
                                            onChange={(e) => setFormData({ ...formData, fees: parseInt(e.target.value) || 0 })}
                                            placeholder="e.g., 500"
                                            min="0"
                                        />
                                    </div>

                                    {/* OPD Schedule Section */}
                                    <div style={{ background: 'white', padding: 'var(--space-4)', borderRadius: 'var(--radius-lg)', marginTop: 'var(--space-3)' }}>
                                        <h4 style={{ marginBottom: 'var(--space-3)', fontSize: 'var(--text-lg)' }}>OPD Schedule Details</h4>

                                        {/* Working Days */}
                                        <div className="form-group">
                                            <label>Working Days</label>
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 'var(--space-2)', marginTop: 'var(--space-2)' }}>
                                                {[
                                                    { value: 0, label: 'Sunday' },
                                                    { value: 1, label: 'Monday' },
                                                    { value: 2, label: 'Tuesday' },
                                                    { value: 3, label: 'Wednesday' },
                                                    { value: 4, label: 'Thursday' },
                                                    { value: 5, label: 'Friday' },
                                                    { value: 6, label: 'Saturday' }
                                                ].map((day) => (
                                                    <label key={day.value} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)', cursor: 'pointer' }}>
                                                        <input
                                                            type="checkbox"
                                                            checked={formData.opdSchedule?.workingDays?.includes(day.value) || false}
                                                            onChange={(e) => {
                                                                const currentDays = formData.opdSchedule?.workingDays || [];
                                                                const newDays = e.target.checked
                                                                    ? [...currentDays, day.value]
                                                                    : currentDays.filter(d => d !== day.value);
                                                                setFormData({
                                                                    ...formData,
                                                                    opdSchedule: {
                                                                        ...formData.opdSchedule,
                                                                        workingDays: newDays.sort()
                                                                    }
                                                                });
                                                            }}
                                                            style={{ cursor: 'pointer' }}
                                                        />
                                                        <span style={{ fontSize: 'var(--text-sm)' }}>{day.label}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Morning Slot */}
                                        <div className="form-group" style={{ marginTop: 'var(--space-3)' }}>
                                            <label>Morning Slot</label>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
                                                <div>
                                                    <label style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>Start Time</label>
                                                    <input
                                                        type="time"
                                                        value={formData.opdSchedule?.morningSlot?.start || '09:00'}
                                                        onChange={(e) => setFormData({
                                                            ...formData,
                                                            opdSchedule: {
                                                                ...formData.opdSchedule,
                                                                morningSlot: {
                                                                    ...formData.opdSchedule?.morningSlot,
                                                                    start: e.target.value
                                                                }
                                                            }
                                                        })}
                                                    />
                                                </div>
                                                <div>
                                                    <label style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>End Time</label>
                                                    <input
                                                        type="time"
                                                        value={formData.opdSchedule?.morningSlot?.end || '14:00'}
                                                        onChange={(e) => setFormData({
                                                            ...formData,
                                                            opdSchedule: {
                                                                ...formData.opdSchedule,
                                                                morningSlot: {
                                                                    ...formData.opdSchedule?.morningSlot,
                                                                    end: e.target.value
                                                                }
                                                            }
                                                        })}
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Evening Slot with Toggle */}
                                        <div className="form-group" style={{ marginTop: 'var(--space-3)' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-2)' }}>
                                                <label style={{ margin: 0 }}>Evening Slot</label>
                                                <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', cursor: 'pointer', fontSize: 'var(--text-sm)', fontWeight: 500 }}>
                                                    <span style={{ color: formData.opdSchedule?.eveningSlotEnabled !== false ? '#2e7d32' : 'var(--color-text-secondary)' }}>
                                                        {formData.opdSchedule?.eveningSlotEnabled !== false ? 'Enabled' : 'Disabled'}
                                                    </span>
                                                    <div
                                                        onClick={() => setFormData({
                                                            ...formData,
                                                            opdSchedule: {
                                                                ...formData.opdSchedule,
                                                                eveningSlotEnabled: formData.opdSchedule?.eveningSlotEnabled === false ? true : false
                                                            }
                                                        })}
                                                        style={{
                                                            width: '44px', height: '24px',
                                                            borderRadius: '12px',
                                                            background: formData.opdSchedule?.eveningSlotEnabled !== false ? 'var(--color-teal)' : '#cbd5e1',
                                                            position: 'relative',
                                                            cursor: 'pointer',
                                                            transition: 'background 0.2s ease'
                                                        }}
                                                    >
                                                        <div style={{
                                                            width: '20px', height: '20px',
                                                            borderRadius: '50%',
                                                            background: '#fff',
                                                            position: 'absolute',
                                                            top: '2px',
                                                            left: formData.opdSchedule?.eveningSlotEnabled !== false ? '22px' : '2px',
                                                            transition: 'left 0.2s ease',
                                                            boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                                                        }} />
                                                    </div>
                                                </label>
                                            </div>
                                            {formData.opdSchedule?.eveningSlotEnabled !== false && (
                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
                                                    <div>
                                                        <label style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>Start Time</label>
                                                        <input
                                                            type="time"
                                                            value={formData.opdSchedule?.eveningSlot?.start || '17:00'}
                                                            onChange={(e) => setFormData({
                                                                ...formData,
                                                                opdSchedule: {
                                                                    ...formData.opdSchedule,
                                                                    eveningSlot: {
                                                                        ...formData.opdSchedule?.eveningSlot,
                                                                        start: e.target.value
                                                                    }
                                                                }
                                                            })}
                                                        />
                                                    </div>
                                                    <div>
                                                        <label style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>End Time</label>
                                                        <input
                                                            type="time"
                                                            value={formData.opdSchedule?.eveningSlot?.end || '20:00'}
                                                            onChange={(e) => setFormData({
                                                                ...formData,
                                                                opdSchedule: {
                                                                    ...formData.opdSchedule,
                                                                    eveningSlot: {
                                                                        ...formData.opdSchedule?.eveningSlot,
                                                                        end: e.target.value
                                                                    }
                                                                }
                                                            })}
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="form-group">
                                        <label>Profile Image</label>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={handleImageUpload}
                                        />
                                        {formData.image && (
                                            <div style={{ marginTop: 'var(--space-2)' }}>
                                                <img src={formData.image} alt="Preview" style={{ maxWidth: '200px', borderRadius: 'var(--radius-lg)' }} />
                                            </div>
                                        )}
                                    </div>
                                    <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-3)' }}>
                                        <button onClick={handleSaveDoctor} className="btn btn-primary">Save</button>
                                        <button onClick={() => setEditMode(null)} className="btn btn-secondary">Cancel</button>
                                    </div>
                                </div>
                            )}

                            <div style={{ display: 'grid', gap: 'var(--space-4)' }}>
                                {doctors.map((doctor) => (
                                    <div key={doctor.id} style={{ padding: 'var(--space-4)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)' }}>
                                        <div style={{ display: 'flex', gap: 'var(--space-4)', alignItems: 'start' }}>
                                            {doctor.image_url && (
                                                <div style={{ width: '100px', height: '100px', borderRadius: 'var(--radius-lg)', overflow: 'hidden', flexShrink: 0 }}>
                                                    <img src={doctor.image_url} alt={doctor.full_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                </div>
                                            )}
                                            <div style={{ flex: 1 }}>
                                                <h4>{doctor.full_name}</h4>
                                                <p className="text-secondary" style={{ marginTop: 'var(--space-1)' }}>
                                                    {(Array.isArray(doctor.qualifications) ? doctor.qualifications : [doctor.qualification]).filter(Boolean).join(', ')}
                                                </p>
                                                <p className="text-secondary" style={{ marginTop: 'var(--space-1)' }}>
                                                    <strong>Specializations:</strong> {(Array.isArray(doctor.specializations) ? doctor.specializations : [doctor.specialization]).filter(Boolean).join(', ')}
                                                </p>
                                                <p className="text-secondary" style={{ marginTop: 'var(--space-1)' }}>
                                                    <strong>OPD Hours:</strong> {doctor.opd_hours}
                                                </p>
                                                <p className="text-secondary" style={{ marginTop: 'var(--space-1)' }}>
                                                    <strong>Fees:</strong> ₹{doctor.fees || 0}
                                                </p>
                                            </div>
                                            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                                                <button
                                                    onClick={() => handleEditDoctor(doctor)}
                                                    className="btn btn-secondary"
                                                    style={{ fontSize: 'var(--text-sm)', padding: 'var(--space-1) var(--space-2)' }}
                                                >
                                                    Edit
                                                </button>
                                                {confirmDeleteId === doctor.id ? (
                                                    <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                                        <span style={{ fontSize: 'var(--text-sm)', color: '#f44336', fontWeight: 600 }}>Confirm?</span>
                                                        <button
                                                            onClick={() => handleDeleteDoctor(doctor.id)}
                                                            className="btn btn-secondary"
                                                            style={{ fontSize: 'var(--text-sm)', padding: '2px 10px', background: '#f44336', color: '#fff', border: 'none' }}
                                                        >
                                                            Yes
                                                        </button>
                                                        <button
                                                            onClick={() => setConfirmDeleteId(null)}
                                                            className="btn btn-secondary"
                                                            style={{ fontSize: 'var(--text-sm)', padding: '2px 10px' }}
                                                        >
                                                            No
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <button
                                                        onClick={() => setConfirmDeleteId(doctor.id)}
                                                        className="btn btn-secondary"
                                                        style={{ fontSize: 'var(--text-sm)', padding: 'var(--space-1) var(--space-2)', color: '#f44336' }}
                                                    >
                                                        Delete
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Settings Tab */}
                    {activeTab === 'settings' && (
                        <div className="card">
                            <h3 className="mb-4">Hospital Settings</h3>
                            <div style={{ display: 'grid', gap: 'var(--space-6)' }}>
                                {/* OPD Hours */}
                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2)' }}>
                                        <h4>OPD Hours</h4>
                                        {editMode !== 'opd-hours' && (
                                            <button
                                                onClick={() => {
                                                    setEditMode('opd-hours');
                                                    setFormData(settings.opdHours || {});
                                                }}
                                                className="btn btn-secondary"
                                            >
                                                Edit
                                            </button>
                                        )}
                                    </div>
                                    {editMode === 'opd-hours' ? (
                                        <div>
                                            <div className="form-group">
                                                <label>Weekdays</label>
                                                <input
                                                    type="text"
                                                    value={formData.weekdays || ''}
                                                    onChange={(e) => setFormData({ ...formData, weekdays: e.target.value })}
                                                />
                                            </div>
                                            <div className="form-group">
                                                <label>Saturday</label>
                                                <input
                                                    type="text"
                                                    value={formData.saturday || ''}
                                                    onChange={(e) => setFormData({ ...formData, saturday: e.target.value })}
                                                />
                                            </div>
                                            <div className="form-group">
                                                <label>Sunday</label>
                                                <input
                                                    type="text"
                                                    value={formData.sunday || ''}
                                                    onChange={(e) => setFormData({ ...formData, sunday: e.target.value })}
                                                />
                                            </div>
                                            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                                                <button onClick={handleSaveOpdHours} className="btn btn-primary">Save</button>
                                                <button onClick={() => setEditMode(null)} className="btn btn-secondary">Cancel</button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="text-secondary">
                                            <p>{settings.opdHours?.weekdays}</p>
                                            <p>{settings.opdHours?.saturday}</p>
                                            <p>{settings.opdHours?.sunday}</p>
                                        </div>
                                    )}
                                </div>

                                {/* Contact Information */}
                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2)' }}>
                                        <h4>Contact Information</h4>
                                        {editMode !== 'contact' && (
                                            <button
                                                onClick={() => {
                                                    setEditMode('contact');
                                                    setFormData(settings.contact || {});
                                                }}
                                                className="btn btn-secondary"
                                            >
                                                Edit
                                            </button>
                                        )}
                                    </div>
                                    {editMode === 'contact' ? (
                                        <div>
                                            <div className="form-group">
                                                <label>Phone Number</label>
                                                <input
                                                    type="tel"
                                                    value={formData.phone || ''}
                                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                                />
                                            </div>
                                            <div className="form-group">
                                                <label>WhatsApp Number</label>
                                                <input
                                                    type="tel"
                                                    value={formData.whatsapp || ''}
                                                    onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                                                />
                                            </div>
                                            <div className="form-group">
                                                <label>Email Address</label>
                                                <input
                                                    type="email"
                                                    value={formData.email || ''}
                                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                                />
                                            </div>
                                            <div className="form-group">
                                                <label>Physical Address</label>
                                                <textarea
                                                    value={formData.address || ''}
                                                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                                    rows="2"
                                                />
                                            </div>
                                            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                                                <button onClick={handleSaveContact} className="btn btn-primary">Save</button>
                                                <button onClick={() => setEditMode(null)} className="btn btn-secondary">Cancel</button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="text-secondary">
                                            <p><strong>Phone:</strong> {settings.contact?.phone}</p>
                                            <p><strong>WhatsApp:</strong> {settings.contact?.whatsapp}</p>
                                            <p><strong>Email:</strong> {settings.contact?.email}</p>
                                            <p><strong>Address:</strong> {settings.contact?.address}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
}
