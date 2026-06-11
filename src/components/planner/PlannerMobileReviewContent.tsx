import { memo, type ReactNode } from 'react';

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

export const PlannerMobileReviewContent = memo(function PlannerMobileReviewContent({
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
        <div className="rounded-lg border border-[#d8d2c8] bg-[#faf9f6] px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#7c6f64]">Map review</p>
          <p className="mt-1 text-sm leading-6 text-[#5f6b76]">
            Confirm stop spacing, route order, and client arrival flow before the shoot day.
          </p>
        </div>

        {mapContent}

        {selectedLocation ? (
          <div className="rounded-lg border border-[#d8d2c8] bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#7c6f64]">Selected stop</p>
            <p className="mt-2 text-base font-semibold text-[#1f2933]">{selectedLocation.displayName || selectedLocation.name}</p>
            <p className="mt-2 text-sm leading-6 text-[#5f6b76]">{selectedLocation.whyItWorks}</p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs text-[#5f6b76]">
              {selectedLocation.venueBucket && (
                <span className="rounded-md bg-[#f6f3ee] px-2 py-1">Type: {selectedLocation.venueBucket}</span>
              )}
              {typeof selectedLocation.confidenceScore === 'number' && (
                <span className="rounded-md bg-[#f6f3ee] px-2 py-1">
                  Confidence: {selectedLocation.confidenceScore.toFixed(1)}/10
                </span>
              )}
            </div>
            <div className="mt-3 grid gap-2 text-xs text-[#5f6b76]">
              <p><span className="font-semibold text-[#1f2933]">Parking:</span> {selectedLocation.logistics.parking}</p>
              <p><span className="font-semibold text-[#1f2933]">Restroom:</span> {selectedLocation.logistics.restroom}</p>
              <p><span className="font-semibold text-[#1f2933]">Walking:</span> {selectedLocation.logistics.walkingDistance}</p>
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
        <div className="rounded-lg border border-[#d8d2c8] bg-[#faf9f6] px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#7c6f64]">Micro-logistics</p>
          <p className="mt-1 text-sm leading-6 text-[#5f6b76]">
            Pressure-test parking, restroom access, walking burden, and exact micro-spots.
          </p>
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
            <div key={`mobile-${location.name}`} className="rounded-lg border border-[#d8d2c8] bg-white p-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-[#1f2933]">{location.displayName || location.name}</p>
                  {location.displayName && location.displayName !== location.name && (
                    <p className="mt-1 text-xs text-[#5f6b76]">AI label: {location.name}</p>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => onVoteLocation(location, 'up')}
                    className={`rounded-md border px-2 py-1 text-xs ${
                      currentVote === 'up'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-700'
                        : 'border-[#d8d2c8] bg-white text-[#5f6b76]'
                    }`}
                  >
                    Relevant
                  </button>
                  <button
                    type="button"
                    onClick={() => onVoteLocation(location, 'down')}
                    className={`rounded-md border px-2 py-1 text-xs ${
                      currentVote === 'down'
                        ? 'border-red-600 bg-red-50 text-red-700'
                        : 'border-[#d8d2c8] bg-white text-[#5f6b76]'
                    }`}
                  >
                    Not relevant
                  </button>
                  {location.venueBucket && (
                    <button
                      type="button"
                      onClick={() => onTogglePreferredVenueBucket(location.venueBucket)}
                      className={`rounded-md border px-2 py-1 text-xs ${
                        isPreferredType
                          ? 'border-blue-600 bg-blue-50 text-blue-700'
                          : 'border-[#d8d2c8] bg-white text-[#5f6b76]'
                      }`}
                    >
                      Prefer type
                    </button>
                  )}
                  {location.venueBucket && (
                    <button
                      type="button"
                      onClick={() => onToggleExcludedVenueBucket(location.venueBucket)}
                      className={`rounded-md border px-2 py-1 text-xs ${
                        isExcludedType
                          ? 'border-amber-600 bg-amber-50 text-amber-700'
                          : 'border-[#d8d2c8] bg-white text-[#5f6b76]'
                      }`}
                    >
                      Exclude type
                    </button>
                  )}
                </div>
              </div>

              <div className="mt-3 rounded-md bg-[#faf9f6] px-3 py-2">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#7c6f64]">Why this location was picked</p>
                <p className="mt-1 text-sm leading-6 text-[#5f6b76]">{location.whyItWorks}</p>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {location.microLocations.map(spot => (
                  <span key={`mobile-${location.name}-${spot}`} className="rounded-md bg-[#f6f3ee] px-2 py-1 text-xs text-[#1f2933]">
                    {spot}
                  </span>
                ))}
              </div>
              <div className="mt-3 grid gap-1 text-xs text-[#5f6b76]">
                <p><span className="font-semibold text-[#1f2933]">Parking:</span> {location.logistics.parking}</p>
                <p><span className="font-semibold text-[#1f2933]">Restroom:</span> {location.logistics.restroom}</p>
                <p><span className="font-semibold text-[#1f2933]">Walking:</span> {location.logistics.walkingDistance}</p>
              </div>
              {intelligenceLogistics && (
                <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-[#5f6b76]">
                  <span className="rounded-md bg-[#f6f3ee] px-2 py-1">Risk: {intelligenceLogistics.overallRisk}/10</span>
                  <span className="rounded-md bg-[#f6f3ee] px-2 py-1">Permit: {intelligenceLogistics.permitLikelihood}/10</span>
                  <span className="rounded-md bg-[#f6f3ee] px-2 py-1">Crowd: {intelligenceLogistics.crowdRisk}/10</span>
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
});

PlannerMobileReviewContent.displayName = 'PlannerMobileReviewContent';
