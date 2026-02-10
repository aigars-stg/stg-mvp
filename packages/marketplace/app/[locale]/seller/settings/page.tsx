'use client';

import { ArrowLeft, CurrencyDollar as DollarSign, ChevronRight } from 'griddy-icons';
import { Link } from '@/i18n/navigation';

const settingsItems = [
  {
    href: '/seller/settings/payouts',
    icon: DollarSign,
    title: 'Payout Settings',
    description: 'Manage your wallet and withdrawal preferences',
  },
];

export default function SellerSettingsPage() {
  return (
    <div className="min-h-screen bg-bg-primary">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link
            href="/seller/dashboard"
            className="p-2 hover:bg-bg-elevated rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-text-secondary" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-polar-night">Seller Settings</h1>
            <p className="text-sm text-text-secondary">
              Manage your seller account settings
            </p>
          </div>
        </div>

        {/* Settings List */}
        <div className="bg-snow-white border-2 border-border rounded-xl overflow-hidden">
          {settingsItems.map((item, index) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-4 p-4 hover:bg-bg-elevated transition-colors ${
                index > 0 ? 'border-t border-border' : ''
              }`}
            >
              <div className="w-10 h-10 rounded-lg bg-frost-ice/10 flex items-center justify-center">
                <item.icon className="w-5 h-5 text-frost-ice" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-polar-night">{item.title}</p>
                <p className="text-sm text-text-secondary truncate">
                  {item.description}
                </p>
              </div>
              <ChevronRight className="w-5 h-5 text-text-muted flex-shrink-0" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
