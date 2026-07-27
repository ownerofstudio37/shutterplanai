type PlannerPrepPanelProps = {
  checklist: string[];
  contingencyPlans: string[];
  photographerPlan?: {
    priorityChecklist?: string[];
    sunWeatherNotes?: string[];
    backupPlan?: string[];
  };
  clientGuide?: {
    arrivalInstructions: string;
    parking: string;
    whatToWearAndBring: string[];
    sessionFlow: string;
    weatherExpectations: string;
    reassurance: string;
    tone: string;
  };
  isEditMode: boolean;
  onUpdateChecklistItem: (index: number, value: string) => void;
  onUpdateContingencyItem: (index: number, value: string) => void;
};

export function PlannerPrepPanel({
  checklist,
  contingencyPlans,
  photographerPlan,
  clientGuide,
  isEditMode,
  onUpdateChecklistItem,
  onUpdateContingencyItem,
}: PlannerPrepPanelProps) {
  const priorityChecklist = photographerPlan?.priorityChecklist ?? [];
  const sunWeatherNotes = photographerPlan?.sunWeatherNotes ?? [];
  const backupPlan = photographerPlan?.backupPlan ?? contingencyPlans;
  const clientBringList = clientGuide?.whatToWearAndBring ?? checklist;

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-[#d8d2c8] bg-white p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#7c6f64]">Split outputs</p>
            <h4 className="mt-2 text-xl font-semibold text-[#1f2933]">Photographer plan + client guide</h4>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-[#5f6b76]">
              Photographer-facing details stay practical and specific. Client-facing copy stays warm, simple, and reassuring.
            </p>
          </div>
          <span className="rounded-full border border-[#e4ded5] bg-[#faf9f6] px-3 py-1 text-xs font-semibold text-[#5f6b76]">
            Tone: {clientGuide?.tone || 'brand-aware'}
          </span>
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <section className="rounded-lg border border-[#d8d2c8] bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#7c6f64]">Photographer plan</p>
          <h4 className="mt-2 text-xl font-semibold text-[#1f2933]">Execution checklist</h4>
          <p className="mt-1 text-sm text-[#5f6b76]">Private notes for smooth coverage, priorities, and backup decisions.</p>

          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            <div className="rounded-lg border border-[#e4ded5] bg-[#faf9f6] p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#7c6f64]">Priority checklist</p>
              <ul className="mt-2 space-y-2 text-sm leading-6 text-[#5f6b76]">
                {(priorityChecklist.length > 0 ? priorityChecklist : checklist.slice(0, 4)).map(item => (
                  <li key={`priority-${item}`} className="rounded-md bg-white px-3 py-2">{item}</li>
                ))}
              </ul>
            </div>
            <div className="rounded-lg border border-[#e4ded5] bg-[#faf9f6] p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#7c6f64]">Sun/weather notes</p>
              <ul className="mt-2 space-y-2 text-sm leading-6 text-[#5f6b76]">
                {(sunWeatherNotes.length > 0 ? sunWeatherNotes : ['Check forecast and light before final client reminder.']).slice(0, 4).map(item => (
                  <li key={`sun-${item}`} className="rounded-md bg-white px-3 py-2">{item}</li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-800">Plan B</p>
            <h4 className="mt-2 text-lg font-semibold text-amber-950">Backup plan</h4>
            <div className="mt-3 space-y-2">
              {backupPlan.map((item, index) => (
                <div key={`${item}-${index}`} className="flex gap-3 rounded-lg border border-amber-200 bg-white/75 px-3 py-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-white text-xs font-semibold text-amber-950">
                    {index + 1}
                  </span>
                  {isEditMode && index < contingencyPlans.length ? (
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
          </div>
        </section>

        <section className="rounded-lg border border-blue-200 bg-blue-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-800">Client guide</p>
          <h4 className="mt-2 text-xl font-semibold text-blue-950">Sendable preview</h4>
          <p className="mt-1 text-sm text-blue-900">Client-facing language for arrival, parking, session flow, weather expectations, and reassurance.</p>

          <div className="mt-4 space-y-3">
            {[
              ['Arrival', clientGuide?.arrivalInstructions || 'Arrival instructions will be confirmed before the session.'],
              ['Parking', clientGuide?.parking || 'Parking details will be confirmed before the session.'],
              ['Session flow', clientGuide?.sessionFlow || 'We will move through the plan calmly and cover the important images first.'],
              ['Weather expectations', clientGuide?.weatherExpectations || 'Weather and light will be monitored before the session.'],
              ['Reassurance', clientGuide?.reassurance || 'The session will be guided, relaxed, and flexible.'],
            ].map(([label, value]) => (
              <div key={label} className="rounded-lg border border-blue-100 bg-white px-3 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-800">{label}</p>
                <p className="mt-1 text-sm leading-6 text-[#1f2933]">{value}</p>
              </div>
            ))}

            <div className="rounded-lg border border-blue-100 bg-white px-3 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-800">What to wear / bring</p>
              <div className="mt-3 space-y-2">
                {clientBringList.map((item, index) => (
                  <div key={`${item}-${index}`} className="flex gap-3 rounded-lg border border-[#e4ded5] bg-[#faf9f6] px-3 py-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-white text-xs font-semibold text-[#1f2933]">
                      {index + 1}
                    </span>
                    {isEditMode && index < checklist.length ? (
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
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
