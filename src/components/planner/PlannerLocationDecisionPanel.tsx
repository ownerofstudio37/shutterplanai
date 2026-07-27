import { Button } from '@/components/ui/Button';

type ReviewLocation = {
  name: string;
  displayName?: string;
  whyItWorks: string;
  microLocations: string[];
  microLocationPlan?: Array<{
    name: string;
    purpose: string;
    bestLightDirection: string;
    bestShotTypes: string[];
    walkingOrder: number;
    backupUse: string;
  }>;
  visualFit?: string;
  crowdRisk?: 'low' | 'medium' | 'high';
  permitRisk?: 'low' | 'medium' | 'high';
  weatherBackupQuality?: 'poor' | 'fair' | 'strong';
  confidenceScore?: number;
  logistics: {
    parking: string;
    restroom: string;
    walkingDistance: string;
  };
};

type PlannerLocationDecisionPanelProps = {
  locations: ReviewLocation[];
  selectedLocationKeys: string[];
  isRouteConfirmed: boolean;
  onChoosePrimaryLocation: (location: ReviewLocation) => void;
  onConfirmRoute: () => void;
  onMapMicroSpots: () => void;
  onAskAiForMore: () => void;
};

function getLocationKey(location: ReviewLocation) {
  return (location.displayName || location.name).toLowerCase();
}

function getRiskLabel(value?: string) {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : 'Pending';
}

export function PlannerLocationDecisionPanel({
  locations,
  selectedLocationKeys,
  isRouteConfirmed,
  onChoosePrimaryLocation,
  onConfirmRoute,
  onMapMicroSpots,
  onAskAiForMore,
}: PlannerLocationDecisionPanelProps) {
  const primaryLocation = locations.find(location => selectedLocationKeys.includes(getLocationKey(location))) ?? null;
  const candidates = locations.slice(0, 3);

  if (locations.length === 0) return null;

  return (
    <section className="rounded-lg border border-[#d8d2c8] bg-white shadow-sm">
      <div className="grid gap-5 p-4 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div>
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#7c6f64]">Choose primary location</p>
              <h2 className="mt-2 text-xl font-semibold text-[#1f2933]">
                {primaryLocation ? primaryLocation.name : 'Pick one anchor before mapping micro-spots'}
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[#5f6b76]">
                The plan should center on one real location first. After that, map the exact internal spots, walking order, backups, and shot assignments.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={onAskAiForMore} className="bg-[#ebe5db] hover:bg-[#ded8ce]">
                Ask AI for more
              </Button>
              <Button
                onClick={primaryLocation ? onConfirmRoute : undefined}
                disabled={!primaryLocation || isRouteConfirmed}
                className={isRouteConfirmed ? 'bg-emerald-700 hover:bg-emerald-800' : 'bg-[#1f2933] hover:bg-[#111827]'}
              >
                {isRouteConfirmed ? 'Primary locked' : 'Lock primary'}
              </Button>
            </div>
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-3">
            {candidates.map(location => {
              const isSelected = primaryLocation && getLocationKey(primaryLocation) === getLocationKey(location);
              const microSpotCount = location.microLocationPlan?.length || location.microLocations.length;

              return (
                <button
                  key={getLocationKey(location)}
                  type="button"
                  onClick={() => onChoosePrimaryLocation(location)}
                  className={`rounded-lg border p-3 text-left transition ${
                    isSelected
                      ? 'border-[#1f2933] bg-[#1f2933] text-white'
                      : 'border-[#d8d2c8] bg-[#faf9f6] text-[#1f2933] hover:border-[#1f2933]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-semibold">{location.name}</p>
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                      isSelected ? 'bg-white/15 text-white' : 'bg-white text-[#5f6b76]'
                    }`}>
                      {isSelected ? 'primary' : 'choose'}
                    </span>
                  </div>
                  <p className={`mt-2 line-clamp-3 text-xs leading-5 ${isSelected ? 'text-[#d7dce7]' : 'text-[#5f6b76]'}`}>
                    {location.visualFit || location.whyItWorks}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-1.5 text-[11px]">
                    <span className={`rounded-full px-2 py-1 ${isSelected ? 'bg-white/10 text-[#eef1f7]' : 'bg-white text-[#5f6b76]'}`}>
                      {microSpotCount} micro-spots
                    </span>
                    <span className={`rounded-full px-2 py-1 ${isSelected ? 'bg-white/10 text-[#eef1f7]' : 'bg-white text-[#5f6b76]'}`}>
                      Crowd {getRiskLabel(location.crowdRisk)}
                    </span>
                    <span className={`rounded-full px-2 py-1 ${isSelected ? 'bg-white/10 text-[#eef1f7]' : 'bg-white text-[#5f6b76]'}`}>
                      Backup {getRiskLabel(location.weatherBackupQuality)}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <aside className="rounded-lg border border-[#e4ded5] bg-[#faf9f6] p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#7c6f64]">Next workspace</p>
          {primaryLocation ? (
            <>
              <p className="mt-2 text-sm font-semibold text-[#1f2933]">Map inside {primaryLocation.name}</p>
              <div className="mt-3 space-y-2 text-xs leading-5 text-[#5f6b76]">
                <p><span className="font-semibold text-[#1f2933]">Parking:</span> {primaryLocation.logistics.parking}</p>
                <p><span className="font-semibold text-[#1f2933]">Restroom:</span> {primaryLocation.logistics.restroom}</p>
                <p><span className="font-semibold text-[#1f2933]">Walking:</span> {primaryLocation.logistics.walkingDistance}</p>
              </div>
              <Button onClick={onMapMicroSpots} className="mt-4 w-full bg-[#1f2933] hover:bg-[#111827]">
                Map micro-spots
              </Button>
            </>
          ) : (
            <p className="mt-2 text-sm leading-6 text-[#5f6b76]">
              Select the best candidate, then ShutterPlan will focus the rest of the workflow on micro-spots and shot matching inside it.
            </p>
          )}
        </aside>
      </div>
    </section>
  );
}
