import {
  SaveMoneyIcon,
  RareGamesIcon,
  CommunityIcon,
  SustainableIcon,
} from '@/components/icons';
import { getTranslations } from 'next-intl/server';

const benefitKeys = [
  { icon: SaveMoneyIcon, key: 'saveMoney' },
  { icon: RareGamesIcon, key: 'findRareGames' },
  { icon: CommunityIcon, key: 'meetLocalGamers' },
  { icon: SustainableIcon, key: 'sustainableGaming' },
] as const;

export async function WhySecondTurn() {
  const t = await getTranslations('Home.WhySecondTurn');

  return (
    <section className="py-12 sm:py-16 lg:py-20 bg-bg-elevated">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        {/* Section header */}
        <div className="text-center mb-12 sm:mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-text-primary mb-4">
            {t('title')}
          </h2>
          <p className="text-lg text-text-secondary max-w-2xl mx-auto">
            {t('subtitle')}
          </p>
        </div>

        {/* Benefits grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-10">
          {benefitKeys.map((benefit, index) => {
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
                    {t(`${benefit.key}.stat`)}
                  </span>
                </div>

                {/* Title */}
                <h3 className="text-xl font-semibold text-text-primary mb-3">
                  {t(`${benefit.key}.title`)}
                </h3>

                {/* Description */}
                <p className="text-sm text-text-secondary leading-relaxed">
                  {t(`${benefit.key}.description`)}
                </p>
              </div>
            );
          })}
        </div>

        {/* Regional identity callout */}
        <div className="mt-12 sm:mt-16 text-center">
          <div className="inline-block bg-bg rounded-lg px-6 py-4 border border-border-subtle">
            <p className="text-sm text-text-muted">
              <span className="font-semibold text-frost-ice">{t('builtForBaltics')}</span>
              {' · '}
              {t('connectingGamers')}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
