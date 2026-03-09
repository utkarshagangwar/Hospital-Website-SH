'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useLoader } from '@/context/LoaderContext';

const DEFAULT_CONTACT = {
    phone: '9044952554',
    whatsapp: '9044952554',
    email: 'shivajiheartcare@gmail.com',
    address: '1/16, Awas Vikas, Farrukhabad, Uttar Pradesh'
};

const DEFAULT_OPD = {
    weekdays: 'Monday - Friday: 9:00 AM - 2:00 PM, 5:00 PM - 8:00 PM',
    saturday: 'Saturday: 9:00 AM - 2:00 PM, 5:00 PM - 8:00 PM',
    sunday: 'Sunday: Closed'
};

export default function Contact() {
    const [contact, setContact] = useState(DEFAULT_CONTACT);
    const [opdHours, setOpdHours] = useState(DEFAULT_OPD);
    const [loading, setLoading] = useState(true);
    const { hideLoader } = useLoader();

    useEffect(() => {
        fetch('/api/admin/settings')
            .then(res => res.json())
            .then(json => {
                if (json.success && json.data) {
                    if (json.data.contact) setContact(json.data.contact);
                    if (json.data.opdHours) setOpdHours(json.data.opdHours);
                }
            })
            .catch(() => {/* keep defaults */ })
            .finally(() => {
                setLoading(false);
                hideLoader();
            });
    }, [hideLoader]);

    if (loading) {
        // Return null to let the full-screen loader show
        return null;
    }

    return (
        <div className="page-wrapper">
            <section className="section">
                <div className="container">
                    <Link href="/" className="back-link">← Back to Home</Link>

                    <h1 className="text-center mb-6">Contact Us</h1>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 'var(--space-6)', marginBottom: 'var(--space-6)' }}>
                        <div className="card">
                            <div style={{ width: '48px', height: '48px', borderRadius: 'var(--radius-full)', background: 'var(--color-accent-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 'var(--space-3)', color: 'var(--color-teal)' }}>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                            </div>
                            <h3 className="mb-2">Address</h3>
                            <p className="text-secondary">{contact.address}</p>
                            <a
                                href={`https://maps.google.com/?q=${encodeURIComponent(contact.address)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn btn-secondary mt-3"
                                style={{ display: 'inline-flex' }}
                            >
                                Get Directions
                            </a>
                        </div>

                        <div className="card">
                            <div style={{ width: '48px', height: '48px', borderRadius: 'var(--radius-full)', background: 'var(--color-accent-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 'var(--space-3)', color: 'var(--color-teal)' }}>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                </svg>
                            </div>
                            <h3 className="mb-2">Phone</h3>
                            <p className="text-secondary mb-3">
                                Reception &amp; Appointments<br />
                                <strong>{contact.phone}</strong>
                            </p>
                            <a href={`tel:${contact.phone}`} className="btn btn-secondary" style={{ display: 'inline-flex' }}>
                                Call Now
                            </a>
                        </div>

                        <div className="card">
                            <div style={{ width: '48px', height: '48px', borderRadius: 'var(--radius-full)', background: 'var(--color-accent-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 'var(--space-3)', color: 'var(--color-teal)' }}>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                                </svg>
                            </div>
                            <h3 className="mb-2">WhatsApp</h3>
                            <p className="text-secondary mb-3">
                                Quick support &amp; appointments<br />
                                <strong>{contact.whatsapp}</strong>
                            </p>
                            <a
                                href={`https://wa.me/91${contact.whatsapp}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn btn-secondary"
                                style={{ display: 'inline-flex' }}
                            >
                                Chat on WhatsApp
                            </a>
                        </div>

                        <div className="card">
                            <div style={{ width: '48px', height: '48px', borderRadius: 'var(--radius-full)', background: 'var(--color-accent-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 'var(--space-3)', color: 'var(--color-teal)' }}>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                            </div>
                            <h3 className="mb-2">Email</h3>
                            <p className="text-secondary mb-3">
                                Send us your queries<br />
                                <strong>{contact.email}</strong>
                            </p>
                            <a
                                href={`mailto:${contact.email}`}
                                className="btn btn-secondary"
                                style={{ display: 'inline-flex' }}
                            >
                                Send Email
                            </a>
                        </div>
                    </div>

                    <div className="card">
                        <h2 className="mb-4">Hospital Hours</h2>
                        <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
                            <p className="text-secondary">{opdHours.weekdays}</p>
                            <p className="text-secondary">{opdHours.saturday}</p>
                            <p className="text-secondary">{opdHours.sunday}</p>
                        </div>
                    </div>
                </div>
            </section>

            <Link href="/book-appointment" className="floating-book-btn" aria-label="Book Appointment">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                </svg>
                <span>Book</span>
            </Link>
        </div>
    );
}
