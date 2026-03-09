'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';

const DEFAULT_CONTACT = {
    phone: '9044952554',
    email: 'shivajiheartcare@gmail.com',
    address: '1/16, Awas Vikas, Farrukhabad, Uttar Pradesh'
};

const DEFAULT_OPD = {
    weekdays: 'Monday - Friday: 9:00 AM - 2:00 PM, 5:00 PM - 8:00 PM',
    saturday: 'Saturday: 9:00 AM - 2:00 PM, 5:00 PM - 8:00 PM',
    sunday: 'Sunday: Closed'
};

export default function Footer() {
    // Start as null — render nothing until API responds (avoids flash of wrong data)
    const [contact, setContact] = useState(null);
    const [opdHours, setOpdHours] = useState(null);

    useEffect(() => {
        fetch('/api/admin/settings')
            .then(res => res.json())
            .then(json => {
                if (json.success && json.data) {
                    setContact(json.data.contact || DEFAULT_CONTACT);
                    setOpdHours(json.data.opdHours || DEFAULT_OPD);
                } else {
                    // API didn't return valid data, fall back to defaults
                    setContact(DEFAULT_CONTACT);
                    setOpdHours(DEFAULT_OPD);
                }
            })
            .catch(() => {
                // Network error — fall back to defaults
                setContact(DEFAULT_CONTACT);
                setOpdHours(DEFAULT_OPD);
            });
    }, []);


    // Parse an OPD hours string like "Monday - Friday: 9:00 AM - 2:00 PM, 5:00 PM - 8:00 PM"
    // Extracts the day label (before ':') and time slots (after ':') entirely from the string.
    const renderHoursBlock = (rawValue, key) => {
        if (!rawValue) return null;

        // Split on the FIRST colon to get day label + times
        const colonIdx = rawValue.indexOf(':');
        const dayLabel = colonIdx !== -1 ? rawValue.slice(0, colonIdx).trim() + ':' : rawValue.trim();
        const timePart = colonIdx !== -1 ? rawValue.slice(colonIdx + 1).trim() : '';

        // "Closed" or similar
        if (!timePart || timePart.toLowerCase() === 'closed') {
            return (
                <li className="footer-hours-row" key={key}>
                    <span className="footer-hours-day">{dayLabel}</span>
                    <span className="footer-hours-closed">{timePart || 'Closed'}</span>
                </li>
            );
        }

        // Split comma-separated time ranges: "9:00 AM - 2:00 PM, 5:00 PM - 8:00 PM"
        const slots = timePart.split(',').map(s => s.trim()).filter(Boolean);

        return slots.map((slot, i) => (
            <li
                key={`${key}-${i}`}
                className={`footer-hours-row${i > 0 ? ' footer-hours-continuation' : ''}`}
            >
                <span className={i === 0 ? 'footer-hours-day' : ''}>{i === 0 ? dayLabel : ''}</span>
                <span className="footer-hours-time">{slot}</span>
            </li>
        ));
    };

    return (
        <footer className="footer">
            <div className="footer-inner">

                {/* ── 4-Column Grid ── */}
                <div className="footer-grid">

                    {/* Col 1: Brand + Description + Social */}
                    <div className="footer-brand-col">
                        <span className="footer-logo">
                            Shivaji<span className="footer-logo-accent">Hospital</span>
                        </span>
                        <p className="footer-brand-desc">
                            Compassionate Care, Clinical Excellence. Dedicated to providing the best healthcare services to our community.
                        </p>
                        <div className="footer-social">
                            <a href="#" className="footer-social-link" aria-label="Facebook">
                                <span className="material-icons-outlined">facebook</span>
                            </a>
                            <a href="#" className="footer-social-link" aria-label="Twitter">
                                <span className="material-icons-outlined">water_drop</span>
                            </a>
                            <a href="#" className="footer-social-link" aria-label="Instagram">
                                <span className="material-icons-outlined">photo_camera</span>
                            </a>
                        </div>
                    </div>

                    {/* Col 2: Quick Links */}
                    <div className="footer-col">
                        <h4 className="footer-heading">Quick Links</h4>
                        <ul className="footer-nav-list">
                            <li><Link href="/about" className="footer-nav-link">About Us</Link></li>
                            <li><Link href="/doctors" className="footer-nav-link">Our Doctors</Link></li>
                            <li><Link href="/gallery" className="footer-nav-link">Gallery</Link></li>
                            <li><Link href="/contact" className="footer-nav-link">Contact</Link></li>
                        </ul>
                    </div>

                    {/* Col 3: Contact */}
                    {contact && (
                        <div className="footer-col">
                            <h4 className="footer-heading">Contact</h4>
                            <ul className="footer-contact-list">
                                <li className="footer-contact-item">
                                    <span className="material-icons-outlined footer-contact-icon">phone</span>
                                    <div>
                                        <span className="footer-contact-label">Phone</span>
                                        <a href={`tel:${contact.phone}`} className="footer-contact-value footer-contact-link">
                                            {contact.phone}
                                        </a>
                                    </div>
                                </li>
                                <li className="footer-contact-item">
                                    <span className="material-icons-outlined footer-contact-icon">email</span>
                                    <div>
                                        <span className="footer-contact-label">Email</span>
                                        <a href={`mailto:${contact.email}`} className="footer-contact-value footer-contact-link" style={{ wordBreak: 'break-all' }}>
                                            {contact.email}
                                        </a>
                                    </div>
                                </li>
                                <li className="footer-contact-item">
                                    <span className="material-icons-outlined footer-contact-icon">location_on</span>
                                    <div>
                                        <span className="footer-contact-label">Address</span>
                                        <span className="footer-contact-value">{contact.address}</span>
                                    </div>
                                </li>
                            </ul>
                        </div>
                    )}

                    {/* Col 4: Hospital Hours — dynamic from opdHours state */}
                    {opdHours && (
                        <div className="footer-col">
                            <h4 className="footer-heading">Hospital Hours</h4>
                            <ul className="footer-hours-list">
                                {renderHoursBlock(opdHours.weekdays, 'weekdays')}
                                <li className="footer-hours-divider"></li>
                                {renderHoursBlock(opdHours.saturday, 'saturday')}
                                <li className="footer-hours-divider"></li>
                                {renderHoursBlock(opdHours.sunday, 'sunday')}
                            </ul>
                        </div>
                    )}

                </div>

                {/* ── Footer Bottom ── */}
                <div className="footer-bottom">
                    <p>© 2025 Shivaji Hospital. All rights reserved.</p>
                </div>
            </div>
        </footer>
    );
}
