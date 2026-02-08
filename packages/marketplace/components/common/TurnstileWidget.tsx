'use client';

import { useRef, useCallback, forwardRef, useImperativeHandle } from 'react';
import { Turnstile, type TurnstileInstance } from '@marsidev/react-turnstile';

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

export interface TurnstileWidgetRef {
  getToken: () => string | undefined;
  getTokenAsync: (timeout?: number) => Promise<string>;
  reset: () => void;
}

interface TurnstileWidgetProps {
  onSuccess?: (token: string) => void;
  onExpire?: () => void;
  onError?: (error: string) => void;
  action?: string;
  className?: string;
}

export const TurnstileWidget = forwardRef<TurnstileWidgetRef, TurnstileWidgetProps>(
  function TurnstileWidget({ onSuccess, onExpire, onError, action, className }, ref) {
    const instanceRef = useRef<TurnstileInstance | undefined>(undefined);

    useImperativeHandle(ref, () => ({
      getToken: () => instanceRef.current?.getResponse(),
      getTokenAsync: (timeout = 30000) =>
        instanceRef.current?.getResponsePromise(timeout) ??
        Promise.reject(new Error('Turnstile not initialized')),
      reset: () => instanceRef.current?.reset(),
    }));

    const handleSuccess = useCallback(
      (token: string) => {
        onSuccess?.(token);
      },
      [onSuccess]
    );

    const handleExpire = useCallback(() => {
      onExpire?.();
    }, [onExpire]);

    const handleError = useCallback(
      (error: string) => {
        onError?.(error);
      },
      [onError]
    );

    if (!SITE_KEY) {
      return null;
    }

    return (
      <div className={className}>
        <Turnstile
          ref={instanceRef}
          siteKey={SITE_KEY}
          onSuccess={handleSuccess}
          onExpire={handleExpire}
          onError={handleError}
          options={{
            size: 'invisible',
            execution: 'render',
            appearance: 'interaction-only',
            action,
          }}
        />
      </div>
    );
  }
);
