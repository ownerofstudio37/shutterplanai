import { Card } from '@/components/ui/Card';

type WorkflowStageId = 'intake' | 'review' | 'apply';

type WorkflowStage = {
  id: WorkflowStageId;
  label: string;
  description: string;
};

type PlannerWorkflowStagesProps = {
  stages: WorkflowStage[];
  currentStage: WorkflowStageId;
  hasPlan: boolean;
};

export function PlannerWorkflowStages({ stages, currentStage, hasPlan }: PlannerWorkflowStagesProps) {
  return (
    <Card className="border border-[#d8d2c8] shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#7c6f64]">Planning flow</p>
          <h2 className="mt-2 text-xl font-semibold text-[#1f2933]">Location, micro-spots, shot list, guide</h2>
          <p className="mt-1 text-sm text-[#5f6b76]">
            Start with the client brief, choose the shoot location, map the exact working spots, then build the photographer and client outputs.
          </p>
        </div>
        <div className="grid gap-2 sm:grid-cols-3 lg:min-w-[560px]">
          {stages.map((stage, index) => {
            const isActive = currentStage === stage.id;
            const isAvailable = stage.id === 'intake' || (stage.id === 'review' && hasPlan) || (stage.id === 'apply' && hasPlan);

            return (
              <div
                key={stage.id}
                className={`rounded-lg border px-3 py-3 text-sm transition-colors ${
                  isActive
                    ? 'border-[#1f2933] bg-[#1f2933] text-white'
                    : isAvailable
                      ? 'border-[#d8d2c8] bg-white text-[#1f2933]'
                      : 'border-[#e4ded5] bg-[#faf9f6] text-[#8b8178]'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-xs font-semibold ${
                      isActive ? 'bg-white text-[#1f2933]' : 'bg-[#ebe5db] text-[#5f6b76]'
                    }`}
                  >
                    {index + 1}
                  </span>
                  <p className="font-semibold">{stage.label}</p>
                </div>
                <p className={`mt-2 text-xs leading-5 ${isActive ? 'text-[#d1d5db]' : 'text-[#5f6b76]'}`}>
                  {stage.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}
