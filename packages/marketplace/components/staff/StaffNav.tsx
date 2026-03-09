'use client';

import { Link, usePathname } from '@/i18n/navigation';
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

const STAFF_SECTIONS = [
  { label: 'Orders', href: '/staff/orders', icon: Package },
  { label: 'Bookkeeping', href: '/staff/bookkeeping', icon: Receipt },
  { label: 'DAC7', href: '/staff/dac7', icon: FileText },
  { label: 'Disputes', href: '/staff/disputes', icon: AlertTriangle },
  { label: 'Withdrawals', href: '/staff/withdrawals', icon: Euro },
  { label: 'Feedback', href: '/staff/feedback', icon: MessageSquare },
  { label: 'Newsletter', href: '/staff/newsletter', icon: Email },
  { label: 'Play', href: '/staff/play', icon: TrendUp },
] as const;

export function StaffNav() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-1 overflow-x-auto bg-frost-ice/10 rounded-lg p-1">
      {STAFF_SECTIONS.map((section) => {
        const Icon = section.icon;
        const isActive = pathname.startsWith(section.href);

        return (
          <Link
            key={section.href}
            href={section.href}
            className={`flex items-center gap-1.5 whitespace-nowrap px-3 py-1.5 rounded text-sm font-medium transition-colors ${
              isActive
                ? 'bg-frost-ice text-white'
                : 'text-frost-ice hover:bg-frost-ice/20'
            }`}
          >
            <Icon className="w-4 h-4 shrink-0" />
            {section.label}
          </Link>
        );
      })}
    </nav>
  );
}
