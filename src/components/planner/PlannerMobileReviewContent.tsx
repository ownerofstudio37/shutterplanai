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
  parkingDifficulty?: number;
  permitLikelihood: number;
  crowdRisk: number;
  overallRisk: number;
  warnings?: string[];
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

type ReviewShot = {
  title: string;
  description: string;
  location: string;
  microSpot: string;
  poseSuggestion: string;
  compositionSuggestion?: string;
  timingHint?: string;
  lensSuggestion?: string;
  deliverableCategory?: string;
  angleSuggestion?: string;
  backupMicroSpot?: string;
  priority?: 'must-have' | 'should-have' | 'nice-to-have';
  lightWeatherNote?: string;
};

type TimelineItem = {
  timeBlock: string;
  focus: string;
  notes: string;
};

type MobilePlannerIntelligence = {
  goldenHours: {
    goldenHourStart: string;
    goldenHourEnd: string;
  };
  weather?: {
    conditionSummary?: string;
    precipitationProbability: number;
    uvIndex: number;
    windSpeed: number;
    recommendations: string[];
  };
};

type PlannerMobileReviewContentProps = {
  reviewTab: ReviewTab;
  mapContent: ReactNode;
  selectedLocation: ReviewLocation | null;
  locations: ReviewLocation[];
  emptyLocationMessage: string | null;
  locationVotes: Record<string, LocationVote>;
  selectedLocationKeys: string[];
  selectedLocationCount: number;
  recommendedLocationCount: number;
  preferredVenueBucket: string | null;
  excludedVenueBuckets: string[];
  logisticsLookup: Map<string, LogisticsInfo>;
  onToggleSelectedLocation: (location: ReviewLocation) => void;
  onClearSelectedLocations: () => void;
  onVoteLocation: (location: ReviewLocation, vote: LocationVote) => void;
  onTogglePreferredVenueBucket: (venueBucket?: string) => void;
  onToggleExcludedVenueBucket: (venueBucket?: string) => void;
  emptyShotMessage: string | null;
  shots: ReviewShot[];
  timeline: TimelineItem[];
  intelligence?: MobilePlannerIntelligence | null;
  photographerSunWeatherNotes?: string[];
  checklist: string[];
  contingencyPlans: string[];
  clientGuide?: {
    arrivalInstructions: string;
    parking: string;
    whatToWearAndBring: string[];
    sessionFlow: string;
    weatherExpectations: string;
    reassurance: string;
    tone: string;
  };
};

function formatTime(value?: string) {
  if (!value) return 'Pending';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Pending';
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

export const PlannerMobileReviewContent = memo(function PlannerMobileReviewContent({
  reviewTab,
  mapContent,
  selectedLocation,
  locations,
  emptyLocationMessage,
  locationVotes,
  selectedLocationKeys,
  selectedLocationCount,
  recommendedLocationCount,
  preferredVenueBucket,
  excludedVenueBuckets,
  logisticsLookup,
  onToggleSelectedLocation,
  onClearSelectedLocations,
  onVoteLocation,
  onTogglePreferredVenueBucket,
  onToggleExcludedVenueBucket,
  emptyShotMessage,
  shots,
  timeline,
  intelligence,
  photographerSunWeatherNotes = [],
  checklist,
  contingencyPlans,
  clientGuide,
}: PlannerMobileReviewContentProps) {
  const getPriorityLabel = (priority?: ReviewShot['priority']) => {
    if (priority === 'must-have') return 'Must-have';
    if (priority === 'should-have') return 'Should-have';
    return 'Nice-to-have';
  };

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
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#7c6f64]">Selected stop</p>
                <p className="mt-2 text-base font-semibold text-[#1f2933]">{selectedLocation.displayName || selectedLocation.name}</p>
              </div>
              <button
                type="button"
                onClick={() => onToggleSelectedLocation(selectedLocation)}
                className={`min-h-10 rounded-md border px-3 py-2 text-xs font-semibold ${
                  selectedLocationKeys.includes((selectedLocation.displayName || selectedLocation.name).toLowerCase())
                    ? 'border-[#1f2933] bg-[#1f2933] text-white'
                    : 'border-[#d8d2c8] bg-white text-[#1f2933]'
                }`}
              >
                {selectedLocationKeys.includes((selectedLocation.displayName || selectedLocation.name).toLowerCase()) ? 'Chosen' : 'Use'}
              </button>
            </div>
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
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#7c6f64]">Location shortlist</p>
              <p className="mt-1 text-sm leading-6 text-[#5f6b76]">
                Choose the real shoot stops, then tune parking, restroom access, walking burden, and exact micro-spots.
              </p>
            </div>
            <div className="rounded-md bg-white px-2 py-1 text-right text-xs">
              <p className="font-semibold text-[#1f2933]">{selectedLocationCount}/{recommendedLocationCount}</p>
              <p className="text-[#5f6b76]">selected</p>
            </div>
          </div>
          {selectedLocationCount > 0 && (
            <button type="button" onClick={onClearSelectedLocations} className="mt-2 text-xs font-semibold text-[#7c6f64] underline">
              Clear selected stops
            </button>
          )}
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
          const isSelectedStop = selectedLocationKeys.includes(locationKey);
          const isPreferredType = !!location.venueBucket && preferredVenueBucket === location.venueBucket;
          const isExcludedType = !!location.venueBucket && excludedVenueBuckets.includes(location.venueBucket);
          const intelligenceLogistics = logisticsLookup.get(locationKey);

          return (
            <div key={`mobile-${location.name}`} className={`rounded-lg border bg-white p-3 ${isSelectedStop ? 'border-[#1f2933] ring-2 ring-[#1f2933]/10' : 'border-[#d8d2c8]'}`}>
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
                    onClick={() => onToggleSelectedLocation(location)}
                    className={`min-h-10 rounded-md border px-2 py-1 text-xs font-semibold ${
                      isSelectedStop
                        ? 'border-[#1f2933] bg-[#1f2933] text-white'
                        : 'border-[#d8d2c8] bg-white text-[#1f2933]'
                    }`}
                  >
                    {isSelectedStop ? 'Selected' : 'Use'}
                  </button>
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
              <div className="mt-3 grid gap-2">
                {location.microLocations.map((spot, spotIndex) => (
                  <div key={`mobile-${location.name}-${spot}`} className="grid grid-cols-[28px_1fr] gap-2 rounded-md bg-[#f6f3ee] px-2 py-2 text-xs text-[#1f2933]">
                    <span className="flex h-7 w-7 items-center justify-center rounded-md bg-white font-semibold text-[#5f6b76]">
                      {spotIndex + 1}
                    </span>
                    <span>
                      <span className="block font-semibold">{spot}</span>
                      <span className="mt-1 block text-[#5f6b76]">
                        {spotIndex === 0 ? 'Arrival or first setup' : 'Portrait/background stop'}
                      </span>
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-3 grid gap-1 text-xs text-[#5f6b76]">
                <p><span className="font-semibold text-[#1f2933]">Parking:</span> {location.logistics.parking}</p>
                <p><span className="font-semibold text-[#1f2933]">Restroom:</span> {location.logistics.restroom}</p>
                <p><span className="font-semibold text-[#1f2933]">Walking:</span> {location.logistics.walkingDistance}</p>
              </div>
              {intelligenceLogistics && (
                <div className="mt-3 space-y-2 text-[11px] text-[#5f6b76]">
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-md bg-[#f6f3ee] px-2 py-1">Risk: {intelligenceLogistics.overallRisk}/10</span>
                    <span className="rounded-md bg-[#f6f3ee] px-2 py-1">Permit: {intelligenceLogistics.permitLikelihood}/10</span>
                    <span className="rounded-md bg-[#f6f3ee] px-2 py-1">Crowd: {intelligenceLogistics.crowdRisk}/10</span>
                    {intelligenceLogistics.needsVerification && (
                      <span className="rounded-md border border-amber-200 bg-amber-50 px-2 py-1 font-semibold text-amber-900">
                        Needs verification
                      </span>
                    )}
                  </div>
                  <div className="rounded-md bg-[#faf9f6] px-3 py-2">
                    <p><span className="font-semibold text-[#1f2933]">Hours:</span> {intelligenceLogistics.venueHoursSummary}</p>
                    <p className="mt-1"><span className="font-semibold text-[#1f2933]">Parking cost:</span> {intelligenceLogistics.parkingCost}</p>
                    <p className="mt-1"><span className="font-semibold text-[#1f2933]">Restroom confidence:</span> {intelligenceLogistics.restroomConfidence}</p>
                  </div>
                  {intelligenceLogistics.permit && (
                    <div className="rounded-md bg-[#faf9f6] px-3 py-2">
                      <p className="font-semibold text-[#1f2933]">Permit likelihood: {intelligenceLogistics.permit.likelihood}</p>
                      <p className="mt-1">{intelligenceLogistics.permit.sourceNote}</p>
                      <p className="mt-1 text-[#7c6f64]">Lead time: {intelligenceLogistics.permit.leadTimeDays} days</p>
                    </div>
                  )}
                  {intelligenceLogistics.crowd && (
                    <div className="rounded-md bg-[#faf9f6] px-3 py-2">
                      <p className="font-semibold text-[#1f2933]">Event/crowd risk: {intelligenceLogistics.crowd.eventRisk}</p>
                      <p className="mt-1">{intelligenceLogistics.crowd.sourceNote}</p>
                    </div>
                  )}
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
            <div className="flex items-start justify-between gap-2">
              <p className="font-semibold text-gray-900">{shot.title}</p>
              <span className="rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-[11px] font-semibold text-gray-600">
                {getPriorityLabel(shot.priority)}
              </span>
            </div>
            <p className="mt-1 text-sm text-gray-600">{shot.description}</p>
            <p className="mt-2 text-xs text-gray-500">Location: {shot.location}</p>
            <p className="text-xs text-gray-500">Micro-spot: {shot.microSpot}</p>
            {shot.deliverableCategory && <p className="text-xs text-gray-500">Deliverable: {shot.deliverableCategory}</p>}
            <p className="text-xs text-gray-500">Pose: {shot.poseSuggestion}</p>
            {shot.compositionSuggestion && <p className="text-xs text-gray-500">Angle: {shot.compositionSuggestion}</p>}
            {shot.angleSuggestion && <p className="text-xs text-gray-500">Camera angle: {shot.angleSuggestion}</p>}
            {shot.lensSuggestion && <p className="text-xs text-gray-500">Lens: {shot.lensSuggestion}</p>}
            {shot.backupMicroSpot && <p className="text-xs text-gray-500">Backup: {shot.backupMicroSpot}</p>}
            {shot.lightWeatherNote && <p className="text-xs text-gray-500">Sun/weather: {shot.lightWeatherNote}</p>}
          </div>
        ))}
      </div>
    );
  }

  if (reviewTab === 'timeline') {
    return (
      <div className="space-y-3">
        <div className="rounded-lg border border-[#d8d2c8] bg-[#faf9f6] p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#7c6f64]">Sun + weather</p>
          <p className="mt-2 text-sm font-semibold text-[#1f2933]">
            Golden hour: {formatTime(intelligence?.goldenHours.goldenHourStart)} - {formatTime(intelligence?.goldenHours.goldenHourEnd)}
          </p>
          {intelligence?.weather && (
            <p className="mt-1 text-xs leading-5 text-[#5f6b76]">
              {intelligence.weather.conditionSummary || 'Forecast ready'}; rain {intelligence.weather.precipitationProbability}%, UV {intelligence.weather.uvIndex}, wind {Math.round(intelligence.weather.windSpeed)} mph.
            </p>
          )}
          {[...photographerSunWeatherNotes, ...(intelligence?.weather?.recommendations ?? [])].slice(0, 2).map(note => (
            <p key={note} className="mt-2 rounded-md bg-white px-3 py-2 text-xs leading-5 text-[#5f6b76]">{note}</p>
          ))}
        </div>
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
        <h4 className="mb-2 text-base font-semibold text-gray-900">Client Guide Preview</h4>
        {clientGuide && (
          <div className="mb-3 space-y-2 rounded-lg border border-blue-100 bg-blue-50 p-3 text-sm text-blue-950">
            <p><span className="font-semibold">Arrival:</span> {clientGuide.arrivalInstructions}</p>
            <p><span className="font-semibold">Parking:</span> {clientGuide.parking}</p>
            <p><span className="font-semibold">Flow:</span> {clientGuide.sessionFlow}</p>
            <p><span className="font-semibold">Weather:</span> {clientGuide.weatherExpectations}</p>
            <p><span className="font-semibold">Tone:</span> {clientGuide.tone}</p>
          </div>
        )}
        <ul className="list-inside list-disc space-y-1 text-sm text-gray-700">
          {(clientGuide?.whatToWearAndBring ?? checklist).map(item => (
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
