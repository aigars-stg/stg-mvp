# Review System Enhancements Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Close three gaps in the existing review system: add a review CTA on the buyer order page, add review report+hide moderation, and surface recent reviews on the seller dashboard.

**Architecture:** All three features build on the existing `seller_reviews` table, `SellerReviewsList` component, and `/api/reviews` endpoints. The moderation feature adds two DB columns (`is_hidden`, `reported_by`/`report_reason`) and a staff API endpoint. The order page CTA checks review existence via a lightweight API call. The dashboard section reuses `SellerReviewsList` with data fetched client-side.

**Tech Stack:** Next.js 14 App Router, Supabase (Postgres + RLS), Tailwind CSS, next-intl translations, Vitest for tests.

---

## Feature 1: "Leave a Review" CTA on Buyer Order Detail Page

### Task 1: Add review status to order detail hook

**Files:**
- Modify: `packages/marketplace/lib/hooks/useOrderDetail.ts`

**Step 1: Add review state to the hook**

In `useOrderDetail.ts`, add state for tracking whether a review exists:

```typescript
// After line 145 (actionSuccess state)
const [hasReview, setHasReview] = useState<boolean | null>(null);
```

**Step 2: Fetch review status after order data loads**

Add a review check inside `fetchData` callback, after line 174 (`setData(result)`):

```typescript
// Check if buyer has already reviewed this order
if (result.current_user.role === 'buyer' &&
    (result.order.status === 'delivered' || result.order.status === 'completed')) {
  try {
    const reviewRes = await fetch(`/api/reviews?order_id=${orderId}`);
    if (reviewRes.ok) {
      const reviewData = await reviewRes.json();
      setHasReview(reviewData.reviews?.length > 0);
    }
  } catch {
    // Non-critical — don't block order page
  }
}
```

**Step 3: Expose `hasReview` from the hook return**

Add to `UseOrderDetailReturn` interface:

```typescript
hasReview: boolean | null;
```

Add to the return object:

```typescript
hasReview,
```

**Step 4: Update the GET /api/reviews to support order_id filter**

In `packages/marketplace/app/api/reviews/route.ts`, update the GET handler to also accept `order_id` as an alternative to `seller_id`:

```typescript
const orderId = searchParams.get('order_id');

if (!sellerId && !orderId) {
  return NextResponse.json(
    { error: 'seller_id or order_id is required' },
    { status: 400 }
  );
}

// Build query
let query = supabase
  .from('seller_reviews_with_buyer')
  .select('*', { count: 'exact' })
  .order('created_at', { ascending: false });

if (orderId) {
  query = query.eq('order_id', orderId);
} else {
  query = query.eq('seller_id', sellerId!);
}

const { data: reviews, error: reviewsError, count } = await query
  .range(offset, offset + limit - 1);
```

**Step 5: Commit**

```bash
git add packages/marketplace/lib/hooks/useOrderDetail.ts packages/marketplace/app/api/reviews/route.ts
git commit -m "feat(reviews): add review status check to order detail hook"
```

### Task 2: Add review CTA banner to order detail page

**Files:**
- Modify: `packages/marketplace/app/[locale]/orders/[id]/page.tsx`
- Modify: `packages/marketplace/messages/en.json`

**Step 1: Add translations**

In `packages/marketplace/messages/en.json`, inside `Orders.detail`, add:

```json
"review": {
  "title": "How was your experience?",
  "description": "Share your feedback to help other buyers",
  "button": "Leave a review",
  "alreadyReviewed": "You reviewed this order"
}
```

**Step 2: Import Star icon and Link component**

Already imported. Add `Star` to the icons import in `page.tsx`:

```typescript
import { Star } from '@/lib/icons';
```

Verify `Star` is in the icons library, otherwise use whatever star icon is already used in the review page.

**Step 3: Destructure `hasReview` from the hook**

In the destructured return from `useOrderDetail()`, add `hasReview`.

**Step 4: Add the review CTA banner**

Insert after the `<OrderActions>` block (after line 375) and before the Messages section, only when the user is a buyer:

```tsx
{/* Review CTA */}
{current_user.role === 'buyer' &&
  (order.status === 'delivered' || order.status === 'completed') && (
  <div className="bg-snow-white border border-border rounded-xl p-4 sm:p-6">
    {hasReview === false ? (
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-50 rounded-lg flex items-center justify-center flex-shrink-0">
            <Star className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h3 className="font-semibold text-polar-night">
              {t('review.title')}
            </h3>
            <p className="text-sm text-text-secondary">
              {t('review.description')}
            </p>
          </div>
        </div>
        <Link href={`/orders/${order.id}/review`}>
          <Button variant="accent" size="sm">
            {t('review.button')}
          </Button>
        </Link>
      </div>
    ) : hasReview === true ? (
      <div className="flex items-center gap-3 text-text-secondary">
        <CheckCircle className="w-5 h-5 text-aurora-green flex-shrink-0" />
        <span className="text-sm">{t('review.alreadyReviewed')}</span>
      </div>
    ) : null}
  </div>
)}
```

**Step 5: Run type-check**

```bash
cd packages/marketplace && npx tsc --noEmit
```

**Step 6: Commit**

```bash
git add packages/marketplace/app/[locale]/orders/[id]/page.tsx packages/marketplace/messages/en.json
git commit -m "feat(reviews): add review CTA banner on buyer order page"
```

### Task 3: Add translations for other locales

**Files:**
- Modify: `packages/marketplace/messages/lv.json`
- Modify: `packages/marketplace/messages/lt.json`
- Modify: `packages/marketplace/messages/et.json`

Use the `/translate` skill to add the `Orders.detail.review` keys to all locales.

**Step 1: Commit**

```bash
git add packages/marketplace/messages/*.json
git commit -m "feat(reviews): add review CTA translations for lv, lt, et"
```

---

## Feature 2: Review Report + Hide Moderation

### Task 4: Database migration — add moderation columns

**Files:**
- Migration via Supabase MCP

**Step 1: Apply migration**

Use `mcp__supabase__apply_migration` with name `add_review_moderation_columns`:

```sql
-- Add moderation columns to seller_reviews
ALTER TABLE seller_reviews
  ADD COLUMN is_hidden BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN reported_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN report_reason TEXT CHECK (char_length(report_reason) <= 500),
  ADD COLUMN reported_at TIMESTAMPTZ;

-- Add index for staff queries on hidden/reported reviews
CREATE INDEX idx_seller_reviews_moderation ON seller_reviews (is_hidden, reported_at DESC)
  WHERE is_hidden = TRUE OR reported_at IS NOT NULL;

-- Update the public-facing view to exclude hidden reviews
CREATE OR REPLACE VIEW seller_reviews_with_buyer WITH (security_invoker = true) AS
SELECT
  sr.id,
  sr.order_id,
  sr.buyer_id,
  sr.seller_id,
  sr.rating,
  sr.review_text,
  sr.seller_response,
  sr.seller_responded_at,
  sr.is_hidden,
  sr.reported_at,
  sr.created_at,
  sr.updated_at,
  up.full_name AS buyer_name,
  up.avatar_url AS buyer_avatar,
  up.country AS buyer_country,
  o.order_number,
  (SELECT oi.game_name FROM order_items oi WHERE oi.order_id = sr.order_id LIMIT 1) AS game_name
FROM seller_reviews sr
JOIN user_profiles up ON sr.buyer_id = up.id
JOIN orders o ON sr.order_id = o.id;

-- Update the trigger function to exclude hidden reviews from stats
CREATE OR REPLACE FUNCTION update_seller_review_stats()
RETURNS TRIGGER AS $$
DECLARE
  v_seller_id UUID;
  v_total INTEGER;
  v_avg DECIMAL(2,1);
  v_positive_pct INTEGER;
BEGIN
  v_seller_id := COALESCE(NEW.seller_id, OLD.seller_id);

  SELECT COUNT(*), ROUND(AVG(rating), 1), ROUND(100.0 * COUNT(*) FILTER (WHERE rating >= 4) / NULLIF(COUNT(*), 0))
  INTO v_total, v_avg, v_positive_pct
  FROM seller_reviews WHERE seller_id = v_seller_id AND is_hidden = FALSE;

  UPDATE seller_profiles SET
    total_reviews = COALESCE(v_total, 0),
    average_rating = COALESCE(v_avg, 0),
    positive_rating_percent = COALESCE(v_positive_pct, 0),
    updated_at = NOW()
  WHERE user_id = v_seller_id;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
```

**Step 2: Verify migration**

```bash
# Use db skill to verify columns exist
```

### Task 5: Add report review API endpoint

**Files:**
- Create: `packages/marketplace/app/api/reviews/[id]/report/route.ts`

**Step 1: Create the report endpoint**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth-middleware';
import { handleApiError } from '@/lib/api/error-handler';

/**
 * POST /api/reviews/[id]/report
 *
 * Report a review as inappropriate.
 * Body:
 * - reason: required - why the review is being reported (max 500 chars)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { response: authResponse, user, supabase } = await requireAuth();
    if (authResponse) return authResponse;

    const reviewId = params.id;
    const body = await request.json();
    const { reason } = body;

    if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
      return NextResponse.json(
        { error: 'reason is required' },
        { status: 400 }
      );
    }

    if (reason.length > 500) {
      return NextResponse.json(
        { error: 'reason must be 500 characters or less' },
        { status: 400 }
      );
    }

    // Get the review
    const { data: review, error: reviewError } = await supabase
      .from('seller_reviews')
      .select('id, reported_at')
      .eq('id', reviewId)
      .single();

    if (reviewError || !review) {
      return NextResponse.json(
        { error: 'Review not found' },
        { status: 404 }
      );
    }

    // Check if already reported
    if (review.reported_at) {
      return NextResponse.json(
        { error: 'This review has already been reported' },
        { status: 400 }
      );
    }

    // Update the review with report info
    const { error: updateError } = await supabase
      .from('seller_reviews')
      .update({
        reported_by: user.id,
        report_reason: reason.trim(),
        reported_at: new Date().toISOString(),
      })
      .eq('id', reviewId);

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to report review', details: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error, 'Report review');
  }
}
```

**Step 2: Commit**

```bash
git add packages/marketplace/app/api/reviews/[id]/report/route.ts
git commit -m "feat(reviews): add report review API endpoint"
```

### Task 6: Add staff hide review API endpoint

**Files:**
- Create: `packages/marketplace/app/api/staff/reviews/[id]/hide/route.ts`

**Step 1: Create the staff hide endpoint**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth-middleware';
import { handleApiError } from '@/lib/api/error-handler';
import { createServiceClient } from '@/lib/supabase/client';

/**
 * POST /api/staff/reviews/[id]/hide
 *
 * Staff endpoint to hide a reported review.
 * Requires is_staff = true on user_profiles.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { response: authResponse, user } = await requireAuth();
    if (authResponse) return authResponse;

    const adminSupabase = createServiceClient();

    // Check staff role
    const { data: userProfile } = await adminSupabase
      .from('user_profiles')
      .select('is_staff')
      .eq('id', user.id)
      .single();

    if (!userProfile?.is_staff) {
      return NextResponse.json(
        { error: 'Staff access required' },
        { status: 403 }
      );
    }

    const reviewId = params.id;

    // Hide the review (using service client to bypass RLS)
    const { error: updateError } = await adminSupabase
      .from('seller_reviews')
      .update({ is_hidden: true })
      .eq('id', reviewId);

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to hide review', details: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error, 'Hide review');
  }
}
```

**Step 2: Commit**

```bash
git add packages/marketplace/app/api/staff/reviews/[id]/hide/route.ts
git commit -m "feat(reviews): add staff hide review API endpoint"
```

### Task 7: Update GET /api/reviews to filter hidden reviews

**Files:**
- Modify: `packages/marketplace/app/api/reviews/route.ts`

**Step 1: Add `is_hidden = false` filter to GET query**

In the GET handler, add `.eq('is_hidden', false)` to the query chain before `.range()`:

```typescript
query = query.eq('is_hidden', false);
```

**Step 2: Commit**

```bash
git add packages/marketplace/app/api/reviews/route.ts
git commit -m "feat(reviews): filter hidden reviews from public API"
```

### Task 8: Add report button to ReviewCard component

**Files:**
- Modify: `packages/marketplace/components/seller/SellerReviewsList.tsx`
- Modify: `packages/marketplace/messages/en.json`

**Step 1: Add translations**

In `en.json`, inside `SellerDashboard.SellerReviewsList`, add:

```json
"reportReview": "Report review",
"reportReason": "Why are you reporting this review?",
"reportReasonPlaceholder": "Describe why this review is inappropriate...",
"reportSubmit": "Report",
"reportSuccess": "Review reported. Our team will review it.",
"reported": "Reported"
```

**Step 2: Add report props to SellerReviewsList**

Add to `SellerReviewsListProps`:

```typescript
/** Current user can report reviews */
canReport?: boolean;
onReport?: (reviewId: string, reason: string) => Promise<void>;
```

Pass through to `ReviewCard`.

**Step 3: Add report UI to ReviewCard**

Add a "Report" button (flag icon + text) that expands a small form with a reason textarea and submit button. Only show when `canReport` is true, `!review.seller_response` condition is not relevant here — any review can be reported. Show a "Reported" badge if `review.reported_at` exists.

The report button should appear as a small text link below the review, similar to the "Respond to review" pattern:

```tsx
{canReport && !review.reported_at && (
  <button
    onClick={() => setShowReportForm(true)}
    className="text-xs text-text-muted hover:text-aurora-red flex items-center gap-1 mt-2"
  >
    <AlertTriangle className="w-3 h-3" />
    {t('reportReview')}
  </button>
)}
{review.reported_at && (
  <span className="text-xs text-aurora-red mt-2 flex items-center gap-1">
    <AlertTriangle className="w-3 h-3" />
    {t('reported')}
  </span>
)}
```

Add `reported_at` to the `Review` interface in the component.

**Step 4: Commit**

```bash
git add packages/marketplace/components/seller/SellerReviewsList.tsx packages/marketplace/messages/en.json
git commit -m "feat(reviews): add report button to review cards"
```

### Task 9: Add translations for report feature to other locales

Use `/translate` skill for `SellerDashboard.SellerReviewsList` report keys across lv, lt, et.

**Step 1: Commit**

```bash
git add packages/marketplace/messages/*.json
git commit -m "feat(reviews): add report review translations for lv, lt, et"
```

---

## Feature 3: Recent Reviews Section on Seller Dashboard

### Task 10: Add recent reviews section to seller dashboard

**Files:**
- Modify: `packages/marketplace/app/[locale]/seller/dashboard/page.tsx`
- Modify: `packages/marketplace/messages/en.json`

**Step 1: Add translations**

In `en.json`, inside `SellerDashboard`, add:

```json
"recentReviews": {
  "title": "Recent Reviews",
  "viewAll": "View all reviews",
  "noReviews": "No reviews yet",
  "noReviewsHint": "Reviews from buyers will appear here after your first completed sale"
}
```

**Step 2: Add state and fetch logic for reviews**

In the seller dashboard page, add state for reviews:

```typescript
const [reviews, setReviews] = useState<Review[]>([]);
const [reviewStats, setReviewStats] = useState<{ total: number; average: number; positive: number } | null>(null);
```

Add a `Review` interface matching what `SellerReviewsList` expects (same as in the component).

In the `checkAuth` function, after fetching pending orders, fetch recent reviews:

```typescript
// Fetch recent reviews
try {
  const reviewsRes = await fetch(`/api/reviews?seller_id=${user.id}&limit=3`);
  if (reviewsRes.ok) {
    const reviewsData = await reviewsRes.json();
    setReviews(reviewsData.reviews || []);
    if (reviewsData.trust_summary) {
      setReviewStats({
        total: reviewsData.trust_summary.total_reviews || 0,
        average: reviewsData.trust_summary.average_rating || 0,
        positive: reviewsData.trust_summary.positive_rating_percent || 0,
      });
    }
  }
} catch {
  // Non-critical
}
```

**Step 3: Import SellerReviewsList and add section to UI**

Import the component:

```typescript
import { SellerReviewsList } from '@/components/seller/SellerReviewsList';
```

Add the reviews section after the Wallet Balance section (after line 256), before the Bank Account section:

```tsx
{/* Recent Reviews */}
<div className="bg-snow-white border-2 border-border rounded-xl p-6">
  <div className="flex items-center justify-between mb-4">
    <h3 className="text-lg font-semibold text-polar-night">
      {t('recentReviews.title')}
    </h3>
    {reviews.length > 0 && (
      <Link
        href={`/profile/${user?.id}`}
        className="text-sm text-frost-ice hover:text-frost-ice/80 transition-colors"
      >
        {t('recentReviews.viewAll')}
      </Link>
    )}
  </div>
  {reviews.length > 0 ? (
    <SellerReviewsList
      reviews={reviews}
      totalReviews={reviewStats?.total || 0}
      averageRating={reviewStats?.average || 0}
      positivePercent={reviewStats?.positive || 0}
      hasMore={false}
      showBreakdown={false}
      canRespond={true}
      onRespond={async (reviewId, response) => {
        const res = await fetch(`/api/reviews/${reviewId}/respond`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ response }),
        });
        if (!res.ok) throw new Error('Failed to respond');
        setRefreshKey(prev => prev + 1);
      }}
    />
  ) : (
    <div className="text-center py-6 text-text-secondary">
      <Star className="w-10 h-10 mx-auto mb-2 text-text-muted opacity-50" />
      <p className="text-sm">{t('recentReviews.noReviews')}</p>
      <p className="text-xs text-text-muted mt-1">{t('recentReviews.noReviewsHint')}</p>
    </div>
  )}
</div>
```

Also import `Star` icon.

**Step 4: Run type-check**

```bash
cd packages/marketplace && npx tsc --noEmit
```

**Step 5: Commit**

```bash
git add packages/marketplace/app/[locale]/seller/dashboard/page.tsx packages/marketplace/messages/en.json
git commit -m "feat(reviews): add recent reviews section to seller dashboard"
```

### Task 11: Add dashboard review translations for other locales

Use `/translate` skill for `SellerDashboard.recentReviews` keys across lv, lt, et.

**Step 1: Commit**

```bash
git add packages/marketplace/messages/*.json
git commit -m "feat(reviews): add dashboard review translations for lv, lt, et"
```

---

## Task 12: Final verification

**Step 1: Run type-check**

```bash
cd packages/marketplace && npx tsc --noEmit
```

**Step 2: Run tests**

```bash
pnpm test
```

**Step 3: Build**

```bash
pnpm build:ds && pnpm build:marketplace
```

**Step 4: Manual verification checklist**
- [ ] Order page (delivered/completed): Review CTA banner visible for buyer
- [ ] Order page (already reviewed): Shows "You reviewed this order"
- [ ] Order page (pending/shipped): No review CTA shown
- [ ] Seller dashboard: Recent reviews section visible
- [ ] Seller dashboard: Can respond to reviews inline
- [ ] Review card: Report button visible for logged-in users
- [ ] Report form: Submits successfully, shows confirmation
- [ ] Hidden reviews: Not visible in public review lists
