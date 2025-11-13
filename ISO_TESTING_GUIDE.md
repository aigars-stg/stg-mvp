# ISO/Wanted Feature - Testing Guide

## 🎉 Minimum Testable Loop - COMPLETE!

You can now test the complete seller response flow end-to-end.

---

## 📋 What We Built

### Backend (Already Complete)
✅ Database tables (`wanted_listings`, `wanted_listing_responses`)
✅ All 7 API endpoints
✅ Type definitions
✅ Messaging integration

### Frontend (Just Built)
✅ **WantedListingCard** - Displays ISO listings in grid
✅ **Browse Page** (`/wanted`) - Grid view of active ISOs
✅ **Detail Page** (`/wanted/[id]`) - Full listing with "I Have This" button
✅ **OfferModal** - Structured form for seller responses
✅ **Create Page** (`/wanted/new`) - Create new ISO posting

---

## 🧪 Testing the Flow

### Step 1: Create a Test ISO Listing

1. **Navigate to:** `/wanted/new`
2. **Sign in** if not already authenticated
3. **Select a game** from the preset list (e.g., Wingspan)
4. **Set budget:** Min €30, Max €50
5. **Check conditions:** Like New, Very Good, Good
6. **Add location:** Latvia, Estonia, Lithuania
7. **Click:** "Create Test ISO"
8. **Verify:** Redirected to `/wanted/[id]` detail page

### Step 2: Browse ISOs

1. **Navigate to:** `/wanted`
2. **Verify you see:**
   - Grid of wanted listing cards
   - Purple "WANTED" badge on each card
   - Budget range (€30-€50)
   - Acceptable condition badges
   - Time remaining countdown
   - "Posted X hours ago"
   - Response count (0/10 sellers responded)
   - "I Have This" button

### Step 3: View ISO Detail

1. **Click on any card** to go to `/wanted/[id]`
2. **Verify you see:**
   - Game image with WANTED badge
   - Large budget display
   - All acceptable conditions
   - Location preferences
   - Buyer info (avatar, name, country)
   - Response progress (0/10)
   - Time remaining with countdown
   - Big "I Have This Game" button

### Step 4: Seller Responds with "I Have This"

**IMPORTANT:** Sign in with a **different account** (or sign out and create new account)

1. **Click:** "I Have This Game" button
2. **Modal opens** with:
   - Game info summary
   - Quick Responder badge notice (if < 2 hrs since posted)
   - Condition dropdown (filtered to acceptable conditions only)
   - Price input (pre-filled to max budget)
   - Photo upload area (placeholder for now)
   - Notes textarea

3. **Fill out form:**
   - **Condition:** Like New
   - **Price:** €45 (within budget = green checkmark)
   - **Notes:** "Available for pickup in Riga. Photos available on request."

4. **Click:** "Send Offer & Start Chat"

### Step 5: Verify Conversation Created

1. **Should auto-redirect** to `/messages/[conversation_id]`
2. **Verify:**
   - Conversation exists
   - Linked to wanted listing (not seller's listing)
   - Initial message contains:
     ```
     Hi! I have Wingspan available.

     **My Offer:**
     • Condition: Like New
     • Price: €45

     [Your notes]

     Let me know if you're interested!
     ```
   - Listing context shows ISO listing at top
   - Buyer receives message (check as buyer account)

### Step 6: Verify Response Tracking

1. **Go back to** `/wanted/[id]` as seller
2. **Verify:**
   - Response count increased: "1/10 sellers responded"
   - Progress bar updated
   - (If you respond within 2 hours of ISO creation, you earned Quick Responder badge ⚡)

---

## 🔍 Edge Cases to Test

### 1. Maximum Responses (10 limit)

1. Create 10 responses from different sellers
2. **Verify:** "I Have This" button disappears
3. **Message shows:** "Maximum responses reached"

### 2. Expired Listing

1. Manually update `expires_at` in database to past date
2. **Verify:**
   - Gray "Expired" badge
   - No "I Have This" button
   - Cannot submit responses

### 3. Own Listing

1. View ISO you created
2. **Verify:**
   - No "I Have This" button
   - Shows "This is your wanted listing"
   - Button to "Manage My Wanted Listings"

### 4. Price Outside Budget

1. In OfferModal, enter price > max budget (e.g., €60 when max is €50)
2. **Verify:** Yellow warning "⚠️ Your price (€60) is outside the buyer's budget range"
3. **Can still submit** (seller can make any offer)

### 5. Unacceptable Condition

1. If ISO only accepts "Like New, Very Good"
2. **Verify:** "Good" and "Acceptable" don't appear in condition dropdown

### 6. Quick Responder Badge

1. Create ISO
2. **Immediately respond** (within 2 hours)
3. **Verify:**
   - Modal shows orange "Quick Responder Badge Available!" notice
   - After submitting, response has `is_quick_response: true`
   - (Badge display in UI coming in next phase)

---

## 🐛 Known Issues / TODO

### Short-term Fixes
- [ ] Photo upload not implemented (shows placeholder)
- [ ] No search/filters on browse page yet
- [ ] No "My Wanted Listings" page yet
- [ ] No email notifications yet
- [ ] No auto-expiration cron job yet

### Nice-to-have
- [ ] Response comparison view for buyers
- [ ] Edit wanted listing
- [ ] Extend expiration button
- [ ] Mark as fulfilled
- [ ] Quick Responder badge display in profiles

---

## 📊 API Endpoints to Test

### Manual API Testing (Optional)

Use Postman or curl to test directly:

#### 1. Create ISO
```bash
POST /api/wanted
Content-Type: application/json

{
  "selectedGame": { "id": 266192, "name": "Wingspan", "yearPublished": 2019 },
  "minPrice": 30,
  "maxPrice": 50,
  "acceptableConditions": ["likeNew", "veryGood", "good"],
  "locationPreferences": "Latvia",
  "notes": "Test ISO"
}
```

#### 2. Browse ISOs
```bash
GET /api/wanted?status=active
```

#### 3. Get ISO Detail
```bash
GET /api/wanted/[id]
```

#### 4. Respond to ISO
```bash
POST /api/wanted/[id]/respond
Content-Type: application/json

{
  "offered_price": "45",
  "offered_condition": "likeNew",
  "response_notes": "Available for pickup"
}
```

#### 5. Extend Expiration
```bash
POST /api/wanted/[id]/extend
```

#### 6. Update Status
```bash
PATCH /api/wanted/[id]
Content-Type: application/json

{
  "status": "fulfilled"
}
```

---

## 🎯 Success Criteria

The feature is working correctly if:

✅ **Buyers can:**
- Create wanted listings with budget ranges
- See seller responses to their ISOs
- Navigate to conversations from responses

✅ **Sellers can:**
- Browse active wanted listings
- Click "I Have This" to respond
- Fill structured offer form (condition, price, notes)
- Auto-create conversation with pre-filled message
- Earn Quick Responder badge if fast enough

✅ **System:**
- Prevents duplicate responses (1 per seller per ISO)
- Enforces 10 response limit
- Validates conditions are acceptable
- Tracks response counts automatically
- Links conversations to ISO listings correctly

---

## 🚀 Next Steps After Testing

Once you verify the flow works:

1. **Add to navigation**
   - Link to `/wanted` in main menu
   - "Post ISO" button alongside "Sell a Game"

2. **Create "My Wanted Listings" page**
   - See all your ISOs (active, expired, fulfilled)
   - View responses per listing
   - Extend, mark as fulfilled, or cancel

3. **Build buyer response view**
   - Compare multiple seller offers side-by-side
   - Quick access to each conversation
   - Accept/reject offers

4. **Set up cron job**
   - Auto-expire listings after 30 days
   - Email reminders at 25 days

5. **Add contextual discovery**
   - Show ISOs on game detail pages
   - "Games People Want" in seller dashboard

---

## 💡 Demo Script

**For a quick demo to stakeholders:**

1. **"Let me show you the ISO feature..."**
2. Open `/wanted/new` → Create Wingspan ISO for €30-50
3. Open `/wanted` → Browse grid of wanted listings
4. Click card → Show detail page with buyer info, budget, conditions
5. Sign in as different user → Click "I Have This"
6. Fill modal: Like New, €45, notes
7. Submit → Auto-redirects to conversation
8. Show pre-filled message with structured offer
9. **"Buyer receives this offer and can negotiate via chat!"**

**Total demo time:** ~2 minutes

---

## 📞 Support

If you encounter issues:

1. Check browser console for errors
2. Check API responses in Network tab
3. Verify authentication (cookies present)
4. Check database for created records

---

## ✨ What's Different from Regular Listings?

| Feature | Sell Listings | ISO/Wanted Listings |
|---------|--------------|---------------------|
| **Who posts** | Sellers (have game) | Buyers (want game) |
| **Pricing** | Fixed price | Budget range |
| **Photos** | Required (3+) | Not applicable |
| **Conditions** | Single condition | Multiple acceptable |
| **Expiration** | No expiration | 30 days, extendable |
| **Responses** | N/A | Max 10 sellers |
| **Conversation** | Buyer initiates | Seller initiates |
| **Badge colors** | Blue (frost-ice) | Purple (aurora-purple) |

---

**The minimum testable loop is complete and ready for testing!** 🎉

Try creating an ISO, responding to it, and verifying the conversation flow works end-to-end.
