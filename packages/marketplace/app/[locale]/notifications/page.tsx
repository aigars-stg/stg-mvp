'use client';

import { useTranslations } from 'next-intl';
import { useAuth } from '@/lib/auth/AuthContext';
import { useRouter } from '@/i18n/navigation';
import { useEffect } from 'react';
import { NotificationsList } from '@/components/notifications/NotificationsList';

export default function NotificationsPage() {
  const t = useTranslations('Notifications');
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth?returnTo=/notifications');
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
        <div className="h-8 w-48 bg-bg-secondary rounded animate-pulse mb-6" />
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 bg-bg-secondary rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
      <h1 className="text-2xl sm:text-3xl font-bold text-polar-night mb-6">
        {t('title')}
      </h1>
      <NotificationsList />
    </div>
  );
}
