'use client';

import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { DraftResumeBanner } from '@/components/planner/DraftResumeBanner';
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
  const locationLabel = city || businessProfile?.baseLocation || businessProfile?.zipCode || 'Location pending';
  const answeredQuestions = visibleQuestions.slice(0, answeredCount);
  const planPreviewSections = [
    {
      label: 'Brief',
      value: shootType,
      status: Boolean(shootType),
      action: 'edit',
      questionId: 'shootType',
    },
    {
      label: 'Location search',
      value: locationMode === 'use-provided' ? 'Building around your chosen location' : locationLabel,
      status: locationMode === 'use-provided' ? Boolean(getAnswerForQuestion('providedLocations')) : Boolean(locationLabel),
      action: 'ask AI',
      questionId: locationMode === 'use-provided' ? 'providedLocations' : 'city',
    },
    {
      label: 'Chosen location',
      value: locationMode === 'use-provided' ? getAnswerForQuestion('providedLocations') || 'Location pending' : 'Pick after AI discovery',
      status: locationMode === 'use-provided' && Boolean(getAnswerForQuestion('providedLocations')),
      action: 'lock',
      questionId: 'locationMode',
    },
    {
      label: 'Micro-spots',
      value: 'Mapped after location selection',
      status: false,
      action: 'map',
      questionId: 'providedLocations',
    },
    {
      label: 'Shot list',
      value: `${expectedShotRange.min}-${expectedShotRange.max} planned frames`,
      status: Boolean(getAnswerForQuestion('mustHaveShots')),
      action: 'regenerate',
      questionId: 'mustHaveShots',
    },
    {
      label: 'Sun/weather',
      value: getAnswerForQuestion('shootDate') || 'Date/time pending',
      status: Boolean(getAnswerForQuestion('shootDate')),
      action: 'optimize',
      questionId: 'shootDate',
    },
    {
      label: 'Client guide',
      value: isChatComplete ? 'Ready after plan generation' : 'Waiting on brief',
      status: isChatComplete,
      action: 'build',
      questionId: 'constraints',
    },
  ];
  const stageActions = [
    { label: 'Find locations', helper: 'Search candidates', questionId: 'city', active: locationMode === 'find-locations' },
    { label: 'Choose location', helper: 'Lock one spot', questionId: 'locationMode', active: locationMode === 'use-provided' },
    { label: 'Map micro-spots', helper: 'Plan inside it', questionId: 'providedLocations', active: locationMode === 'use-provided' },
    { label: 'Generate shot list', helper: 'Match deliverables', questionId: 'mustHaveShots', active: Boolean(getAnswerForQuestion('mustHaveShots')) },
    { label: 'Optimize sun/weather', helper: 'Time the flow', questionId: 'shootDate', active: Boolean(getAnswerForQuestion('shootDate')) },
    { label: 'Build client guide', helper: 'Prep handoff', questionId: 'constraints', active: isChatComplete },
  ];

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

  if (workflowStage === 'intake') {
    return (
      <section className="relative min-h-[calc(100vh-64px)] overflow-hidden bg-[#08090b] px-4 py-8 text-white md:px-8">
        <div className="pointer-events-none absolute inset-x-0 top-[38%] h-[340px] bg-[#102365]/35 blur-3xl" />
        <div className="relative z-10 flex min-h-[calc(100vh-128px)] flex-col">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-sm font-semibold text-[#08090b]">
                S
              </span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8f95a3]">ShutterPlan AI</p>
                <p className="mt-1 text-sm text-[#d7d9df]">Location, micro-spots, shot list, client guide</p>
              </div>
            </div>
            <div className="hidden items-center gap-2 md:flex">
              <span className={`rounded-full border px-3 py-1.5 text-xs font-medium ${getDraftStatusClass(draftSaveStatus)}`}>
                {getDraftStatusLabel(draftSaveStatus)}
              </span>
              <Button
                isLoading={isGenerating}
                onClick={onGeneratePlan}
                disabled={!isChatComplete || !isReviewConfirmed || isGenerating}
                className="rounded-full bg-[#075985] px-5 text-white hover:bg-[#0369a1]"
              >
                {isGenerating ? 'Thinking...' : hasPlan ? 'Regenerate' : 'Create plan'}
              </Button>
            </div>
          </div>

          <div className="mx-auto grid w-full max-w-7xl flex-1 items-center gap-8 py-10 xl:grid-cols-[minmax(0,1fr)_390px]">
            <div className="min-w-0">
            {resumableDraft && (
              <div className="mb-5 w-full max-w-3xl">
                <DraftResumeBanner
                  updatedAt={resumableDraft.updatedAt}
                  shootType={resumableDraft.planState.shootType}
                  onDiscard={onDismissDraft}
                  onResume={onResumeDraft}
                />
              </div>
            )}

            <div className="mb-7 text-center xl:text-left">
              <p className="text-sm font-medium text-[#8f95a3]">
                Step {Math.min(answeredCount + 1, visibleQuestions.length)} of {visibleQuestions.length}
              </p>
              <h1 className="mt-4 text-4xl font-medium tracking-normal text-[#e6e8ee] md:text-6xl">
                {isChatComplete ? 'Ready to build the plan.' : 'What are we planning?'}
              </h1>
              <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-[#aeb4c0] md:text-base xl:mx-0">
                {isChatComplete
                  ? 'Review the brief, unlock generation, and ShutterPlan will assemble locations, micro-spots, sun/weather timing, shot flow, and the client guide.'
                  : activePrompt}
              </p>
            </div>

            <div className="mb-5 max-h-[250px] space-y-3 overflow-y-auto pr-1">
              <div className="flex max-w-[85%] gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-xs font-semibold text-[#08090b]">
                  S
                </div>
                <div className="rounded-3xl rounded-tl-md border border-white/10 bg-white/5 px-4 py-3 text-sm leading-6 text-[#d7dce7]">
                  Tell me the shoot type, client deliverables, location constraints, and style. I will turn it into location candidates, micro-spots, shot flow, sun/weather timing, and a client guide.
                </div>
              </div>
              {answeredQuestions.map(question => {
                const answer = getAnswerForQuestion(question.id);
                if (!answer && !question.required) return null;
                return (
                  <div key={`chat-history-${question.id}`} className="space-y-2">
                    <div className="ml-auto max-w-[82%] rounded-3xl rounded-tr-md bg-[#2563eb] px-4 py-3 text-sm leading-6 text-white">
                      {answer || '-'}
                    </div>
                    <button
                      type="button"
                      onClick={() => onJumpToQuestion(question.id)}
                      className="flex max-w-[86%] gap-3 text-left"
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-xs font-semibold text-[#08090b]">
                        S
                      </div>
                      <div className="rounded-3xl rounded-tl-md border border-white/10 bg-white/5 px-4 py-3 text-sm leading-6 text-[#d7dce7] transition hover:border-white/20">
                        <span className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8f95a3]">
                          Captured
                        </span>
                        {getAdaptivePrompt(question, sessionCategory)}
                      </div>
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="w-full max-w-3xl">
              {!isChatComplete && activeQuestion && (
                <div className="rounded-[28px] border border-white/10 bg-[#1f1f20] p-2 shadow-2xl shadow-[#102365]/35">
                  {activeQuestion.options && activeQuestion.options.length > 0 ? (
                    <div className="flex flex-wrap gap-2 p-2">
                      {activeQuestion.options.map(option => (
                        <button
                          key={`${activeQuestion.id}-${option}`}
                          type="button"
                          onClick={() => onSubmitAnswerValue(option)}
                          className="min-h-11 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-[#e6e8ee] transition hover:border-white/25 hover:bg-white/10"
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-3 px-4 py-3">
                        <button
                          type="button"
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-2xl font-light text-[#d7d9df] hover:bg-white/5"
                          aria-label="Add planning context"
                        >
                          +
                        </button>
                        <textarea
                          className="max-h-40 min-h-12 flex-1 resize-none bg-transparent py-3 text-base text-[#f4f6fb] outline-none placeholder:text-[#9ca3af]"
                          value={draftAnswer}
                          onChange={event => onDraftAnswerChange(event.target.value)}
                          placeholder={activePlaceholder || 'Ask ShutterPlan to plan the shoot...'}
                          onKeyDown={event => {
                            if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
                              event.preventDefault();
                              onSubmitCurrentAnswer();
                            }
                          }}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={onSubmitCurrentAnswer}
                          className="rounded-full bg-white text-[#111827] hover:bg-[#e6e8ee]"
                        >
                          Send
                        </Button>
                      </div>
                      {(activeProfileTemplates.length > 0 || activeQuickReplies.length > 0) && (
                        <div className="flex flex-wrap gap-2 border-t border-white/10 px-4 py-3">
                          {[...activeProfileTemplates, ...activeQuickReplies].map(option => (
                            <button
                              key={`${activeQuestion.id}-assist-${option}`}
                              type="button"
                              onClick={() => onSubmitAnswerValue(option)}
                              className="min-h-9 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-[#c8ced8] hover:border-white/25 hover:text-white"
                            >
                              {option}
                            </button>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {isAiTyping && (
                <div className="mx-auto mt-4 flex w-fit items-center gap-1 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs text-[#aeb4c0]">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#aeb4c0]" />
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#aeb4c0] [animation-delay:120ms]" />
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#aeb4c0] [animation-delay:240ms]" />
                  Thinking through the next question
                </div>
              )}

              {isChatComplete && (
                <div className="rounded-[28px] border border-white/10 bg-[#1f1f20] p-4 shadow-2xl shadow-[#102365]/35">
                  <div className="grid gap-2 md:grid-cols-2">
                    {visibleQuestions.map(question => {
                      const answer = getAnswerForQuestion(question.id);
                      if (!answer && !question.required) return null;
                      return (
                        <button
                          key={`review-${question.id}`}
                          type="button"
                          onClick={() => onJumpToQuestion(question.id)}
                          className="rounded-2xl border border-white/10 bg-white/5 p-3 text-left transition hover:border-white/20"
                        >
                          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8f95a3]">
                            {getAdaptivePrompt(question, sessionCategory)}
                          </p>
                          <p className="mt-2 text-sm leading-5 text-[#eef1f7]">{answer || '-'}</p>
                        </button>
                      );
                    })}
                  </div>
                  <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <Button variant="ghost" onClick={onEditAnswers} className="rounded-full border border-white/10 text-white hover:bg-white/5">
                      Edit brief
                    </Button>
                    <div className="flex gap-2">
                      <Button onClick={onReviewAnswers} disabled={isReviewConfirmed} className="rounded-full bg-white text-[#111827] hover:bg-[#e6e8ee]">
                        {isReviewConfirmed ? 'Unlocked' : 'Unlock plan'}
                      </Button>
                      <Button isLoading={isGenerating} onClick={onGeneratePlan} disabled={!isReviewConfirmed || isGenerating} className="rounded-full bg-[#075985] text-white hover:bg-[#0369a1]">
                        {isGenerating ? 'Thinking...' : 'Create plan'}
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-7 flex flex-wrap gap-2">
              {stageActions.map(action => (
                <button
                  key={action.label}
                  type="button"
                  onClick={() => onJumpToQuestion(action.questionId)}
                  className={`min-h-10 rounded-full border px-3 py-2 text-left transition ${
                    action.active
                      ? 'border-white/25 bg-white text-[#111827]'
                      : 'border-white/10 bg-white/5 text-[#c8ced8] hover:border-white/25 hover:text-white'
                  }`}
                >
                  <span className="block text-xs font-semibold">{action.label}</span>
                  <span className={`block text-[10px] ${action.active ? 'text-[#475569]' : 'text-[#8f95a3]'}`}>{action.helper}</span>
                </button>
              ))}
            </div>

            <div className="mt-7 grid w-full max-w-4xl gap-3 md:grid-cols-4">
              {[
                ['Brief', shootType],
                ['Location', locationMode === 'use-provided' ? 'Chosen location' : locationLabel],
                ['Route', desiredLocationCount],
                ['Coverage', `${expectedShotRange.min}-${expectedShotRange.max} shots`],
              ].map(([label, value]) => (
                <div key={label} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8f95a3]">{label}</p>
                  <p className="mt-2 truncate text-sm font-medium text-[#eef1f7]">{value}</p>
                </div>
              ))}
            </div>

            <div className="mt-5 flex w-full max-w-4xl flex-wrap justify-center gap-2">
              {presets.slice(0, 4).map(preset => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => onApplyPreset(preset)}
                  className={`min-h-10 rounded-full border px-4 py-2 text-xs font-medium transition ${
                    activePresetId === preset.id
                      ? 'border-white/30 bg-white text-[#111827]'
                      : 'border-white/10 bg-white/5 text-[#c8ced8] hover:border-white/25 hover:text-white'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
            </div>

            <aside className="rounded-[28px] border border-white/10 bg-[#111216]/85 p-4 shadow-2xl shadow-black/30 backdrop-blur">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8f95a3]">Live plan preview</p>
                  <h2 className="mt-2 text-xl font-medium text-[#eef1f7]">One structured plan</h2>
                </div>
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-[#c8ced8]">
                  {Math.round((answeredCount / Math.max(visibleQuestions.length, 1)) * 100)}%
                </span>
              </div>
              <div className="mt-5 space-y-2">
                {planPreviewSections.map(section => (
                  <button
                    key={section.label}
                    type="button"
                    onClick={() => onJumpToQuestion(section.questionId)}
                    className="w-full rounded-2xl border border-white/10 bg-white/5 p-3 text-left transition hover:border-white/20 hover:bg-white/10"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8f95a3]">{section.label}</p>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        section.status ? 'bg-emerald-400/15 text-emerald-200' : 'bg-white/10 text-[#aeb4c0]'
                      }`}>
                        {section.status ? 'ready' : section.action}
                      </span>
                    </div>
                    <p className="mt-2 line-clamp-2 text-sm leading-5 text-[#eef1f7]">{section.value}</p>
                  </button>
                ))}
              </div>
            </aside>
          </div>

          <div className="flex items-center justify-between gap-3 text-xs text-[#777f8d]">
            <button
              type="button"
              onClick={onGoBackQuestion}
              disabled={chatStepIndex === 0}
              className="min-h-10 rounded-full border border-white/10 px-4 font-medium text-[#aeb4c0] disabled:opacity-30"
            >
              Back
            </button>
            <p>Duration target: {durationMinutes} min</p>
          </div>
        </div>

        {error && (
          <div className={`absolute inset-x-4 bottom-5 z-20 mx-auto max-w-3xl rounded-2xl border px-4 py-3 text-sm ${
            error.isWarning
              ? 'border-amber-300/30 bg-amber-400/10 text-amber-100'
              : 'border-red-300/30 bg-red-400/10 text-red-100'
          }`}>
            <p className="font-semibold">{error.title}</p>
            <p className="mt-0.5">{error.message}</p>
          </div>
        )}
      </section>
    );
  }

  return (
    <Card className="overflow-hidden border border-[#d8d2c8] p-0 shadow-sm">
      <div className="border-b border-[#e4ded5] bg-white p-5 md:p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#7c6f64]">
              AI planning brief
            </p>
            <h3 className="mt-2 text-2xl font-semibold tracking-normal text-[#1f2933]">Approved intake summary</h3>
            <p className="mt-2 text-sm leading-6 text-[#5f6b76]">
              Give the planner the same context you would collect before a professional shoot: people, pacing, location constraints, must-have frames, and client prep needs.
            </p>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 xl:min-w-[420px]">
            <Button variant="secondary" onClick={onEditAnswers} className="bg-[#ebe5db] hover:bg-[#ded8ce]">
              Reopen intake
            </Button>
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
            <Button variant="secondary" onClick={onEditAnswers}>
              Reopen intake
            </Button>
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
