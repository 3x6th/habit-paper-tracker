import { describe, expect, it } from 'vitest';
import type { Habit, TrackerState } from '../types';
import { detectLanguage, getStrings } from './i18n';
import { clampCustomDays, computeTrackerModel, startOfWeek, weekdayFromMonday } from './trackerModel';

const now = new Date('2026-06-24T12:00:00');
const strings = getStrings('en');

function state(habits: Habit[], patch: Partial<TrackerState> = {}): TrackerState {
  return {
    lang: 'en',
    period: 'week',
    customDays: 14,
    habits,
    ...patch,
  };
}

describe('date helpers', () => {
  it('treats Monday as weekday zero and starts weeks on Monday', () => {
    const wednesday = new Date('2026-06-24T12:00:00');
    const start = startOfWeek(wednesday);

    expect(weekdayFromMonday(wednesday)).toBe(2);
    expect([start.getFullYear(), start.getMonth(), start.getDate()]).toEqual([2026, 5, 22]);
  });

  it('clamps custom periods to the printable range', () => {
    expect(clampCustomDays(0)).toBe(1);
    expect(clampCustomDays(99)).toBe(62);
    expect(clampCustomDays(Number.NaN)).toBe(14);
  });

  it('detects Russian browser locales', () => {
    expect(detectLanguage({ language: 'ru-RU', languages: ['ru-RU', 'en-US'] })).toBe('ru');
    expect(detectLanguage({ language: 'en-US', languages: ['en-US'] })).toBe('en');
  });
});

describe('computeTrackerModel', () => {
  it('builds weekly columns and range text', () => {
    const model = computeTrackerModel(state([]), strings, now);

    expect(model.columns.map((column) => column.label)).toEqual([
      'Mon',
      'Tue',
      'Wed',
      'Thu',
      'Fri',
      'Sat',
      'Sun',
    ]);
    expect(model.columns.map((column) => column.weekdayLabel)).toEqual([
      'Mon',
      'Tue',
      'Wed',
      'Thu',
      'Fri',
      'Sat',
      'Sun',
    ]);
    expect(model.columns.map((column) => column.dateLabel)).toEqual([
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
    ]);
    expect(model.columns.map((column) => column.weekday)).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(model.rangeText).toBe('Week of 22 June');
  });

  it('builds all days for the current month', () => {
    const model = computeTrackerModel(state([], { period: 'month' }), strings, new Date('2024-02-10T12:00:00'));

    expect(model.columns).toHaveLength(29);
    expect(model.columns[0]).toMatchObject({ label: 'Thu 1', weekdayLabel: 'Thu', dateLabel: '1' });
    expect(model.columns[28]).toMatchObject({ label: 'Thu 29', weekdayLabel: 'Thu', dateLabel: '29' });
    expect(model.rangeText).toBe('February 2024');
  });

  it('builds a clamped custom range from today', () => {
    const model = computeTrackerModel(state([], { period: 'custom', customDays: 100 }), strings, now);

    expect(model.columns).toHaveLength(62);
    expect(model.columns[0]).toMatchObject({ label: 'Wed 24', weekdayLabel: 'Wed', dateLabel: '24' });
    expect(model.rangeText).toBe('24 June - 24 August');
  });

  it('marks weekdays, specific days, and every-N cells correctly', () => {
    const habits: Habit[] = [
      { id: 'everyday', name: 'Every', scheduleType: 'everyday', days: [], everyN: 2 },
      { id: 'weekdays', name: 'Work', scheduleType: 'weekdays', days: [], everyN: 2 },
      { id: 'specific', name: 'Yoga', scheduleType: 'specific', days: [1, 3], everyN: 2 },
      { id: 'everyN', name: 'Run', scheduleType: 'everyN', days: [], everyN: 3 },
    ];
    const model = computeTrackerModel(state(habits), strings, now);

    expect(model.rows[0].cells.map((cell) => cell.active)).toEqual([
      true,
      true,
      true,
      true,
      true,
      true,
      true,
    ]);
    expect(model.rows[1].cells.map((cell) => cell.active)).toEqual([
      true,
      true,
      true,
      true,
      true,
      false,
      false,
    ]);
    expect(model.rows[2].cells.map((cell) => cell.active)).toEqual([
      false,
      true,
      false,
      true,
      false,
      false,
      false,
    ]);
    expect(model.rows[3].cells.map((cell) => cell.active)).toEqual([
      true,
      false,
      false,
      true,
      false,
      false,
      true,
    ]);
  });
});
