'use client';

import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';

const LoaderContext = createContext(null);

// Default minimum duration to show loader (in ms) - ensures animation is visible
const DEFAULT_MIN_DURATION = 400;
// Maximum time to show loader before auto-hiding (fallback for edge cases)
const MAX_LOADER_TIME = 15000;

export function LoaderProvider({ children }) {
    const [isLoading, setIsLoading] = useState(true); // Start with loader visible for initial load
    const [minimumDuration, setMinimumDuration] = useState(DEFAULT_MIN_DURATION);
    const timeoutRef = useRef(null);
    const maxTimeoutRef = useRef(null);

    // Fallback: auto-hide loader after maximum time to prevent infinite loader
    useEffect(() => {
        if (isLoading) {
            maxTimeoutRef.current = setTimeout(() => {
                console.warn('Loader auto-hidden after maximum timeout');
                setIsLoading(false);
            }, MAX_LOADER_TIME);
        } else {
            if (maxTimeoutRef.current) {
                clearTimeout(maxTimeoutRef.current);
            }
        }
        
        return () => {
            if (maxTimeoutRef.current) {
                clearTimeout(maxTimeoutRef.current);
            }
        };
    }, [isLoading]);

    // Show loader with optional minimum duration
    const showLoader = useCallback((minDuration = DEFAULT_MIN_DURATION) => {
        // Clear any existing timeout
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
        
        setMinimumDuration(minDuration);
        setIsLoading(true);
    }, []);

    // Hide loader (respects minimum duration)
    const hideLoader = useCallback((immediate = false) => {
        if (immediate) {
            // Clear any existing timeout
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
            setIsLoading(false);
        } else {
            // Wait for minimum duration before hiding
            timeoutRef.current = setTimeout(() => {
                setIsLoading(false);
            }, minimumDuration);
        }
    }, [minimumDuration]);

    // For initial page load - call this once when window loads
    const initLoader = useCallback(() => {
        showLoader(500); // Show for at least 500ms for initial load
    }, [showLoader]);

    return (
        <LoaderContext.Provider value={{ 
            isLoading, 
            showLoader, 
            hideLoader, 
            initLoader,
            minimumDuration 
        }}>
            {children}
        </LoaderContext.Provider>
    );
}

// Custom hook to use the loader context
export function useLoader() {
    const context = useContext(LoaderContext);
    if (!context) {
        // Return default values if used outside provider
        // Default to isLoading: true to prevent flash during initial render
        return {
            isLoading: true,
            showLoader: () => { },
            hideLoader: () => { },
            initLoader: () => { },
            minimumDuration: DEFAULT_MIN_DURATION
        };
    }
    return context;
}

export default LoaderContext;
