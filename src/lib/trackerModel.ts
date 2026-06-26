import type { Habit, TrackerModel, TrackerState, TrackerStrings } from '../types';

export function weekdayFromMonday(date: Date): number {
  return (date.getDay() + 6) % 7;
}

export function startOfWeek(date: Date): Date {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - weekdayFromMonday(start));
  return start;
}

export function clampCustomDays(value: number): number {
  if (!Number.isFinite(value)) {
    return 14;
  }

  return Math.max(1, Math.min(62, Math.trunc(value)));
}

function formatDate(date: Date, strings: TrackerStrings): string {
  return `${date.getDate()} ${strings.months[date.getMonth()]}`;
}

function capitalized(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function isHabitActive(habit: Habit, weekday: number, index: number): boolean {
  switch (habit.scheduleType) {
    case 'everyday':
      return true;
    case 'weekdays':
      return weekday < 5;
    case 'specific':
      return habit.days.includes(weekday);
    case 'everyN':
      return index % Math.max(1, habit.everyN || 1) === 0;
    default:
      return true;
  }
}

function scheduleLabel(habit: Habit, strings: TrackerStrings): string {
  switch (habit.scheduleType) {
    case 'everyday':
      return strings.schedEveryday;
    case 'weekdays':
      return strings.schedWeekdays;
    case 'specific': {
      const labels = habit.days
        .slice()
        .sort((left, right) => left - right)
        .map((day) => strings.weekShort[day])
        .filter(Boolean);
      return labels.length ? labels.join(' · ') : strings.schedSpecific;
    }
    case 'everyN':
      return `${strings.everyNPre} ${Math.max(1, habit.everyN || 1)} ${strings.everyNPost}`;
    default:
      return '';
  }
}

export function computeTrackerModel(
  state: Pick<TrackerState, 'period' | 'customDays' | 'habits'>,
  strings: TrackerStrings,
  now = new Date(),
): TrackerModel {
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const columns: TrackerModel['columns'] = [];
  let rangeText = '';

  if (state.period === 'week') {
    const start = startOfWeek(today);

    for (let index = 0; index < 7; index += 1) {
      columns.push({ label: strings.weekShort[index], weekday: index, index });
    }

    rangeText = `${strings.weekOf} ${formatDate(start, strings)}`;
  } else if (state.period === 'month') {
    const year = today.getFullYear();
    const month = today.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    for (let index = 0; index < daysInMonth; index += 1) {
      const date = new Date(year, month, index + 1);
      columns.push({
        label: String(index + 1),
        weekday: weekdayFromMonday(date),
        index,
      });
    }

    rangeText = `${capitalized(strings.months[month])} ${year}`;
  } else {
    const days = clampCustomDays(state.customDays);

    for (let index = 0; index < days; index += 1) {
      const date = new Date(today);
      date.setDate(today.getDate() + index);
      columns.push({
        label: String(date.getDate()),
        weekday: weekdayFromMonday(date),
        index,
      });
    }

    const end = new Date(today);
    end.setDate(today.getDate() + days - 1);
    rangeText = `${formatDate(today, strings)} - ${formatDate(end, strings)}`;
  }

  return {
    columns,
    rows: state.habits.map((habit) => ({
      id: habit.id,
      name: habit.name || strings.namePlaceholder,
      scheduleLabel: scheduleLabel(habit, strings),
      cells: columns.map((column) => ({
        active: isHabitActive(habit, column.weekday, column.index),
      })),
    })),
    rangeText,
    titleText: strings.paperTitle,
    colHabit: strings.colHabit,
    footer: strings.footer,
  };
}
