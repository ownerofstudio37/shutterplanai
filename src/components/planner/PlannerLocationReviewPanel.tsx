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
  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-900">
        Use the feedback controls to pressure-test location quality. Thumbs affect ordering locally, “Prefer this type” boosts similar spots in review, and “Exclude this type” removes that venue type from the current plan review.
      </div>

      {emptyLocationMessage && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <p className="font-semibold">No visible locations right now</p>
          <p className="mt-1">{emptyLocationMessage}</p>
        </div>
      )}

      {locations.map(location => {
        const locationKey = (location.displayName || location.name).toLowerCase();
        const currentVote = locationVotes[locationKey];
        const isPreferredType = !!location.venueBucket && preferredVenueBucket === location.venueBucket;
        const isExcludedType = !!location.venueBucket && excludedVenueBuckets.includes(location.venueBucket);
        const intelligenceLogistics = logisticsLookup.get(locationKey);

        return (
          <div key={location.name} className="rounded-lg border border-gray-200 p-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-gray-900">{location.displayName || location.name}</p>
                {location.displayName && location.displayName !== location.name && (
                  <p className="mt-1 text-xs text-gray-500">AI label: {location.name}</p>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => onVoteLocation(location, 'up')}
                  className={`rounded-full border px-2 py-1 text-xs ${
                    currentVote === 'up'
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-700'
                      : 'border-gray-300 bg-white text-gray-700'
                  }`}
                >
                  👍 Relevant
                </button>
                <button
                  type="button"
                  onClick={() => onVoteLocation(location, 'down')}
                  className={`rounded-full border px-2 py-1 text-xs ${
                    currentVote === 'down'
                      ? 'border-red-600 bg-red-50 text-red-700'
                      : 'border-gray-300 bg-white text-gray-700'
                  }`}
                >
                  👎 Not relevant
                </button>
                {location.venueBucket && (
                  <button
                    type="button"
                    onClick={() => onTogglePreferredVenueBucket(location.venueBucket)}
                    className={`rounded-full border px-2 py-1 text-xs ${
                      isPreferredType ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-300 bg-white text-gray-700'
                    }`}
                  >
                    ⭐ Prefer this type
                  </button>
                )}
                {location.venueBucket && (
                  <button
                    type="button"
                    onClick={() => onToggleExcludedVenueBucket(location.venueBucket)}
                    className={`rounded-full border px-2 py-1 text-xs ${
                      isExcludedType ? 'border-amber-600 bg-amber-50 text-amber-700' : 'border-gray-300 bg-white text-gray-700'
                    }`}
                  >
                    🚫 Exclude this type
                  </button>
                )}
              </div>
            </div>

            <div className="mt-2 rounded-md bg-blue-50/60 px-3 py-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Why this location was picked</p>
              <p className="mt-1 text-sm text-gray-700">{location.whyItWorks}</p>
              {Array.isArray(location.selectionReasons) && location.selectionReasons.length > 0 && (
                <ul className="mt-1 list-disc space-y-1 pl-5 text-xs text-gray-700">
                  {location.selectionReasons.map(reason => (
                    <li key={`${location.name}-${reason}`}>{reason}</li>
                  ))}
                </ul>
              )}
            </div>
            <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-gray-600">
              {typeof location.confidenceScore === 'number' && (
                <span className="rounded-full bg-gray-100 px-2 py-1">Confidence: {location.confidenceScore.toFixed(1)}/10</span>
              )}
              {location.venueBucket && <span className="rounded-full bg-gray-100 px-2 py-1">Type: {location.venueBucket}</span>}
              {location.sourceQuery && <span className="rounded-full bg-gray-100 px-2 py-1">Source: {location.sourceQuery}</span>}
            </div>
            {location.latitude != null && location.longitude != null && (
              <div className="mt-2 flex flex-wrap items-center gap-3 text-xs">
                <p className="text-blue-700">Coordinates: {Number(location.latitude).toFixed(5)}, {Number(location.longitude).toFixed(5)}</p>
                <a
                  href={location.googleMapsUrl || `https://maps.google.com/?q=${Number(location.latitude)},${Number(location.longitude)}`}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="font-medium text-blue-600 hover:text-blue-700 hover:underline"
                >
                  Show on Google Maps
                </a>
              </div>
            )}
            {location.latitude == null && location.longitude == null && (
              <a
                href={location.googleMapsUrl || `https://maps.google.com/?q=${encodeURIComponent(location.displayName || location.name)}`}
                target="_blank"
                rel="noreferrer noopener"
                className="mt-2 inline-block text-xs font-medium text-blue-600 hover:text-blue-700 hover:underline"
              >
                Show on Google Maps
              </a>
            )}
            <p className="mt-2 text-xs text-gray-500">Micro-spots: {location.microLocations.join(' • ')}</p>
            {intelligenceLogistics && (
              <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-gray-700">
                <span className="rounded-full bg-indigo-100 px-2 py-1">Risk: {intelligenceLogistics.overallRisk}/10</span>
                <span className="rounded-full bg-indigo-100 px-2 py-1">Permit: {intelligenceLogistics.permitLikelihood}/10</span>
                <span className="rounded-full bg-indigo-100 px-2 py-1">Crowd: {intelligenceLogistics.crowdRisk}/10</span>
                <span className="rounded-full bg-indigo-100 px-2 py-1">Parking difficulty: {intelligenceLogistics.parkingDifficulty}/10</span>
              </div>
            )}
            {intelligenceLogistics?.warnings?.length ? (
              <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-amber-700">
                {intelligenceLogistics.warnings.map(warning => (
                  <li key={`${location.name}-${warning}`}>{warning}</li>
                ))}
              </ul>
            ) : null}
            <p className="mt-2 text-xs text-gray-500">Parking: {location.logistics.parking}</p>
            <p className="text-xs text-gray-500">Restroom: {location.logistics.restroom}</p>
            <p className="text-xs text-gray-500">Walk: {location.logistics.walkingDistance}</p>
          </div>
        );
      })}

      {locationRefinements && locationRefinements.length > 0 && (
        <div>
          <h4 className="mb-3 text-lg font-semibold text-gray-900">Refined Location Scores</h4>
          <div className="space-y-3">
            {locationRefinements.map(ref => (
              <div key={ref.name} className="rounded-lg border border-gray-200 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold text-gray-900">{ref.name}</p>
                  <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">Overall {ref.overallScore}/10</span>
                </div>
                <p className="mt-1 text-sm text-gray-600">{ref.rationale}</p>
                <div className="mt-2 grid gap-2 text-xs text-gray-700 sm:grid-cols-3">
                  <p>Kid-friendly: {ref.kidFriendlinessScore}/10</p>
                  <p>Crowd risk: {ref.crowdRiskScore}/10</p>
                  <p>Walking burden: {ref.walkingBurdenScore}/10</p>
                </div>
                <p className="mt-1 text-xs text-gray-500">Best time window: {ref.bestTimeWindow}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
});

PlannerLocationReviewPanel.displayName = 'PlannerLocationReviewPanel';
