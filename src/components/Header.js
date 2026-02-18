'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Header() {
    const [isScrolled, setIsScrolled] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const pathname = usePathname();

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 10);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Close mobile menu on route change
    useEffect(() => {
        setIsMobileMenuOpen(false);
    }, [pathname]);

    return (
        <header className={`modern-header ${isScrolled ? 'scrolled' : ''}`}>
            <div className="container header-inner">
                <Link href="/" className="logo">
                    Shivaji Hospital
                </Link>

                {/* Desktop Nav */}
                <nav className="desktop-nav">
                    <Link href="/" className={pathname === '/' ? 'active' : ''}>Home</Link>
                    <Link href="/about" className={pathname === '/about' ? 'active' : ''}>About</Link>
                    <Link href="/doctors" className={pathname === '/doctors' ? 'active' : ''}>Doctors</Link>
                    <Link href="/gallery" className={pathname === '/gallery' ? 'active' : ''}>Gallery</Link>
                    <Link href="/contact" className={pathname === '/contact' ? 'active' : ''}>Contact</Link>
                </nav>

                {/* Actions */}
                <div className="header-actions">
                    <a href="tel:9044952554" className="action-icon-btn" aria-label="Call Us">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                        </svg>
                    </a>

                    {/* Login Dropdown */}
                    <div className="login-dropdown hidden-mobile">
                        <button className="login-dropdown-btn">
                            Login
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M6 9l6 6 6-6" />
                            </svg>
                        </button>
                        <div className="login-dropdown-menu">
                            <Link href="/patient-portal">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                    <circle cx="12" cy="7" r="4"></circle>
                                </svg>
                                Patient Login
                            </Link>
                            <Link href="/admin/login">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
                                    <path d="M2 17l10 5 10-5"></path>
                                    <path d="M2 12l10 5 10-5"></path>
                                </svg>
                                Admin Login
                            </Link>
                        </div>
                    </div>

                    <Link href="/book-appointment" className="btn btn-primary btn-sm hidden-mobile">
                        Book Appointment
                    </Link>

                    {/* Mobile Toggle */}
                    <button
                        className="mobile-toggle"
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        aria-label="Toggle Menu"
                    >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            {isMobileMenuOpen ? (
                                <path d="M18 6L6 18M6 6l12 12" />
                            ) : (
                                <path d="M3 12h18M3 6h18M3 18h18" />
                            )}
                        </svg>
                    </button>
                </div>

                {/* Mobile Menu */}
                <div className={`mobile-menu ${isMobileMenuOpen ? 'open' : ''}`}>
                    <nav>
                        <Link href="/">Home</Link>
                        <Link href="/about">About</Link>
                        <Link href="/doctors">Doctors</Link>
                        <Link href="/gallery">Gallery</Link>
                        <Link href="/contact">Contact</Link>
                        <div style={{ borderTop: '1px solid var(--color-border)', marginTop: 'var(--space-2)', paddingTop: 'var(--space-2)' }}>
                            <Link href="/patient-portal">Patient Login</Link>
                            <Link href="/admin/login">Admin Login</Link>
                        </div>
                        <Link href="/book-appointment" className="mobile-cta">Book Appointment</Link>
                    </nav>
                </div>
            </div>
        </header>
    );
}
