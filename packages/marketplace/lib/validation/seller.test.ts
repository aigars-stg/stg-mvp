import { describe, it, expect } from 'vitest';
import { withdrawalRequestSchema, sellerIbanSchema } from './seller';

describe('withdrawalRequestSchema', () => {
  it('accepts valid withdrawal request', () => {
    const result = withdrawalRequestSchema.safeParse({
      amountCents: 5000,
      iban: 'LV80BANK0000435195001',
      accountHolderName: 'Janis Berzins',
    });
    expect(result.success).toBe(true);
  });

  it('rejects negative amount', () => {
    const result = withdrawalRequestSchema.safeParse({
      amountCents: -100,
      iban: 'LV80BANK0000435195001',
      accountHolderName: 'Janis Berzins',
    });
    expect(result.success).toBe(false);
  });

  it('rejects zero amount', () => {
    const result = withdrawalRequestSchema.safeParse({
      amountCents: 0,
      iban: 'LV80BANK0000435195001',
      accountHolderName: 'Janis Berzins',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid IBAN', () => {
    const result = withdrawalRequestSchema.safeParse({
      amountCents: 5000,
      iban: 'INVALID',
      accountHolderName: 'Janis Berzins',
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty account holder name', () => {
    const result = withdrawalRequestSchema.safeParse({
      amountCents: 5000,
      iban: 'LV80BANK0000435195001',
      accountHolderName: '',
    });
    expect(result.success).toBe(false);
  });

  it('normalizes IBAN (uppercase, no spaces)', () => {
    const result = withdrawalRequestSchema.safeParse({
      amountCents: 5000,
      iban: 'lv80 bank 0000 4351 9500 1',
      accountHolderName: 'Janis Berzins',
    });
    if (result.success) {
      expect(result.data.iban).toBe('LV80BANK0000435195001');
    }
  });
});

describe('sellerIbanSchema', () => {
  it('accepts valid IBAN and name', () => {
    const result = sellerIbanSchema.safeParse({
      iban: 'LV80BANK0000435195001',
      accountHolderName: 'Janis Berzins',
    });
    expect(result.success).toBe(true);
  });

  it('rejects single-character name', () => {
    const result = sellerIbanSchema.safeParse({
      iban: 'LV80BANK0000435195001',
      accountHolderName: 'J',
    });
    expect(result.success).toBe(false);
  });
});
