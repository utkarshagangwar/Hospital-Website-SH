import Link from 'next/link';

export default function About() {
    return (
        <div className="page-wrapper">


            <section className="section">
                <div className="container" style={{ maxWidth: '800px' }}>
                    <Link href="/" className="back-link">← Back to Home</Link>

                    <h1 className="text-center mb-6">About Our Hospital</h1>

                    <div className="card mb-6">
                        <h2>Our Mission</h2>
                        <p className="text-secondary">
                            At Shivaji Hospital and Heart Care Centre, we are dedicated to providing world-class cardiac and diabetes
                            care with a compassionate, patient-centered approach. Located in the heart of Farrukhabad, we serve our
                            community with advanced medical expertise and modern healthcare facilities.
                        </p>
                    </div>

                    <div className="card mb-6">
                        <h2>Our Values</h2>
                        <ul style={{ listStyle: 'none', padding: 0 }}>
                            <li className="mb-2">
                                <strong>Excellence:</strong> <span className="text-secondary">Committed to the highest standards of medical care</span>
                            </li>
                            <li className="mb-2">
                                <strong>Compassion:</strong> <span className="text-secondary">Treating every patient with dignity and respect</span>
                            </li>
                            <li className="mb-2">
                                <strong>Innovation:</strong> <span className="text-secondary">Embracing modern medical technology and techniques</span>
                            </li>
                            <li className="mb-2">
                                <strong>Integrity:</strong> <span className="text-secondary">Maintaining transparency and ethical practices</span>
                            </li>
                        </ul>
                    </div>

                    <div className="card mb-6">
                        <h2>Our Facilities</h2>
                        <p className="text-secondary">
                            We are equipped with state-of-the-art medical equipment including ECG, Echo, stress testing facilities,
                            and a comprehensive diagnostic laboratory. Our modern infrastructure ensures accurate diagnosis and
                            effective treatment for all our patients.
                        </p>
                    </div>

                    <div className="card">
                        <h2>Location</h2>
                        <p className="text-secondary">
                            <strong>Address:</strong> 1/16, Awas Vikas, Farrukhabad, Uttar Pradesh, India<br />
                            <strong>Phone:</strong> 9044952554<br />
                            <strong>Email:</strong> shivajiheartcare@gmail.com
                        </p>
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
