'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { getHospitalData, initializeData } from '@/utils/hospitalData';
import './page.css';

export default function Home() {
  const [hospitalData, setHospitalData] = useState(null);
  const [currentDoctorIndex, setCurrentDoctorIndex] = useState(0);

  useEffect(() => {
    const data = initializeData();
    setHospitalData(data);
  }, []);

  const handleNextDoctor = () => {
    if (hospitalData && hospitalData.doctors) {
      setCurrentDoctorIndex((prev) =>
        prev === hospitalData.doctors.length - 1 ? 0 : prev + 1
      );
    }
  };

  const handlePrevDoctor = () => {
    if (hospitalData && hospitalData.doctors) {
      setCurrentDoctorIndex((prev) =>
        prev === 0 ? hospitalData.doctors.length - 1 : prev - 1
      );
    }
  };

  if (!hospitalData) {
    return <div>Loading...</div>;
  }

  const { services, doctors, contact } = hospitalData;

  return (
    <div className="page-wrapper">
      {/* Hero Section */}
      <section className="hero section">
        <div className="hero-background">
          <Image
            src="/images/hero.png"
            alt="Hospital Reception"
            fill
            style={{ objectFit: 'cover' }}
            priority
          />
          <div className="hero-overlay"></div>
        </div>
        <div className="container relative z-10 flex justify-center">
          <div className="hero-content-box text-center">
            <div className="heartbeat-line">
              <svg width="300" height="60" viewBox="0 0 300 60">
                <path
                  d="M0,30 L80,30 L100,10 L120,50 L140,30 L300,30"
                  stroke="currentColor"
                  strokeWidth="2"
                  fill="none"
                />
              </svg>
            </div>
            <h1 className="hero-title">Compassionate Care,<br />Clinical Excellence</h1>
            <p className="hero-subtitle">{contact.address}</p>
            <div className="hero-actions">
              <Link href="/book-appointment" className="btn btn-primary">Book Appointment</Link>
              <a href={`tel:${contact.phone}`} className="btn btn-secondary hero-call-btn">Call: {contact.phone}</a>
            </div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section className="services section">
        <div className="container">
          <h2 className="text-center mb-6">Our Services</h2>
          <div className="grid grid-3">
            {services.map((service) => (
              <div key={service.id} className="card service-card">
                {service.icon ? (
                  <div className="service-icon-img">
                    <Image
                      src={service.icon}
                      alt={service.name}
                      width={80}
                      height={80}
                      style={{ objectFit: 'contain' }}
                    />
                  </div>
                ) : (
                  <div className="service-icon">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                )}
                <h3>{service.name}</h3>
                <p className="text-secondary">{service.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Doctors Carousel */}
      {doctors.length > 0 && (
        <section className="featured-doctor section">
          <div className="container">
            <h2 className="text-center mb-6">Meet Our Doctors</h2>
            <div style={{ position: 'relative' }}>
              <div className="doctor-content">
                <div className="doctor-image-container">
                  <div className="doctor-avatar-img">
                    <Image
                      src={doctors[currentDoctorIndex].image || '/images/doctor.png'}
                      alt={doctors[currentDoctorIndex].name}
                      fill
                      style={{ objectFit: 'cover' }}
                    />
                  </div>
                </div>
                <div>
                  <h3>{doctors[currentDoctorIndex].name}</h3>
                  <div className="doctor-qualifications">
                    {doctors[currentDoctorIndex].qualifications.map((qual, index) => (
                      <span key={index} className="badge">{qual}</span>
                    ))}
                  </div>
                  <p className="text-secondary mt-3">
                    <strong>Specializations:</strong> {doctors[currentDoctorIndex].specializations.join(', ')}
                  </p>
                  <p className="text-secondary mt-2">
                    <strong>OPD Hours:</strong> {doctors[currentDoctorIndex].opdHours}
                  </p>
                  <Link href="/book-appointment" className="btn btn-primary mt-4">
                    Book Appointment
                  </Link>
                </div>
              </div>

              {/* Navigation Buttons */}
              {doctors.length > 1 && (
                <>
                  <button
                    onClick={handlePrevDoctor}
                    className="doctor-nav-btn doctor-nav-prev"
                    aria-label="Previous Doctor"
                  >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M15 18l-6-6 6-6" />
                    </svg>
                  </button>
                  <button
                    onClick={handleNextDoctor}
                    className="doctor-nav-btn doctor-nav-next"
                    aria-label="Next Doctor"
                  >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M9 18l6-6-6-6" />
                    </svg>
                  </button>

                  {/* Dots Indicator */}
                  <div className="doctor-dots">
                    {doctors.map((_, index) => (
                      <button
                        key={index}
                        onClick={() => setCurrentDoctorIndex(index)}
                        className={`doctor-dot ${index === currentDoctorIndex ? 'active' : ''}`}
                        aria-label={`Go to doctor ${index + 1}`}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Contact CTA */}
      <section className="contact-cta section">
        <div className="container text-center">
          <h2 className="mb-3">Ready to Get Started?</h2>
          <p className="text-secondary mb-6">
            Book your appointment today or reach out to us for any queries.
          </p>
          <div className="cta-actions">
            <Link href="/book-appointment" className="btn btn-primary">Book Appointment</Link>
            <Link href="/contact" className="btn btn-secondary">Contact Us</Link>
          </div>
        </div>
      </section>

      {/* Floating Book Button */}
      <Link href="/book-appointment" className="floating-book-btn">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <span>Book</span>
      </Link>
    </div>
  );
}
