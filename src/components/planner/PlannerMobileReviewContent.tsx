import type { ReactNode } from 'react';

type ReviewTab = 'map' | 'locations' | 'shot-list' | 'timeline' | 'prep';
type LocationVote = 'up' | 'down';

type ReviewLocation = {
  name: string;
  displayName?: string;
  whyItWorks: string;
  microLocations: string[];
  venueBucket?: string;
  confidenceScore?: number;
  logistics: {
    parking: string;
    restroom: string;
    walkingDistance: string;
  };
};

type LogisticsInfo = {
  permitLikelihood: number;
  crowdRisk: number;
  overallRisk: number;
};

type ReviewShot = {
  title: string;
  description: string;
  location: string;
  microSpot: string;
  poseSuggestion: string;
};

type TimelineItem = {
  timeBlock: string;
  focus: string;
  notes: string;
};

type PlannerMobileReviewContentProps = {
  reviewTab: ReviewTab;
  mapContent: ReactNode;
  selectedLocation: ReviewLocation | null;
  locations: ReviewLocation[];
  emptyLocationMessage: string | null;
  locationVotes: Record<string, LocationVote>;
  preferredVenueBucket: string | null;
  excludedVenueBuckets: string[];
  logisticsLookup: Map<string, LogisticsInfo>;
  onVoteLocation: (location: ReviewLocation, vote: LocationVote) => void;
  onTogglePreferredVenueBucket: (venueBucket?: string) => void;
  onToggleExcludedVenueBucket: (venueBucket?: string) => void;
  emptyShotMessage: string | null;
  shots: ReviewShot[];
  timeline: TimelineItem[];
  checklist: string[];
  contingencyPlans: string[];
};

export function PlannerMobileReviewContent({
  reviewTab,
  mapContent,
  selectedLocation,
  locations,
  emptyLocationMessage,
  locationVotes,
  preferredVenueBucket,
  excludedVenueBuckets,
  logisticsLookup,
  onVoteLocation,
  onTogglePreferredVenueBucket,
  onToggleExcludedVenueBucket,
  emptyShotMessage,
  shots,
  timeline,
  checklist,
  contingencyPlans,
}: PlannerMobileReviewContentProps) {
  if (reviewTab === 'map') {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-900">
          Use the map to pressure-test spacing, route order, and whether the plan clusters in the right part of town.
        </div>

        {mapContent}

        {selectedLocation ? (
          <div className="rounded-xl border border-gray-200 p-4">
            <p className="text-sm font-semibold text-gray-900">{selectedLocation.displayName || selectedLocation.name}</p>
            <p className="mt-1 text-sm text-gray-600">{selectedLocation.whyItWorks}</p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs text-gray-600">
              {selectedLocation.venueBucket && (
                <span className="rounded-full bg-gray-100 px-2 py-1">Type: {selectedLocation.venueBucket}</span>
              )}
              {typeof selectedLocation.confidenceScore === 'number' && (
                <span className="rounded-full bg-gray-100 px-2 py-1">
                  Confidence: {selectedLocation.confidenceScore.toFixed(1)}/10
                </span>
              )}
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <p className="font-semibold">No map-ready locations yet</p>
            <p className="mt-1">Try regenerating with a broader area or use provided locations with clearer place names.</p>
          </div>
        )}
      </div>
    );
  }

  if (reviewTab === 'locations') {
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
            <div key={`mobile-${location.name}`} className="rounded-lg border border-gray-200 p-3">
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
                        isPreferredType
                          ? 'border-blue-600 bg-blue-50 text-blue-700'
                          : 'border-gray-300 bg-white text-gray-700'
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
                        isExcludedType
                          ? 'border-amber-600 bg-amber-50 text-amber-700'
                          : 'border-gray-300 bg-white text-gray-700'
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
              </div>
              <p className="mt-2 text-xs text-gray-500">Micro-spots: {location.microLocations.join(' • ')}</p>
              {intelligenceLogistics && (
                <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-gray-700">
                  <span className="rounded-full bg-indigo-100 px-2 py-1">Risk: {intelligenceLogistics.overallRisk}/10</span>
                  <span className="rounded-full bg-indigo-100 px-2 py-1">Permit: {intelligenceLogistics.permitLikelihood}/10</span>
                  <span className="rounded-full bg-indigo-100 px-2 py-1">Crowd: {intelligenceLogistics.crowdRisk}/10</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  if (reviewTab === 'shot-list') {
    return (
      <div className="space-y-3">
        {emptyShotMessage && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <p className="font-semibold">No visible shots right now</p>
            <p className="mt-1">{emptyShotMessage}</p>
          </div>
        )}

        {shots.map(shot => (
          <div key={`mobile-${shot.title}-${shot.microSpot}`} className="rounded-lg border border-gray-200 p-3">
            <p className="font-semibold text-gray-900">{shot.title}</p>
            <p className="mt-1 text-sm text-gray-600">{shot.description}</p>
            <p className="mt-2 text-xs text-gray-500">Location: {shot.location}</p>
            <p className="text-xs text-gray-500">Micro-spot: {shot.microSpot}</p>
            <p className="text-xs text-gray-500">Pose: {shot.poseSuggestion}</p>
          </div>
        ))}
      </div>
    );
  }

  if (reviewTab === 'timeline') {
    return (
      <div className="space-y-3">
        {timeline.map(item => (
          <div key={`mobile-${item.timeBlock}-${item.focus}`} className="rounded-lg border border-gray-200 p-3">
            <p className="text-sm font-semibold text-gray-900">{item.timeBlock}</p>
            <p className="text-sm text-blue-700">{item.focus}</p>
            <p className="mt-1 text-sm text-gray-600">{item.notes}</p>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h4 className="mb-2 text-base font-semibold text-gray-900">Client Prep Checklist</h4>
        <ul className="list-inside list-disc space-y-1 text-sm text-gray-700">
          {checklist.map(item => (
            <li key={`mobile-prep-${item}`}>{item}</li>
          ))}
        </ul>
      </div>
      <div>
        <h4 className="mb-2 text-base font-semibold text-gray-900">Contingency Plans</h4>
        <ul className="list-inside list-disc space-y-1 text-sm text-gray-700">
          {contingencyPlans.map(item => (
            <li key={`mobile-contingency-${item}`}>{item}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
