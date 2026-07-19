'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useRouter } from 'next/navigation';
import { useLoader } from '@/context/LoaderContext';
import { Phone, MapPin, ChevronDown, UserCircle, ShieldCheck, Menu, Close } from '@/components/icons';

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

// Mirrors the session check in admin/dashboard/page.js (adminAuth + authToken
// present, and the 24h sessionExpiresAt ceiling not yet passed). Kept as a
// standalone helper -- rather than a shared context -- since it's read-only
// here and the dashboard already owns writing/clearing these keys.
function hasValidAdminSession() {
    if (typeof window === 'undefined') return false;
    const auth = localStorage.getItem('adminAuth');
    const token = localStorage.getItem('authToken');
    const sessionExpiresAt = parseInt(localStorage.getItem('sessionExpiresAt') || '0', 10);
    return auth === 'true' && !!token && !!sessionExpiresAt && Date.now() < sessionExpiresAt;
}

export default function Header() {
    const [isScrolled, setIsScrolled] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [contact, setContact] = useState(null);
    // Defaults false to match SSR markup (no localStorage on the server);
    // flips true right after mount if a valid admin session is found.
    const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
    const pathname = usePathname();
    const { showLoader } = useLoader();

    useEffect(() => {
        // Re-check on every client-side route change so logging in (which
        // redirects to /admin/dashboard) or the 24h session lapsing while
        // browsing is reflected without needing a full page reload.
        setIsAdminLoggedIn(hasValidAdminSession());
    }, [pathname]);

    useEffect(() => {
        // Catch login/logout happening in another tab, and the session
        // expiring while this tab is idle in the background.
        const recheck = () => setIsAdminLoggedIn(hasValidAdminSession());
        window.addEventListener('storage', recheck);
        window.addEventListener('focus', recheck);
        return () => {
            window.removeEventListener('storage', recheck);
            window.removeEventListener('focus', recheck);
        };
    }, []);

    useEffect(() => {
        fetch('/api/admin/settings')
            .then(res => {
                if (!res.ok) return null;
                return res.json();
            })
            .then(json => {
                if (json && json.success && json.data && json.data.contact) {
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

    // The admin dashboard is a self-contained app shell with its own fixed
    // sidebar/top bar (pinned to the viewport) — the marketing header would
    // either double up with it or, since it isn't fixed, silently break the
    // dashboard's own hardcoded offsets the moment the page scrolls. This
    // check must come after all hooks above so hook order never changes.
    if (pathname?.startsWith('/admin/dashboard')) return null;

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
                            <Phone size={19} />
                        </a>
                    )}
                    {contact?.address && (
                        <a href={`https://maps.google.com/?q=${encodeURIComponent(contact.address)}`} className="action-icon-btn hidden-mobile" aria-label="Location" title={`Location: ${contact.address}`} target="_blank" rel="noopener noreferrer">
                            <MapPin size={19} />
                        </a>
                    )}

                    {/* Login Dropdown */}
                    <div className="login-dropdown hidden-mobile">
                        <button className="login-dropdown-btn">
                            Login
                            <ChevronDown size={15} />
                        </button>
                        <div className="login-dropdown-menu">
                            <NavLink href="/patient-portal">
                                <UserCircle size={17} />
                                Patient Login
                            </NavLink>
                            <NavLink href={isAdminLoggedIn ? '/admin/dashboard' : '/admin/login'}>
                                <ShieldCheck size={17} />
                                {isAdminLoggedIn ? 'Dashboard' : 'Admin Login'}
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
                        {isMobileMenuOpen ? <Close size={22} /> : <Menu size={22} />}
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
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', borderTop: '1px solid var(--color-border)', marginTop: 'var(--space-2)', paddingTop: 'var(--space-3)' }}>
                            <NavLink href="/patient-portal">Patient Login</NavLink>
                            <NavLink href={isAdminLoggedIn ? '/admin/dashboard' : '/admin/login'}>
                                {isAdminLoggedIn ? 'Dashboard' : 'Admin Login'}
                            </NavLink>
                        </div>
                        <NavLink href="/book-appointment" className="mobile-cta">Book Appointment</NavLink>
                    </nav>
                </div>
            </div>
        </header>
    );
}
