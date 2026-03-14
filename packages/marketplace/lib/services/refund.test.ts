import { describe, it, expect } from 'vitest';
import {
  isRefundableStatus,
  calculateRefundAmounts,
  REFUNDABLE_STATUSES,
} from './refund';

describe('REFUNDABLE_STATUSES', () => {
  it('includes all pre-completion statuses, disputed, and cancelled', () => {
    expect(REFUNDABLE_STATUSES).toEqual([
      'pending_seller',
      'accepted',
      'shipped',
      'in_transit',
      'delivered',
      'disputed',
      'cancelled',
    ]);
  });

  it('does not include post-completion or terminal statuses', () => {
    const statuses = REFUNDABLE_STATUSES as readonly string[];
    expect(statuses).not.toContain('completed');
    expect(statuses).not.toContain('refunded');
  });
});

describe('isRefundableStatus', () => {
  it('returns true for all refundable statuses', () => {
    expect(isRefundableStatus('pending_seller')).toBe(true);
    expect(isRefundableStatus('accepted')).toBe(true);
    expect(isRefundableStatus('shipped')).toBe(true);
    expect(isRefundableStatus('in_transit')).toBe(true);
    expect(isRefundableStatus('delivered')).toBe(true);
    expect(isRefundableStatus('disputed')).toBe(true);
    expect(isRefundableStatus('cancelled')).toBe(true);
  });

  it('returns false for completed orders', () => {
    expect(isRefundableStatus('completed')).toBe(false);
  });

  it('returns false for already refunded orders', () => {
    expect(isRefundableStatus('refunded')).toBe(false);
  });

  it('returns true for cancelled orders', () => {
    expect(isRefundableStatus('cancelled')).toBe(true);
  });

  it('returns false for unknown statuses', () => {
    expect(isRefundableStatus('unknown')).toBe(false);
    expect(isRefundableStatus('')).toBe(false);
  });
});

describe('calculateRefundAmounts', () => {
  it('splits full EveryPay payment (no wallet used)', () => {
    const result = calculateRefundAmounts(25.00, 0);
    expect(result).toEqual({
      totalAmountCents: 2500,
      walletPortionCents: 0,
      everypayPortionCents: 2500,
    });
  });

  it('splits full wallet payment (no EveryPay)', () => {
    const result = calculateRefundAmounts(25.00, 2500);
    expect(result).toEqual({
      totalAmountCents: 2500,
      walletPortionCents: 2500,
      everypayPortionCents: 0,
    });
  });

  it('splits mixed payment (wallet + EveryPay)', () => {
    const result = calculateRefundAmounts(25.00, 1000);
    expect(result).toEqual({
      totalAmountCents: 2500,
      walletPortionCents: 1000,
      everypayPortionCents: 1500,
    });
  });

  it('handles null buyer_wallet_debit_cents (treats as 0)', () => {
    const result = calculateRefundAmounts(15.00, null);
    expect(result).toEqual({
      totalAmountCents: 1500,
      walletPortionCents: 0,
      everypayPortionCents: 1500,
    });
  });

  it('handles undefined buyer_wallet_debit_cents (treats as 0)', () => {
    const result = calculateRefundAmounts(15.00, undefined);
    expect(result).toEqual({
      totalAmountCents: 1500,
      walletPortionCents: 0,
      everypayPortionCents: 1500,
    });
  });

  it('correctly rounds fractional euro amounts', () => {
    // 19.99 * 100 = 1999
    const result = calculateRefundAmounts(19.99, 500);
    expect(result.totalAmountCents).toBe(1999);
    expect(result.walletPortionCents).toBe(500);
    expect(result.everypayPortionCents).toBe(1499);
  });

  it('handles floating-point edge case (e.g., 0.1 + 0.2)', () => {
    // 10.10 * 100 could be 1009.9999... without Math.round
    const result = calculateRefundAmounts(10.10, 0);
    expect(result.totalAmountCents).toBe(1010);
  });

  it('handles zero total amount', () => {
    const result = calculateRefundAmounts(0, 0);
    expect(result).toEqual({
      totalAmountCents: 0,
      walletPortionCents: 0,
      everypayPortionCents: 0,
    });
  });

  it('handles minimum meaningful amount (1 cent)', () => {
    const result = calculateRefundAmounts(0.01, 0);
    expect(result.totalAmountCents).toBe(1);
    expect(result.everypayPortionCents).toBe(1);
  });
});
