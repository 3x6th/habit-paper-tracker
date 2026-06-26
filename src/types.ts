export type Language = 'en' | 'ru';

export type Period = 'week' | 'month' | 'custom';

export type ScheduleType = 'everyday' | 'weekdays' | 'specific' | 'everyN';

export interface Habit {
  id: string;
  name: string;
  scheduleType: ScheduleType;
  days: number[];
  everyN: number;
}

export interface TrackerState {
  lang: Language;
  period: Period;
  customDays: number;
  habits: Habit[];
}

export interface TrackerStrings {
  heroBadge: string;
  heroTitle: string;
  heroSub: string;
  heroCta: string;
  editorTitle: string;
  editorSub: string;
  addHabit: string;
  namePlaceholder: string;
  scheduleLabel: string;
  emptyTitle: string;
  emptySub: string;
  schedEveryday: string;
  schedWeekdays: string;
  schedSpecific: string;
  schedEveryN: string;
  everyNPre: string;
  everyNPost: string;
  previewTitle: string;
  previewSub: string;
  previewEmpty: string;
  colHabit: string;
  perWeek: string;
  perMonth: string;
  perCustom: string;
  daysLabel: string;
  customDaysLabel: string;
  genTitle: string;
  genSub: string;
  generate: string;
  tagA4: string;
  tagBW: string;
  tagPrint: string;
  footer: string;
  dragTip: string;
  deleteTip: string;
  toastDone: string;
  toastNeed: string;
  toastError: string;
  paperTitle: string;
  weekOf: string;
  months: string[];
  weekShort: string[];
  weekChip: string[];
}

export interface TrackerColumn {
  label: string;
  weekdayLabel: string;
  dateLabel?: string;
  weekday: number;
  index: number;
}

export interface TrackerCell {
  active: boolean;
}

export interface TrackerRow {
  id: string;
  name: string;
  scheduleLabel: string;
  cells: TrackerCell[];
}

export interface TrackerModel {
  columns: TrackerColumn[];
  rows: TrackerRow[];
  rangeText: string;
  titleText: string;
  colHabit: string;
  footer: string;
}
