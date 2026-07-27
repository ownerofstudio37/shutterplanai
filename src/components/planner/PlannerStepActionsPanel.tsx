type PlannerStepStatus = 'ready' | 'current' | 'pending';

type PlannerStepAction = {
  id: string;
  label: string;
  helper: string;
  status: PlannerStepStatus;
  buttonLabel: string;
  disabled?: boolean;
  onClick: () => void;
};

type PlannerStepActionsPanelProps = {
  actions: PlannerStepAction[];
  isGenerating: boolean;
  onGenerateFullPlan: () => void;
};

function getStatusClass(status: PlannerStepStatus) {
  if (status === 'ready') return 'border-emerald-200 bg-emerald-50 text-emerald-900';
  if (status === 'current') return 'border-[#1f2933] bg-[#1f2933] text-white';
  return 'border-[#e4ded5] bg-[#faf9f6] text-[#5f6b76]';
}

function getButtonClass(status: PlannerStepStatus) {
  if (status === 'current') return 'border-white/15 bg-white text-[#111827] hover:bg-[#e6e8ee]';
  return 'border-[#d8d2c8] bg-white text-[#1f2933] hover:border-[#1f2933]';
}

export function PlannerStepActionsPanel({
  actions,
  isGenerating,
  onGenerateFullPlan,
}: PlannerStepActionsPanelProps) {
  return (
    <section className="rounded-lg border border-[#d8d2c8] bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#7c6f64]">Guided planning steps</p>
          <h2 className="mt-2 text-xl font-semibold text-[#1f2933]">Work the plan one decision at a time</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[#5f6b76]">
            Use progressive actions for a smoother workflow. Full generation is still available when you want a fresh end-to-end pass.
          </p>
        </div>
        <button
          type="button"
          onClick={onGenerateFullPlan}
          disabled={isGenerating}
          className="min-h-11 rounded-full border border-[#d8d2c8] bg-[#faf9f6] px-4 text-sm font-semibold text-[#1f2933] transition hover:border-[#1f2933] disabled:opacity-50"
        >
          {isGenerating ? 'Generating...' : 'Generate full plan'}
        </button>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {actions.map((action, index) => (
          <article key={action.id} className={`rounded-lg border p-3 ${getStatusClass(action.status)}`}>
            <div className="flex items-start gap-3">
              <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-xs font-semibold ${
                action.status === 'current' ? 'bg-white/15 text-white' : 'bg-white text-[#1f2933]'
              }`}>
                {index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">{action.label}</p>
                    <p className={`mt-1 text-xs leading-5 ${action.status === 'current' ? 'text-[#d7dce7]' : 'text-[#5f6b76]'}`}>
                      {action.helper}
                    </p>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                    action.status === 'ready'
                      ? 'bg-white text-emerald-800'
                      : action.status === 'current'
                        ? 'bg-white/15 text-white'
                        : 'bg-white text-[#5f6b76]'
                  }`}>
                    {action.status}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={action.onClick}
                  disabled={action.disabled}
                  className={`mt-3 min-h-9 rounded-full border px-3 text-xs font-semibold transition disabled:opacity-50 ${getButtonClass(action.status)}`}
                >
                  {action.buttonLabel}
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
