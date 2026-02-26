# Launch Technical Foundation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the three technical prerequisites for the marketing strategy: wire newsletter into the footer, add a "Founding Seller" badge, and complete the coming soon homepage mode.

**Architecture:** Three independent features. Newsletter footer is a one-line integration. Founding Seller badge requires a DB migration + view update + type update + UI change. Coming soon homepage requires updating `CompactHero` to respect the existing `NEXT_PUBLIC_COMING_SOON` flag.

**Tech Stack:** Next.js 14, Supabase (migration), React, Tailwind CSS, next-intl, Vitest

---

## Task 1: Wire Newsletter Signup Into Footer

**Files:**
- Modify: `packages/marketplace/app/[locale]/layout.tsx:186-192`

The `<NewsletterSignup />` component is fully built but not placed in the footer yet. The footer's `md:col-span-2` brand column is the target.

**Step 1: Add the import and component**

In `packages/marketplace/app/[locale]/layout.tsx`, add the import at the top:

```tsx
import { NewsletterSignup } from '@/components/newsletter/NewsletterSignup';
```

Then in the footer's `md:col-span-2` div (after the tagline paragraph, around line 192), add:

```tsx
<div className="mt-4">
  <NewsletterSignup />
</div>
```

**Step 2: Verify visually**

Run: `pnpm dev:marketplace`
Check: Footer at bottom of homepage shows email input + "Join" button. Submit an email and verify success state shows checkmark.

**Step 3: Commit**

```bash
git add packages/marketplace/app/[locale]/layout.tsx
git commit -m "feat: add newsletter signup to footer"
```

---

## Task 2: Founding Seller Badge — Database Migration

**Files:**
- Create: Supabase migration (via MCP `apply_migration`)

The existing badge system computes `new_seller | trusted_seller | top_seller` from sales + rating. The "Founding Seller" badge is a separate, permanent recognition badge for early adopters. It's stored as a boolean on `seller_profiles` and exposed via `public_seller_profiles`.

**Step 1: Apply the migration**

Use the Supabase MCP `apply_migration` tool with name `add_founding_seller_badge` and the following SQL:

```sql
-- Add founding seller flag to seller_profiles
ALTER TABLE seller_profiles
ADD COLUMN is_founding_seller BOOLEAN NOT NULL DEFAULT FALSE;

-- Add comment for documentation
COMMENT ON COLUMN seller_profiles.is_founding_seller IS 'Permanent badge for sellers who listed before or during launch week';

-- Recreate public_seller_profiles view to include the new column
-- IMPORTANT: Must drop and recreate because we are adding a column
CREATE OR REPLACE VIEW public_seller_profiles WITH (security_invoker = true) AS
SELECT
  user_id,
  seller_status,
  created_at,
  total_reviews,
  average_rating,
  positive_rating_percent,
  total_completed_sales,
  member_since,
  is_founding_seller,
  CASE
    WHEN total_completed_sales >= 25 AND average_rating >= 4.8 THEN 'top_seller'
    WHEN total_completed_sales >= 5 AND average_rating >= 4.5 THEN 'trusted_seller'
    ELSE 'new_seller'
  END AS badge_tier
FROM seller_profiles
WHERE seller_status = 'active';
```

**Step 2: Verify migration**

Use Supabase MCP `execute_sql`:
```sql
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'seller_profiles' AND column_name = 'is_founding_seller';
```

Expected: One row with `boolean`, `false`.

Then verify the view:
```sql
SELECT * FROM public_seller_profiles LIMIT 1;
```

Expected: Result includes `is_founding_seller` column.

**Step 3: Regenerate TypeScript types**

Use Supabase MCP `generate_typescript_types` and update `packages/marketplace/lib/supabase/database.types.ts` with the result.

---

## Task 3: Founding Seller Badge — TypeScript Types

**Files:**
- Modify: `packages/marketplace/lib/types/seller.ts`

**Step 1: Update SellerProfile interface**

In `packages/marketplace/lib/types/seller.ts`, add `is_founding_seller` to the `SellerProfile` interface after the `member_since` field:

```typescript
  member_since: string | null;

  // Founding seller recognition
  is_founding_seller: boolean;
```

**Step 2: Update SellerTrustInfo interface**

Add to `SellerTrustInfo`:

```typescript
  memberSince: string | null;
  isFoundingSeller: boolean;
}
```

**Step 3: Update SellerTrustSummary interface**

Add to `SellerTrustSummary`:

```typescript
  badge_tier: SellerBadgeTier;
  is_founding_seller: boolean;
}
```

**Step 4: Run type-check**

Run: `pnpm type-check`
Expected: There may be errors in files that construct these types without the new field — note them for the next task.

**Step 5: Commit**

```bash
git add packages/marketplace/lib/types/seller.ts
git commit -m "feat: add founding seller flag to TypeScript types"
```

---

## Task 4: Founding Seller Badge — UI Component

**Files:**
- Modify: `packages/marketplace/components/seller/SellerTrustBadge.tsx`
- Modify: `packages/marketplace/messages/en.json`
- Modify: `packages/marketplace/messages/lv.json`

**Step 1: Add translation keys**

In `messages/en.json`, add to the `SellerDashboard.SellerTrustBadge.badges` object:

```json
"foundingSeller": "Founding seller"
```

In `messages/lv.json`, add the same key in the equivalent location:

```json
"foundingSeller": "Dibinātājs"
```

**Step 2: Add FoundingSellerPill component**

In `packages/marketplace/components/seller/SellerTrustBadge.tsx`, add a new component after `BadgeTierPill`:

```tsx
/**
 * Founding seller recognition pill — shown alongside trust badge
 */
export function FoundingSellerPill({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const t = useTranslations('SellerDashboard.SellerTrustBadge');

  const sizeStyles = {
    sm: 'text-[10px] px-1.5 py-0.5 gap-0.5',
    md: 'text-xs px-2 py-0.5 gap-1',
    lg: 'text-sm px-2.5 py-1 gap-1',
  };

  const iconSizes = {
    sm: 'w-2.5 h-2.5',
    md: 'w-3 h-3',
    lg: 'w-3.5 h-3.5',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-medium border',
        'bg-aurora-green/10 text-aurora-green border-aurora-green/20',
        sizeStyles[size]
      )}
    >
      <Sparkles className={iconSizes[size]} />
      {t('badges.foundingSeller')}
    </span>
  );
}
```

**Step 3: Show FoundingSellerPill in SellerTrustBadge**

In the `SellerTrustBadge` component, after the `<BadgeTierPill>` line (around line 121), add:

```tsx
      {/* Badge tier */}
      <BadgeTierPill tier={badgeTier} size={size} />

      {/* Founding seller recognition */}
      {trust.isFoundingSeller && <FoundingSellerPill size={size} />}
```

This requires adding `isFoundingSeller` to the destructured props from `trust`. Add it to the destructuring around line 42:

```tsx
  const {
    sellerName,
    sellerAvatar,
    sellerCountry,
    totalSales,
    averageRating,
    totalReviews,
    badgeTier,
    memberSince,
    isFoundingSeller,
  } = trust;
```

**Step 4: Verify visually**

Will need to test with a seller profile that has `is_founding_seller = true` set in the database.

**Step 5: Commit**

```bash
git add packages/marketplace/components/seller/SellerTrustBadge.tsx packages/marketplace/messages/en.json packages/marketplace/messages/lv.json
git commit -m "feat: add founding seller badge pill to seller trust display"
```

---

## Task 5: Founding Seller Badge — Wire Into API Routes

**Files:**
- Modify: `packages/marketplace/app/api/profile/[id]/route.ts` — include `is_founding_seller` in response
- Modify: `packages/marketplace/app/api/seller/trust/route.ts` — include `is_founding_seller` in response

**Step 1: Read both files and find where trust/badge data is constructed**

The profile route likely queries `public_seller_profiles` and maps `is_founding_seller` already (since the view was updated). Verify and add `isFoundingSeller` to the response mapping if needed.

The seller trust route likely constructs a `SellerTrustSummary`. Add `is_founding_seller` to its response.

**Step 2: Update both routes to pass through the founding seller flag**

The exact changes depend on reading the files, but the pattern is:
- Where `badge_tier` is mapped from the DB query, also map `is_founding_seller`
- Pass it through to the response object

**Step 3: Run type-check**

Run: `pnpm type-check`
Expected: PASS

**Step 4: Commit**

```bash
git add packages/marketplace/app/api/profile/[id]/route.ts packages/marketplace/app/api/seller/trust/route.ts
git commit -m "feat: expose founding seller flag in profile and trust API routes"
```

---

## Task 6: Coming Soon Homepage — Banner and CTA Replacement

**Files:**
- Modify: `packages/marketplace/components/home/CompactHero.tsx`
- Modify: `packages/marketplace/messages/en.json`
- Modify: `packages/marketplace/messages/lv.json`

Per `DEPLOYMENT.md`, the `NEXT_PUBLIC_COMING_SOON` flag should display a banner on the homepage and disable CTA buttons. This is documented but not implemented in the homepage components.

**Step 1: Add translation keys**

In `messages/en.json`, add to `HomePage.hero`:

```json
"comingSoonBanner": "We're launching soon. Sign up to be the first to know.",
"comingSoonButton": "Coming soon"
```

Same keys in `messages/lv.json` with Latvian translations.

**Step 2: Update CompactHero to check the flag**

In `packages/marketplace/components/home/CompactHero.tsx`:

Add a constant at the top of the `CompactHero` component:

```tsx
const isComingSoon = process.env.NEXT_PUBLIC_COMING_SOON === 'true';
```

**Step 3: Add the banner**

Inside the `{/* Content */}` div, before the `text-center mb-5` heading div, conditionally render a banner:

```tsx
{isComingSoon && (
  <div className="mb-4 rounded-lg bg-frost-ice/10 border border-frost-ice/20 px-4 py-3 text-center">
    <p className="text-sm text-frost-700 font-medium">
      {t('comingSoonBanner')}
    </p>
  </div>
)}
```

**Step 4: Disable action card CTAs**

Modify `MiniActionCard` to accept an optional `disabled` prop:

```tsx
interface MiniActionCardProps {
  href: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  buttonText: string;
  color: ColorVariant;
  disabled?: boolean;
}
```

When `disabled` is true, render a `<div>` instead of `<Link>`, and swap the button style:

```tsx
function MiniActionCard({ href, icon, title, description, buttonText, color, disabled }: MiniActionCardProps) {
  const styles = colorStyles[color];
  const Wrapper = disabled ? 'div' : Link;
  const wrapperProps = disabled ? {} : { href };

  return (
    <Wrapper {...wrapperProps} className={disabled ? 'block h-full' : 'block h-full'}>
      <div
        className={cn(
          'relative h-full p-4 sm:p-5 rounded-xl border transition-all duration-200 bg-snow-white',
          disabled
            ? 'border-border opacity-75 cursor-default'
            : `border-border ${styles.border} hover:shadow-md cursor-pointer group`
        )}
      >
        {/* ... icon, title, description unchanged ... */}

        <div
          className={cn(
            'inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all',
            disabled
              ? 'bg-bg-secondary text-text-muted'
              : `${styles.button} text-snow-white group-hover:shadow-sm`
          )}
        >
          {buttonText}
          {!disabled && (
            <span className="transition-transform group-hover:translate-x-0.5">→</span>
          )}
        </div>
      </div>
    </Wrapper>
  );
}
```

Then pass `disabled={isComingSoon}` and override `buttonText` for each card:

```tsx
<MiniActionCard
  href="/browse"
  icon={<Checkerboard className="w-5 h-5" />}
  title={t('browseCard.title')}
  description={t('browseCard.description')}
  buttonText={isComingSoon ? t('comingSoonButton') : t('browseCard.button')}
  color="frost-ice"
  disabled={isComingSoon}
/>
```

Same pattern for all three cards.

**Step 5: Verify locally**

Set `NEXT_PUBLIC_COMING_SOON=true` in `.env.local`, restart dev server.
Check: Banner visible, cards greyed out with "Coming soon" buttons, no navigation on click.
Then unset the flag and verify normal behavior returns.

**Step 6: Commit**

```bash
git add packages/marketplace/components/home/CompactHero.tsx packages/marketplace/messages/en.json packages/marketplace/messages/lv.json
git commit -m "feat: add coming soon banner and disabled CTAs to homepage"
```

---

## Task 7: Coming Soon Homepage — Newsletter Prominence

**Files:**
- Modify: `packages/marketplace/components/home/CompactHero.tsx`

When in coming soon mode, the hero should prominently feature the newsletter signup so visitors can subscribe for launch updates.

**Step 1: Add newsletter signup below the hero heading when coming soon**

Import `NewsletterSignup` at the top of `CompactHero.tsx`:

```tsx
import { NewsletterSignup } from '@/components/newsletter/NewsletterSignup';
```

After the tagline `<p>` tag and before the action cards grid, add:

```tsx
{isComingSoon && (
  <div className="max-w-md mx-auto mb-5">
    <NewsletterSignup />
  </div>
)}
```

**Step 2: Verify locally**

With `NEXT_PUBLIC_COMING_SOON=true`: Newsletter signup appears prominently between tagline and (disabled) action cards.
Without: No newsletter in the hero (it lives in the footer only).

**Step 3: Commit**

```bash
git add packages/marketplace/components/home/CompactHero.tsx
git commit -m "feat: show newsletter signup in hero during coming soon mode"
```

---

## Task 8: Type-Check and Build Verification

**Step 1: Run type-check**

Run: `pnpm type-check`
Expected: PASS. Fix any remaining type errors from the `is_founding_seller` additions.

**Step 2: Run linter**

Run: `pnpm lint`
Expected: PASS.

**Step 3: Run tests**

Run: `pnpm test`
Expected: All existing tests pass.

**Step 4: Run full build**

Run: `pnpm build:ds && pnpm build:marketplace`
Expected: Build succeeds.

**Step 5: Commit any fixes**

If fixes were needed, commit them separately.

---

## Verification Checklist

- [ ] Footer shows newsletter signup with email input and "Join" button
- [ ] Newsletter signup works (submit email → success checkmark)
- [ ] Setting `NEXT_PUBLIC_COMING_SOON=true` shows:
  - Banner in hero: "We're launching soon..."
  - Newsletter signup prominent in hero
  - All three action cards disabled with "Coming soon" buttons
  - No navigation when clicking disabled cards
- [ ] Setting `NEXT_PUBLIC_COMING_SOON=false` (or unset) shows normal homepage
- [ ] Founding seller pill appears on seller profiles with `is_founding_seller = true`
- [ ] `pnpm type-check` passes
- [ ] `pnpm build:ds && pnpm build:marketplace` succeeds
