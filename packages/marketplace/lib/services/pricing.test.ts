import { describe, it, expect } from 'vitest';
import {
  calculateBuyerPricing,
  calculateSellerEarnings,
  calculateOrderPricing,
  calculateCheckoutPricing,
  calculateCheckoutPricingFromEuros,
  formatPrice,
  formatCentsToEuros,
  formatCentsToCurrency,
} from './pricing';

describe('calculateBuyerPricing', () => {
  it('sums items and shipping into total', () => {
    const result = calculateBuyerPricing(1000, 200);
    expect(result).toEqual({
      itemsTotalCents: 1000,
      shippingCostCents: 200,
      totalChargeCents: 1200,
    });
  });

  it('handles zero shipping (local pickup)', () => {
    const result = calculateBuyerPricing(1500, 0);
    expect(result.totalChargeCents).toBe(1500);
    expect(result.shippingCostCents).toBe(0);
  });

  it('handles zero items', () => {
    const result = calculateBuyerPricing(0, 200);
    expect(result.totalChargeCents).toBe(200);
  });
});

describe('calculateSellerEarnings', () => {
  it('deducts 10% commission', () => {
    const result = calculateSellerEarnings(1000);
    expect(result).toEqual({
      itemsTotalCents: 1000,
      commissionCents: 100,
      walletCreditCents: 900,
    });
  });

  it('rounds commission on odd amounts', () => {
    // 1999 * 0.10 = 199.9, rounds to 200
    const result = calculateSellerEarnings(1999);
    expect(result.commissionCents).toBe(200);
    expect(result.walletCreditCents).toBe(1799);
  });

  it('handles single cent (minimum meaningful amount)', () => {
    const result = calculateSellerEarnings(1);
    expect(result.commissionCents).toBe(0); // 1 * 0.10 = 0.1, rounds to 0
    expect(result.walletCreditCents).toBe(1);
  });

  it('returns zero for zero items', () => {
    const result = calculateSellerEarnings(0);
    expect(result.commissionCents).toBe(0);
    expect(result.walletCreditCents).toBe(0);
  });
});

describe('calculateOrderPricing', () => {
  it('combines buyer and seller pricing', () => {
    const result = calculateOrderPricing(2000, 200);
    expect(result.totalChargeCents).toBe(2200);
    expect(result.commissionCents).toBe(200);
    expect(result.walletCreditCents).toBe(1800);
    expect(result.itemsTotalCents).toBe(2000);
    expect(result.shippingCostCents).toBe(200);
  });
});

describe('calculateCheckoutPricing', () => {
  it('uses wallet first, EveryPay for remainder', () => {
    const result = calculateCheckoutPricing(1000, 200, 500);
    expect(result.walletDebitCents).toBe(500);
    expect(result.everypayChargeCents).toBe(700);
  });

  it('wallet covers full amount — no EveryPay charge', () => {
    const result = calculateCheckoutPricing(1000, 200, 5000);
    expect(result.walletDebitCents).toBe(1200);
    expect(result.everypayChargeCents).toBe(0);
  });

  it('caps wallet debit at total (does not over-debit)', () => {
    const result = calculateCheckoutPricing(1000, 200, 9999);
    expect(result.walletDebitCents).toBe(1200);
    expect(result.everypayChargeCents).toBe(0);
  });

  it('zero wallet balance — full EveryPay charge', () => {
    const result = calculateCheckoutPricing(1000, 200, 0);
    expect(result.walletDebitCents).toBe(0);
    expect(result.everypayChargeCents).toBe(1200);
  });

  it('preserves buyer pricing fields', () => {
    const result = calculateCheckoutPricing(1000, 200, 0);
    expect(result.itemsTotalCents).toBe(1000);
    expect(result.shippingCostCents).toBe(200);
    expect(result.totalChargeCents).toBe(1200);
  });
});

describe('calculateCheckoutPricingFromEuros', () => {
  it('converts euros to cents before calculating', () => {
    const result = calculateCheckoutPricingFromEuros(10.0, 2.0, 0);
    expect(result.itemsTotalCents).toBe(1000);
    expect(result.shippingCostCents).toBe(200);
    expect(result.totalChargeCents).toBe(1200);
  });

  it('handles fractional euros correctly', () => {
    const result = calculateCheckoutPricingFromEuros(19.99, 2.0, 0);
    expect(result.itemsTotalCents).toBe(1999);
    expect(result.everypayChargeCents).toBe(2199);
  });
});

describe('formatPrice', () => {
  it('formats whole euros', () => {
    expect(formatPrice(25)).toBe('€25.00');
  });

  it('formats euros with cents', () => {
    expect(formatPrice(25.5)).toBe('€25.50');
  });

  it('formats zero', () => {
    expect(formatPrice(0)).toBe('€0.00');
  });
});

describe('formatCentsToEuros', () => {
  it('converts cents to euro string without symbol', () => {
    expect(formatCentsToEuros(2550)).toBe('25.50');
  });

  it('handles zero', () => {
    expect(formatCentsToEuros(0)).toBe('0.00');
  });

  it('handles single cent', () => {
    expect(formatCentsToEuros(1)).toBe('0.01');
  });
});

describe('formatCentsToCurrency', () => {
  it('converts cents to euro currency string', () => {
    expect(formatCentsToCurrency(2550)).toBe('€25.50');
  });

  it('handles zero', () => {
    expect(formatCentsToCurrency(0)).toBe('€0.00');
  });
});
