'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { useLoader } from '@/context/LoaderContext';

export default function Doctors() {
    const [doctors, setDoctors] = useState([]);
    const [loading, setLoading] = useState(true);
    const { showLoader, hideLoader } = useLoader();

    useEffect(() => {
        const fetchDoctors = async () => {
            showLoader(300); // Show loader with 300ms minimum
            try {
                const res = await fetch('/api/doctors');
                const json = await res.json();
                if (json.success && json.data) {
                    // Map Supabase fields to the format the UI expects
                    const mapped = json.data.map(d => ({
                        id: d.id,
                        name: d.full_name,
                        qualifications: Array.isArray(d.qualifications) ? d.qualifications : (d.qualification ? d.qualification.split(',').map(q => q.trim()) : []),
                        specializations: Array.isArray(d.specializations) ? d.specializations : (d.specialization ? [d.specialization] : []),
                        image: d.image_url || '/images/doctor.png',
                        opdHours: d.opd_hours || 'Mon-Sat: 9 AM - 2 PM, 5 PM - 8 PM'
                    }));
                    setDoctors(mapped);
                }
            } catch (err) {
                console.error('Failed to fetch doctors:', err);
            } finally {
                setLoading(false);
                hideLoader();
            }
        };

        fetchDoctors();
    }, [showLoader, hideLoader]);

    if (loading || doctors.length === 0) {
        // Return null to let the full-screen loader show
        return null;
    }

    return (
        <div className="page-wrapper">
            <section className="section">
                <div className="container" style={{ maxWidth: '900px' }}>
                    <Link href="/" className="back-link">← Back to Home</Link>

                    <h1 className="text-center mb-6">Our Doctors</h1>

                    <div style={{ display: 'grid', gap: 'var(--space-8)' }}>
                        {doctors.map((doctor) => (
                            <div key={doctor.id} className="card">
                                <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 'var(--space-6)', alignItems: 'center' }}>
                                    <div className="doctor-image-container">
                                        <div className="doctor-avatar-img">
                                            <Image
                                                src={doctor.image || '/images/doctor.png'}
                                                alt={doctor.name}
                                                fill
                                                style={{ objectFit: 'cover' }}
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <h2 className="mb-2">{doctor.name}</h2>

                                        <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap', marginBottom: 'var(--space-3)' }}>
                                            {doctor.qualifications.map((qual, index) => (
                                                <span key={index} className="badge">{qual}</span>
                                            ))}
                                        </div>

                                        <div className="mb-3">
                                            <h4 style={{ marginBottom: 'var(--space-2)' }}>Specializations</h4>
                                            <ul style={{ paddingLeft: 'var(--space-4)' }}>
                                                {doctor.specializations.map((spec, index) => (
                                                    <li key={index} className="text-secondary">{spec}</li>
                                                ))}
                                            </ul>
                                        </div>

                                        <div className="mb-3">
                                            <h4 style={{ marginBottom: 'var(--space-1)' }}>OPD Hours</h4>
                                            <p className="text-secondary">{doctor.opdHours}</p>
                                        </div>

                                        <Link href="/book-appointment" className="btn btn-primary">
                                            Book Appointment
                                        </Link>
                                    </div>
                                </div>

                                {/* Mobile Layout */}
                                <style jsx>{`
                                    @media (max-width: 768px) {
                                        div > div {
                                            grid-template-columns: 1fr !important;
                                            text-align: center;
                                        }
                                    }
                                `}</style>
                            </div>
                        ))}
                    </div>
                </div>
            </section>
        </div>
    );
}
