import { Button } from '@/components/ui/Button';
import { InlineEditableField } from '@/components/planner/InlineEditableField';

type TimelineItem = {
  timeBlock: string;
  focus: string;
  notes: string;
};

type PlannerTimelineIntelligence = {
  goldenHours: {
    sunrise: string;
    sunset: string;
    goldenHourStart: string;
    goldenHourEnd: string;
    morningGoldenHourStart?: string;
    morningGoldenHourEnd?: string;
    eveningBlueHourStart?: string;
    eveningBlueHourEnd?: string;
  };
  weather?: {
    temperature?: number;
    apparentTemperature?: number;
    cloudCover: number;
    uvIndex: number;
    windSpeed: number;
    windGustSpeed: number;
    precipitationProbability: number;
    conditionSummary?: string;
    recommendations: string[];
  };
  confidence?: {
    overall: number;
    windows: Array<{
      label: string;
      startsAt: string;
      endsAt: string;
      confidence: number;
      summary: string;
    }>;
  };
};

type PlannerTimelinePanelProps = {
  timeline: TimelineItem[];
  intelligence?: PlannerTimelineIntelligence | null;
  photographerSunWeatherNotes?: string[];
  isEditMode: boolean;
  isRegenerating: boolean;
  onRegenerate: () => void;
  onOptimizeSunWeather: () => void;
  onUpdateTimelineField: (index: number, field: 'timeBlock' | 'focus' | 'notes', value: string) => void;
};

function formatTime(value?: string) {
  if (!value) return 'Pending';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Pending';
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

export function PlannerTimelinePanel({
  timeline,
  intelligence,
  photographerSunWeatherNotes = [],
  isEditMode,
  isRegenerating,
  onRegenerate,
  onOptimizeSunWeather,
  onUpdateTimelineField,
}: PlannerTimelinePanelProps) {
  const bestWindow = intelligence?.confidence?.windows?.slice().sort((a, b) => b.confidence - a.confidence)[0];
  const weather = intelligence?.weather;
  const weatherRisks = [
    weather && weather.precipitationProbability >= 40 ? `Rain risk ${weather.precipitationProbability}%: move must-haves under cover first.` : '',
    weather && weather.uvIndex >= 7 ? `UV ${weather.uvIndex}: avoid open-field portraits until softer light.` : '',
    weather && weather.windSpeed >= 12 ? `Wind ${Math.round(weather.windSpeed)} mph: protect hair-sensitive close-ups.` : '',
    weather && weather.cloudCover >= 70 ? `Cloud cover ${weather.cloudCover}%: lean into even light and preserve contrast with background choice.` : '',
  ].filter(Boolean);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-lg border border-[#d8d2c8] bg-[#faf9f6] px-4 py-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#7c6f64]">Run of show</p>
          <p className="mt-1 text-sm text-[#5f6b76]">
            {timeline.length} timeline block{timeline.length === 1 ? '' : 's'} designed to keep the session moving.
          </p>
        </div>
        <Button
          onClick={onRegenerate}
          disabled={isRegenerating}
          variant="secondary"
          className="bg-white hover:bg-[#ebe5db]"
        >
          {isRegenerating ? 'Regenerating...' : 'Regenerate timeline'}
        </Button>
      </div>

      <section className="rounded-lg border border-[#d8d2c8] bg-white p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#7c6f64]">Sun + weather decisions</p>
            <h3 className="mt-2 text-lg font-semibold text-[#1f2933]">
              {bestWindow ? `${bestWindow.label} is the strongest planning window` : 'Optimize the flow around light and forecast'}
            </h3>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[#5f6b76]">
              Use this pass to move must-have portraits, hero frames, backups, and close-ups based on rain, wind, UV, cloud cover, and golden-hour timing.
            </p>
          </div>
          <Button onClick={onOptimizeSunWeather} disabled={isRegenerating} className="bg-[#1f2933] hover:bg-[#111827]">
            Optimize sun/weather
          </Button>
        </div>

        <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-md border border-[#e4ded5] bg-[#faf9f6] px-3 py-2 text-xs">
            <p className="font-semibold uppercase tracking-[0.12em] text-[#7c6f64]">Golden hour</p>
            <p className="mt-1 font-semibold text-[#1f2933]">
              {formatTime(intelligence?.goldenHours.goldenHourStart)} - {formatTime(intelligence?.goldenHours.goldenHourEnd)}
            </p>
          </div>
          <div className="rounded-md border border-[#e4ded5] bg-[#faf9f6] px-3 py-2 text-xs">
            <p className="font-semibold uppercase tracking-[0.12em] text-[#7c6f64]">Forecast</p>
            <p className="mt-1 font-semibold text-[#1f2933]">
              {weather?.conditionSummary || 'Forecast pending'}
            </p>
          </div>
          <div className="rounded-md border border-[#e4ded5] bg-[#faf9f6] px-3 py-2 text-xs">
            <p className="font-semibold uppercase tracking-[0.12em] text-[#7c6f64]">Rain / UV</p>
            <p className="mt-1 font-semibold text-[#1f2933]">
              {weather ? `${weather.precipitationProbability}% rain, UV ${weather.uvIndex}` : 'Pending'}
            </p>
          </div>
          <div className="rounded-md border border-[#e4ded5] bg-[#faf9f6] px-3 py-2 text-xs">
            <p className="font-semibold uppercase tracking-[0.12em] text-[#7c6f64]">Wind</p>
            <p className="mt-1 font-semibold text-[#1f2933]">
              {weather ? `${Math.round(weather.windSpeed)} mph, gusts ${Math.round(weather.windGustSpeed)} mph` : 'Pending'}
            </p>
          </div>
        </div>

        {(bestWindow || weatherRisks.length > 0 || photographerSunWeatherNotes.length > 0 || weather?.recommendations?.length) && (
          <div className="mt-4 grid gap-3 lg:grid-cols-3">
            {bestWindow && (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm text-emerald-900">
                <p className="font-semibold">{bestWindow.label}</p>
                <p className="mt-1 text-xs leading-5">
                  {formatTime(bestWindow.startsAt)} - {formatTime(bestWindow.endsAt)} at {bestWindow.confidence}% confidence. {bestWindow.summary}
                </p>
              </div>
            )}
            {weatherRisks.length > 0 && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-900">
                <p className="font-semibold">Weather adjustments</p>
                <ul className="mt-2 list-disc space-y-1 pl-4 text-xs leading-5">
                  {weatherRisks.map(item => <li key={item}>{item}</li>)}
                </ul>
              </div>
            )}
            <div className="rounded-lg border border-[#e4ded5] bg-[#faf9f6] px-3 py-3 text-sm text-[#1f2933]">
              <p className="font-semibold">Planner notes</p>
              <ul className="mt-2 list-disc space-y-1 pl-4 text-xs leading-5 text-[#5f6b76]">
                {[...photographerSunWeatherNotes, ...(weather?.recommendations ?? [])].slice(0, 4).map(item => (
                  <li key={item}>{item}</li>
                ))}
                {photographerSunWeatherNotes.length === 0 && !weather?.recommendations?.length && (
                  <li>Ask the planner brain to optimize once forecast data is available.</li>
                )}
              </ul>
            </div>
          </div>
        )}
      </section>

      <div className="space-y-3">
        {timeline.map((item, index) => (
          <article key={`${item.timeBlock}-${item.focus}`} className="grid gap-3 rounded-lg border border-[#d8d2c8] bg-white p-4 md:grid-cols-[160px_1fr]">
            <div className="md:border-r md:border-[#e4ded5] md:pr-4">
              <span className="flex h-8 w-8 items-center justify-center rounded-md bg-[#1f2933] text-xs font-semibold text-white">
                {index + 1}
              </span>
              <InlineEditableField
                isEditing={isEditMode}
                title="Timeline time block"
                value={item.timeBlock}
                onChange={value => onUpdateTimelineField(index, 'timeBlock', value)}
                className="mt-3 w-full rounded border border-[#d8d2c8] px-2 py-1 text-sm font-semibold text-[#1f2933]"
                displayClassName="mt-3 text-sm font-semibold text-[#1f2933]"
              />
            </div>

            <div>
              <InlineEditableField
                isEditing={isEditMode}
                title="Timeline focus"
                value={item.focus}
                onChange={value => onUpdateTimelineField(index, 'focus', value)}
                className="w-full rounded border border-[#d8d2c8] px-2 py-1 text-sm font-semibold text-[#1f2933]"
                displayClassName="text-base font-semibold text-[#1f2933]"
              />
              <InlineEditableField
                isEditing={isEditMode}
                title="Timeline notes"
                value={item.notes}
                onChange={value => onUpdateTimelineField(index, 'notes', value)}
                className="mt-3 min-h-20 w-full rounded border border-[#d8d2c8] px-2 py-2 text-sm text-[#5f6b76]"
                displayClassName="mt-2 text-sm leading-6 text-[#5f6b76]"
                multiline
              />
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
