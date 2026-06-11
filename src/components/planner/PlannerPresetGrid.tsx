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
    <div className="mb-4 rounded-lg border border-[#d8d2c8] bg-white p-4">
      <div className="mb-3 flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#7c6f64]">Session templates</p>
          <p className="mt-1 text-sm font-semibold text-[#1f2933]">Start from a proven production pattern</p>
          <p className="mt-1 text-xs text-[#5f6b76]">Load a baseline brief, then tune the details before generation.</p>
        </div>
        {activePresetId && (
          <span className="rounded-md border border-[#d8d2c8] bg-[#faf9f6] px-2 py-1 text-xs font-medium text-[#5f6b76]">
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
            className={`rounded-lg border px-4 py-3 text-left transition ${
              activePresetId === preset.id
                ? 'border-[#1f2933] bg-[#faf9f6] shadow-sm'
                : 'border-[#e4ded5] bg-white hover:border-[#1f2933]'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-[#1f2933]">{preset.label}</p>
                <p className="mt-1 text-xs leading-5 text-[#5f6b76]">{preset.description}</p>
              </div>
              <span className="rounded-md bg-[#ebe5db] px-2 py-1 text-[11px] font-medium text-[#5f6b76]">{preset.duration}</span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
              <span className="rounded-md bg-[#f6f3ee] px-2 py-1 text-[#5f6b76]">{preset.shootType}</span>
              <span className="rounded-md bg-[#f6f3ee] px-2 py-1 text-[#5f6b76]">
                {preset.locationMode === 'use-provided' ? 'Provided locations' : 'Find locations'}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
