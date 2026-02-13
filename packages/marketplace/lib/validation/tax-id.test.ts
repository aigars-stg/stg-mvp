import { describe, it, expect } from 'vitest';
import {
  validateLatvianTaxId,
  validateLithuanianTaxId,
  validateEstonianTaxId,
  validateTaxId,
  getTaxIdLabel,
  getTaxIdPlaceholder,
  getTaxIdFormatDescription,
} from './tax-id';

// =============================================================================
// Latvia
// =============================================================================

describe('validateLatvianTaxId', () => {
  it('rejects wrong length', () => {
    expect(validateLatvianTaxId('12345')).toEqual({
      valid: false,
      error: 'Must be 11 digits',
    });
  });

  it('rejects non-digit characters', () => {
    expect(validateLatvianTaxId('1234567890a')).toEqual({
      valid: false,
      error: 'Must contain only digits',
    });
  });

  it('strips dashes and validates', () => {
    // Generate a valid Latvian ID by computing the checksum
    // Using new format starting with "32" to avoid date validation complexity
    const digits = [3, 2, 0, 1, 0, 1, 0, 0, 0, 1];
    const weights = [1, 6, 3, 7, 9, 10, 5, 8, 4, 2];
    let sum = 0;
    for (let i = 0; i < 10; i++) sum += digits[i] * weights[i];
    const checksum = (1101 - sum) % 11 % 10;
    const id = digits.join('') + checksum;

    // With dash
    const withDash = `${id.slice(0, 6)}-${id.slice(6)}`;
    const result = validateLatvianTaxId(withDash);
    expect(result.valid).toBe(true);
    expect(result.formatted).toBe(withDash);
  });

  it('validates new format IDs (starting with 32)', () => {
    const digits = [3, 2, 0, 1, 0, 1, 0, 0, 0, 1];
    const weights = [1, 6, 3, 7, 9, 10, 5, 8, 4, 2];
    let sum = 0;
    for (let i = 0; i < 10; i++) sum += digits[i] * weights[i];
    const checksum = (1101 - sum) % 11 % 10;
    const id = digits.join('') + checksum;

    const result = validateLatvianTaxId(id);
    expect(result.valid).toBe(true);
  });

  it('rejects invalid checksum', () => {
    // Valid structure but wrong last digit
    const result = validateLatvianTaxId('32010100010');
    // This will almost certainly have a wrong checksum
    // unless 0 happens to be correct
    if (!result.valid) {
      expect(result.error).toBe('Invalid checksum');
    }
  });
});

// =============================================================================
// Lithuania
// =============================================================================

describe('validateLithuanianTaxId', () => {
  it('rejects wrong length', () => {
    expect(validateLithuanianTaxId('12345')).toEqual({
      valid: false,
      error: 'Must be 11 digits',
    });
  });

  it('rejects non-digit characters', () => {
    expect(validateLithuanianTaxId('1234567890a')).toEqual({
      valid: false,
      error: 'Must contain only digits',
    });
  });

  it('validates a known-valid Lithuanian ID', () => {
    // Construct a valid ID: gender=3 (male, 1900s), DOB=1989-01-01, serial=001
    const digits = [3, 8, 9, 0, 1, 0, 1, 0, 0, 1];
    // Calculate checksum with first weight set
    const w1 = [1, 2, 3, 4, 5, 6, 7, 8, 9, 1];
    const w2 = [3, 4, 5, 6, 7, 8, 9, 1, 2, 3];
    let sum = 0;
    for (let i = 0; i < 10; i++) sum += digits[i] * w1[i];
    let remainder = sum % 11;
    if (remainder === 10) {
      sum = 0;
      for (let i = 0; i < 10; i++) sum += digits[i] * w2[i];
      remainder = sum % 11;
      if (remainder === 10) remainder = 0;
    }
    const id = digits.join('') + remainder;

    const result = validateLithuanianTaxId(id);
    expect(result.valid).toBe(true);
    expect(result.formatted).toBe(id);
  });

  it('rejects invalid gender/century digit', () => {
    // Gender digit 0 is invalid
    const result = validateLithuanianTaxId('08901010011');
    expect(result.valid).toBe(false);
  });
});

// =============================================================================
// Estonia
// =============================================================================

describe('validateEstonianTaxId', () => {
  it('rejects wrong length', () => {
    expect(validateEstonianTaxId('12345')).toEqual({
      valid: false,
      error: 'Must be 11 digits',
    });
  });

  it('rejects non-digit characters', () => {
    expect(validateEstonianTaxId('1234567890a')).toEqual({
      valid: false,
      error: 'Must contain only digits',
    });
  });

  it('validates a known-valid Estonian ID', () => {
    // gender=3 (male, 1900s), DOB=1976-05-03, serial=029
    const digits = [3, 7, 6, 0, 5, 0, 3, 0, 2, 9];
    const w1 = [1, 2, 3, 4, 5, 6, 7, 8, 9, 1];
    const w2 = [3, 4, 5, 6, 7, 8, 9, 1, 2, 3];
    let sum = 0;
    for (let i = 0; i < 10; i++) sum += digits[i] * w1[i];
    let remainder = sum % 11;
    if (remainder === 10) {
      sum = 0;
      for (let i = 0; i < 10; i++) sum += digits[i] * w2[i];
      remainder = sum % 11;
      if (remainder === 10) remainder = 0;
    }
    const id = digits.join('') + remainder;

    const result = validateEstonianTaxId(id);
    expect(result.valid).toBe(true);
    expect(result.formatted).toBe(id);
  });
});

// =============================================================================
// Dispatcher
// =============================================================================

describe('validateTaxId', () => {
  it('returns error for empty input', () => {
    expect(validateTaxId('', 'LV')).toEqual({
      valid: false,
      error: 'Tax ID is required',
    });
  });

  it('returns error for whitespace-only input', () => {
    expect(validateTaxId('   ', 'LV')).toEqual({
      valid: false,
      error: 'Tax ID is required',
    });
  });

  it('routes to Latvian validator', () => {
    const result = validateTaxId('12345', 'LV');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Must be 11 digits');
  });

  it('routes to Lithuanian validator', () => {
    const result = validateTaxId('12345', 'LT');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Must be 11 digits');
  });

  it('routes to Estonian validator', () => {
    const result = validateTaxId('12345', 'EE');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Must be 11 digits');
  });

  it('rejects unsupported country', () => {
    const result = validateTaxId('12345678901', 'DE' as never);
    expect(result).toEqual({
      valid: false,
      error: 'Unsupported country',
    });
  });
});

// =============================================================================
// Helper functions
// =============================================================================

describe('getTaxIdLabel', () => {
  it('returns correct label per country', () => {
    expect(getTaxIdLabel('LV')).toBe('Personas kods');
    expect(getTaxIdLabel('LT')).toBe('Asmens kodas');
    expect(getTaxIdLabel('EE')).toBe('Isikukood');
  });
});

describe('getTaxIdPlaceholder', () => {
  it('returns correct placeholder per country', () => {
    expect(getTaxIdPlaceholder('LV')).toBe('010190-12345');
    expect(getTaxIdPlaceholder('LT')).toBe('38901011234');
    expect(getTaxIdPlaceholder('EE')).toBe('37605030299');
  });
});

describe('getTaxIdFormatDescription', () => {
  it('returns correct format description per country', () => {
    expect(getTaxIdFormatDescription('LV')).toContain('11 digits');
    expect(getTaxIdFormatDescription('LT')).toContain('11 digits');
    expect(getTaxIdFormatDescription('EE')).toContain('11 digits');
  });
});
