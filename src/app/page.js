'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { getHospitalData, initializeData } from '@/utils/hospitalData';
import { useLoader } from '@/context/LoaderContext';
import './page.css';
import { Pulse, Droplet, Stethoscope, ClipboardList, Activity, Siren, ShieldCheck, FlaskConical, Clock, ArrowLeft, ArrowRight, Phone, WhatsApp } from '@/components/icons';

// Hero background carousel — sequence fixed per request: OPD, doctor, ward.
const HERO_IMAGES = [
  { src: '/images/sh_out.png', alt: 'Shivaji Hospital OPD and reception area' },
  { src: '/images/sh_dr.png', alt: 'Doctor consultation at Shivaji Hospital' },
  { src: '/images/sh_ward.png', alt: 'Patient ward at Shivaji Hospital' },
];
const HERO_SLIDE_INTERVAL_MS = 8000;

export default function Home() {
  const [hospitalData, setHospitalData] = useState(null);
  const [currentDoctorIndex, setCurrentDoctorIndex] = useState(0);
  const [heroImageIndex, setHeroImageIndex] = useState(0);
  const { hideLoader } = useLoader();

  // Auto-advance the hero background carousel; CSS handles the fade (see .hero-bg-image)
  useEffect(() => {
    const interval = setInterval(() => {
      setHeroImageIndex((prev) => (prev + 1) % HERO_IMAGES.length);
    }, HERO_SLIDE_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [settingsRes, doctorsRes, servicesRes] = await Promise.all([
          fetch('/api/admin/settings'),
          fetch('/api/doctors'),
          fetch('/api/services')
        ]);
        const settings = settingsRes.ok ? await settingsRes.json() : {};
        const doctors = doctorsRes.ok ? await doctorsRes.json() : {};
        const services = servicesRes.ok ? await servicesRes.json() : {};

        setHospitalData({
          contact: settings.data?.contact || {
            phone: '9044952554',
            whatsapp: '9044952554',
            email: 'shivajiheartcare@gmail.com',
            address: '1/16, Awas Vikas, Farrukhabad, Uttar Pradesh'
          },
          doctors: doctors.data ? doctors.data.map(d => ({
            id: d.id,
            name: d.full_name,
            qualifications: Array.isArray(d.qualifications) ? d.qualifications : (d.qualification ? [d.qualification] : []),
            specializations: Array.isArray(d.specializations) ? d.specializations : (d.specialization ? [d.specialization] : []),
            opdHours: d.opd_hours || '',
            image: d.image_url || '/images/doctor.png'
          })) : [],
          services: services.data || []
        });
      } catch (err) {
        console.error('Failed to fetch data:', err);
      } finally {
        // Hide loader after data is loaded (success or error)
        hideLoader();
      }
    };
    fetchData();
  }, [hideLoader]);

  // Animation Observer Effect
  useEffect(() => {
    const observerOptions = {
      root: null,
      rootMargin: '0px',
      threshold: 0.15
    };

    const observer = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, observerOptions);

    const revealElements = document.querySelectorAll('.reveal-element');
    revealElements.forEach(el => observer.observe(el));

    return () => {
      revealElements.forEach(el => observer.unobserve(el));
    };
  }, [hospitalData]); // Re-run when data loads and elements are mounted

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
    // Return null to let the full-screen loader show
    return null;
  }

  const { services, doctors, contact } = hospitalData;

  // Icon map for services — custom line icons, not a stock icon-font.
  // Unmatched service names fall back to Activity rather than repeating
  // one of the icons already assigned above.
  const serviceIconMap = {
    'Cardiology': Pulse,
    'Diabetes Care': Droplet,
    'General Medicine': Stethoscope,
    'General OPD': ClipboardList,
    'Lab Diagnostics': FlaskConical,
    'Specialist Consultation': ShieldCheck,
  };

  return (
    <div className="page-wrapper">

      {/* ── Hero Section ── */}
      <section className="hero-section">
        <div className="hero-bg">
          {HERO_IMAGES.map((image, index) => (
            <Image
              key={image.src}
              src={image.src}
              alt={image.alt}
              fill
              style={{ objectFit: 'cover' }}
              priority={index === 0}
              className={`hero-bg-image${index === heroImageIndex ? ' is-active' : ''}`}
            />
          ))}
          <div className="hero-overlay"></div>
        </div>

        <div className="hero-content-wrapper">
          <div className="hero-content">
            <div className="hero-eyebrow">
              <div className="eyebrow-line"></div>
              <span>Healing with Technology</span>
            </div>

            <h1 className="hero-title reveal-element">
              Compassionate Care,<br />
              <span className="hero-title-gradient">Clinical Excellence</span>
            </h1>

            <p className="hero-description reveal-element" style={{ transitionDelay: '0.2s' }}>
              Experience world-class healthcare at {contact.address}. Your health is our priority.
            </p>

            <div className="hero-actions">
              <Link href="/book-appointment" className="btn-hero-primary">
                Book Appointment
              </Link>
              {contact.phone && (
                <a href={`tel:${contact.phone}`} className="btn-hero-secondary" title={`Call: ${contact.phone}`}>
                  <Phone size={19} />
                  Call
                </a>
              )}
              {contact.whatsapp && (
                <a href={`https://wa.me/91${contact.whatsapp}`} className="btn-hero-secondary" target="_blank" rel="noopener noreferrer" title={`WhatsApp: ${contact.whatsapp}`}>
                  <WhatsApp size={19} />
                  WhatsApp
                </a>
              )}
            </div>

            <div className="hero-badges">
              <div className="hero-badge">
                <Siren size={21} className="hero-badge-icon" />
                <span>24/7 Emergency</span>
              </div>
              <div className="hero-badge">
                <ShieldCheck size={21} className="hero-badge-icon" />
                <span>Expert Doctors</span>
              </div>
              <div className="hero-badge">
                <FlaskConical size={21} className="hero-badge-icon" />
                <span>Modern Labs</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Services Section ── */}
      <section className="services-section">
        <div className="section-container">
          <div className="section-header">
            <span className="section-eyebrow">
              <span className="section-eyebrow-line" aria-hidden="true"></span>
              Our Expertise
              <span className="section-eyebrow-line" aria-hidden="true"></span>
            </span>
            <h2 className="section-title">Medical Services</h2>
          </div>

          <div className="services-grid">
            {services.map((service, index) => {
              const ServiceIcon = serviceIconMap[service.name] || Activity;
              return (
                <div key={service.id} className="service-card-new reveal-element" style={{ transitionDelay: `${index * 0.1}s` }}>
                  {/* Decorative bg icon */}
                  <div className="service-bg-icon" aria-hidden="true">
                    <ServiceIcon size={112} strokeWidth={1.2} />
                  </div>

                  {/* Icon box */}
                  <div className="service-icon-box">
                    {service.icon ? (
                      <Image
                        src={service.icon}
                        alt={service.name}
                        width={36}
                        height={36}
                        style={{ objectFit: 'contain' }}
                      />
                    ) : (
                      <ServiceIcon size={30} className="service-icon-symbol" />
                    )}
                  </div>

                  <h3 className="service-card-title">{service.name}</h3>
                  <p className="service-card-desc">{service.description}</p>
                  <span className="service-learn-more">
                    Learn more
                    <ArrowRight size={16} />
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Doctors Section ── */}
      {doctors.length > 0 && (
        <section className="doctors-section">
          {/* Grid background decoration */}
          <div className="doctors-grid-bg" aria-hidden="true">
            <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="1" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />
            </svg>
          </div>

          <div className="section-container" style={{ position: 'relative', zIndex: 1 }}>
            <div className="doctors-section-header">
              <h2 className="section-title">Meet Our Doctors</h2>
              <div className="section-underline"></div>
            </div>

            {/* Doctors Section */}
            <div className="doctor-card-wrapper reveal-element" style={{ position: 'relative' }}>
              <div className="doctor-card">
                {/* Doctor image */}
                <div className="doctor-image-col">
                  <div className="doctor-image-wrapper">
                    <div className="doctor-image-glow"></div>
                    <div className="doctor-avatar-img">
                      <Image
                        src={doctors[currentDoctorIndex].image || '/images/doctor.png'}
                        alt={doctors[currentDoctorIndex].name}
                        fill
                        style={{ objectFit: 'cover' }}
                      />
                    </div>
                    <div className="doctor-image-ring"></div>
                  </div>
                </div>

                {/* Doctor info */}
                <div className="doctor-info">
                  <h3 className="doctor-name">{doctors[currentDoctorIndex].name}</h3>

                  <div className="doctor-qualifications">
                    {doctors[currentDoctorIndex].qualifications.map((qual, index) => (
                      <span key={index} className="qual-badge">{qual}</span>
                    ))}
                  </div>

                  <div className="doctor-details">
                    <div className="doctor-detail-row">
                      <span className="detail-label">Specializations:</span>
                      <span className="detail-value">{doctors[currentDoctorIndex].specializations.join(', ')}</span>
                    </div>
                    <div className="doctor-detail-row">
                      <span className="detail-label">OPD Hours:</span>
                      <div className="detail-value detail-hours">
                        <Clock size={16} className="detail-icon" />
                        {doctors[currentDoctorIndex].opdHours}
                      </div>
                    </div>
                  </div>

                  <Link href="/book-appointment" className="btn-book-doctor">
                    Book Appointment with {doctors[currentDoctorIndex].name.split(' ')[0] + ' ' + doctors[currentDoctorIndex].name.split(' ')[1]}
                  </Link>
                </div>
              </div>

              {/* Carousel nav buttons */}
              {doctors.length > 1 && (
                <>
                  <button
                    onClick={handlePrevDoctor}
                    className="doctor-nav-btn doctor-nav-prev"
                    aria-label="Previous Doctor"
                  >
                    <ArrowLeft size={22} />
                  </button>
                  <button
                    onClick={handleNextDoctor}
                    className="doctor-nav-btn doctor-nav-next"
                    aria-label="Next Doctor"
                  >
                    <ArrowRight size={22} />
                  </button>

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

      {/* ── CTA Section ── */}
      <section className="cta-section">
        <div className="cta-container">
          <h2 className="cta-title">Ready to Get Started?</h2>
          <p className="cta-desc">
            Book your appointment today or reach out to us for any queries. Our team is here to help you.
          </p>
          <div className="cta-actions">
            <Link href="/book-appointment" className="btn-cta-primary">
              Book Appointment
            </Link>
            <Link href="/contact" className="btn-cta-secondary">
              Contact Us
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
}
