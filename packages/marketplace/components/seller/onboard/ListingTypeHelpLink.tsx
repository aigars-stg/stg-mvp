'use client';

import Link from 'next/link';
import { HelpCircle } from 'griddy-icons';
import { useTranslations } from 'next-intl';

interface ListingTypeHelpLinkProps {
  variant?: 'onboarding' | 'listing';
}

export function ListingTypeHelpLink({ variant = 'onboarding' }: ListingTypeHelpLinkProps) {
  const tOnboard = useTranslations('SellerOnboard.step2');
  const tListing = useTranslations('Sell.transactionMethod');

  const text = variant === 'onboarding' ? tOnboard('helpLink') : tListing('helpLink');

  return (
    <Link
      href="/help/listing-types"
      className="inline-flex items-center gap-1.5 text-sm text-frost-ice hover:underline"
    >
      <HelpCircle className="w-4 h-4" />
      {text}
    </Link>
  );
}
