import {
  ArrowRight,
  Check,
  ChevronDown,
  Download,
  GripVertical,
  Plus,
  Trash2,
} from 'lucide-react';
import {
  type ChangeEvent,
  type DragEvent as ReactDragEvent,
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { Habit, Language, Period, ScheduleType, TrackerState } from './types';
import { getStrings } from './lib/i18n';
import { clampCustomDays, computeTrackerModel } from './lib/trackerModel';
import { generateTrackerPdf } from './lib/pdf';
import { loadTrackerState, saveTrackerState } from './lib/state';

const scheduleTypes: ScheduleType[] = ['everyday', 'weekdays', 'specific', 'everyN'];

function newHabit(): Habit {
  return {
    id: `h${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`,
    name: '',
    scheduleType: 'everyday',
    days: [0, 2, 4],
    everyN: 2,
  };
}

function SegmentButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button className="segment-button" type="button" aria-pressed={active} onClick={onClick}>
      {children}
    </button>
  );
}

function StepTitle({ number, title, sub }: { number: string; title: string; sub?: string }) {
  return (
    <div>
      <div className="step-title">
        <span className="step-number">{number}</span>
        <h2>{title}</h2>
      </div>
      {sub ? <p className="step-subtitle">{sub}</p> : null}
    </div>
  );
}

function updateHabit(habits: Habit[], id: string, patch: Partial<Habit>): Habit[] {
  return habits.map((habit) => (habit.id === id ? { ...habit, ...patch } : habit));
}

export default function App() {
  const [tracker, setTracker] = useState<TrackerState>(() => loadTrackerState());
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const editorRef = useRef<HTMLElement | null>(null);
  const toastTimerRef = useRef<number | null>(null);
  const strings = getStrings(tracker.lang);
  const model = useMemo(() => computeTrackerModel(tracker, strings), [tracker, strings]);

  useEffect(() => {
    saveTrackerState(tracker);
    document.documentElement.lang = tracker.lang;
  }, [tracker]);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        window.clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  const showToast = (message: string) => {
    setToast(message);
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = window.setTimeout(() => setToast(null), 2200);
  };

  const setLanguage = (lang: Language) => {
    setTracker((current) => ({ ...current, lang }));
  };

  const setPeriod = (period: Period) => {
    setTracker((current) => ({ ...current, period }));
  };

  const addHabit = () => {
    setTracker((current) => ({ ...current, habits: [...current.habits, newHabit()] }));
  };

  const deleteHabit = (id: string) => {
    setTracker((current) => ({ ...current, habits: current.habits.filter((habit) => habit.id !== id) }));
  };

  const patchHabit = (id: string, patch: Partial<Habit>) => {
    setTracker((current) => ({ ...current, habits: updateHabit(current.habits, id, patch) }));
  };

  const toggleDay = (id: string, day: number) => {
    setTracker((current) => ({
      ...current,
      habits: current.habits.map((habit) => {
        if (habit.id !== id) {
          return habit;
        }

        const days = habit.days.includes(day)
          ? habit.days.filter((currentDay) => currentDay !== day)
          : [...habit.days, day];
        return { ...habit, days };
      }),
    }));
  };

  const reorderHabit = (targetId: string) => {
    if (!draggingId || draggingId === targetId) {
      return;
    }

    setTracker((current) => {
      const habits = current.habits.slice();
      const from = habits.findIndex((habit) => habit.id === draggingId);
      const to = habits.findIndex((habit) => habit.id === targetId);

      if (from < 0 || to < 0) {
        return current;
      }

      const [moved] = habits.splice(from, 1);
      habits.splice(to, 0, moved);
      return { ...current, habits };
    });
  };

  const handleCustomDays = (event: ChangeEvent<HTMLInputElement>) => {
    setTracker((current) => ({
      ...current,
      customDays: clampCustomDays(Number.parseInt(event.target.value, 10)),
    }));
  };

  const handleSchedule = (habit: Habit, event: ChangeEvent<HTMLSelectElement>) => {
    const scheduleType = event.target.value as ScheduleType;
    if (scheduleTypes.includes(scheduleType)) {
      patchHabit(habit.id, { scheduleType });
    }
  };

  const handleDragStart = (event: ReactDragEvent<HTMLButtonElement>, id: string) => {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', id);
    setDraggingId(id);
  };

  const handleGenerate = async () => {
    if (!model.rows.length) {
      showToast(strings.toastNeed);
      return;
    }

    try {
      await generateTrackerPdf(model);
      showToast(strings.toastDone);
    } catch {
      showToast(strings.toastError);
    }
  };

  const scrollToEditor = () => {
    editorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const isLandscapePreview = model.columns.length > 12;

  return (
    <div className="app-shell">
      <div className="container">
        <header className="topbar">
          <div className="brand" aria-label="Paper Habits">
            <span className="brand-mark">
              <Check size={16} strokeWidth={2.4} />
            </span>
            <span>Paper Habits</span>
          </div>
          <div className="segment-control" aria-label="Language">
            <SegmentButton active={tracker.lang === 'en'} onClick={() => setLanguage('en')}>
              EN
            </SegmentButton>
            <SegmentButton active={tracker.lang === 'ru'} onClick={() => setLanguage('ru')}>
              RU
            </SegmentButton>
          </div>
        </header>

        <main>
          <section className="hero">
            <div className="hero-badge">
              <span aria-hidden="true" />
              {strings.heroBadge}
            </div>
            <h1>{strings.heroTitle}</h1>
            <p>{strings.heroSub}</p>
            <button className="primary-button" type="button" onClick={scrollToEditor}>
              {strings.heroCta}
              <ArrowRight size={18} strokeWidth={2.2} />
            </button>
          </section>

          <section className="editor-section" ref={editorRef}>
            <div className="section-head">
              <StepTitle number="1" title={strings.editorTitle} sub={strings.editorSub} />
            </div>

            {tracker.habits.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">
                  <Plus size={20} strokeWidth={2} />
                </div>
                <div className="empty-title">{strings.emptyTitle}</div>
                <div className="empty-subtitle">{strings.emptySub}</div>
              </div>
            ) : null}

            <div className="habit-list">
              {tracker.habits.map((habit) => {
                const isDragOver = dragOverId === habit.id && draggingId !== null && draggingId !== habit.id;
                return (
                  <div
                    className={`habit-wrap ${draggingId === habit.id ? 'is-dragging' : ''}`}
                    key={habit.id}
                    onDragOver={(event) => {
                      event.preventDefault();
                      setDragOverId(habit.id);
                    }}
                    onDrop={(event) => {
                      event.preventDefault();
                      reorderHabit(habit.id);
                      setDraggingId(null);
                      setDragOverId(null);
                    }}
                  >
                    {isDragOver ? <div className="drop-line" /> : null}
                    <div className="habit-card">
                      <button
                        className="icon-button drag-handle"
                        type="button"
                        draggable
                        title={strings.dragTip}
                        aria-label={strings.dragTip}
                        onDragStart={(event) => handleDragStart(event, habit.id)}
                        onDragEnd={() => {
                          setDraggingId(null);
                          setDragOverId(null);
                        }}
                      >
                        <GripVertical size={18} strokeWidth={2} />
                      </button>

                      <div className="habit-main">
                        <input
                          aria-label={strings.namePlaceholder}
                          className="habit-name-input"
                          value={habit.name}
                          placeholder={strings.namePlaceholder}
                          onChange={(event) => patchHabit(habit.id, { name: event.target.value })}
                        />

                        <div className="habit-controls">
                          <label className="select-wrap">
                            <span className="sr-only">{strings.scheduleLabel}</span>
                            <select
                              aria-label={strings.scheduleLabel}
                              value={habit.scheduleType}
                              onChange={(event) => handleSchedule(habit, event)}
                            >
                              <option value="everyday">{strings.schedEveryday}</option>
                              <option value="weekdays">{strings.schedWeekdays}</option>
                              <option value="specific">{strings.schedSpecific}</option>
                              <option value="everyN">{strings.schedEveryN}</option>
                            </select>
                            <ChevronDown size={13} strokeWidth={2.4} aria-hidden="true" />
                          </label>

                          {habit.scheduleType === 'specific' ? (
                            <div className="day-chips" aria-label={strings.schedSpecific}>
                              {strings.weekChip.map((label, day) => {
                                const active = habit.days.includes(day);
                                return (
                                  <button
                                    className="day-chip"
                                    type="button"
                                    aria-pressed={active}
                                    key={`${habit.id}-${day}`}
                                    onClick={() => toggleDay(habit.id, day)}
                                  >
                                    {label}
                                  </button>
                                );
                              })}
                            </div>
                          ) : null}

                          {habit.scheduleType === 'everyN' ? (
                            <div className="stepper" aria-label={strings.schedEveryN}>
                              <span>{strings.everyNPre}</span>
                              <button
                                type="button"
                                aria-label={`${strings.schedEveryN} minus`}
                                onClick={() => patchHabit(habit.id, { everyN: Math.max(2, habit.everyN - 1) })}
                              >
                                -
                              </button>
                              <strong>{habit.everyN}</strong>
                              <button
                                type="button"
                                aria-label={`${strings.schedEveryN} plus`}
                                onClick={() => patchHabit(habit.id, { everyN: Math.min(30, habit.everyN + 1) })}
                              >
                                +
                              </button>
                              <span>{strings.everyNPost}</span>
                            </div>
                          ) : null}
                        </div>
                      </div>

                      <button
                        className="icon-button delete-button"
                        type="button"
                        title={strings.deleteTip}
                        aria-label={strings.deleteTip}
                        onClick={() => deleteHabit(habit.id)}
                      >
                        <Trash2 size={17} strokeWidth={1.9} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <button className="add-button" type="button" onClick={addHabit}>
              <Plus size={18} strokeWidth={2.2} />
              {strings.addHabit}
            </button>
          </section>

          <section className="preview-section">
            <div className="section-head preview-head">
              <StepTitle number="2" title={strings.previewTitle} sub={strings.previewSub} />
              <div className="preview-controls">
                <div className="segment-control" aria-label={strings.previewTitle}>
                  <SegmentButton active={tracker.period === 'week'} onClick={() => setPeriod('week')}>
                    {strings.perWeek}
                  </SegmentButton>
                  <SegmentButton active={tracker.period === 'month'} onClick={() => setPeriod('month')}>
                    {strings.perMonth}
                  </SegmentButton>
                  <SegmentButton active={tracker.period === 'custom'} onClick={() => setPeriod('custom')}>
                    {strings.perCustom}
                  </SegmentButton>
                </div>

                {tracker.period === 'custom' ? (
                  <label className="custom-days">
                    <span className="sr-only">{strings.customDaysLabel}</span>
                    <input
                      aria-label={strings.customDaysLabel}
                      type="number"
                      min={1}
                      max={62}
                      value={tracker.customDays}
                      onChange={handleCustomDays}
                    />
                    <span>{strings.daysLabel}</span>
                  </label>
                ) : null}
              </div>
            </div>

            <div className="paper-viewport">
              <div className={`tracker-paper ${isLandscapePreview ? 'tracker-paper-landscape' : ''}`}>
                <div className="paper-header">
                  <div>{model.titleText}</div>
                  <span>{model.rangeText}</span>
                </div>

                {tracker.habits.length === 0 ? (
                  <div className="preview-empty">{strings.previewEmpty}</div>
                ) : (
                  <div className="tracker-grid">
                    <div className="tracker-grid-head">
                      <div>{model.colHabit}</div>
                      <div className="tracker-grid-cells">
                        {model.columns.map((column) => (
                          <div
                            className={column.dateLabel ? 'tracker-column-label has-date' : 'tracker-column-label'}
                            key={`${column.index}-${column.label}`}
                          >
                            <span>{column.weekdayLabel}</span>
                            {column.dateLabel ? <strong>{column.dateLabel}</strong> : null}
                          </div>
                        ))}
                      </div>
                    </div>

                    {model.rows.map((row) => (
                      <div className="tracker-row" key={row.id}>
                        <div className="tracker-row-name">
                          <strong>{row.name}</strong>
                          <span>{row.scheduleLabel}</span>
                        </div>
                        <div className="tracker-grid-cells">
                          {row.cells.map((cell, index) => (
                            <div key={`${row.id}-${index}`} className="tracker-cell">
                              {cell.active ? <span aria-hidden="true" /> : null}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>

          <section className="generate-section">
            <div className="generate-title">
              <span className="step-number">3</span>
              <h2>{strings.genTitle}</h2>
            </div>
            <p>{strings.genSub}</p>
            <button className="primary-button primary-button-large" type="button" onClick={handleGenerate}>
              <Download size={20} strokeWidth={2.1} />
              {strings.generate}
            </button>
            <div className="print-tags" aria-label="Print details">
              <span>{strings.tagA4}</span>
              <span aria-hidden="true">·</span>
              <span>{strings.tagBW}</span>
              <span aria-hidden="true">·</span>
              <span>{strings.tagPrint}</span>
            </div>
          </section>
        </main>

        <footer className="footer">{strings.footer}</footer>
      </div>

      {toast ? (
        <div className="toast" role="status">
          <Check size={17} strokeWidth={2.4} />
          {toast}
        </div>
      ) : null}
    </div>
  );
}
