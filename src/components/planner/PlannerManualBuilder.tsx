import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

type LocationMode = 'find-locations' | 'use-provided';

type PlannerManualBuilderProps = {
  shootType: string;
  onShootTypeChange: (value: string) => void;
  locationMode: LocationMode;
  onLocationModeChange: (value: LocationMode) => void;
  city: string;
  onCityChange: (value: string) => void;
  providedLocations: string;
  onProvidedLocationsChange: (value: string) => void;
  desiredLocationCount: string;
  onDesiredLocationCountChange: (value: string) => void;
  shootDate: string;
  onShootDateChange: (value: string) => void;
  duration: string;
  onDurationChange: (value: string) => void;
  subjectDetails: string;
  onSubjectDetailsChange: (value: string) => void;
  mood: string;
  onMoodChange: (value: string) => void;
  mustHaveShots: string;
  onMustHaveShotsChange: (value: string) => void;
  constraints: string;
  onConstraintsChange: (value: string) => void;
  isGenerating: boolean;
  hasPlan: boolean;
  onGeneratePlan: () => void;
};

function inputClass() {
  return 'mt-2 min-h-11 w-full rounded-lg border border-[#d8d2c8] bg-white px-3 py-2 text-sm text-[#1f2933] outline-none transition focus:border-[#1f2933] focus:ring-2 focus:ring-[#1f2933]/10';
}

export function PlannerManualBuilder({
  shootType,
  onShootTypeChange,
  locationMode,
  onLocationModeChange,
  city,
  onCityChange,
  providedLocations,
  onProvidedLocationsChange,
  desiredLocationCount,
  onDesiredLocationCountChange,
  shootDate,
  onShootDateChange,
  duration,
  onDurationChange,
  subjectDetails,
  onSubjectDetailsChange,
  mood,
  onMoodChange,
  mustHaveShots,
  onMustHaveShotsChange,
  constraints,
  onConstraintsChange,
  isGenerating,
  hasPlan,
  onGeneratePlan,
}: PlannerManualBuilderProps) {
  return (
    <Card className="border border-[#d8d2c8] bg-white shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#7c6f64]">Manual plan builder</p>
          <h2 className="mt-2 text-2xl font-semibold text-[#1f2933]">Enter the known details, then let AI assemble the shoot plan.</h2>
        </div>
        <Button isLoading={isGenerating} onClick={onGeneratePlan} className="bg-[#1f2933] hover:bg-[#111827]">
          {isGenerating ? 'Generating...' : hasPlan ? 'Regenerate plan' : 'Generate full plan'}
        </Button>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <label className="text-sm font-medium text-[#1f2933]">
          Shoot type
          <select className={inputClass()} value={shootType} onChange={event => onShootTypeChange(event.target.value)}>
            <option>Family Session</option>
            <option>Engagement Session</option>
            <option>Branding Session</option>
            <option>Portrait Session</option>
            <option>Event Session</option>
            <option>Wedding Session</option>
          </select>
        </label>
        <label className="text-sm font-medium text-[#1f2933]">
          Planning mode
          <select className={inputClass()} value={locationMode} onChange={event => onLocationModeChange(event.target.value as LocationMode)}>
            <option value="find-locations">Find locations for me</option>
            <option value="use-provided">I already have locations</option>
          </select>
        </label>
        {locationMode === 'find-locations' ? (
          <label className="text-sm font-medium text-[#1f2933]">
            City or area
            <input className={inputClass()} value={city} onChange={event => onCityChange(event.target.value)} placeholder="Dallas, TX" />
          </label>
        ) : (
          <label className="text-sm font-medium text-[#1f2933] lg:col-span-2">
            Chosen location
            <textarea className={inputClass()} rows={3} value={providedLocations} onChange={event => onProvidedLocationsChange(event.target.value)} placeholder="Main park, garden entrance, downtown square..." />
          </label>
        )}
        <label className="text-sm font-medium text-[#1f2933]">
          Final location count
          <select className={inputClass()} value={desiredLocationCount} onChange={event => onDesiredLocationCountChange(event.target.value)}>
            <option>1 location</option>
            <option>2 locations</option>
            <option>3 locations</option>
            <option>4+ locations</option>
          </select>
        </label>
        <label className="text-sm font-medium text-[#1f2933]">
          Date and time
          <input className={inputClass()} value={shootDate} onChange={event => onShootDateChange(event.target.value)} placeholder="2026-08-14 6:30 PM" />
        </label>
        <label className="text-sm font-medium text-[#1f2933]">
          Duration
          <input className={inputClass()} value={duration} onChange={event => onDurationChange(event.target.value)} placeholder="60 minutes" />
        </label>
        <label className="text-sm font-medium text-[#1f2933] lg:col-span-2">
          Client and deliverables
          <textarea className={inputClass()} rows={4} value={subjectDetails} onChange={event => onSubjectDetailsChange(event.target.value)} placeholder="Who is being photographed, gallery needs, outfit changes, groupings, and client priorities." />
        </label>
        <label className="text-sm font-medium text-[#1f2933]">
          Photographer style
          <textarea className={inputClass()} rows={4} value={mood} onChange={event => onMoodChange(event.target.value)} placeholder="Warm, candid, editorial, true-to-color, movement-first..." />
        </label>
        <label className="text-sm font-medium text-[#1f2933]">
          Must-have shots
          <textarea className={inputClass()} rows={4} value={mustHaveShots} onChange={event => onMustHaveShotsChange(event.target.value)} placeholder="Whole family, parent portraits, details, hero image, horizontal crops..." />
        </label>
        <label className="text-sm font-medium text-[#1f2933] lg:col-span-2">
          Constraints and weather/sun preferences
          <textarea className={inputClass()} rows={4} value={constraints} onChange={event => onConstraintsChange(event.target.value)} placeholder="Mobility, kids, pets, wind/rain risk, shade needs, golden-hour preference, parking, permits..." />
        </label>
      </div>
    </Card>
  );
}
