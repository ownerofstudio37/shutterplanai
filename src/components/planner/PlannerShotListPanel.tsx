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
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex-1 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-900">
          {displayedShots.length} shots planned for this session
        </div>
        <Button
          onClick={onRegenerate}
          disabled={isRegenerating}
          className="ml-3 whitespace-nowrap rounded-lg border border-purple-300 bg-white px-3 py-2 text-sm font-medium text-purple-700 hover:bg-purple-50"
        >
          {isRegenerating ? '⟳ Regenerating...' : '⟳ Regenerate List'}
        </Button>
      </div>

      {emptyShotMessage && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <p className="font-semibold">No visible shots right now</p>
          <p className="mt-1">{emptyShotMessage}</p>
        </div>
      )}

      <div className="grid gap-3 lg:grid-cols-2">
        {displayedShots.map(shot => {
          const shotIndex = allShots.indexOf(shot);

          return (
            <div key={`${shot.title}-${shot.microSpot}`} className="rounded-lg border border-gray-200 p-3">
              <InlineEditableField
                isEditing={isEditMode}
                title="Shot title"
                value={shot.title}
                onChange={value => onUpdateShotField(shotIndex, 'title', value)}
                className="w-full rounded border border-gray-300 px-2 py-1 text-sm font-semibold text-gray-900"
                displayClassName="font-semibold text-gray-900"
              />
              <InlineEditableField
                isEditing={isEditMode}
                title="Shot description"
                value={shot.description}
                onChange={value => onUpdateShotField(shotIndex, 'description', value)}
                className="mt-1 min-h-16 w-full rounded border border-gray-300 px-2 py-1 text-sm text-gray-700"
                displayClassName="mt-1 text-sm text-gray-600"
                multiline
              />
              <InlineEditableField
                isEditing={isEditMode}
                title="Shot location"
                value={shot.location}
                onChange={value => onUpdateShotField(shotIndex, 'location', value)}
                className="mt-2 w-full rounded border border-gray-300 px-2 py-1 text-xs text-gray-700"
                displayClassName="mt-2 text-xs text-gray-500"
              />
              {shot.latitude != null && shot.longitude != null && (
                <p className="text-xs text-blue-700">
                  Coordinates: {Number(shot.latitude).toFixed(5)}, {Number(shot.longitude).toFixed(5)}
                </p>
              )}
              <p className="text-xs text-gray-500">Micro-spot: {shot.microSpot}</p>
              <p className="text-xs text-gray-500">Pose: {shot.poseSuggestion}</p>
              <p className="text-xs text-gray-500">Composition: {shot.compositionSuggestion}</p>
              <p className="text-xs text-gray-500">Timing: {shot.timingHint}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
