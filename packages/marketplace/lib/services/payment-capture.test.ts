import { describe, it, expect } from 'vitest';
import {
  calculateEverypayPortionCents,
  determineReleaseAction,
  needsCapture,
} from './payment-capture';

// ---------------------------------------------------------------------------
// calculateEverypayPortionCents
// ---------------------------------------------------------------------------

describe('calculateEverypayPortionCents', () => {
  it('returns full amount when no wallet was used', () => {
    expect(calculateEverypayPortionCents(25.0, 0)).toBe(2500);
  });

  it('returns 0 when wallet covers the full amount', () => {
    expect(calculateEverypayPortionCents(25.0, 2500)).toBe(0);
  });

  it('returns remainder after wallet debit', () => {
    expect(calculateEverypayPortionCents(25.0, 1000)).toBe(1500);
  });

  it('treats null wallet debit as 0', () => {
    expect(calculateEverypayPortionCents(15.0, null)).toBe(1500);
  });

  it('treats undefined wallet debit as 0', () => {
    expect(calculateEverypayPortionCents(15.0, undefined)).toBe(1500);
  });

  it('correctly rounds fractional euro amounts', () => {
    expect(calculateEverypayPortionCents(19.99, 500)).toBe(1499);
  });

  it('handles floating-point edge case (10.10)', () => {
    expect(calculateEverypayPortionCents(10.1, 0)).toBe(1010);
  });

  it('handles zero total amount', () => {
    expect(calculateEverypayPortionCents(0, 0)).toBe(0);
  });

  it('handles minimum amount (1 cent)', () => {
    expect(calculateEverypayPortionCents(0.01, 0)).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// determineReleaseAction
// ---------------------------------------------------------------------------

describe('determineReleaseAction', () => {
  const REF = 'ep_ref_123';

  describe('returns "void" for pre-authorised payments', () => {
    it('card payment with full EveryPay amount', () => {
      expect(determineReleaseAction('authorised', REF, 2500)).toBe('void');
    });

    it('mixed payment (wallet + card) with EveryPay remainder', () => {
      expect(determineReleaseAction('authorised', REF, 1500)).toBe('void');
    });
  });

  describe('returns "refund" for settled payments', () => {
    it('settled card payment', () => {
      expect(determineReleaseAction('settled', REF, 2500)).toBe('refund');
    });

    it('bank link payment (always settled)', () => {
      expect(determineReleaseAction('settled', REF, 2500)).toBe('refund');
    });

    it('unknown payment state defaults to refund', () => {
      expect(determineReleaseAction('captured', REF, 2500)).toBe('refund');
    });
  });

  describe('returns "none" when no EveryPay release needed', () => {
    it('wallet-only payment (zero EveryPay portion)', () => {
      expect(determineReleaseAction('authorised', REF, 0)).toBe('none');
    });

    it('negative EveryPay portion (edge case)', () => {
      expect(determineReleaseAction('authorised', REF, -100)).toBe('none');
    });

    it('no payment reference (wallet-only order)', () => {
      expect(determineReleaseAction('authorised', null, 2500)).toBe('none');
    });

    it('empty payment reference', () => {
      expect(determineReleaseAction('authorised', '', 2500)).toBe('none');
    });

    it('undefined payment reference', () => {
      expect(determineReleaseAction('authorised', undefined, 2500)).toBe('none');
    });

    it('null state with no reference', () => {
      expect(determineReleaseAction(null, null, 0)).toBe('none');
    });
  });

  describe('edge cases', () => {
    it('null payment state with valid reference and amount → refund', () => {
      expect(determineReleaseAction(null, REF, 2500)).toBe('refund');
    });

    it('undefined payment state with valid reference and amount → refund', () => {
      expect(determineReleaseAction(undefined, REF, 2500)).toBe('refund');
    });

    it('exactly 1 cent EveryPay portion with authorised state → void', () => {
      expect(determineReleaseAction('authorised', REF, 1)).toBe('void');
    });

    it('exactly 1 cent EveryPay portion with settled state → refund', () => {
      expect(determineReleaseAction('settled', REF, 1)).toBe('refund');
    });
  });
});

// ---------------------------------------------------------------------------
// needsCapture
// ---------------------------------------------------------------------------

describe('needsCapture', () => {
  const REF = 'ep_ref_123';

  describe('returns true when capture is required', () => {
    it('authorised card payment with full EveryPay amount', () => {
      expect(needsCapture('authorised', REF, 2500)).toBe(true);
    });

    it('authorised mixed payment with EveryPay remainder', () => {
      expect(needsCapture('authorised', REF, 1500)).toBe(true);
    });

    it('authorised with exactly 1 cent', () => {
      expect(needsCapture('authorised', REF, 1)).toBe(true);
    });
  });

  describe('returns false when no capture needed', () => {
    it('already settled payment', () => {
      expect(needsCapture('settled', REF, 2500)).toBe(false);
    });

    it('wallet-only (zero EveryPay portion)', () => {
      expect(needsCapture('authorised', REF, 0)).toBe(false);
    });

    it('negative EveryPay portion', () => {
      expect(needsCapture('authorised', REF, -100)).toBe(false);
    });

    it('no payment reference', () => {
      expect(needsCapture('authorised', null, 2500)).toBe(false);
    });

    it('empty payment reference', () => {
      expect(needsCapture('authorised', '', 2500)).toBe(false);
    });

    it('undefined payment reference', () => {
      expect(needsCapture('authorised', undefined, 2500)).toBe(false);
    });

    it('null payment state', () => {
      expect(needsCapture(null, REF, 2500)).toBe(false);
    });

    it('undefined payment state', () => {
      expect(needsCapture(undefined, REF, 2500)).toBe(false);
    });

    it('unknown payment state', () => {
      expect(needsCapture('captured', REF, 2500)).toBe(false);
    });

    it('all null/undefined/zero', () => {
      expect(needsCapture(null, null, 0)).toBe(false);
    });
  });
});
