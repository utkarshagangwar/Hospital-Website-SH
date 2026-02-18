'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { getHospitalData, initializeData } from '@/utils/hospitalData';

export default function Doctors() {
    const [hospitalData, setHospitalData] = useState(null);

    useEffect(() => {
        const data = initializeData();
        setHospitalData(data);
    }, []);

    if (!hospitalData) {
        return <div>Loading...</div>;
    }

    const { doctors } = hospitalData;

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
