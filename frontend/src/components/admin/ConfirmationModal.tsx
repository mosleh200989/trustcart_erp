import React from 'react';
import { FaTrash, FaExclamationTriangle, FaCheckCircle, FaInfoCircle, FaQuestionCircle, FaTimes } from 'react-icons/fa';

export type ConfirmationType = 'delete' | 'warning' | 'success' | 'info' | 'confirm';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string | React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  type?: ConfirmationType;
  loading?: boolean;
  subMessage?: string;
  warningMessage?: string;
}

const typeConfig = {
  delete: {
    icon: FaTrash,
    gradient: 'from-red-500 to-red-600',
    hoverGradient: 'hover:from-red-600 hover:to-red-700',
    iconBg: 'bg-white bg-opacity-20',
    confirmBtn: 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700',
    defaultConfirmText: 'Delete',
    warningBg: 'bg-amber-50 border-amber-200',
    warningText: 'text-amber-800',
    warningIcon: '⚠️',
  },
  warning: {
    icon: FaExclamationTriangle,
    gradient: 'from-amber-500 to-orange-500',
    hoverGradient: 'hover:from-amber-600 hover:to-orange-600',
    iconBg: 'bg-white bg-opacity-20',
    confirmBtn: 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600',
    defaultConfirmText: 'Proceed',
    warningBg: 'bg-amber-50 border-amber-200',
    warningText: 'text-amber-800',
    warningIcon: '⚠️',
  },
  success: {
    icon: FaCheckCircle,
    gradient: 'from-green-500 to-emerald-500',
    hoverGradient: 'hover:from-green-600 hover:to-emerald-600',
    iconBg: 'bg-white bg-opacity-20',
    confirmBtn: 'bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600',
    defaultConfirmText: 'Confirm',
    warningBg: 'bg-green-50 border-green-200',
    warningText: 'text-green-800',
    warningIcon: '✓',
  },
  info: {
    icon: FaInfoCircle,
    gradient: 'from-blue-500 to-indigo-500',
    hoverGradient: 'hover:from-blue-600 hover:to-indigo-600',
    iconBg: 'bg-white bg-opacity-20',
    confirmBtn: 'bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600',
    defaultConfirmText: 'OK',
    warningBg: 'bg-blue-50 border-blue-200',
    warningText: 'text-blue-800',
    warningIcon: 'ℹ️',
  },
  confirm: {
    icon: FaQuestionCircle,
    gradient: 'from-purple-500 to-violet-500',
    hoverGradient: 'hover:from-purple-600 hover:to-violet-600',
    iconBg: 'bg-white bg-opacity-20',
    confirmBtn: 'bg-gradient-to-r from-purple-500 to-violet-500 hover:from-purple-600 hover:to-violet-600',
    defaultConfirmText: 'Confirm',
    warningBg: 'bg-purple-50 border-purple-200',
    warningText: 'text-purple-800',
    warningIcon: '❓',
  },
};

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText,
  cancelText = 'Cancel',
  type = 'confirm',
  loading = false,
  subMessage,
  warningMessage,
}) => {
  if (!isOpen) return null;

  const config = typeConfig[type];
  const IconComponent = config.icon;
  const finalConfirmText = confirmText || config.defaultConfirmText;

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && !loading) {
      onClose();
    }
  };

  // Handle escape key
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) {
        onClose();
      }
    };
    
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, loading, onClose]);

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-in fade-in duration-150"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header with icon */}
        <div className={`bg-gradient-to-r ${config.gradient} p-6 text-center relative`}>
          {/* Close button */}
          <button
            onClick={onClose}
            disabled={loading}
            className="absolute top-3 right-3 text-white/70 hover:text-white transition-colors disabled:opacity-50"
            aria-label="Close"
          >
            <FaTimes size={16} />
          </button>
          
          <div className={`w-16 h-16 ${config.iconBg} rounded-full flex items-center justify-center mx-auto mb-3`}>
            <IconComponent className="text-white text-2xl" />
          </div>
          <h3 className="text-xl font-bold text-white">{title}</h3>
        </div>
        
        {/* Content */}
        <div className="p-6">
          <div className="text-center mb-6">
            {typeof message === 'string' ? (
              <p className="text-gray-600">{message}</p>
            ) : (
              message
            )}
            {subMessage && (
              <p className="text-sm text-gray-500 mt-2">{subMessage}</p>
            )}
          </div>
          
          {/* Warning/Info Banner */}
          {warningMessage && (
            <div className={`${config.warningBg} border rounded-lg p-4 mb-6`}>
              <p className={`${config.warningText} text-sm flex items-start gap-2`}>
                <span className="mt-0.5">{config.warningIcon}</span>
                <span>{warningMessage}</span>
              </p>
            </div>
          )}
          
          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium disabled:opacity-50"
            >
              {cancelText}
            </button>
            <button
              onClick={onConfirm}
              disabled={loading}
              className={`flex-1 px-4 py-3 ${config.confirmBtn} text-white rounded-lg transition-all font-medium disabled:opacity-50 flex items-center justify-center gap-2`}
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Processing...
                </>
              ) : (
                <>
                  <IconComponent className="text-sm" />
                  {finalConfirmText}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;

// Hook for easier usage
export const useConfirmation = () => {
  const [state, setState] = React.useState<{
    isOpen: boolean;
    config: Omit<ConfirmationModalProps, 'isOpen' | 'onClose' | 'onConfirm'> & {
      onConfirm?: () => void | Promise<void>;
    };
  }>({
    isOpen: false,
    config: {
      title: '',
      message: '',
    },
  });
  
  const [loading, setLoading] = React.useState(false);

  const confirm = React.useCallback((
    config: Omit<ConfirmationModalProps, 'isOpen' | 'onClose' | 'onConfirm' | 'loading'> & {
      onConfirm?: () => void | Promise<void>;
    }
  ) => {
    setState({
      isOpen: true,
      config,
    });
  }, []);

  const close = React.useCallback(() => {
    setState(prev => ({ ...prev, isOpen: false }));
    setLoading(false);
  }, []);

  const handleConfirm = React.useCallback(async () => {
    if (state.config.onConfirm) {
      setLoading(true);
      try {
        await state.config.onConfirm();
        close();
      } catch (error) {
        setLoading(false);
        throw error;
      }
    } else {
      close();
    }
  }, [state.config, close]);

  const ConfirmationDialog = React.useCallback(() => (
    <ConfirmationModal
      isOpen={state.isOpen}
      onClose={close}
      onConfirm={handleConfirm}
      loading={loading}
      {...state.config}
    />
  ), [state.isOpen, state.config, loading, close, handleConfirm]);

  return {
    confirm,
    close,
    ConfirmationDialog,
    isOpen: state.isOpen,
  };
};
