'use client';

import { useCallback, useState } from 'react';

export type MultiDaySessionConfigProps = {
  multiDay: boolean;
  sessionDates: string[];
  dailyDurationMinutes: number | undefined;
  maxTravelMinutesPerDay: number | undefined;
  onMultiDayChange: (enabled: boolean) => void;
  onSessionDatesChange: (dates: string[]) => void;
  onDailyDurationChange: (minutes: number | undefined) => void;
  onMaxTravelChange: (minutes: number | undefined) => void;
};

/** Generate an array of ISO date strings (YYYY-MM-DD) starting from startDate. */
function generateDates(startDate: string, numDays: number): string[] {
  if (!startDate || numDays < 1) return [];
  const result: string[] = [];
  // Parse as local date to avoid UTC-shift display bugs
  const [year, month, day] = startDate.split('-').map(Number);
  for (let i = 0; i < numDays; i++) {
    const d = new Date(year, month - 1, day + i);
    const iso = [
      d.getFullYear(),
      String(d.getMonth() + 1).padStart(2, '0'),
      String(d.getDate()).padStart(2, '0'),
    ].join('-');
    result.push(iso);
  }
  return result;
}

export function MultiDaySessionConfig({
  multiDay,
  sessionDates,
  dailyDurationMinutes,
  maxTravelMinutesPerDay,
  onMultiDayChange,
  onSessionDatesChange,
  onDailyDurationChange,
  onMaxTravelChange,
}: MultiDaySessionConfigProps) {
  const [numDays, setNumDays] = useState(sessionDates.length > 1 ? sessionDates.length : 2);
  const [startDate, setStartDate] = useState(sessionDates[0] ?? '');

  const handleNumDaysChange = useCallback(
    (value: number) => {
      const clamped = Math.max(2, Math.min(30, value));
      setNumDays(clamped);
      if (startDate) onSessionDatesChange(generateDates(startDate, clamped));
    },
    [startDate, onSessionDatesChange]
  );

  const handleStartDateChange = useCallback(
    (value: string) => {
      setStartDate(value);
      onSessionDatesChange(value ? generateDates(value, numDays) : []);
    },
    [numDays, onSessionDatesChange]
  );

  const handleToggle = useCallback(() => {
    const next = !multiDay;
    onMultiDayChange(next);
    // Clear dates when disabling
    if (!next) onSessionDatesChange([]);
  }, [multiDay, onMultiDayChange, onSessionDatesChange]);

  return (
    <div className="mb-4">
      {/* Toggle row */}
      <div className="flex items-center justify-between rounded-xl border border-violet-200 bg-violet-50 px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-violet-900">Multi-day session</p>
          <p className="text-xs text-violet-600 mt-0.5">Plan across multiple shoot days</p>
        </div>
        <button
          type="button"
          aria-label={`Multi-day session: ${multiDay ? 'on' : 'off'}. Click to toggle.`}
          onClick={handleToggle}
          className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-violet-400 focus:ring-offset-2 ${
            multiDay ? 'bg-violet-600' : 'bg-gray-300'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
              multiDay ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      {/* Expanded config */}
      {multiDay && (
        <div className="mt-2 rounded-xl border border-violet-200 bg-white p-4 shadow-sm space-y-4">

          {/* Days + Start date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                Number of days
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleNumDaysChange(numDays - 1)}
                  disabled={numDays <= 2}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-300 text-sm font-bold text-gray-700 hover:bg-gray-100 disabled:opacity-40"
                >
                  −
                </button>
                <span className="min-w-8 text-center text-sm font-semibold text-gray-900">
                  {numDays}
                </span>
                <button
                  type="button"
                  onClick={() => handleNumDaysChange(numDays + 1)}
                  disabled={numDays >= 30}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-300 text-sm font-bold text-gray-700 hover:bg-gray-100 disabled:opacity-40"
                >
                  +
                </button>
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                Start date
              </label>
              <input
                type="date"
                title="Shoot start date"
                value={startDate}
                onChange={e => handleStartDateChange(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-violet-400 focus:outline-none"
              />
            </div>
          </div>

          {/* Session dates preview */}
          {sessionDates.length > 0 && (
            <div>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500">
                Planned shoot days
              </p>
              <div className="flex flex-wrap gap-1.5">
                {sessionDates.map((date, i) => (
                  <span
                    key={date}
                    className="rounded-full bg-violet-100 px-3 py-1 text-xs font-medium text-violet-800"
                  >
                    Day {i + 1} — {new Date(date + 'T12:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Per-day options */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                Daily duration{' '}
                <span className="font-normal normal-case text-gray-400">(min, optional)</span>
              </label>
              <input
                type="number"
                min={15}
                max={600}
                step={15}
                value={dailyDurationMinutes ?? ''}
                onChange={e =>
                  onDailyDurationChange(e.target.value ? parseInt(e.target.value, 10) : undefined)
                }
                placeholder="e.g. 90"
                className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-violet-400 focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                Max travel / day{' '}
                <span className="font-normal normal-case text-gray-400">(min, optional)</span>
              </label>
              <input
                type="number"
                min={0}
                max={480}
                step={15}
                value={maxTravelMinutesPerDay ?? ''}
                onChange={e =>
                  onMaxTravelChange(e.target.value ? parseInt(e.target.value, 10) : undefined)
                }
                placeholder="e.g. 30"
                className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-violet-400 focus:outline-none"
              />
            </div>
          </div>

          {sessionDates.length === 0 && (
            <p className="text-xs text-violet-600">
              ↑ Pick a start date to generate your shoot day schedule.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
