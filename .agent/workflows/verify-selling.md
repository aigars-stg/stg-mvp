---
description: Verify the game selling flow, including listing creation and Stripe Connect onboarding
---

# Verify Selling Flow

1. **Prerequisites**
   - Ensure you are logged in as a test user.
   - Ensure the user has a confirmed email (or mock it in DB).

2. **Navigate to Sell Page**
   - Go to `/sell`.
   - Verify the "Sell a Game" header dominates the view.

3. **Game Selection (BGG Integration)**
   - Type "Catan" in the search box.
   - Select the first result.
   - Verify the game details (image, year) appear.
   - Select a version (e.g., "English").

4. **Fill Listing Details**
   - Select Condition: "Very Good".
   - Photos: Skip if optional, or mock upload if required.
   - Price: Enter "35".
   - Shipping: Check "Local Pickup" (Vilnius).
   - Terms: Check "I accept the terms".

5. **Publish Listing**
   - Click "Publish Listing".
   - **Branch A (First Time Seller)**:
     - Expect redirect to `/seller/onboard`.
     - Expect Stripe Connect Onboarding mock/page.
     - **Action**: Verify the onboarding URL generation.
     - **Action**: Manually update `seller_profiles` in DB to set `stripe_connect_charges_enabled = true` and `stripe_connect_payouts_enabled = true` to simulate successful onboarding.
     - Return to `/sell` or finding the draft.

   - **Branch B (Returning Seller)**:
     - Expect success modal "Listing Published!".
     - Expect redirect to the public game page.

6. **Verify Dashboard**
   - Go to `/my-listings`.
   - Verify the new listing appears with status "Active".

7. **Cleanup (Optional)**
   - Archive the listing to keep the test environment clean.
