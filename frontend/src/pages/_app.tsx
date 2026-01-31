import React, { useEffect } from 'react';
import type { AppProps } from 'next/app';
import { useRouter } from 'next/router';
import '@/styles/globals.css';
import { AuthProvider } from '@/contexts/AuthContext';
import { ToastProvider } from '@/contexts/ToastContext';
import AdminRouteGuard from '@/components/auth/AdminRouteGuard';
import { isAuthPath, setAuthReturnPath } from '@/utils/authReturnPath';

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter();

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
