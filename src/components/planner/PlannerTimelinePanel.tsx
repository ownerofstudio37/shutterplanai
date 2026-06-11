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
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-lg border border-[#d8d2c8] bg-[#faf9f6] px-4 py-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#7c6f64]">Run of show</p>
          <p className="mt-1 text-sm text-[#5f6b76]">
            {timeline.length} timeline block{timeline.length === 1 ? '' : 's'} designed to keep the session moving.
          </p>
        </div>
        <Button
          onClick={onRegenerate}
          disabled={isRegenerating}
          variant="secondary"
          className="bg-white hover:bg-[#ebe5db]"
        >
          {isRegenerating ? 'Regenerating...' : 'Regenerate timeline'}
        </Button>
      </div>

      <div className="space-y-3">
        {timeline.map((item, index) => (
          <article key={`${item.timeBlock}-${item.focus}`} className="grid gap-3 rounded-lg border border-[#d8d2c8] bg-white p-4 md:grid-cols-[160px_1fr]">
            <div className="md:border-r md:border-[#e4ded5] md:pr-4">
              <span className="flex h-8 w-8 items-center justify-center rounded-md bg-[#1f2933] text-xs font-semibold text-white">
                {index + 1}
              </span>
              <InlineEditableField
                isEditing={isEditMode}
                title="Timeline time block"
                value={item.timeBlock}
                onChange={value => onUpdateTimelineField(index, 'timeBlock', value)}
                className="mt-3 w-full rounded border border-[#d8d2c8] px-2 py-1 text-sm font-semibold text-[#1f2933]"
                displayClassName="mt-3 text-sm font-semibold text-[#1f2933]"
              />
            </div>

            <div>
              <InlineEditableField
                isEditing={isEditMode}
                title="Timeline focus"
                value={item.focus}
                onChange={value => onUpdateTimelineField(index, 'focus', value)}
                className="w-full rounded border border-[#d8d2c8] px-2 py-1 text-sm font-semibold text-[#1f2933]"
                displayClassName="text-base font-semibold text-[#1f2933]"
              />
              <InlineEditableField
                isEditing={isEditMode}
                title="Timeline notes"
                value={item.notes}
                onChange={value => onUpdateTimelineField(index, 'notes', value)}
                className="mt-3 min-h-20 w-full rounded border border-[#d8d2c8] px-2 py-2 text-sm text-[#5f6b76]"
                displayClassName="mt-2 text-sm leading-6 text-[#5f6b76]"
                multiline
              />
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
