'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLoader } from '@/context/LoaderContext';
import { Calendar } from '@/components/icons';

export default function FloatingBookButton() {
    const { showLoader } = useLoader();
    const pathname = usePathname();

    const handleClick = () => {
        showLoader(300);
    };

    // An internal staff tool has no use for a public "Book Appointment" FAB,
    // and it floats right over the dashboard's own bottom-right actions.
    if (pathname?.startsWith('/admin/dashboard')) return null;

    return (
        <Link 
            href="/book-appointment" 
            className="floating-book-btn" 
            aria-label="Book Appointment"
            onClick={handleClick}
        >
            <Calendar size={20} />
            <span>Book</span>
        </Link>
    );
}
