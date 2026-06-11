import { Button } from '@/components/ui/Button';
import { InlineEditableField } from '@/components/planner/InlineEditableField';

type TimelineItem = {
  timeBlock: string;
  focus: string;
  notes: string;
};

type PlannerTimelinePanelProps = {
  timeline: TimelineItem[];
  isEditMode: boolean;
  isRegenerating: boolean;
  onRegenerate: () => void;
  onUpdateTimelineField: (index: number, field: 'timeBlock' | 'focus' | 'notes', value: string) => void;
};

export function PlannerTimelinePanel({
  timeline,
  isEditMode,
  isRegenerating,
  onRegenerate,
  onUpdateTimelineField,
}: PlannerTimelinePanelProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex-1 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-900">
          {timeline.length} timeline blocks planned
        </div>
        <Button
          onClick={onRegenerate}
          disabled={isRegenerating}
          className="ml-3 whitespace-nowrap rounded-lg border border-purple-300 bg-white px-3 py-2 text-sm font-medium text-purple-700 hover:bg-purple-50"
        >
          {isRegenerating ? '⟳ Regenerating...' : '⟳ Regenerate Timeline'}
        </Button>
      </div>

      {timeline.map((item, index) => (
        <div key={`${item.timeBlock}-${item.focus}`} className="rounded-lg border border-gray-200 p-3">
          <InlineEditableField
            isEditing={isEditMode}
            title="Timeline time block"
            value={item.timeBlock}
            onChange={value => onUpdateTimelineField(index, 'timeBlock', value)}
            className="w-full rounded border border-gray-300 px-2 py-1 text-sm font-semibold text-gray-900"
            displayClassName="text-sm font-semibold text-gray-900"
          />
          <InlineEditableField
            isEditing={isEditMode}
            title="Timeline focus"
            value={item.focus}
            onChange={value => onUpdateTimelineField(index, 'focus', value)}
            className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm text-blue-700"
            displayClassName="text-sm text-blue-700"
          />
          <InlineEditableField
            isEditing={isEditMode}
            title="Timeline notes"
            value={item.notes}
            onChange={value => onUpdateTimelineField(index, 'notes', value)}
            className="mt-1 min-h-14 w-full rounded border border-gray-300 px-2 py-1 text-sm text-gray-700"
            displayClassName="mt-1 text-sm text-gray-600"
            multiline
          />
        </div>
      ))}
    </div>
  );
}
