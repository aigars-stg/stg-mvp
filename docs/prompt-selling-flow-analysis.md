# Task: Document the Selling Flow for Help Guide

## Context

We're creating a comprehensive **Selling Guide** for the Second Turn Games help section (`/help/selling`). To ensure accuracy, we need to document exactly how the selling flow works based on the actual codebase implementation.

Please analyze the codebase and answer the following questions. For each answer:
- Reference the relevant files/components where you found the information
- Note if something is implemented vs. planned/TODO
- Flag any inconsistencies or areas that are unclear
- If a feature doesn't exist, say "Not implemented" rather than guessing

---

## Questions to Answer

### 1. Listing Creation Flow

**1.1 Starting a listing**
- What is the entry point for creating a listing? (`/sell` page?)
- Does the seller search for a game first using BGG integration?
- What auto-fills from BGG data vs. what does the seller enter manually?
- What is the complete list of form fields? Mark each as required or optional.

**1.2 Photos**
- Minimum and maximum number of photos allowed?
- File size limits? Format restrictions?
- Is there any guidance shown to users about what to photograph?
- How are photos uploaded and stored? (Supabase storage?)

**1.3 Condition grading**
- What condition options are available in the dropdown/selector?
- Is there a link to the grading guide shown during listing creation?

**1.4 Listing type selection**
- How does the user choose between Instant Buy and Contact Seller?
- How does the user choose between Fixed Price and Auction?
- Is this one combined selector or separate fields?
- Are there any restrictions based on seller location (Latvia vs. Estonia/Lithuania)?

**1.5 Pricing**
- For Fixed Price: just a single price field?
- For Auction: starting bid, reserve price, buy-it-now option?
- Any minimum/maximum price limits?

**1.6 Auction settings**
- What duration options are available?
- What are the bid increment rules?
- Is there a minimum starting bid?
- Can sellers set a reserve price?

**1.7 Publishing**
- What validation happens before a listing can be published?
- Is there a preview step?
- What confirmation does the seller see after publishing?

---

### 2. Listing Management

**2.1 Active listings**
- How long do listings stay active? Do they expire?
- Where does the seller view their active listings?

**2.2 Editing listings**
- Can sellers edit listings after publishing?
- What fields can/cannot be changed?
- Can they edit if there are active bids (for auctions)?

**2.3 Pausing/Deactivating**
- Can sellers temporarily pause or deactivate listings?
- What happens to the listing URL when paused?

**2.4 Deleting/Removing**
- How does a seller remove a listing?
- Any restrictions on removal?

---

### 3. Seller Onboarding (Stripe Connect)

**3.1 Trigger**
- When does Stripe Connect onboarding get triggered?
- Can sellers create Contact Seller listings without completing Stripe onboarding?

**3.2 Flow**
- What does the onboarding flow look like? (Steps, screens)
- What information is collected at each step?
- How long does verification typically take?

**3.3 Status**
- Where can sellers see their Stripe account status?
- What happens if verification fails or is incomplete?

---

### 4. Order Flow (Instant Buy)

**4.1 New order notification**
- How is the seller notified of a new order? (Email? Dashboard? Push?)
- What information is shown in the notification?

**4.2 Order confirmation**
- Where does the seller confirm orders? (Dashboard location)
- What does the confirmation UI look like?
- What is the 24-hour countdown implementation?
- What happens if they don't confirm in time?

**4.3 Shipping code**
- After confirming, how/where does the seller receive the shipping code?
- What information accompanies the code? (Terminal locations, instructions)

**4.4 Marking as shipped**
- How does the seller indicate they've shipped?
- Is this automatic (terminal scan) or manual?
- What is the 2-business-day deadline implementation?

**4.5 Order completion**
- How does the seller know when an order is complete?
- Can they see when the buyer picked up the parcel?

**4.6 Order cancellation**
- Can the seller cancel after confirming? How?
- What are the consequences?

---

### 5. Order Flow (Contact Seller)

**5.1 Inquiry handling**
- How does a buyer initiate contact?
- Where does the seller see and respond to inquiries?

**5.2 Order tracking**
- Is there any order/transaction tracking for Contact Seller?
- Or is it purely messaging with no formal order record?

---

### 6. Auctions

**6.1 During auction**
- Can sellers see current bids?
- Are they notified of new bids?
- Can they answer questions during the auction?

**6.2 Auction end**
- What happens when an auction ends with bids?
- What happens when an auction ends with no bids?
- How is the winner notified/charged?

---

### 7. Payments & Payouts

**7.1 Balance display**
- Where does the seller see their balance?
- How is pending vs. available shown?
- Is there a transaction history view?

**7.2 Payout requests**
- How does the seller request a payout?
- What is the minimum payout amount? (Should be €5.00)
- What is the payout timeline shown to users?

**7.3 Payout fees**
- Is the €0.30 Stripe fee shown before confirming payout?

---

### 8. Seller Dashboard

**8.1 Dashboard sections**
- What sections/tabs exist in the seller dashboard?
- What metrics/stats are shown?

**8.2 Notifications**
- What notification preferences can sellers set?
- Email notifications for what events?

---

### 9. Communication

**9.1 Messaging system**
- How do buyers and sellers communicate?
- Is it linked to specific listings or general?
- Are there any message templates or quick replies?

**9.2 Contact information**
- Do buyers and sellers ever see each other's email/phone?
- Or is all communication through the platform?

---

### 10. Edge Cases & Policies

**10.1 Penalties**
- What happens to seller accounts that repeatedly don't confirm orders?
- What happens if sellers repeatedly don't ship on time?
- Is there a strike/warning system implemented?

**10.2 Disputes**
- How does a seller see/respond to a buyer dispute?
- What is the dispute resolution flow from seller's perspective?

---

### 11. Other Features

**11.1 ISO (In Search Of)**
- Is this feature live?
- Can sellers browse buyer requests?
- How do they respond to an ISO?

**11.2 Listing limits**
- Any maximum number of active listings?
- Any rate limits on listing creation?

**11.3 Bulk features**
- Any bulk listing creation tools?
- Any bulk editing capabilities?

---

## Output Format

Please provide answers in this format:

```markdown
## 1. Listing Creation Flow

### 1.1 Starting a listing
**Answer:** [Your findings]
**Source:** [File paths where you found this]
**Status:** [Implemented / Partially implemented / Not implemented / Planned]
**Notes:** [Any additional context or inconsistencies]
```

---

## Summary Request

After answering all questions, please also provide:

1. **User Journey Summary**: A step-by-step walkthrough of the complete selling flow from a user's perspective
2. **Key Files Map**: List of the main files/components involved in the selling flow
3. **Gaps Identified**: Any features mentioned in legal docs or UI that don't appear to be implemented
4. **Recommendations**: Any UX improvements or missing features you noticed while reviewing

---

## Files to Prioritize

Start by looking at:
- `/app/[locale]/sell/` — Listing creation pages
- `/app/[locale]/dashboard/` — Seller dashboard
- `/components/` — Listing and order components
- `/lib/` or `/utils/` — Business logic, Stripe integration
- `/supabase/` — Database schema and functions
- Any API routes related to listings, orders, payments

Thank you!
