import {
  ShieldCheckIcon,
  VerifiedBadgeIcon,
  PackageCheckIcon,
} from '@/components/icons';

const features = [
  {
    icon: ShieldCheckIcon,
    title: 'Buyer Protection',
    description: 'Your payment is held securely until you confirm delivery. Shop with confidence.',
  },
  {
    icon: VerifiedBadgeIcon,
    title: 'Verified Sellers',
    description: 'Browse seller ratings and reviews. Know who you\'re buying from.',
  },
  {
    icon: PackageCheckIcon,
    title: 'Transparent Condition',
    description: 'Detailed photos and condition grades for every game. No surprises.',
  },
];

export function Features() {
  return (
    <section className="py-12 sm:py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 lg:gap-12">
          {features.map((feature, index) => {
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
                  {feature.title}
                </h3>

                {/* Description */}
                <p className="text-text-secondary leading-relaxed">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
