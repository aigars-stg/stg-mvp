import {
  CreditCardIcon,
  PackageIcon,
  CheckCircleIcon,
  ClockIcon,
  WalletIcon,
} from '@phosphor-icons/react/ssr';
import type { Icon } from '@phosphor-icons/react';

// TODO: i18n
const steps: { icon: Icon; title: string; description: string }[] = [
  { icon: CreditCardIcon, title: 'You pay', description: 'Payment is processed securely via card or bank link' },
  { icon: PackageIcon, title: 'Seller ships', description: 'Within 2 business days' },
  { icon: CheckCircleIcon, title: 'You receive', description: 'Check the game matches the description' },
  { icon: ClockIcon, title: 'Order completes', description: 'After 2 days, or when you confirm earlier' },
  { icon: WalletIcon, title: 'Seller gets paid', description: 'Funds are transferred to their balance' },
];

export function PaymentFlow() {
  return (
    <div className="my-6 print:break-inside-avoid">
      {steps.map((step, i) => {
        const IconComponent = step.icon;
        const isLast = i === steps.length - 1;

        return (
          <div key={i} className="flex gap-4">
            {/* Icon column with connecting line */}
            <div className="flex flex-col items-center">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-snow-stormLightest">
                <IconComponent size={24} className="text-frost-arctic" />
              </div>
              {!isLast && (
                <div className="w-0.5 flex-1 bg-snow-storm" />
              )}
            </div>

            {/* Content */}
            <div className={isLast ? 'pb-0' : 'pb-4'}>
              <p className="font-semibold text-polar-night">{step.title}</p>
              <p className="mt-0.5 text-sm text-polar-nightDark">
                {step.description}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
