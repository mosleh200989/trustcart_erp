import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/contexts/AuthContext';

export default function AdminRouteGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isLoading, user, isAdminUser } = useAuth();

  useEffect(() => {
    if (!router.isReady) return;

    const path = router.pathname;
    const isAdminPath = path.startsWith('/admin');
    const isLogin = path === '/admin/login';

    if (!isAdminPath || isLogin) return;
    if (isLoading) return;

    const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
    if (!token || !user) {
      router.replace('/admin/login');
      return;
    }

    if (!isAdminUser) {
      router.replace('/');
    }
  }, [router, isLoading, user, isAdminUser]);

  return <>{children}</>;
}
