'use client';

import {
  useState,
  useEffect,
  createContext,
  useContext,
  useCallback,
  ReactNode,
} from 'react';
import { clsx } from 'clsx';

// ============================================================================
// Types
// ============================================================================

export type ToastType = 'success' | 'error' | 'warning' | 'info';
export type ToastPosition =
  | 'top-right'
  | 'top-left'
  | 'bottom-right'
  | 'bottom-left'
  | 'top-center'
  | 'bottom-center';

interface Toast {
  id: string;
  type: ToastType;
  message: string;
  title?: string;
  duration?: number;
}

interface ToastContextValue {
  /** Add a toast notification */
  addToast: (type: ToastType, message: string, options?: ToastOptions) => string;
  /** Remove a toast by ID */
  removeToast: (id: string) => void;
  /** Shorthand for success toast */
  success: (message: string, options?: ToastOptions) => string;
  /** Shorthand for error toast */
  error: (message: string, options?: ToastOptions) => string;
  /** Shorthand for warning toast */
  warning: (message: string, options?: ToastOptions) => string;
  /** Shorthand for info toast */
  info: (message: string, options?: ToastOptions) => string;
}

interface ToastOptions {
  /** Optional title above the message */
  title?: string;
  /** Duration in ms before auto-dismiss. Set to 0 for persistent toast. */
  duration?: number;
}

// ============================================================================
// Icons
// ============================================================================

const CheckCircleIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" strokeLinecap="round" strokeLinejoin="round" />
    <path d="m9 11 3 3L22 4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const XCircleIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <circle cx="12" cy="12" r="10" />
    <path d="m15 9-6 6M9 9l6 6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const AlertCircleIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <circle cx="12" cy="12" r="10" />
    <path d="M12 8v4M12 16h.01" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const InfoIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <circle cx="12" cy="12" r="10" />
    <path d="M12 16v-4M12 8h.01" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const CloseIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// ============================================================================
// Context
// ============================================================================

const ToastContext = createContext<ToastContextValue | null>(null);

/**
 * Hook to access toast notifications.
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const toast = useToast();
 *
 *   const handleSuccess = () => {
 *     toast.success('Item saved successfully!');
 *   };
 *
 *   const handleError = () => {
 *     toast.error('Failed to save item.', { title: 'Error' });
 *   };
 * }
 * ```
 */
export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
}

// ============================================================================
// Provider
// ============================================================================

export interface ToastProviderProps {
  children: ReactNode;
  /** Position of the toast container */
  position?: ToastPosition;
  /** Default duration for toasts in ms */
  defaultDuration?: number;
  /** Maximum number of toasts visible at once */
  maxToasts?: number;
}

/**
 * Provider component for toast notifications.
 * Wrap your app (or layout) with this provider to enable toasts.
 *
 * @example
 * ```tsx
 * <ToastProvider position="top-right" defaultDuration={5000}>
 *   <App />
 * </ToastProvider>
 * ```
 */
export function ToastProvider({
  children,
  position = 'bottom-right',
  defaultDuration = 5000,
  maxToasts = 5,
}: ToastProviderProps) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback(
    (type: ToastType, message: string, options?: ToastOptions): string => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const newToast: Toast = {
        id,
        type,
        message,
        title: options?.title,
        duration: options?.duration ?? defaultDuration,
      };

      setToasts((prev) => {
        const updated = [...prev, newToast];
        // Limit the number of visible toasts
        return updated.slice(-maxToasts);
      });

      return id;
    },
    [defaultDuration, maxToasts]
  );

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Shorthand methods
  const success = useCallback(
    (message: string, options?: ToastOptions) => addToast('success', message, options),
    [addToast]
  );
  const error = useCallback(
    (message: string, options?: ToastOptions) => addToast('error', message, options),
    [addToast]
  );
  const warning = useCallback(
    (message: string, options?: ToastOptions) => addToast('warning', message, options),
    [addToast]
  );
  const info = useCallback(
    (message: string, options?: ToastOptions) => addToast('info', message, options),
    [addToast]
  );

  return (
    <ToastContext.Provider value={{ addToast, removeToast, success, error, warning, info }}>
      {children}
      <ToastContainer toasts={toasts} position={position} onRemove={removeToast} />
    </ToastContext.Provider>
  );
}

// ============================================================================
// Container
// ============================================================================

interface ToastContainerProps {
  toasts: Toast[];
  position: ToastPosition;
  onRemove: (id: string) => void;
}

const positionClasses: Record<ToastPosition, string> = {
  'top-right': 'top-4 right-4',
  'top-left': 'top-4 left-4',
  'bottom-right': 'bottom-4 right-4',
  'bottom-left': 'bottom-4 left-4',
  'top-center': 'top-4 left-1/2 -translate-x-1/2',
  'bottom-center': 'bottom-4 left-1/2 -translate-x-1/2',
};

function ToastContainer({ toasts, position, onRemove }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  const isTop = position.startsWith('top');

  return (
    <div
      className={clsx(
        'fixed z-[100] flex flex-col gap-2 max-w-sm w-full pointer-events-none',
        positionClasses[position],
        isTop ? 'flex-col' : 'flex-col-reverse'
      )}
      role="region"
      aria-label="Notifications"
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={onRemove} position={position} />
      ))}
    </div>
  );
}

// ============================================================================
// Toast Item
// ============================================================================

interface ToastItemProps {
  toast: Toast;
  position: ToastPosition;
  onRemove: (id: string) => void;
}

const typeConfig = {
  success: {
    icon: CheckCircleIcon,
    iconClass: 'text-aurora-green',
    borderClass: 'border-aurora-green/30',
  },
  error: {
    icon: XCircleIcon,
    iconClass: 'text-aurora-red',
    borderClass: 'border-aurora-red/30',
  },
  warning: {
    icon: AlertCircleIcon,
    iconClass: 'text-aurora-yellow',
    borderClass: 'border-aurora-yellow/30',
  },
  info: {
    icon: InfoIcon,
    iconClass: 'text-frost-ice',
    borderClass: 'border-frost-ice/30',
  },
};

function ToastItem({ toast, position, onRemove }: ToastItemProps) {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    if (toast.duration && toast.duration > 0) {
      const timer = setTimeout(() => {
        setIsExiting(true);
        setTimeout(() => onRemove(toast.id), 200);
      }, toast.duration);
      return () => clearTimeout(timer);
    }
  }, [toast, onRemove]);

  const handleDismiss = () => {
    setIsExiting(true);
    setTimeout(() => onRemove(toast.id), 200);
  };

  const config = typeConfig[toast.type];
  const Icon = config.icon;

  // Animation direction based on position
  const isRight = position.includes('right');
  const enterClass = isRight ? 'translate-x-0' : '-translate-x-0';
  const exitClass = isRight ? 'translate-x-full' : '-translate-x-full';

  return (
    <div
      role="alert"
      className={clsx(
        'pointer-events-auto flex items-start gap-3 p-4 rounded-lg shadow-lg border',
        'bg-snow-white',
        config.borderClass,
        'transition-all duration-200',
        isExiting ? clsx('opacity-0', exitClass) : clsx('opacity-100', enterClass)
      )}
    >
      <Icon className={clsx('w-5 h-5 flex-shrink-0', config.iconClass)} />
      <div className="flex-1 min-w-0">
        {toast.title && (
          <p className="font-medium text-polar-night text-sm">{toast.title}</p>
        )}
        <p className={clsx('text-sm leading-snug', toast.title ? 'text-text-secondary' : 'text-polar-night')}>
          {toast.message}
        </p>
      </div>
      <button
        onClick={handleDismiss}
        className="p-1 -m-1 hover:bg-polar-night/5 rounded transition-colors flex-shrink-0"
        aria-label="Dismiss notification"
      >
        <CloseIcon className="w-4 h-4 text-text-muted" />
      </button>
    </div>
  );
}
