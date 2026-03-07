'use client';

import Image from 'next/image';
import { Link } from '@/i18n/navigation';
import { Checkerboard, HandDeposit, SearchPlus } from '@/lib/icons';
import { NewsletterSignup } from '@/components/newsletter/NewsletterSignup';
import { useTranslations } from 'next-intl';

type ColorVariant = 'frost-ice' | 'frost-polar' | 'aurora-orange';

const colorStyles: Record<ColorVariant, { border: string; iconBg: string; iconText: string; iconHover: string; button: string }> = {
  'frost-ice': {
    border: 'hover:border-frost-ice',
    iconBg: 'bg-frost-ice/10',
    iconText: 'text-frost-ice',
    iconHover: 'group-hover:bg-frost-ice/20',
    button: 'bg-frost-ice',
  },
  'frost-polar': {
    border: 'hover:border-frost-polar',
    iconBg: 'bg-frost-polar/10',
    iconText: 'text-frost-polar',
    iconHover: 'group-hover:bg-frost-polar/20',
    button: 'bg-frost-polar',
  },
  'aurora-orange': {
    border: 'hover:border-aurora-orange',
    iconBg: 'bg-aurora-orange/10',
    iconText: 'text-aurora-orange',
    iconHover: 'group-hover:bg-aurora-orange/20',
    button: 'bg-aurora-orange',
  },
};

interface MiniActionCardProps {
  href: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  buttonText: string;
  color: ColorVariant;
  disabled?: boolean;
  primary?: boolean;
}

function MiniActionCard({ href, icon, title, description, buttonText, color, disabled, primary }: MiniActionCardProps) {
  const styles = colorStyles[color];

  const content = (
    <div
      className={`relative h-full p-4 sm:p-5 rounded-xl border transition-all duration-200 bg-snow-white ${
        disabled
          ? 'border-border opacity-75 cursor-default'
          : `${primary ? 'border-frost-ice/30 shadow-sm' : 'border-border'} ${styles.border} hover:shadow-md cursor-pointer group`
      }`}
    >
      <div className="flex items-center gap-3 mb-3">
        <div
          className={`w-10 h-10 rounded-lg flex-shrink-0 flex items-center justify-center transition-colors ${styles.iconBg} ${styles.iconText} ${disabled ? '' : styles.iconHover}`}
        >
          {icon}
        </div>
        <h3 className="text-base sm:text-lg font-semibold text-polar-night">
          {title}
        </h3>
      </div>

      <p className="text-sm text-text-secondary mb-3 leading-relaxed">
        {description}
      </p>

      <div
        className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
          disabled
            ? 'bg-bg-secondary text-text-muted'
            : `${styles.button} text-snow-white group-hover:shadow-sm`
        }`}
      >
        {buttonText}
        {!disabled && (
          <span className="transition-transform group-hover:translate-x-0.5">→</span>
        )}
      </div>
    </div>
  );

  if (disabled) {
    return <div className="block h-full">{content}</div>;
  }

  return (
    <Link href={href} className="block h-full">
      {content}
    </Link>
  );
}

export function CompactHero() {
  const t = useTranslations('HomePage.hero');
  const isComingSoon = process.env.NEXT_PUBLIC_COMING_SOON === 'true';

  return (
    <section className="relative overflow-hidden">
      {/* Background image with gradient overlay */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/images/hero-background.webp"
          alt=""
          fill
          className="object-cover opacity-65"
          priority
          placeholder="blur"
          blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAMCAgMCAgMDAwMEAwMEBQgFBQQEBQoHBwYIDAoMCwsKCwsNDhIQDQ4RDgsLEBYQERMUFRUVDA8XGBYUGBIUFRT/2wBDAQMEBAUEBQkFBQkUDQsNFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBT/wAARCAAIAAoDASIAAhEBAxEB/8QAFgABAQEAAAAAAAAAAAAAAAAAAAcI/8QAIhAAAQQBBAMBAAAAAAAAAAAAAQIDBBEABQYSIRMxQVH/xAAVAQEBAAAAAAAAAAAAAAAAAAADBf/EABoRAAICAwAAAAAAAAAAAAAAAAECAAMREiH/2gAMAwEAAhEDEEAAggbE7eDubIamwJkiQ4srUpLqgAAAPwAVdAn+xjGaZ1VKlT//2Q=="
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-bg" />
      </div>

      {/* Content */}
      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 py-6 sm:py-8 lg:py-20">
        <div className="flex justify-center mb-5">
          <div className="text-center bg-snow-white/60 backdrop-blur-md rounded-lg border border-snow-white/40 px-6 py-5 sm:px-10 sm:py-6 max-w-2xl">
            {isComingSoon && (
              <div className="flex justify-center mb-3">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-frost-ice/10 border border-frost-ice/20 px-3 py-1 text-xs font-medium text-frost-700">
                  <span className="w-1.5 h-1.5 rounded-full bg-frost-ice animate-pulse" />
                  {t('comingSoonBadge')}
                </span>
              </div>
            )}
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-polar-night mb-2 tracking-tight">
              <span className="text-frost-ice">{t('discover')}</span>{' '}
              <span className="text-frost-polar">{t('list')}</span>{' '}
              <span className="text-aurora-orange">{t('play')}</span>
            </h1>
            <p className="text-base sm:text-lg text-text-secondary">
              {t('tagline')}
              <br />
              {t('subtitle')}
            </p>
          </div>
        </div>

        {isComingSoon && (
          <div className="max-w-md mx-auto mb-6">
            <div className="bg-snow-white border border-border-subtle shadow-sm rounded-xl p-5 sm:p-6">
              <p className="text-sm font-medium text-polar-night text-center mb-1">
                {t('comingSoonSignup')}
              </p>
              <NewsletterSignup hideDescription />
            </div>
          </div>
        )}

        {/* Mini Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 max-w-5xl mx-auto">
          <MiniActionCard
            href="/browse"
            icon={<Checkerboard className="w-5 h-5" />}
            title={t('browseCard.title')}
            description={t('browseCard.description')}
            buttonText={isComingSoon ? t('comingSoonButton') : t('browseCard.button')}
            color="frost-ice"
            disabled={isComingSoon}
            primary={!isComingSoon}
          />
          <MiniActionCard
            href="/sell"
            icon={<HandDeposit className="w-5 h-5" />}
            title={t('sellCard.title')}
            description={t('sellCard.description')}
            buttonText={isComingSoon ? t('comingSoonButton') : t('sellCard.button')}
            color="frost-polar"
            disabled={isComingSoon}
          />
          <MiniActionCard
            href="/wanted/new"
            icon={<SearchPlus className="w-5 h-5" />}
            title={t('wantedCard.title')}
            description={t('wantedCard.description')}
            buttonText={isComingSoon ? t('comingSoonButton') : t('wantedCard.button')}
            color="aurora-orange"
            disabled={isComingSoon}
          />
        </div>
      </div>
    </section>
  );
}
