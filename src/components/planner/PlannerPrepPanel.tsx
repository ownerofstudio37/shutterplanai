type PlannerPrepPanelProps = {
  checklist: string[];
  contingencyPlans: string[];
  isEditMode: boolean;
  onUpdateChecklistItem: (index: number, value: string) => void;
  onUpdateContingencyItem: (index: number, value: string) => void;
};

export function PlannerPrepPanel({
  checklist,
  contingencyPlans,
  isEditMode,
  onUpdateChecklistItem,
  onUpdateContingencyItem,
}: PlannerPrepPanelProps) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div>
        <h4 className="mb-3 text-lg font-semibold text-gray-900">Client Prep Checklist</h4>
        <ul className="list-inside list-disc space-y-1 text-sm text-gray-700">
          {checklist.map((item, index) => (
            <li key={`${item}-${index}`}>
              {isEditMode ? (
                <input
                  title="Prep checklist item"
                  className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
                  value={item}
                  onChange={event => onUpdateChecklistItem(index, event.target.value)}
                />
              ) : (
                item
              )}
            </li>
          ))}
        </ul>
      </div>
      <div>
        <h4 className="mb-3 text-lg font-semibold text-gray-900">Contingency Plans</h4>
        <ul className="list-inside list-disc space-y-1 text-sm text-gray-700">
          {contingencyPlans.map((item, index) => (
            <li key={`${item}-${index}`}>
              {isEditMode ? (
                <input
                  title="Contingency item"
                  className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
                  value={item}
                  onChange={event => onUpdateContingencyItem(index, event.target.value)}
                />
              ) : (
                item
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
