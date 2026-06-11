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
  onSelectLocation: (locationName: string) => void;
  mapContent: ReactNode;
};

export function PlannerMapReviewPanel({
  locations,
  selectedLocation,
  onSelectLocation,
  mapContent,
}: PlannerMapReviewPanelProps) {
  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
      <div className="space-y-4">
        <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-900">
          Map-first review helps confirm spacing, route order, and whether the chosen locations cluster in the right part of the city.
        </div>

        {mapContent}
      </div>

      <div className="space-y-4">
        <div className="rounded-xl border border-gray-200 p-4">
          <p className="text-sm font-semibold text-gray-900">Current stop order</p>
          <div className="mt-3 space-y-2">
            {locations.map((location, index) => {
              const locationName = location.displayName || location.name;
              const isSelected = locationName === (selectedLocation?.displayName || selectedLocation?.name);

              return (
                <button
                  key={`map-sequence-${locationName}`}
                  type="button"
                  onClick={() => onSelectLocation(locationName)}
                  className={`w-full rounded-lg border px-3 py-2 text-left text-sm ${
                    isSelected
                      ? 'border-blue-600 bg-blue-50 text-blue-900'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <p className="font-medium">Stop {index + 1}: {locationName}</p>
                  <p className="mt-1 text-xs text-gray-500">{location.microLocations.slice(0, 2).join(' • ') || 'No micro-spots listed yet'}</p>
                </button>
              );
            })}
          </div>
        </div>

        {selectedLocation ? (
          <div className="rounded-xl border border-gray-200 p-4">
            <p className="text-sm font-semibold text-gray-900">{selectedLocation.displayName || selectedLocation.name}</p>
            <p className="mt-1 text-sm text-gray-600">{selectedLocation.whyItWorks}</p>
            {Array.isArray(selectedLocation.selectionReasons) && selectedLocation.selectionReasons.length > 0 && (
              <ul className="mt-3 list-disc space-y-1 pl-5 text-xs text-gray-700">
                {selectedLocation.selectionReasons.map(reason => (
                  <li key={`map-reason-${selectedLocation.name}-${reason}`}>{reason}</li>
                ))}
              </ul>
            )}
            <div className="mt-3 grid gap-2 text-xs text-gray-600 sm:grid-cols-2">
              <p>Parking: {selectedLocation.logistics.parking}</p>
              <p>Restroom: {selectedLocation.logistics.restroom}</p>
              <p>Walk: {selectedLocation.logistics.walkingDistance}</p>
              {selectedLocation.venueBucket && <p>Type: {selectedLocation.venueBucket}</p>}
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
