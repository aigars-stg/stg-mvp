'use client';

import { useState, useEffect, createContext, useContext, useCallback, ReactNode } from 'react';
import { CheckCircle, AlertCircle, InfoCircle as Info, CloseCircle as XCircle, Close } from 'griddy-icons';
import { cn } from '@/lib/utils';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

interface ToastContextValue {
  addToast: (type: ToastType, message: string, duration?: number) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

/**
 * Hook to access toast notifications
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { addToast } = useToast();
 *
 *   const handleSuccess = () => {
 *     addToast('success', 'Item saved successfully!');
 *   };
 *
 *   const handleError = () => {
 *     addToast('error', 'Failed to save item. Please try again.');
 *   };
 * }
 * ```
 */
export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
}

interface ToastProviderProps {
  children: ReactNode;
}

/**
 * Provider component for toast notifications
 * Wrap your app (or layout) with this provider to enable toasts
 */
export function ToastProvider({ children }: ToastProviderProps) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((type: ToastType, message: string, duration = 5000) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    setToasts(prev => [...prev, { id, type, message, duration }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
}

interface ToastContainerProps {
  toasts: Toast[];
  onRemove: (id: string) => void;
}

function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed bottom-4 right-4 z-[100] space-y-2 max-w-sm"
      role="region"
      aria-label="Notifications"
    >
      {toasts.map(toast => (
        <ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
      ))}
    </div>
  );
}

interface ToastItemProps {
  toast: Toast;
  onRemove: (id: string) => void;
}

function ToastItem({ toast, onRemove }: ToastItemProps) {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    if (toast.duration && toast.duration > 0) {
      const timer = setTimeout(() => {
        setIsExiting(true);
        setTimeout(() => onRemove(toast.id), 200); // Allow exit animation
      }, toast.duration);
      return () => clearTimeout(timer);
    }
  }, [toast, onRemove]);

  const handleDismiss = () => {
    setIsExiting(true);
    setTimeout(() => onRemove(toast.id), 200);
  };

  const getTypeConfig = () => {
    switch (toast.type) {
      case 'success':
        return {
          icon: <CheckCircle className="w-5 h-5 text-northern-lights-green flex-shrink-0" />,
          bgColor: 'bg-northern-lights-green/10',
          borderColor: 'border-northern-lights-green/30',
        };
      case 'error':
        return {
          icon: <XCircle className="w-5 h-5 text-aurora-red flex-shrink-0" />,
          bgColor: 'bg-aurora-red/10',
          borderColor: 'border-aurora-red/30',
        };
      case 'warning':
        return {
          icon: <AlertCircle className="w-5 h-5 text-midnight-sun-yellow flex-shrink-0" />,
          bgColor: 'bg-midnight-sun-yellow/10',
          borderColor: 'border-midnight-sun-yellow/30',
        };
      case 'info':
      default:
        return {
          icon: <Info className="w-5 h-5 text-frost-ice flex-shrink-0" />,
          bgColor: 'bg-frost-ice/10',
          borderColor: 'border-frost-ice/30',
        };
    }
  };

  const config = getTypeConfig();

  return (
    <div
      role="alert"
      className={cn(
        'flex items-start gap-3 p-4 rounded-lg shadow-lg border',
        'bg-snow-white',
        config.borderColor,
        'transition-all duration-200',
        isExiting
          ? 'opacity-0 translate-x-4'
          : 'opacity-100 translate-x-0 animate-in slide-in-from-right-5'
      )}
    >
      {config.icon}
      <p className="flex-1 text-sm text-polar-night leading-snug">{toast.message}</p>
      <button
        onClick={handleDismiss}
        className="p-1 -m-1 hover:bg-polar-night/5 rounded transition-colors flex-shrink-0"
        aria-label="Dismiss notification"
      >
        <Close className="w-4 h-4 text-text-muted" />
      </button>
    </div>
  );
}
