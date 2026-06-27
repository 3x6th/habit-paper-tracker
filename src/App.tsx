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
  type PointerEvent as ReactPointerEvent,
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
const INSTAGRAM_URL = 'https://www.instagram.com/baskaa_a/';
const TELEGRAM_URL = 'https://t.me/daily_baska';
const TOUCH_PREVIEW_HEIGHT = 66;
const TOUCH_PREVIEW_MARGIN = 4;

interface TouchDragSession {
  pointerId: number;
  sourceId: string;
  targetId: string | null;
}

interface TouchDragPreview {
  left: number;
  name: string;
  top: number;
  width: number;
}

function getTouchViewport() {
  const viewport = window.visualViewport;
  return {
    height: viewport?.height ?? window.innerHeight,
    left: viewport?.offsetLeft ?? 0,
    top: viewport?.offsetTop ?? 0,
    width: viewport?.width ?? window.innerWidth,
  };
}

function getTouchPreviewTop(clientY: number): number {
  const viewport = getTouchViewport();
  const centeredTop = clientY + viewport.top - TOUCH_PREVIEW_HEIGHT / 2;
  return Math.max(
    viewport.top + TOUCH_PREVIEW_MARGIN,
    Math.min(
      centeredTop,
      viewport.top + viewport.height - TOUCH_PREVIEW_HEIGHT - TOUCH_PREVIEW_MARGIN,
    ),
  );
}

function InstagramIcon() {
  return (
    <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none">
      <rect
        x="2"
        y="2"
        width="20"
        height="20"
        rx="5.5"
        ry="5.5"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx="12"
        cy="12"
        r="4"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <line
        x1="17.5"
        y1="6.5"
        x2="17.51"
        y2="6.5"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function TelegramIcon() {
  return (
    <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path
        d="M21.5 4.2 2.9 11.3c-.9.35-.88 1.65.03 1.96l4.6 1.56 1.78 5.3c.27.66 1.1.83 1.6.33l2.55-2.5 4.6 3.4c.6.45 1.47.12 1.63-.62L23 5.2c.2-.93-.66-1.5-1.5-1z"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M7.5 14.8 18 7"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

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
  const [touchDragPreview, setTouchDragPreview] = useState<TouchDragPreview | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const editorRef = useRef<HTMLElement | null>(null);
  const touchDragRef = useRef<TouchDragSession | null>(null);
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

  const reorderHabit = (sourceId: string, targetId: string) => {
    if (sourceId === targetId) {
      return;
    }

    setTracker((current) => {
      const habits = current.habits.slice();
      const from = habits.findIndex((habit) => habit.id === sourceId);
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

  const handleDragStart = (
    event: ReactDragEvent<HTMLButtonElement>,
    id: string,
    habitName: string,
  ) => {
    if (touchDragRef.current) {
      event.preventDefault();
      return;
    }

    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', id);

    const habitCard = event.currentTarget.closest<HTMLElement>('.habit-card');
    const preview = document.createElement('div');
    const previewCard = document.createElement('div');
    const previewGrip = event.currentTarget.querySelector('svg')?.cloneNode(true);
    const previewName = document.createElement('span');
    const cardWidth = habitCard?.getBoundingClientRect().width ?? 360;

    preview.className = 'habit-drag-preview';
    previewCard.className = 'habit-drag-preview-card';
    preview.style.width = `${Math.min(cardWidth, 420)}px`;
    preview.setAttribute('aria-hidden', 'true');
    previewName.textContent = habitName.trim() || strings.namePlaceholder;

    if (previewGrip) {
      previewCard.append(previewGrip);
    }
    previewCard.append(previewName);
    preview.append(previewCard);
    document.body.append(preview);
    event.dataTransfer.setDragImage(preview, 28, 33);
    window.setTimeout(() => preview.remove(), 0);

    setDraggingId(id);
  };

  const handlePointerDown = (
    event: ReactPointerEvent<HTMLButtonElement>,
    id: string,
    habitName: string,
  ) => {
    if (event.pointerType === 'mouse' || event.button !== 0) {
      return;
    }

    event.preventDefault();
    const habitCard = event.currentTarget.closest<HTMLElement>('.habit-card');
    const cardRect = habitCard?.getBoundingClientRect();
    const viewport = getTouchViewport();
    const width = Math.min(cardRect?.width ?? 320, viewport.width - TOUCH_PREVIEW_MARGIN * 2, 420);
    const left = Math.max(
      viewport.left + TOUCH_PREVIEW_MARGIN,
      Math.min(
        (cardRect?.left ?? TOUCH_PREVIEW_MARGIN) + viewport.left,
        viewport.left + viewport.width - width - TOUCH_PREVIEW_MARGIN,
      ),
    );

    touchDragRef.current = {
      pointerId: event.pointerId,
      sourceId: id,
      targetId: null,
    };
    event.currentTarget.setPointerCapture?.(event.pointerId);
    setDraggingId(id);
    setDragOverId(null);
    setTouchDragPreview({
      left,
      name: habitName.trim() || strings.namePlaceholder,
      top: getTouchPreviewTop(event.clientY),
      width,
    });
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const session = touchDragRef.current;
    if (!session || session.pointerId !== event.pointerId) {
      return;
    }

    event.preventDefault();
    const target = document
      .elementFromPoint(event.clientX, event.clientY)
      ?.closest<HTMLElement>('.habit-wrap');
    const targetId = target?.dataset.habitId ?? null;

    session.targetId = targetId && targetId !== session.sourceId ? targetId : null;
    setDragOverId(session.targetId);
    setTouchDragPreview((current) =>
      current
        ? {
            ...current,
            top: getTouchPreviewTop(event.clientY),
          }
        : current,
    );

    const viewport = getTouchViewport();
    const edgeSize = 72;
    const scrollDelta =
      event.clientY < viewport.top + edgeSize
        ? -10
        : event.clientY > viewport.top + viewport.height - edgeSize
          ? 10
          : 0;
    if (scrollDelta !== 0) {
      window.scrollBy(0, scrollDelta);
    }
  };

  const finishPointerDrag = (event: ReactPointerEvent<HTMLButtonElement>, cancelled = false) => {
    const session = touchDragRef.current;
    if (!session || session.pointerId !== event.pointerId) {
      return;
    }

    touchDragRef.current = null;
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    if (!cancelled && session.targetId) {
      reorderHabit(session.sourceId, session.targetId);
    }
    setDraggingId(null);
    setDragOverId(null);
    setTouchDragPreview(null);
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
                    data-habit-id={habit.id}
                    key={habit.id}
                    onDragOver={(event) => {
                      event.preventDefault();
                      setDragOverId(habit.id);
                    }}
                    onDrop={(event) => {
                      event.preventDefault();
                      if (draggingId) {
                        reorderHabit(draggingId, habit.id);
                      }
                      setDraggingId(null);
                      setDragOverId(null);
                    }}
                  >
                    {isDragOver ? <div className="drop-line" /> : null}
                    <div className="habit-card">
                      <button
                        className="icon-button drag-handle"
                        type="button"
                        draggable={touchDragPreview === null}
                        title={strings.dragTip}
                        aria-label={strings.dragTip}
                        onDragStart={(event) => handleDragStart(event, habit.id, habit.name)}
                        onDragEnd={() => {
                          if (!touchDragRef.current) {
                            setDraggingId(null);
                            setDragOverId(null);
                          }
                        }}
                        onPointerDown={(event) => handlePointerDown(event, habit.id, habit.name)}
                        onPointerMove={handlePointerMove}
                        onPointerUp={(event) => finishPointerDrag(event)}
                        onPointerCancel={(event) => finishPointerDrag(event, true)}
                        onLostPointerCapture={(event) => finishPointerDrag(event, true)}
                        onContextMenu={(event) => event.preventDefault()}
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
                          <div className="tracker-column-label" key={`${column.index}-${column.label}`}>
                            {column.dateLabel ?? column.weekdayLabel}
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

        <footer className="footer">
          <div className="footer-social-line">{strings.socialLine}</div>
          <div className="footer-links" aria-label="Social links">
            <a href={INSTAGRAM_URL} target="_blank" rel="noreferrer" title="Instagram">
              <InstagramIcon />
              {strings.socialInstagram}
            </a>
            <a href={TELEGRAM_URL} target="_blank" rel="noreferrer" title="Telegram">
              <TelegramIcon />
              {strings.socialTelegram}
            </a>
          </div>
          <div className="footer-note">{strings.footer}</div>
        </footer>
      </div>

      {touchDragPreview ? (
        <div
          className="touch-drag-preview"
          style={{
            left: touchDragPreview.left,
            top: touchDragPreview.top,
            width: touchDragPreview.width,
          }}
          aria-hidden="true"
        >
          <div className="habit-drag-preview-card">
            <GripVertical size={18} strokeWidth={2} />
            <span>{touchDragPreview.name}</span>
          </div>
        </div>
      ) : null}

      {toast ? (
        <div className="toast" role="status">
          <Check size={17} strokeWidth={2.4} />
          {toast}
        </div>
      ) : null}
    </div>
  );
}
