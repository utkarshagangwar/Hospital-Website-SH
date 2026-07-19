'use client';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useLoader } from '@/context/LoaderContext';
import { Heart, Star, Activity, MapPin } from '@/components/icons';

export default function About() {
    const [contact, setContact] = useState({
        phone: '9044952554',
        whatsapp: '9044952554',
        email: 'shivajiheartcare@gmail.com',
        address: '1/16, Awas Vikas, Farrukhabad, Uttar Pradesh, India'
    });
    const { hideLoader } = useLoader();

    useEffect(() => {
        fetch('/api/admin/settings')
            .then(res => res.json())
            .then(json => {
                if (json.success && json.data && json.data.contact) {
                    setContact(prev => ({ ...prev, ...json.data.contact }));
                }
            })
            .catch(console.error)
            .finally(() => hideLoader());
    }, []);

    return (
        <div className="page-wrapper">
            <section className="section">
                <div className="container about-container">
                    <Link href="/" className="back-link">← Back to Home</Link>

                    <h1 className="about-title">About Our Hospital</h1>

                    <div className="card about-card fade-in">
                        <div className="section-header">
                            <Heart size={20} />
                            <h2>Our Mission</h2>
                        </div>
                        <p className="text-secondary about-text">
                            At Shivaji Hospital and Heart Care Centre, we are dedicated to providing world-class cardiac and diabetes care with a compassionate, patient-centered approach. Located in the heart of Farrukhabad, we serve our community with advanced medical expertise and modern healthcare facilities.
                        </p>
                    </div>

                    <div className="card about-card fade-in delay-1">
                        <div className="section-header">
                            <Star size={20} />
                            <h2>Our Values</h2>
                        </div>
                        <div className="values-grid">
                            {[
                                ['Excellence - ', 'We strive for the highest standards of medical care in every treatment and procedure.'],
                                ['Compassion - ', 'Treating every patient with dignity'],
                                ['Innovation - ', 'Modern medical technology'],
                                ['Integrity - ', 'Transparency and ethics']
                            ].map(([title, desc], i) => (
                                <div key={i} className="value-item">
                                    <strong>{title}</strong>
                                    <span className="text-secondary">{desc}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="card about-card fade-in delay-2">
                        <div className="section-header">
                            <Activity size={20} />
                            <h2>Our Facilities</h2>
                        </div>
                        <p className="text-secondary about-text">
                            We are equipped with state-of-the-art medical equipment including ECG, Echo, stress testing facilities, and a comprehensive diagnostic laboratory. Our modern infrastructure ensures accurate diagnosis and effective treatment for all our patients.
                        </p>
                    </div>

                    <div className="card about-card fade-in delay-3">
                        <div className="section-header">
                            <MapPin size={20} />
                            <h2>Location & Contact</h2>
                        </div>
                        <p className="text-secondary about-text">
                            <strong>Address:</strong> {contact.address}<br />
                            <strong>Phone:</strong> <a href={`tel:${contact.phone}`} className="link">{contact.phone}</a><br />
                            <strong>WhatsApp:</strong> <a href={`https://wa.me/91${contact.whatsapp}`} target="_blank" rel="noopener noreferrer" className="link">{contact.whatsapp}</a><br />
                            <strong>Email:</strong> <a href={`mailto:${contact.email}`} className="link">{contact.email}</a>
                        </p>
                    </div>

                </div>
            </section>

            <style jsx>{`
                .about-container { max-width: 900px; margin: auto; padding: 0 16px; }

                .about-title {
                    text-align: center;
                    margin-bottom: 32px;
                }

                .about-card {
                    padding: 24px;
                    border-radius: var(--radius-2xl);
                    margin-bottom: 20px;
                    background: var(--color-surface);
                    border: 1px solid var(--color-border);
                    box-shadow: var(--shadow-sm);
                    transition: transform var(--transition-normal), box-shadow var(--transition-normal);
                    color: var(--color-ember-deep);
                }

                .about-card:hover {
                    transform: translateY(-4px);
                    box-shadow: var(--shadow-lg);
                }

                .section-header {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    font-weight: 700;
                    margin-bottom: 10px;
                    color: var(--color-ink);
                }

                .about-text { font-size: 15px; line-height: 1.7; }

                .values-grid {
                    display: grid;
                    grid-template-columns: repeat(2,1fr);
                    gap: 12px;
                }

                .value-item {
                    padding: 12px;
                    border-radius: var(--radius-lg);
                    background: var(--color-ground);
                    border: 1px solid var(--color-border);
                }

                /* Split into two animations on purpose: opacity needs
                   "forwards" (it must stay at 1 once visible), but the slide
                   uses "backwards" only, not "forwards" — its end value
                   (translateY(0)) is visually a no-op, but a lingering
                   non-"none" transform on this ancestor after the animation
                   ends would permanently create a new containing block and
                   silently break position:fixed/sticky on anything nested
                   inside it later (same root cause as .route-fade in
                   globals.css). "backwards" keeps the pre-animation state
                   during animation-delay without that persisting bug. */
                .fade-in {
                    opacity: 0;
                    animation:
                        fadeInOpacity 0.6s var(--ease-out-quart) forwards,
                        fadeInSlide 0.6s var(--ease-out-quart) backwards;
                }
                .delay-1 { animation-delay: .1s }
                .delay-2 { animation-delay: .2s }
                .delay-3 { animation-delay: .3s }

                @keyframes fadeInOpacity { to { opacity: 1; } }
                @keyframes fadeInSlide { from { transform: translateY(20px); } to { transform: translateY(0); } }

                @media (prefers-reduced-motion: reduce) {
                    .fade-in { animation: none; opacity: 1; transform: none; }
                }

                @media (max-width:640px){
                    .values-grid { grid-template-columns:1fr; }
                }
            `}</style>
        </div>
    );
}
