'use client';

import { useTranslations } from 'next-intl';
import { useAuth } from '@/lib/auth/AuthContext';
import { useRouter } from '@/i18n/navigation';
import { useEffect } from 'react';
import { Notification as BellIcon } from '@/lib/icons';
import { NotificationsList } from '@/components/notifications/NotificationsList';

export default function NotificationsPage() {
  const t = useTranslations('Notifications');
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth?redirectTo=/notifications');
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-bg py-6 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <div className="h-8 w-48 bg-bg-secondary rounded animate-pulse mb-2" />
            <div className="h-4 w-72 bg-bg-secondary rounded animate-pulse" />
          </div>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-20 bg-bg-secondary rounded-lg animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg py-6 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <BellIcon className="w-8 h-8 text-frost-ice" />
            <h1 className="text-2xl sm:text-3xl font-bold text-polar-night">{t('title')}</h1>
          </div>
          <p className="text-text-secondary">{t('subtitle')}</p>
        </div>
        <NotificationsList />
      </div>
    </div>
  );
}
