import type { Habit, Language, Period, ScheduleType, TrackerState } from '../types';
import { clampCustomDays } from './trackerModel';
import { detectLanguage } from './i18n';

export const STORAGE_KEY = 'paperhabits.v2';

const scheduleTypes: ScheduleType[] = ['everyday', 'weekdays', 'specific', 'everyN'];
const periods: Period[] = ['week', 'month', 'custom'];
const languages: Language[] = ['en', 'ru'];

export function createExampleHabits(lang: Language): Habit[] {
  if (lang === 'ru') {
    return [
      { id: 'h1', name: 'Пить воду', scheduleType: 'everyday', days: [0, 2, 4], everyN: 2 },
      { id: 'h2', name: 'Читать 30 минут', scheduleType: 'weekdays', days: [0, 2, 4], everyN: 3 },
      { id: 'h3', name: 'Тренировка', scheduleType: 'everyN', days: [0, 2, 4], everyN: 2 },
    ];
  }

  return [
    { id: 'h1', name: 'Drink water', scheduleType: 'everyday', days: [0, 2, 4], everyN: 2 },
    { id: 'h2', name: 'Read 30 min', scheduleType: 'weekdays', days: [0, 2, 4], everyN: 3 },
    { id: 'h3', name: 'Workout', scheduleType: 'everyN', days: [0, 2, 4], everyN: 2 },
  ];
}

export function createDefaultState(lang = detectLanguage()): TrackerState {
  return {
    lang,
    period: 'week',
    customDays: 14,
    habits: createExampleHabits(lang),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeDays(value: unknown): number[] {
  if (!Array.isArray(value)) {
    return [0, 2, 4];
  }

  return value
    .filter((day): day is number => Number.isInteger(day) && day >= 0 && day <= 6)
    .filter((day, index, days) => days.indexOf(day) === index);
}

function normalizeHabit(value: unknown, index: number): Habit | null {
  if (!isRecord(value)) {
    return null;
  }

  const scheduleType = scheduleTypes.includes(value.scheduleType as ScheduleType)
    ? (value.scheduleType as ScheduleType)
    : 'everyday';

  return {
    id: typeof value.id === 'string' && value.id ? value.id : `h${index + 1}`,
    name: typeof value.name === 'string' ? value.name : '',
    scheduleType,
    days: normalizeDays(value.days),
    everyN:
      typeof value.everyN === 'number' && Number.isFinite(value.everyN)
        ? Math.max(1, Math.min(30, Math.trunc(value.everyN)))
        : 2,
  };
}

export function loadTrackerState(): TrackerState {
  const fallback = createDefaultState();

  if (typeof localStorage === 'undefined') {
    return fallback;
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return fallback;
    }

    const saved: unknown = JSON.parse(raw);
    if (!isRecord(saved)) {
      return fallback;
    }

    const lang = languages.includes(saved.lang as Language) ? (saved.lang as Language) : fallback.lang;
    const period = periods.includes(saved.period as Period) ? (saved.period as Period) : 'week';
    const customDays =
      typeof saved.customDays === 'number' ? clampCustomDays(saved.customDays) : fallback.customDays;
    const habits = Array.isArray(saved.habits)
      ? saved.habits.map(normalizeHabit).filter((habit): habit is Habit => Boolean(habit))
      : fallback.habits;

    return { lang, period, customDays, habits };
  } catch {
    return fallback;
  }
}

export function saveTrackerState(state: TrackerState): void {
  if (typeof localStorage === 'undefined') {
    return;
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
