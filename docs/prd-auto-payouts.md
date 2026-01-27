# PRD: Threshold Auto-Payouts

**Feature**: Automatic Payouts with Configurable Threshold
**Priority**: High
**Status**: Draft
**Last Updated**: January 2026

---

## Overview

Replace the current manual payout system with automatic threshold-based payouts. When a seller's balance reaches their configured threshold, funds are automatically transferred to their bank account on a weekly schedule.

### Goals

1. **Reduce friction** — Sellers don't need to remember to request payouts
2. **Improve satisfaction** — Money arrives automatically
3. **Differentiate from competitors** — Free payouts (we absorb Stripe fee)
4. **Reduce support load** — Fewer "where's my money?" inquiries

---

## Current State

- Sellers manually request payouts via dashboard
- €5.00 minimum payout
- €0.30 Stripe fee deducted from payout amount
- No automated payout scheduling

## Proposed State

- Automatic payouts when balance ≥ threshold
- Weekly payout schedule (Mondays)
- Configurable threshold: €10, €20, €50, €100 (default €20)
- **Platform absorbs €0.30 Stripe fee** — seller receives full amount
- Manual payout option remains (€5 minimum)
- Dormancy auto-payout after 6 months inactivity

---

## User Stories

### Seller: Set Threshold
> As a seller, I want to choose when automatic payouts happen so I can control how often I receive money.

**Acceptance Criteria:**
- Can select threshold from €10, €20, €50, €100
- Default is €20 for new sellers
- Change takes effect from next payout cycle
- Clear confirmation of current setting

### Seller: Receive Auto-Payout
> As a seller, I want my money sent automatically when I reach my threshold so I don't have to think about it.

**Acceptance Criteria:**
- Payout initiated automatically when balance ≥ threshold
- Processed on weekly schedule (Monday 9:00 UTC)
- Email notification sent when payout initiated
- Full balance transferred (no fee deducted)

### Seller: Request Manual Payout
> As a seller, I want to request a payout immediately if I don't want to wait for auto-payout.

**Acceptance Criteria:**
- Can request payout anytime balance ≥ €5
- No fee charged (platform absorbs)
- Processed within 24 hours
- Auto-payout threshold not affected

### Seller: Close Account with Small Balance
> As a seller closing my account, I want to receive my remaining balance even if it's below €5.

**Acceptance Criteria:**
- Account closure flow offers final payout
- No minimum for closure payouts
- Processed regardless of threshold setting

### Platform: Handle Dormant Balances
> As the platform, we want to return dormant funds to sellers to avoid liability and complaints.

**Acceptance Criteria:**
- Detect balances with no activity for 6 months
- Automatically payout regardless of threshold
- Email notification before dormancy payout (1 week warning)

---

## Technical Specification

### Database Changes

```sql
-- Add to sellers table (or seller_settings)
ALTER TABLE sellers ADD COLUMN payout_threshold_cents INTEGER DEFAULT 2000; -- €20
ALTER TABLE sellers ADD COLUMN auto_payout_enabled BOOLEAN DEFAULT true;
ALTER TABLE sellers ADD COLUMN last_balance_activity_at TIMESTAMP;

-- Track auto-payouts separately
ALTER TABLE seller_payouts ADD COLUMN payout_type VARCHAR(20); -- 'manual', 'auto', 'dormancy', 'closure'
```

### New Cron Job: `/api/cron/process-auto-payouts`

**Schedule:** Weekly, Monday 9:00 UTC

**Logic:**
1. Query sellers where:
   - `auto_payout_enabled = true`
   - `available_balance_cents >= payout_threshold_cents`
   - Stripe account active with payouts enabled
   - Bank account connected
2. For each eligible seller:
   - Create Stripe payout for full available balance
   - Record in `seller_payouts` with `payout_type = 'auto'`
   - Send notification email
3. Log results for monitoring

### New Cron Job: `/api/cron/dormancy-payouts`

**Schedule:** Daily, 2:00 UTC

**Logic:**
1. Query sellers where:
   - `available_balance_cents > 0`
   - `last_balance_activity_at < NOW() - INTERVAL '6 months'`
   - Not already in dormancy warning state
2. Send 1-week warning email
3. After warning period, process payout with `payout_type = 'dormancy'`

### API Endpoints

**GET `/api/seller/payout-settings`**
```json
{
  "auto_payout_enabled": true,
  "payout_threshold_cents": 2000,
  "available_balance_cents": 3500,
  "next_auto_payout_date": "2026-02-03T09:00:00Z",
  "threshold_options": [1000, 2000, 5000, 10000]
}
```

**PATCH `/api/seller/payout-settings`**
```json
{
  "payout_threshold_cents": 5000
}
```

**POST `/api/seller/payouts/request`** (existing, updated)
- Remove fee deduction logic
- Add `payout_type = 'manual'`
- Keep €5 minimum

---

## UI Changes

### Seller Dashboard — Balance Card

**Current:**
```
Available Balance: €35.00
[Request Payout]
```

**Proposed:**
```
┌────────────────────────────────────────┐
│ Your Balance                           │
│                                        │
│ Available: €35.00                      │
│ Pending:   €12.00                      │
│                                        │
│ Auto-payout at €20: ✓ Enabled          │
│ Next payout: Monday, Feb 3             │
│                                        │
│ [Request Payout Now]  [Settings ⚙️]    │
└────────────────────────────────────────┘
```

### Payout Settings Modal/Page

```
┌────────────────────────────────────────┐
│ Payout Settings                        │
│                                        │
│ Auto-payouts                           │
│ ○ Off — I'll request payouts manually  │
│ ● On — Pay me automatically            │
│                                        │
│ Auto-payout threshold                  │
│ When your balance reaches this amount, │
│ we'll send it to your bank.            │
│                                        │
│   €10  ○                               │
│   €20  ●  (recommended)                │
│   €50  ○                               │
│  €100  ○                               │
│                                        │
│ Payout schedule: Every Monday          │
│ Payout fee: Free ✓                     │
│                                        │
│ [Save Changes]                         │
└────────────────────────────────────────┘
```

### Manual Payout Confirmation

```
┌────────────────────────────────────────┐
│ Request Payout                         │
│                                        │
│ Amount: €35.00                         │
│ Fee: €0.00 (free)                      │
│ You'll receive: €35.00                 │
│                                        │
│ Bank account: ****1234 (Swedbank)      │
│ Processing time: 2-7 business days     │
│                                        │
│ [Confirm Payout]  [Cancel]             │
└────────────────────────────────────────┘
```

---

## Email Notifications

### Auto-Payout Initiated

**Subject:** Your €35.00 payout is on its way

**Body:**
> Hi [Name],
>
> Great news — we've sent €35.00 to your bank account ending in ****1234.
>
> This automatic payout was triggered because your balance reached your €20 threshold.
>
> **Payout details:**
> - Amount: €35.00
> - Bank account: ****1234
> - Expected arrival: 2-7 business days
>
> You can adjust your payout settings anytime in your Seller Dashboard.
>
> Happy selling!

### Dormancy Warning (1 Week Before)

**Subject:** Your €12.50 balance will be paid out soon

**Body:**
> Hi [Name],
>
> You have €12.50 in your Second Turn Games balance that hasn't been used in 6 months.
>
> To keep your funds safe, we'll automatically transfer this to your bank account on [date].
>
> **No action needed** — the money will arrive in your account automatically.
>
> If you'd like to keep selling instead, just list a game or update your payout settings before [date].

---

## Edge Cases

| Scenario | Handling |
|----------|----------|
| Stripe account not fully set up | Skip auto-payout, send reminder email |
| Bank details invalid/removed | Skip auto-payout, send alert email |
| Balance below threshold on Monday | No payout, check again next week |
| Payout fails (Stripe error) | Retry once, alert support if fails again |
| Seller disabled auto-payout | Don't include in auto-payout job |
| New seller, no threshold set | Use default €20 |
| Seller changes threshold mid-week | New threshold applies from next Monday |

---

## Cost Analysis

### Assumptions
- 1,000 active sellers
- Average 3 payouts per seller per year (quarterly threshold hits)
- €0.30 Stripe fee per payout

### Monthly Cost
- ~250 payouts/month × €0.30 = **~€75/month**
- With dormancy/manual payouts: ~€100/month total

### Comparison to Current
- Current: €0 (sellers pay fees)
- Proposed: ~€100/month
- **Trade-off:** Strong seller satisfaction and differentiation for €100/month

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Auto-payout adoption | >80% of sellers keep it enabled |
| Support tickets about payouts | -50% reduction |
| Seller NPS improvement | +5 points |
| Payout frequency | Decrease (sellers batch naturally) |

---

## Implementation Phases

### Phase 1: Infrastructure (Week 1)
- [ ] Database migrations
- [ ] Update payout service to absorb fees
- [ ] Create auto-payout cron job
- [ ] Create dormancy check cron job

### Phase 2: Settings UI (Week 2)
- [ ] Payout settings modal/page
- [ ] Update Balance Card with auto-payout info
- [ ] Update manual payout confirmation (show €0 fee)

### Phase 3: Notifications (Week 3)
- [ ] Auto-payout email template
- [ ] Dormancy warning email template
- [ ] Failed payout alert emails

### Phase 4: Migration & Launch (Week 4)
- [ ] Enable auto-payout for all existing sellers (default on)
- [ ] Announce feature to sellers
- [ ] Monitor first auto-payout cycle

---

## Open Questions

1. **Threshold options** — Is €10/€20/€50/€100 the right set? Should we allow custom amounts?
2. **Payout day** — Monday works for most, but should sellers be able to choose?
3. **Notification preferences** — Email for every payout, or only first one?
4. **Stripe Dashboard link** — Keep showing it, or de-emphasize now that payouts are automatic?

---

## Appendix: Stripe Payout Implementation

Current code in `payout-service.ts` deducts fee:
```typescript
const payoutAmount = availableBalance - STRIPE_PAYOUT_FEE_CENTS;
```

Change to:
```typescript
const payoutAmount = availableBalance; // Platform absorbs fee
```

Platform pays the fee through Stripe Connect fees (included in our Connect pricing).
