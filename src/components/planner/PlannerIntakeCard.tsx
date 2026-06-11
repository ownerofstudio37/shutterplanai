'use client';

import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { DraftResumeBanner } from '@/components/planner/DraftResumeBanner';
import { PlannerPresetGrid } from '@/components/planner/PlannerPresetGrid';

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
  error: string | null;
};

export function PlannerIntakeCard({
  workflowStage,
  shootType,
  locationMode,
  city,
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
  const renderQuestionSummary = (question: IntakeQuestion, tone: 'green' | 'blue') => {
    const answer = getAnswerForQuestion(question.id);
    if (!answer && !question.required) return null;

    const accentClass = tone === 'green' ? 'text-green-700' : 'text-blue-700';
    const containerClass = tone === 'green' ? 'border-green-200 bg-white/70' : 'bg-white/80';

    return (
      <div
        key={`${tone}-${question.id}`}
        className={`rounded-lg px-3 py-2 ${containerClass} ${tone === 'green' ? 'border md:flex md:items-start md:justify-between' : ''}`}
      >
        <div>
          <p className={`text-[11px] font-semibold uppercase tracking-wide ${accentClass}`}>
            {getAdaptivePrompt(question, sessionCategory)}
          </p>
          <p className="mt-1 text-sm text-gray-800">{answer || '—'}</p>
        </div>
        {tone === 'green' && (
          <Button variant="ghost" onClick={() => onJumpToQuestion(question.id)}>
            Edit
          </Button>
        )}
      </div>
    );
  };

  return (
    <Card>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold text-gray-900">
            {workflowStage === 'intake' ? 'AI Planning Chat' : 'Intake Summary'}
          </h3>
          <p className="text-sm text-gray-600">
            {workflowStage === 'intake'
              ? 'Answer a quick chat questionnaire, then generate a full plan.'
              : 'Your approved intake answers are summarized here for quick edits before regenerating.'}
          </p>
          <div className="mt-2 flex flex-wrap gap-2 text-xs">
            <span className="rounded-full bg-indigo-50 px-2 py-1 font-medium text-indigo-700">Session: {shootType}</span>
            <span className="rounded-full bg-emerald-50 px-2 py-1 font-medium text-emerald-700">
              Mode: {locationMode === 'use-provided' ? 'Using provided locations' : 'Find locations'}
            </span>
            {locationMode === 'find-locations' && (city || businessProfile?.baseLocation || businessProfile?.zipCode) && (
              <span className="rounded-full bg-gray-100 px-2 py-1 font-medium text-gray-700">
                Area: {city || businessProfile?.baseLocation || businessProfile?.zipCode}
              </span>
            )}
          </div>
        </div>
        <div className="hidden flex-wrap gap-2 md:flex">
          {workflowStage !== 'intake' && (
            <Button variant="secondary" onClick={onEditAnswers}>
              Reopen intake
            </Button>
          )}
          <Button isLoading={isGenerating} onClick={onGeneratePlan} disabled={!isChatComplete || !isReviewConfirmed || isGenerating}>
            {isGenerating ? 'Generating...' : hasPlan ? 'Regenerate Plan' : 'Generate Full Plan'}
          </Button>
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
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

            <div className="mb-3 flex items-center justify-between text-xs text-gray-600">
              <span>
                Step {Math.min(chatStepIndex + 1, visibleQuestions.length)} of {visibleQuestions.length}
              </span>
              <span>
                {Math.round((Math.min(chatStepIndex, visibleQuestions.length) / Math.max(visibleQuestions.length, 1)) * 100)}% complete
              </span>
            </div>

            <progress
              className="mb-4 h-2 w-full overflow-hidden rounded [&::-webkit-progress-bar]:rounded [&::-webkit-progress-bar]:bg-gray-200 [&::-webkit-progress-value]:rounded [&::-webkit-progress-value]:bg-blue-600"
              value={Math.min(chatStepIndex, visibleQuestions.length)}
              max={Math.max(visibleQuestions.length, 1)}
            />

            {visibleQuestions.slice(0, chatStepIndex).map(question => (
              <div key={`answered-${question.id}`} className="mb-4 space-y-2">
                <div className="mr-12 rounded-2xl rounded-bl-md bg-white px-3 py-2 text-sm text-gray-800 shadow-sm">
                  {getAdaptivePrompt(question, sessionCategory)}
                </div>
                <div className="ml-12 rounded-2xl rounded-br-md bg-blue-600 px-3 py-2 text-sm text-white shadow-sm">
                  {getAnswerForQuestion(question.id) || '—'}
                </div>
              </div>
            ))}

            {!isChatComplete && activeQuestion && (
              <div className="space-y-2">
                {isAiTyping && (
                  <div className="mr-12 inline-flex items-center gap-1 rounded-2xl rounded-bl-md bg-white px-3 py-2 text-xs text-gray-500 shadow-sm">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-gray-400" />
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-gray-400 [animation-delay:120ms]" />
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-gray-400 [animation-delay:240ms]" />
                    Planner is preparing the next question...
                  </div>
                )}

                {!isAiTyping && (
                  <div className="mr-12 rounded-2xl rounded-bl-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm">
                    {activePrompt}
                  </div>
                )}

                {activeQuestion.options && activeQuestion.options.length > 0 ? (
                  <div className="ml-12 mt-2 flex flex-wrap gap-2">
                    {activeQuestion.options.map(option => (
                      <button
                        key={`${activeQuestion.id}-${option}`}
                        type="button"
                        onClick={() => onSubmitAnswerValue(option)}
                        className="rounded-full border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:border-blue-400 hover:text-blue-700"
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="ml-12">
                    {activeProfileTemplates.length > 0 && (
                      <div className="mb-2">
                        <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-gray-500">From your business profile</p>
                        <div className="flex flex-wrap gap-2">
                          {activeProfileTemplates.map(option => (
                            <button
                              key={`${activeQuestion.id}-profile-${option}`}
                              type="button"
                              onClick={() => onSubmitAnswerValue(option)}
                              className="rounded-full border border-emerald-200 bg-white px-2.5 py-1 text-xs text-emerald-700 hover:border-emerald-300"
                            >
                              {option}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {activeQuickReplies.length > 0 && (
                      <div className="mb-2 flex flex-wrap gap-2">
                        {activeQuickReplies.map(option => (
                          <button
                            key={`${activeQuestion.id}-quick-${option}`}
                            type="button"
                            onClick={() => onSubmitAnswerValue(option)}
                            className="rounded-full border border-blue-200 bg-white px-2.5 py-1 text-xs text-blue-700 hover:border-blue-300"
                          >
                            {option}
                          </button>
                        ))}
                      </div>
                    )}
                    <div className="sticky bottom-0 rounded-2xl bg-gray-50 pb-1 pt-1">
                      <textarea
                        className="mt-2 min-h-20 w-full rounded-2xl rounded-br-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm"
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
                      <p className="mt-1 text-[11px] text-gray-500">Tip: press Cmd/Ctrl + Enter to continue quickly.</p>
                      <div className="mt-3 flex items-center gap-2">
                        <Button variant="secondary" onClick={onGoBackQuestion} disabled={chatStepIndex === 0}>
                          Back
                        </Button>
                        <Button onClick={onSubmitCurrentAnswer}>
                          {chatStepIndex === visibleQuestions.length - 1 ? 'Finish intake' : 'Continue'}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {isChatComplete && (
              <div className="space-y-3 rounded border border-green-200 bg-green-50 p-3 text-sm text-green-900">
                <p className="font-semibold">Intake complete. Review before generating.</p>
                <div className="space-y-2">{visibleQuestions.map(question => renderQuestionSummary(question, 'green'))}</div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="secondary" onClick={onEditAnswers}>
                    Edit answers
                  </Button>
                  <Button onClick={onReviewAnswers} disabled={isReviewConfirmed}>
                    {isReviewConfirmed ? 'Review confirmed' : 'Looks good — unlock generate'}
                  </Button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="space-y-3 rounded border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
            <p className="font-semibold">Intake is locked for review.</p>
            <div className="grid gap-2 md:grid-cols-2">{visibleQuestions.map(question => renderQuestionSummary(question, 'blue'))}</div>
          </div>
        )}
      </div>

      <p className="mt-2 text-xs text-gray-500">
        Duration target: {durationMinutes} min • Expected shot range: {expectedShotRange.min}-{expectedShotRange.max}
      </p>
      <p className="mt-1 text-xs text-gray-500">
        Draft status:{' '}
        {draftSaveStatus === 'saving' && <span className="text-blue-600">Saving…</span>}
        {draftSaveStatus === 'saved' && <span className="text-emerald-600">Saved</span>}
        {draftSaveStatus === 'error' && <span className="text-red-600">Unable to sync</span>}
        {draftSaveStatus === 'idle' && <span>Idle</span>}
      </p>
      {!city.trim() && (
        <p className="mt-1 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
          City is blank. Planner will fall back to your account base location/ZIP if available.
        </p>
      )}

      <div className="sticky bottom-3 z-10 mt-4 md:hidden">
        <div className="rounded-2xl border border-gray-200 bg-white/95 p-3 shadow-lg backdrop-blur">
          <div className="flex flex-col gap-2">
            {workflowStage !== 'intake' && (
              <Button variant="secondary" onClick={onEditAnswers}>
                Reopen intake
              </Button>
            )}
            <Button isLoading={isGenerating} onClick={onGeneratePlan} disabled={!isChatComplete || !isReviewConfirmed || isGenerating}>
              {isGenerating ? 'Generating...' : hasPlan ? 'Regenerate Plan' : 'Generate Full Plan'}
            </Button>
          </div>
        </div>
      </div>

      {error && <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
    </Card>
  );
}
