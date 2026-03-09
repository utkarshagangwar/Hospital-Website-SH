'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { useLoader } from '@/context/LoaderContext';

export default function Gallery() {
    const { hideLoader } = useLoader();

    // Hide loader after component mounts (no data to fetch)
    useEffect(() => {
        hideLoader();
    }, [hideLoader]);

    const placeholderImages = [
        { id: 1, title: 'Hospital Reception', category: 'Facilities' },
        { id: 2, title: 'Consultation Room', category: 'Facilities' },
        { id: 3, title: 'ECG Equipment', category: 'Equipment' },
        { id: 4, title: 'Diagnostic Lab', category: 'Equipment' },
        { id: 5, title: 'Waiting Area', category: 'Facilities' },
        { id: 6, title: 'Medical Team', category: 'Team' },
    ];

    return (
        <div className="page-wrapper">
            <section className="section">
                <div className="container">
                    <Link href="/" className="back-link">← Back to Home</Link>

                    <h1 className="text-center mb-4">Gallery</h1>
                    <p className="text-center text-secondary mb-6">
                        Explore our modern facilities and state-of-the-art equipment
                    </p>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 'var(--space-4)' }}>
                        {placeholderImages.map((image) => (
                            <div key={image.id} className="card" style={{ padding: '0', overflow: 'hidden' }}>
                                <div style={{
                                    height: '200px',
                                    background: 'linear-gradient(135deg, var(--color-accent-blue) 0%, var(--color-accent-sage) 100%)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: 'var(--color-teal)'
                                }}>
                                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                </div>
                                <div style={{ padding: 'var(--space-3)' }}>
                                    <h3 style={{ fontSize: 'var(--text-lg)', marginBottom: 'var(--space-1)' }}>{image.title}</h3>
                                    <span className="badge">{image.category}</span>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="text-center mt-6">
                        <p className="text-secondary">More photos coming soon! Visit us to see our facilities in person.</p>
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
