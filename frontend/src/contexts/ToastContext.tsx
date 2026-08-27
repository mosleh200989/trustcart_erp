import React, { createContext, useContext, useState, useCallback, useMemo, ReactNode } from 'react';
import Toast, { ToastData, ToastType } from '@/components/Toast';

interface ToastContextType {
  showToast: (message: string, type?: ToastType, duration?: number) => void;
  success: (message: string, duration?: number) => void;
  error: (message: string, duration?: number) => void;
  warning: (message: string, duration?: number) => void;
  info: (message: string, duration?: number) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

let toastIdCounter = 0;

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((message: string, type: ToastType = 'info', duration?: number) => {
    const id = `toast-${++toastIdCounter}-${Date.now()}`;
    const newToast: ToastData = { id, message, type, duration };
    setToasts((prev) => [...prev, newToast]);
  }, []);

  const success = useCallback((message: string, duration?: number) => {
    showToast(message, 'success', duration);
  }, [showToast]);

  const error = useCallback((message: string, duration?: number) => {
    showToast(message, 'error', duration);
  }, [showToast]);

  const warning = useCallback((message: string, duration?: number) => {
    showToast(message, 'warning', duration);
  }, [showToast]);

  const info = useCallback((message: string, duration?: number) => {
    showToast(message, 'info', duration);
  }, [showToast]);

  // Memoised: showing a toast calls setToasts, which re-renders this provider.
  // An inline object literal here would hand every consumer a new `toast`
  // identity on each toast, so any `useCallback(..., [toast])` would be
  // recreated and any `useEffect` depending on it would re-fire — a component
  // that toasts on a failed request then re-requests in an unbounded loop.
  // The five functions below are already useCallback-stable, so this value
  // never needs to change.
  const value = useMemo<ToastContextType>(
    () => ({ showToast, success, error, warning, info }),
    [showToast, success, error, warning, info],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/* Toast Container - rendered directly without portal */}
      <div 
        id="toast-container"
        style={{
          position: 'fixed',
          top: '80px',
          right: '16px',
          zIndex: 2147483647,
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          pointerEvents: 'none'
        }}
        aria-live="polite"
        aria-atomic="true"
      >
        {toasts.map((t) => (
          <div key={t.id} style={{ pointerEvents: 'auto' }}>
            <Toast toast={t} onClose={removeToast} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextType => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export default ToastContext;
