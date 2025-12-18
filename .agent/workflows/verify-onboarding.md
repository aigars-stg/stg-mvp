---
description: Verify the Stripe Connect seller onboarding flow (Test Mode)
---

# Verify Seller Onboarding

This workflow validates that a user can start the Stripe Connect onboarding process.

1.  **Start the Development Server**
    ```powershell
    cd packages/marketplace
    pnpm dev
    ```

2.  **Navigate to Seller Dashboard**
    -   Open Browser to `http://localhost:3000/sell`
    -   Log in (if not already)
    -   Click "Start Selling" or "Payout Settings"

// turbo
3.  **Trigger Onboarding**
    -   Click "Connect with Stripe"
    -   **Validation**: Verify that the URL redirects to `connect.stripe.com/setup/...` or `connect.stripe.com/express/...`
    -   **Validation**: Verify that the page loads correctly (Stripe Test Mode UI)

4.  **Complete Onboarding (Optional)**
    -   Use Stripe Test Code `000 000` for phone verification.
    -   Use "Test Bank" for payout details.
    -   **Validation**: Verify redirect back to `localhost:3000/seller/settings/payouts` with `?success=true`.
