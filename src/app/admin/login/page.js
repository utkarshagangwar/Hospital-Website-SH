'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminLogin() {
    const router = useRouter();
    const [formData, setFormData] = useState({
        email: '',
        password: '',
    });
    const [error, setError] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        setError('');

        // Placeholder authentication - in production, this would call a backend API
        if (formData.email === 'admin@shivajihospital.com' && formData.password === 'admin123') {
            // Store auth token (placeholder)
            localStorage.setItem('adminAuth', 'true');
            router.push('/admin/dashboard');
        } else {
            setError('Invalid email or password');
        }
    };

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    return (
        <div className="page-wrapper">
            <section className="section" style={{ minHeight: '80vh', display: 'flex', alignItems: 'center' }}>
                <div className="container" style={{ maxWidth: '500px' }}>
                    <Link href="/" className="back-link">← Back to Home</Link>

                    <div className="card" style={{ marginTop: 'var(--space-6)' }}>
                        <div style={{ textAlign: 'center', marginBottom: 'var(--space-6)' }}>
                            <h1 className="mb-2">Admin Login</h1>
                            <p className="text-secondary">Access the hospital management dashboard</p>
                        </div>

                        {error && (
                            <div style={{
                                padding: 'var(--space-3)',
                                background: '#fee',
                                border: '1px solid #fcc',
                                borderRadius: 'var(--radius-md)',
                                marginBottom: 'var(--space-4)',
                                color: '#c33',
                                textAlign: 'center'
                            }}>
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label htmlFor="email">Email Address</label>
                                <input
                                    type="email"
                                    id="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    placeholder="admin@shivajihospital.com"
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="password">Password</label>
                                <input
                                    type="password"
                                    id="password"
                                    name="password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    placeholder="Enter your password"
                                    required
                                />
                            </div>

                            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: 'var(--space-4)' }}>
                                Login to Dashboard
                            </button>

                            <div style={{ marginTop: 'var(--space-4)', padding: 'var(--space-3)', background: 'var(--color-accent-blue)', borderRadius: 'var(--radius-md)' }}>
                                <p style={{ fontSize: 'var(--text-sm)', margin: 0, textAlign: 'center' }}>
                                    <strong>Demo Credentials:</strong><br />
                                    Email: admin@shivajihospital.com<br />
                                    Password: admin123
                                </p>
                            </div>
                        </form>
                    </div>

                    <div style={{ textAlign: 'center', marginTop: 'var(--space-4)' }}>
                        <Link href="/patient-portal" className="text-secondary" style={{ fontSize: 'var(--text-sm)' }}>
                            Looking for Patient Login? →
                        </Link>
                    </div>
                </div>
            </section>
        </div>
    );
}
