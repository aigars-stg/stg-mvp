import {
  SaveMoneyIcon,
  RareGamesIcon,
  CommunityIcon,
  SustainableIcon,
} from '@/components/icons';

const benefits = [
  {
    icon: SaveMoneyIcon,
    title: 'Save Money',
    description: 'Average savings of 40% compared to buying new. Quality games at great prices.',
    stat: 'Up to 40% off',
  },
  {
    icon: RareGamesIcon,
    title: 'Find Rare Games',
    description: 'Discover out-of-print titles and hard-to-find games not available in stores.',
    stat: 'Unique finds',
  },
  {
    icon: CommunityIcon,
    title: 'Meet Local Gamers',
    description: 'Connect with the Baltic board game community. Local pickup available across Estonia, Latvia, and Lithuania.',
    stat: 'Baltic network',
  },
  {
    icon: SustainableIcon,
    title: 'Sustainable Gaming',
    description: 'Give quality games another adventure. Reduce waste while building your collection.',
    stat: 'Second turns',
  },
];

export function WhySecondTurn() {
  return (
    <section className="py-12 sm:py-16 lg:py-20 bg-bg-elevated">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        {/* Section header */}
        <div className="text-center mb-12 sm:mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-text-primary mb-4">
            Why Choose Second Turn Games?
          </h2>
          <p className="text-lg text-text-secondary max-w-2xl mx-auto">
            The smart way to grow your board game collection in the Baltics
          </p>
        </div>

        {/* Benefits grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-10">
          {benefits.map((benefit, index) => {
            const Icon = benefit.icon;
            return (
              <div
                key={index}
                className="text-center group"
              >
                {/* Icon container */}
                <div className="mb-6 inline-flex items-center justify-center">
                  <div className="relative">
                    {/* Background circle */}
                    <div className="absolute inset-0 bg-frost-ice/10 rounded-full scale-110 group-hover:scale-125 transition-transform duration-300" />

                    {/* Icon */}
                    <div className="relative p-6">
                      <Icon className="w-12 h-12 text-frost-ice" />
                    </div>
                  </div>
                </div>

                {/* Stat badge */}
                <div className="inline-block mb-3">
                  <span className="text-xs font-semibold text-frost-ice bg-frost-ice/10 px-3 py-1 rounded-full">
                    {benefit.stat}
                  </span>
                </div>

                {/* Title */}
                <h3 className="text-xl font-semibold text-text-primary mb-3">
                  {benefit.title}
                </h3>

                {/* Description */}
                <p className="text-sm text-text-secondary leading-relaxed">
                  {benefit.description}
                </p>
              </div>
            );
          })}
        </div>

        {/* Regional identity callout */}
        <div className="mt-12 sm:mt-16 text-center">
          <div className="inline-block bg-bg rounded-lg px-6 py-4 border border-border-subtle">
            <p className="text-sm text-text-muted">
              <span className="font-semibold text-frost-ice">Built for the Baltics</span>
              {' · '}
              Connecting gamers across Estonia, Latvia, and Lithuania
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
