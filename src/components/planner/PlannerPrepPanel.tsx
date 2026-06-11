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
    <div className="grid gap-5 lg:grid-cols-2">
      <section className="rounded-lg border border-[#d8d2c8] bg-white p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#7c6f64]">Client readiness</p>
        <h4 className="mt-2 text-xl font-semibold text-[#1f2933]">Prep checklist</h4>
        <p className="mt-1 text-sm text-[#5f6b76]">Sendable guidance that helps clients arrive ready and calm.</p>

        <div className="mt-4 space-y-2">
          {checklist.map((item, index) => (
            <div key={`${item}-${index}`} className="flex gap-3 rounded-lg border border-[#e4ded5] bg-[#faf9f6] px-3 py-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-white text-xs font-semibold text-[#1f2933]">
                {index + 1}
              </span>
              {isEditMode ? (
                <input
                  title="Prep checklist item"
                  className="w-full rounded border border-[#d8d2c8] bg-white px-2 py-1 text-sm text-[#1f2933]"
                  value={item}
                  onChange={event => onUpdateChecklistItem(index, event.target.value)}
                />
              ) : (
                <p className="text-sm leading-6 text-[#5f6b76]">{item}</p>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-amber-200 bg-amber-50 p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-800">Plan B</p>
        <h4 className="mt-2 text-xl font-semibold text-amber-950">Contingency plans</h4>
        <p className="mt-1 text-sm text-amber-900">Backup guidance for weather, crowds, time compression, or client pacing.</p>

        <div className="mt-4 space-y-2">
          {contingencyPlans.map((item, index) => (
            <div key={`${item}-${index}`} className="flex gap-3 rounded-lg border border-amber-200 bg-white/75 px-3 py-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-white text-xs font-semibold text-amber-950">
                {index + 1}
              </span>
              {isEditMode ? (
                <input
                  title="Contingency item"
                  className="w-full rounded border border-amber-200 bg-white px-2 py-1 text-sm text-amber-950"
                  value={item}
                  onChange={event => onUpdateContingencyItem(index, event.target.value)}
                />
              ) : (
                <p className="text-sm leading-6 text-amber-950">{item}</p>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
