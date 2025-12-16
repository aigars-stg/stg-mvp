Strategic Regulatory and Operational Compliance Framework (C2C Model)

# 1. Executive Strategic Overview

The digital marketplace landscape within the European Union has undergone a seismic regulatory shift. For SIA Second Turn Games, a Latvia-based marketplace operator looking to consolidate the Baltic market (Latvia, Lithuania, Estonia), navigating this complexity is critical.

The platform operates on a **Consumer-to-Consumer (C2C)** model, facilitating the sale of pre-owned board games between private individuals. The platform charges a **Service Fee to Buyers**, while Sellers (currently) pay no fees.

This report serves as the operational dossier, dissecting the regulatory architecture required for this C2C-only approach. The strategy leverages the "Micro-business" VAT exception for cross-border digital services and relies on Stripe Connect for financial compliance.

## Core Pillars of the Strategy

1.  **C2C-Only Focus**: The platform forbids professional traders at this stage. This simplifies Consumer Rights obligations (no 14-day right of withdrawal for transactions), but requires strict "Negative Declarations" to inform buyers.
2.  **Buyer-Paid Fees**: Revenue is generated solely from the "Buyer Protection Fee" / "Service Fee". This is an Electronically Supplied Service (ESS).
3.  **VAT Micro-Business Exemption**: We utilize the EU threshold (€10,000) to treat cross-border services as domestic sales initially, simplifying VAT to a flat 21% (Latvian rate) until growth necessitates OSS registration.
4.  **Stripe Connect for Individuals**: Fully supported for private sellers, but requires robust Know Your Customer (KYC) data collection (Liveness/ID checks) once volume thresholds are hit.
5.  **DAC7 Reporting**: We must report private sellers who exceed 30 transactions or €2,000 in sales/year to the State Revenue Service (VID).

---

# 2. Financial & Corporate Architecture

## 2.1 Corporate Income Tax (CIT)
Latvia applies CIT (20/80 on net) only at the moment of profit distribution (dividends). Retained earnings reinvested in the platform are taxed at 0%.

## 2.2 Value Added Tax (VAT) Strategy
**The Service**: The "Buyer Service Fee" is an Electronically Supplied Service (ESS).
**The Customer**: The Buyer (Private Individual).

### The €10,000 Threshold Strategy
The general EU rule for ESS is to tax at the *customer's* location (Destination Principle). However, EU VAT law provides a simplification for micro-businesses.

*   **The Rule**: If your total value of cross-border digital services to EU consumers does not exceed **€10,000** in the current or preceding calendar year, you are entitled to treat these supplies as **domestic sales**.
*   **Operational Result**:
    *   **Below €10k**: Charge **21% Latvian VAT** on all Buyer Service Fees, regardless of whether the buyer is in Riga, Vilnius, or Tallinn. Declare this in the standard Latvian VAT return (ETS).
    *   **Above €10k**: The moment you exceed €10,000 in cross-border revenue (fees from non-LV buyers), you must register for **OSS (One Stop Shop)** and apply foreign VAT rates (21% LT, 22% EE) to those respective sales.

**Action Item**: Build a simple revenue monitor for cross-border fees (Buyer Country != LV). Set an alert at **€9,000**.

## 2.3 Payment Processing (PSD2)
We operate under the "Commercial Agent" exemption by ensuring we **never touch the funds**.
*   **Provider**: Stripe Connect.
*   **Flow**: Buyer -> Stripe (Split: Fee to Platform, Price to Seller) -> Seller.
*   **Seller Type**: "Individual" (not Company). This avoids asking for company registration numbers.

---

# 3. Consumer Protection: The "Negative Declaration"

Since all sellers are private individuals, the EU Right of Withdrawal (14-day return policy) does not apply to the *contracts between users*. However, transparency is mandatory under the Omnibus Directive.

## 3.1 Mandatory Disclosure
You must explicitly inform the buyer that the seller is not a trader.

*   **Required UI Text**: On every listing page, you must display a notice such as:
    > *"Sold by a private individual. EU consumer protection laws (including the right of withdrawal) do not apply to this purchase."*
*   **Liability**: Failure to display this notice can lead to the presumption that the seller is a trader, effectively making the seller (or platform) liable for returns.

## 3.2 Disputes
*   **Damage/Not as Described**: Covered by the Platform's Buyer Protection policy (funded by the Service Fee), not statutory law.
*   **Change of Mind**: Not accepted.

---

# 4. DAC7: Tax Reporting for Private Sellers

It is a common misconception that DAC7 only applies to businesses. It applies to **any "Reportable Seller"**, including private individuals engaged in the "Relevant Activity" (sale of goods).

## 4.1 Thresholds
You must report data for any seller who:
*   Completes **30+ transactions** in a calendar year, OR
*   Earns more than **€2,000** in total sales proceeds.

## 4.2 Data Collection
Once a seller approaches these limits, you must collect:
*   **Natural Persons**: Name, Primary Address, Date of Birth, Tax Identification Number (TIN / Personas kods).

## 4.3 Enforcement
*   **Terms of Service**: Must explicitly state we reserve the right to request this info and **freeze payouts** if not provided.
*   **Flow**:
    1.  Monitor sales volume.
    2.  At ~€1,800 or 25 sales, prompt user for TIN.
    3.  At Limit: **Block Payouts** until data is provided. Stripe Connect may handle some of this, but we must ensure we have the data for the XML report to VID.

---

# 5. Implementation Checklist

## Immediate Actions
- [ ] **VAT**: Configure backend to apply 21% VAT to the Buyer Fee for all users initially.
- [ ] **VAT Monitor**: Create a dashboard/query to track "Non-LV Buyer Fee Revenue" towards the €10k cap.
- [ ] **Frontend**: Add "Private Seller - No Returns" disclaimer to the Product Page (PDP).
- [ ] **Stripe**: Ensure Connect accounts are initialized as "Individual".
- [ ] **DAC7**: Implement "Sales Volume Tracker" per user.

## Future / Scaling
- [ ] **OSS Registration**: Once €9k cross-border revenue is hit.
- [ ] **TIN Collection Modal**: Triggered by the Sales Volume Tracker.

---

# 6. Deep Dive: Compliance Logic

## 6.1 Why 21% VAT on Buyer Fees?
Since the Buyer pays the fee, the "Service" is provided to the Buyer.
*   If Buyer is in LV: Domestic sale (21% LV VAT).
*   If Buyer is in LT/EE (and we are under €10k total cross-border): Treated as Domestic sale (21% LV VAT).
*   **Result**: Uniform pricing for now.

## 6.2 The "Trader" Risk
If a private seller starts selling high volumes (e.g., 500 games/year), they may be deemed a "Trader" by consumer protection authorities, even if they claim to be private.
*   **Mitigation**: We will monitor high-volume sellers. If a seller looks like a business (selling multiple sealed copies of the same game), we may suspend them as our current Terms do not support professional sellers.


