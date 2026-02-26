'use client';

import { Link } from '@/i18n/navigation';
import { Card } from '@second-turn/design-system';
import {
  Chat as MessageSquare,
  CreditCard,
  CheckCircleAlt01 as CheckCircle,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  ArrowRight,
  Package,
  CurrencyEuro as Euro,
  ShieldCheck,
  Timer,
  Globe,
  User,
} from '@/lib/icons';
import { useState } from 'react';
import { useTranslations } from 'next-intl';

function TableOfContents() {
  const t = useTranslations('Help.ListingTypes.toc');
  return (
    <nav className="mb-8 p-4 bg-bg-secondary rounded-lg">
      <h2 className="font-semibold text-polar-night mb-3">{t('title')}</h2>
      <ul className="space-y-2 text-sm">
        <li>
          <a href="#comparison" className="text-frost-ice hover:underline">
            {t('comparison')}
          </a>
        </li>
        <li>
          <a href="#instant-buy" className="text-frost-ice hover:underline">
            {t('instantBuy')}
          </a>
        </li>
        <li>
          <a href="#contact-seller" className="text-frost-ice hover:underline">
            {t('contactSeller')}
          </a>
        </li>
        <li>
          <a href="#switching" className="text-frost-ice hover:underline">
            {t('switching')}
          </a>
        </li>
        <li>
          <a href="#faqs" className="text-frost-ice hover:underline">
            {t('faqs')}
          </a>
        </li>
      </ul>
    </nav>
  );
}

function ComparisonTable() {
  const t = useTranslations('Help.ListingTypes.comparison');

  const rows = [
    { key: 'bestFor', icon: User },
    { key: 'howBuyersPay', icon: Euro },
    { key: 'howShippingWorks', icon: Package },
    { key: 'yourEarnings', icon: Euro },
    { key: 'buyerProtection', icon: ShieldCheck },
    { key: 'setupRequired', icon: Timer },
    { key: 'availability', icon: Globe },
  ] as const;

  return (
    <section id="comparison" className="mb-12">
      <h2 className="text-xl sm:text-2xl font-bold text-polar-night mb-6">
        {t('title')}
      </h2>

      {/* Desktop Table */}
      <div className="hidden md:block">
        <Card padding="none" className="overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-bg-secondary">
                <th className="text-left p-4 font-semibold text-polar-night border-b border-border"></th>
                <th className="text-left p-4 font-semibold text-polar-night border-b border-border">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-aurora-green" />
                    Instant Buy
                  </div>
                </th>
                <th className="text-left p-4 font-semibold text-polar-night border-b border-border">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-frost-ice" />
                    Contact Seller
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ key, icon: Icon }) => (
                <tr key={key} className="border-b border-border last:border-b-0">
                  <td className="p-4 font-medium text-polar-night">
                    <div className="flex items-center gap-2">
                      <Icon className="w-4 h-4 text-text-muted" />
                      {t(key)}
                    </div>
                  </td>
                  <td className="p-4 text-text-secondary">
                    {t(`instantBuy.${key}`)}
                  </td>
                  <td className="p-4 text-text-secondary">
                    {t(`contactSeller.${key}`)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-4">
        <Card padding="md" className="border-2 border-aurora-green">
          <div className="flex items-center gap-2 mb-4">
            <CreditCard className="w-6 h-6 text-aurora-green" />
            <h3 className="font-bold text-polar-night">Instant Buy</h3>
          </div>
          <ul className="space-y-3">
            {rows.map(({ key, icon: Icon }) => (
              <li key={key} className="flex items-start gap-2">
                <Icon className="w-4 h-4 text-text-muted flex-shrink-0 mt-0.5" />
                <div>
                  <span className="text-sm font-medium text-polar-night">{t(key)}: </span>
                  <span className="text-sm text-text-secondary">{t(`instantBuy.${key}`)}</span>
                </div>
              </li>
            ))}
          </ul>
        </Card>

        <Card padding="md" className="border-2 border-frost-ice">
          <div className="flex items-center gap-2 mb-4">
            <MessageSquare className="w-6 h-6 text-frost-ice" />
            <h3 className="font-bold text-polar-night">Contact Seller</h3>
          </div>
          <ul className="space-y-3">
            {rows.map(({ key, icon: Icon }) => (
              <li key={key} className="flex items-start gap-2">
                <Icon className="w-4 h-4 text-text-muted flex-shrink-0 mt-0.5" />
                <div>
                  <span className="text-sm font-medium text-polar-night">{t(key)}: </span>
                  <span className="text-sm text-text-secondary">{t(`contactSeller.${key}`)}</span>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </section>
  );
}

function InstantBuySection() {
  const t = useTranslations('Help.ListingTypes.instantBuySection');

  const steps = ['step1', 'step2', 'step3', 'step4', 'step5'] as const;
  const issues = ['cantShip', 'mismatch', 'notPickedUp'] as const;
  const requirements = ['name', 'bank'] as const;

  return (
    <section id="instant-buy" className="mb-12">
      <h2 className="text-xl sm:text-2xl font-bold text-polar-night mb-4 flex items-center gap-2">
        <CreditCard className="w-6 h-6 text-aurora-green" />
        {t('title')}
      </h2>
      <p className="text-text-secondary mb-6">{t('description')}</p>

      {/* Steps */}
      <div className="space-y-4 mb-8">
        {steps.map((step, index) => (
          <Card key={step} padding="md" className="flex items-start gap-4">
            <div className="w-8 h-8 rounded-full bg-aurora-green/10 text-aurora-green font-bold flex items-center justify-center flex-shrink-0">
              {index + 1}
            </div>
            <div>
              <h4 className="font-semibold text-polar-night mb-1">
                {t(`steps.${step}.title`)}
              </h4>
              <p className="text-sm text-text-secondary">
                {t(`steps.${step}.description`)}
              </p>
            </div>
          </Card>
        ))}
      </div>

      {/* What if something goes wrong */}
      <Card padding="md" className="mb-8 bg-aurora-orange/5 border border-aurora-orange/20">
        <h4 className="font-semibold text-polar-night mb-3 flex items-center gap-2">
          <HelpCircle className="w-5 h-5 text-aurora-orange" />
          {t('issuesTitle')}
        </h4>
        <ul className="space-y-2">
          {issues.map((issue) => (
            <li key={issue} className="text-sm text-text-secondary flex items-start gap-2">
              <span className="text-aurora-orange mt-0.5">•</span>
              {t(`issues.${issue}`)}
            </li>
          ))}
        </ul>
      </Card>

      {/* Setup Section */}
      <Card padding="md" className="bg-frost-ice/5 border border-frost-ice/20">
        <h4 className="font-semibold text-polar-night mb-3">{t('setupTitle')}</h4>
        <p className="text-sm text-text-secondary mb-4">{t('setupDescription')}</p>
        <p className="text-sm text-text-secondary mb-3">{t('setupTime')}</p>
        <ul className="space-y-2 mb-4">
          {requirements.map((req) => (
            <li key={req} className="text-sm text-text-secondary flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-aurora-green flex-shrink-0 mt-0.5" />
              {t(`setupRequirements.${req}`)}
            </li>
          ))}
        </ul>
        <p className="text-sm text-text-muted">{t('setupTrust')}</p>
      </Card>
    </section>
  );
}

function ContactSellerSection() {
  const t = useTranslations('Help.ListingTypes.contactSellerSection');

  const steps = ['step1', 'step2', 'step3', 'step4', 'step5'] as const;
  const reasons = ['directPayments', 'negotiate', 'ownShipping', 'country'] as const;

  return (
    <section id="contact-seller" className="mb-12">
      <h2 className="text-xl sm:text-2xl font-bold text-polar-night mb-4 flex items-center gap-2">
        <MessageSquare className="w-6 h-6 text-frost-ice" />
        {t('title')}
      </h2>
      <p className="text-text-secondary mb-6">{t('description')}</p>

      {/* Steps */}
      <div className="space-y-4 mb-8">
        {steps.map((step, index) => (
          <Card key={step} padding="md" className="flex items-start gap-4">
            <div className="w-8 h-8 rounded-full bg-frost-ice/10 text-frost-ice font-bold flex items-center justify-center flex-shrink-0">
              {index + 1}
            </div>
            <div>
              <h4 className="font-semibold text-polar-night mb-1">
                {t(`steps.${step}.title`)}
              </h4>
              <p className="text-sm text-text-secondary">
                {t(`steps.${step}.description`)}
              </p>
            </div>
          </Card>
        ))}
      </div>

      {/* Why choose */}
      <Card padding="md" className="mb-4">
        <h4 className="font-semibold text-polar-night mb-3">{t('whyChoose')}</h4>
        <ul className="space-y-2">
          {reasons.map((reason) => (
            <li key={reason} className="text-sm text-text-secondary flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-frost-ice flex-shrink-0 mt-0.5" />
              {t(`reasons.${reason}`)}
            </li>
          ))}
        </ul>
      </Card>

      {/* Tradeoff */}
      <p className="text-sm text-text-muted italic">{t('tradeoff')}</p>
    </section>
  );
}

function SwitchingSection() {
  const t = useTranslations('Help.ListingTypes.switchingSection');

  return (
    <section id="switching" className="mb-12">
      <h2 className="text-xl sm:text-2xl font-bold text-polar-night mb-6">
        {t('title')}
      </h2>

      <div className="space-y-4">
        <Card padding="md">
          <h4 className="font-semibold text-polar-night mb-2">{t('upgradeTitle')}</h4>
          <p className="text-sm text-text-secondary">{t('upgradeDescription')}</p>
        </Card>

        <Card padding="md">
          <h4 className="font-semibold text-polar-night mb-2">{t('downgradeTitle')}</h4>
          <p className="text-sm text-text-secondary">{t('downgradeDescription')}</p>
        </Card>

        <Card padding="md" className="bg-frost-ice/5 border border-frost-ice/20">
          <h4 className="font-semibold text-polar-night mb-2">{t('countryNoteTitle')}</h4>
          <p className="text-sm text-text-secondary">{t('countryNoteDescription')}</p>
        </Card>
      </div>
    </section>
  );
}

function FAQItem({ questionKey }: { questionKey: string }) {
  const [expanded, setExpanded] = useState(false);
  const t = useTranslations('Help.ListingTypes.faqSection');

  return (
    <Card padding="none" className="border border-border overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left p-4 flex items-center justify-between hover:bg-bg-secondary/50 transition-colors"
      >
        <span className="font-semibold text-polar-night pr-4">
          {t(`${questionKey}.question`)}
        </span>
        {expanded ? (
          <ChevronUp className="w-5 h-5 text-text-muted flex-shrink-0" />
        ) : (
          <ChevronDown className="w-5 h-5 text-text-muted flex-shrink-0" />
        )}
      </button>
      {expanded && (
        <div className="px-4 pb-4 text-text-secondary text-sm border-t border-border">
          <p className="pt-3">{t(`${questionKey}.answer`)}</p>
        </div>
      )}
    </Card>
  );
}

function FAQSection() {
  const t = useTranslations('Help.ListingTypes.faqSection');
  const questions = ['q1', 'q2', 'q3', 'q4', 'q5'] as const;

  return (
    <section id="faqs" className="mb-12">
      <h2 className="text-xl sm:text-2xl font-bold text-polar-night mb-6">
        {t('title')}
      </h2>
      <div className="space-y-3">
        {questions.map((q) => (
          <FAQItem key={q} questionKey={q} />
        ))}
      </div>
    </section>
  );
}

export default function ListingTypesPage() {
  const t = useTranslations('Help.ListingTypes');

  return (
    <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-polar-night mb-2">
            {t('intro.title')}
          </h1>
          <p className="text-lg text-frost-ice font-medium mb-4">
            {t('intro.tagline')}
          </p>
          <p className="text-text-secondary">
            {t('intro.description')}
          </p>
        </div>

        <TableOfContents />
        <ComparisonTable />
        <InstantBuySection />
        <ContactSellerSection />
        <SwitchingSection />
        <FAQSection />

        {/* CTA */}
        <Card padding="lg" className="text-center bg-frost-ice/5 border border-frost-ice/20">
          <h3 className="text-xl font-bold text-polar-night mb-4">
            {t('cta.ready')}
          </h3>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/sell"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-frost-ice text-white font-medium rounded-lg hover:bg-frost-ice/90 transition-colors"
            >
              {t('cta.sellButton')}
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/"
              className="inline-flex items-center justify-center px-6 py-3 text-frost-ice font-medium rounded-lg border border-frost-ice/30 hover:bg-frost-ice/5 transition-colors"
            >
              {t('cta.backToHome')}
            </Link>
          </div>
        </Card>
      </div>
  );
}
