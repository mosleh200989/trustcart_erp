import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import apiClient from '@/services/api';

export type AuthRole = { id: number; name: string; slug: string };
export type AuthPermission = { id: number; slug: string; name: string };

export type AuthUser = {
  id: string;
  type?: 'user' | 'customer' | string;
  email?: string | null;
  phone?: string | null;
  name?: string | null;
  roleId?: number | null;
  roleSlug?: string | null;
  primary_role_id?: number | null;
  teamId?: number | null;
  teamLeaderId?: number | null;
};

type AuthContextValue = {
  user: AuthUser | null;
  roles: AuthRole[];
  permissions: AuthPermission[];
  isLoading: boolean;
  refresh: () => Promise<void>;
  logout: () => void;
  hasPermission: (slug: string) => boolean;
  hasAnyPermission: (slugs: string[]) => boolean;
  hasAllPermissions: (slugs: string[]) => boolean;
  isAdminUser: boolean;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const ADMIN_ROLE_SLUGS = new Set([
  'super-admin',
  'admin',
  'sales-executive',
  'sales-team-leader',
  'inventory-manager',
  'purchase-manager',
  'accounts',
  'viewer',
  'hr-manager',
  'delivery-partner',
  'brand-manager',
  'recruiter',
]);

const NON_ADMIN_PORTAL_ROLE_SLUGS = new Set(['customer-account', 'supplier-account']);

function normalizeUserId(user: any): string {
  return String(user?.id ?? '');
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [roles, setRoles] = useState<AuthRole[]>([]);
  const [permissions, setPermissions] = useState<AuthPermission[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const logout = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('authToken');
      localStorage.removeItem('admin_token');
    }
    setUser(null);
    setRoles([]);
    setPermissions([]);
  }, []);

  const refresh = useCallback(async () => {
    if (typeof window === 'undefined') {
      setIsLoading(false);
      return;
    }

    const token = localStorage.getItem('authToken');
    if (!token) {
      setUser(null);
      setRoles([]);
      setPermissions([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const res = await apiClient.get('/auth/me');
      const data = res.data as any;

      const nextUser = data?.user ? ({ ...data.user, id: normalizeUserId(data.user) } as AuthUser) : null;
      setUser(nextUser);
      setRoles(Array.isArray(data?.roles) ? data.roles : []);
      setPermissions(Array.isArray(data?.permissions) ? data.permissions : []);
    } catch (err: any) {
      // Most common failure: expired/invalid token
      logout();
    } finally {
      setIsLoading(false);
    }
  }, [logout]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const permissionSet = useMemo(() => {
    return new Set((permissions || []).map((p) => p.slug));
  }, [permissions]);

  const hasPermission = useCallback(
    (slug: string) => {
      return permissionSet.has(slug);
    },
    [permissionSet],
  );

  const hasAnyPermission = useCallback(
    (slugs: string[]) => {
      if (!slugs || slugs.length === 0) return true;
      for (const s of slugs) {
        if (permissionSet.has(s)) return true;
      }
      return false;
    },
    [permissionSet],
  );

  const hasAllPermissions = useCallback(
    (slugs: string[]) => {
      if (!slugs || slugs.length === 0) return true;
      for (const s of slugs) {
        if (!permissionSet.has(s)) return false;
      }
      return true;
    },
    [permissionSet],
  );

  const isAdminUser = useMemo(() => {
    const roleSlugs = new Set(
      [...(roles || []).map((r) => r.slug), ...(user?.roleSlug ? [user.roleSlug] : [])].filter(Boolean),
    );

    // Primary rule: any authenticated backoffice/staff user can access the admin portal,
    // except explicitly customer/supplier portal accounts.
    const isStaffUser = user?.type === 'user';
    const isExcludedPortalRole = [...roleSlugs].some((slug) => NON_ADMIN_PORTAL_ROLE_SLUGS.has(slug));

    if (isStaffUser && !isExcludedPortalRole) return true;

    // Fallback allowlist for setups where `type` isn't present.
    for (const slug of roleSlugs) {
      if (ADMIN_ROLE_SLUGS.has(slug)) return true;
    }

    return false;
  }, [roles, user?.roleSlug]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      roles,
      permissions,
      isLoading,
      refresh,
      logout,
      hasPermission,
      hasAnyPermission,
      hasAllPermissions,
      isAdminUser,
    }),
    [
      user,
      roles,
      permissions,
      isLoading,
      refresh,
      logout,
      hasPermission,
      hasAnyPermission,
      hasAllPermissions,
      isAdminUser,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
