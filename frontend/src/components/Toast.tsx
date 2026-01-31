import React, { useEffect, useState } from 'react';
import { FaCheckCircle, FaExclamationCircle, FaInfoCircle, FaTimesCircle, FaTimes } from 'react-icons/fa';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastData {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

interface ToastProps {
  toast: ToastData;
  onClose: (id: string) => void;
}

const toastStyles: Record<ToastType, { bg: string; border: string; icon: React.ReactNode; iconColor: string }> = {
  success: {
    bg: 'bg-green-50',
    border: 'border-green-500',
    icon: <FaCheckCircle className="w-5 h-5" />,
    iconColor: 'text-green-500',
  },
  error: {
    bg: 'bg-red-50',
    border: 'border-red-500',
    icon: <FaTimesCircle className="w-5 h-5" />,
    iconColor: 'text-red-500',
  },
  warning: {
    bg: 'bg-amber-50',
    border: 'border-amber-500',
    icon: <FaExclamationCircle className="w-5 h-5" />,
    iconColor: 'text-amber-500',
  },
  info: {
    bg: 'bg-blue-50',
    border: 'border-blue-500',
    icon: <FaInfoCircle className="w-5 h-5" />,
    iconColor: 'text-blue-500',
  },
};

const Toast: React.FC<ToastProps> = ({ toast, onClose }) => {
  const [isExiting, setIsExiting] = useState(false);
  const style = toastStyles[toast.type];

  useEffect(() => {
    const duration = toast.duration || 4000;
    const exitTimer = setTimeout(() => {
      setIsExiting(true);
    }, duration - 300);

    const closeTimer = setTimeout(() => {
      onClose(toast.id);
    }, duration);

    return () => {
      clearTimeout(exitTimer);
      clearTimeout(closeTimer);
    };
  }, [toast, onClose]);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => onClose(toast.id), 300);
  };

  return (
    <div
      className={`
        flex items-start gap-3 p-4 rounded-lg shadow-lg border-l-4
        ${style.bg} ${style.border}
        transform transition-all duration-300 ease-out
        ${isExiting ? 'opacity-0 translate-x-full' : 'opacity-100 translate-x-0'}
        min-w-[320px] max-w-[420px]
      `}
      role="alert"
    >
      <span className={`flex-shrink-0 mt-0.5 ${style.iconColor}`}>
        {style.icon}
      </span>
      <p className="flex-1 text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
        {toast.message}
      </p>
      <button
        onClick={handleClose}
        className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors p-1 -mt-1 -mr-1"
        aria-label="Close notification"
      >
        <FaTimes className="w-4 h-4" />
      </button>
    </div>
  );
};

export default Toast;
