'use client';

import { useTranslations } from 'next-intl';

export function HowItWorks() {
  const t = useTranslations('HomePage.howItWorks');

  const buyerSteps = [
    {
      title: t('buyerSteps.step1.title'),
      description: t('buyerSteps.step1.description'),
    },
    {
      title: t('buyerSteps.step2.title'),
      description: t('buyerSteps.step2.description'),
    },
    {
      title: t('buyerSteps.step3.title'),
      description: t('buyerSteps.step3.description'),
    },
    {
      title: t('buyerSteps.step4.title'),
      description: t('buyerSteps.step4.description'),
    },
  ];

  const sellerSteps = [
    {
      title: t('sellerSteps.step1.title'),
      description: t('sellerSteps.step1.description'),
    },
    {
      title: t('sellerSteps.step2.title'),
      description: t('sellerSteps.step2.description'),
    },
    {
      title: t('sellerSteps.step3.title'),
      description: t('sellerSteps.step3.description'),
    },
    {
      title: t('sellerSteps.step4.title'),
      description: t('sellerSteps.step4.description'),
    },
  ];
  return (
    <section className="py-12 sm:py-16 lg:py-20 bg-bg-secondary">
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

        {/* Two-column layout */}
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-16">
          {/* For Buyers */}
          <div>
            <h3 className="text-2xl font-semibold text-text-primary mb-8 flex items-center gap-3">
              <span>{t('forBuyers')}</span>
              <span className="text-sm font-normal text-text-muted bg-frost-ice/10 px-3 py-1 rounded-full">
                {t('forBuyersTag')}
              </span>
            </h3>
            <div className="space-y-6">
              {buyerSteps.map((step, index) => (
                <div key={index} className="flex gap-4 group">
                  {/* Number badge */}
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 bg-frost-ice text-snow-white rounded-md flex items-center justify-center font-semibold text-lg shadow-sm group-hover:scale-110 transition-transform duration-200">
                      {index + 1}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 pt-1">
                    <h4 className="font-semibold text-text-primary mb-2 text-lg">
                      {step.title}
                    </h4>
                    <p className="text-text-secondary leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* For Sellers */}
          <div>
            <h3 className="text-2xl font-semibold text-text-primary mb-8 flex items-center gap-3">
              <span>{t('forSellers')}</span>
              <span className="text-sm font-normal text-text-muted bg-aurora-orange/10 px-3 py-1 rounded-full">
                {t('forSellersTag')}
              </span>
            </h3>
            <div className="space-y-6">
              {sellerSteps.map((step, index) => (
                <div key={index} className="flex gap-4 group">
                  {/* Number badge */}
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 bg-aurora-orange text-snow-white rounded-md flex items-center justify-center font-semibold text-lg shadow-sm group-hover:scale-110 transition-transform duration-200">
                      {index + 1}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 pt-1">
                    <h4 className="font-semibold text-text-primary mb-2 text-lg">
                      {step.title}
                    </h4>
                    <p className="text-text-secondary leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
