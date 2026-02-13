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

const validPickupCheckout = {
  basketId: '550e8400-e29b-41d4-a716-446655440000',
  shippingMethod: 'local_pickup' as const,
  pickupCity: 'Riga',
  useWallet: false,
};

describe('checkoutSessionSchema', () => {
  it('accepts valid t2t checkout', () => {
    const result = checkoutSessionSchema.safeParse(validT2tCheckout);
    expect(result.success).toBe(true);
  });

  it('rejects t2t checkout missing receiver fields', () => {
    const { receiverName, receiverPhone, receiverEmail, ...incomplete } = validT2tCheckout;
    const result = checkoutSessionSchema.safeParse(incomplete);
    expect(result.success).toBe(false);
  });

  it('rejects t2t checkout missing terminal', () => {
    const { destinationTerminalId, destinationTerminalName, ...incomplete } = validT2tCheckout;
    const result = checkoutSessionSchema.safeParse(incomplete);
    expect(result.success).toBe(false);
  });

  it('accepts valid local pickup', () => {
    const result = checkoutSessionSchema.safeParse(validPickupCheckout);
    expect(result.success).toBe(true);
  });

  it('rejects local pickup missing city', () => {
    const { pickupCity, ...incomplete } = validPickupCheckout;
    const result = checkoutSessionSchema.safeParse(incomplete);
    expect(result.success).toBe(false);
  });

  it('defaults useWallet to true when omitted', () => {
    const { useWallet, ...withoutWallet } = validT2tCheckout;
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
});
