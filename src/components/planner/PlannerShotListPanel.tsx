import { Button } from '@/components/ui/Button';
import { InlineEditableField } from '@/components/planner/InlineEditableField';

type ReviewShot = {
  title: string;
  description: string;
  location: string;
  microSpot: string;
  poseSuggestion: string;
  compositionSuggestion: string;
  timingHint: string;
  latitude?: number | null;
  longitude?: number | null;
};

type PlannerShotListPanelProps = {
  displayedShots: ReviewShot[];
  allShots: ReviewShot[];
  emptyShotMessage: string | null;
  isEditMode: boolean;
  isRegenerating: boolean;
  onRegenerate: () => void;
  onUpdateShotField: (index: number, field: 'title' | 'description' | 'location', value: string) => void;
};

function getCoverageTone(index: number) {
  const tones = [
    'border-[#d8d2c8] bg-white',
    'border-blue-200 bg-blue-50/40',
    'border-emerald-200 bg-emerald-50/40',
    'border-amber-200 bg-amber-50/40',
  ];
  return tones[index % tones.length];
}

export function PlannerShotListPanel({
  displayedShots,
  allShots,
  emptyShotMessage,
  isEditMode,
  isRegenerating,
  onRegenerate,
  onUpdateShotField,
}: PlannerShotListPanelProps) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-lg border border-[#d8d2c8] bg-[#faf9f6] px-4 py-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#7c6f64]">Coverage plan</p>
          <p className="mt-1 text-sm text-[#5f6b76]">
            {displayedShots.length} shot{displayedShots.length === 1 ? '' : 's'} planned across locations, micro-spots, timing, and posing.
          </p>
        </div>
        <Button
          onClick={onRegenerate}
          disabled={isRegenerating}
          variant="secondary"
          className="bg-white hover:bg-[#ebe5db]"
        >
          {isRegenerating ? 'Regenerating...' : 'Regenerate shot list'}
        </Button>
      </div>

      {emptyShotMessage && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <p className="font-semibold">No visible shots right now</p>
          <p className="mt-1">{emptyShotMessage}</p>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {displayedShots.map((shot, index) => {
          const shotIndex = allShots.indexOf(shot);

          return (
            <article key={`${shot.title}-${shot.microSpot}`} className={`overflow-hidden rounded-lg border ${getCoverageTone(index)}`}>
              <div className="border-b border-[#e4ded5] bg-white/70 px-4 py-3">
                <div className="flex items-start gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[#1f2933] text-xs font-semibold text-white">
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <InlineEditableField
                      isEditing={isEditMode}
                      title="Shot title"
                      value={shot.title}
                      onChange={value => onUpdateShotField(shotIndex, 'title', value)}
                      className="w-full rounded border border-[#d8d2c8] px-2 py-1 text-sm font-semibold text-[#1f2933]"
                      displayClassName="font-semibold text-[#1f2933]"
                    />
                    <InlineEditableField
                      isEditing={isEditMode}
                      title="Shot location"
                      value={shot.location}
                      onChange={value => onUpdateShotField(shotIndex, 'location', value)}
                      className="mt-2 w-full rounded border border-[#d8d2c8] px-2 py-1 text-xs text-[#5f6b76]"
                      displayClassName="mt-1 text-xs font-medium text-[#7c6f64]"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4 p-4">
                <InlineEditableField
                  isEditing={isEditMode}
                  title="Shot description"
                  value={shot.description}
                  onChange={value => onUpdateShotField(shotIndex, 'description', value)}
                  className="min-h-20 w-full rounded border border-[#d8d2c8] px-2 py-2 text-sm text-[#5f6b76]"
                  displayClassName="text-sm leading-6 text-[#5f6b76]"
                  multiline
                />

                <div className="grid gap-2 text-xs text-[#5f6b76] sm:grid-cols-2">
                  <div className="rounded-md bg-white px-3 py-2">
                    <p className="font-semibold uppercase tracking-[0.12em] text-[#7c6f64]">Micro-spot</p>
                    <p className="mt-1 text-[#1f2933]">{shot.microSpot || 'Not specified'}</p>
                  </div>
                  <div className="rounded-md bg-white px-3 py-2">
                    <p className="font-semibold uppercase tracking-[0.12em] text-[#7c6f64]">Timing</p>
                    <p className="mt-1 text-[#1f2933]">{shot.timingHint || 'Flexible'}</p>
                  </div>
                  <div className="rounded-md bg-white px-3 py-2">
                    <p className="font-semibold uppercase tracking-[0.12em] text-[#7c6f64]">Pose direction</p>
                    <p className="mt-1 text-[#1f2933]">{shot.poseSuggestion || 'Photographer guided'}</p>
                  </div>
                  <div className="rounded-md bg-white px-3 py-2">
                    <p className="font-semibold uppercase tracking-[0.12em] text-[#7c6f64]">Composition</p>
                    <p className="mt-1 text-[#1f2933]">{shot.compositionSuggestion || 'Composition pending'}</p>
                  </div>
                </div>

                {shot.latitude != null && shot.longitude != null && (
                  <p className="rounded-md bg-white px-3 py-2 text-xs text-[#5f6b76]">
                    Coordinates: {Number(shot.latitude).toFixed(5)}, {Number(shot.longitude).toFixed(5)}
                  </p>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
