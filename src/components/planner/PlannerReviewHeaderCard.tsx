import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

type PlannerIntelligence = {
  goldenHours: {
    sunrise: string;
    sunset: string;
    goldenHourStart: string;
    goldenHourEnd: string;
    morningGoldenHourStart?: string;
    morningGoldenHourEnd?: string;
    morningBlueHourStart?: string;
    morningBlueHourEnd?: string;
    eveningBlueHourStart?: string;
    eveningBlueHourEnd?: string;
  };
  weather?: {
    temperature?: number;
    apparentTemperature?: number;
    humidity?: number;
    cloudCover: number;
    uvIndex: number;
    windSpeed: number;
    windGustSpeed: number;
    precipitationProbability: number;
    conditionSummary?: string;
    recommendations: string[];
    provider: 'open-meteo' | 'fallback';
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
  sunWindows?: {
    morningGolden: {
      label: string;
      startsAt: string;
      endsAt: string;
      confidence: number;
      summary: string;
    };
    eveningGolden: {
      label: string;
      startsAt: string;
      endsAt: string;
      confidence: number;
      summary: string;
    };
    morningBlue: {
      label: string;
      startsAt: string;
      endsAt: string;
      confidence: number;
      summary: string;
    };
    eveningBlue: {
      label: string;
      startsAt: string;
      endsAt: string;
      confidence: number;
      summary: string;
    };
  };
  optimizedRoute: number[];
};

type PlanningSourceExplanation = {
  tone: 'emerald' | 'blue' | 'amber';
  title: string;
  body: string;
};

type PlannerDiagnostics = {
  locationSource?: string;
  locationCandidateCount?: number;
  resolvedCity?: string;
  usedBusinessZipDisambiguation?: boolean;
  businessGeoAnchorSource?: string;
};

type PlannerReviewHeaderCardProps = {
  projectTitle: string;
  creativeDirection: string;
  workflowStage: 'intake' | 'review' | 'apply';
  diagnostics?: PlannerDiagnostics;
  shootType: string;
  locationMode: 'find-locations' | 'use-provided';
  isEditMode: boolean;
  onToggleEditMode: () => void;
  isCreatingShareLink: boolean;
  onCreateShareLink: () => void;
  isRevokingShareLink: boolean;
  onRevokeShareLink: () => void;
  onDownloadCalendar: () => void;
  canDownloadCalendar: boolean;
  onPrintGuide: () => void;
  isRefining: boolean;
  onRefinePlan: () => void;
  isApplying: boolean;
  onApplyPlan: () => void;
  planningSourceExplanation?: PlanningSourceExplanation | null;
  isLoadingIntelligence: boolean;
  intelligence?: PlannerIntelligence | null;
  onApplyOptimizedRouteOrder: () => void;
  shareUrl: string;
  onCopyShareLink: () => void;
  shareLinkError: string;
  guideActivity?: {
    guideViews: number;
    guideEngagements: number;
    guideApprovals: number;
    guideChangeRequests: number;
    guideComments: number;
  } | null;
  shotCount: number;
  expectedShotRange: { min: number; max: number };
  durationMinutes: number;
};

function formatTime(value?: string) {
  if (!value) return 'Pending';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Pending';
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function getSourceLabel(source?: string) {
  if (source === 'grounded-candidates') return 'Grounded';
  if (source === 'user-provided') return 'Provided';
  if (source === 'fallback-geocode') return 'Geocoded';
  if (source === 'city-fallback') return 'City fallback';
  return 'Pending';
}

function getSourceClass(source?: string) {
  if (source === 'grounded-candidates' || source === 'user-provided') {
    return 'border-emerald-200 bg-emerald-50 text-emerald-800';
  }
  if (source === 'fallback-geocode') return 'border-blue-200 bg-blue-50 text-blue-800';
  return 'border-amber-200 bg-amber-50 text-amber-800';
}

function getConfidenceClass(confidence?: number) {
  if (typeof confidence !== 'number') return 'border-[#e4ded5] bg-[#faf9f6] text-[#5f6b76]';
  if (confidence >= 75) return 'border-emerald-200 bg-emerald-50 text-emerald-800';
  if (confidence >= 55) return 'border-amber-200 bg-amber-50 text-amber-800';
  return 'border-red-200 bg-red-50 text-red-800';
}

export function PlannerReviewHeaderCard({
  projectTitle,
  creativeDirection,
  workflowStage,
  diagnostics,
  shootType,
  locationMode,
  isEditMode,
  onToggleEditMode,
  isCreatingShareLink,
  onCreateShareLink,
  isRevokingShareLink,
  onRevokeShareLink,
  onDownloadCalendar,
  canDownloadCalendar,
  onPrintGuide,
  isRefining,
  onRefinePlan,
  isApplying,
  onApplyPlan,
  planningSourceExplanation,
  isLoadingIntelligence,
  intelligence,
  onApplyOptimizedRouteOrder,
  shareUrl,
  onCopyShareLink,
  shareLinkError,
  guideActivity,
  shotCount,
  expectedShotRange,
  durationMinutes,
}: PlannerReviewHeaderCardProps) {
  const source = diagnostics?.locationSource;
  const locationCount = diagnostics?.locationCandidateCount ?? 0;
  const confidence = intelligence?.confidence?.overall;
  const bestSunWindow = intelligence?.sunWindows
    ? [
        intelligence.sunWindows.morningGolden,
        intelligence.sunWindows.eveningGolden,
        intelligence.sunWindows.morningBlue,
        intelligence.sunWindows.eveningBlue,
      ].sort((a, b) => b.confidence - a.confidence)[0]
    : null;
  const shotCountWarning = shotCount < expectedShotRange.min || shotCount > expectedShotRange.max;

  const readinessItems = [
    {
      label: 'Locations',
      value: String(locationCount),
      detail: getSourceLabel(source),
      className: getSourceClass(source),
    },
    {
      label: 'Forecast',
      value: typeof confidence === 'number' ? `${confidence}%` : isLoadingIntelligence ? 'Loading' : 'Pending',
      detail: intelligence?.weather?.provider ?? 'Telemetry',
      className: getConfidenceClass(confidence),
    },
    {
      label: 'Shot plan',
      value: String(shotCount),
      detail: `${expectedShotRange.min}-${expectedShotRange.max} expected`,
      className: shotCountWarning
        ? 'border-amber-200 bg-amber-50 text-amber-800'
        : 'border-emerald-200 bg-emerald-50 text-emerald-800',
    },
    {
      label: 'Client guide',
      value: shareUrl ? 'Ready' : 'Draft',
      detail: guideActivity && shareUrl ? `${guideActivity.guideViews} views` : shareUrl ? 'Share link live' : 'Not exported',
      className: shareUrl
        ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
        : 'border-[#e4ded5] bg-[#faf9f6] text-[#5f6b76]',
    },
  ];

  return (
    <Card className="overflow-hidden border border-[#d8d2c8] p-0 shadow-sm">
      <div className="bg-[#1f2933] p-5 text-white md:p-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-4xl">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#c6b9a5]">
              Production cockpit
            </p>
            <h3 className="mt-3 text-2xl font-semibold tracking-normal text-white md:text-3xl">
              {projectTitle}
            </h3>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-[#d1d5db]">{creativeDirection}</p>
            <div className="mt-4 flex flex-wrap gap-2 text-xs">
              <span className="rounded-md border border-white/10 bg-white/10 px-2 py-1 font-medium text-white">
                {workflowStage === 'apply' ? 'Apply stage' : 'Review stage'}
              </span>
              <span className="rounded-md border border-white/10 bg-white/10 px-2 py-1 font-medium text-white">
                {shootType}
              </span>
              <span className="rounded-md border border-white/10 bg-white/10 px-2 py-1 font-medium text-white">
                {locationMode === 'use-provided' ? 'Provided locations' : 'AI location search'}
              </span>
              <span className="rounded-md border border-white/10 bg-white/10 px-2 py-1 font-medium text-white">
                {diagnostics?.resolvedCity || 'Location pending'}
              </span>
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 xl:min-w-[430px]">
            <Button
              variant="ghost"
              onClick={onToggleEditMode}
              className="border border-white/15 text-white hover:bg-white/10"
            >
              {isEditMode ? 'Done editing' : 'Edit output'}
            </Button>
            <Button
              variant="ghost"
              isLoading={isRefining}
              disabled={isApplying}
              onClick={onRefinePlan}
              className="border border-white/15 text-white hover:bg-white/10"
            >
              {isRefining ? 'Refining...' : 'Refine plan'}
            </Button>
            <Button
              variant="ghost"
              isLoading={isCreatingShareLink}
              disabled={isRefining || isApplying}
              onClick={onCreateShareLink}
              className="border border-white/15 text-white hover:bg-white/10"
            >
              {isCreatingShareLink ? 'Creating...' : 'Create client link'}
            </Button>
            <Button
              variant="ghost"
              disabled={!canDownloadCalendar || isApplying}
              onClick={onDownloadCalendar}
              className="border border-white/15 text-white hover:bg-white/10"
            >
              Calendar export
            </Button>
            <Button
              variant="ghost"
              disabled={!shareUrl}
              onClick={onPrintGuide}
              className="border border-white/15 text-white hover:bg-white/10"
            >
              Branded PDF
            </Button>
            <Button
              isLoading={isApplying}
              disabled={isRefining}
              onClick={onApplyPlan}
              className="bg-white text-[#1f2933] hover:bg-[#f3f4f6]"
            >
              {isApplying ? 'Applying...' : 'Create project'}
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-3 border-b border-[#e4ded5] bg-white p-4 md:grid-cols-2 xl:grid-cols-4">
        {readinessItems.map(item => (
          <div key={item.label} className={`rounded-lg border px-4 py-3 ${item.className}`}>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] opacity-80">{item.label}</p>
            <p className="mt-2 text-2xl font-semibold tracking-normal">{item.value}</p>
            <p className="mt-1 text-xs font-medium opacity-80">{item.detail}</p>
          </div>
        ))}
      </div>

      <div className="space-y-3 bg-[#faf9f6] p-4 md:p-5">
        {planningSourceExplanation && (
          <div
            className={`rounded-lg border px-4 py-3 text-sm ${
              planningSourceExplanation.tone === 'emerald'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                : planningSourceExplanation.tone === 'blue'
                  ? 'border-blue-200 bg-blue-50 text-blue-900'
                  : 'border-amber-200 bg-amber-50 text-amber-900'
            }`}
          >
            <p className="font-semibold">{planningSourceExplanation.title}</p>
            <p className="mt-1">{planningSourceExplanation.body}</p>
          </div>
        )}

        {diagnostics?.usedBusinessZipDisambiguation && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
            <p className="font-semibold">Business location anchor applied</p>
            <p className="mt-1">
              Search results were disambiguated with {diagnostics.businessGeoAnchorSource || 'the account location'}.
            </p>
          </div>
        )}

        {isRefining && (
          <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
            Refining the plan now. Location scores, backup guidance, and client prep notes will update when the pass finishes.
          </div>
        )}

        {isLoadingIntelligence && (
          <div className="rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm text-indigo-900">
            Computing weather, sun window, and route intelligence...
          </div>
        )}

        {intelligence && (
          <div className="rounded-lg border border-[#d8d2c8] bg-white p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#7c6f64]">
                  Sun and weather telemetry
                </p>
                <div className="mt-3 grid gap-2 text-xs sm:grid-cols-2 lg:grid-cols-4">
                  <span className="rounded-md bg-[#f6f3ee] px-3 py-2 font-medium text-[#1f2933]">
                    Evening golden: {formatTime(intelligence.goldenHours.goldenHourStart)} - {formatTime(intelligence.goldenHours.goldenHourEnd)}
                  </span>
                  {intelligence.goldenHours.morningGoldenHourStart && (
                    <span className="rounded-md bg-[#f6f3ee] px-3 py-2 font-medium text-[#1f2933]">
                      Morning golden: {formatTime(intelligence.goldenHours.morningGoldenHourStart)} - {formatTime(intelligence.goldenHours.morningGoldenHourEnd)}
                    </span>
                  )}
                  {intelligence.goldenHours.eveningBlueHourStart && (
                    <span className="rounded-md bg-[#f6f3ee] px-3 py-2 font-medium text-[#1f2933]">
                      Blue hour: {formatTime(intelligence.goldenHours.eveningBlueHourStart)} - {formatTime(intelligence.goldenHours.eveningBlueHourEnd)}
                    </span>
                  )}
                  {intelligence.weather?.conditionSummary && (
                    <span className="rounded-md bg-[#f6f3ee] px-3 py-2 font-medium text-[#1f2933]">
                      {intelligence.weather.conditionSummary}
                    </span>
                  )}
                  {typeof intelligence.weather?.temperature === 'number' && (
                    <span className="rounded-md bg-[#f6f3ee] px-3 py-2 font-medium text-[#1f2933]">
                      Temp: {Math.round(intelligence.weather.temperature)} deg F
                      {typeof intelligence.weather.apparentTemperature === 'number'
                        ? ` feels ${Math.round(intelligence.weather.apparentTemperature)} deg F`
                        : ''}
                    </span>
                  )}
                  {typeof intelligence.weather?.humidity === 'number' && (
                    <span className="rounded-md bg-[#f6f3ee] px-3 py-2 font-medium text-[#1f2933]">
                      Humidity: {intelligence.weather.humidity}%
                    </span>
                  )}
                  <span className="rounded-md bg-[#f6f3ee] px-3 py-2 font-medium text-[#1f2933]">
                    Sunrise: {formatTime(intelligence.goldenHours.sunrise)}
                  </span>
                  <span className="rounded-md bg-[#f6f3ee] px-3 py-2 font-medium text-[#1f2933]">
                    Sunset: {formatTime(intelligence.goldenHours.sunset)}
                  </span>
                  {intelligence.weather && (
                    <span className="rounded-md bg-[#f6f3ee] px-3 py-2 font-medium text-[#1f2933]">
                      Rain: {intelligence.weather.precipitationProbability}%
                    </span>
                  )}
                </div>
              </div>
              {intelligence.optimizedRoute.length > 1 && (
                <Button variant="secondary" onClick={onApplyOptimizedRouteOrder} className="bg-[#ebe5db] hover:bg-[#ded8ce]">
                  Apply optimized route
                </Button>
              )}
            </div>

            {bestSunWindow && (
              <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm text-emerald-900">
                <p className="font-semibold">Best light window: {bestSunWindow.label}</p>
                <p className="mt-1 text-xs">
                  {formatTime(bestSunWindow.startsAt)} - {formatTime(bestSunWindow.endsAt)} at {bestSunWindow.confidence}% confidence. {bestSunWindow.summary}
                </p>
              </div>
            )}

            {intelligence.confidence?.windows?.length ? (
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {intelligence.confidence.windows.map(window => (
                  <div key={`${window.label}-${window.startsAt}`} className="rounded-lg border border-[#e4ded5] bg-[#faf9f6] px-3 py-3 text-sm text-[#1f2933]">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-semibold">{window.label}</p>
                      <span className="rounded-md bg-white px-2 py-1 text-xs font-semibold text-[#5f6b76]">
                        {window.confidence}%
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-[#5f6b76]">{window.summary}</p>
                  </div>
                ))}
              </div>
            ) : null}

            {intelligence.weather?.recommendations?.length ? (
              <ul className="mt-3 list-disc space-y-1 pl-5 text-xs text-[#5f6b76]">
                {intelligence.weather.recommendations.slice(0, 2).map(item => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            ) : null}
          </div>
        )}

        {shareUrl && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <p className="font-semibold">Client guide link ready</p>
                <input
                  title="Share URL"
                  readOnly
                  value={shareUrl}
                  className="mt-2 w-full rounded-md border border-emerald-300 bg-white px-2 py-2 text-xs text-emerald-900"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" disabled={isRevokingShareLink} onClick={onCopyShareLink}>Copy link</Button>
                <Button variant="secondary" disabled={!canDownloadCalendar} onClick={onDownloadCalendar}>Calendar</Button>
                <Button variant="secondary" onClick={onPrintGuide}>PDF</Button>
                <Button variant="ghost" isLoading={isRevokingShareLink} disabled={isApplying || isRefining} onClick={onRevokeShareLink}>
                  {isRevokingShareLink ? 'Revoking...' : 'Revoke link'}
                </Button>
                <Link href="/dashboard/shot-board">
                  <Button variant="ghost">Shot board</Button>
                </Link>
              </div>
            </div>
          </div>
        )}

        {shareUrl && guideActivity && (
          <div className="grid gap-2 text-xs text-[#5f6b76] sm:grid-cols-4">
            <div className="rounded-lg border border-[#e4ded5] bg-white px-3 py-2">
              <p className="font-semibold text-[#1f2933]">{guideActivity.guideViews}</p>
              <p>Views</p>
            </div>
            <div className="rounded-lg border border-[#e4ded5] bg-white px-3 py-2">
              <p className="font-semibold text-[#1f2933]">{guideActivity.guideComments}</p>
              <p>Comments</p>
            </div>
            <div className="rounded-lg border border-[#e4ded5] bg-white px-3 py-2">
              <p className="font-semibold text-[#1f2933]">{guideActivity.guideApprovals}</p>
              <p>Approvals</p>
            </div>
            <div className="rounded-lg border border-[#e4ded5] bg-white px-3 py-2">
              <p className="font-semibold text-[#1f2933]">{guideActivity.guideChangeRequests}</p>
              <p>Change requests</p>
            </div>
          </div>
        )}

        {shareLinkError && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{shareLinkError}</div>
        )}

        {(source !== 'grounded-candidates' ||
          locationCount < 3 ||
          shotCountWarning) && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <p className="font-semibold">Planner QA warnings</p>
            <ul className="mt-1 list-disc space-y-1 pl-5">
              {source !== 'grounded-candidates' && (
                <li>Location plan is using fallback mode, not fully grounded candidates.</li>
              )}
              {locationCount < 3 && (
                <li>Fewer than 3 real location candidates found. Consider a broader nearby city or ZIP.</li>
              )}
              {shotCountWarning ? (
                <li>
                  Shot count ({shotCount}) is outside expected {expectedShotRange.min}-{expectedShotRange.max} for {durationMinutes} minutes.
                </li>
              ) : null}
            </ul>
          </div>
        )}
      </div>
    </Card>
  );
}
