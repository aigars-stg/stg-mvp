'use client';

import Link from 'next/link';
import { ShoppingBag, Tag, Notification as Bell } from 'griddy-icons';
import Image from 'next/image';
import { useTranslations } from 'next-intl';

type ColorVariant = 'frost-ice' | 'frost-polar' | 'aurora-orange';

interface ActionCardProps {
  href: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  buttonText: string;
  color: ColorVariant;
}

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

function ActionCard({ href, icon, title, description, buttonText, color }: ActionCardProps) {
  const styles = colorStyles[color];

  return (
    <Link href={href} className="block h-full">
      <div
        className={`relative h-full p-6 sm:p-8 rounded-2xl border-2 transition-all duration-200 bg-snow-white border-border ${styles.border} hover:shadow-lg cursor-pointer group`}
      >
        {/* Icon */}
        <div
          className={`w-14 h-14 rounded-xl flex items-center justify-center mb-5 transition-colors ${styles.iconBg} ${styles.iconText} ${styles.iconHover}`}
        >
          {icon}
        </div>

        {/* Title */}
        <h3 className="text-xl sm:text-2xl font-bold mb-2 text-polar-night">
          {title}
        </h3>

        {/* Description */}
        <p className="text-text-secondary text-sm sm:text-base mb-6 leading-relaxed">
          {description}
        </p>

        {/* Button */}
        <div
          className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium transition-all ${styles.button} text-snow-white group-hover:shadow-md`}
        >
          {buttonText}
          <span className="transition-transform group-hover:translate-x-0.5">→</span>
        </div>
      </div>
    </Link>
  );
}

export function HeroSection() {
  const t = useTranslations('HomePage.hero');
  const hasHeroImage = true;

  return (
    <section className="relative overflow-hidden">
      {/* Optional background image */}
      {hasHeroImage && (
        <div className="absolute inset-0 z-0">
          <Image
            src="/images/hero-background.webp"
            alt=""
            fill
            className="object-cover opacity-20"
            placeholder="blur"
            blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAMCAgMCAgMDAwMEAwMEBQgFBQQEBQoHBwYIDAoMCwsKCwsNDhIQDQ4RDgsLEBYQERMUFRUVDA8XGBYUGBIUFRT/2wBDAQMEBAUEBQkFBQkUDQsNFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBT/wAARCAAIAAoDASIAAhEBAxEB/8QAFgABAQEAAAAAAAAAAAAAAAAAAAcI/8QAIhAAAQQBBAMBAAAAAAAAAAAAAQIDBBEABQYSIRMxQVH/xAAVAQEBAAAAAAAAAAAAAAAAAAADBf/EABoRAAICAwAAAAAAAAAAAAAAAAECAAMREiH/2gAMAwEAAhEDEEAAggbE7eDubIamwJkiQ4srUpLqgAAAPwAVdAn+xjGaZ1VKlT//2Q=="
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-frost-ice/5 via-bg/90 to-bg" />
        </div>
      )}

      {/* Gradient background (always present) */}
      {!hasHeroImage && (
        <div className="absolute inset-0 bg-gradient-to-b from-frost-ice/10 via-frost-ice/5 to-transparent" />
      )}

      {/* Content */}
      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 py-12 sm:py-16 lg:py-20">
        <div className="text-center mb-10 sm:mb-14">
          {/* Main headline */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-polar-night mb-4 tracking-tight">
            <span className="text-frost-ice">{t('discover')}</span>{' '}
            <span className="text-frost-polar">{t('list')}</span>{' '}
            <span className="text-aurora-orange">{t('play')}</span>
          </h1>

          {/* Subheadline */}
          <p className="text-lg sm:text-xl text-text-secondary max-w-3xl mx-auto">
            {t('tagline')}
            <br />
            {t('subtitle')}
          </p>
        </div>

        {/* Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 max-w-7xl mx-auto">
          {/* Browse Games Card */}
          <ActionCard
            href="/browse"
            icon={<ShoppingBag className="w-7 h-7" />}
            title={t('browseCard.title')}
            description={t('browseCard.description')}
            buttonText={t('browseCard.button')}
            color="frost-ice"
          />

          {/* Sell Games Card */}
          <ActionCard
            href="/sell"
            icon={<Tag className="w-7 h-7" />}
            title={t('sellCard.title')}
            description={t('sellCard.description')}
            buttonText={t('sellCard.button')}
            color="frost-polar"
          />

          {/* Wanted Card */}
          <ActionCard
            href="/wanted/new"
            icon={<Bell className="w-7 h-7" />}
            title={t('wantedCard.title')}
            description={t('wantedCard.description')}
            buttonText={t('wantedCard.button')}
            color="aurora-orange"
          />
        </div>
      </div>
    </section>
  );
}
