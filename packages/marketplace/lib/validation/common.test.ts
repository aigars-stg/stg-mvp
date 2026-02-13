import { describe, it, expect } from 'vitest';
import { paginationSchema, uuidSchema } from './common';

describe('paginationSchema', () => {
  it('applies defaults when empty', () => {
    const result = paginationSchema.parse({});
    expect(result).toEqual({ page: 1, limit: 20 });
  });

  it('coerces string values to numbers', () => {
    const result = paginationSchema.parse({ page: '3', limit: '50' });
    expect(result).toEqual({ page: 3, limit: 50 });
  });

  it('rejects page less than 1', () => {
    const result = paginationSchema.safeParse({ page: 0 });
    expect(result.success).toBe(false);
  });

  it('rejects limit greater than 100', () => {
    const result = paginationSchema.safeParse({ limit: 101 });
    expect(result.success).toBe(false);
  });

  it('rejects limit less than 1', () => {
    const result = paginationSchema.safeParse({ limit: 0 });
    expect(result.success).toBe(false);
  });

  it('accepts boundary values', () => {
    const result = paginationSchema.parse({ page: 1, limit: 100 });
    expect(result).toEqual({ page: 1, limit: 100 });
  });
});

describe('uuidSchema', () => {
  it('accepts valid UUID', () => {
    const result = uuidSchema.safeParse('550e8400-e29b-41d4-a716-446655440000');
    expect(result.success).toBe(true);
  });

  it('rejects invalid UUID', () => {
    const result = uuidSchema.safeParse('not-a-uuid');
    expect(result.success).toBe(false);
  });

  it('rejects empty string', () => {
    const result = uuidSchema.safeParse('');
    expect(result.success).toBe(false);
  });
});
