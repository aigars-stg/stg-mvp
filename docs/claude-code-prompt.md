# Claude Code prompt: Implement Contact Seller listings

## Context

Second Turn Games is a peer-to-peer board game marketplace for the Baltic region. We're introducing a **dual-listing model** to enable faster seller onboarding and Baltic-wide expansion.

### Current state
- Sellers must complete Stripe Connect onboarding before listing
- All transactions go through Stripe (payment) + Unisend (shipping)
- Platform is Latvia-focused with i18n infrastructure for LT/EE/EN

### Target state
- **Two listing types:** Instant Buy (current) and Contact Seller (new)
- **Two seller tiers:** Basic sellers (Contact Seller only) and Verified sellers (Instant Buy enabled)
- **Geographic expansion:** LT/EE sellers can list immediately via Contact Seller

---

## Your task

Implement the Contact Seller listing feature. Start by analyzing the existing codebase, then propose and implement changes systematically.

---

## Phase 1: Codebase analysis

Before making any changes, analyze and document:

### 1.1 Database schema
```
Examine the current schema for:
- users / profiles table structure
- listings table structure
- transactions / orders table structure
- How seller status is tracked
- How Stripe Connect status is stored
```

### 1.2 Seller onboarding flow
```
Trace the current flow:
- Where is Stripe Connect onboarding triggered?
- What gates listing creation behind Stripe verification?
- How is seller eligibility checked?
```

### 1.3 Listing creation flow
```
Document:
- Listing creation form/pages
- Validation logic
- How shipping options are configured
- How prices are set
```

### 1.4 Transaction flow
```
Map out:
- Purchase/checkout flow
- Payment processing integration
- Order status management
- How buyer-seller communication works
```

### 1.5 UI components
```
Identify:
- Listing card components
- Listing detail page
- Seller dashboard components
- Buyer-facing transaction UI
```

Create a brief summary document of your findings before proceeding.

---

## Phase 2: Database changes

### 2.1 Seller tier tracking

Add ability to track seller capabilities:

```sql
-- Option A: Add columns to existing profiles/users table
ALTER TABLE profiles ADD COLUMN seller_tier TEXT DEFAULT 'basic';
-- Values: 'basic' (Contact Seller only), 'verified' (Instant Buy enabled)

ALTER TABLE profiles ADD COLUMN stripe_onboarding_complete BOOLEAN DEFAULT FALSE;

-- Option B: Separate seller_status table (if cleaner)
-- Evaluate based on existing schema
```

### 2.2 Listing type

Add listing type to listings table:

```sql
ALTER TABLE listings ADD COLUMN listing_type TEXT NOT NULL DEFAULT 'instant_buy';
-- Values: 'instant_buy', 'contact_seller'

-- Consider: Should existing listings default to 'instant_buy'?
```

### 2.3 Transaction tracking for Contact Seller

Contact Seller transactions need tracking for reviews and marketplace accuracy (NOT for DAC7 — see note below):

```sql
-- Transactions table changes (or new table)
ALTER TABLE transactions ADD COLUMN transaction_type TEXT;
-- Values: 'instant_buy', 'contact_seller'

ALTER TABLE transactions ADD COLUMN seller_marked_sold_at TIMESTAMP;
ALTER TABLE transactions ADD COLUMN buyer_confirmed_at TIMESTAMP;
-- Both needed for Contact Seller review eligibility
```

> **Note:** Contact Seller transactions are NOT tracked for DAC7. We provide listing visibility and messaging only — we don't process payments or have visibility into whether transactions actually occur. DAC7 applies only to Instant Buy transactions where we facilitate payment via Stripe.

### 2.4 Geographic availability

Ensure country tracking supports feature gating:

```sql
-- Check existing country field in profiles
-- Ensure it can gate Instant Buy availability:
-- Latvia: full features
-- Lithuania, Estonia: Contact Seller only (for now)
```

---

## Phase 3: Backend logic

### 3.1 Seller tier determination

Create logic to determine seller capabilities:

```typescript
// services/seller.ts or similar

type SellerTier = 'basic' | 'verified';

interface SellerCapabilities {
  canCreateInstantBuy: boolean;
  canCreateContactSeller: boolean;
  canReceiveStripePayments: boolean;
  requiresStripeOnboarding: boolean;
}

function getSellerCapabilities(user: User): SellerCapabilities {
  const isVerified = user.stripe_onboarding_complete === true;
  const isInLatvia = user.country === 'LV';
  
  return {
    canCreateInstantBuy: isVerified && isInLatvia,
    canCreateContactSeller: true, // All registered users
    canReceiveStripePayments: isVerified,
    requiresStripeOnboarding: !isVerified && isInLatvia,
  };
}
```

### 3.2 Listing creation logic

Modify listing creation to support both types:

```typescript
// When creating a listing:

interface CreateListingInput {
  // ... existing fields
  listingType: 'instant_buy' | 'contact_seller';
  // For contact_seller:
  contactSellerShippingNote?: string; // e.g., "Omniva or local pickup in Riga"
  acceptsLocalPickup?: boolean;
  sellerLocation?: string; // City/region for display
}

function validateListingCreation(input: CreateListingInput, user: User) {
  const capabilities = getSellerCapabilities(user);
  
  if (input.listingType === 'instant_buy' && !capabilities.canCreateInstantBuy) {
    throw new Error('Stripe Connect required for Instant Buy listings');
  }
  
  // Contact Seller always allowed for registered users
}
```

### 3.3 Listing type auto-selection

For verified sellers, default to Instant Buy but allow Contact Seller:

```typescript
function getDefaultListingType(user: User): 'instant_buy' | 'contact_seller' {
  const capabilities = getSellerCapabilities(user);
  return capabilities.canCreateInstantBuy ? 'instant_buy' : 'contact_seller';
}

function getAvailableListingTypes(user: User): Array<'instant_buy' | 'contact_seller'> {
  const capabilities = getSellerCapabilities(user);
  const types: Array<'instant_buy' | 'contact_seller'> = ['contact_seller'];
  
  if (capabilities.canCreateInstantBuy) {
    types.unshift('instant_buy'); // Instant Buy first if available
  }
  
  return types;
}
```

### 3.4 Transaction flow for Contact Seller

Create new transaction handling for reviews and marketplace accuracy:

```typescript
// For Contact Seller, transaction is created when seller marks as sold

interface MarkAsSoldInput {
  listingId: string;
  buyerEmail?: string; // Optional, for sending confirmation request
}

async function markContactSellerAsSold(input: MarkAsSoldInput, seller: User) {
  // 1. Update listing status
  await updateListing(input.listingId, { status: 'sold' });
  
  // 2. Create transaction record (for reviews, NOT for DAC7)
  await createTransaction({
    listingId: input.listingId,
    sellerId: seller.id,
    transactionType: 'contact_seller',
    sellerMarkedSoldAt: new Date(),
    status: 'pending_buyer_confirmation', // or 'completed' if no confirmation needed
  });
  
  // 3. Optionally notify buyer to confirm receipt (enables reviews)
  if (input.buyerEmail) {
    await sendReceiptConfirmationRequest(input.buyerEmail, input.listingId);
  }
}
```

> **Note:** No sale amount is tracked for Contact Seller. DAC7 reporting applies only to Instant Buy transactions.

### 3.5 DAC7 threshold tracking (Instant Buy only)

DAC7 applies only to Instant Buy transactions:

```typescript
interface DAC7Status {
  totalSales: number;
  totalProceeds: number;
  approachingThreshold: boolean; // 80% of either threshold
  exceededThreshold: boolean;
  tinRequired: boolean;
  tinProvided: boolean;
}

async function getDAC7Status(sellerId: string): Promise<DAC7Status> {
  // Count ONLY instant_buy transactions
  const stats = await db.query(`
    SELECT 
      COUNT(*) as total_sales,
      SUM(amount) as total_proceeds
    FROM transactions
    WHERE seller_id = $1 
      AND transaction_type = 'instant_buy'
      AND created_at >= DATE_TRUNC('year', CURRENT_DATE)
      AND status = 'completed'
  `, [sellerId]);
  
  const totalSales = parseInt(stats.rows[0].total_sales) || 0;
  const totalProceeds = parseFloat(stats.rows[0].total_proceeds) || 0;
  
  return {
    totalSales,
    totalProceeds,
    approachingThreshold: totalSales >= 24 || totalProceeds >= 1600,
    exceededThreshold: totalSales >= 30 || totalProceeds >= 2000,
    tinRequired: totalSales >= 30 || totalProceeds >= 2000,
    tinProvided: await hasTinOnFile(sellerId),
  };
}
```

> **Important:** Contact Seller transactions are NOT counted. We treat Contact Seller as classified ads — we provide listing visibility and messaging only, with no visibility into actual transaction completion or amounts.

---

## Phase 4: Frontend changes

### 4.1 Listing card component

Add visual differentiation:

```tsx
// components/ListingCard.tsx

interface ListingCardProps {
  listing: Listing;
}

function ListingCard({ listing }: ListingCardProps) {
  const isInstantBuy = listing.listingType === 'instant_buy';
  
  return (
    <div className={styles.card}>
      {/* Badge */}
      <div className={styles.badge}>
        {isInstantBuy ? (
          <span className={styles.instantBuyBadge}>
            <ZapIcon size={14} />
            Instant Buy
          </span>
        ) : (
          <span className={styles.contactSellerBadge}>
            <MessageCircleIcon size={14} />
            Contact Seller
          </span>
        )}
      </div>
      
      {/* ... rest of card */}
      
      {/* CTA Button */}
      {isInstantBuy ? (
        <Button variant="primary">
          Buy Now — €{listing.price + SHIPPING_FEE}
        </Button>
      ) : (
        <Button variant="secondary">
          Message Seller
        </Button>
      )}
    </div>
  );
}
```

### 4.2 Listing detail page

Add warning for Contact Seller listings:

```tsx
// app/listing/[id]/page.tsx

function ListingDetailPage({ listing }: { listing: Listing }) {
  const isContactSeller = listing.listingType === 'contact_seller';
  
  return (
    <div>
      {isContactSeller && (
        <Alert variant="warning" className={styles.contactSellerWarning}>
          <AlertTriangleIcon />
          <div>
            <strong>This is a Contact Seller listing</strong>
            <p>
              Payment and shipping are arranged directly with the seller. 
              Second Turn Games doesn't process payments or provide buyer 
              protection for this listing.
            </p>
          </div>
        </Alert>
      )}
      
      {/* ... listing details */}
      
      {isContactSeller ? (
        <div className={styles.contactSellerCTA}>
          <p>Interested? Message the seller to arrange purchase.</p>
          <Button onClick={openMessageModal}>
            <MessageCircleIcon />
            Message Seller
          </Button>
          <p className={styles.sellerLocation}>
            Seller location: {listing.sellerLocation}
          </p>
        </div>
      ) : (
        <BuyNowSection listing={listing} />
      )}
    </div>
  );
}
```

### 4.3 Browse/filter updates

Add listing type filter:

```tsx
// components/ListingFilters.tsx

function ListingFilters({ filters, onChange }) {
  return (
    <div className={styles.filters}>
      {/* Existing filters... */}
      
      <FilterGroup label="Listing type">
        <FilterOption 
          value="all" 
          label="All listings"
          selected={filters.listingType === 'all'}
        />
        <FilterOption 
          value="instant_buy" 
          label="⚡ Instant Buy only"
          selected={filters.listingType === 'instant_buy'}
        />
        <FilterOption 
          value="contact_seller" 
          label="💬 Contact Seller only"
          selected={filters.listingType === 'contact_seller'}
        />
      </FilterGroup>
    </div>
  );
}
```

### 4.4 Listing creation form

Update to support listing type selection:

```tsx
// app/sell/page.tsx or similar

function CreateListingForm() {
  const { user } = useAuth();
  const capabilities = useSellerCapabilities(user);
  const availableTypes = getAvailableListingTypes(user);
  
  const [listingType, setListingType] = useState(
    capabilities.canCreateInstantBuy ? 'instant_buy' : 'contact_seller'
  );
  
  return (
    <form>
      {/* Listing type selector - only show if user has Instant Buy */}
      {capabilities.canCreateInstantBuy && (
        <ListingTypeSelector
          value={listingType}
          onChange={setListingType}
          options={availableTypes}
        />
      )}
      
      {/* If Contact Seller only, show Stripe upgrade prompt */}
      {!capabilities.canCreateInstantBuy && capabilities.requiresStripeOnboarding && (
        <StripeUpgradePrompt />
      )}
      
      {/* If LT/EE user, explain why only Contact Seller */}
      {!capabilities.canCreateInstantBuy && !capabilities.requiresStripeOnboarding && (
        <Alert variant="info">
          Instant Buy is coming soon to {user.country === 'LT' ? 'Lithuania' : 'Estonia'}. 
          For now, you can create Contact Seller listings.
        </Alert>
      )}
      
      {/* Listing type specific fields */}
      {listingType === 'contact_seller' && (
        <ContactSellerFields />
      )}
      
      {listingType === 'instant_buy' && (
        <InstantBuyFields />
      )}
      
      {/* Common fields */}
      <GameSelector />
      <ConditionSelector />
      <PhotoUploader />
      <PriceInput />
      <DescriptionInput />
    </form>
  );
}

function ListingTypeSelector({ value, onChange, options }) {
  return (
    <div className={styles.listingTypeSelector}>
      <h3>How do you want to sell?</h3>
      
      <div className={styles.options}>
        {options.includes('instant_buy') && (
          <label className={cn(styles.option, value === 'instant_buy' && styles.selected)}>
            <input 
              type="radio" 
              value="instant_buy" 
              checked={value === 'instant_buy'}
              onChange={() => onChange('instant_buy')}
            />
            <div className={styles.optionContent}>
              <span className={styles.badge}>⚡ Recommended</span>
              <h4>Instant Buy</h4>
              <ul>
                <li>Buyers pay instantly with card</li>
                <li>€2 Unisend parcel shipping</li>
                <li>Faster sales, more buyer trust</li>
              </ul>
            </div>
          </label>
        )}
        
        <label className={cn(styles.option, value === 'contact_seller' && styles.selected)}>
          <input 
            type="radio" 
            value="contact_seller" 
            checked={value === 'contact_seller'}
            onChange={() => onChange('contact_seller')}
          />
          <div className={styles.optionContent}>
            <h4>Contact Seller</h4>
            <ul>
              <li>You handle payment directly</li>
              <li>You arrange shipping or pickup</li>
              <li>No platform fees</li>
            </ul>
          </div>
        </label>
      </div>
    </div>
  );
}

function ContactSellerFields() {
  return (
    <div className={styles.contactSellerFields}>
      <h4>Delivery options</h4>
      
      <CheckboxField 
        name="acceptsLocalPickup"
        label="I offer local pickup"
      />
      
      <TextField
        name="sellerLocation"
        label="Your location (city/region)"
        placeholder="e.g., Riga, Āgenskalns"
        helperText="Shown to buyers so they know where you're located"
      />
      
      <TextAreaField
        name="shippingNote"
        label="Shipping options (optional)"
        placeholder="e.g., Can ship via Omniva, buyer pays shipping"
        helperText="Describe how you can ship if not local pickup"
      />
    </div>
  );
}
```

### 4.5 Seller dashboard

Add Stripe connection prompt and listing type indicators:

```tsx
// app/dashboard/page.tsx

function SellerDashboard() {
  const { user } = useAuth();
  const capabilities = useSellerCapabilities(user);
  
  return (
    <div>
      {/* Stripe upgrade prompt for basic sellers */}
      {!capabilities.canCreateInstantBuy && capabilities.requiresStripeOnboarding && (
        <Card className={styles.upgradePrompt}>
          <AlertCircleIcon />
          <div>
            <h3>Enable Instant Buy</h3>
            <p>
              Your listings are Contact Seller — buyers must arrange payment 
              and shipping directly with you.
            </p>
            <p>
              Connect Stripe to enable instant checkout and €2 Unisend shipping.
            </p>
            <Button href="/settings/stripe">Connect Stripe</Button>
          </div>
        </Card>
      )}
      
      {/* Listings table with type column */}
      <ListingsTable showListingType />
    </div>
  );
}

function ListingsTable({ showListingType = false }) {
  // Add listing type column
  const columns = [
    { key: 'game', label: 'Game' },
    { key: 'status', label: 'Status' },
    ...(showListingType ? [{ key: 'listingType', label: 'Type' }] : []),
    { key: 'price', label: 'Price' },
    { key: 'views', label: 'Views' },
    { key: 'actions', label: '' },
  ];
  
  // ...
}
```

### 4.6 Mark as sold flow (Contact Seller)

Create UI for sellers to mark Contact Seller listings as sold:

```tsx
// components/MarkAsSoldModal.tsx

function MarkAsSoldModal({ listing, onClose, onSuccess }) {
  const [buyerEmail, setBuyerEmail] = useState('');
  
  const handleSubmit = async () => {
    await markAsSold({
      listingId: listing.id,
      buyerEmail: buyerEmail || undefined,
    });
    onSuccess();
  };
  
  return (
    <Modal onClose={onClose}>
      <h2>Mark as sold</h2>
      
      <p>
        Congratulations on your sale! This will remove the listing from the marketplace.
      </p>
      
      <TextField
        label="Buyer's email (optional)"
        value={buyerEmail}
        onChange={setBuyerEmail}
        helperText="If provided, we'll invite them to confirm receipt so you can both leave reviews"
      />
      
      <div className={styles.actions}>
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button variant="primary" onClick={handleSubmit}>Confirm sale</Button>
      </div>
    </Modal>
  );
}
```

---

## Phase 5: Messaging integration

### 5.1 Contact Seller CTA

When buyer clicks "Message Seller" on a Contact Seller listing:

```tsx
// Open messaging with listing context

function handleContactSeller(listing: Listing) {
  // Navigate to messages with pre-filled context
  router.push(`/messages/new?sellerId=${listing.sellerId}&listingId=${listing.id}`);
}

// In message composer, show listing context:
function NewMessagePage() {
  const { listingId } = useSearchParams();
  const listing = useListing(listingId);
  
  return (
    <div>
      {listing && (
        <ListingPreview listing={listing} />
      )}
      
      <MessageComposer 
        recipientId={listing?.sellerId}
        attachedListingId={listingId}
        placeholder="Hi! I'm interested in this game..."
      />
    </div>
  );
}
```

### 5.2 Transaction confirmation via messaging

Allow buyer to confirm receipt from messages:

```tsx
// In conversation view, if there's a pending Contact Seller transaction:

function ConversationView({ conversation }) {
  const pendingTransaction = usePendingTransaction(conversation.listingId);
  
  return (
    <div>
      {pendingTransaction && pendingTransaction.status === 'pending_buyer_confirmation' && (
        <Card className={styles.confirmationPrompt}>
          <h4>Did you receive {pendingTransaction.listing.title}?</h4>
          <p>
            The seller marked this as sold. Confirming receipt allows you both 
            to leave reviews.
          </p>
          <div className={styles.actions}>
            <Button onClick={() => confirmReceipt(pendingTransaction.id)}>
              Yes, I received it
            </Button>
            <Button variant="text" onClick={openDisputeHelp}>
              I have an issue
            </Button>
          </div>
        </Card>
      )}
      
      <MessageList messages={conversation.messages} />
      <MessageComposer />
    </div>
  );
}
```

---

## Phase 6: Testing

### 6.1 Test scenarios

Create tests for:

```typescript
describe('Contact Seller listings', () => {
  describe('Seller capabilities', () => {
    it('allows any registered user to create Contact Seller listings');
    it('requires Stripe for Instant Buy listings');
    it('blocks Instant Buy for LT/EE users');
    it('shows Stripe upgrade prompt for LV users without Stripe');
  });
  
  describe('Listing creation', () => {
    it('defaults to Contact Seller for basic sellers');
    it('defaults to Instant Buy for verified sellers');
    it('allows verified sellers to choose Contact Seller');
    it('saves Contact Seller specific fields');
  });
  
  describe('Browse experience', () => {
    it('displays correct badge for each listing type');
    it('filters by listing type correctly');
    it('shows warning on Contact Seller listing detail');
  });
  
  describe('Transaction flow', () => {
    it('allows seller to mark Contact Seller listing as sold');
    it('updates listing status to sold');
    it('allows buyer to confirm receipt');
    it('enables reviews after mutual confirmation');
  });
  
  describe('DAC7 compliance (Instant Buy only)', () => {
    it('counts only Instant Buy transactions toward thresholds');
    it('does NOT count Contact Seller transactions toward thresholds');
    it('warns seller when approaching thresholds');
    it('requires TIN when thresholds exceeded');
    it('allows Contact Seller regardless of TIN status');
  });
});
```

### 6.2 Manual testing checklist

```markdown
## Basic seller (no Stripe) flow
- [ ] Register new account (LV)
- [ ] Navigate to sell page
- [ ] Verify only Contact Seller option available
- [ ] Verify Stripe upgrade prompt shown
- [ ] Create Contact Seller listing
- [ ] Verify listing appears with 💬 badge
- [ ] Mark listing as sold
- [ ] Verify listing removed from marketplace
- [ ] Verify transaction recorded (for reviews)

## Verified seller flow
- [ ] Register and complete Stripe onboarding
- [ ] Navigate to sell page
- [ ] Verify both options available
- [ ] Verify Instant Buy is default/recommended
- [ ] Create Instant Buy listing
- [ ] Create Contact Seller listing
- [ ] Verify correct badges on each

## LT/EE seller flow
- [ ] Register with LT/EE country
- [ ] Verify only Contact Seller available
- [ ] Verify "coming soon" message (not Stripe prompt)
- [ ] Create listing successfully

## Buyer flow
- [ ] Browse listings with both types
- [ ] Filter by listing type
- [ ] View Contact Seller listing detail
- [ ] Verify warning banner shown
- [ ] Click Message Seller
- [ ] Verify conversation created with listing context
- [ ] Confirm receipt when seller marks sold
- [ ] Leave review

## DAC7 flow (Instant Buy only)
- [ ] Verify Contact Seller sales do NOT count toward thresholds
- [ ] Verify only Instant Buy sales count toward thresholds
- [ ] Verify seller can use Contact Seller even without TIN
```

---

## Phase 7: Internationalization

### 7.1 New translation keys

Add to translation files:

```json
{
  "listing": {
    "type": {
      "instant_buy": "Instant Buy",
      "contact_seller": "Contact Seller"
    },
    "badge": {
      "instant_buy": "⚡ Instant Buy",
      "contact_seller": "💬 Contact Seller"
    },
    "cta": {
      "buy_now": "Buy Now",
      "message_seller": "Message Seller"
    }
  },
  "sell": {
    "type_selector": {
      "title": "How do you want to sell?",
      "instant_buy": {
        "title": "Instant Buy",
        "recommended": "Recommended",
        "benefit_1": "Buyers pay instantly with card",
        "benefit_2": "€2 Unisend parcel shipping",
        "benefit_3": "Faster sales, more buyer trust"
      },
      "contact_seller": {
        "title": "Contact Seller",
        "benefit_1": "You handle payment directly",
        "benefit_2": "You arrange shipping or pickup",
        "benefit_3": "No platform fees"
      }
    },
    "contact_seller_fields": {
      "local_pickup": "I offer local pickup",
      "location": "Your location (city/region)",
      "location_placeholder": "e.g., Riga, Āgenskalns",
      "location_helper": "Shown to buyers so they know where you're located",
      "shipping_note": "Shipping options (optional)",
      "shipping_note_placeholder": "e.g., Can ship via Omniva, buyer pays shipping"
    }
  },
  "listing_detail": {
    "contact_seller_warning": {
      "title": "This is a Contact Seller listing",
      "description": "Payment and shipping are arranged directly with the seller. Second Turn Games doesn't process payments or provide buyer protection for this listing."
    },
    "contact_seller_cta": {
      "prompt": "Interested? Message the seller to arrange purchase.",
      "seller_location": "Seller location: {location}"
    }
  },
  "dashboard": {
    "stripe_prompt": {
      "title": "Enable Instant Buy",
      "description": "Your listings are Contact Seller — buyers must arrange payment and shipping directly with you.",
      "cta": "Connect Stripe"
    }
  },
  "mark_as_sold": {
    "title": "Mark as sold",
    "congratulations": "Congratulations on your sale! This will remove the listing from the marketplace.",
    "buyer_email": "Buyer's email (optional)",
    "buyer_email_helper": "If provided, we'll invite them to confirm receipt so you can both leave reviews",
    "confirm": "Confirm sale"
  }
}
```

---

## Implementation order

Suggested order to minimize disruption:

1. **Database migrations** — Add new columns with safe defaults
2. **Backend logic** — Seller capabilities, listing type handling
3. **API endpoints** — Create/update listing, mark as sold
4. **Listing card component** — Badge and CTA updates
5. **Listing detail page** — Warning and Contact Seller CTA
6. **Browse filters** — Listing type filter
7. **Listing creation form** — Type selector and Contact Seller fields
8. **Seller dashboard** — Upgrade prompt, listing type column
9. **Mark as sold flow** — Modal and transaction creation
10. **Messaging integration** — Listing context, receipt confirmation
11. **Translations** — All supported languages
12. **Testing** — Automated and manual

---

## Questions to clarify

Before starting, please clarify:

1. **Existing schema:** What's the current database schema for users, listings, transactions?

2. **Stripe integration:** Where is Stripe Connect status currently tracked? How is it checked?

3. **Messaging system:** How does the current messaging work? Is there listing attachment support?

4. **Review system:** How do reviews currently work? What triggers review eligibility?

5. **Country handling:** How is user country currently stored and used?

---

## Success criteria

The feature is complete when:

- [ ] Basic sellers (no Stripe) can create Contact Seller listings
- [ ] LT/EE sellers can create Contact Seller listings
- [ ] Verified sellers can choose between Instant Buy and Contact Seller
- [ ] Listings display correct badges and CTAs based on type
- [ ] Buyers can filter by listing type
- [ ] Contact Seller listing detail shows appropriate warning
- [ ] Sellers can mark Contact Seller listings as sold
- [ ] Mark as sold removes listing and enables reviews
- [ ] DAC7 counts only Instant Buy transactions (not Contact Seller)
- [ ] Optional buyer confirmation enables reviews
- [ ] All UI has translations for EN, LV, LT, ET
- [ ] All test scenarios pass

---

*Start with Phase 1 (codebase analysis) and share your findings before proceeding.*
