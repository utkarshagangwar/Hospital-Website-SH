'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import './patient-login.css';
import { useLoader } from '@/context/LoaderContext';

export default function PatientPortal() {
    const [mobile, setMobile] = useState('');
    const [otpSent, setOtpSent] = useState(false);
    const [otp, setOtp] = useState('');
    const [loggedIn, setLoggedIn] = useState(false);
    const { hideLoader } = useLoader();

    // Hide loader after component mounts
    useEffect(() => {
        hideLoader();
    }, [hideLoader]);

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

    // ── Logged-in dashboard ──
    if (loggedIn) {
        return (
            <div className="patient-login-wrapper">
                <div className="patient-dashboard">
                    <div className="patient-welcome-card">
                        <h2>Welcome Back!</h2>
                        <p>Patient ID: #{mobile.slice(-4)}</p>
                    </div>

                    <div className="patient-section-card">
                        <h3>Upcoming Appointments</h3>
                        <div className="patient-appointment-item">
                            <div className="patient-appointment-header">
                                <strong>Cardiology Consultation</strong>
                                <span className="badge">Confirmed</span>
                            </div>
                            <p className="patient-appointment-detail">
                                Dr. Varun Gangwar • Dec 1, 2024 • 10:00 AM
                            </p>
                        </div>
                        <Link href="/book-appointment" className="patient-book-btn">
                            Book New Appointment
                        </Link>
                    </div>

                    <div className="patient-section-card">
                        <h3>Recent Prescriptions</h3>
                        <div className="patient-prescription-item">
                            <strong>Prescription #1234</strong>
                            <p className="patient-prescription-detail">
                                Date: Nov 15, 2024 • Dr. Varun Gangwar
                            </p>
                        </div>
                        <p className="patient-coming-soon">
                            Detailed prescription management coming soon
                        </p>
                    </div>

                    <div className="patient-logout-area">
                        <button
                            onClick={() => { setLoggedIn(false); setOtpSent(false); setOtp(''); setMobile(''); }}
                            className="patient-logout-btn"
                        >
                            Logout
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // ── Login UI ──
    return (
        <div className="patient-login-wrapper">
            <div className="patient-login-container">

                {/* ── Left: Branding Panel (hidden on mobile) ── */}
                <div className="patient-brand-panel">
                    <div className="patient-brand-image-wrapper">
                        <div className="patient-brand-image-overlay"></div>
                        <img
                            src="https://lh3.googleusercontent.com/aida-public/AB6AXuBmgWpHpAWieznXtnBFvLdsS54HHvjyb7cTJGqjexa6IueuWw44MT7A1Mlrx7q3fc2qMtYBn_Zb_V0vRXLkEIgrdXuGg2yoDNxNiUHsxrl1mypreHVVe8O01FhTAb6GZ9Sk9mh7Xycat8EijkNeOzi2VOk5EIVZqif1xln0KyHMtKEWI6jjlpKeJ9WgL4BDpcAjjNK9fvO-9O4ZrWpekgP5YhuRVsRcj7JXjpYYdOc0iLhLKQ9or5APDDsaIFBwrXZM8NE2DRGnU7Q"
                            alt="Modern healthcare facility"
                        />
                        <div className="patient-brand-caption">
                            <p className="patient-brand-caption-eyebrow">Pioneering Care</p>
                            <h3 className="patient-brand-caption-title">
                                Your health data, <br />secured by intelligence.
                            </h3>
                        </div>
                    </div>

                    <div className="patient-feature-grid">
                        <div className="patient-feature-badge">
                            <span className="material-symbols-outlined">verified_user</span>
                            <p>End-to-End Encryption</p>
                        </div>
                        <div className="patient-feature-badge">
                            <span className="material-symbols-outlined">bolt</span>
                            <p>Real-time Lab Results</p>
                        </div>
                        <div className="patient-feature-badge">
                            <span className="material-symbols-outlined">calendar_month</span>
                            <p>Easy Scheduling</p>
                        </div>
                    </div>
                </div>

                {/* ── Right: Login Form ── */}
                <div className="patient-form-panel">
                    <div className="patient-form-card">

                        {/* Mobile-only logo */}
                        <div className="patient-mobile-logo">
                            <div className="patient-mobile-logo-icon">
                                <span className="material-symbols-outlined">health_metrics</span>
                            </div>
                            <span className="patient-mobile-logo-title">Shivaji Hospital</span>
                        </div>

                        {/* Header */}
                        <div className="patient-form-header">
                            <h1 className="patient-form-title">Welcome Back</h1>
                            <p className="patient-form-subtitle">
                                Please enter your details to access your portal.
                            </p>
                        </div>

                        {!otpSent ? (
                            /* ── Step 1: Mobile Number ── */
                            <form className="patient-form" onSubmit={handleSendOTP}>
                                <div className="patient-field-group">
                                    <label className="patient-field-label" htmlFor="mobile">
                                        Mobile Number
                                    </label>
                                    <div className="patient-input-wrapper">
                                        <span className="material-symbols-outlined patient-input-icon">phone_iphone</span>
                                        <input
                                            className="patient-input"
                                            type="tel"
                                            id="mobile"
                                            value={mobile}
                                            onChange={(e) => setMobile(e.target.value)}
                                            pattern="[0-9]{10}"
                                            placeholder="Enter 10-digit mobile number"
                                            required
                                        />
                                    </div>
                                    <button type="submit" className="patient-send-otp-btn">
                                        <span>Send OTP</span>
                                        <span className="material-symbols-outlined">send</span>
                                    </button>
                                </div>

                                <button type="submit" className="patient-submit-btn">
                                    Send Verification Code
                                    <span className="material-symbols-outlined">arrow_forward</span>
                                </button>
                            </form>
                        ) : (
                            /* ── Step 2: OTP Verification ── */
                            <form className="patient-form" onSubmit={handleVerifyOTP}>
                                <p className="patient-otp-info">
                                    OTP sent to {mobile}
                                    <button
                                        type="button"
                                        className="patient-change-link"
                                        onClick={() => setOtpSent(false)}
                                    >
                                        Change
                                    </button>
                                </p>

                                <div className="patient-field-group">
                                    <label className="patient-field-label" htmlFor="otp">
                                        One-Time Password (OTP)
                                    </label>
                                    <div className="patient-input-wrapper">
                                        <span className="material-symbols-outlined patient-input-icon">dialpad</span>
                                        <input
                                            className="patient-input"
                                            type="text"
                                            id="otp"
                                            value={otp}
                                            onChange={(e) => setOtp(e.target.value)}
                                            pattern="[0-9]{6}"
                                            maxLength="6"
                                            placeholder="6-digit code"
                                            required
                                        />
                                    </div>
                                </div>

                                <button type="submit" className="patient-submit-btn">
                                    Verify & Sign In
                                    <span className="material-symbols-outlined">arrow_forward</span>
                                </button>

                                <p style={{ color: '#94a3b8', fontSize: '0.75rem', textAlign: 'center', margin: 0 }}>
                                    This is a demo. In production, a real OTP would be sent.
                                </p>
                            </form>
                        )}

                        {/* Footer link */}
                        <div className="patient-form-footer">
                            <p>Need immediate care? <Link href="/book-appointment">Book an Appointment</Link></p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
