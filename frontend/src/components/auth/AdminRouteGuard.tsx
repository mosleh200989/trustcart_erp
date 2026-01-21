import { useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/contexts/AuthContext';

export default function AdminRouteGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isLoading, user, isAdminUser, refresh } = useAuth();
  const lastTokenRef = useRef<string | null>(null);
  const isRefreshingRef = useRef(false);

  useEffect(() => {
    if (!router.isReady) return;

    const path = router.pathname;
    const isAdminPath = path.startsWith('/admin');
    const isLogin = path === '/admin/login';

    if (!isAdminPath || isLogin) return;
    if (isLoading) return;

    const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;

    // If the token changed (e.g. just logged in), refresh the auth context first
    // so we don't redirect based on stale user/roles.
    if (token && lastTokenRef.current !== token && !isRefreshingRef.current) {
      lastTokenRef.current = token;
      isRefreshingRef.current = true;
      Promise.resolve(refresh()).finally(() => {
        isRefreshingRef.current = false;
      });
      return;
    }

    if (!token) {
      router.replace('/admin/login');
      return;
    }

    if (!user) {
      router.replace('/admin/login');
      return;
    }

    if (!isAdminUser) {
      router.replace('/');
    }
  }, [router, isLoading, user, isAdminUser, refresh]);

  return <>{children}</>;
}
