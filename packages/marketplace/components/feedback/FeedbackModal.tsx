'use client';

import { useState, useEffect } from 'react';
import { Modal } from '@second-turn/design-system';
import { CheckCircle } from '@/lib/icons';
import { useTranslations } from 'next-intl';
import { FeedbackForm } from './FeedbackForm';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type ModalState = 'form' | 'success' | 'error';

export function FeedbackModal({ isOpen, onClose }: FeedbackModalProps) {
  const t = useTranslations('Feedback');
  const [state, setState] = useState<ModalState>('form');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setState('form');
      setErrorMessage(null);
    }
  }, [isOpen]);

  // Auto-close after success
  useEffect(() => {
    if (state === 'success') {
      const timer = setTimeout(() => {
        onClose();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [state, onClose]);

  const handleSuccess = () => {
    setState('success');
  };

  const handleError = (message: string) => {
    setErrorMessage(message);
    setState('error');
  };

  const handleRetry = () => {
    setState('form');
    setErrorMessage(null);
  };

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title={state === 'success' ? '' : t('title')}
      size="md"
      contentClassName="!max-h-[75vh] !p-4 sm:!p-6"
    >
      {state === 'form' && (
        <FeedbackForm onSuccess={handleSuccess} onError={handleError} />
      )}

      {state === 'success' && (
        <div className="py-8 flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-full bg-aurora-green/10 flex items-center justify-center mb-4">
            <CheckCircle className="w-8 h-8 text-aurora-green" />
          </div>
          <h3 className="text-lg font-semibold text-text mb-2">
            {t('successTitle')}
          </h3>
          <p className="text-text-secondary">{t('successMessage')}</p>
        </div>
      )}

      {state === 'error' && (
        <div className="py-8 flex flex-col items-center text-center">
          <p className="text-aurora-red mb-4">{errorMessage || t('errorGeneric')}</p>
          <button
            onClick={handleRetry}
            className="text-frost-ice hover:underline"
          >
            {t('tryAgain')}
          </button>
        </div>
      )}
    </Modal>
  );
}
