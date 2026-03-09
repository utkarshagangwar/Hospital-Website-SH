import { useLoader } from '@/context/LoaderContext';

// Default timeout for requests (in ms)
const DEFAULT_TIMEOUT = 30000;

/**
 * Create a fetch wrapper that shows loader during the request
 * This can be used directly or with the useLoader hook
 * 
 * @param {Function} showLoader - Function to show the loader
 * @param {Function} hideLoader - Function to hide the loader
 * @param {Object} options - Configuration options
 * @param {number} options.timeout - Request timeout in ms (default: 30000)
 * @param {number} options.minDuration - Minimum loader display duration in ms (default: 300)
 * @param {boolean} options.showLoaderOnError - Show loader even on error (default: true)
 * @returns {Function} - Wrapped fetch function
 */
export function createLoaderFetch(showLoader, hideLoader, options = {}) {
    const {
        timeout = DEFAULT_TIMEOUT,
        minDuration = 300,
        showLoaderOnError = true
    } = options;

    return async function loaderFetch(url, fetchOptions = {}) {
        // Show loader before making request
        showLoader(minDuration);

        try {
            // Create abort controller for timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeout);

            const response = await fetch(url, {
                ...fetchOptions,
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            // Parse response
            const data = await response.json();

            // Hide loader after getting response
            hideLoader();

            return {
                ok: response.ok,
                status: response.status,
                data,
                error: response.ok ? null : (data.message || 'Request failed')
            };

        } catch (error) {
            // Handle different error types
            let errorMessage = 'An unexpected error occurred';

            if (error.name === 'AbortError') {
                errorMessage = `Request timed out after ${timeout}ms`;
            } else if (error.message) {
                errorMessage = error.message;
            }

            // Show loader briefly even on error so user knows something happened
            if (showLoaderOnError) {
                // Short delay to show the error state
                setTimeout(() => hideLoader(), 500);
            } else {
                hideLoader();
            }

            return {
                ok: false,
                status: 0,
                data: null,
                error: errorMessage
            };
        }
    };
}

/**
 * Custom hook that provides a fetch function with automatic loader management
 * Usage: const { fetchWithLoader } = useLoaderFetch();
 *        const result = await fetchWithLoader('/api/data');
 */
export function useLoaderFetch() {
    const { showLoader, hideLoader } = useLoader();

    const fetchWithLoader = async (url, options = {}) => {
        const loaderFetch = createLoaderFetch(showLoader, hideLoader, options);
        return loaderFetch(url, options);
    };

    return { fetchWithLoader };
}

/**
 * Higher-order function to wrap a component's fetch calls with loader
 * Usage: const enhancedComponent = withLoaderFetch(Component);
 */
export function withLoaderFetch(Component) {
    return function EnhancedComponent(props) {
        const { showLoader, hideLoader } = useLoader();

        const fetchWithLoader = createLoaderFetch(showLoader, hideLoader);

        return <Component {...props} fetchWithLoader={fetchWithLoader} />;
    };
}

export default { createLoaderFetch, useLoaderFetch, withLoaderFetch };
