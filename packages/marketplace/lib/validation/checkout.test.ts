import { describe, it, expect } from 'vitest';
import { checkoutSessionSchema } from './checkout';

const validT2tCheckout = {
  basketId: '550e8400-e29b-41d4-a716-446655440000',
  shippingMethod: 't2t' as const,
  destinationCountry: 'LV',
  destinationTerminalId: 'T001',
  destinationTerminalName: 'Riga Central',
  destinationTerminalAddress: 'Brivibas 1, Riga',
  receiverName: 'Janis Berzins',
  receiverPhone: '+37120000001',
  receiverEmail: 'janis@example.com',
  useWallet: true,
};

/** Helper to omit keys from an object (avoids unused-var lint warnings from destructuring) */
function omit<T extends Record<string, unknown>, K extends keyof T>(obj: T, ...keys: K[]): Omit<T, K> {
  const copy = { ...obj };
  for (const key of keys) delete copy[key];
  return copy;
}

describe('checkoutSessionSchema', () => {
  it('accepts valid t2t checkout', () => {
    const result = checkoutSessionSchema.safeParse(validT2tCheckout);
    expect(result.success).toBe(true);
  });

  it('rejects t2t checkout missing receiver fields', () => {
    const incomplete = omit(validT2tCheckout, 'receiverName', 'receiverPhone', 'receiverEmail');
    const result = checkoutSessionSchema.safeParse(incomplete);
    expect(result.success).toBe(false);
  });

  it('rejects t2t checkout missing terminal', () => {
    const incomplete = omit(validT2tCheckout, 'destinationTerminalId', 'destinationTerminalName');
    const result = checkoutSessionSchema.safeParse(incomplete);
    expect(result.success).toBe(false);
  });

  it('defaults useWallet to true when omitted', () => {
    const withoutWallet = omit(validT2tCheckout, 'useWallet');
    const result = checkoutSessionSchema.safeParse(withoutWallet);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.useWallet).toBe(true);
    }
  });

  it('rejects invalid basketId', () => {
    const result = checkoutSessionSchema.safeParse({
      ...validT2tCheckout,
      basketId: 'not-a-uuid',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid shipping method', () => {
    const result = checkoutSessionSchema.safeParse({
      ...validT2tCheckout,
      shippingMethod: 'drone',
    });
    expect(result.success).toBe(false);
  });

  it('rejects local_pickup as shipping method', () => {
    const result = checkoutSessionSchema.safeParse({
      ...validT2tCheckout,
      shippingMethod: 'local_pickup',
    });
    expect(result.success).toBe(false);
  });
});
