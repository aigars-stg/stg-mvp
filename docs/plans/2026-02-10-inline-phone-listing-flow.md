# Inline Phone Collection During Listing Creation

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** When a seller selects "Instant Buy" and has no phone on file, show an inline phone input in the listing form instead of failing at submit time.

**Architecture:** Add `hasPhone` to the onboarding status response. Track phone state in the sell page. Render a contextual phone input inside `TransactionMethodSelector` when instant_buy is selected and phone is missing. On submit, save the phone to the user profile via the existing `updateProfile` before creating the listing. Keep the backend phone check as a safety net.

**Tech Stack:** Next.js, React, Supabase, next-intl translations

---

### Task 1: Add `has_phone` to onboarding status API

**Files:**
- Modify: `packages/marketplace/app/api/seller/onboarding/status/route.ts`

**Step 1: Add phone lookup to the API response**

In `route.ts`, after fetching the seller profile, also fetch the user's phone from `user_profiles`:

```ts
// After the existing sellerProfile query, add:
const { data: userProfile } = await supabase
  .from('user_profiles')
  .select('phone')
  .eq('id', user.id)
  .single();

const hasPhone = !!(userProfile?.phone && userProfile.phone.trim() !== '');
```

Add `has_phone: hasPhone` to the `statusData` object.

**Step 2: Commit**

```bash
git add packages/marketplace/app/api/seller/onboarding/status/route.ts
git commit -m "feat: add has_phone to seller onboarding status API"
```

---

### Task 2: Add translations for the inline phone prompt

**Files:**
- Modify: `packages/marketplace/messages/en.json`
- Modify: `packages/marketplace/messages/lv.json`

**Step 1: Add translation keys**

Add under `Sell.transactionMethod.instantBuy`:

```json
"phoneRequired": {
  "label": "Phone number required",
  "description": "Unisend parcel lockers need your phone number to create shipping labels. This will be saved to your profile.",
  "placeholder": "+371 12345678",
  "formatHint": "Format: {example}",
  "saving": "Saving...",
  "saved": "Phone saved"
}
```

Add equivalent Latvian translations under the same path in `lv.json`:

```json
"phoneRequired": {
  "label": "Nepieciešams tālruņa numurs",
  "description": "Unisend pakomāti izmanto tālruņa numuru sūtījuma uzlīmju izveidei. Tas tiks saglabāts tavā profilā.",
  "placeholder": "+371 12345678",
  "formatHint": "Formāts: {example}",
  "saving": "Saglabā...",
  "saved": "Tālrunis saglabāts"
}
```

**Step 2: Commit**

```bash
git add packages/marketplace/messages/en.json packages/marketplace/messages/lv.json
git commit -m "feat: add translations for inline phone input in listing form"
```

---

### Task 3: Add phone state tracking to the sell page

**Files:**
- Modify: `packages/marketplace/app/[locale]/sell/page.tsx`

**Step 1: Add phone state and fetch it from onboarding status**

In the sell page, add state for tracking seller phone:

```ts
const [sellerPhone, setSellerPhone] = useState<string | null>(null);
const [hasPhone, setHasPhone] = useState(true); // default true to avoid flash
```

In the existing `fetchOnboardingStatus` function (around line 387), after parsing the response data, add:

```ts
setHasPhone(data.has_phone ?? true);
```

**Step 2: Pass phone state to TransactionMethodSelector**

Update the `TransactionMethodSelector` usage (around line 1065) to pass phone-related props:

```tsx
<TransactionMethodSelector
  value={formData.transactionMethod}
  onChange={(method) => setFormData((prev) => ({
    ...prev,
    transactionMethod: method,
  }))}
  canUseInstantBuy={sellerCapabilities.canCreateInstantBuy}
  onUpgradeClick={() => router.push('/seller/settings/payouts')}
  hasPhone={hasPhone}
  onPhoneChange={(phone) => setSellerPhone(phone)}
/>
```

**Step 3: Save phone before listing creation on submit**

In the submit handler (around line 879, before the `fetch('/api/listings', ...)` call), add:

```ts
// Save phone to profile if newly entered
if (sellerPhone && !hasPhone) {
  const { error: phoneError } = await updateProfile({ phone: sellerPhone.trim() });
  if (phoneError) {
    setErrorModal({
      isOpen: true,
      message: 'Failed to save phone number. Please try again.',
    });
    return;
  }
  setHasPhone(true);
}
```

This requires `updateProfile` from `useAuth()` — which is already destructured at the top of the component.

**Step 4: Remove the old requiresPhone error handler**

Remove the `if (errorData.requiresPhone)` block (lines 891-899) from the submit handler. The backend check stays as a safety net but the frontend will no longer hit it.

**Step 5: Commit**

```bash
git add packages/marketplace/app/[locale]/sell/page.tsx
git commit -m "feat: track phone state and save inline before listing creation"
```

---

### Task 4: Add inline phone input to TransactionMethodSelector

**Files:**
- Modify: `packages/marketplace/components/sell/TransactionMethodSelector.tsx`

**Step 1: Update the component interface and add phone input**

Add new props to the interface:

```ts
interface TransactionMethodSelectorProps {
  value: TransactionMethod;
  onChange: (method: TransactionMethod) => void;
  canUseInstantBuy: boolean;
  onUpgradeClick?: () => void;
  hasPhone?: boolean;
  onPhoneChange?: (phone: string) => void;
}
```

Destructure `hasPhone = true` and `onPhoneChange` from props.

After the Instant Buy button (after the closing `</button>` at line ~121), add a conditional phone input that renders when `value === 'instant_buy' && !hasPhone`:

```tsx
{value === 'instant_buy' && !hasPhone && onPhoneChange && (
  <div className="sm:col-span-2 p-4 rounded-lg border border-aurora-orange/30 bg-aurora-orange/5">
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 rounded-lg bg-aurora-orange/10 flex items-center justify-center flex-shrink-0 mt-0.5">
        <Phone className="w-4 h-4 text-aurora-orange" />
      </div>
      <div className="flex-1 min-w-0 space-y-2">
        <div>
          <p className="text-sm font-medium text-polar-night">
            {t('instantBuy.phoneRequired.label')}
          </p>
          <p className="text-xs text-text-secondary mt-0.5">
            {t('instantBuy.phoneRequired.description')}
          </p>
        </div>
        <input
          type="tel"
          onChange={(e) => onPhoneChange(e.target.value)}
          placeholder={t('instantBuy.phoneRequired.placeholder')}
          className="w-full px-3 py-2 rounded-lg border border-border bg-white text-sm text-polar-night placeholder-text-muted focus:outline-none focus:border-frost-ice focus:ring-2 focus:ring-frost-ice/20"
          maxLength={20}
        />
      </div>
    </div>
  </div>
)}
```

Import `Phone` icon from `griddy-icons` at the top.

**Step 2: Commit**

```bash
git add packages/marketplace/components/sell/TransactionMethodSelector.tsx
git commit -m "feat: show inline phone input when instant_buy selected without phone"
```

---

### Task 5: Validate phone before submit

**Files:**
- Modify: `packages/marketplace/app/[locale]/sell/page.tsx`

**Step 1: Add phone validation to the publish guard**

In the submit handler, before saving the phone, validate it's not empty when instant_buy is selected and the seller had no phone:

```ts
// Validate phone is provided for instant_buy if seller didn't have one
if (formData.transactionMethod === 'instant_buy' && !hasPhone) {
  if (!sellerPhone || sellerPhone.trim() === '') {
    setErrorModal({
      isOpen: true,
      message: 'Please enter your phone number to enable shipping for Instant Buy listings.',
    });
    return;
  }
}
```

This goes early in the submit handler, before the photo upload section.

**Step 2: Build and verify**

```bash
cd /Users/secondturn/stg-mvp && pnpm build:ds && pnpm build:marketplace
```

**Step 3: Commit**

```bash
git add packages/marketplace/app/[locale]/sell/page.tsx
git commit -m "feat: validate phone before instant_buy listing submission"
```

---

### Task 6: Verify end-to-end

**Manual testing checklist:**
1. Go to `/sell` as an active seller WITHOUT a phone number on profile
2. Select "Instant Buy" — phone input should appear below the option
3. Leave phone empty, try to publish — should get validation error
4. Enter a phone number, publish — phone should be saved to profile, listing created
5. Go to `/sell` again — phone input should NOT appear (already saved)
6. Select "Contact Seller" — phone input should NOT appear regardless
7. Test with a seller who ALREADY has a phone — phone input should never appear
