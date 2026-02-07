import React, { useEffect } from 'react';
import type { AppProps } from 'next/app';
import { useRouter } from 'next/router';
import '@/styles/globals.css';
import { AuthProvider } from '@/contexts/AuthContext';
import { ToastProvider } from '@/contexts/ToastContext';
import AdminRouteGuard from '@/components/auth/AdminRouteGuard';
import { isAuthPath, setAuthReturnPath } from '@/utils/authReturnPath';
import { initDataLayer, trackPageView } from '@/utils/gtm';

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter();

  // Initialize GTM dataLayer and track page views
  useEffect(() => {
    // Initialize dataLayer on app load
    initDataLayer();
    
    // Track initial page view
    trackPageView(window.location.pathname);
  }, []);

  // Track route changes for SPA navigation
  useEffect(() => {
    const handleRouteChange = (url: string) => {
      trackPageView(url);
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
    <AuthProvider>
      <ToastProvider>
        <AdminRouteGuard>
          <Component {...pageProps} />
        </AdminRouteGuard>
      </ToastProvider>
    </AuthProvider>
  );
}
