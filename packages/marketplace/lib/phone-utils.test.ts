import { describe, it, expect } from 'vitest';
import {
  getPhonePrefix,
  detectPhoneCountry,
  composePhoneNumber,
  isValidPhoneNumber,
  validatePhone,
} from './phone-utils';

// ---------------------------------------------------------------------------
// getPhonePrefix
// ---------------------------------------------------------------------------

describe('getPhonePrefix', () => {
  it('returns +371 for LV', () => {
    expect(getPhonePrefix('LV')).toBe('+371');
  });

  it('returns +372 for EE', () => {
    expect(getPhonePrefix('EE')).toBe('+372');
  });

  it('returns +370 for LT', () => {
    expect(getPhonePrefix('LT')).toBe('+370');
  });

  it('returns empty string for OTHER', () => {
    expect(getPhonePrefix('OTHER')).toBe('');
  });
});

// ---------------------------------------------------------------------------
// detectPhoneCountry
// ---------------------------------------------------------------------------

describe('detectPhoneCountry', () => {
  it('detects Latvia from +371 prefix', () => {
    expect(detectPhoneCountry('+37120012345')).toEqual({
      country: 'LV',
      prefix: '+371',
      localNumber: '20012345',
    });
  });

  it('detects Lithuania from +370 prefix', () => {
    expect(detectPhoneCountry('+37060012345')).toEqual({
      country: 'LT',
      prefix: '+370',
      localNumber: '60012345',
    });
  });

  it('detects Estonia from +372 prefix', () => {
    expect(detectPhoneCountry('+3725012345')).toEqual({
      country: 'EE',
      prefix: '+372',
      localNumber: '5012345',
    });
  });

  it('classifies non-Baltic international numbers as OTHER', () => {
    // Regex captures up to 4 digits as prefix — non-Baltic split is best-effort
    const result = detectPhoneCountry('+44207123456');
    expect(result.country).toBe('OTHER');
    expect(result.prefix + result.localNumber).toBe('+44207123456');
  });

  it('defaults to LV when no + prefix (legacy local number)', () => {
    expect(detectPhoneCountry('26779625')).toEqual({
      country: 'LV',
      prefix: '+371',
      localNumber: '26779625',
    });
  });

  it('defaults to LV for empty string', () => {
    expect(detectPhoneCountry('')).toEqual({
      country: 'LV',
      prefix: '+371',
      localNumber: '',
    });
  });

  it('handles US number with single-digit country code', () => {
    // Regex captures up to 4 digits — prefix split is best-effort for non-Baltic
    const result = detectPhoneCountry('+15551234567');
    expect(result.country).toBe('OTHER');
    expect(result.prefix + result.localNumber).toBe('+15551234567');
  });

  it('handles prefix-only input with no local number', () => {
    expect(detectPhoneCountry('+371')).toEqual({
      country: 'LV',
      prefix: '+371',
      localNumber: '',
    });
  });

  it('handles German number with 2-digit country code', () => {
    // Regex captures up to 4 digits — prefix split is best-effort for non-Baltic
    const result = detectPhoneCountry('+4917612345678');
    expect(result.country).toBe('OTHER');
    expect(result.prefix + result.localNumber).toBe('+4917612345678');
  });
});

// ---------------------------------------------------------------------------
// composePhoneNumber
// ---------------------------------------------------------------------------

describe('composePhoneNumber', () => {
  it('composes LV number from country and local part', () => {
    expect(composePhoneNumber('LV', '20012345')).toBe('+37120012345');
  });

  it('composes LT number from country and local part', () => {
    expect(composePhoneNumber('LT', '60012345')).toBe('+37060012345');
  });

  it('composes EE number from country and local part', () => {
    expect(composePhoneNumber('EE', '5012345')).toBe('+3725012345');
  });

  it('uses custom prefix for OTHER country', () => {
    expect(composePhoneNumber('OTHER', '123456789', '+44')).toBe('+44123456789');
  });

  it('returns only local number for OTHER without custom prefix', () => {
    expect(composePhoneNumber('OTHER', '123456789')).toBe('123456789');
  });

  it('round-trips with detectPhoneCountry for Baltic numbers', () => {
    const original = '+37120012345';
    const parsed = detectPhoneCountry(original);
    const recomposed = composePhoneNumber(parsed.country, parsed.localNumber);
    expect(recomposed).toBe(original);
  });
});

// ---------------------------------------------------------------------------
// isValidPhoneNumber
// ---------------------------------------------------------------------------

describe('isValidPhoneNumber', () => {
  it('validates correct Latvian number', () => {
    expect(isValidPhoneNumber('+37120012345')).toBe(true);
  });

  it('validates correct Lithuanian number', () => {
    expect(isValidPhoneNumber('+37060012345')).toBe(true);
  });

  it('validates correct Estonian 7-digit number', () => {
    expect(isValidPhoneNumber('+3725012345')).toBe(true);
  });

  it('validates correct Estonian 8-digit number', () => {
    expect(isValidPhoneNumber('+37250123456')).toBe(true);
  });

  it('rejects number without + prefix', () => {
    expect(isValidPhoneNumber('37120012345')).toBe(false);
  });

  it('rejects empty string', () => {
    expect(isValidPhoneNumber('')).toBe(false);
  });

  it('validates generic international number (non-Baltic)', () => {
    expect(isValidPhoneNumber('+44207123456')).toBe(true);
  });

  it('rejects number with too few digits', () => {
    expect(isValidPhoneNumber('+1234')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// validatePhone
// ---------------------------------------------------------------------------

describe('validatePhone', () => {
  it('validates correct LV number for LV country', () => {
    expect(validatePhone('+37120012345', 'LV')).toBe(true);
  });

  it('validates correct LT number for LT country', () => {
    expect(validatePhone('+37060012345', 'LT')).toBe(true);
  });

  it('validates correct EE number for EE country', () => {
    expect(validatePhone('+3725012345', 'EE')).toBe(true);
  });

  it('rejects LV number when country is LT', () => {
    expect(validatePhone('+37120012345', 'LT')).toBe(false);
  });

  it('rejects number too short for country', () => {
    expect(validatePhone('+3712001', 'LV')).toBe(false);
  });
});
