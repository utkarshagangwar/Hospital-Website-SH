'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import './admin-login.css';
import { useLoader } from '@/context/LoaderContext';
import { ShieldCheck, Mail, Lock, Eye, EyeOff, LogIn } from '@/components/icons';

export default function AdminLogin() {
    const router = useRouter();
    const [formData, setFormData] = useState({
        email: '',
        password: '',
    });
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const { hideLoader, showLoader } = useLoader();

    // If there's already a valid session (same 24h check the dashboard
    // enforces), skip the form entirely instead of making the user re-enter
    // credentials for a session that's still active.
    useEffect(() => {
        const auth = localStorage.getItem('adminAuth');
        const token = localStorage.getItem('authToken');
        const sessionExpiresAt = parseInt(localStorage.getItem('sessionExpiresAt') || '0', 10);
        const hasValidSession = auth === 'true' && !!token && !!sessionExpiresAt && Date.now() < sessionExpiresAt;

        if (hasValidSession) {
            showLoader(300);
            router.replace('/admin/dashboard');
            return;
        }

        hideLoader();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        showLoader(300); // Show loader during login

        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            const data = await res.json();

            if (data.success && data.data.session) {
                // Store auth data in localStorage
                localStorage.setItem('adminAuth', 'true');
                localStorage.setItem('authToken', data.data.session.access_token);
                localStorage.setItem('refreshToken', data.data.session.refresh_token);
                localStorage.setItem('tokenExpiresAt', data.data.session.expires_at);
                // Absolute session lifetime — 24h from this login, independent of
                // how often the short-lived access token itself gets silently
                // refreshed. The dashboard checks this on every load and forces
                // re-login once it passes, so browsing never gets cut short by
                // an access-token refresh cycle, but also never runs forever.
                localStorage.setItem('sessionExpiresAt', String(Date.now() + 24 * 60 * 60 * 1000));
                localStorage.setItem('userRole', data.data.user.role);
                localStorage.setItem('userId', data.data.user.id);
                localStorage.setItem('userName', data.data.user.full_name || '');
                localStorage.setItem('userPermissions', JSON.stringify(data.data.user.permissions || []));
                router.push('/admin/dashboard');
            } else {
                setError(data.error || 'Invalid email or password');
            }
        } catch (err) {
            setError('Login failed. Please try again.');
        } finally {
            hideLoader();
        }
    };

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    return (
        <div className="admin-login-wrapper">
            {/* Tech dot-grid background */}
            <div className="admin-tech-pattern"></div>

            {/* Main split-screen container */}
            <div className="admin-login-container">

                {/* ── Left: Branding Panel (hidden on mobile) ── */}
                <div className="admin-brand-panel">
                    <div className="admin-brand-logo">
                        <div className="admin-brand-icon">
                            <ShieldCheck size={26} />
                        </div>
                        <h1 className="admin-brand-title">
                            Shivaji <span className="admin-brand-title-accent">Hospital</span>
                        </h1>
                    </div>

                    <div className="admin-brand-content">
                        <div className="admin-brand-image-wrapper">
                            <img
                                src="https://lh3.googleusercontent.com/aida-public/AB6AXuAV-a-Nl3D2J3YyQUaIdOuwe3exh_Ql1mi9S-qghrkonTQB9AS3L4tz-_wX11KDr9GaJGEluL73TM7NxjNTMDLzhAaV1-53qFw4MJj8abP6bGkPK1ZYrLJn-ykEMEPjopjzst51w99YlzVYNnT28Kqh8lsh7fYMBH7wnqN2cHMSdu_M1lALsyhruEgq9NbZFaaDTdYdwPY50Tu94-Rv1_kK3FOuzfRi01_XfRFLIo030w9Ne0gvBUpG9_tjmFDZM2hy_W_MOkncrUs"
                                alt="Futuristic hospital hallway"
                            />
                            <div className="admin-brand-image-overlay"></div>
                        </div>
                        <div>
                            <h2 className="admin-brand-heading">
                                Next-Generation Healthcare Management
                            </h2>
                            <p className="admin-brand-subtext">
                                Secure interface for authorized medical administrators and clinical directors.
                            </p>
                        </div>
                    </div>

                    <div className="admin-brand-badge">
                        <ShieldCheck size={20} />
                        <span>ISO 27001 Certified Infrastructure</span>
                    </div>
                </div>

                {/* ── Right: Login Form ── */}
                <div className="admin-form-panel">

                    {/* Mobile-only logo */}
                    <div className="admin-mobile-logo">
                        <div className="admin-mobile-logo-icon">
                            <ShieldCheck size={20} />
                        </div>
                        <span className="admin-mobile-logo-title">Shivaji Hospital Admin</span>
                    </div>

                    {/* Header */}
                    <div className="admin-form-header">
                        <h3 className="admin-form-title">Login To Admin Panel</h3>
                        <p className="admin-form-subtitle">
                            Please enter your credentials to manage hospital systems.
                        </p>
                    </div>

                    {/* Error alert */}
                    {error && (
                        <div className="admin-error-alert">
                            {error}
                        </div>
                    )}

                    {/* Form */}
                    <form className="admin-form" onSubmit={handleSubmit}>

                        {/* Email / Admin ID */}
                        <div className="admin-field-group">
                            <label className="admin-field-label" htmlFor="email">
                                Admin Email ID
                            </label>
                            <div className="admin-input-wrapper">
                                <Mail size={18} className="admin-input-icon" />
                                <input
                                    className="admin-input"
                                    type="email"
                                    id="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    placeholder="Enter Email ID"
                                    required
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div className="admin-field-group">
                            <div className="admin-field-label-row">
                                <label className="admin-field-label" htmlFor="password">
                                    Password
                                </label>
                                <a className="admin-forgot-link" href="#">
                                    Forgot credentials?
                                </a>
                            </div>
                            <div className="admin-input-wrapper">
                                <Lock size={18} className="admin-input-icon" />
                                <input
                                    className="admin-input"
                                    type={showPassword ? 'text' : 'password'}
                                    id="password"
                                    name="password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    placeholder="Enter Password"
                                    required
                                    style={{ paddingRight: '3rem' }}
                                />
                                <button
                                    type="button"
                                    className="admin-toggle-password"
                                    onClick={() => setShowPassword(!showPassword)}
                                    aria-label="Toggle password visibility"
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        {/* Submit */}
                        <button type="submit" className="admin-submit-btn">
                            <LogIn size={18} />
                            Login
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
