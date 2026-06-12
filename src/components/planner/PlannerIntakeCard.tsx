'use client';

import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { DraftResumeBanner } from '@/components/planner/DraftResumeBanner';
import { PlannerPresetGrid } from '@/components/planner/PlannerPresetGrid';
import type { PlannerErrorInfo } from '@/lib/planner/plannerErrors';

type LocationMode = 'find-locations' | 'use-provided';
type WorkflowStage = 'intake' | 'review' | 'apply';
type SessionCategory = 'family' | 'engagement' | 'portrait' | 'event';

type IntakeQuestion = {
  id: string;
  required?: boolean;
  options?: string[];
};

type PlannerPreset = {
  id: string;
  label: string;
  description: string;
  shootType: string;
  locationMode: LocationMode;
  duration: string;
  mood: string;
  subjectDetails: string;
  mustHaveShots: string;
  constraints: string;
  familyPacing?: string;
  engagementStory?: string;
  brandingGoals?: string;
  eventPriorities?: string;
};

type PlannerDraftSummary = {
  updatedAt: string;
  planState: {
    shootType: string;
  };
};

type BusinessProfileSummary = {
  baseLocation?: string;
  zipCode?: string;
};

type DraftSaveStatus = 'idle' | 'saving' | 'saved' | 'error';

type PlannerIntakeCardProps = {
  workflowStage: WorkflowStage;
  shootType: string;
  locationMode: LocationMode;
  city: string;
  desiredLocationCount: string;
  businessProfile: BusinessProfileSummary | null;
  isGenerating: boolean;
  hasPlan: boolean;
  isChatComplete: boolean;
  isReviewConfirmed: boolean;
  onGeneratePlan: () => void;
  onEditAnswers: () => void;
  resumableDraft: PlannerDraftSummary | null;
  onDismissDraft: () => void;
  onResumeDraft: () => void;
  presets: PlannerPreset[];
  activePresetId: string | null;
  onApplyPreset: (preset: PlannerPreset) => void;
  chatStepIndex: number;
  visibleQuestions: IntakeQuestion[];
  sessionCategory: SessionCategory;
  getAdaptivePrompt: (question: IntakeQuestion, sessionCategory: SessionCategory) => string;
  getAnswerForQuestion: (questionId: string) => string;
  activeQuestion: IntakeQuestion | null;
  isAiTyping: boolean;
  activePrompt: string;
  activeProfileTemplates: string[];
  activeQuickReplies: string[];
  draftAnswer: string;
  onDraftAnswerChange: (value: string) => void;
  activePlaceholder: string;
  onSubmitAnswerValue: (value: string) => void;
  onSubmitCurrentAnswer: () => void;
  onGoBackQuestion: () => void;
  onJumpToQuestion: (questionId: string) => void;
  onReviewAnswers: () => void;
  durationMinutes: number;
  expectedShotRange: {
    min: number;
    max: number;
  };
  draftSaveStatus: DraftSaveStatus;
  error: PlannerErrorInfo | null;
};

function getDraftStatusLabel(status: DraftSaveStatus) {
  if (status === 'saving') return 'Saving';
  if (status === 'saved') return 'Saved';
  if (status === 'error') return 'Sync issue';
  return 'Idle';
}

function getDraftStatusClass(status: DraftSaveStatus) {
  if (status === 'saving') return 'border-blue-200 bg-blue-50 text-blue-700';
  if (status === 'saved') return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  if (status === 'error') return 'border-red-200 bg-red-50 text-red-700';
  return 'border-[#e4ded5] bg-[#faf9f6] text-[#5f6b76]';
}

export function PlannerIntakeCard({
  workflowStage,
  shootType,
  locationMode,
  city,
  desiredLocationCount,
  businessProfile,
  isGenerating,
  hasPlan,
  isChatComplete,
  isReviewConfirmed,
  onGeneratePlan,
  onEditAnswers,
  resumableDraft,
  onDismissDraft,
  onResumeDraft,
  presets,
  activePresetId,
  onApplyPreset,
  chatStepIndex,
  visibleQuestions,
  sessionCategory,
  getAdaptivePrompt,
  getAnswerForQuestion,
  activeQuestion,
  isAiTyping,
  activePrompt,
  activeProfileTemplates,
  activeQuickReplies,
  draftAnswer,
  onDraftAnswerChange,
  activePlaceholder,
  onSubmitAnswerValue,
  onSubmitCurrentAnswer,
  onGoBackQuestion,
  onJumpToQuestion,
  onReviewAnswers,
  durationMinutes,
  expectedShotRange,
  draftSaveStatus,
  error,
}: PlannerIntakeCardProps) {
  const answeredCount = Math.min(chatStepIndex, visibleQuestions.length);
  const progressPercent = Math.round((answeredCount / Math.max(visibleQuestions.length, 1)) * 100);
  const locationLabel = city || businessProfile?.baseLocation || businessProfile?.zipCode || 'Location pending';

  const renderQuestionSummary = (question: IntakeQuestion, mode: 'editable' | 'locked') => {
    const answer = getAnswerForQuestion(question.id);
    if (!answer && !question.required) return null;

    return (
      <div
        key={`${mode}-${question.id}`}
        className="rounded-lg border border-[#e4ded5] bg-white px-3 py-3"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#7c6f64]">
              {getAdaptivePrompt(question, sessionCategory)}
            </p>
            <p className="mt-1 text-sm leading-5 text-[#1f2933]">{answer || '-'}</p>
          </div>
          {mode === 'editable' && (
            <Button variant="ghost" size="sm" onClick={() => onJumpToQuestion(question.id)}>
              Edit
            </Button>
          )}
        </div>
      </div>
    );
  };

  return (
    <Card className="overflow-hidden border border-[#d8d2c8] p-0 shadow-sm">
      <div className="border-b border-[#e4ded5] bg-white p-5 md:p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#7c6f64]">
              AI planning brief
            </p>
            <h3 className="mt-2 text-2xl font-semibold tracking-normal text-[#1f2933]">
              {workflowStage === 'intake' ? 'Build the session brief' : 'Approved intake summary'}
            </h3>
            <p className="mt-2 text-sm leading-6 text-[#5f6b76]">
              Give the planner the same context you would collect before a professional shoot: people, pacing, location constraints, must-have frames, and client prep needs.
            </p>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 xl:min-w-[420px]">
            {workflowStage !== 'intake' && (
              <Button variant="secondary" onClick={onEditAnswers} className="bg-[#ebe5db] hover:bg-[#ded8ce]">
                Reopen intake
              </Button>
            )}
            <Button
              isLoading={isGenerating}
              onClick={onGeneratePlan}
              disabled={!isChatComplete || !isReviewConfirmed || isGenerating}
              className="bg-[#1f2933] hover:bg-[#111827]"
            >
              {isGenerating ? 'Generating...' : hasPlan ? 'Regenerate plan' : 'Generate full plan'}
            </Button>
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-5">
          <div className="rounded-lg border border-[#e4ded5] bg-[#faf9f6] px-3 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#7c6f64]">Session</p>
            <p className="mt-1 truncate text-sm font-semibold text-[#1f2933]">{shootType}</p>
          </div>
          <div className="rounded-lg border border-[#e4ded5] bg-[#faf9f6] px-3 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#7c6f64]">Location mode</p>
            <p className="mt-1 text-sm font-semibold text-[#1f2933]">
              {locationMode === 'use-provided' ? 'Provided spots' : 'Find locations'}
            </p>
          </div>
          <div className="rounded-lg border border-[#e4ded5] bg-[#faf9f6] px-3 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#7c6f64]">Area</p>
            <p className="mt-1 truncate text-sm font-semibold text-[#1f2933]">{locationLabel}</p>
          </div>
          <div className="rounded-lg border border-[#e4ded5] bg-[#faf9f6] px-3 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#7c6f64]">Final stops</p>
            <p className="mt-1 truncate text-sm font-semibold text-[#1f2933]">{desiredLocationCount}</p>
          </div>
          <div className={`rounded-lg border px-3 py-3 ${getDraftStatusClass(draftSaveStatus)}`}>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] opacity-80">Draft</p>
            <p className="mt-1 text-sm font-semibold">{getDraftStatusLabel(draftSaveStatus)}</p>
          </div>
        </div>
      </div>

      <div className="bg-[#faf9f6] p-4 md:p-5">
        {workflowStage === 'intake' ? (
          <>
            {resumableDraft && (
              <DraftResumeBanner
                updatedAt={resumableDraft.updatedAt}
                shootType={resumableDraft.planState.shootType}
                onDiscard={onDismissDraft}
                onResume={onResumeDraft}
              />
            )}

            <PlannerPresetGrid presets={presets} activePresetId={activePresetId} onApplyPreset={onApplyPreset} />

            <div className="rounded-lg border border-[#d8d2c8] bg-white p-4">
              <div className="mb-3 flex items-center justify-between gap-3 text-xs text-[#5f6b76]">
                <span className="font-semibold">Brief progress</span>
                <span>
                  {answeredCount} of {visibleQuestions.length} answered - {progressPercent}%
                </span>
              </div>

              <progress
                className="mb-5 h-2 w-full overflow-hidden rounded [&::-webkit-progress-bar]:rounded [&::-webkit-progress-bar]:bg-[#ebe5db] [&::-webkit-progress-value]:rounded [&::-webkit-progress-value]:bg-[#1f2933]"
                value={answeredCount}
                max={Math.max(visibleQuestions.length, 1)}
              />

              {visibleQuestions.slice(0, chatStepIndex).map(question => (
                <div key={`answered-${question.id}`} className="mb-4 grid gap-2 md:grid-cols-[0.85fr_1fr]">
                  <div className="rounded-lg border border-[#e4ded5] bg-[#faf9f6] px-3 py-2 text-sm text-[#5f6b76]">
                    {getAdaptivePrompt(question, sessionCategory)}
                  </div>
                  <div className="rounded-lg bg-[#1f2933] px-3 py-2 text-sm text-white">
                    {getAnswerForQuestion(question.id) || '-'}
                  </div>
                </div>
              ))}

              {!isChatComplete && activeQuestion && (
                <div className="space-y-3">
                  {isAiTyping ? (
                    <div className="inline-flex items-center gap-1 rounded-lg border border-[#e4ded5] bg-[#faf9f6] px-3 py-2 text-xs text-[#5f6b76]">
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#8b8178]" />
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#8b8178] [animation-delay:120ms]" />
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#8b8178] [animation-delay:240ms]" />
                      Preparing the next planning question...
                    </div>
                  ) : (
                    <div className="rounded-lg border border-[#d8d2c8] bg-[#f6f3ee] px-4 py-3 text-sm font-semibold text-[#1f2933]">
                      {activePrompt}
                    </div>
                  )}

                  {activeQuestion.options && activeQuestion.options.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {activeQuestion.options.map(option => (
                        <button
                          key={`${activeQuestion.id}-${option}`}
                          type="button"
                          onClick={() => onSubmitAnswerValue(option)}
                          className="min-h-10 rounded-md border border-[#d8d2c8] bg-white px-3 py-2 text-sm font-medium text-[#1f2933] transition hover:border-[#1f2933]"
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div>
                      {activeProfileTemplates.length > 0 && (
                        <div className="mb-3">
                          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#7c6f64]">
                            From your business profile
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {activeProfileTemplates.map(option => (
                              <button
                                key={`${activeQuestion.id}-profile-${option}`}
                                type="button"
                                onClick={() => onSubmitAnswerValue(option)}
                                className="min-h-10 rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-2 text-xs font-medium text-emerald-800 hover:border-emerald-300"
                              >
                                {option}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {activeQuickReplies.length > 0 && (
                        <div className="mb-3 flex flex-wrap gap-2">
                          {activeQuickReplies.map(option => (
                            <button
                              key={`${activeQuestion.id}-quick-${option}`}
                              type="button"
                              onClick={() => onSubmitAnswerValue(option)}
                              className="min-h-10 rounded-md border border-blue-200 bg-blue-50 px-2.5 py-2 text-xs font-medium text-blue-800 hover:border-blue-300"
                            >
                              {option}
                            </button>
                          ))}
                        </div>
                      )}

                      <textarea
                        className="min-h-24 w-full rounded-lg border border-[#d8d2c8] bg-white px-3 py-3 text-sm text-[#1f2933] outline-none transition focus:border-[#1f2933]"
                        value={draftAnswer}
                        onChange={event => onDraftAnswerChange(event.target.value)}
                        placeholder={activePlaceholder}
                        onKeyDown={event => {
                          if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
                            event.preventDefault();
                            onSubmitCurrentAnswer();
                          }
                        }}
                      />
                      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-[11px] text-[#5f6b76]">Press Cmd/Ctrl + Enter to continue quickly.</p>
                        <div className="flex gap-2">
                          <Button variant="secondary" onClick={onGoBackQuestion} disabled={chatStepIndex === 0} className="bg-[#ebe5db] hover:bg-[#ded8ce]">
                            Back
                          </Button>
                          <Button onClick={onSubmitCurrentAnswer} className="bg-[#1f2933] hover:bg-[#111827]">
                            {chatStepIndex === visibleQuestions.length - 1 ? 'Finish intake' : 'Continue'}
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {isChatComplete && (
                <div className="space-y-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="font-semibold">Brief complete. Confirm before generation.</p>
                      <p className="mt-1 text-xs text-emerald-800">
                        The AI planner will use these answers to build locations, timeline, shot list, prep notes, and contingencies.
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button variant="secondary" onClick={onEditAnswers}>Edit answers</Button>
                      <Button onClick={onReviewAnswers} disabled={isReviewConfirmed}>
                        {isReviewConfirmed ? 'Review confirmed' : 'Unlock generate'}
                      </Button>
                    </div>
                  </div>
                  <div className="grid gap-2 md:grid-cols-2">
                    {visibleQuestions.map(question => renderQuestionSummary(question, 'editable'))}
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="space-y-3 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-950">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="font-semibold">Intake is locked for review.</p>
                <p className="mt-1 text-xs text-blue-800">Reopen intake to change the source brief, then regenerate the plan.</p>
              </div>
              <Button variant="secondary" onClick={onEditAnswers}>Reopen intake</Button>
            </div>
            <div className="grid gap-2 md:grid-cols-2">{visibleQuestions.map(question => renderQuestionSummary(question, 'locked'))}</div>
          </div>
        )}
      </div>

      <div className="border-t border-[#e4ded5] bg-white px-5 py-4 text-xs text-[#5f6b76]">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <p>
            Duration target: {durationMinutes} min. Expected shot range: {expectedShotRange.min}-{expectedShotRange.max}.
          </p>
          {!city.trim() && (
            <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-amber-800">
              City is blank. Planner will fall back to your account base location or ZIP if available.
            </p>
          )}
        </div>
      </div>

      <div className="sticky bottom-3 z-10 mx-4 mb-4 md:hidden">
        <div className="rounded-lg border border-[#d8d2c8] bg-white/95 p-3 shadow-lg backdrop-blur">
          <div className="flex flex-col gap-2">
            {workflowStage !== 'intake' && (
              <Button variant="secondary" onClick={onEditAnswers}>
                Reopen intake
              </Button>
            )}
            <Button isLoading={isGenerating} onClick={onGeneratePlan} disabled={!isChatComplete || !isReviewConfirmed || isGenerating}>
              {isGenerating ? 'Generating...' : hasPlan ? 'Regenerate plan' : 'Generate full plan'}
            </Button>
          </div>
        </div>
      </div>

      {error && (
        <div className={`mx-5 mb-5 rounded-lg border px-4 py-3 text-sm ${
          error.isWarning
            ? 'border-amber-200 bg-amber-50 text-amber-800'
            : 'border-red-200 bg-red-50 text-red-700'
        }`}>
          <p className="font-semibold">{error.title}</p>
          <p className="mt-0.5">{error.message}</p>
        </div>
      )}
    </Card>
  );
}
