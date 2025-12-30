# Product Requirements Document: Unified Transaction Page

**Feature Name:** Transaction Page  
**Version:** 1.0  
**Date:** December 2024  
**Status:** Ready for Implementation

---

## 1. Overview

### 1.1 Problem Statement

Currently, the post-purchase experience in Second Turn Games is fragmented:

- **Orders** live in `/orders/[id]` (buyer) and `/seller/orders/[id]` (seller)
- **Messaging** lives in `/messages/[id]` and is tied to *listings*, not transactions
- **Shipping tracking** is displayed on order pages but disconnected from communication
- **Issue reporting** has database schema but no UI

When a buyer needs to contact a seller about their order, they must navigate away from the order to find the original listing conversation. When disputes arise, there's no unified view of what happened.

### 1.2 Solution

Create a unified **Transaction Page** that consolidates:
- Order summary and status
- Shipping tracking timeline
- Buyer-seller message thread (tied to the transaction)
- Photo uploads for condition disputes
- Action buttons contextual to status and role
- Staff visibility for dispute resolution

### 1.3 Success Metrics

- Reduced support tickets related to "how do I contact seller/buyer"
- Faster dispute resolution (staff has full context in one view)
- Increased buyer confidence (clear post-purchase experience)
- Higher seller response rate (messages tied to specific orders)

---

## 2. User Stories

### 2.1 Buyer Stories

| ID | Story | Acceptance Criteria |
|----|-------|---------------------|
| B1 | As a buyer, I want to see my order status, shipping tracking, and message the seller all in one place | Single page shows order summary, tracking timeline, and message thread |
| B2 | As a buyer, I want to ask the seller questions about my specific order | Can send messages tied to transaction, not listing |
| B3 | As a buyer, I want to upload photos if my game arrives damaged | Photo upload available in message thread |
| B4 | As a buyer, I want to confirm I received my order | "Confirm Receipt" button available when status is `delivered` |
| B5 | As a buyer, I want to report an issue with my order | "Report Issue" action available with category selection |

### 2.2 Seller Stories

| ID | Story | Acceptance Criteria |
|----|-------|---------------------|
| S1 | As a seller, I want to see buyer messages about a specific order alongside order details | Same unified page accessible from seller dashboard |
| S2 | As a seller, I want to respond to buyer questions without leaving the order context | Message input on transaction page |
| S3 | As a seller, I want to see when the buyer has read my messages | Read receipts visible in thread |
| S4 | As a seller, I want automatic updates posted when I ship | System message auto-posted on status change |

### 2.3 Staff Stories

| ID | Story | Acceptance Criteria |
|----|-------|---------------------|
| A1 | As staff, I want to view any transaction page for dispute resolution | Staff can access any transaction via admin route |
| A2 | As staff, I want to see the full message history between buyer and seller | Complete thread visible including photos |
| A3 | As staff, I want to add staff notes to a transaction | Staff-only messages visible to staff |

---

## 3. Functional Requirements

### 3.1 Transaction Page Layout

```
┌─────────────────────────────────────────────────────────────┐
│ ← Back to Orders                            [Report Issue] │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ORDER #ORD-2024-001234                        Status: ●    │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  ┌─────────┐  Catan (4th Edition)                          │
│  │  image  │  Condition: Like New                          │
│  └─────────┘                                               │
│              + 2 more items                    [View all]  │
│                                                             │
│  Seller: board_game_fan_riga                               │
│                                                             │
│  Items total:     €18.00                                   │
│  Shipping (T2T):   €2.00                                   │
│  Service fee:      €1.58                                   │
│  ────────────────────────                                  │
│  Total paid:      €21.58                                   │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  SHIPPING                                    Track ↗       │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  ● Label created         Dec 15, 10:32                     │
│  ● Dropped at terminal   Dec 15, 14:45   Riga Alfa         │
│  ● In transit            Dec 16, 08:12                     │
│  ○ Out for delivery      —                                 │
│  ○ Delivered             —               Tallinn Ülemiste  │
│                                                             │
│  [Download Label]  (seller only, if applicable)            │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  MESSAGES                                                   │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  ┌─ System ─────────────────────────── Dec 15, 10:30 ────┐ │
│  │ Order placed. Seller has 24 hours to respond.         │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
│  ┌─ System ─────────────────────────── Dec 15, 10:32 ────┐ │
│  │ Seller accepted the order. Shipping label created.    │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
│  ┌─ Buyer ──────────────────────────── Dec 15, 11:45 ────┐ │
│  │ Hi! Just wanted to confirm - this is the English      │ │
│  │ edition, right? The BGG listing shows both.           │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
│  ┌─ Seller ─────────────────────────── Dec 15, 12:02 ────┐ │
│  │ Yes, English edition! I'll include a photo of the     │ │
│  │ rulebook cover in the package.                        │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
│  ┌─ System ─────────────────────────── Dec 16, 08:12 ────┐ │
│  │ Package is in transit to Tallinn Ülemiste terminal.   │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
│  ┌────────────────────────────────────────────────────────┐│
│  │ Type a message...                          [📷] [Send] ││
│  └────────────────────────────────────────────────────────┘│
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  [Confirm Receipt]  (buyer only, when delivered)           │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 Order Summary Section

**Display (all roles):**
- Order number and current status (with color-coded badge)
- Game thumbnail, title, edition, condition **for each item in order**
- Seller name (for buyer) / Buyer name (for seller)
- Price breakdown: items, shipping, service fee, total
- Key timestamps: ordered, accepted, shipped, delivered

**Multi-item orders:** If order contains multiple items (from same seller), display all items in a scrollable/collapsible list. Conversation covers entire order, not individual items.

**Status badges:**
| Status | Badge Color | Label |
|--------|-------------|-------|
| pending_payment | Gray | Pending Payment |
| pending_seller | Yellow | Awaiting Seller |
| accepted | Blue | Accepted |
| shipped | Blue | Shipped |
| in_transit | Blue | In Transit |
| delivered | Green | Delivered |
| completed | Green | Completed |
| cancelled | Red | Cancelled |
| disputed | Orange | Disputed |

### 3.3 Shipping Section

**For T2T (terminal-to-terminal) orders:**

Display tracking timeline from `tracking_events` table:
- Show all events chronologically
- Highlight current state
- Show origin and destination terminals
- Link to external tracking URL (Unisend)
- Seller: Show "Download Label" button if `label_url` exists

**For local pickup orders:**
- Show pickup location/instructions from listing
- Show "Mark as Picked Up" for seller
- Show "Confirm Pickup" for buyer

### 3.4 Message Thread Section

**Core functionality:**
- Real-time updates via Supabase Realtime (extend existing implementation)
- Messages displayed chronologically
- Sender indicated (buyer/seller/system)
- Timestamps on each message
- Read receipts (checkmarks or "Seen")

**System messages (auto-generated):**
| Trigger | Message |
|---------|---------|
| Order created | "Order placed. Seller has 24 hours to respond." |
| Seller accepts | "Seller accepted the order. Shipping label created." |
| Seller declines | "Seller declined the order. You will be refunded." |
| Order cancelled (deadline) | "Order automatically cancelled. Seller did not respond within 24 hours." |
| Shipped (first tracking event) | "Package has been shipped." |
| In transit | "Package is in transit to [destination terminal]." |
| Delivered | "Package delivered to [terminal]. Buyer has 3 days to confirm receipt." |
| Completed | "Order completed. Thank you!" |
| Issue reported | "Buyer reported an issue: [category]. Staff will review." |

**Photo attachments:**
- Upload button (📷) in message input
- Accept: jpg, png, webp (max 5MB per image, max 5 images per message)
- Display inline in message thread
- Store in Supabase Storage bucket (e.g., `transaction-photos`)
- Use for condition disputes, proof of damage, etc.

### 3.5 Action Buttons

**Buyer actions by status:**
| Status | Available Actions |
|--------|-------------------|
| pending_seller | Cancel Order |
| delivered | Confirm Receipt, Report Issue |
| completed | Report Issue (within 14 days) |
| any | Send Message |

**Seller actions by status:**
| Status | Available Actions |
|--------|-------------------|
| pending_seller | Accept Order, Decline Order |
| accepted | Download Label (T2T), Mark as Shipped (local pickup) |
| any | Send Message |

### 3.6 Issue Reporting

**"Report Issue" flow:**
1. Buyer clicks "Report Issue"
2. Modal appears with category selection:
   - Item not as described
   - Item damaged in shipping
   - Item not received
   - Missing components
   - Wrong item sent
   - Other
3. Buyer enters description (required, 50+ characters)
4. Buyer uploads photos (optional but encouraged)
5. Submit creates `order_issues` record + system message in thread
6. Order status changes to `disputed`
7. Staff notified (email + admin dashboard flag)

### 3.7 Staff View

**Access:** `/staff/transactions/[id]` (requires staff role)

**Additional features for staff:**
- View any transaction regardless of participant
- See full message history including photos
- Add "Staff Note" (visible only to staff, not buyer/seller)
- Action buttons: Refund Buyer, Release Funds to Seller, Close Issue
- Transaction audit log (all status changes with timestamps)

---

## 4. Technical Requirements

### 4.1 Database Changes

#### 4.1.1 Update `conversations` table

```sql
-- Add order_id column to link conversations to transactions
ALTER TABLE conversations
ADD COLUMN order_id UUID REFERENCES orders(id) ON DELETE SET NULL;

-- Index for efficient lookup
CREATE INDEX idx_conversations_order_id ON conversations(order_id);

-- Update RLS to allow access via order participation
-- (buyer or seller of the order can access the conversation)
```

#### 4.1.2 Update `messages` table

```sql
-- Add photo attachments support
ALTER TABLE messages
ADD COLUMN photo_urls TEXT[] DEFAULT '{}';

-- Add system message type
ALTER TABLE messages
ADD COLUMN system_message_type VARCHAR(50);
-- Values: order_created, order_accepted, order_declined, order_cancelled,
--         order_shipped, order_in_transit, order_delivered, order_completed,
--         issue_reported, staff_note
```

#### 4.1.3 Update `order_issues` table (if needed)

```sql
-- Verify existing schema supports:
-- - issue category
-- - description text
-- - photo_urls array
-- - resolution status
-- - staff notes
-- Add any missing columns
```

### 4.2 API Endpoints

#### 4.2.1 Transaction Conversation

**`GET /api/transactions/[orderId]/conversation`**

Returns or creates the conversation for this transaction.

```typescript
// Response
{
  conversation: {
    id: string;
    order_id: string;
    buyer_id: string;
    seller_id: string;
    created_at: string;
  };
  messages: Message[];
  order: OrderSummary;
  tracking_events: TrackingEvent[];
}
```

**Logic:**
1. Verify user is buyer, seller, or staff
2. Look for existing conversation with this `order_id`
3. If none exists, create one (copying `buyer_id`, `seller_id` from order)
4. Return conversation with messages, order summary, and tracking

#### 4.2.2 Send Message with Photos

**`POST /api/transactions/[orderId]/messages`**

```typescript
// Request
{
  content: string;
  photo_urls?: string[]; // Pre-uploaded to storage
}

// Response
{
  message: Message;
}
```

#### 4.2.3 Upload Transaction Photo

**`POST /api/transactions/[orderId]/photos`**

```typescript
// Request: multipart/form-data with image file

// Response
{
  url: string; // Supabase Storage URL
}
```

#### 4.2.4 Confirm Receipt

**`POST /api/transactions/[orderId]/confirm-receipt`**

```typescript
// Request: (empty body)

// Response
{
  success: boolean;
  order: Order; // Updated order with status: completed
}
```

**Logic:**
1. Verify user is buyer
2. Verify order status is `delivered`
3. Update status to `completed`
4. Post system message: "Buyer confirmed receipt. Order completed."
5. Trigger seller payout (if not already processed)

#### 4.2.5 Report Issue

**`POST /api/transactions/[orderId]/issues`**

```typescript
// Request
{
  category: string;
  description: string;
  photo_urls?: string[];
}

// Response
{
  issue: OrderIssue;
}
```

**Logic:**
1. Verify user is buyer
2. Create `order_issues` record
3. Update order status to `disputed`
4. Post system message with issue details
5. Send notification to staff

#### 4.2.6 Staff Endpoints

**`GET /api/staff/transactions/[orderId]`**
- Returns full transaction data including messages, issues, audit log
- Requires staff role

**`POST /api/staff/transactions/[orderId]/resolve`**
```typescript
// Request
{
  resolution: 'refund_buyer' | 'release_to_seller' | 'partial_refund';
  amount?: number; // For partial refund
  staff_note: string;
}
```

### 4.3 Real-time Subscriptions

Extend existing Supabase Realtime setup:

```typescript
// Subscribe to messages for this transaction's conversation
supabase
  .channel(`transaction:${orderId}`)
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'messages',
    filter: `conversation_id=eq.${conversationId}`
  }, handleNewMessage)
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'orders',
    filter: `id=eq.${orderId}`
  }, handleOrderUpdate)
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'tracking_events',
    filter: `order_id=eq.${orderId}`
  }, handleTrackingUpdate)
  .subscribe();
```

### 4.4 System Message Generation

Create utility to post system messages on order events:

```typescript
// lib/transactions/system-messages.ts

export async function postSystemMessage(
  orderId: string,
  type: SystemMessageType,
  metadata?: Record<string, any>
) {
  const conversation = await getOrCreateTransactionConversation(orderId);
  
  const content = generateSystemMessageContent(type, metadata);
  
  await supabase.from('messages').insert({
    conversation_id: conversation.id,
    sender_id: null, // System messages have no sender
    content,
    is_system_message: true,
    system_message_type: type,
  });
}

// Call from order status change handlers
```

### 4.5 Components

#### 4.5.1 New Components

| Component | Purpose |
|-----------|---------|
| `TransactionPage` | Main page component, orchestrates sections |
| `TransactionHeader` | Order summary, status badge, key info |
| `TransactionShipping` | Tracking timeline, label download |
| `TransactionMessages` | Message thread with system messages |
| `TransactionMessageInput` | Text input + photo upload |
| `TransactionActions` | Contextual action buttons |
| `TransactionPhotoUpload` | Photo upload modal/inline |
| `IssueReportModal` | Issue category + description form |
| `SystemMessage` | Styled system message bubble |

#### 4.5.2 Extend Existing Components

| Component | Changes Needed |
|-----------|----------------|
| `MessageThread` | Support `is_system_message`, `photo_urls` |
| `MessageInput` | Add photo upload button |
| `OrderCard` | Add "View Transaction" link |

### 4.6 Routes

| Route | Component | Access |
|-------|-----------|--------|
| `/transactions/[id]` | TransactionPage | Buyer or Seller of order |
| `/staff/transactions/[id]` | StaffTransactionPage | Staff role |

**Redirect existing routes:**
- `/orders/[id]` → `/transactions/[id]` (for buyers)
- `/seller/orders/[id]` → `/transactions/[id]` (for sellers)

Or keep existing routes but add "View Full Transaction" link.

### 4.7 Email Notifications

Add email notification for new transaction messages:

| Trigger | Recipient | Template |
|---------|-----------|----------|
| New message in transaction | Other party | `transaction-message` |
| Issue reported | Staff | `issue-reported` |
| Issue resolved | Buyer + Seller | `issue-resolved` |

**Throttling:** Max 1 email per conversation per 5 minutes (batch multiple messages)

---

## 5. Migration Plan

### 5.1 Database Migration

```sql
-- Migration: add_transaction_conversations

-- 1. Add order_id to conversations
ALTER TABLE conversations
ADD COLUMN order_id UUID REFERENCES orders(id) ON DELETE SET NULL;

CREATE INDEX idx_conversations_order_id ON conversations(order_id);

-- 2. Add photo support to messages
ALTER TABLE messages
ADD COLUMN photo_urls TEXT[] DEFAULT '{}',
ADD COLUMN system_message_type VARCHAR(50);

-- 3. Create storage bucket for transaction photos
-- (Run via Supabase dashboard or API)

-- 4. Update RLS policies
-- Allow conversation access if user is buyer or seller of linked order
```

### 5.2 Backfill Existing Orders (Optional)

For orders that already have listing-based conversations:

```sql
-- Link existing conversations to their orders where possible
UPDATE conversations c
SET order_id = o.id
FROM orders o
JOIN order_items oi ON oi.order_id = o.id
WHERE c.listing_id = oi.listing_id
AND c.buyer_id = o.buyer_id
AND c.seller_id = o.seller_id
AND c.order_id IS NULL;
```

### 5.3 Rollout Strategy

Ship incrementally — read-only view first, then iterate:

| Phase | Scope | Deliverable |
|-------|-------|-------------|
| 1 | Database migration | Schema changes only (order_id on conversations, photo_urls on messages) |
| 2 | System messages | Hook into existing order status change handlers to post system messages |
| 3 | Transaction conversation API | `GET /api/transactions/[orderId]/conversation` — get or create |
| 4 | TransactionPage UI (read-only) | Shows order summary + tracking timeline + message thread (no input yet) |
| 5 | Message sending | Extend existing MessageInput with photo uploads, wire to transaction API |
| 6 | Actions | Confirm receipt, report issue, accept/decline (for sellers) |
| 7 | Staff view | Admin transaction view (can parallel with phases 5-6) |
| 8 | Email notifications | New message emails with throttling (tune based on usage) |

**Rationale:** Shipping read-only first (phases 1-4) validates the unified UX quickly. Users can see everything in one place even if they must switch to existing messaging to respond. Phases 5-6 complete the interactive experience.

---

## 6. Edge Cases & Error Handling

### 6.1 Edge Cases

| Scenario | Handling |
|----------|----------|
| Order cancelled before conversation created | No conversation needed |
| Buyer messages before seller accepts | Allowed - helps coordination |
| Seller declines after messages exchanged | Conversation preserved for reference |
| Multiple orders for same listing (different buyers) | Each order gets own conversation |
| User blocked other party | Block applies to transaction messages too |
| Staff resolves issue, parties keep messaging | Allow continued messaging until completion |

### 6.2 Error States

| Error | User Message |
|-------|--------------|
| Cannot load transaction | "Unable to load transaction. Please try again." |
| Message send failed | "Message could not be sent. Please try again." |
| Photo upload failed | "Photo upload failed. Check file size and try again." |
| Unauthorized access | Redirect to 404 (don't reveal transaction exists) |

---

## 7. Testing Requirements

### 7.1 Unit Tests

- System message content generation
- Photo URL validation
- Status-based action visibility logic
- RLS policy verification

### 7.2 Integration Tests

- Create transaction conversation via API
- Send message with photos
- Confirm receipt flow
- Issue reporting flow
- Real-time message updates
- **Multi-item order:** Order with 3+ items from same seller displays all items in summary, single conversation serves entire order

### 7.3 E2E Tests

- Complete buyer flow: purchase → message seller → receive → confirm
- Complete seller flow: accept → ship → respond to messages
- Dispute flow: report issue → staff resolution
- Photo upload and display

---

## 8. Open Questions

1. **Message notifications:** Email immediately or batch? Daily digest option?
2. **Auto-complete timing:** Currently 3 days after delivery. Keep or adjust?
3. **Issue deadline:** How long after delivery can buyer report issues? 14 days?
4. **Conversation after completion:** Allow messaging after order completed?
5. **Local pickup:** Need structured confirmation flow or keep informal?

---

## 9. Out of Scope (Future)

- Public Q&A on listings (separate feature)
- Verification photos with listing code (separate feature)
- Video attachments in messages
- Voice messages
- Translation of messages between languages
- Automated dispute resolution

---

## 10. Appendix

### 10.1 Related Files (Current Implementation)

**Orders:**
- `/app/orders/page.tsx`
- `/app/orders/[id]/page.tsx`
- `/app/seller/orders/page.tsx`
- `/app/seller/orders/[id]/page.tsx`
- `/app/api/orders/route.ts`
- `/app/api/seller/orders/route.ts`

**Messaging:**
- `/app/messages/page.tsx`
- `/app/messages/[id]/page.tsx`
- `/components/messaging/MessageThread.tsx`
- `/components/messaging/MessageInput.tsx`
- `/lib/contexts/UnreadMessagesContext.tsx`

**Shipping:**
- `/lib/unisend/client.ts`
- `/lib/unisend/label-service.ts`
- `/app/api/cron/sync-tracking/route.ts`

### 10.2 Reference: Swappa Sale Page

Inspiration source for this feature. Key elements:
- Unified view of transaction + shipping + communication
- System messages for status changes
- Photo uploads for disputes
- Staff visibility for resolution
- 24-hour response expectations

---

*End of PRD*
