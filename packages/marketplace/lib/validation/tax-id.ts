/**
 * Tax ID Validation Library for Baltic Countries
 *
 * Validates personal identification numbers for:
 * - Latvia (Personas kods)
 * - Lithuania (Asmens kodas)
 * - Estonia (Isikukood)
 *
 * References:
 * - https://en.wikipedia.org/wiki/National_identification_number
 * - https://github.com/krauzand/id-lv
 * - https://github.com/ToomasMolder/isikukood
 */

export type TaxIdCountry = 'LV' | 'LT' | 'EE';

export interface TaxIdValidationResult {
  valid: boolean;
  error?: string;
  formatted?: string;
}

// ============================================================================
// Latvia (Personas kods)
// Format: DDMMYY-XNNNZ (11 digits with optional dash)
// X = century (0=1800s, 1=1900s, 2=2000s)
// NNN = serial number
// Z = checksum
// New format (since 2017): starts with "32" and doesn't contain birth date
// ============================================================================

const LATVIA_WEIGHTS = [1, 6, 3, 7, 9, 10, 5, 8, 4, 2];

function calculateLatvianChecksum(digits: number[]): number {
  let sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += digits[i] * LATVIA_WEIGHTS[i];
  }
  return (1101 - sum) % 11 % 10;
}

function isValidLatvianDate(digits: number[]): boolean {
  // New format codes start with "32" - no date validation needed
  if (digits[0] === 3 && digits[1] === 2) {
    return true;
  }

  const day = digits[0] * 10 + digits[1];
  const month = digits[2] * 10 + digits[3];
  const year = digits[4] * 10 + digits[5];
  const century = digits[6];

  if (day < 1 || day > 31) return false;
  if (month < 1 || month > 12) return false;

  // Century digit: 0 = 1800s, 1 = 1900s, 2 = 2000s
  let fullYear: number;
  if (century === 0) fullYear = 1800 + year;
  else if (century === 1) fullYear = 1900 + year;
  else if (century === 2) fullYear = 2000 + year;
  else return false;

  // Check if date is valid and not in the future
  const date = new Date(fullYear, month - 1, day);
  if (date.getDate() !== day || date.getMonth() !== month - 1) return false;
  if (date > new Date()) return false;

  return true;
}

export function validateLatvianTaxId(input: string): TaxIdValidationResult {
  // Remove dash if present and whitespace
  const cleaned = input.replace(/[-\s]/g, '');

  if (cleaned.length !== 11) {
    return { valid: false, error: 'Must be 11 digits' };
  }

  if (!/^\d{11}$/.test(cleaned)) {
    return { valid: false, error: 'Must contain only digits' };
  }

  const digits = cleaned.split('').map(Number);

  // Validate date (for old format)
  if (!isValidLatvianDate(digits)) {
    return { valid: false, error: 'Invalid date in ID' };
  }

  // Validate checksum
  const expectedChecksum = calculateLatvianChecksum(digits);
  if (digits[10] !== expectedChecksum) {
    return { valid: false, error: 'Invalid checksum' };
  }

  // Format with dash: DDMMYY-XNNNZ
  const formatted = `${cleaned.slice(0, 6)}-${cleaned.slice(6)}`;

  return { valid: true, formatted };
}

// ============================================================================
// Lithuania (Asmens kodas)
// Format: GYYMMDDNNNC (11 digits)
// G = gender/century (1-2=1800s M/F, 3-4=1900s M/F, 5-6=2000s M/F)
// YYMMDD = birth date
// NNN = serial number
// C = checksum
// ============================================================================

const LITHUANIA_WEIGHTS_1 = [1, 2, 3, 4, 5, 6, 7, 8, 9, 1];
const LITHUANIA_WEIGHTS_2 = [3, 4, 5, 6, 7, 8, 9, 1, 2, 3];

function calculateLithuanianChecksum(digits: number[]): number {
  // First calculation with weights set 1
  let sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += digits[i] * LITHUANIA_WEIGHTS_1[i];
  }
  let remainder = sum % 11;

  if (remainder === 10) {
    // Second calculation with weights set 2
    sum = 0;
    for (let i = 0; i < 10; i++) {
      sum += digits[i] * LITHUANIA_WEIGHTS_2[i];
    }
    remainder = sum % 11;
    if (remainder === 10) {
      remainder = 0;
    }
  }

  return remainder;
}

function isValidLithuanianDate(digits: number[]): boolean {
  const genderCentury = digits[0];
  const year = digits[1] * 10 + digits[2];
  const month = digits[3] * 10 + digits[4];
  const day = digits[5] * 10 + digits[6];

  if (genderCentury < 1 || genderCentury > 6) return false;
  if (day < 1 || day > 31) return false;
  if (month < 1 || month > 12) return false;

  // Determine century from first digit
  let fullYear: number;
  if (genderCentury <= 2) fullYear = 1800 + year;
  else if (genderCentury <= 4) fullYear = 1900 + year;
  else fullYear = 2000 + year;

  // Check if date is valid and not in the future
  const date = new Date(fullYear, month - 1, day);
  if (date.getDate() !== day || date.getMonth() !== month - 1) return false;
  if (date > new Date()) return false;

  return true;
}

export function validateLithuanianTaxId(input: string): TaxIdValidationResult {
  // Remove whitespace
  const cleaned = input.replace(/\s/g, '');

  if (cleaned.length !== 11) {
    return { valid: false, error: 'Must be 11 digits' };
  }

  if (!/^\d{11}$/.test(cleaned)) {
    return { valid: false, error: 'Must contain only digits' };
  }

  const digits = cleaned.split('').map(Number);

  // Validate date
  if (!isValidLithuanianDate(digits)) {
    return { valid: false, error: 'Invalid date in ID' };
  }

  // Validate checksum
  const expectedChecksum = calculateLithuanianChecksum(digits);
  if (digits[10] !== expectedChecksum) {
    return { valid: false, error: 'Invalid checksum' };
  }

  return { valid: true, formatted: cleaned };
}

// ============================================================================
// Estonia (Isikukood)
// Format: GYYMMDDSSSC (11 digits)
// G = gender/century (1-2=1800s M/F, 3-4=1900s M/F, 5-6=2000s M/F)
// YYMMDD = birth date
// SSS = serial number
// C = checksum
// ============================================================================

const ESTONIA_WEIGHTS_1 = [1, 2, 3, 4, 5, 6, 7, 8, 9, 1];
const ESTONIA_WEIGHTS_2 = [3, 4, 5, 6, 7, 8, 9, 1, 2, 3];

function calculateEstonianChecksum(digits: number[]): number {
  // First calculation with weights set 1
  let sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += digits[i] * ESTONIA_WEIGHTS_1[i];
  }
  let remainder = sum % 11;

  if (remainder === 10) {
    // Second calculation with weights set 2
    sum = 0;
    for (let i = 0; i < 10; i++) {
      sum += digits[i] * ESTONIA_WEIGHTS_2[i];
    }
    remainder = sum % 11;
    if (remainder === 10) {
      remainder = 0;
    }
  }

  return remainder;
}

function isValidEstonianDate(digits: number[]): boolean {
  const genderCentury = digits[0];
  const year = digits[1] * 10 + digits[2];
  const month = digits[3] * 10 + digits[4];
  const day = digits[5] * 10 + digits[6];

  if (genderCentury < 1 || genderCentury > 6) return false;
  if (day < 1 || day > 31) return false;
  if (month < 1 || month > 12) return false;

  // Determine century from first digit
  let fullYear: number;
  if (genderCentury <= 2) fullYear = 1800 + year;
  else if (genderCentury <= 4) fullYear = 1900 + year;
  else fullYear = 2000 + year;

  // Check if date is valid and not in the future
  const date = new Date(fullYear, month - 1, day);
  if (date.getDate() !== day || date.getMonth() !== month - 1) return false;
  if (date > new Date()) return false;

  return true;
}

export function validateEstonianTaxId(input: string): TaxIdValidationResult {
  // Remove whitespace
  const cleaned = input.replace(/\s/g, '');

  if (cleaned.length !== 11) {
    return { valid: false, error: 'Must be 11 digits' };
  }

  if (!/^\d{11}$/.test(cleaned)) {
    return { valid: false, error: 'Must contain only digits' };
  }

  const digits = cleaned.split('').map(Number);

  // Validate date
  if (!isValidEstonianDate(digits)) {
    return { valid: false, error: 'Invalid date in ID' };
  }

  // Validate checksum
  const expectedChecksum = calculateEstonianChecksum(digits);
  if (digits[10] !== expectedChecksum) {
    return { valid: false, error: 'Invalid checksum' };
  }

  return { valid: true, formatted: cleaned };
}

// ============================================================================
// Main validation function
// ============================================================================

/**
 * Validate a tax ID for a given country
 */
export function validateTaxId(
  taxId: string,
  country: TaxIdCountry
): TaxIdValidationResult {
  if (!taxId || taxId.trim() === '') {
    return { valid: false, error: 'Tax ID is required' };
  }

  switch (country) {
    case 'LV':
      return validateLatvianTaxId(taxId);
    case 'LT':
      return validateLithuanianTaxId(taxId);
    case 'EE':
      return validateEstonianTaxId(taxId);
    default:
      return { valid: false, error: 'Unsupported country' };
  }
}

/**
 * Get the tax ID label for a country
 */
export function getTaxIdLabel(country: TaxIdCountry): string {
  switch (country) {
    case 'LV':
      return 'Personas kods';
    case 'LT':
      return 'Asmens kodas';
    case 'EE':
      return 'Isikukood';
    default:
      return 'Tax ID';
  }
}

/**
 * Get the tax ID placeholder/example for a country
 */
export function getTaxIdPlaceholder(country: TaxIdCountry): string {
  switch (country) {
    case 'LV':
      return '010190-12345';
    case 'LT':
      return '38901011234';
    case 'EE':
      return '37605030299';
    default:
      return '';
  }
}

/**
 * Get the tax ID format description for a country
 */
export function getTaxIdFormatDescription(country: TaxIdCountry): string {
  switch (country) {
    case 'LV':
      return '11 digits in format DDMMYY-XNNNN';
    case 'LT':
      return '11 digits starting with gender/century digit';
    case 'EE':
      return '11 digits starting with gender/century digit';
    default:
      return '11 digits';
  }
}
