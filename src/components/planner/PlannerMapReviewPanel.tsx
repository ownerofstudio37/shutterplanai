import type { ReactNode } from 'react';

type ReviewLocation = {
  name: string;
  displayName?: string;
  whyItWorks: string;
  microLocations: string[];
  selectionReasons?: string[];
  venueBucket?: string;
  logistics: {
    parking: string;
    restroom: string;
    walkingDistance: string;
  };
};

type PlannerMapReviewPanelProps = {
  locations: ReviewLocation[];
  selectedLocation: ReviewLocation | null;
  selectedLocationKeys: string[];
  selectedLocationCount: number;
  recommendedLocationCount: number;
  onSelectLocation: (locationName: string) => void;
  onToggleSelectedLocation: (location: ReviewLocation) => void;
  onClearSelectedLocations: () => void;
  mapContent: ReactNode;
};

function formatBucket(value?: string) {
  if (!value) return 'Venue type pending';
  return value
    .split('-')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function PlannerMapReviewPanel({
  locations,
  selectedLocation,
  selectedLocationKeys,
  selectedLocationCount,
  recommendedLocationCount,
  onSelectLocation,
  onToggleSelectedLocation,
  onClearSelectedLocations,
  mapContent,
}: PlannerMapReviewPanelProps) {
  const selectedKeySet = new Set(selectedLocationKeys);

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(340px,0.65fr)]">
      <div className="space-y-4">
        <div className="rounded-lg border border-[#d8d2c8] bg-[#faf9f6] px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#7c6f64]">Map review</p>
          <p className="mt-1 text-sm leading-6 text-[#5f6b76]">
            Confirm drive clustering, stop order, and whether the route supports the client arrival plan.
          </p>
        </div>

        <div className="overflow-hidden rounded-lg border border-[#d8d2c8] bg-white p-3">
          {mapContent}
        </div>
      </div>

      <div className="space-y-4">
        <div className="rounded-lg border border-[#d8d2c8] bg-white p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#7c6f64]">Route order</p>
              <h4 className="mt-1 text-base font-semibold text-[#1f2933]">Choose shoot stops</h4>
              <p className="mt-1 text-xs leading-5 text-[#5f6b76]">
                Pick the actual locations for this session. Unselected AI candidates stay available for comparison.
              </p>
            </div>
            <div className="text-right">
              <span className="rounded-md bg-[#f6f3ee] px-2 py-1 text-xs font-semibold text-[#1f2933]">
                {selectedLocationCount}/{recommendedLocationCount} chosen
              </span>
              {selectedLocationCount > 0 && (
                <button type="button" onClick={onClearSelectedLocations} className="mt-2 block text-xs font-semibold text-[#7c6f64] underline">
                  Clear
                </button>
              )}
            </div>
          </div>

          <div className="mt-4 space-y-2">
            {locations.map((location, index) => {
              const locationName = location.displayName || location.name;
              const isSelected = locationName === (selectedLocation?.displayName || selectedLocation?.name);
              const isChosenStop = selectedKeySet.has(locationName.toLowerCase());

              return (
                <div
                  key={`map-sequence-${locationName}`}
                  className={`grid gap-3 rounded-lg border px-3 py-3 transition sm:grid-cols-[1fr_auto] ${
                    isChosenStop
                      ? 'border-[#1f2933] bg-[#1f2933] text-white'
                      : isSelected
                        ? 'border-[#1f2933] bg-white text-[#1f2933]'
                        : 'border-[#e4ded5] bg-[#faf9f6] text-[#1f2933]'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => onSelectLocation(locationName)}
                    className="grid min-w-0 grid-cols-[32px_1fr] gap-3 text-left"
                  >
                    <span
                      className={`flex h-8 w-8 items-center justify-center rounded-md text-xs font-semibold ${
                        isChosenStop
                          ? 'bg-white text-[#1f2933]'
                          : isSelected
                            ? 'bg-[#1f2933] text-white'
                            : 'bg-[#ebe5db] text-[#5f6b76]'
                      }`}
                    >
                      {index + 1}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold">{locationName}</span>
                      <span className={`mt-1 block truncate text-xs ${isChosenStop ? 'text-[#d1d5db]' : 'text-[#5f6b76]'}`}>
                        {location.microLocations.slice(0, 2).join(' / ') || 'Micro-spots pending'}
                      </span>
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onToggleSelectedLocation(location)}
                    className={`min-h-10 rounded-md border px-3 py-2 text-xs font-semibold ${
                      isChosenStop
                        ? 'border-white/20 bg-white text-[#1f2933]'
                        : 'border-[#d8d2c8] bg-white text-[#1f2933] hover:border-[#1f2933]'
                    }`}
                  >
                    {isChosenStop ? 'Chosen' : 'Use'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {selectedLocation ? (
          <div className="rounded-lg border border-[#d8d2c8] bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#7c6f64]">Selected stop</p>
            <h4 className="mt-2 text-lg font-semibold text-[#1f2933]">
              {selectedLocation.displayName || selectedLocation.name}
            </h4>
            <p className="mt-2 text-sm leading-6 text-[#5f6b76]">{selectedLocation.whyItWorks}</p>

            {Array.isArray(selectedLocation.selectionReasons) && selectedLocation.selectionReasons.length > 0 && (
              <div className="mt-4 rounded-lg border border-[#e4ded5] bg-[#faf9f6] px-3 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#7c6f64]">Selection reasons</p>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-[#5f6b76]">
                  {selectedLocation.selectionReasons.map(reason => (
                    <li key={`map-reason-${selectedLocation.name}-${reason}`}>{reason}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mt-4 grid gap-2 text-xs text-[#5f6b76]">
              <div className="rounded-md bg-[#f6f3ee] px-3 py-2">
                <span className="font-semibold text-[#1f2933]">Parking:</span> {selectedLocation.logistics.parking}
              </div>
              <div className="rounded-md bg-[#f6f3ee] px-3 py-2">
                <span className="font-semibold text-[#1f2933]">Restroom:</span> {selectedLocation.logistics.restroom}
              </div>
              <div className="rounded-md bg-[#f6f3ee] px-3 py-2">
                <span className="font-semibold text-[#1f2933]">Walking:</span> {selectedLocation.logistics.walkingDistance}
              </div>
              <div className="rounded-md bg-[#f6f3ee] px-3 py-2">
                <span className="font-semibold text-[#1f2933]">Venue:</span> {formatBucket(selectedLocation.venueBucket)}
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <p className="font-semibold">No map-ready locations yet</p>
            <p className="mt-1">Try regenerating with a broader area or use provided locations with clearer place names.</p>
          </div>
        )}
      </div>
    </div>
  );
}
