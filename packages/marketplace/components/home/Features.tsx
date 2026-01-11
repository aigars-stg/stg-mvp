import {
  ShieldCheckIcon,
  VerifiedBadgeIcon,
  PackageCheckIcon,
} from '@/components/icons';
import { getTranslations } from 'next-intl/server';

const featureKeys = [
  { icon: ShieldCheckIcon, key: 'buyerProtection' },
  { icon: VerifiedBadgeIcon, key: 'verifiedSellers' },
  { icon: PackageCheckIcon, key: 'transparentCondition' },
] as const;

export async function Features() {
  const t = await getTranslations('Home.Features');

  return (
    <section className="py-12 sm:py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 lg:gap-12">
          {featureKeys.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div
                key={index}
                className="text-center group"
              >
                {/* Icon container with hover effect */}
                <div className="mb-6 inline-flex items-center justify-center">
                  <div className="relative">
                    {/* Background circle */}
                    <div className="absolute inset-0 bg-frost-ice/10 rounded-full scale-100 group-hover:scale-110 transition-transform duration-300" />

                    {/* Icon */}
                    <div className="relative p-5">
                      <Icon className="w-10 h-10 text-frost-ice" />
                    </div>
                  </div>
                </div>

                {/* Title */}
                <h3 className="text-xl font-semibold text-text-primary mb-3">
                  {t(`${feature.key}.title`)}
                </h3>

                {/* Description */}
                <p className="text-text-secondary leading-relaxed">
                  {t(`${feature.key}.description`)}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
