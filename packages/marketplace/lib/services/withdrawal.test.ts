import { describe, it, expect } from 'vitest';
import { mapWithdrawalRow } from './withdrawal';

describe('mapWithdrawalRow', () => {
  it('maps all fields from snake_case DB row to camelCase', () => {
    const row = {
      id: 'wd-123',
      user_id: 'user-456',
      amount_cents: 5000,
      iban: 'LV80BANK0000435195001',
      account_holder_name: 'Jānis Bērziņš',
      status: 'pending',
      processed_by: null,
      processed_at: null,
      bank_reference: null,
      rejection_reason: null,
      created_at: '2025-06-15T10:30:00Z',
    };

    expect(mapWithdrawalRow(row)).toEqual({
      id: 'wd-123',
      userId: 'user-456',
      amountCents: 5000,
      iban: 'LV80BANK0000435195001',
      accountHolderName: 'Jānis Bērziņš',
      status: 'pending',
      processedBy: null,
      processedAt: null,
      bankReference: null,
      rejectionReason: null,
      createdAt: '2025-06-15T10:30:00Z',
    });
  });

  it('maps completed withdrawal with all fields populated', () => {
    const row = {
      id: 'wd-789',
      user_id: 'user-456',
      amount_cents: 12000,
      iban: 'EE382200221020145685',
      account_holder_name: 'Mari Tamm',
      status: 'completed',
      processed_by: 'staff-001',
      processed_at: '2025-06-16T14:00:00Z',
      bank_reference: 'BANK-REF-001',
      rejection_reason: null,
      created_at: '2025-06-15T10:30:00Z',
    };

    const result = mapWithdrawalRow(row);
    expect(result.status).toBe('completed');
    expect(result.processedBy).toBe('staff-001');
    expect(result.processedAt).toBe('2025-06-16T14:00:00Z');
    expect(result.bankReference).toBe('BANK-REF-001');
    expect(result.rejectionReason).toBeNull();
  });

  it('maps rejected withdrawal with rejection reason', () => {
    const row = {
      id: 'wd-999',
      user_id: 'user-456',
      amount_cents: 500,
      iban: 'LT121000011101001000',
      account_holder_name: 'Petras Jonaitis',
      status: 'rejected',
      processed_by: 'staff-002',
      processed_at: '2025-06-17T09:00:00Z',
      bank_reference: null,
      rejection_reason: 'Invalid IBAN',
      created_at: '2025-06-16T08:00:00Z',
    };

    const result = mapWithdrawalRow(row);
    expect(result.status).toBe('rejected');
    expect(result.rejectionReason).toBe('Invalid IBAN');
    expect(result.bankReference).toBeNull();
  });

  it('preserves exact cent amounts without transformation', () => {
    const row = {
      id: 'wd-1',
      user_id: 'u-1',
      amount_cents: 1,
      iban: 'LV00TEST',
      account_holder_name: 'Test',
      status: 'pending',
      processed_by: null,
      processed_at: null,
      bank_reference: null,
      rejection_reason: null,
      created_at: '2025-01-01T00:00:00Z',
    };

    expect(mapWithdrawalRow(row).amountCents).toBe(1);
  });
});
