'use client';

import Link from 'next/link';
import { useLoader } from '@/context/LoaderContext';

export default function FloatingBookButton() {
    const { showLoader } = useLoader();

    const handleClick = () => {
        showLoader(300);
    };

    return (
        <Link 
            href="/book-appointment" 
            className="floating-book-btn" 
            aria-label="Book Appointment"
            onClick={handleClick}
        >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span>Book</span>
        </Link>
    );
}
