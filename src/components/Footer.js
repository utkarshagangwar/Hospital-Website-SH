'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { getHospitalData, initializeData } from '@/utils/hospitalData';

export default function Footer() {
    const [hospitalData, setHospitalData] = useState(null);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        const data = initializeData();
        setHospitalData(data);
    }, []);

    // Provide default data to prevent hydration mismatch
    const contact = hospitalData?.contact || {
        phone: '9044952554',
        email: 'shivajiheartcare@gmail.com',
        address: '1/16, Awas Vikas, Farrukhabad, Uttar Pradesh'
    };

    const opdHours = hospitalData?.opdHours || {
        
    };

    return (
        <footer className="footer">
            <div className="container">
                <div className="footer-content">
                    <div>
                        <h4>Shivaji Hospital</h4>
                        <p className="text-secondary">Compassionate Care, Clinical Excellence</p>
                    </div>
                    <div>
                        <h4>Quick Links</h4>
                        <div className="footer-links">
                            <Link href="/about">About Us</Link>
                            <Link href="/doctors">Our Doctors</Link>
                            <Link href="/gallery">Gallery</Link>
                            <Link href="/contact">Contact</Link>
                        </div>
                    </div>
                    <div>
                        <h4>Contact</h4>
                        <div className="footer-links">
                            <a href={`tel:${contact.phone}`}>Phone: {contact.phone}</a>
                            <a href={`mailto:${contact.email}`}>Email: {contact.email}</a>
                            <p className="text-secondary">{contact.address}</p>
                        </div>
                    </div>
                    <div>
                        <h4>Hospital Hours</h4>
                        <p className="text-secondary">{opdHours.weekdays}</p>
                        <p className="text-secondary">{opdHours.saturday}</p>
                        <p className="text-secondary">{opdHours.sunday}</p>
                    </div>
                </div>
                <div className="footer-bottom">
                    <p>© 2025 Shivaji Hospital. All rights reserved.</p>
                </div>
            </div>
        </footer>
    );
}
