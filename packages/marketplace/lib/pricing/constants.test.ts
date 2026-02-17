import { describe, it, expect } from 'vitest';
import {
  SHIPPING_COST_CENTS,
  SHIPPING_COST_EUROS,
  SELLER_COMMISSION_RATE,
  DISPUTE_WINDOW_DAYS,
} from './constants';

describe('pricing constants', () => {
  it('shipping cents and euros are consistent', () => {
    expect(SHIPPING_COST_CENTS).toBe(SHIPPING_COST_EUROS * 100);
  });

  it('commission rate is between 0 and 1', () => {
    expect(SELLER_COMMISSION_RATE).toBeGreaterThan(0);
    expect(SELLER_COMMISSION_RATE).toBeLessThan(1);
  });

  it('dispute window is a positive integer', () => {
    expect(DISPUTE_WINDOW_DAYS).toBeGreaterThan(0);
    expect(Number.isInteger(DISPUTE_WINDOW_DAYS)).toBe(true);
  });

  it('10% commission on a 1000-cent item equals 100 cents', () => {
    expect(Math.round(1000 * SELLER_COMMISSION_RATE)).toBe(100);
  });
});
