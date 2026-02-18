import Link from 'next/link';

export default function Reviews() {
    const reviews = [
        {
            id: 1,
            name: 'Rajesh K.',
            rating: 5,
            date: 'November 2024',
            comment: 'Excellent cardiac care! Dr. Gangwar is very knowledgeable and caring. The hospital facilities are modern and clean.',
        },
        {
            id: 2,
            name: 'Priya S.',
            rating: 5,
            date: 'October 2024',
            comment: 'Best diabetes management in Farrukhabad. Dr. Gangwar explained everything clearly and the treatment plan is working great.',
        },
        {
            id: 3,
            name: 'Amit M.',
            rating: 5,
            date: 'October 2024',
            comment: 'Professional staff and excellent service. Highly recommend for heart-related issues.',
        },
        {
            id: 4,
            name: 'Sunita D.',
            rating: 4,
            date: 'September 2024',
            comment: 'Very good experience overall. The doctor is patient and listens carefully to all concerns.',
        },
    ];

    const renderStars = (rating) => {
        return (
            <div style={{ display: 'flex', gap: '4px', color: '#FFD700' }}>
                {[...Array(5)].map((_, i) => (
                    <svg key={i} width="20" height="20" viewBox="0 0 24 24" fill={i < rating ? 'currentColor' : 'none'} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                    </svg>
                ))}
            </div>
        );
    };

    return (
        <div className="page-wrapper">
            <section className="section">
                <div className="container" style={{ maxWidth: '900px' }}>
                    <Link href="/" className="back-link">← Back to Home</Link>

                    <h1 className="text-center mb-4">Patient Reviews</h1>
                    <p className="text-center text-secondary mb-6">
                        See what our patients say about their experience with us
                    </p>

                    <div style={{ display: 'grid', gap: 'var(--space-4)' }}>
                        {reviews.map((review) => (
                            <div key={review.id} className="card">
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 'var(--space-2)' }}>
                                    <div>
                                        <h3 style={{ fontSize: 'var(--text-lg)', marginBottom: 'var(--space-1)' }}>{review.name}</h3>
                                        {renderStars(review.rating)}
                                    </div>
                                    <span className="text-secondary" style={{ fontSize: 'var(--text-sm)' }}>{review.date}</span>
                                </div>
                                <p className="text-secondary" style={{ marginBottom: 0 }}>{review.comment}</p>
                            </div>
                        ))}
                    </div>

                    <div className="card mt-6" style={{ background: 'var(--color-accent-blue)', textAlign: 'center' }}>
                        <h2 className="mb-3">Share Your Experience</h2>
                        <p className="text-secondary mb-4">
                            Your feedback helps us improve and helps others make informed decisions
                        </p>
                        <Link href="/contact" className="btn btn-primary">
                            Contact Us to Leave a Review
                        </Link>
                    </div>
                </div>
            </section>

            <footer className="footer">
                <div className="container">
                    <div className="footer-bottom">
                        <p className="text-secondary">© 2024 Shivaji Hospital. All rights reserved.</p>
                    </div>
                </div>
            </footer>

            <Link href="/book-appointment" className="floating-book-btn" aria-label="Book Appointment">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                </svg>
                <span>Book</span>
            </Link>
        </div>
    );
}
