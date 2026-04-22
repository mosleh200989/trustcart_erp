import React, { useEffect } from 'react';
import type { AppProps } from 'next/app';
import { useRouter } from 'next/router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@/styles/globals.css';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { ToastProvider } from '@/contexts/ToastContext';
import { CartProvider } from '@/contexts/CartContext';
import AdminRouteGuard from '@/components/auth/AdminRouteGuard';
import MobileBottomNav from '@/components/MobileBottomNav';
import { isAuthPath, setAuthReturnPath } from '@/utils/authReturnPath';
import { initDataLayer, trackPageView } from '@/utils/gtm';
import { initHerbolinPixel, isHerbolinHost, trackHerbolinPageView } from '@/utils/herbolinPixel';

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

/** Re-init FB Pixel with Advanced Matching when user logs in */
function FacebookAdvancedMatching() {
  const { user } = useAuth();

  useEffect(() => {
    if (typeof window === 'undefined' || !window.fbq) return;
    if (!user) return;

    const userData: Record<string, string> = {};
    if (user.email) userData.em = user.email;
    if (user.phone) userData.ph = user.phone.replace(/[^0-9]/g, '');

    if (Object.keys(userData).length > 0) {
      window.fbq('init', '1882443545705830', userData);
    }
  }, [user]);

  return null;
}

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter();

  // Initialize GTM dataLayer and track page views
  useEffect(() => {
    // Initialize dataLayer on app load
    initDataLayer();
    initHerbolinPixel();
    
    // Track initial page view
    trackPageView(window.location.pathname);
    trackHerbolinPageView();
  }, []);

  // Track route changes for SPA navigation
  useEffect(() => {
    const handleRouteChange = (url: string) => {
      trackPageView(url);
      trackHerbolinPageView();
      // Track generic FB pixel pageviews only on non-Herbolin hosts
      if (typeof window !== 'undefined' && window.fbq && !isHerbolinHost()) {
        window.fbq('track', 'PageView');
      }
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
            <FacebookAdvancedMatching />
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
              <MobileBottomNav />
            </AdminRouteGuard>
          </ToastProvider>
        </CartProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
