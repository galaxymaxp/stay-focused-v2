import { expect, it, vi } from 'vitest';
import { timeLabel, dateLabel } from './api';

it('uses twelve-hour time even with a 24-hour default locale', () => {
  const time = Date.prototype.toLocaleTimeString, date = Date.prototype.toLocaleString;
  vi.spyOn(Date.prototype, 'toLocaleTimeString').mockImplementation(function (this: Date, _locale, options) { return time.call(this, 'en-GB', options); });
  vi.spyOn(Date.prototype, 'toLocaleString').mockImplementation(function (this: Date, _locale, options) { return date.call(this, 'en-GB', options); });
  try {
    const value = new Date(2026, 9, 9, 13, 5).toISOString();
    expect(timeLabel(value)).toMatch(/1:05\s*pm/i);
    expect(dateLabel(value)).toMatch(/1:05\s*pm/i);
  } finally { vi.restoreAllMocks(); }
});
