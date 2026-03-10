'use client';

import { Link, usePathname } from '@/i18n/navigation';
import { SegmentedNav } from '@second-turn/design-system';
import {
  Package,
  Receipt,
  FileText,
  AlertTriangle,
  CurrencyEuro as Euro,
  Chat as MessageSquare,
  Email,
  TrendUp,
} from '@/lib/icons';
import type React from 'react';

const STAFF_SECTIONS: {
  value: string;
  label: string;
  href: string;
  IconComponent: React.ComponentType<{ className?: string }>;
}[] = [
  { value: 'orders', label: 'Orders', href: '/staff/orders', IconComponent: Package },
  { value: 'bookkeeping', label: 'Bookkeeping', href: '/staff/bookkeeping', IconComponent: Receipt },
  { value: 'dac7', label: 'DAC7', href: '/staff/dac7', IconComponent: FileText },
  { value: 'disputes', label: 'Disputes', href: '/staff/disputes', IconComponent: AlertTriangle },
  { value: 'withdrawals', label: 'Withdrawals', href: '/staff/withdrawals', IconComponent: Euro },
  { value: 'feedback', label: 'Feedback', href: '/staff/feedback', IconComponent: MessageSquare },
  { value: 'newsletter', label: 'Newsletter', href: '/staff/newsletter', IconComponent: Email },
  { value: 'play', label: 'Play', href: '/staff/play', IconComponent: TrendUp },
];

export function StaffNav() {
  const pathname = usePathname();
  const activeValue = STAFF_SECTIONS.find((s) => pathname.startsWith(s.href))?.value ?? '';

  return (
    <SegmentedNav
      items={STAFF_SECTIONS}
      activeValue={activeValue}
      renderItem={(item, _isActive, className) => (
        <Link key={item.value} href={item.href} className={className}>
          <item.IconComponent className="w-4 h-4 shrink-0" />
          {item.label}
        </Link>
      )}
    />
  );
}
