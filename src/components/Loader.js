'use client';

import { useLoader } from '@/context/LoaderContext';

export default function Loader() {
    const { isLoading } = useLoader();

    return (
        <>

            <div
                id="loader-wrapper"
                style={{
                    // Always show loader by default - hide only when explicitly told to hide
                    opacity: isLoading ? 1 : 0,
                    visibility: isLoading ? 'visible' : 'hidden',
                    pointerEvents: isLoading ? 'auto' : 'none',
                }}
                role="alert"
                aria-busy="true"
                aria-live="assertive"
            >
                <svg className="ekg-line" viewBox="0 0 500 200" xmlns="http://www.w3.org/2000/svg">
                    <polyline points="0,100 120,100 140,80 160,120 190,20 230,180 260,80 280,110 300,100 500,100" />
                </svg>
                <div className="loading-text"></div>
            </div>
        </>
    );
}
