import {
  CHAT_QUESTIONS,
  type LocationMode,
  type PlannerDraft,
  type PlannerDraftState,
  type WorkflowStage,
  getSessionCategory,
} from './plannerConfig';

export function createPlannerDraftId() {
  return `draft-${globalThis.crypto?.randomUUID?.() || Date.now()}`;
}

export function buildPlannerDraft(input: {
  id: string;
  workflowStage: WorkflowStage;
  state: PlannerDraftState;
}): PlannerDraft {
  const now = new Date().toISOString();

  return {
    id: input.id,
    status: input.workflowStage === 'apply' ? 'applying' : input.workflowStage,
    createdAt: now,
    updatedAt: now,
    planState: {
      ...input.state,
      multiDay: input.state.multiDay || undefined,
      sessionDates: input.state.sessionDates && input.state.sessionDates.length > 0 ? input.state.sessionDates : undefined,
    },
  };
}

export function mapServerPlannerDraft(row: Record<string, unknown>): PlannerDraft | null {
  const id = typeof row.id === 'string' ? row.id : null;
  const planState = (row.plan_state || row.planState) as PlannerDraftState | undefined;
  const status = typeof row.status === 'string' ? row.status : 'intake';
  if (!id || !planState) return null;

  return {
    id,
    status: status === 'applying' || status === 'review' ? status : 'intake',
    planState,
    createdAt: typeof row.created_at === 'string' ? row.created_at : new Date().toISOString(),
    updatedAt: typeof row.updated_at === 'string' ? row.updated_at : new Date().toISOString(),
  };
}

export function getDraftResumeQuestionCount(input: {
  shootType?: string;
  locationMode?: LocationMode;
}) {
  const mode = input.locationMode ?? 'find-locations';
  const category = getSessionCategory(input.shootType || 'Family Session');

  return CHAT_QUESTIONS.filter(question => !question.showWhen || question.showWhen(mode, category)).length;
}
