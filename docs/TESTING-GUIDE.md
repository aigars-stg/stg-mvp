# Complete Flow Testing Guide

This guide walks you through testing the entire buyer checkout and seller payout flow from start to finish.

## Prerequisites

### Test Accounts Needed
1. **Buyer Account** - An account to purchase items
2. **Seller Account** - An account to sell items and receive payouts

### Test Data
- **Stripe Test Card**: `4242 4242 4242 4242`
  - Expiry: Any future date
  - CVC: Any 3 digits
  - ZIP: Any 5 digits

## Phase 1: Setup (10 minutes)

### Step 1: Create Test Accounts

#### Seller Account
1. Go to `/auth/signup`
2. Create account with email: `seller@test.com` (use your email)
3. Complete profile:
   - Full name: "Test Seller"
   - Phone: "+37060000001"
   - Country: Lithuania (LT)
4. Verify email if required

#### Buyer Account
1. Open incognito/private window
2. Go to `/auth/signup`
3. Create account with email: `buyer@test.com` (use your email)
4. Complete profile:
   - Full name: "Test Buyer"
   - Phone: "+37060000002"
   - Country: Lithuania (LT)
5. Verify email if required

### Step 2: Create Test Listing (Seller)

1. Sign in as **Seller**
2. Go to `/sell`
3. Create a new listing:
   - Search for game: "Catan"
   - Select condition: "Very Good"
   - Price: €25.00
   - Add photos (optional)
   - Location: Vilnius
   - Available for: T2T Shipping
4. Publish listing

## Phase 2: Complete Buyer Checkout Flow (15 minutes)

### Step 1: Add to Cart
1. Sign in as **Buyer** (in incognito window)
2. Go to `/browse`
3. Find the test listing
4. Click "Add to Cart"
5. ✅ **Verify**: Cart icon shows (1)

### Step 2: View Cart
1. Click cart icon
2. ✅ **Verify**: Listing appears in cart
3. ✅ **Verify**: Total shows €25.00

### Step 3: Checkout - Shipping Selection
1. Click "Proceed to Checkout"
2. Select "Terminal-to-Terminal (T2T)" shipping
3. Choose terminal: Any Vilnius terminal
4. Click "Continue to Payment"
5. ✅ **Verify**: Shipping cost added (usually €3-5)
6. ✅ **Verify**: Service fee shown (10%)
7. ✅ **Verify**: Total calculated correctly

### Step 4: Payment
1. Enter Stripe test card: `4242 4242 4242 4242`
2. Enter any future expiry date
3. Enter any CVC
4. Click "Pay €XX.XX"
5. ✅ **Verify**: Payment processing indicator
6. ✅ **Verify**: Redirected to order confirmation
7. ✅ **Verify**: Order number displayed (e.g., ORD-2025-001234)

### Step 5: Verify Order Created
1. Check email (both buyer and seller)
   - ✅ Buyer receives "Order Confirmation" email
   - ✅ Seller receives "New Order - Action Required" email
2. Go to `/orders` (buyer view)
   - ✅ Order appears with status "Waiting for Seller"
   - ✅ Countdown timer shows 24h deadline
3. Check database:
   ```sql
   SELECT order_number, status, total_amount, payout_status
   FROM orders
   ORDER BY created_at DESC LIMIT 1;
   ```
   - ✅ Status: `pending_seller`
   - ✅ Payout status: `pending`

## Phase 3: Seller Accepts Order (10 minutes)

### Step 1: View Order (Seller)
1. Sign in as **Seller**
2. Go to `/seller/orders`
3. ✅ **Verify**: Order appears in "Pending" tab
4. ✅ **Verify**: Time remaining shown
5. Click on order to view details

### Step 2: Accept Order
1. Review order details
2. Select parcel size: "M" (Medium)
3. Click "Accept Order"
4. ✅ **Verify**: Success message
5. ✅ **Verify**: Status changes to "Accepted"

### Step 3: Verify Label Generation
1. Wait 10-30 seconds for label generation
2. Refresh page
3. ✅ **Verify**: "Shipping Label Ready" card appears
4. ✅ **Verify**: Tracking number displayed
5. Click "Download Label PDF"
6. ✅ **Verify**: PDF downloads successfully
7. ✅ **Verify**: Label contains correct addresses

### Step 4: Check Emails
1. Seller email:
   - ✅ "Shipping Label Ready" email received
   - ✅ PDF attachment present
   - ✅ Instructions clear
2. Buyer email:
   - ✅ "Order Accepted" email received
   - ✅ Tracking number included
   - ✅ Estimated delivery info shown

### Step 5: Verify Database
```sql
SELECT
  order_number,
  status,
  barcode,
  label_url,
  payout_status
FROM orders
WHERE order_number = 'ORD-XXXX-XXXXXX';
```
- ✅ Status: `accepted`
- ✅ Barcode: Present (e.g., "1234567890")
- ✅ Label URL: Present
- ✅ Payout status: Still `pending`

## Phase 4: Tracking & Delivery Simulation (5 minutes)

Since we're testing, we'll simulate tracking updates:

### Step 1: Manual Tracking Sync (Optional)
1. Trigger tracking sync manually:
   ```bash
   curl -X POST http://localhost:3001/api/cron/sync-tracking \
     -H "Authorization: Bearer YOUR_CRON_SECRET"
   ```
2. Check response for new events

### Step 2: Simulate Delivery (Database)
For testing, manually update order status:

```sql
-- Insert fake tracking event
INSERT INTO tracking_events (
  order_id,
  event_type,
  state_type,
  state_text,
  location,
  event_timestamp
) VALUES (
  'YOUR_ORDER_ID',
  'DELIVERED',
  'PARCEL_DELIVERED',
  'Package delivered to terminal',
  'Vilnius Akropolis',
  NOW()
);

-- Update order status
UPDATE orders
SET status = 'delivered', updated_at = NOW()
WHERE id = 'YOUR_ORDER_ID';
```

### Step 3: Verify Delivery
1. Go to `/orders/[id]` (buyer view)
2. ✅ **Verify**: Status shows "Delivered"
3. ✅ **Verify**: Tracking timeline appears
4. ✅ **Verify**: Delivery event shown
5. Check buyer email:
   - ✅ "Package Delivered" email received
   - ✅ Pickup instructions clear

## Phase 5: Auto-Complete & Payout (5 minutes)

### Step 1: Auto-Complete Order (Simulate 3 Days Later)
Manually trigger order completion:

```bash
curl -X POST http://localhost:3001/api/cron/complete-delivered-orders \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

✅ **Verify Response**: Order marked as completed

OR manually update:
```sql
UPDATE orders
SET status = 'completed', updated_at = NOW()
WHERE id = 'YOUR_ORDER_ID';
```

### Step 2: Set Up Seller Payouts (Seller)

#### Option A: Use Stripe Test Mode
1. Sign in as **Seller**
2. Go to `/seller/settings/payouts`
3. Click "Set Up Payouts"
4. In Stripe onboarding:
   - Use test data (any names, addresses)
   - For bank account in test mode:
     - Routing: `110000000`
     - Account: `000123456789`
5. Complete onboarding
6. ✅ **Verify**: "Payout Status" shows "Active"

#### Option B: Skip Connect (Testing Only)
Update database to bypass Connect requirement:
```sql
UPDATE user_profiles
SET
  stripe_connect_account_id = 'acct_test123',
  stripe_connect_onboarding_completed = true,
  stripe_connect_payouts_enabled = true
WHERE id = 'SELLER_USER_ID';
```

### Step 3: Process Payout
Trigger payout processing:

```bash
curl -X POST http://localhost:3001/api/cron/process-payouts \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

✅ **Verify Response**:
- Success count: 1
- Transfer ID returned

### Step 4: Verify Payout
1. Check database:
   ```sql
   SELECT
     o.order_number,
     o.payout_status,
     o.stripe_transfer_id,
     o.stripe_transfer_amount,
     pt.status,
     pt.net_amount
   FROM orders o
   LEFT JOIN payout_transactions pt ON pt.order_id = o.id
   WHERE o.id = 'YOUR_ORDER_ID';
   ```
   - ✅ Payout status: `completed`
   - ✅ Transfer ID: Present
   - ✅ Amount: Items + Shipping (€25 + shipping)

2. Check Stripe Dashboard (Test Mode):
   - Go to Payments → Transfers
   - ✅ Transfer appears
   - ✅ Amount correct
   - ✅ Destination account correct

## Phase 6: Edge Cases & Error Handling (Optional)

### Test 1: Seller Deadline Expiration
1. Create new order
2. Wait or manually trigger deadline expiration:
   ```bash
   curl -X POST http://localhost:3001/api/cron/expire-seller-deadlines \
     -H "Authorization: Bearer YOUR_CRON_SECRET"
   ```
3. ✅ **Verify**: Order cancelled
4. ✅ **Verify**: Buyer refunded
5. ✅ **Verify**: Listings marked available

### Test 2: Seller Decline
1. Create new order
2. Seller goes to order
3. Click "Decline"
4. Enter reason
5. ✅ **Verify**: Order cancelled
6. ✅ **Verify**: Buyer refunded
7. ✅ **Verify**: Email sent

### Test 3: Cart Expiration
1. Add item to cart
2. Wait 15 minutes OR manually expire:
   ```bash
   curl -X POST http://localhost:3001/api/cron/expire-reservations \
     -H "Authorization: Bearer YOUR_CRON_SECRET"
   ```
3. ✅ **Verify**: Cart empty
4. ✅ **Verify**: Listing available again

## Success Criteria

All these should be true:

- [  ] Buyer can complete checkout with Stripe
- [  ] Seller receives order notification email
- [  ] Seller can accept order within 24h
- [  ] Shipping label generated automatically
- [  ] Label PDF downloads successfully
- [  ] Tracking syncs from Unisend
- [  ] Delivery email sent to buyer
- [  ] Order auto-completes after 3 days
- [  ] Payout processed to seller
- [  ] All cron jobs execute successfully
- [  ] No errors in console/logs
- [  ] All emails delivered

## Troubleshooting

### Issue: Stripe payment fails
- Check Stripe test mode is enabled
- Verify publishable key starts with `pk_test_`
- Check browser console for errors

### Issue: Label not generating
- Check Unisend credentials
- Verify API URL is correct
- Check seller/buyer have phone numbers and countries set
- Check Supabase Storage bucket exists

### Issue: Emails not sending
- Verify Resend API key
- Check sender email is verified
- Look for errors in `/api/...` route logs

### Issue: Payout fails
- Check seller completed Connect onboarding
- Verify `stripe_connect_payouts_enabled = true`
- Check Stripe test mode vs live mode

### Issue: Cron jobs not running
- Verify `CRON_SECRET` matches in .env
- Check Vercel cron configuration
- Test endpoints manually first

## Clean Up After Testing

```sql
-- Delete test orders
DELETE FROM order_items WHERE order_id IN (
  SELECT id FROM orders WHERE buyer_id = 'BUYER_ID' OR seller_id = 'SELLER_ID'
);
DELETE FROM orders WHERE buyer_id = 'BUYER_ID' OR seller_id = 'SELLER_ID';

-- Delete test payout transactions
DELETE FROM payout_transactions WHERE seller_id = 'SELLER_ID';

-- Delete test listings
DELETE FROM listings WHERE seller_id = 'SELLER_ID';

-- Reset user profiles if needed
UPDATE user_profiles
SET stripe_connect_account_id = NULL,
    stripe_connect_onboarding_completed = FALSE
WHERE id = 'SELLER_ID';
```

## Next Steps

Once all tests pass:
1. Review [PRODUCTION-CHECKLIST.md](./PRODUCTION-CHECKLIST.md)
2. Set up production environment variables
3. Deploy to Vercel
4. Test on production with real Stripe test mode
5. Go live! 🚀
