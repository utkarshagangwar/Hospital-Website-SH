'use client';

import Link from 'next/link';
import { useState } from 'react';

export default function PatientPortal() {
    const [mobile, setMobile] = useState('');
    const [otpSent, setOtpSent] = useState(false);
    const [otp, setOtp] = useState('');
    const [loggedIn, setLoggedIn] = useState(false);

    const handleSendOTP = (e) => {
        e.preventDefault();
        // Placeholder - in production, this would send actual OTP
        setOtpSent(true);
    };

    const handleVerifyOTP = (e) => {
        e.preventDefault();
        // Placeholder - in production, this would verify with backend
        if (otp.length === 6) {
            setLoggedIn(true);
        }
    };

    return (
        <div className="page-wrapper">
            <section className="section">
                <div className="container" style={{ maxWidth: '600px' }}>
                    <Link href="/" className="back-link">← Back to Home</Link>

                    <h1 className="text-center mb-4">Patient Portal</h1>
                    <p className="text-center text-secondary mb-6">
                        Access your medical records, appointments, and prescriptions
                    </p>

                    {!loggedIn ? (
                        <div className="card">
                            {!otpSent ? (
                                <form onSubmit={handleSendOTP}>
                                    <h2 className="mb-4">Login with Mobile Number</h2>
                                    <div className="form-group">
                                        <label htmlFor="mobile">Mobile Number</label>
                                        <input
                                            type="tel"
                                            id="mobile"
                                            value={mobile}
                                            onChange={(e) => setMobile(e.target.value)}
                                            pattern="[0-9]{10}"
                                            placeholder="Enter 10-digit mobile number"
                                            required
                                        />
                                    </div>
                                    <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                                        Send OTP
                                    </button>
                                    <p className="text-secondary text-center mt-4" style={{ fontSize: 'var(--text-sm)' }}>
                                        New patient? <Link href="/book-appointment">Book an appointment</Link> first
                                    </p>
                                </form>
                            ) : (
                                <form onSubmit={handleVerifyOTP}>
                                    <h2 className="mb-2">Verify OTP</h2>
                                    <p className="text-secondary mb-4">
                                        OTP sent to {mobile} <button type="button" onClick={() => setOtpSent(false)} style={{ background: 'none', border: 'none', color: 'var(--color-teal)', cursor: 'pointer', textDecoration: 'underline' }}>Change</button>
                                    </p>
                                    <div className="form-group">
                                        <label htmlFor="otp">Enter 6-Digit OTP</label>
                                        <input
                                            type="text"
                                            id="otp"
                                            value={otp}
                                            onChange={(e) => setOtp(e.target.value)}
                                            pattern="[0-9]{6}"
                                            maxLength="6"
                                            placeholder="000000"
                                            required
                                        />
                                    </div>
                                    <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                                        Verify & Login
                                    </button>
                                    <p className="text-secondary text-center mt-4" style={{ fontSize: 'var(--text-sm)' }}>
                                        This is a demo. In production, a real OTP would be sent.
                                    </p>
                                </form>
                            )}
                        </div>
                    ) : (
                        <>
                            <div className="card mb-4" style={{ background: 'var(--color-accent-sage)' }}>
                                <h2 className="mb-2">Welcome Back!</h2>
                                <p className="text-secondary mb-0">Patient ID: #{mobile.slice(-4)}</p>
                            </div>

                            <div className="card mb-4">
                                <h3 className="mb-3">Upcoming Appointments</h3>
                                <div style={{ padding: 'var(--space-3)', background: 'var(--color-accent-blue)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-2)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-1)' }}>
                                        <strong>Cardiology Consultation</strong>
                                        <span className="badge">Confirmed</span>
                                    </div>
                                    <p className="text-secondary" style={{ fontSize: 'var(--text-sm)', marginBottom: 0 }}>
                                        Dr. Varun Gangwar • Dec 1, 2024 • 10:00 AM
                                    </p>
                                </div>
                                <Link href="/book-appointment" className="btn btn-secondary" style={{ width: '100%' }}>
                                    Book New Appointment
                                </Link>
                            </div>

                            <div className="card mb-4">
                                <h3 className="mb-3">Recent Prescriptions</h3>
                                <div style={{ padding: 'var(--space-3)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}>
                                    <div style={{ marginBottom: 'var(--space-1)' }}>
                                        <strong>Prescription #1234</strong>
                                    </div>
                                    <p className="text-secondary" style={{ fontSize: 'var(--text-sm)', marginBottom: 0 }}>
                                        Date: Nov 15, 2024 • Dr. Varun Gangwar
                                    </p>
                                </div>
                                <p className="text-secondary mt-3" style={{ fontSize: 'var(--text-sm)' }}>
                                    Detailed prescription management coming soon
                                </p>
                            </div>

                            <div className="text-center mt-6">
                                <button
                                    onClick={() => { setLoggedIn(false); setOtpSent(false); setOtp(''); setMobile(''); }}
                                    className="btn btn-secondary"
                                >
                                    Logout
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </section>

        </div>
    );
}
