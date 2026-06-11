import { memo } from 'react';

type ReviewLocation = {
  name: string;
  displayName?: string;
  whyItWorks: string;
  microLocations: string[];
  selectionReasons?: string[];
  confidenceScore?: number;
  venueBucket?: string;
  sourceQuery?: string;
  latitude?: number | null;
  longitude?: number | null;
  googleMapsUrl?: string;
  logistics: {
    parking: string;
    restroom: string;
    walkingDistance: string;
  };
};

type LocationVote = 'up' | 'down';

type LogisticsInfo = {
  parkingDifficulty: number;
  permitLikelihood: number;
  crowdRisk: number;
  overallRisk: number;
  warnings: string[];
  venueHoursSummary?: string;
  parkingCost?: string;
  restroomConfidence?: 'low' | 'medium' | 'high';
  permit?: {
    likelihood: 'low' | 'medium' | 'high';
    sourceNote: string;
    leadTimeDays: number;
    noPermitAlternatives: string[];
  };
  crowd?: {
    eventRisk: 'low' | 'medium' | 'high';
    sourceNote: string;
  };
  needsVerification?: boolean;
};

type LocationRefinement = {
  name: string;
  kidFriendlinessScore: number;
  crowdRiskScore: number;
  walkingBurdenScore: number;
  overallScore: number;
  bestTimeWindow: string;
  rationale: string;
};

type PlannerLocationReviewPanelProps = {
  locations: ReviewLocation[];
  emptyLocationMessage: string | null;
  locationVotes: Record<string, LocationVote>;
  preferredVenueBucket: string | null;
  excludedVenueBuckets: string[];
  logisticsLookup: Map<string, LogisticsInfo>;
  locationRefinements?: LocationRefinement[];
  onVoteLocation: (location: ReviewLocation, vote: LocationVote) => void;
  onTogglePreferredVenueBucket: (venueBucket?: string) => void;
  onToggleExcludedVenueBucket: (venueBucket?: string) => void;
};

function formatBucket(value?: string) {
  if (!value) return 'Unclassified';
  return value
    .split('-')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function getRiskClass(score?: number) {
  if (typeof score !== 'number') return 'border-[#e4ded5] bg-[#faf9f6] text-[#5f6b76]';
  if (score <= 4) return 'border-emerald-200 bg-emerald-50 text-emerald-800';
  if (score <= 7) return 'border-amber-200 bg-amber-50 text-amber-800';
  return 'border-red-200 bg-red-50 text-red-800';
}

function getConfidenceClass(score?: number) {
  if (typeof score !== 'number') return 'border-[#e4ded5] bg-[#faf9f6] text-[#5f6b76]';
  if (score >= 8) return 'border-emerald-200 bg-emerald-50 text-emerald-800';
  if (score >= 6) return 'border-blue-200 bg-blue-50 text-blue-800';
  return 'border-amber-200 bg-amber-50 text-amber-800';
}

export const PlannerLocationReviewPanel = memo(function PlannerLocationReviewPanel({
  locations,
  emptyLocationMessage,
  locationVotes,
  preferredVenueBucket,
  excludedVenueBuckets,
  logisticsLookup,
  locationRefinements,
  onVoteLocation,
  onTogglePreferredVenueBucket,
  onToggleExcludedVenueBucket,
}: PlannerLocationReviewPanelProps) {
  const refinementLookup = new Map((locationRefinements ?? []).map(refinement => [refinement.name.toLowerCase(), refinement]));

  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-[#d8d2c8] bg-[#faf9f6] px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#7c6f64]">Micro-logistics review</p>
        <p className="mt-1 text-sm leading-6 text-[#5f6b76]">
          Pressure-test the physical details that make a session run smoothly: parking, restrooms, walking burden, crowd risk, and exact micro-spots.
        </p>
      </div>

      {emptyLocationMessage && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <p className="font-semibold">No visible locations right now</p>
          <p className="mt-1">{emptyLocationMessage}</p>
        </div>
      )}

      <div className="grid gap-4">
        {locations.map((location, index) => {
          const locationName = location.displayName || location.name;
          const locationKey = locationName.toLowerCase();
          const currentVote = locationVotes[locationKey];
          const isPreferredType = !!location.venueBucket && preferredVenueBucket === location.venueBucket;
          const isExcludedType = !!location.venueBucket && excludedVenueBuckets.includes(location.venueBucket);
          const intelligenceLogistics = logisticsLookup.get(locationKey);
          const refinement = refinementLookup.get(locationKey) ?? refinementLookup.get(location.name.toLowerCase());

          return (
            <article key={location.name} className="overflow-hidden rounded-lg border border-[#d8d2c8] bg-white">
              <div className="grid gap-4 border-b border-[#e4ded5] bg-[#faf9f6] p-4 lg:grid-cols-[1fr_auto]">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="flex h-8 w-8 items-center justify-center rounded-md bg-[#1f2933] text-xs font-semibold text-white">
                      {index + 1}
                    </span>
                    <h4 className="text-lg font-semibold text-[#1f2933]">{locationName}</h4>
                  </div>
                  {location.displayName && location.displayName !== location.name && (
                    <p className="mt-2 text-xs text-[#5f6b76]">AI label: {location.name}</p>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => onVoteLocation(location, 'up')}
                    className={`rounded-md border px-2.5 py-1.5 text-xs font-medium ${
                      currentVote === 'up'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-700'
                        : 'border-[#d8d2c8] bg-white text-[#5f6b76] hover:border-[#1f2933]'
                    }`}
                  >
                    Relevant
                  </button>
                  <button
                    type="button"
                    onClick={() => onVoteLocation(location, 'down')}
                    className={`rounded-md border px-2.5 py-1.5 text-xs font-medium ${
                      currentVote === 'down'
                        ? 'border-red-600 bg-red-50 text-red-700'
                        : 'border-[#d8d2c8] bg-white text-[#5f6b76] hover:border-[#1f2933]'
                    }`}
                  >
                    Not relevant
                  </button>
                  {location.venueBucket && (
                    <button
                      type="button"
                      onClick={() => onTogglePreferredVenueBucket(location.venueBucket)}
                      className={`rounded-md border px-2.5 py-1.5 text-xs font-medium ${
                        isPreferredType ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-[#d8d2c8] bg-white text-[#5f6b76] hover:border-[#1f2933]'
                      }`}
                    >
                      Prefer type
                    </button>
                  )}
                  {location.venueBucket && (
                    <button
                      type="button"
                      onClick={() => onToggleExcludedVenueBucket(location.venueBucket)}
                      className={`rounded-md border px-2.5 py-1.5 text-xs font-medium ${
                        isExcludedType ? 'border-amber-600 bg-amber-50 text-amber-700' : 'border-[#d8d2c8] bg-white text-[#5f6b76] hover:border-[#1f2933]'
                      }`}
                    >
                      Exclude type
                    </button>
                  )}
                </div>
              </div>

              <div className="grid gap-4 p-4 xl:grid-cols-[1fr_320px]">
                <div className="space-y-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#7c6f64]">Why it works</p>
                    <p className="mt-2 text-sm leading-6 text-[#5f6b76]">{location.whyItWorks}</p>
                    {Array.isArray(location.selectionReasons) && location.selectionReasons.length > 0 && (
                      <ul className="mt-3 list-disc space-y-1 pl-5 text-xs text-[#5f6b76]">
                        {location.selectionReasons.map(reason => (
                          <li key={`${location.name}-${reason}`}>{reason}</li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#7c6f64]">Exact micro-spots</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {location.microLocations.length > 0 ? (
                        location.microLocations.map(spot => (
                          <span key={`${location.name}-${spot}`} className="rounded-md border border-[#e4ded5] bg-[#faf9f6] px-2.5 py-1.5 text-xs font-medium text-[#1f2933]">
                            {spot}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-[#5f6b76]">No micro-spots listed yet.</span>
                      )}
                    </div>
                  </div>

                  <div className="grid gap-2 text-xs text-[#5f6b76] md:grid-cols-3">
                    <div className="rounded-md bg-[#f6f3ee] px-3 py-2">
                      <p className="font-semibold text-[#1f2933]">Parking</p>
                      <p className="mt-1">{location.logistics.parking}</p>
                    </div>
                    <div className="rounded-md bg-[#f6f3ee] px-3 py-2">
                      <p className="font-semibold text-[#1f2933]">Restroom</p>
                      <p className="mt-1">{location.logistics.restroom}</p>
                    </div>
                    <div className="rounded-md bg-[#f6f3ee] px-3 py-2">
                      <p className="font-semibold text-[#1f2933]">Walking</p>
                      <p className="mt-1">{location.logistics.walkingDistance}</p>
                    </div>
                  </div>
                </div>

                <aside className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div className={`rounded-lg border px-3 py-3 ${getConfidenceClass(location.confidenceScore)}`}>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] opacity-80">Confidence</p>
                      <p className="mt-1 text-xl font-semibold">
                        {typeof location.confidenceScore === 'number' ? `${location.confidenceScore.toFixed(1)}/10` : 'Pending'}
                      </p>
                    </div>
                    <div className={`rounded-lg border px-3 py-3 ${getRiskClass(intelligenceLogistics?.overallRisk)}`}>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] opacity-80">Overall risk</p>
                      <p className="mt-1 text-xl font-semibold">
                        {typeof intelligenceLogistics?.overallRisk === 'number' ? `${intelligenceLogistics.overallRisk}/10` : 'Pending'}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-lg border border-[#e4ded5] bg-[#faf9f6] px-3 py-3 text-xs text-[#5f6b76]">
                    <p><span className="font-semibold text-[#1f2933]">Venue:</span> {formatBucket(location.venueBucket)}</p>
                    {location.sourceQuery && <p className="mt-1"><span className="font-semibold text-[#1f2933]">Source:</span> {location.sourceQuery}</p>}
                    {location.latitude != null && location.longitude != null && (
                      <p className="mt-1">
                        <span className="font-semibold text-[#1f2933]">Coordinates:</span> {Number(location.latitude).toFixed(5)}, {Number(location.longitude).toFixed(5)}
                      </p>
                    )}
                    <a
                      href={location.googleMapsUrl || (
                        location.latitude != null && location.longitude != null
                          ? `https://maps.google.com/?q=${Number(location.latitude)},${Number(location.longitude)}`
                          : `https://maps.google.com/?q=${encodeURIComponent(locationName)}`
                      )}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="mt-3 inline-flex rounded-md border border-[#d8d2c8] bg-white px-2.5 py-1.5 font-medium text-[#1f2933] hover:border-[#1f2933]"
                    >
                      Open in Google Maps
                    </a>
                  </div>

                  {intelligenceLogistics && (
                    <div className="space-y-3">
                      <div className="grid grid-cols-3 gap-2 text-center text-[11px] text-[#5f6b76]">
                        <div className="rounded-md bg-[#f6f3ee] px-2 py-2">
                          <p className="font-semibold text-[#1f2933]">{intelligenceLogistics.permitLikelihood}/10</p>
                          <p>Permit</p>
                        </div>
                        <div className="rounded-md bg-[#f6f3ee] px-2 py-2">
                          <p className="font-semibold text-[#1f2933]">{intelligenceLogistics.crowdRisk}/10</p>
                          <p>Crowd</p>
                        </div>
                        <div className="rounded-md bg-[#f6f3ee] px-2 py-2">
                          <p className="font-semibold text-[#1f2933]">{intelligenceLogistics.parkingDifficulty}/10</p>
                          <p>Parking</p>
                        </div>
                      </div>

                      <div className="rounded-lg border border-[#e4ded5] bg-white px-3 py-3 text-xs text-[#5f6b76]">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold text-[#1f2933]">Venue intelligence</p>
                          {intelligenceLogistics.needsVerification && (
                            <span className="rounded-md border border-amber-200 bg-amber-50 px-2 py-1 font-semibold text-amber-900">
                              Needs verification
                            </span>
                          )}
                        </div>
                        <p className="mt-2"><span className="font-semibold text-[#1f2933]">Hours:</span> {intelligenceLogistics.venueHoursSummary}</p>
                        <p className="mt-1"><span className="font-semibold text-[#1f2933]">Parking cost:</span> {intelligenceLogistics.parkingCost}</p>
                        <p className="mt-1"><span className="font-semibold text-[#1f2933]">Restroom confidence:</span> {intelligenceLogistics.restroomConfidence}</p>
                      </div>

                      {intelligenceLogistics.permit && (
                        <div className="rounded-lg border border-[#e4ded5] bg-white px-3 py-3 text-xs text-[#5f6b76]">
                          <p className="font-semibold text-[#1f2933]">Permit likelihood: {intelligenceLogistics.permit.likelihood}</p>
                          <p className="mt-1">{intelligenceLogistics.permit.sourceNote}</p>
                          <p className="mt-2 font-medium text-[#7c6f64]">Recommended lead time: {intelligenceLogistics.permit.leadTimeDays} days</p>
                          <p className="mt-2 font-semibold text-[#1f2933]">No-permit alternatives</p>
                          <ul className="mt-1 list-disc space-y-1 pl-4">
                            {intelligenceLogistics.permit.noPermitAlternatives.map(alternative => (
                              <li key={`${location.name}-${alternative}`}>{alternative}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {intelligenceLogistics.crowd && (
                        <div className="rounded-lg border border-[#e4ded5] bg-white px-3 py-3 text-xs text-[#5f6b76]">
                          <p className="font-semibold text-[#1f2933]">Event/crowd risk: {intelligenceLogistics.crowd.eventRisk}</p>
                          <p className="mt-1">{intelligenceLogistics.crowd.sourceNote}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {refinement && (
                    <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-3 text-xs text-blue-950">
                      <p className="font-semibold">Refined score: {refinement.overallScore}/10</p>
                      <p className="mt-1">{refinement.rationale}</p>
                      <p className="mt-2 font-medium">Best window: {refinement.bestTimeWindow}</p>
                    </div>
                  )}

                  {intelligenceLogistics?.warnings?.length ? (
                    <ul className="list-disc space-y-1 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 pl-6 text-xs text-amber-900">
                      {intelligenceLogistics.warnings.map(warning => (
                        <li key={`${location.name}-${warning}`}>{warning}</li>
                      ))}
                    </ul>
                  ) : null}
                </aside>
              </div>
            </article>
          );
        })}
      </div>

      {locationRefinements && locationRefinements.length > 0 && (
        <div className="rounded-lg border border-[#d8d2c8] bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#7c6f64]">Refinement summary</p>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {locationRefinements.map(ref => (
              <div key={ref.name} className="rounded-lg border border-[#e4ded5] bg-[#faf9f6] p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold text-[#1f2933]">{ref.name}</p>
                  <span className="rounded-md bg-white px-2 py-1 text-xs font-semibold text-[#5f6b76]">Overall {ref.overallScore}/10</span>
                </div>
                <p className="mt-2 text-sm leading-6 text-[#5f6b76]">{ref.rationale}</p>
                <div className="mt-2 grid gap-2 text-xs text-[#5f6b76] sm:grid-cols-3">
                  <p>Kid-friendly: {ref.kidFriendlinessScore}/10</p>
                  <p>Crowd risk: {ref.crowdRiskScore}/10</p>
                  <p>Walking burden: {ref.walkingBurdenScore}/10</p>
                </div>
                <p className="mt-2 text-xs font-medium text-[#7c6f64]">Best time window: {ref.bestTimeWindow}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
});

PlannerLocationReviewPanel.displayName = 'PlannerLocationReviewPanel';
