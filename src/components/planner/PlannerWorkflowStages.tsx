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
    <Card>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Planner workflow</h2>
          <p className="text-sm text-gray-600">Move from intake to review, then apply the approved plan to your project workspace.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {stages.map(stage => {
            const isActive = currentStage === stage.id;
            const isAvailable = stage.id === 'intake' || (stage.id === 'review' && hasPlan) || (stage.id === 'apply' && hasPlan);

            return (
              <div
                key={stage.id}
                className={`rounded-2xl border px-3 py-2 text-sm ${
                  isActive
                    ? 'border-blue-600 bg-blue-50 text-blue-700'
                    : isAvailable
                      ? 'border-gray-200 bg-white text-gray-700'
                      : 'border-gray-200 bg-gray-50 text-gray-400'
                }`}
              >
                <p className="font-semibold">{stage.label}</p>
                <p className="text-xs">{stage.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}
