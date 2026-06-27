import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import { STORAGE_KEY } from './lib/state';

describe('App', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders the default editor and preview', () => {
    render(<App />);

    expect(screen.getByRole('heading', { name: /create your printable habit tracker/i })).toBeInTheDocument();
    expect(screen.getByDisplayValue('Drink water')).toBeInTheDocument();
    expect(screen.getByText('Habit Tracker')).toBeInTheDocument();
  });

  it('adds a habit and mirrors its name in the preview', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /add habit/i }));
    const inputs = screen.getAllByLabelText(/habit name/i);
    await user.type(inputs[inputs.length - 1], 'Meditate');

    expect(screen.getByText('Meditate')).toBeInTheDocument();
  });

  it('switches language and period controls', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: 'RU' }));
    expect(screen.getByRole('heading', { name: /создайте печатный трекер привычек/i })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /свой/i }));
    const customDaysInput = screen.getByLabelText(/свои дни/i);
    await user.clear(customDaysInput);
    await user.type(customDaysInput, '99');

    expect(customDaysInput).toHaveValue(62);
  });

  it('updates schedules and renders specific day chips', async () => {
    const user = userEvent.setup();
    render(<App />);

    const scheduleSelect = screen.getAllByLabelText(/schedule/i)[0];
    await user.selectOptions(scheduleSelect, 'specific');

    expect(screen.getByRole('button', { name: 'M' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('Mon · Wed · Fri')).toBeInTheDocument();
  });

  it('reorders habits with the drag handle', () => {
    const { container } = render(<App />);
    const handles = screen.getAllByRole('button', { name: /drag to reorder/i });
    const habitWraps = container.querySelectorAll('.habit-wrap');
    const dataTransfer = {
      effectAllowed: 'none',
      setData: vi.fn(),
      setDragImage: vi.fn(),
    };

    fireEvent.dragStart(handles[0], { dataTransfer });
    fireEvent.dragOver(habitWraps[1], { dataTransfer });
    fireEvent.drop(habitWraps[1], { dataTransfer });

    expect(screen.getAllByLabelText(/habit name/i).map((input) => input.getAttribute('value'))).toEqual([
      'Read 30 min',
      'Drink water',
      'Workout',
    ]);
    expect(dataTransfer.setDragImage).toHaveBeenCalledOnce();
    const dragPreview = dataTransfer.setDragImage.mock.calls[0]?.[0] as HTMLElement;
    expect(dragPreview).toHaveClass('habit-drag-preview');
    expect(dragPreview.firstElementChild).toHaveClass('habit-drag-preview-card');
  });

  it('persists and reloads tracker state', async () => {
    const user = userEvent.setup();
    const { unmount } = render(<App />);
    const firstInput = screen.getAllByLabelText(/habit name/i)[0];

    await user.clear(firstInput);
    await user.type(firstInput, 'Sleep');

    await waitFor(() => {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as {
        habits?: Array<{ name: string }>;
      };
      expect(saved.habits?.[0]?.name).toBe('Sleep');
    });

    unmount();
    render(<App />);

    expect(screen.getByDisplayValue('Sleep')).toBeInTheDocument();
  });
});
