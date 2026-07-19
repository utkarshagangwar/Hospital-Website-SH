'use client';

import { useLoader } from '@/context/LoaderContext';

export default function Loader() {
    const { isLoading } = useLoader();

    return (
        <div
            id="loader-wrapper"
            className={!isLoading ? 'loader-hidden' : ''}
            role="alert"
            aria-busy="true"
            aria-live="assertive"
        >
            <div className="loader-pulse-wrap">
                <div className="loader-pulse-glow" />
                <svg viewBox="0 0 176 68" width="176" height="68">
                    <defs>
                        <linearGradient id="loaderEmberGrad" x1="0" y1="0" x2="1" y2="0">
                            <stop offset="0%" stopColor="#B8551F" />
                            <stop offset="50%" stopColor="#E8703A" />
                            <stop offset="100%" stopColor="#F2934F" />
                        </linearGradient>
                    </defs>
                    <path className="loader-pulse-track" d="M2 34h32l8-22l11 44l10-32l6 13h16l8-16l6 16h75" />
                    <path className="loader-pulse-line" d="M2 34h32l8-22l11 44l10-32l6 13h16l8-16l6 16h75" />
                </svg>
            </div>
            <div className="loader-wordmark">Shivaji<span>Hospital</span></div>
        </div>
    );
}
