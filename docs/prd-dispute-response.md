# PRD: Seller Dispute Response

**Feature**: Allow Sellers to Submit Evidence in Disputes
**Priority**: Medium-High
**Status**: Draft
**Last Updated**: January 2026

---

## Overview

Currently, buyers can open disputes but sellers have no way to respond with their side of the story. Staff resolve disputes manually without structured seller input. This creates fairness concerns and limits staff's ability to make informed decisions.

### Goals

1. **Fairness** — Give sellers a voice in dispute resolution
2. **Better decisions** — Staff have both sides before ruling
3. **Reduce appeals** — Sellers accept outcomes when they were heard
4. **Documentation** — Clear evidence trail for each dispute

---

## Current State

- Buyer opens dispute via `/api/orders/[id]/dispute`
- Seller can view dispute exists via dashboard
- **No mechanism for seller to respond**
- Staff review buyer's claim only
- Resolution: `completed` (order proceeds) or `refunded`

## Proposed State

- Buyer opens dispute (unchanged)
- **Seller receives notification and has 48 hours to respond**
- Seller can submit:
  - Text explanation
  - Photos as evidence
  - Pre-ship photos if available
- Staff review both sides
- Resolution communicated to both parties with reasoning

---

## User Stories

### Seller: Receive Dispute Notification
> As a seller, I want to be immediately notified when a dispute is opened so I can respond.

**Acceptance Criteria:**
- Email sent when dispute opened
- Dashboard shows dispute alert prominently
- Clear deadline for response (48 hours)
- Link to dispute details page

### Seller: View Dispute Details
> As a seller, I want to see what the buyer is claiming so I can respond appropriately.

**Acceptance Criteria:**
- View buyer's reason category
- View buyer's description
- View buyer's photos (if any)
- See order details for context

### Seller: Submit Response
> As a seller, I want to submit my side of the story with evidence so staff can make a fair decision.

**Acceptance Criteria:**
- Text response (up to 2000 characters)
- Photo uploads (up to 5, same limits as messages)
- Can attach pre-ship photos if taken
- Submit only once (no editing after submission)
- Confirmation that response was received

### Seller: View Resolution
> As a seller, I want to see the outcome and reasoning so I understand what happened.

**Acceptance Criteria:**
- Clear resolution status (Resolved in buyer's favor / Resolved in seller's favor / Partial refund)
- Staff explanation of reasoning
- Impact on seller (refund amount, if any)
- Appeal option mentioned (via email support)

### Staff: Review Both Sides
> As staff, I want to see buyer and seller submissions side-by-side so I can make informed decisions.

**Acceptance Criteria:**
- Dispute detail view shows both parties' submissions
- Chronological timeline of events
- Photos from both sides displayed
- Order and tracking details accessible
- Resolution actions clearly available

---

## Technical Specification

### Database Changes

```sql
-- Add seller response to disputes
ALTER TABLE order_disputes ADD COLUMN seller_response_text TEXT;
ALTER TABLE order_disputes ADD COLUMN seller_response_photos JSONB DEFAULT '[]';
ALTER TABLE order_disputes ADD COLUMN seller_responded_at TIMESTAMP;
ALTER TABLE order_disputes ADD COLUMN seller_response_deadline TIMESTAMP;

-- Add resolution details
ALTER TABLE order_disputes ADD COLUMN resolution_notes TEXT;
ALTER TABLE order_disputes ADD COLUMN resolved_by UUID REFERENCES staff(id);
ALTER TABLE order_disputes ADD COLUMN resolved_at TIMESTAMP;
ALTER TABLE order_disputes ADD COLUMN resolution_type VARCHAR(50); 
-- 'buyer_full_refund', 'buyer_partial_refund', 'seller_favor', 'mutual_agreement'
```

### Updated Dispute Status Flow

```
opened → awaiting_seller → under_review → resolved
         ↓ (48h timeout)
         under_review
```

### API Endpoints

**POST `/api/orders/[id]/dispute`** (existing, updated)
- Set `seller_response_deadline = NOW() + 48 hours`
- Set status = `awaiting_seller`
- Trigger seller notification

**GET `/api/seller/orders/[id]/dispute`** (updated)
```json
{
  "id": "dispute_123",
  "order_id": "order_456",
  "status": "awaiting_seller",
  "buyer_reason": "not_as_described",
  "buyer_description": "Game missing 3 cards, not mentioned in listing",
  "buyer_photos": ["url1", "url2"],
  "opened_at": "2026-01-27T10:00:00Z",
  "seller_response_deadline": "2026-01-29T10:00:00Z",
  "seller_response": null,
  "resolution": null
}
```

**POST `/api/seller/orders/[id]/dispute/respond`** (new)
```json
{
  "response_text": "The listing clearly stated 3 promo cards were missing...",
  "photo_ids": ["photo_1", "photo_2"]
}
```

Response:
```json
{
  "success": true,
  "message": "Your response has been submitted. Our team will review within 48 hours."
}
```

**POST `/api/admin/disputes/[id]/resolve`** (staff only)
```json
{
  "resolution_type": "seller_favor",
  "resolution_notes": "Listing clearly documented missing cards. Buyer claim dismissed.",
  "refund_amount_cents": 0
}
```

### Cron Job Update: Dispute Deadline Handler

Add to existing dispute handling:
- After 48 hours without seller response, auto-transition to `under_review`
- Notify seller that window closed
- Note in dispute: "Seller did not respond within deadline"

---

## UI Changes

### Seller: Orders Dashboard

**Dispute Alert (prominent)**
```
┌────────────────────────────────────────────────────────────────┐
│ ⚠️ DISPUTE REQUIRES YOUR RESPONSE                              │
│                                                                │
│ Order #1234 — Catan                                            │
│ Buyer claims: Item not as described                            │
│                                                                │
│ Respond by: January 29, 2026 10:00 AM (47 hours remaining)     │
│                                                                │
│ [View Dispute & Respond]                                       │
└────────────────────────────────────────────────────────────────┘
```

### Seller: Dispute Detail Page

```
┌────────────────────────────────────────────────────────────────┐
│ Dispute: Order #1234                                           │
│ Status: Awaiting Your Response                                 │
│                                                                │
│ ─────────────────────────────────────────────────────────────  │
│                                                                │
│ BUYER'S CLAIM                                                  │
│                                                                │
│ Reason: Item not as described                                  │
│                                                                │
│ "The game arrived missing 3 cards from the main deck.          │
│ The listing said all components were present but this          │
│ is clearly not complete."                                      │
│                                                                │
│ [Photo 1] [Photo 2]                                            │
│                                                                │
│ ─────────────────────────────────────────────────────────────  │
│                                                                │
│ YOUR RESPONSE                                                  │
│                                                                │
│ Tell your side of the story. Include any relevant details      │
│ about the listing, communication, or shipping.                 │
│                                                                │
│ ┌────────────────────────────────────────────────────────────┐ │
│ │                                                            │ │
│ │ The listing clearly stated "Missing 3 promo cards" in     │ │
│ │ the condition notes. These are promotional cards, not      │ │
│ │ part of the base game. I have attached a screenshot of    │ │
│ │ my original listing showing this.                         │ │
│ │                                                            │ │
│ └────────────────────────────────────────────────────────────┘ │
│                                                                │
│ Add photos (optional):                                         │
│ [+ Upload] Screenshot of listing, pre-ship photos, etc.        │
│                                                                │
│ [Photo 1: listing_screenshot.jpg] [×]                          │
│                                                                │
│ ⚠️ You can only submit once. Make sure to include              │
│ everything before submitting.                                  │
│                                                                │
│ [Submit Response]                                              │
│                                                                │
│ Deadline: 47 hours remaining                                   │
└────────────────────────────────────────────────────────────────┘
```

### Seller: Resolution View

```
┌────────────────────────────────────────────────────────────────┐
│ Dispute: Order #1234 — RESOLVED                                │
│                                                                │
│ ─────────────────────────────────────────────────────────────  │
│                                                                │
│ RESOLUTION                                                     │
│                                                                │
│ ✓ Resolved in your favor                                       │
│                                                                │
│ Our team reviewed both sides and determined that your          │
│ listing accurately described the missing promo cards.          │
│ The buyer's claim has been dismissed.                          │
│                                                                │
│ Your payment: €25.00 (released to your balance)                │
│                                                                │
│ ─────────────────────────────────────────────────────────────  │
│                                                                │
│ If you believe this decision was made in error, contact        │
│ support@secondturn.games within 7 days.                        │
└────────────────────────────────────────────────────────────────┘
```

### Staff: Admin Dispute View

```
┌────────────────────────────────────────────────────────────────┐
│ DISPUTE #D-1234                                                │
│ Order: #1234 | Opened: Jan 27, 2026 | Status: Under Review     │
│                                                                │
│ ═══════════════════════════════════════════════════════════    │
│                                                                │
│ ORDER DETAILS                                                  │
│ Game: Catan (Base Game)                                        │
│ Price: €25.00 | Condition: Good | Shipping: Delivered Jan 25   │
│                                                                │
│ ═══════════════════════════════════════════════════════════    │
│                                                                │
│ BUYER'S CLAIM                                    Jan 27, 10:00 │
│ ───────────────────────────────────────────────────────────    │
│ @buyer_username                                                │
│ Reason: Item not as described                                  │
│                                                                │
│ "The game arrived missing 3 cards from the main deck..."       │
│                                                                │
│ Attachments: [photo1.jpg] [photo2.jpg]                         │
│                                                                │
│ ═══════════════════════════════════════════════════════════    │
│                                                                │
│ SELLER'S RESPONSE                                Jan 27, 14:30 │
│ ───────────────────────────────────────────────────────────    │
│ @seller_username                                               │
│                                                                │
│ "The listing clearly stated 'Missing 3 promo cards'..."        │
│                                                                │
│ Attachments: [listing_screenshot.jpg]                          │
│                                                                │
│ ═══════════════════════════════════════════════════════════    │
│                                                                │
│ ORIGINAL LISTING (archived)                                    │
│ ───────────────────────────────────────────────────────────    │
│ Condition notes: "Missing 3 promo cards from Traders &         │
│ Barbarians expansion. All base game components present."       │
│                                                                │
│ ═══════════════════════════════════════════════════════════    │
│                                                                │
│ RESOLVE THIS DISPUTE                                           │
│                                                                │
│ Resolution:                                                    │
│ ○ Buyer favor — Full refund (€25.00)                           │
│ ○ Buyer favor — Partial refund: [€____]                        │
│ ● Seller favor — No refund                                     │
│ ○ Mutual agreement — Custom resolution                         │
│                                                                │
│ Staff notes (visible to both parties):                         │
│ ┌────────────────────────────────────────────────────────────┐ │
│ │ Listing accurately described missing promo cards. Buyer   │ │
│ │ should have read condition notes before purchasing.       │ │
│ └────────────────────────────────────────────────────────────┘ │
│                                                                │
│ [Resolve Dispute]                                              │
└────────────────────────────────────────────────────────────────┘
```

---

## Email Notifications

### Dispute Opened (to Seller)

**Subject:** Action required: Dispute opened for Order #1234

**Body:**
> Hi [Seller Name],
>
> A buyer has opened a dispute for your order.
>
> **Order:** #1234 — Catan
> **Buyer's reason:** Item not as described
>
> **You have 48 hours to respond.**
>
> This is your opportunity to share your side of the story. Please review the buyer's claim and submit your response with any supporting evidence.
>
> [View Dispute & Respond →]
>
> **Deadline:** January 29, 2026 at 10:00 AM
>
> If you don't respond, our team will make a decision based on the information available.

### Response Received (to Seller)

**Subject:** Your dispute response has been submitted

**Body:**
> Hi [Seller Name],
>
> Thanks for responding to the dispute for Order #1234.
>
> Our team will review both sides and make a decision within 48 hours. We'll email you as soon as there's an update.
>
> You can check the status anytime in your Seller Dashboard.

### Resolution (to Both Parties)

**Subject:** Dispute resolved for Order #1234

**Body (Seller, favorable):**
> Hi [Seller Name],
>
> The dispute for Order #1234 has been resolved **in your favor**.
>
> **Our decision:**
> [Staff notes]
>
> Your payment of €25.00 has been released to your balance.
>
> If you believe this decision was made in error, contact us at support@secondturn.games within 7 days.

---

## Edge Cases

| Scenario | Handling |
|----------|----------|
| Seller doesn't respond in 48h | Proceed to resolution with note "Seller did not respond" |
| Seller tries to respond after deadline | Show "Response window closed" message |
| Multiple photos from seller | Limit to 5 photos, same as messages |
| Seller submits empty response | Require at least 50 characters |
| Dispute opened for Contact Seller order | Different flow — no platform involvement, just messaging |
| Order already completed/paid out | Can still dispute, but payout may need clawback |

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Seller response rate | >70% respond within deadline |
| Resolution appeals | <10% request appeal after resolution |
| Staff resolution time | <48 hours average |
| Seller satisfaction with process | >4/5 rating |

---

## Implementation Phases

### Phase 1: Database & Backend (Week 1)
- [ ] Database migrations
- [ ] Update dispute creation to set seller deadline
- [ ] Create seller response endpoint
- [ ] Update dispute status flow
- [ ] Deadline enforcement cron job

### Phase 2: Seller UI (Week 2)
- [ ] Dispute alert component in dashboard
- [ ] Dispute detail page with response form
- [ ] Photo upload for dispute response
- [ ] Resolution view

### Phase 3: Staff UI (Week 3)
- [ ] Update admin dispute view with both sides
- [ ] Resolution form with options
- [ ] Archived listing display

### Phase 4: Notifications (Week 4)
- [ ] Dispute opened email (seller)
- [ ] Response received email (seller)
- [ ] Resolution email (both parties)
- [ ] Deadline reminder email (12h before)

---

## Future Considerations

1. **Self-resolution** — Allow buyer and seller to resolve mutually before staff involvement
2. **Dispute categories** — Different flows for "item not received" vs "not as described"
3. **Seller dispute initiation** — Allow sellers to flag problematic buyers
4. **Reputation impact** — Track dispute outcomes for trust scoring
5. **Mediation chat** — Real-time chat between parties with staff moderator

---

## Appendix: Dispute Reason Categories

| Category | Description |
|----------|-------------|
| `not_as_described` | Item doesn't match listing |
| `missing_components` | Parts missing not disclosed |
| `damaged_in_shipping` | Arrived damaged |
| `wrong_item` | Different game/edition sent |
| `not_received` | Item never arrived |
| `other` | Freeform description required |
