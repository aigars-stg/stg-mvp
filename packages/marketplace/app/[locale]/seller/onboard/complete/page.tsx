'use client';

import { useEffect } from 'react';
import { Link, useRouter } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { Button } from '@second-turn/design-system';
import { CheckCircleAlt01 as CheckCircle2, ArrowRight, Package, CurrencyDollar as DollarSign, TrendUp as TrendingUp, Heart } from '@/lib/icons';
import { useAuth } from '@/lib/auth/AuthContext';

const richText = {
  strong: (chunks: React.ReactNode) => <strong>{chunks}</strong>,
};

export default function SellerOnboardingCompletePage() {
  const router = useRouter();
  const { user } = useAuth();
  const t = useTranslations('SellerOnboard');

  useEffect(() => {
    // Redirect to sign in if not authenticated
    if (!user) {
      router.push('/auth/signin?redirect=/seller/onboard/complete');
    }
  }, [user, router]);

  if (!user) {
    return null;
  }

  const tipKeys = ['photos', 'condition', 'pricing', 'shipping', 'packaging', 'messages'] as const;

  return (
    <div className="min-h-screen bg-bg py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">

        {/* Success Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-aurora-green rounded-full mb-6">
            <CheckCircle2 className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-polar-night mb-4">
            {t('complete.title')}
          </h1>
          <p className="text-lg text-text-secondary">
            {t('complete.subtitle')}
          </p>
        </div>

        {/* What You Can Do Now */}
        <div className="bg-snow-white border border-border rounded-lg p-8 mb-8">
          <h2 className="text-xl font-semibold text-polar-night mb-6">
            {t('complete.whatYouCanDo.title')}
          </h2>

          <div className="space-y-6">
            {/* Create Listings */}
            <div className="flex items-start gap-4">
              <div className="p-3 bg-frost-ice/10 rounded-lg flex-shrink-0">
                <Package className="w-6 h-6 text-frost-ice" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-polar-night mb-2">
                  {t('complete.whatYouCanDo.createListing.title')}
                </h3>
                <p className="text-sm text-text-secondary mb-3">
                  {t('complete.whatYouCanDo.createListing.description')}
                </p>
                <Button
                  variant="primary"
                  size="md"
                  onClick={() => router.push('/sell')}
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                >
                  {t('complete.whatYouCanDo.createListing.button')}
                </Button>
              </div>
            </div>

            {/* Browse Marketplace */}
            <div className="flex items-start gap-4">
              <div className="p-3 bg-aurora-green/10 rounded-lg flex-shrink-0">
                <Heart className="w-6 h-6 text-aurora-green" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-polar-night mb-2">
                  {t('complete.whatYouCanDo.browseGames.title')}
                </h3>
                <p className="text-sm text-text-secondary mb-3">
                  {t('complete.whatYouCanDo.browseGames.description')}
                </p>
                <Button
                  variant="secondary"
                  size="md"
                  onClick={() => router.push('/browse')}
                >
                  {t('complete.whatYouCanDo.browseGames.button')}
                </Button>
              </div>
            </div>

            {/* View Dashboard */}
            <div className="flex items-start gap-4">
              <div className="p-3 bg-frost-ice/10 rounded-lg flex-shrink-0">
                <TrendingUp className="w-6 h-6 text-frost-ice" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-polar-night mb-2">
                  {t('complete.whatYouCanDo.manageSales.title')}
                </h3>
                <p className="text-sm text-text-secondary mb-3">
                  {t('complete.whatYouCanDo.manageSales.description')}
                </p>
                <Button
                  variant="secondary"
                  size="md"
                  onClick={() => router.push('/seller/dashboard?tab=orders')}
                >
                  {t('complete.whatYouCanDo.manageSales.button')}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* How Selling Works */}
        <div className="bg-snow-white border border-border rounded-lg p-8 mb-8">
          <h2 className="text-xl font-semibold text-polar-night mb-6">
            {t('complete.howItWorks.title')}
          </h2>

          <div className="space-y-4">
            {([1, 2, 3, 4] as const).map((step) => (
              <div key={step} className="flex gap-4">
                <div className={`flex items-center justify-center w-8 h-8 ${step === 4 ? 'bg-aurora-green' : 'bg-frost-ice'} text-white rounded-full font-semibold flex-shrink-0`}>
                  {step}
                </div>
                <div>
                  <h4 className="font-semibold text-polar-night mb-1">
                    {t(`complete.howItWorks.step${step}.title`)}
                  </h4>
                  <p className="text-sm text-text-secondary">
                    {t(`complete.howItWorks.step${step}.description`)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Tips for Success */}
        <div className="bg-frost-ice/10 border border-frost-ice/20 rounded-lg p-6 mb-8">
          <h3 className="font-semibold text-polar-night mb-4">
            {t('complete.tips.title')}
          </h3>
          <ul className="space-y-2 text-sm text-text-secondary">
            {tipKeys.map((key) => (
              <li key={key} className="flex items-start gap-2">
                <span className="text-frost-ice mt-1">&bull;</span>
                <span>{t.rich(`complete.tips.${key}`, richText)}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Earnings Information */}
        <div className="bg-snow-white border border-border rounded-lg p-6 mb-8">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-aurora-green/10 rounded-lg flex-shrink-0">
              <DollarSign className="w-6 h-6 text-aurora-green" />
            </div>
            <div>
              <h3 className="font-semibold text-polar-night mb-2">
                {t('complete.earnings.title')}
              </h3>
              <p className="text-sm text-text-secondary mb-3">
                {t('complete.earnings.subtitle')}
              </p>
              <ul className="text-sm text-text-secondary space-y-2 mb-4">
                {(['commission', 'withdraw', 'track'] as const).map((key) => (
                  <li key={key} className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-aurora-green flex-shrink-0" />
                    <span>{t.rich(`complete.earnings.${key}`, richText)}</span>
                  </li>
                ))}
              </ul>
              <Link
                href="/seller/dashboard?tab=earnings"
                className="text-sm text-frost-ice hover:underline font-medium"
              >
                {t('complete.earnings.viewWallet')}
              </Link>
            </div>
          </div>
        </div>

        {/* Support */}
        <div className="text-center">
          <p className="text-sm text-text-secondary mb-2">
            {t('complete.completeSupport.questions')}
          </p>
          <a
            href="mailto:sellers@secondturn.games"
            className="text-frost-ice hover:underline font-medium"
          >
            {t('complete.completeSupport.contactSeller')}
          </a>
        </div>

        {/* Primary CTA */}
        <div className="mt-12 text-center">
          <Button
            variant="primary"
            size="lg"
            onClick={() => router.push('/sell')}
            rightIcon={<ArrowRight className="w-5 h-5" />}
          >
            {t('complete.cta.button')}
          </Button>
          <p className="text-xs text-text-secondary mt-3">
            {t('complete.cta.subtitle')}
          </p>
        </div>
      </div>
    </div>
  );
}
