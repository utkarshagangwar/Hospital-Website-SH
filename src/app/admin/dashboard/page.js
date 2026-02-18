'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    getHospitalData,
    updateOpdHours,
    updateContact,
    addService,
    updateService,
    deleteService,
    addDoctor,
    updateDoctor,
    deleteDoctor,
    addAppointment,
    updateAppointment,
    deleteAppointment,
    initializeData
} from '@/utils/hospitalData';

export default function AdminDashboard() {
    const router = useRouter();
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [activeTab, setActiveTab] = useState('appointments');
    const [hospitalData, setHospitalData] = useState(null);
    const [editMode, setEditMode] = useState(null);
    const [formData, setFormData] = useState({});

    useEffect(() => {
        // Check authentication
        const auth = localStorage.getItem('adminAuth');
        if (auth === 'true') {
            setIsAuthenticated(true);
            // Initialize and load data
            const data = initializeData();
            setHospitalData(data);
        } else {
            router.push('/admin/login');
        }
    }, [router]);

    const handleLogout = () => {
        localStorage.removeItem('adminAuth');
        router.push('/admin/login');
    };

    const refreshData = () => {
        const data = getHospitalData();
        setHospitalData(data);
    };

    // OPD Hours Management
    const handleSaveOpdHours = () => {
        updateOpdHours(formData);
        refreshData();
        setEditMode(null);
        alert('OPD Hours updated successfully!');
    };

    // Contact Management
    const handleSaveContact = () => {
        updateContact(formData);
        refreshData();
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

    const handleSaveService = () => {
        if (editMode === 'add-service') {
            addService(formData);
            alert('Service added successfully!');
        } else {
            const id = parseInt(editMode.split('-')[2]);
            updateService(id, formData);
            alert('Service updated successfully!');
        }
        refreshData();
        setEditMode(null);
    };

    const handleDeleteService = (id) => {
        if (confirm('Are you sure you want to delete this service?')) {
            deleteService(id);
            refreshData();
            alert('Service deleted successfully!');
        }
    };

    // Doctor Management
    const handleAddDoctor = () => {
        setEditMode('add-doctor');
        setFormData({
            name: '',
            qualifications: [],
            specializations: [],
            image: null,
            opdHours: '',
            opdSchedule: {
                workingDays: [1, 2, 3, 4, 5, 6], // Default: Mon-Sat
                morningSlot: { start: '09:00', end: '14:00' },
                eveningSlot: { start: '17:00', end: '20:00' }
            }
        });
    };

    const handleEditDoctor = (doctor) => {
        setEditMode(`edit-doctor-${doctor.id}`);
        // Ensure opdSchedule exists for legacy data
        const doctorWithSchedule = {
            ...doctor,
            opdSchedule: doctor.opdSchedule || {
                workingDays: [1, 2, 3, 4, 5, 6], // Mon-Sat default
                morningSlot: { start: '09:00', end: '14:00' },
                eveningSlot: { start: '17:00', end: '20:00' }
            }
        };
        setFormData(doctorWithSchedule);
    };

    const handleSaveDoctor = () => {
        if (editMode === 'add-doctor') {
            addDoctor(formData);
            alert('Doctor added successfully!');
        } else {
            const id = parseInt(editMode.split('-')[2]);
            updateDoctor(id, formData);
            alert('Doctor updated successfully!');
        }
        refreshData();
        setEditMode(null);
    };

    const handleDeleteDoctor = (id) => {
        if (confirm('Are you sure you want to delete this doctor?')) {
            deleteDoctor(id);
            refreshData();
            alert('Doctor deleted successfully!');
        }
    };

    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setFormData({ ...formData, image: reader.result });
            };
            reader.readAsDataURL(file);
        }
    };

    // Appointment Management
    const handleAddAppointment = () => {
        setEditMode('add-appointment');
        setFormData({
            patient: '',
            date: '',
            time: '',
            type: '',
            fees: 0,
            paid: 0
        });
    };

    const handleEditAppointment = (appointment) => {
        setEditMode(`edit-appointment-${appointment.id}`);
        setFormData(appointment);
    };

    const handleSaveAppointment = () => {
        if (editMode === 'add-appointment') {
            addAppointment(formData);
            alert('Appointment added successfully!');
        } else {
            const id = parseInt(editMode.split('-')[2]);
            updateAppointment(id, formData);
            alert('Appointment updated successfully!');
        }
        refreshData();
        setEditMode(null);
    };

    const handleDeleteAppointment = (id) => {
        if (confirm('Are you sure you want to delete this appointment?')) {
            deleteAppointment(id);
            refreshData();
            alert('Appointment deleted successfully!');
        }
    };

    if (!isAuthenticated || !hospitalData) {
        return null;
    }

    // Calculate dynamic stats
    const totalAppointments = hospitalData.appointments?.length || 0;
    const pendingAppointments = hospitalData.appointments?.filter(a => a.status === 'Pending').length || 0;
    const confirmedAppointments = hospitalData.appointments?.filter(a => a.status === 'Confirmed').length || 0;
    const totalRevenue = hospitalData.appointments?.reduce((sum, apt) => sum + (apt.paid || 0), 0) || 0;

    const stats = [
        { label: 'Total Appointments', value: totalAppointments.toString() },
        { label: 'Confirmed', value: confirmedAppointments.toString() },
        { label: 'Pending Payment', value: pendingAppointments.toString() },
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

                            {editMode && editMode.includes('appointment') && (
                                <div style={{ background: 'var(--color-accent-blue)', padding: 'var(--space-4)', borderRadius: 'var(--radius-lg)', marginBottom: 'var(--space-4)' }}>
                                    <h4 className="mb-3">{editMode === 'add-appointment' ? 'Add New Appointment' : 'Edit Appointment'}</h4>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-3)' }}>
                                        <div className="form-group">
                                            <label>Patient Name</label>
                                            <input
                                                type="text"
                                                value={formData.patient || ''}
                                                onChange={(e) => setFormData({ ...formData, patient: e.target.value })}
                                                placeholder="e.g., John Doe"
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label>Date</label>
                                            <input
                                                type="date"
                                                value={formData.date || ''}
                                                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label>Time</label>
                                            <input
                                                type="time"
                                                value={formData.time || ''}
                                                onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label>Type</label>
                                            <input
                                                type="text"
                                                value={formData.type || ''}
                                                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
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
                                            <label>Paid (₹)</label>
                                            <input
                                                type="number"
                                                value={formData.paid || 0}
                                                onChange={(e) => setFormData({ ...formData, paid: parseInt(e.target.value) || 0 })}
                                            />
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-3)' }}>
                                        <button onClick={handleSaveAppointment} className="btn btn-primary">Save</button>
                                        <button onClick={() => setEditMode(null)} className="btn btn-secondary">Cancel</button>
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
                                            <th style={{ padding: 'var(--space-3)', textAlign: 'left' }}>Paid</th>
                                            <th style={{ padding: 'var(--space-3)', textAlign: 'left' }}>Status</th>
                                            <th style={{ padding: 'var(--space-3)', textAlign: 'left' }}>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(hospitalData.appointments || []).map((apt) => (
                                            <tr key={apt.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                                                <td style={{ padding: 'var(--space-3)' }}>{apt.patient}</td>
                                                <td style={{ padding: 'var(--space-3)' }}>{apt.date}</td>
                                                <td style={{ padding: 'var(--space-3)' }}>{apt.time}</td>
                                                <td style={{ padding: 'var(--space-3)' }}>{apt.type}</td>
                                                <td style={{ padding: 'var(--space-3)' }}>₹{apt.fees}</td>
                                                <td style={{ padding: 'var(--space-3)' }}>₹{apt.paid}</td>
                                                <td style={{ padding: 'var(--space-3)' }}>
                                                    <span className="badge" style={{
                                                        background: apt.status === 'Confirmed' ? '#e8f5e9' :
                                                            apt.status === 'Partial' ? '#fff3e0' : '#ffebee',
                                                        color: apt.status === 'Confirmed' ? '#2e7d32' :
                                                            apt.status === 'Partial' ? '#e65100' : '#c62828'
                                                    }}>
                                                        {apt.status}
                                                    </span>
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
                                                        <button
                                                            onClick={() => handleDeleteAppointment(apt.id)}
                                                            className="btn btn-secondary"
                                                            style={{ fontSize: 'var(--text-sm)', padding: 'var(--space-1) var(--space-2)', color: '#f44336' }}
                                                        >
                                                            Delete
                                                        </button>
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
                                {hospitalData.services.map((service) => (
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
                                                <button
                                                    onClick={() => handleDeleteService(service.id)}
                                                    className="btn btn-secondary"
                                                    style={{ fontSize: 'var(--text-sm)', padding: 'var(--space-1) var(--space-2)', color: '#f44336' }}
                                                >
                                                    Delete
                                                </button>
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

                                        {/* Evening Slot */}
                                        <div className="form-group" style={{ marginTop: 'var(--space-3)' }}>
                                            <label>Evening Slot</label>
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
                                {hospitalData.doctors.map((doctor) => (
                                    <div key={doctor.id} style={{ padding: 'var(--space-4)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)' }}>
                                        <div style={{ display: 'flex', gap: 'var(--space-4)', alignItems: 'start' }}>
                                            {doctor.image && (
                                                <div style={{ width: '100px', height: '100px', borderRadius: 'var(--radius-lg)', overflow: 'hidden', flexShrink: 0 }}>
                                                    <img src={doctor.image} alt={doctor.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                </div>
                                            )}
                                            <div style={{ flex: 1 }}>
                                                <h4>{doctor.name}</h4>
                                                <p className="text-secondary" style={{ marginTop: 'var(--space-1)' }}>
                                                    {doctor.qualifications.join(', ')}
                                                </p>
                                                <p className="text-secondary" style={{ marginTop: 'var(--space-1)' }}>
                                                    <strong>Specializations:</strong> {doctor.specializations.join(', ')}
                                                </p>
                                                <p className="text-secondary" style={{ marginTop: 'var(--space-1)' }}>
                                                    <strong>OPD Hours:</strong> {doctor.opdHours}
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
                                                <button
                                                    onClick={() => handleDeleteDoctor(doctor.id)}
                                                    className="btn btn-secondary"
                                                    style={{ fontSize: 'var(--text-sm)', padding: 'var(--space-1) var(--space-2)', color: '#f44336' }}
                                                >
                                                    Delete
                                                </button>
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
                                                    setFormData(hospitalData.opdHours);
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
                                            <p>{hospitalData.opdHours.weekdays}</p>
                                            <p>{hospitalData.opdHours.saturday}</p>
                                            <p>{hospitalData.opdHours.sunday}</p>
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
                                                    setFormData(hospitalData.contact);
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
                                            <p><strong>Phone:</strong> {hospitalData.contact.phone}</p>
                                            <p><strong>WhatsApp:</strong> {hospitalData.contact.whatsapp}</p>
                                            <p><strong>Email:</strong> {hospitalData.contact.email}</p>
                                            <p><strong>Address:</strong> {hospitalData.contact.address}</p>
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
