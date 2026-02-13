import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  formatDate,
  formatDateShort,
  formatTime,
  formatDateTime,
  formatMessageTime,
} from './date-utils';

describe('formatDate', () => {
  it('formats as dd.MM.yyyy', () => {
    expect(formatDate(new Date(2026, 7, 31))).toBe('31.08.2026');
  });

  it('accepts string input', () => {
    expect(formatDate('2026-08-31T00:00:00')).toBe('31.08.2026');
  });

  it('accepts timestamp number', () => {
    const ts = new Date(2026, 0, 15).getTime();
    expect(formatDate(ts)).toBe('15.01.2026');
  });

  it('zero-pads day and month', () => {
    expect(formatDate(new Date(2026, 0, 5))).toBe('05.01.2026');
  });
});

describe('formatDateShort', () => {
  it('formats as dd.MM', () => {
    expect(formatDateShort(new Date(2026, 7, 31))).toBe('31.08');
  });
});

describe('formatTime', () => {
  it('formats as 24-hour HH:mm', () => {
    expect(formatTime(new Date(2026, 0, 1, 14, 30))).toBe('14:30');
  });

  it('formats midnight', () => {
    expect(formatTime(new Date(2026, 0, 1, 0, 0))).toBe('00:00');
  });

  it('zero-pads hours and minutes', () => {
    expect(formatTime(new Date(2026, 0, 1, 9, 5))).toBe('09:05');
  });
});

describe('formatDateTime', () => {
  it('formats as dd.MM.yyyy HH:mm', () => {
    expect(formatDateTime(new Date(2026, 7, 31, 14, 30))).toBe('31.08.2026 14:30');
  });
});

describe('formatMessageTime', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows just time for today', () => {
    vi.useFakeTimers();
    const now = new Date(2026, 5, 15, 16, 0);
    vi.setSystemTime(now);

    const earlier = new Date(2026, 5, 15, 14, 30);
    expect(formatMessageTime(earlier)).toBe('14:30');
  });

  it('shows "Yesterday, HH:mm" for yesterday', () => {
    vi.useFakeTimers();
    const now = new Date(2026, 5, 15, 16, 0);
    vi.setSystemTime(now);

    const yesterday = new Date(2026, 5, 14, 10, 45);
    expect(formatMessageTime(yesterday)).toBe('Yesterday, 10:45');
  });

  it('shows day name for dates within 7 days', () => {
    vi.useFakeTimers();
    // June 15, 2026 is a Monday
    const now = new Date(2026, 5, 15, 16, 0);
    vi.setSystemTime(now);

    // June 12, 2026 is a Friday (3 days ago)
    const threeDaysAgo = new Date(2026, 5, 12, 9, 15);
    expect(formatMessageTime(threeDaysAgo)).toBe('Fri, 09:15');
  });

  it('shows short date for dates older than 7 days', () => {
    vi.useFakeTimers();
    const now = new Date(2026, 5, 15, 16, 0);
    vi.setSystemTime(now);

    const tenDaysAgo = new Date(2026, 5, 5, 8, 0);
    expect(formatMessageTime(tenDaysAgo)).toBe('05.06 08:00');
  });
});
