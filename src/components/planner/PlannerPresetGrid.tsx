type PlannerPreset = {
  id: string;
  label: string;
  description: string;
  shootType: string;
  locationMode: 'find-locations' | 'use-provided';
  duration: string;
  mood: string;
  subjectDetails: string;
  mustHaveShots: string;
  constraints: string;
  familyPacing?: string;
  engagementStory?: string;
  brandingGoals?: string;
  eventPriorities?: string;
};

type PlannerPresetGridProps = {
  presets: PlannerPreset[];
  activePresetId: string | null;
  onApplyPreset: (preset: PlannerPreset) => void;
};

export function PlannerPresetGrid({ presets, activePresetId, onApplyPreset }: PlannerPresetGridProps) {
  return (
    <div className="mb-4 rounded-xl border border-indigo-200 bg-indigo-50 p-4">
      <div className="mb-3 flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-semibold text-indigo-900">Quick-start presets</p>
          <p className="text-xs text-indigo-700">Start with a proven planning setup, then tweak anything in the intake summary.</p>
        </div>
        {activePresetId && (
          <span className="rounded-full bg-white px-2 py-1 text-xs font-medium text-indigo-700">
            Active preset: {presets.find(preset => preset.id === activePresetId)?.label}
          </span>
        )}
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {presets.map(preset => (
          <button
            key={preset.id}
            type="button"
            onClick={() => onApplyPreset(preset)}
            className={`rounded-xl border px-4 py-3 text-left transition ${
              activePresetId === preset.id
                ? 'border-indigo-600 bg-white shadow-sm'
                : 'border-indigo-200 bg-white/80 hover:border-indigo-300 hover:bg-white'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-gray-900">{preset.label}</p>
                <p className="mt-1 text-xs text-gray-600">{preset.description}</p>
              </div>
              <span className="rounded-full bg-indigo-100 px-2 py-1 text-[11px] font-medium text-indigo-700">{preset.duration}</span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
              <span className="rounded-full bg-gray-100 px-2 py-1 text-gray-700">{preset.shootType}</span>
              <span className="rounded-full bg-gray-100 px-2 py-1 text-gray-700">
                {preset.locationMode === 'use-provided' ? 'Provided locations' : 'Find locations'}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
