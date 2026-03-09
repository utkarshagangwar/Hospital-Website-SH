'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useRouter } from 'next/navigation';
import { useLoader } from '@/context/LoaderContext';

// Custom link component that shows loader on navigation
function NavLink({ href, children, className, onClick, isActive }) {
    const { showLoader } = useLoader();
    const router = useRouter();

    const handleClick = (e) => {
        // Show loader before navigation
        showLoader(300);

        // If there's a custom onClick, call it
        if (onClick) {
            onClick(e);
        }

        // Let the default navigation happen
        // The loader will be hidden by the destination page
    };

    return (
        <Link
            href={href}
            className={className}
            onClick={handleClick}
        >
            {children}
        </Link>
    );
}

export default function Header() {
    const [isScrolled, setIsScrolled] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [contact, setContact] = useState(null);
    const pathname = usePathname();
    const { showLoader } = useLoader();

    useEffect(() => {
        fetch('/api/admin/settings')
            .then(res => res.json())
            .then(json => {
                if (json.success && json.data && json.data.contact) {
                    setContact(json.data.contact);
                }
            })
            .catch(console.error);
    }, []);

    useEffect(() => {
        let ticking = false;

        const handleScroll = () => {
            if (ticking) return;
            ticking = true;

            requestAnimationFrame(() => {
                const y = window.scrollY;
                // Hysteresis: enter "scrolled" at 60px, exit below 40px
                // Prevents rapid toggling at the exact threshold boundary
                setIsScrolled(prev => {
                    if (!prev && y > 60) return true;
                    if (prev && y < 40) return false;
                    return prev;
                });
                ticking = false;
            });
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Close mobile menu on route change
    useEffect(() => {
        setIsMobileMenuOpen(false);
    }, [pathname]);

    // Handler for book appointment button
    const handleBookClick = () => {
        showLoader(300);
    };

    return (
        <header className={`modern-header ${isScrolled ? 'scrolled' : ''}`}>
            <div className="container header-inner">
                <Link href="/" className="logo" onClick={() => showLoader(300)}>
                    Shivaji<span style={{ color: 'var(--color-teal)' }}>Hospital</span>
                </Link>

                {/* Desktop Nav */}
                <nav className="desktop-nav">
                    <NavLink href="/" isActive={pathname === '/'}>Home</NavLink>
                    <NavLink href="/about" isActive={pathname === '/about'}>About</NavLink>
                    <NavLink href="/doctors" isActive={pathname === '/doctors'}>Doctors</NavLink>
                    <NavLink href="/gallery" isActive={pathname === '/gallery'}>Gallery</NavLink>
                    <NavLink href="/contact" isActive={pathname === '/contact'}>Contact</NavLink>
                </nav>

                {/* Actions */}
                <div className="header-actions">
                    {contact?.phone && (
                        <a href={`tel:${contact.phone}`} className="action-icon-btn" aria-label="Call Us" title={`Call: ${contact.phone}`}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                            </svg>
                        </a>
                    )}
                    {contact?.address && (
                        <a href={`https://maps.google.com/?q=${encodeURIComponent(contact.address)}`} className="action-icon-btn hidden-mobile" aria-label="Location" title={`Location: ${contact.address}`} target="_blank" rel="noopener noreferrer">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                                <circle cx="12" cy="10" r="3"></circle>
                            </svg>
                        </a>
                    )}

                    {/* Login Dropdown */}
                    <div className="login-dropdown hidden-mobile">
                        <button className="login-dropdown-btn">
                            Login
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M6 9l6 6 6-6" />
                            </svg>
                        </button>
                        <div className="login-dropdown-menu">
                            <NavLink href="/patient-portal">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                    <circle cx="12" cy="7" r="4"></circle>
                                </svg>
                                Patient Login
                            </NavLink>
                            <NavLink href="/admin/login">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
                                    <path d="M2 17l10 5 10-5"></path>
                                    <path d="M2 12l10 5 10-5"></path>
                                </svg>
                                Admin Login
                            </NavLink>
                        </div>
                    </div>

                    <Link href="/book-appointment" className="btn btn-primary btn-sm hidden-mobile" onClick={handleBookClick}>
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
                        <NavLink href="/">Home</NavLink>
                        <NavLink href="/about">About</NavLink>
                        <NavLink href="/doctors">Doctors</NavLink>
                        <NavLink href="/gallery">Gallery</NavLink>
                        <NavLink href="/contact">Contact</NavLink>
                        <div style={{ borderTop: '1px solid var(--color-border)', marginTop: 'var(--space-2)', paddingTop: 'var(--space-2)' }}>
                            <NavLink href="/patient-portal">Patient Login</NavLink>
                            <NavLink href="/admin/login">Admin Login</NavLink>
                        </div>
                        <NavLink href="/book-appointment" className="mobile-cta">Book Appointment</NavLink>
                    </nav>
                </div>
            </div>
        </header>
    );
}
