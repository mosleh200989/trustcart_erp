import React, { useEffect } from 'react';
import type { AppProps } from 'next/app';
import { useRouter } from 'next/router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@/styles/globals.css';
import { AuthProvider } from '@/contexts/AuthContext';
import { ToastProvider } from '@/contexts/ToastContext';
import { CartProvider } from '@/contexts/CartContext';
import AdminRouteGuard from '@/components/auth/AdminRouteGuard';
import MobileBottomNav from '@/components/MobileBottomNav';
import FloatingCartButton from '@/components/FloatingCartButton';
import { isAuthPath, setAuthReturnPath } from '@/utils/authReturnPath';
import { initDataLayer, trackPageView } from '@/utils/gtm';
import { initDhakaTimezoneDefaults } from '@/utils/dhakaDate';
import { trackMetaPageView } from '@/utils/metaPageView';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,     // 5 minutes
      gcTime: 10 * 60 * 1000,        // 10 minutes (formerly cacheTime)
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function trackLandingPageViewIfNeeded() {
  if (typeof window === 'undefined') return Promise.resolve();

  return import('@/utils/herbolinPixel').then((pixel) => {
    if (!pixel.isLandingPagePixelSurface()) return;
    const { initLandingPagePixel, trackLandingPagePageView } = pixel;
    initLandingPagePixel();
    trackLandingPagePageView();
  });
}

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter();

  // Initialize GTM dataLayer and track page views
  useEffect(() => {
    initDhakaTimezoneDefaults();
    // Initialize dataLayer on app load
    initDataLayer();
    
    // Track initial page view
    trackPageView(window.location.pathname);
    trackMetaPageView();
    trackLandingPageViewIfNeeded();
  }, []);

  // Track route changes for SPA navigation
  useEffect(() => {
    const handleRouteChange = (url: string) => {
      trackPageView(url);
      trackMetaPageView();
      trackLandingPageViewIfNeeded();
    };

    router.events.on('routeChangeComplete', handleRouteChange);
    return () => {
      router.events.off('routeChangeComplete', handleRouteChange);
    };
  }, [router.events]);

  useEffect(() => {
    const onRouteChangeStart = (url: string) => {
      if (typeof window === 'undefined') return;

      // When user is about to enter an auth page, remember where they came from.
      if (isAuthPath(url) && !isAuthPath(router.asPath)) {
        setAuthReturnPath(router.asPath);
      }
    };

    router.events.on('routeChangeStart', onRouteChangeStart);
    return () => {
      router.events.off('routeChangeStart', onRouteChangeStart);
    };
  }, [router]);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <CartProvider>
          <ToastProvider>
            <a
              href="#main-content"
              className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[9999] focus:bg-white focus:text-orange-600 focus:px-4 focus:py-2 focus:rounded focus:shadow-lg focus:font-semibold"
            >
              Skip to main content
            </a>
            <AdminRouteGuard>
              <main id="main-content">
                <Component {...pageProps} />
              </main>
              <FloatingCartButton />
              <MobileBottomNav />
            </AdminRouteGuard>
          </ToastProvider>
        </CartProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
