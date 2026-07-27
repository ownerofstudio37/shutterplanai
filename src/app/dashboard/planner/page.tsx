'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { PlannerWorkflowStages } from '@/components/planner/PlannerWorkflowStages';
import { PlannerIntakeCard } from '@/components/planner/PlannerIntakeCard';
import { PlannerAssistantHero } from '@/components/planner/PlannerAssistantHero';
import { PlannerManualBuilder } from '@/components/planner/PlannerManualBuilder';
import { PlannerReviewHeaderCard } from '@/components/planner/PlannerReviewHeaderCard';
import { PlannerLocationDecisionPanel } from '@/components/planner/PlannerLocationDecisionPanel';
import { PlannerReviewTabs } from '@/components/planner/PlannerReviewTabs';
import { PlannerMobileReviewContent } from '@/components/planner/PlannerMobileReviewContent';
import { PlannerGeneratingSkeleton } from '@/components/planner/PlannerGeneratingSkeleton';
import { PlannerDesktopReviewContent } from '@/components/planner/PlannerDesktopReviewContent';
import { tokenUtils } from '@/lib/auth';
import { SessionTemplatePanel, type SessionTemplatePayload } from '@/components/planner/SessionTemplatePanel';
import { MultiDaySessionConfig } from '@/components/planner/MultiDaySessionConfig';
import { RefinementIncentiveBanner } from '@/components/planner/RefinementIncentiveBanner';
import { ProgressBar } from '@/components/ui/ProgressBar';
import {
  hasReachedLimit,
  type BillingUsageSummary,
} from '@/lib/billing/planLimits';
import {
  type SessionPlan,
  type SessionPlanLocation,
  type SessionPlanTimelineItem,
  type SessionPlanShot,
  type LocationMode,
  type ChatQuestion,
  type ChatQuestionId,
  type BusinessProfile,
  type PlannerPreset,
  type PlannerDraft,
  type PlannerIntelligence,
  type WorkflowStage,
  CHAT_QUESTIONS,
  PLANNER_PRESETS,
  PLANNER_DRAFT_STORAGE_KEY,
  getSessionCategory,
  getAdaptivePrompt,
  getAdaptivePlaceholder,
  getQuickReplyOptions,
  getBusinessProfileTemplates,
} from '@/lib/planner/plannerConfig';
import { sleep, sanitizeCoordinates, parseDurationMinutes, getExpectedShotRange } from '@/lib/planner/plannerUtils';
import { classifyPlannerError, type PlannerErrorInfo } from '@/lib/planner/plannerErrors';
import { usePlannerReviewState } from '@/hooks/planner/usePlannerReviewState';
import {
  buildPlannerDraft,
  createPlannerDraftId,
  getDraftResumeQuestionCount,
  mapServerPlannerDraft,
} from '@/lib/planner/plannerDrafts';

function getAuthHeader() {
  const token = tokenUtils.getToken();
  const headers: Record<string, string> = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

function escapeCalendarText(value: string) {
  return value.replace(/\\/g, '\\\\').replace(/,/g, '\\,').replace(/;/g, '\\;').replace(/\r?\n/g, '\\n');
}

function formatCalendarDate(value: Date) {
  return value.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

function parseDurationHours(value: string) {
  const minutes = parseDurationMinutes(value);
  return minutes > 0 ? minutes / 60 : 1;
}

function slugifyFileName(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 60) || 'shoot-plan';
}

function parseDesiredLocationCount(value: string, fallback: number) {
  const match = value.match(/\d+/);
  if (!match) return fallback;
  const parsed = Number(match[0]);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.min(4, parsed);
}

const PlannerLocationMap = dynamic(() => import('@/components/map/PlannerLocationMap'), {
  ssr: false,
  loading: () => (
    <div className="flex h-90 items-center justify-center rounded-xl border border-gray-200 bg-gray-100 text-sm text-gray-600">
      Loading map review...
    </div>
  ),
});

type GuideActivitySummary = {
  guideViews: number;
  guideEngagements: number;
  guideApprovals: number;
  guideChangeRequests: number;
  guideComments: number;
};

type GuideActivityResponse = {
  success?: boolean;
  data?: GuideActivitySummary;
};

type PlannerBrainChatMessage = {
  role: 'user' | 'assistant';
  content: string;
  changedSections?: string[];
  source?: 'ai' | 'fallback';
};

type PlannerPlanVersion = {
  id: string;
  label: string;
  message: string;
  previousPlan: SessionPlan;
  nextPlan: SessionPlan;
  changedSections: string[];
  createdAt: string;
};

const INITIAL_PLANNER_BRAIN_MESSAGE: PlannerBrainChatMessage = {
  role: 'assistant',
  content: 'I can keep refining this plan. Try "make this easier for toddlers," "use only one spot," "add editorial poses," or "make the client guide warmer."',
};

export default function PlannerPage() {
  const router = useRouter();

  const [plannerEntryMode, setPlannerEntryMode] = useState<'chat' | 'manual'>('chat');
  const [shootType, setShootType] = useState('Family Session');
  const [subjectDetails, setSubjectDetails] = useState('5 people, 2 toddlers');
  const [city, setCity] = useState('Dallas, TX');
  const [shootDate, setShootDate] = useState('');
  const [duration, setDuration] = useState('90 minutes');
  const [mood, setMood] = useState('Warm, candid, emotional');
  const [mustHaveShots, setMustHaveShots] = useState('Whole family portrait, parents together, each kid solo');
  const [constraints, setConstraints] = useState('Need stroller-friendly paths and quick transitions');
  const [locationMode, setLocationMode] = useState<LocationMode>('find-locations');
  const [providedLocations, setProvidedLocations] = useState('');
  const [desiredLocationCount, setDesiredLocationCount] = useState('1 location');
  const [familyPacing, setFamilyPacing] = useState('');
  const [engagementStory, setEngagementStory] = useState('');
  const [brandingGoals, setBrandingGoals] = useState('');
  const [eventPriorities, setEventPriorities] = useState('');
  const [chatStepIndex, setChatStepIndex] = useState(0);
  const [draftAnswer, setDraftAnswer] = useState('');
  const [isReviewConfirmed, setIsReviewConfirmed] = useState(false);
  const [businessProfile, setBusinessProfile] = useState<BusinessProfile | null>(null);
  const [billingUsage, setBillingUsage] = useState<BillingUsageSummary | null>(null);
  const [isAiTyping, setIsAiTyping] = useState(false);
  const [activePresetId, setActivePresetId] = useState<string | null>(null);

  const [plan, setPlan] = useState<SessionPlan | null>(null);
  const [error, setRawError] = useState<PlannerErrorInfo | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [plannerBrainInput, setPlannerBrainInput] = useState('');
  const [plannerBrainMessages, setPlannerBrainMessages] = useState<PlannerBrainChatMessage[]>([INITIAL_PLANNER_BRAIN_MESSAGE]);
  const [isPlannerBrainUpdating, setIsPlannerBrainUpdating] = useState(false);
  const [lastPlannerBrainChanges, setLastPlannerBrainChanges] = useState<string[]>([]);
  const [plannerPlanVersions, setPlannerPlanVersions] = useState<PlannerPlanVersion[]>([]);

  // Helper: classify raw error string before storing
  const setError = (raw: string | null) => setRawError(raw ? classifyPlannerError(raw) : null);
  const [isRefining, setIsRefining] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [applyProgress, setApplyProgress] = useState<{ done: number; total: number; label: string } | null>(null);
  const [feedbackSaveStatus, setFeedbackSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [isRegenerating, setIsRegenerating] = useState<'idle' | 'locations' | 'shot-list' | 'timeline'>('idle');
  const [draftId, setDraftId] = useState<string>(() => createPlannerDraftId());
  const [draftSaveStatus, setDraftSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [draftBootstrapComplete, setDraftBootstrapComplete] = useState(false);
  const [resumableDraft, setResumableDraft] = useState<PlannerDraft | null>(null);
  const [intelligence, setIntelligence] = useState<PlannerIntelligence | null>(null);
  const [isLoadingIntelligence, setIsLoadingIntelligence] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isCreatingShareLink, setIsCreatingShareLink] = useState(false);
  const [isRevokingShareLink, setIsRevokingShareLink] = useState(false);
  const [isRouteConfirmed, setIsRouteConfirmed] = useState(false);
  const [shareUrl, setShareUrl] = useState<string>('');
  const [shareToken, setShareToken] = useState<string>('');
  const [shareLinkError, setShareLinkError] = useState<string>('');
  const [guideActivity, setGuideActivity] = useState<GuideActivitySummary | null>(null);

  // V2: multi-day state
  const [multiDay, setMultiDay] = useState(false);
  const [sessionDates, setSessionDates] = useState<string[]>([]);
  const [dailyDurationMinutes, setDailyDurationMinutes] = useState<number | undefined>(undefined);
  const [maxTravelMinutesPerDay, setMaxTravelMinutesPerDay] = useState<number | undefined>(undefined);
  const {
    activeReviewTab,
    setActiveReviewTab,
    activeMobileReviewTab,
    locationVotes,
    preferredVenueBucket,
    excludedVenueBuckets,
    selectedReviewLocation,
    effectiveSelectedReviewLocationName,
    setSelectedReviewLocationName,
    resetReviewState,
    locationIndex,
    refinementIndex,
    logisticsLookup,
    candidateLocations,
    selectedLocationKeys,
    setSelectedLocationKeys,
    selectedLocations,
    displayedLocations,
    displayedShots,
    emptyLocationMessage,
    emptyShotMessage,
    setLocationVote,
    choosePrimaryLocation,
    togglePreferredVenueBucket,
    toggleExcludedVenueBucket,
    toggleSelectedLocation,
    clearSelectedLocations,
    toggleMobileReviewTab,
    reviewTabItems,
  } = usePlannerReviewState(plan, intelligence);

  const durationMinutes = useMemo(() => parseDurationMinutes(duration), [duration]);
  const expectedShotRange = useMemo(() => getExpectedShotRange(durationMinutes), [durationMinutes]);
  const durationBasedLocationCount = durationMinutes <= 45 ? 1 : durationMinutes <= 90 ? 2 : 3;
  const recommendedLocationCount = parseDesiredLocationCount(desiredLocationCount, durationBasedLocationCount);
  const sessionCategory = useMemo(() => getSessionCategory(shootType), [shootType]);
  const isFreeTier = billingUsage?.tier !== 'pro';
  const hasReachedPlannerLimit = billingUsage
    ? hasReachedLimit(billingUsage.usage.plannerGenerations, billingUsage.limits.plannerGenerations)
    : false;
  const hasReachedShareLimit = billingUsage
    ? hasReachedLimit(billingUsage.usage.shareLinks, billingUsage.limits.shareLinks)
    : false;

  const visibleQuestions = useMemo(
    () => CHAT_QUESTIONS.filter(question => !question.showWhen || question.showWhen(locationMode, sessionCategory)),
    [locationMode, sessionCategory]
  );
  const structuredPlanPreview = useMemo(() => {
    if (!plan) return [];
    const primaryLocation = selectedLocations[0] || plan.locationSuggestions[0];
    const microSpotCount = primaryLocation?.microLocationPlan?.length || primaryLocation?.microLocations?.length || 0;
    const sunWeatherNote = plan.photographerPlan?.sunWeatherNotes?.[0] || intelligence?.weather?.recommendations?.[0] || 'Sun/weather optimization pending';

    return [
      {
        label: 'Brief',
        value: plan.creativeDirection,
        action: 'edit',
        tab: 'timeline' as const,
      },
      {
        label: 'Chosen location',
        value: primaryLocation?.name || 'Choose one primary location',
        action: isRouteConfirmed ? 'locked' : 'lock',
        tab: 'locations' as const,
      },
      {
        label: 'Micro-spots',
        value: `${microSpotCount} mapped inside ${primaryLocation?.name || 'location'}`,
        action: 'map',
        tab: 'locations' as const,
      },
      {
        label: 'Shot list',
        value: `${plan.shotList.length} shots matched to locations, poses, timing, and backups`,
        action: 'regenerate',
        tab: 'shot-list' as const,
      },
      {
        label: 'Sun/weather',
        value: sunWeatherNote,
        action: 'optimize',
        tab: 'timeline' as const,
      },
      {
        label: 'Client guide',
        value: plan.clientGuide?.reassurance || plan.clientPrepChecklist[0] || 'Client handoff pending',
        action: 'ask AI',
        tab: 'prep' as const,
      },
    ];
  }, [intelligence, isRouteConfirmed, plan, selectedLocations]);

  const boundedChatStepIndex = Math.min(chatStepIndex, visibleQuestions.length);
  const aiTypingTimerRef = useRef<number | null>(null);

  const getAnswerForQuestion = useCallback((id: ChatQuestionId) => {
    switch (id) {
      case 'shootType':
        return shootType;
      case 'locationMode':
        return locationMode === 'find-locations' ? 'Find locations for me' : 'I already have locations';
      case 'providedLocations':
        return providedLocations;
      case 'city':
        return city;
      case 'desiredLocationCount':
        return desiredLocationCount;
      case 'subjectDetails':
        return subjectDetails;
      case 'familyPacing':
        return familyPacing;
      case 'engagementStory':
        return engagementStory;
      case 'brandingGoals':
        return brandingGoals;
      case 'eventPriorities':
        return eventPriorities;
      case 'shootDate':
        return shootDate;
      case 'duration':
        return duration;
      case 'mood':
        return mood;
      case 'mustHaveShots':
        return mustHaveShots;
      case 'constraints':
        return constraints;
      default:
        return '';
    }
  }, [
    brandingGoals,
    city,
    constraints,
    desiredLocationCount,
    duration,
    engagementStory,
    eventPriorities,
    familyPacing,
    locationMode,
    mood,
    mustHaveShots,
    providedLocations,
    shootDate,
    shootType,
    subjectDetails,
  ]);

  const showAiTypingForNextQuestion = useCallback((hasNextQuestion: boolean) => {
    if (aiTypingTimerRef.current) {
      window.clearTimeout(aiTypingTimerRef.current);
      aiTypingTimerRef.current = null;
    }

    if (!hasNextQuestion) {
      setIsAiTyping(false);
      return;
    }

    setIsAiTyping(true);
    aiTypingTimerRef.current = window.setTimeout(() => {
      setIsAiTyping(false);
      aiTypingTimerRef.current = null;
    }, 450);
  }, []);

  const moveToQuestionIndex = useCallback(
    (nextIndex: number) => {
      const clampedIndex = Math.max(0, Math.min(nextIndex, visibleQuestions.length));
      const nextQuestion = visibleQuestions[clampedIndex] ?? null;
      setChatStepIndex(clampedIndex);
      setDraftAnswer(nextQuestion ? getAnswerForQuestion(nextQuestion.id) : '');
      showAiTypingForNextQuestion(Boolean(nextQuestion && clampedIndex < visibleQuestions.length));
    },
    [getAnswerForQuestion, showAiTypingForNextQuestion, visibleQuestions]
  );

  const setAnswerForQuestion = (id: ChatQuestionId, value: string) => {
    setIsReviewConfirmed(false);
    setActivePresetId(null);

    switch (id) {
      case 'shootType':
        setShootType(value);
        break;
      case 'locationMode':
        setLocationMode(value === 'I already have locations' ? 'use-provided' : 'find-locations');
        break;
      case 'providedLocations':
        setProvidedLocations(value);
        break;
      case 'city':
        setCity(value);
        break;
      case 'desiredLocationCount':
        setDesiredLocationCount(value);
        break;
      case 'subjectDetails':
        setSubjectDetails(value);
        break;
      case 'familyPacing':
        setFamilyPacing(value);
        break;
      case 'engagementStory':
        setEngagementStory(value);
        break;
      case 'brandingGoals':
        setBrandingGoals(value);
        break;
      case 'eventPriorities':
        setEventPriorities(value);
        break;
      case 'shootDate':
        setShootDate(value);
        break;
      case 'duration':
        setDuration(value);
        break;
      case 'mood':
        setMood(value);
        break;
      case 'mustHaveShots':
        setMustHaveShots(value);
        break;
      case 'constraints':
        setConstraints(value);
        break;
      default:
        break;
    }
  };

  const activeQuestion = visibleQuestions[boundedChatStepIndex] ?? null;
  const activePrompt = activeQuestion ? getAdaptivePrompt(activeQuestion, sessionCategory) : '';
  const activePlaceholder = activeQuestion ? getAdaptivePlaceholder(activeQuestion, sessionCategory) : '';
  const activeQuickReplies = activeQuestion ? getQuickReplyOptions(activeQuestion, sessionCategory) : [];
  const activeProfileTemplates = activeQuestion
    ? getBusinessProfileTemplates(activeQuestion, sessionCategory, businessProfile)
    : [];
  const isChatComplete = boundedChatStepIndex >= visibleQuestions.length;
  const workflowStage: WorkflowStage = plan ? (isApplying ? 'apply' : 'review') : 'intake';
  const isImmersiveChat = workflowStage === 'intake' && plannerEntryMode === 'chat';

  const buildCurrentDraft = useCallback((currentDraftId: string): PlannerDraft => buildPlannerDraft({
    id: currentDraftId,
    workflowStage,
    state: {
      shootType,
      city,
      duration,
      mood,
      subjectDetails,
      mustHaveShots,
      constraints,
      locationMode,
      providedLocations,
      desiredLocationCount,
      familyPacing,
      engagementStory,
      brandingGoals,
      eventPriorities,
      shootDate,
      // V2: multi-day fields
      multiDay: multiDay || undefined,
      sessionDates: sessionDates.length > 0 ? sessionDates : undefined,
      dailyDurationMinutes,
      maxTravelMinutesPerDay,
    },
    workspaceState: {
      plan,
      plannerBrainMessages,
      plannerPlanVersions,
      lastPlannerBrainChanges,
      isRouteConfirmed,
      selectedLocationKeys,
    },
  }), [
    brandingGoals,
    city,
    constraints,
    desiredLocationCount,
    dailyDurationMinutes,
    duration,
    engagementStory,
    eventPriorities,
    familyPacing,
    isRouteConfirmed,
    lastPlannerBrainChanges,
    locationMode,
    maxTravelMinutesPerDay,
    mood,
    mustHaveShots,
    plan,
    plannerBrainMessages,
    plannerPlanVersions,
    providedLocations,
    selectedLocationKeys,
    sessionDates,
    shootDate,
    shootType,
    subjectDetails,
    multiDay,
    workflowStage,
  ]);

  const hydrateFromDraft = (draft: PlannerDraft) => {
    const draftState = draft.planState;
    const mode = draftState.locationMode ?? 'find-locations';
    const resumeQuestionCount = getDraftResumeQuestionCount({
      shootType: draftState.shootType,
      locationMode: mode,
    });

    setDraftId(draft.id);
    setShootType(draftState.shootType || 'Family Session');
    setCity(draftState.city || 'Dallas, TX');
    setDuration(draftState.duration || '90 minutes');
    setMood(draftState.mood || 'Warm, candid, emotional');
    setSubjectDetails(draftState.subjectDetails || '5 people, 2 toddlers');
    setMustHaveShots(draftState.mustHaveShots || 'Whole family portrait, parents together, each kid solo');
    setConstraints(draftState.constraints || 'Need stroller-friendly paths and quick transitions');
    setLocationMode(mode);
    setProvidedLocations(draftState.providedLocations || '');
    setDesiredLocationCount(draftState.desiredLocationCount || '1 location');
    setFamilyPacing(draftState.familyPacing || '');
    setEngagementStory(draftState.engagementStory || '');
    setBrandingGoals(draftState.brandingGoals || '');
    setEventPriorities(draftState.eventPriorities || '');
    setShootDate(draftState.shootDate || '');
    // V2: multi-day fields
    setMultiDay(draftState.multiDay ?? false);
    setSessionDates(draftState.sessionDates ?? []);
    setDailyDurationMinutes(draftState.dailyDurationMinutes);
    setMaxTravelMinutesPerDay(draftState.maxTravelMinutesPerDay);
    setPlan(draft.workspaceState?.plan ?? null);
    setPlannerBrainMessages(
      draft.workspaceState?.plannerBrainMessages && draft.workspaceState.plannerBrainMessages.length > 0
        ? draft.workspaceState.plannerBrainMessages
        : [INITIAL_PLANNER_BRAIN_MESSAGE]
    );
    setPlannerPlanVersions(draft.workspaceState?.plannerPlanVersions ?? []);
    setLastPlannerBrainChanges(draft.workspaceState?.lastPlannerBrainChanges ?? []);
    setIsRouteConfirmed(draft.workspaceState?.isRouteConfirmed ?? false);
    setSelectedLocationKeys(draft.workspaceState?.selectedLocationKeys ?? []);
    setError(null);
    setIsReviewConfirmed(true);
    setChatStepIndex(resumeQuestionCount);
    setResumableDraft(null);
  };

  const clearDraftStorage = async (clearId?: string) => {
    localStorage.removeItem(PLANNER_DRAFT_STORAGE_KEY);
    const targetDraftId = clearId || draftId;
    if (!targetDraftId) return;

    try {
      await fetch(`/api/planner/drafts?id=${encodeURIComponent(targetDraftId)}`, {
        method: 'DELETE',
        headers: {
          ...getAuthHeader(),
        },
      });
    } catch {
      // ignore draft cleanup failures
    }
  };

  const trackPlannerEvent = async (eventName: string, payload: Record<string, unknown> = {}) => {
    try {
      await fetch('/api/planner/analytics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
        body: JSON.stringify({ eventName, payload }),
      });
    } catch {
      // analytics is best-effort
    }
  };

  const loadBillingUsage = useCallback(async () => {
    try {
      const response = await fetch('/api/account/usage', {
        headers: {
          ...getAuthHeader(),
        },
      });
      const result = (await response.json()) as { success?: boolean; data?: BillingUsageSummary };
      if (response.ok && result.success && result.data) {
        setBillingUsage(result.data);
      }
    } catch {
      // Billing usage should not block planning UI.
    }
  }, []);

  const loadGuideActivity = useCallback(async () => {
    try {
      const response = await fetch('/api/planner/analytics', {
        headers: {
          ...getAuthHeader(),
        },
      });
      const result = (await response.json()) as GuideActivityResponse;
      if (response.ok && result.success && result.data) {
        setGuideActivity(result.data);
      }
    } catch {
      // Guide activity should not block planning UI.
    }
  }, []);

  useEffect(() => {
    return () => {
      if (aiTypingTimerRef.current) {
        window.clearTimeout(aiTypingTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const loadBusinessProfile = async () => {
      try {
        const response = await fetch('/api/account/business-profile', {
          headers: {
            ...getAuthHeader(),
          },
        });

        const result = await response.json();
        if (!result.success) return;
        setBusinessProfile((result.data ?? null) as BusinessProfile | null);
      } catch {
        // ignore profile preload failures in planner
      }
    };

    queueMicrotask(() => {
      void loadBusinessProfile();
      void loadBillingUsage();
      void loadGuideActivity();
    });
  }, [loadBillingUsage, loadGuideActivity]);

  useEffect(() => {
    const readStoredDraft = () => {
      try {
        const raw = localStorage.getItem(PLANNER_DRAFT_STORAGE_KEY);
        if (!raw) return null;
        return JSON.parse(raw) as PlannerDraft;
      } catch {
        return null;
      }
    };

    const bootstrapDraft = async () => {
      const localDraft = readStoredDraft();
      if (localDraft) {
        setResumableDraft(localDraft);
        setDraftId(localDraft.id);
      }

      try {
        const response = await fetch('/api/planner/drafts', {
          headers: {
            ...getAuthHeader(),
          },
        });

        const result = (await response.json()) as {
          success?: boolean;
          data?: Array<Record<string, unknown>>;
        };

        if (response.ok && result.success && Array.isArray(result.data) && result.data.length > 0 && !localDraft) {
          const serverDraft = mapServerPlannerDraft(result.data[0]);
          if (serverDraft) {
            setResumableDraft(serverDraft);
            setDraftId(serverDraft.id);
          }
        }
      } catch {
        // ignore bootstrap failures
      } finally {
        setDraftBootstrapComplete(true);
      }
    };

    void bootstrapDraft();
  }, []);

  useEffect(() => {
    if (!draftBootstrapComplete) return;

    const draftPayload = buildCurrentDraft(draftId);
    const normalizedDraftPayload: PlannerDraft = {
      ...draftPayload,
      status: workflowStage === 'apply' ? 'applying' : workflowStage,
      updatedAt: new Date().toISOString(),
    };

    localStorage.setItem(PLANNER_DRAFT_STORAGE_KEY, JSON.stringify(normalizedDraftPayload));

    const timer = window.setTimeout(async () => {
      setDraftSaveStatus('saving');
      try {
        const response = await fetch('/api/planner/drafts', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...getAuthHeader(),
          },
          body: JSON.stringify({ draftPlan: normalizedDraftPayload }),
        });

        if (!response.ok) {
          setDraftSaveStatus('error');
          return;
        }

        setDraftSaveStatus('saved');
        window.setTimeout(() => setDraftSaveStatus('idle'), 1800);
      } catch {
        setDraftSaveStatus('error');
      }
    }, 900);

    return () => window.clearTimeout(timer);
  }, [
    buildCurrentDraft,
    draftBootstrapComplete,
    draftId,
    workflowStage,
  ]);

  useEffect(() => {
    const runIntelligencePass = async () => {
      if (!plan || plan.locationSuggestions.length === 0) {
        setIntelligence(null);
        return;
      }

      const anchor =
        plan.locationSuggestions.find(location => location.latitude != null && location.longitude != null) ||
        plan.locationSuggestions[0];
      const refinementLookup = new Map(
        (plan.locationRefinements ?? []).map(refinement => [refinement.name.toLowerCase(), refinement.bestTimeWindow])
      );

      setIsLoadingIntelligence(true);
      try {
        const response = await fetch('/api/planner/intelligence', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...getAuthHeader(),
          },
          body: JSON.stringify({
            // Pass null when no geocoded location is available — the server guard
            // will return a location-aware fallback instead of calling Open-Meteo
            // with (0, 0) which maps to the Gulf of Guinea.
            latitude: anchor?.latitude ?? null,
            longitude: anchor?.longitude ?? null,
            date: shootDate || new Date().toISOString(),
            durationMinutes,
            sessionCategory,
            locations: plan.locationSuggestions.map(location => ({
              name: location.displayName || location.name,
              latitude: location.latitude ?? null,
              longitude: location.longitude ?? null,
              venueBucket: location.venueBucket,
              logistics: location.logistics,
              preferredTimeWindow:
                refinementLookup.get((location.displayName || location.name).toLowerCase()) ||
                refinementLookup.get(location.name.toLowerCase()) ||
                null,
            })),
          }),
        });

        const result = (await response.json()) as {
          goldenHours?: PlannerIntelligence['goldenHours'];
          weather?: PlannerIntelligence['weather'];
          confidence?: PlannerIntelligence['confidence'];
          sunWindows?: PlannerIntelligence['sunWindows'];
          logistics?: PlannerIntelligence['logistics'];
          optimizedRoute?: number[];
        };
        if (!response.ok || !result.goldenHours || !Array.isArray(result.logistics) || !Array.isArray(result.optimizedRoute)) {
          setIntelligence(null);
          return;
        }

        setIntelligence({
          goldenHours: result.goldenHours,
          weather: result.weather,
          confidence: result.confidence,
          sunWindows: result.sunWindows,
          logistics: result.logistics,
          optimizedRoute: result.optimizedRoute,
        });
      } catch {
        setIntelligence(null);
      } finally {
        setIsLoadingIntelligence(false);
      }
    };

    void runIntelligencePass();
  }, [durationMinutes, plan, sessionCategory, shootDate]);

  const generatePlan = async () => {
    setIsGenerating(true);
    setError(null);

    if (hasReachedPlannerLimit) {
      setError('You have used all 3 free AI plans. Upgrade to Pro for unlimited shoot planning.');
      setIsGenerating(false);
      return;
    }

    if (multiDay && isFreeTier) {
      setError('Multi-day planning is included with Pro.');
      setIsGenerating(false);
      return;
    }

    const providedLocationList = providedLocations
      .split(/\n|,/)
      .map(item => item.trim())
      .filter(Boolean)
      .slice(0, 12);

    // Guard: find-locations mode requires at least a city or business fallback
    if (
      locationMode === 'find-locations' &&
      !city.trim() &&
      !businessProfile?.baseLocation &&
      !businessProfile?.zipCode
    ) {
      setError(
        'City is required when finding locations. Add a city like "Austin, TX" or set your base location in account settings.'
      );
      setIsGenerating(false);
      return;
    }

    // Guard: use-provided mode requires at least one location
    if (locationMode === 'use-provided' && providedLocationList.length === 0) {
      setError('Please list at least one location before generating.');
      setIsGenerating(false);
      return;
    }

    const subjectDetailsPayload = [
      subjectDetails,
      sessionCategory === 'family' && familyPacing ? `Family pacing: ${familyPacing}` : '',
      sessionCategory === 'engagement' && engagementStory ? `Couple story: ${engagementStory}` : '',
      sessionCategory === 'portrait' && brandingGoals ? `Brand goals: ${brandingGoals}` : '',
      sessionCategory === 'event' && eventPriorities ? `Event priorities: ${eventPriorities}` : '',
    ]
      .filter(Boolean)
      .join(' | ');

    const mustHaveShotsPayload = [
      mustHaveShots,
      sessionCategory === 'portrait' && brandingGoals ? `Brand outputs: ${brandingGoals}` : '',
      sessionCategory === 'event' && eventPriorities ? `Priority captures: ${eventPriorities}` : '',
    ]
      .filter(Boolean)
      .join(' | ');

    const constraintsPayload = [
      constraints,
      `Final shoot location target: ${recommendedLocationCount} location${recommendedLocationCount === 1 ? '' : 's'}; return extra candidate options only for photographer shortlisting.`,
      sessionCategory === 'family' && familyPacing ? `Pacing note: ${familyPacing}` : '',
    ]
      .filter(Boolean)
      .join(' | ');

    try {
      const response = await fetch('/api/ai/session-plan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
        body: JSON.stringify({
          shootType,
          subjectDetails: subjectDetailsPayload,
          city,
          shootDate,
          duration,
          mood,
          mustHaveShots: mustHaveShotsPayload,
          constraints: constraintsPayload,
          desiredLocationCount: recommendedLocationCount,
          locationMode: locationMode === 'use-provided' ? 'use-provided' : 'find-locations',
          providedLocations: providedLocationList,
          // V2: multi-day fields (ignored by single-day AI handler, reserved for multi-day)
          multiDay: multiDay || undefined,
          sessionDates: multiDay && sessionDates.length > 0 ? sessionDates : undefined,
          dailyDurationMinutes: multiDay ? dailyDurationMinutes : undefined,
          maxTravelMinutesPerDay: multiDay ? maxTravelMinutesPerDay : undefined,
        }),
      });

      const result = await response.json();
      if (!result.success) {
        if (result.usage) {
          setBillingUsage(result.usage as BillingUsageSummary);
        }
        setError(result.error ?? 'Failed to generate session plan');
        return;
      }

      resetReviewState();
      setIsRouteConfirmed(false);
      setPlan(result.data ?? null);
      setPlannerBrainMessages([INITIAL_PLANNER_BRAIN_MESSAGE]);
      setPlannerPlanVersions([]);
      setLastPlannerBrainChanges([]);
      void (async () => {
        await trackPlannerEvent('planner_generate_success', {
          sessionCategory,
          locationMode,
          locationCount: result.data?.locationSuggestions?.length ?? 0,
          desiredLocationCount: recommendedLocationCount,
          shotCount: result.data?.shotList?.length ?? 0,
        });
        await loadBillingUsage();
      })();
    } catch {
      setError('Failed to generate session plan');
      void trackPlannerEvent('planner_generate_failed', {
        sessionCategory,
        locationMode,
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const persistFeedback = async (applied: boolean = false) => {
    if (!plan) return;

    try {
      setFeedbackSaveStatus('saving');
      const response = await fetch('/api/planner/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
        body: JSON.stringify({
          sessionId: `${draftId}-${shootType}-${city}`,
          locationVotes,
          preferredVenueBucket,
          excludedVenueBuckets,
          applied,
          planMetadata: {
            sessionCategory: sessionCategory,
            city: city || undefined,
            duration: duration || undefined,
            shootType: shootType || undefined,
          },
        }),
      });

      if (response.ok) {
        setFeedbackSaveStatus('saved');
        setTimeout(() => setFeedbackSaveStatus('idle'), 3000);
      } else {
        setFeedbackSaveStatus('idle');
      }
    } catch (error) {
      console.warn('Failed to persist planner feedback:', error);
      setFeedbackSaveStatus('idle');
    }
  };

  const regenerateSection = async (sectionType: 'shot-list' | 'timeline') => {
    if (!plan) return;

    setIsRegenerating(sectionType);
    setError(null);

    try {
      // Reconstruct payloads similar to generatePlan
      const subjectDetailsPayload = [
        subjectDetails,
        sessionCategory === 'family' && familyPacing ? `Family pacing: ${familyPacing}` : '',
        sessionCategory === 'engagement' && engagementStory ? `Couple story: ${engagementStory}` : '',
        sessionCategory === 'portrait' && brandingGoals ? `Brand goals: ${brandingGoals}` : '',
        sessionCategory === 'event' && eventPriorities ? `Event priorities: ${eventPriorities}` : '',
      ]
        .filter(Boolean)
        .join(' | ');

      const mustHaveShotsPayload = [
        mustHaveShots,
        sessionCategory === 'portrait' && brandingGoals ? `Brand outputs: ${brandingGoals}` : '',
        sessionCategory === 'event' && eventPriorities ? `Priority captures: ${eventPriorities}` : '',
      ]
        .filter(Boolean)
        .join(' | ');

      const constraintsPayload = [
        constraints,
        `Final shoot location target: ${recommendedLocationCount} location${recommendedLocationCount === 1 ? '' : 's'}; keep regenerated content focused on selected/shortlisted stops.`,
        sessionCategory === 'family' && familyPacing ? `Pacing note: ${familyPacing}` : '',
      ]
        .filter(Boolean)
        .join(' | ');

      const response = await fetch('/api/planner/regenerate-section', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
        body: JSON.stringify({
          type: sectionType,
          currentPlan: {
            locationSuggestions: plan.locationSuggestions,
            shotList: plan.shotList,
            timeline: plan.timeline,
          },
          sessionInputs: {
            shootType,
            subjectDetails: subjectDetailsPayload,
            city: city || businessProfile?.baseLocation || '',
            duration,
            mood,
            mustHaveShots: mustHaveShotsPayload,
            constraints: constraintsPayload,
            desiredLocationCount: recommendedLocationCount,
          },
        }),
      });

      const result = await response.json();
      if (!result.success) {
        setError(result.error ?? `Failed to regenerate ${sectionType}`);
        setIsRegenerating('idle');
        return;
      }

      // Update the plan with regenerated content
      setPlan(prev =>
        prev
          ? {
              ...prev,
              ...(result.data?.shotList && { shotList: result.data.shotList }),
              ...(result.data?.timeline && { timeline: result.data.timeline }),
            }
          : prev
      );

      setFeedbackSaveStatus('saved');
      setTimeout(() => setFeedbackSaveStatus('idle'), 2000);
    } catch (error) {
      console.error(`Failed to regenerate ${sectionType}:`, error);
      setError(`Failed to regenerate ${sectionType}`);
    } finally {
      setIsRegenerating('idle');
    }
  };

  const sendPlannerBrainMessage = async (messageOverride?: string) => {
    if (!plan || isPlannerBrainUpdating) return;

    const message = (messageOverride ?? plannerBrainInput).trim();
    if (!message) return;

    const userMessage: PlannerBrainChatMessage = { role: 'user', content: message };
    setPlannerBrainMessages(prev => [...prev, userMessage]);
    setPlannerBrainInput('');
    setIsPlannerBrainUpdating(true);
    setLastPlannerBrainChanges([]);
    setError(null);

    try {
      const response = await fetch('/api/planner/brain', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
        body: JSON.stringify({
          currentPlan: plan,
          message,
          stage: plan.plannerBrain?.currentStage ?? 'shot_list_generation',
          chatHistory: plannerBrainMessages,
          sessionInputs: {
            shootType,
            mood,
            constraints,
          },
        }),
      });

      const result = (await response.json()) as {
        success?: boolean;
        data?: {
          plan?: SessionPlan;
          assistantMessage?: string;
          changedSections?: string[];
          source?: 'ai' | 'fallback';
        };
        error?: string;
      };

      if (!response.ok || !result.success || !result.data?.plan) {
        setError(result.error ?? 'Failed to update the plan.');
        setPlannerBrainMessages(prev => [
          ...prev,
          {
            role: 'assistant',
            content: result.error ?? 'I could not update the plan from that message. Try a more specific planning change.',
          },
        ]);
        return;
      }

      const changedSections = Array.isArray(result.data.changedSections) ? result.data.changedSections : [];
      const nextPlan = result.data.plan;
      setPlan(result.data.plan);
      setIsRouteConfirmed(false);
      setLastPlannerBrainChanges(changedSections);
      setPlannerPlanVersions(prev => [
        {
          id: `${Date.now()}-${prev.length + 1}`,
          label: `Version ${prev.length + 1}`,
          message,
          previousPlan: plan,
          nextPlan,
          changedSections,
          createdAt: new Date().toISOString(),
        },
        ...prev,
      ].slice(0, 12));
      setPlannerBrainMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: result.data?.assistantMessage || 'Done. I updated the structured plan.',
          changedSections,
          source: result.data?.source,
        },
      ]);
    } catch {
      setError('Failed to update the plan.');
      setPlannerBrainMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: 'I could not reach the planner brain. Your current plan is unchanged.',
        },
      ]);
    } finally {
      setIsPlannerBrainUpdating(false);
    }
  };

  const restorePlannerVersion = (version: PlannerPlanVersion) => {
    setPlan(version.previousPlan);
    setIsRouteConfirmed(false);
    setLastPlannerBrainChanges(version.changedSections);
    setPlannerBrainMessages(prev => [
      ...prev,
      {
        role: 'assistant',
        content: `Restored the plan to before "${version.message}".`,
        changedSections: version.changedSections,
      },
    ]);
  };

  const applyPlanToWorkspace = async () => {
    if (!plan) return;
    const workspacePlan = buildSelectedLocationPlan();
    if (!workspacePlan) return;

    if (!isRouteConfirmed) {
      setError('Confirm the final session route before creating the project.');
      return;
    }

    setIsApplying(true);
    setApplyProgress(null);
    setError(null);

    try {
      setApplyProgress({ done: 0, total: 1, label: 'Creating project…' });
      const projectResponse = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
        body: JSON.stringify({
          title: workspacePlan.projectTitle,
          description: `${workspacePlan.creativeDirection}\n\nDuration: ${duration || 'Not specified'}\nConstraints: ${constraints || 'None'}`,
          status: 'planning',
          startDate: shootDate || undefined,
          tags: ['ai-generated', 'session-plan', shootType.toLowerCase()],
        }),
      });

      const projectResult = await projectResponse.json();
      if (!projectResult.success) {
        setError(projectResult.error ?? 'Failed to create project from plan');
        return;
      }

      const projectId = projectResult.data?.id as string;
      if (!projectId) {
        setError('Project was created without an id');
        return;
      }

      const createShotWithRetry = async (payload: Record<string, unknown>, retries = 2) => {
        let lastError = 'Failed to create shot';

        for (let attempt = 0; attempt <= retries; attempt += 1) {
          const response = await fetch('/api/shots', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...getAuthHeader(),
            },
            body: JSON.stringify(payload),
          });

          let result: { success?: boolean; error?: string } = {};
          try {
            result = (await response.json()) as { success?: boolean; error?: string };
          } catch {
            result = { success: false, error: 'Invalid shot API response' };
          }

          if (response.ok && result.success) {
            return { success: true as const };
          }

          lastError = result.error || `Shot API failed (${response.status})`;

          const shouldRetry =
            attempt < retries &&
            (response.status >= 500 ||
              response.status === 429 ||
              (response.status === 404 && /project not found/i.test(lastError)));

          if (!shouldRetry) {
            break;
          }

          await sleep((attempt + 1) * 300);
        }

        return { success: false as const, error: lastError };
      };

      let createdShots = 0;
      const failedShots: string[] = [];
      const failedReasons: string[] = [];
      const totalShots = workspacePlan.shotList.length;
      setApplyProgress({ done: 0, total: totalShots, label: `Saving shot 1 of ${totalShots}…` });

      for (const shot of workspacePlan.shotList) {
        const location = locationIndex.get((shot.location || '').toLowerCase());
        const refinement = refinementIndex.get((shot.location || '').toLowerCase());
        const sanitizedCoordinates = sanitizeCoordinates(
          shot.latitude ?? location?.latitude ?? null,
          shot.longitude ?? location?.longitude ?? null
        );

        const notes = [
          shot.notes,
          shot.deliverableCategory ? `Deliverable: ${shot.deliverableCategory}` : '',
          shot.lensSuggestion ? `Lens: ${shot.lensSuggestion}` : '',
          `Pose suggestion: ${shot.poseSuggestion}`,
          `Composition: ${shot.compositionSuggestion}`,
          shot.lightWeatherNote ? `Sun/weather: ${shot.lightWeatherNote}` : '',
          `Timing: ${shot.timingHint}`,
          shot.geocodedLocationName ? `Map match: ${shot.geocodedLocationName}` : '',
          refinement ? `Location score: ${refinement.overallScore}/10` : '',
          refinement ? `Kid-friendly: ${refinement.kidFriendlinessScore}/10` : '',
          refinement ? `Crowd risk: ${refinement.crowdRiskScore}/10` : '',
          refinement ? `Walking burden: ${refinement.walkingBurdenScore}/10` : '',
          refinement?.bestTimeWindow ? `Best window: ${refinement.bestTimeWindow}` : '',
          location?.logistics?.parking ? `Parking: ${location.logistics.parking}` : '',
          location?.logistics?.restroom ? `Restroom: ${location.logistics.restroom}` : '',
          location?.logistics?.walkingDistance
            ? `Walking distance: ${location.logistics.walkingDistance}`
            : '',
        ]
          .filter(Boolean)
          .join('\n');

        const shotResult = await createShotWithRetry({
          projectId,
          title: shot.title?.trim() || 'Untitled Shot',
          description: shot.description,
          location: shot.location,
          plannedTime: shootDate || null,
          latitude: sanitizedCoordinates.latitude,
          longitude: sanitizedCoordinates.longitude,
          notes,
          microSpotName: shot.microSpot,
          parkingNotes: location?.logistics?.parking ?? '',
          walkingDistance: location?.logistics?.walkingDistance ?? '',
          restroomLocation: location?.logistics?.restroom ?? '',
          backgroundDescription: location?.whyItWorks ?? '',
          status: 'planned',
        });

        if (shotResult.success) {
          createdShots += 1;
        } else {
          const shotTitle = shot.title || 'Untitled Shot';
          failedShots.push(shotTitle);
          failedReasons.push(`${shotTitle}: ${shotResult.error || 'Unknown error'}`);
        }
        const nextDone = createdShots + failedShots.length;
        setApplyProgress({
          done: nextDone,
          total: totalShots,
          label: nextDone < totalShots
            ? `Saving shot ${nextDone + 1} of ${totalShots}…`
            : 'Finishing up…',
        });
      }

      if (createdShots === 0) {
        setError(
          `Project was created, but no shots were saved. ${failedReasons.length > 0 ? `Errors: ${failedReasons.slice(0, 2).join(' | ')}` : ''}`.trim()
        );
        return;
      }

      if (failedShots.length > 0) {
        setError(`Created ${createdShots} shots, but ${failedShots.length} failed. ${failedReasons.slice(0, 2).join(' | ')}`);
      }

      // Persist feedback before navigating away
      await persistFeedback(true);
      await clearDraftStorage();
      setDraftId(createPlannerDraftId());
      void trackPlannerEvent('planner_apply_success', {
        createdShots,
        failedShots: failedShots.length,
        selectedLocationCount: selectedLocations.length || undefined,
      });

      router.push(`/dashboard/shot-board?project=${projectId}`);
    } catch {
      setError('Failed while applying plan to workspace');
      void trackPlannerEvent('planner_apply_failed');
    } finally {
      setIsApplying(false);
      setApplyProgress(null);
    }
  };

  const refinePlan = async () => {
    if (!plan) return;

    setIsRefining(true);
    setError(null);

    try {
      const response = await fetch('/api/ai/session-plan/refine', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
        body: JSON.stringify({
          plan,
          subjectDetails,
          mood,
          constraints,
        }),
      });

      const result = await response.json();
      if (!result.success) {
        setError(result.error ?? 'Failed to refine plan');
        return;
      }

      const locationRefinements = Array.isArray(result.data?.locationRefinements)
        ? result.data.locationRefinements
        : [];

      const updatedContingencyPlans = Array.isArray(result.data?.updatedContingencyPlans)
        ? result.data.updatedContingencyPlans
        : plan.contingencyPlans;

      setPlan(prev =>
        prev
          ? {
              ...prev,
              locationRefinements,
              contingencyPlans: updatedContingencyPlans,
            }
          : prev
      );
      setIsRouteConfirmed(false);
      void trackPlannerEvent('planner_refine_success', {
        refinementCount: locationRefinements.length,
      });
    } catch {
      setError('Failed to refine plan');
      void trackPlannerEvent('planner_refine_failed');
    } finally {
      setIsRefining(false);
    }
  };

  const jumpToQuestion = (questionId: ChatQuestionId) => {
    const nextIndex = visibleQuestions.findIndex(question => question.id === questionId);
    if (nextIndex === -1) return;
    setIsReviewConfirmed(false);
    setError(null);
    moveToQuestionIndex(nextIndex);
  };

  const submitAnswerValue = (value: string) => {
    if (!activeQuestion) return;
    setError(null);
    setAnswerForQuestion(activeQuestion.id, value);
    moveToQuestionIndex(boundedChatStepIndex + 1);
  };

  const submitCurrentAnswer = () => {
    if (!activeQuestion) return;

    const rawValue = draftAnswer.trim();
    const value =
      activeQuestion.id === 'city' && /^skip\s*\(/i.test(rawValue)
        ? ''
        : rawValue;

    if (activeQuestion.required && value.length === 0) {
      setError('Please answer the current question before continuing.');
      return;
    }

    submitAnswerValue(value);
  };

  const goBackQuestion = () => {
    setError(null);
    setIsReviewConfirmed(false);
    moveToQuestionIndex(boundedChatStepIndex - 1);
  };

  const reviewAnswers = () => {
    setError(null);
    setIsReviewConfirmed(true);
  };

  const editAnswers = () => {
    setError(null);
    setPlan(null);
    setIsReviewConfirmed(false);
    moveToQuestionIndex(visibleQuestions.length - 1);
  };

  const applyPreset = (preset: PlannerPreset) => {
    const presetCity = businessProfile?.baseLocation || businessProfile?.zipCode || city;
    const presetProvidedLocations =
      preset.locationMode === 'use-provided'
        ? providedLocations || 'Main stage, sponsor wall, networking area, venue exterior'
        : '';
    const nextCategory = getSessionCategory(preset.shootType);
    const nextQuestions = CHAT_QUESTIONS.filter(
      question => !question.showWhen || question.showWhen(preset.locationMode, nextCategory)
    );

    setActivePresetId(preset.id);
    setPlan(null);
    setError(null);
    setIsReviewConfirmed(false);
    setShootType(preset.shootType);
    setLocationMode(preset.locationMode);
    setSubjectDetails(preset.subjectDetails);
    setCity(preset.locationMode === 'find-locations' ? presetCity : city);
    setShootDate('');
    setDuration(preset.duration);
    setMood(preset.mood);
    setMustHaveShots(preset.mustHaveShots);
    setConstraints(preset.constraints);
    setDesiredLocationCount(preset.desiredLocationCount || (parseDurationMinutes(preset.duration) <= 45 ? '1 location' : '2 locations'));
    setProvidedLocations(presetProvidedLocations);
    setFamilyPacing(preset.familyPacing || '');
    setEngagementStory(preset.engagementStory || '');
    setBrandingGoals(preset.brandingGoals || '');
    setEventPriorities(preset.eventPriorities || '');
    setChatStepIndex(nextQuestions.length);
  };

  const loadTemplate = (payload: SessionTemplatePayload) => {
    const nextCategory = getSessionCategory(payload.shootType || shootType);
    const nextMode = payload.locationMode ?? locationMode;
    const nextQuestions = CHAT_QUESTIONS.filter(
      question => !question.showWhen || question.showWhen(nextMode, nextCategory)
    );

    setActivePresetId(null);
    setPlan(null);
    setError(null);
    setIsReviewConfirmed(false);
    if (payload.shootType) setShootType(payload.shootType);
    if (payload.locationMode) setLocationMode(payload.locationMode);
    if (payload.city) setCity(payload.city);
    if (payload.duration) setDuration(payload.duration);
    if (payload.mood) setMood(payload.mood);
    if (payload.subjectDetails) setSubjectDetails(payload.subjectDetails);
    if (payload.mustHaveShots) setMustHaveShots(payload.mustHaveShots);
    if (payload.constraints) setConstraints(payload.constraints);
    if (payload.desiredLocationCount) setDesiredLocationCount(payload.desiredLocationCount);
    if (payload.providedLocations !== undefined) setProvidedLocations(payload.providedLocations);
    if (payload.familyPacing !== undefined) setFamilyPacing(payload.familyPacing);
    if (payload.engagementStory !== undefined) setEngagementStory(payload.engagementStory);
    if (payload.brandingGoals !== undefined) setBrandingGoals(payload.brandingGoals);
    if (payload.eventPriorities !== undefined) setEventPriorities(payload.eventPriorities);
    if (payload.shootDate !== undefined) setShootDate(payload.shootDate);
    // V2: multi-day fields
    if (payload.multiDay !== undefined) setMultiDay(payload.multiDay);
    if (payload.sessionDates !== undefined) setSessionDates(payload.sessionDates);
    if (payload.dailyDurationMinutes !== undefined) setDailyDurationMinutes(payload.dailyDurationMinutes);
    if (payload.maxTravelMinutesPerDay !== undefined) setMaxTravelMinutesPerDay(payload.maxTravelMinutesPerDay);
    setChatStepIndex(nextQuestions.length);
  };

  const workflowStages: Array<{ id: WorkflowStage; label: string; description: string }> = [
    { id: 'intake', label: '1. Brief', description: 'Chat or enter the shoot details' },
    { id: 'review', label: '2. Location + Shot Flow', description: 'Choose the location, map micro-spots, and match deliverables' },
    { id: 'apply', label: '3. Guide + Project', description: 'Create the photographer shot list and client prep guide' },
  ];

  const planningSourceExplanation = useMemo(() => {
    if (!plan?.planningDiagnostics?.locationSource) return null;

    switch (plan.planningDiagnostics.locationSource) {
      case 'grounded-candidates':
        return {
          tone: 'emerald' as const,
          title: 'Grounded location set',
          body: 'This plan is built from ranked real-world candidates gathered for the requested area and session type.',
        };
      case 'user-provided':
        return {
          tone: 'blue' as const,
          title: 'Using your provided locations',
          body: 'The planner prioritized the locations you supplied, then built the shot flow and timing around those places.',
        };
      case 'fallback-geocode':
        return {
          tone: 'amber' as const,
          title: 'Fallback geocode mode',
          body: 'The planner found limited ranked venue data, so it used broader map results. Review the locations closely before applying the plan.',
        };
      case 'city-fallback':
        return {
          tone: 'amber' as const,
          title: 'City fallback mode',
          body: 'The planner had to widen the search around the city anchor. A nearby ZIP, neighborhood, or provided location list may improve results.',
        };
      default:
        return null;
    }
  }, [plan]);

  const profileOutputExamples = useMemo(() => {
    if (!businessProfile) return [];

    return [
      businessProfile.baseLocation || businessProfile.zipCode
        ? {
            label: 'Location anchor',
            source: businessProfile.baseLocation || businessProfile.zipCode || '',
            output: `AI location searches will center around ${businessProfile.baseLocation || businessProfile.zipCode}.`,
          }
        : null,
      businessProfile.brandTone
        ? {
            label: 'Brand tone',
            source: businessProfile.brandTone,
            output: `Planner copy and client prep will lean ${businessProfile.brandTone.toLowerCase()}.`,
          }
        : null,
      businessProfile.preferredLocationTypes
        ? {
            label: 'Preferred spots',
            source: businessProfile.preferredLocationTypes,
            output: `Location suggestions will favor ${businessProfile.preferredLocationTypes.toLowerCase()}.`,
          }
        : null,
      businessProfile.prepGuideNotes
        ? {
            label: 'Client prep',
            source: businessProfile.prepGuideNotes,
            output: 'Saved prep notes can flow into the client checklist and guide handoff.',
          }
        : null,
    ].filter(Boolean).slice(0, 3) as Array<{ label: string; source: string; output: string }>;
  }, [businessProfile]);

  const resumeDraft = () => {
    if (!resumableDraft) return;
    hydrateFromDraft(resumableDraft);
    void trackPlannerEvent('planner_draft_resumed', {
      status: resumableDraft.status,
    });
  };

  const dismissDraft = async () => {
    if (resumableDraft?.id) {
      await clearDraftStorage(resumableDraft.id);
    } else {
      localStorage.removeItem(PLANNER_DRAFT_STORAGE_KEY);
    }
    setResumableDraft(null);
  };

  const applyOptimizedRouteOrder = () => {
    if (!plan || !intelligence?.optimizedRoute?.length) return;

    const reorderedLocations = intelligence.optimizedRoute
      .map(index => plan.locationSuggestions[index])
      .filter(Boolean);

    if (reorderedLocations.length === 0) return;

    setPlan(prev =>
      prev
        ? {
            ...prev,
            locationSuggestions: reorderedLocations,
          }
        : prev
    );
    setIsRouteConfirmed(false);
    setFeedbackSaveStatus('saved');
    setTimeout(() => setFeedbackSaveStatus('idle'), 1200);
    void trackPlannerEvent('planner_route_optimized', {
      locationCount: reorderedLocations.length,
    });
  };

  const updateShotField = (index: number, field: keyof SessionPlanShot, value: string) => {
    setPlan(prev => {
      if (!prev) return prev;
      const nextShots = [...prev.shotList];
      const target = nextShots[index];
      if (!target) return prev;
      nextShots[index] = { ...target, [field]: value };
      return { ...prev, shotList: nextShots };
    });
  };

  const updateTimelineField = (index: number, field: keyof SessionPlanTimelineItem, value: string) => {
    setPlan(prev => {
      if (!prev) return prev;
      const nextTimeline = [...prev.timeline];
      const target = nextTimeline[index];
      if (!target) return prev;
      nextTimeline[index] = { ...target, [field]: value };
      return { ...prev, timeline: nextTimeline };
    });
  };

  const updateChecklistItem = (index: number, value: string) => {
    setPlan(prev => {
      if (!prev) return prev;
      const nextChecklist = [...prev.clientPrepChecklist];
      nextChecklist[index] = value;
      return { ...prev, clientPrepChecklist: nextChecklist };
    });
  };

  const updateContingencyItem = (index: number, value: string) => {
    setPlan(prev => {
      if (!prev) return prev;
      const nextContingencies = [...prev.contingencyPlans];
      nextContingencies[index] = value;
      return { ...prev, contingencyPlans: nextContingencies };
    });
  };

  const updateLocationMicroLocations = (targetLocation: SessionPlanLocation, updater: (spots: string[]) => string[]) => {
    setIsRouteConfirmed(false);
    setPlan(prev => {
      if (!prev) return prev;
      const targetNames = new Set([targetLocation.name.toLowerCase(), (targetLocation.displayName || targetLocation.name).toLowerCase()]);
      return {
        ...prev,
        locationSuggestions: prev.locationSuggestions.map(location => {
          const key = (location.displayName || location.name).toLowerCase();
          if (!targetNames.has(location.name.toLowerCase()) && !targetNames.has(key)) return location;
          const nextSpots = updater(location.microLocations).map(spot => spot.trim()).filter(Boolean);
          return {
            ...location,
            microLocations: Array.from(new Set(nextSpots)),
          };
        }),
      };
    });
  };

  const addMicroLocation = (location: SessionPlanLocation) => {
    updateLocationMicroLocations(location, spots => [...spots, `New micro-spot ${spots.length + 1}`]);
  };

  const updateMicroLocation = (location: SessionPlanLocation, index: number, value: string) => {
    updateLocationMicroLocations(location, spots => spots.map((spot, spotIndex) => (spotIndex === index ? value : spot)));
  };

  const removeMicroLocation = (location: SessionPlanLocation, index: number) => {
    updateLocationMicroLocations(location, spots => spots.filter((_spot, spotIndex) => spotIndex !== index));
  };

  const moveMicroLocation = (location: SessionPlanLocation, index: number, direction: 'up' | 'down') => {
    updateLocationMicroLocations(location, spots => {
      const nextIndex = direction === 'up' ? index - 1 : index + 1;
      if (nextIndex < 0 || nextIndex >= spots.length) return spots;
      const next = [...spots];
      const current = next[index];
      const target = next[nextIndex];
      if (!current || !target) return spots;
      next[index] = target;
      next[nextIndex] = current;
      return next;
    });
  };

  const suggestMicroLocations = (location: SessionPlanLocation) => {
    const categorySuggestions: Record<string, string[]> = {
      family: ['Parking lot meeting point', 'Open shade starter spot', 'Restroom reset stop', 'Seated blanket area'],
      engagement: ['Arrival meet-up point', 'Walking candid path', 'Scenic wide portrait spot', 'Quiet close-up background'],
      portrait: ['Clean hero background', 'Texture/detail wall', 'Seated portrait setup', 'Horizontal website crop spot'],
      event: ['Registration arrival point', 'Main presentation zone', 'Sponsor/detail wall', 'Networking candid area'],
    };
    const logisticsSuggestions = [
      location.logistics.parking ? 'Parking handoff point' : '',
      location.logistics.restroom ? 'Restroom/change reset' : '',
      location.logistics.walkingDistance ? 'Shortest walking transition' : '',
    ].filter(Boolean);

    updateLocationMicroLocations(location, spots => [
      ...spots,
      ...(categorySuggestions[sessionCategory] ?? categorySuggestions.portrait),
      ...logisticsSuggestions,
    ]);
  };

  const buildSelectedLocationPlan = useCallback(() => {
    if (!plan || selectedLocations.length === 0) return plan;

    const selectedNameSet = new Set(
      selectedLocations.flatMap(location => [location.name.toLowerCase(), (location.displayName || location.name).toLowerCase()])
    );
    const selectedShots = plan.shotList.filter(shot => selectedNameSet.has((shot.location || '').toLowerCase()));

    return {
      ...plan,
      locationSuggestions: selectedLocations,
      shotList: selectedShots.length > 0 ? selectedShots : plan.shotList,
      projectTitle: `${plan.projectTitle} - selected route`,
    };
  }, [plan, selectedLocations]);

  const createShareLink = async () => {
    if (!plan) return;

    if (!isRouteConfirmed) {
      setShareLinkError('Confirm the final session route before creating a client guide.');
      return;
    }

    if (hasReachedShareLimit) {
      setShareLinkError('You have used your free client guide link. Upgrade to Pro for unlimited client exports.');
      return;
    }

    const sharePasswordInput = window.prompt(
      isFreeTier
        ? 'Free client links expire after 7 days. Leave this blank to create your included link.'
        : 'Optional: set a password for this share link (leave blank for no password).'
    );

    if (sharePasswordInput === null) {
      return;
    }

    setIsCreatingShareLink(true);
    setShareLinkError('');

    try {
      const exportPlan = buildSelectedLocationPlan();
      const response = await fetch('/api/planner/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
        body: JSON.stringify({
          plan: exportPlan,
          planMetadata: {
            shootType,
            city,
            duration,
            mood,
            shootDate,
            desiredLocationCount: recommendedLocationCount,
            selectedLocationCount: selectedLocations.length || undefined,
          },
          sharePassword: isFreeTier ? undefined : sharePasswordInput.trim() || undefined,
          expiresInDays: isFreeTier ? 7 : 30,
        }),
      });

      const result = (await response.json()) as {
        success?: boolean;
        shareUrl?: string;
        shareToken?: string;
        passwordProtected?: boolean;
        error?: string;
        usage?: BillingUsageSummary;
      };
      if (!response.ok || !result.success || !result.shareUrl) {
        if (result.usage) {
          setBillingUsage(result.usage);
        }
        setShareLinkError(result.error || 'Failed to create share link.');
        return;
      }

      setShareUrl(result.shareUrl);
      setShareToken(result.shareToken || '');
      void trackPlannerEvent('planner_share_link_created');
      void loadBillingUsage();
      void loadGuideActivity();
    } catch {
      setShareLinkError('Failed to create share link.');
    } finally {
      setIsCreatingShareLink(false);
    }
  };

  const copyShareLink = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setShareLinkError('');
    } catch {
      setShareLinkError('Could not copy link. Copy manually.');
    }
  };

  const downloadCalendarFile = () => {
    if (!plan || !shootDate) {
      setShareLinkError('Add a shoot date before exporting a calendar file.');
      return;
    }

    const startsAt = new Date(shootDate);
    if (Number.isNaN(startsAt.getTime())) {
      setShareLinkError('Use a calendar-readable shoot date before exporting.');
      return;
    }

    const endsAt = new Date(startsAt.getTime() + parseDurationHours(duration) * 60 * 60 * 1000);
    const exportPlan = buildSelectedLocationPlan();
    const primaryLocation = exportPlan?.locationSuggestions[0];
    const primaryLocationName = primaryLocation?.displayName || primaryLocation?.name || city;
    const timelineSummary = (exportPlan?.timeline ?? [])
      .map(item => `${item.timeBlock || 'Block'} - ${item.focus || 'Session flow'}`)
      .join(' | ');
    const description = [
      exportPlan?.creativeDirection,
      timelineSummary ? `Timeline: ${timelineSummary}` : '',
      primaryLocation?.googleMapsUrl ? `Arrival map: ${primaryLocation.googleMapsUrl}` : '',
      primaryLocation?.logistics?.parking ? `Parking: ${primaryLocation.logistics.parking}` : '',
    ].filter(Boolean).join('\n');
    const calendar = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//ShutterPlan AI//Planner Calendar Export//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      `UID:${draftId}@shutterplan.ai`,
      `DTSTAMP:${formatCalendarDate(new Date())}`,
      `DTSTART:${formatCalendarDate(startsAt)}`,
      `DTEND:${formatCalendarDate(endsAt)}`,
      `SUMMARY:${escapeCalendarText(exportPlan?.projectTitle || shootType)}`,
      `LOCATION:${escapeCalendarText(primaryLocationName || '')}`,
      `DESCRIPTION:${escapeCalendarText(description)}`,
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');

    const blob = new Blob([calendar], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${slugifyFileName(exportPlan?.projectTitle || shootType)}.ics`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setShareLinkError('');
    void trackPlannerEvent('planner_calendar_export_downloaded');
  };

  const openPrintableGuide = () => {
    if (!shareUrl) {
      setShareLinkError('Create a client link before opening the branded PDF export.');
      return;
    }
    window.open(shareUrl, '_blank', 'noopener,noreferrer');
    void trackPlannerEvent('planner_pdf_export_opened');
  };

  const revokeShareLink = async () => {
    if (!shareToken) {
      setShareLinkError('Cannot revoke: missing share token. Create a new link first.');
      return;
    }

    setIsRevokingShareLink(true);
    setShareLinkError('');

    try {
      const response = await fetch('/api/planner/export/revoke', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
        body: JSON.stringify({ shareToken }),
      });

      const result = (await response.json()) as { success?: boolean; error?: string };
      if (!response.ok || !result.success) {
        setShareLinkError(result.error || 'Failed to revoke share link.');
        return;
      }

      setShareUrl('');
      setShareToken('');
      setShareLinkError('');
    } catch {
      setShareLinkError('Failed to revoke share link.');
    } finally {
      setIsRevokingShareLink(false);
    }
  };

  return (
    <div className={isImmersiveChat ? 'min-h-screen bg-[#08090b]' : 'space-y-6'}>
      {!isImmersiveChat && <PlannerAssistantHero mode={plannerEntryMode} onModeChange={setPlannerEntryMode} />}

      {!isImmersiveChat && <PlannerWorkflowStages stages={workflowStages} currentStage={workflowStage} hasPlan={!!plan} />}

      {!isImmersiveChat && billingUsage && isFreeTier && (
        <Card className="border border-[#d8d2c8] bg-[#faf9f6] shadow-sm">
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#7c6f64]">Free plan usage</p>
              <h2 className="mt-2 text-xl font-semibold text-[#1f2933]">Plan freely, upgrade when ShutterPlan becomes part of your workflow.</h2>
              <p className="mt-2 text-sm leading-6 text-[#5f6b76]">
                Free includes {billingUsage.limits.plannerGenerations} AI plans and {billingUsage.limits.shareLinks} client guide link.
                Pro unlocks unlimited planning, protected guide links, longer expirations, and multi-day sessions.
              </p>
            </div>
            <div className="grid w-full gap-3 sm:grid-cols-2 lg:min-w-72">
              <div className="rounded-lg border border-[#d8d2c8] bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#7c6f64]">AI plans</p>
                <p className="mt-2 text-2xl font-semibold text-[#1f2933]">
                  {billingUsage.usage.plannerGenerations}/{billingUsage.limits.plannerGenerations}
                </p>
                <p className="mt-1 text-xs text-[#5f6b76]">
                  {billingUsage.remaining.plannerGenerations} remaining
                </p>
              </div>
              <div className="rounded-lg border border-[#d8d2c8] bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#7c6f64]">Client links</p>
                <p className="mt-2 text-2xl font-semibold text-[#1f2933]">
                  {billingUsage.usage.shareLinks}/{billingUsage.limits.shareLinks}
                </p>
                <p className="mt-1 text-xs text-[#5f6b76]">
                  {billingUsage.remaining.shareLinks} remaining
                </p>
              </div>
            </div>
          </div>
          <div className="mt-4 grid gap-2 md:grid-cols-3">
            {billingUsage.upgradeValueProps.map(value => (
              <div key={value} className="rounded-lg border border-[#e4ded5] bg-white px-4 py-3 text-sm font-medium text-[#1f2933]">
                {value}
              </div>
            ))}
          </div>
          <div className="mt-4 overflow-x-auto rounded-lg border border-[#d8d2c8] bg-white">
            <div className="min-w-[620px]">
              <div className="grid grid-cols-[1.1fr_0.8fr_0.8fr] border-b border-[#e4ded5] bg-[#f6f3ee] text-xs font-semibold uppercase tracking-[0.12em] text-[#7c6f64]">
                <div className="px-3 py-3">Outcome</div>
                <div className="px-3 py-3">Free</div>
                <div className="px-3 py-3">Pro</div>
              </div>
              {[
                ['Saved planning hours', '3 AI plans', 'Unlimited plans and refinements'],
                ['Client readiness', '1 short-lived guide', 'Unlimited branded client guides'],
                ['Premium guide controls', 'Basic links', 'Passwords, longer expiry, PDF and calendar workflow'],
              ].map(row => (
                <div key={row[0]} className="grid grid-cols-[1.1fr_0.8fr_0.8fr] border-b border-[#f0ebe4] text-sm last:border-b-0">
                  <div className="px-3 py-3 font-semibold text-[#1f2933]">{row[0]}</div>
                  <div className="px-3 py-3 text-[#5f6b76]">{row[1]}</div>
                  <div className="px-3 py-3 font-medium text-[#0f766e]">{row[2]}</div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {!isImmersiveChat && workflowStage === 'intake' && plannerEntryMode === 'chat' && (
        <SessionTemplatePanel
          currentPayload={{
            shootType,
            locationMode,
            city,
            duration,
            mood,
            subjectDetails,
            mustHaveShots,
            constraints,
            desiredLocationCount,
            providedLocations,
            familyPacing: familyPacing || undefined,
            engagementStory: engagementStory || undefined,
            brandingGoals: brandingGoals || undefined,
            eventPriorities: eventPriorities || undefined,
            shootDate: shootDate || undefined,
            multiDay: multiDay || undefined,
            sessionDates: sessionDates.length > 0 ? sessionDates : undefined,
            dailyDurationMinutes,
            maxTravelMinutesPerDay,
          }}
          onLoadTemplate={loadTemplate}
        />
      )}

      {!isImmersiveChat && workflowStage === 'intake' && (
        <Card className="border border-[#d8d2c8] bg-white shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#7c6f64]">Business profile output</p>
              <h2 className="mt-2 text-xl font-semibold text-[#1f2933]">Your settings are already shaping the planner.</h2>
              <p className="mt-2 text-sm leading-6 text-[#5f6b76]">
                Complete the profile once, then reuse those preferences across AI plans, client guides, and saved session templates.
              </p>
            </div>
            <Link href="/dashboard/settings">
              <Button variant="secondary" className="bg-[#ebe5db] hover:bg-[#ded8ce]">Business profile</Button>
            </Link>
          </div>
          {profileOutputExamples.length > 0 ? (
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              {profileOutputExamples.map(example => (
                <div key={example.label} className="rounded-lg border border-[#e4ded5] bg-[#faf9f6] px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#7c6f64]">{example.label}</p>
                  <p className="mt-2 text-sm font-semibold text-[#1f2933]">{example.source}</p>
                  <p className="mt-2 text-xs leading-5 text-[#5f6b76]">{example.output}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              Add base location, tone, preferred location types, and prep notes to see profile-backed planner examples here.
            </div>
          )}
        </Card>
      )}

      {!isImmersiveChat && workflowStage === 'intake' && (
        <MultiDaySessionConfig
          multiDay={multiDay}
          sessionDates={sessionDates}
          dailyDurationMinutes={dailyDurationMinutes}
          maxTravelMinutesPerDay={maxTravelMinutesPerDay}
          onMultiDayChange={setMultiDay}
          onSessionDatesChange={setSessionDates}
          onDailyDurationChange={setDailyDurationMinutes}
          onMaxTravelChange={setMaxTravelMinutesPerDay}
        />
      )}

      {plannerEntryMode === 'chat' ? (
        <PlannerIntakeCard
          workflowStage={workflowStage}
          shootType={shootType}
          locationMode={locationMode}
          city={city}
          desiredLocationCount={desiredLocationCount}
          businessProfile={businessProfile}
          isGenerating={isGenerating}
          hasPlan={!!plan}
          isChatComplete={isChatComplete}
          isReviewConfirmed={isReviewConfirmed}
          onGeneratePlan={() => void generatePlan()}
          onEditAnswers={editAnswers}
          resumableDraft={resumableDraft}
          onDismissDraft={() => void dismissDraft()}
          onResumeDraft={resumeDraft}
          presets={PLANNER_PRESETS}
          activePresetId={activePresetId}
          onApplyPreset={applyPreset}
          chatStepIndex={boundedChatStepIndex}
          visibleQuestions={visibleQuestions}
          sessionCategory={sessionCategory}
          getAdaptivePrompt={(question, category) => getAdaptivePrompt(question as ChatQuestion, category)}
          getAnswerForQuestion={questionId => getAnswerForQuestion(questionId as ChatQuestionId)}
          activeQuestion={activeQuestion}
          isAiTyping={isAiTyping}
          activePrompt={activePrompt}
          activeProfileTemplates={activeProfileTemplates}
          activeQuickReplies={activeQuickReplies}
          draftAnswer={draftAnswer}
          onDraftAnswerChange={setDraftAnswer}
          activePlaceholder={activePlaceholder}
          onSubmitAnswerValue={submitAnswerValue}
          onSubmitCurrentAnswer={submitCurrentAnswer}
          onGoBackQuestion={goBackQuestion}
          onJumpToQuestion={questionId => jumpToQuestion(questionId as ChatQuestionId)}
          onReviewAnswers={reviewAnswers}
          durationMinutes={durationMinutes}
          expectedShotRange={expectedShotRange}
          draftSaveStatus={draftSaveStatus}
          error={error}
        />
      ) : workflowStage === 'intake' ? (
        <PlannerManualBuilder
          shootType={shootType}
          onShootTypeChange={setShootType}
          locationMode={locationMode}
          onLocationModeChange={value => {
            setLocationMode(value);
            setIsReviewConfirmed(false);
            setPlan(null);
          }}
          city={city}
          onCityChange={setCity}
          providedLocations={providedLocations}
          onProvidedLocationsChange={setProvidedLocations}
          desiredLocationCount={desiredLocationCount}
          onDesiredLocationCountChange={setDesiredLocationCount}
          shootDate={shootDate}
          onShootDateChange={setShootDate}
          duration={duration}
          onDurationChange={setDuration}
          subjectDetails={subjectDetails}
          onSubjectDetailsChange={setSubjectDetails}
          mood={mood}
          onMoodChange={setMood}
          mustHaveShots={mustHaveShots}
          onMustHaveShotsChange={setMustHaveShots}
          constraints={constraints}
          onConstraintsChange={setConstraints}
          isGenerating={isGenerating}
          hasPlan={!!plan}
          onGeneratePlan={() => {
            setChatStepIndex(visibleQuestions.length);
            setIsReviewConfirmed(true);
            void generatePlan();
          }}
        />
      ) : null}

      {isGenerating && !plan && <PlannerGeneratingSkeleton />}

      {plan && workflowStage !== 'intake' && (
        <>
          <PlannerReviewHeaderCard
            projectTitle={plan.projectTitle}
            creativeDirection={plan.creativeDirection}
            workflowStage={workflowStage}
            diagnostics={plan.planningDiagnostics}
            shootType={shootType}
            locationMode={locationMode}
            isEditMode={isEditMode}
            onToggleEditMode={() => setIsEditMode(prev => !prev)}
            isCreatingShareLink={isCreatingShareLink}
            onCreateShareLink={() => void createShareLink()}
            isRevokingShareLink={isRevokingShareLink}
            onRevokeShareLink={() => void revokeShareLink()}
            onDownloadCalendar={downloadCalendarFile}
            canDownloadCalendar={Boolean(shootDate && !Number.isNaN(new Date(shootDate).getTime()))}
            onPrintGuide={openPrintableGuide}
            isRefining={isRefining}
            onRefinePlan={() => void refinePlan()}
            isApplying={isApplying}
            onApplyPlan={() => void applyPlanToWorkspace()}
            planningSourceExplanation={planningSourceExplanation}
            isLoadingIntelligence={isLoadingIntelligence}
            intelligence={intelligence}
            onApplyOptimizedRouteOrder={applyOptimizedRouteOrder}
            shareUrl={shareUrl}
            onCopyShareLink={() => void copyShareLink()}
            shareLinkError={shareLinkError}
            guideActivity={guideActivity}
            candidateLocationCount={candidateLocations.length}
            selectedLocationCount={selectedLocations.length}
            recommendedLocationCount={recommendedLocationCount}
            isRouteConfirmed={isRouteConfirmed}
            onConfirmRoute={() => {
              setShareLinkError('');
              setError(null);
              setIsRouteConfirmed(true);
            }}
            shotCount={displayedShots.length}
            expectedShotRange={expectedShotRange}
            durationMinutes={durationMinutes}
          />

          <PlannerLocationDecisionPanel
            locations={candidateLocations}
            selectedLocationKeys={selectedLocationKeys}
            isRouteConfirmed={isRouteConfirmed}
            onChoosePrimaryLocation={location => {
              setIsRouteConfirmed(false);
              choosePrimaryLocation(location);
              setActiveReviewTab('locations');
            }}
            onConfirmRoute={() => {
              setShareLinkError('');
              setError(null);
              setIsRouteConfirmed(true);
            }}
            onMapMicroSpots={() => setActiveReviewTab('locations')}
            onAskAiForMore={() => void sendPlannerBrainMessage('Find more primary location options like the strongest current candidate, and explain why each fits this client and style.')}
          />

          <Card className="border border-[#d8d2c8] bg-[#111216] text-white shadow-sm">
            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
              <div>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8f95a3]">Planner brain</p>
                    <h2 className="mt-2 text-xl font-semibold text-[#eef1f7]">Keep refining the plan by chat</h2>
                  </div>
                  {lastPlannerBrainChanges.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {lastPlannerBrainChanges.map(section => (
                        <span key={section} className="rounded-full border border-emerald-300/20 bg-emerald-400/10 px-3 py-1 text-xs font-medium text-emerald-100">
                          {section}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="mt-4 max-h-72 space-y-3 overflow-y-auto pr-1">
                  {plannerBrainMessages.slice(-8).map((message, index) => (
                    <div
                      key={`${message.role}-${index}-${message.content.slice(0, 18)}`}
                      className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[86%] rounded-2xl px-4 py-3 text-sm leading-6 ${
                          message.role === 'user'
                            ? 'rounded-tr-md bg-[#2563eb] text-white'
                            : 'rounded-tl-md border border-white/10 bg-white/5 text-[#d7dce7]'
                        }`}
                      >
                        {message.content}
                        {message.changedSections?.length ? (
                          <p className="mt-2 text-[11px] font-medium uppercase tracking-[0.12em] text-[#8f95a3]">
                            Updated: {message.changedSections.join(', ')}
                            {message.source ? ` via ${message.source}` : ''}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  ))}
                  {isPlannerBrainUpdating && (
                    <div className="w-fit rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs text-[#aeb4c0]">
                      Updating the structured plan...
                    </div>
                  )}
                </div>

                <form
                  className="mt-4 rounded-[26px] border border-white/10 bg-[#1f1f20] p-2"
                  onSubmit={event => {
                    event.preventDefault();
                    void sendPlannerBrainMessage();
                  }}
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                    <textarea
                      value={plannerBrainInput}
                      onChange={event => setPlannerBrainInput(event.target.value)}
                      onKeyDown={event => {
                        if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
                          event.preventDefault();
                          void sendPlannerBrainMessage();
                        }
                      }}
                      className="min-h-14 flex-1 resize-none bg-transparent px-4 py-3 text-sm text-[#f4f6fb] outline-none placeholder:text-[#8f95a3]"
                      placeholder="Ask for a planning change..."
                    />
                    <Button
                      type="submit"
                      disabled={isPlannerBrainUpdating || plannerBrainInput.trim().length === 0}
                      className="rounded-full bg-white text-[#111827] hover:bg-[#e6e8ee]"
                    >
                      {isPlannerBrainUpdating ? 'Updating...' : 'Send'}
                    </Button>
                  </div>
                </form>
              </div>

              <div className="space-y-4">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8f95a3]">Live sections</p>
                    <span className="rounded-full border border-white/10 px-2 py-1 text-[11px] text-[#aeb4c0]">
                      {plan.plannerBrain?.currentStage?.replace(/_/g, ' ') || 'review'}
                    </span>
                  </div>
                  <div className="mt-3 space-y-2">
                    {structuredPlanPreview.map(section => (
                      <div key={section.label} className="rounded-xl border border-white/10 bg-[#111216] p-3">
                        <div className="flex items-center justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => setActiveReviewTab(section.tab)}
                            className="text-left text-xs font-semibold uppercase tracking-[0.14em] text-[#8f95a3] hover:text-white"
                          >
                            {section.label}
                          </button>
                          <button
                            type="button"
                            disabled={isPlannerBrainUpdating || isRegenerating !== 'idle'}
                            onClick={() => {
                              setActiveReviewTab(section.tab);
                              if (section.label === 'Shot list') {
                                void regenerateSection('shot-list');
                              } else if (section.label === 'Sun/weather') {
                                void sendPlannerBrainMessage('Optimize this plan around the current sun and weather constraints.');
                              } else if (section.label === 'Client guide') {
                                void sendPlannerBrainMessage('Make the client guide warmer, clearer, and more reassuring.');
                              } else if (section.label === 'Chosen location') {
                                setIsRouteConfirmed(true);
                              } else if (section.label === 'Brief') {
                                setIsEditMode(true);
                              }
                            }}
                            className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[11px] font-semibold text-[#d7dce7] hover:border-white/25 disabled:opacity-50"
                          >
                            {section.action}
                          </button>
                        </div>
                        <p className="mt-2 line-clamp-2 text-xs leading-5 text-[#d7dce7]">{section.value}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  {[
                    'Make this easier for toddlers',
                    'Build this around only one spot',
                    'Add more editorial poses',
                    'Move hero portraits later for golden hour',
                    'Make the client guide sound warmer',
                  ].map(prompt => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => void sendPlannerBrainMessage(prompt)}
                      disabled={isPlannerBrainUpdating}
                      className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left text-sm font-medium text-[#d7dce7] transition hover:border-white/25 hover:bg-white/10 disabled:opacity-50"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>

                {plannerPlanVersions.length > 0 && (
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8f95a3]">Version history</p>
                    <div className="mt-3 space-y-2">
                      {plannerPlanVersions.slice(0, 3).map(version => (
                        <div key={version.id} className="rounded-xl border border-white/10 bg-[#111216] p-3">
                          <p className="line-clamp-1 text-xs font-semibold text-[#eef1f7]">{version.message}</p>
                          <p className="mt-1 text-[11px] text-[#8f95a3]">
                            {version.changedSections.join(', ') || 'brief'}
                          </p>
                          <button
                            type="button"
                            onClick={() => restorePlannerVersion(version)}
                            className="mt-2 rounded-full border border-white/10 px-3 py-1 text-[11px] font-semibold text-[#d7dce7] hover:border-white/25"
                          >
                            Restore before
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Card>

          {/* Show refinement incentive when plan is fresh (no refinements yet) */}
          {workflowStage === 'review' && !plan.locationRefinements?.length && (
            <RefinementIncentiveBanner
              isRefining={isRefining}
              onRefinePlan={() => void refinePlan()}
            />
          )}

          <Card>
            <PlannerReviewTabs
              tabs={reviewTabItems}
              activeReviewTab={activeReviewTab}
              activeMobileReviewTab={activeMobileReviewTab}
              onSelectTab={setActiveReviewTab}
              onToggleMobileTab={toggleMobileReviewTab}
              feedbackSaveStatus={feedbackSaveStatus}
              renderMobileContent={reviewTab => (
                <PlannerMobileReviewContent
                  reviewTab={reviewTab}
                  mapContent={
                    <PlannerLocationMap
                      locations={displayedLocations}
                      selectedLocationName={effectiveSelectedReviewLocationName}
                      onSelectLocation={setSelectedReviewLocationName}
                    />
                  }
                  selectedLocation={selectedReviewLocation}
                  locations={candidateLocations}
                  emptyLocationMessage={emptyLocationMessage}
                  locationVotes={locationVotes}
                  selectedLocationKeys={selectedLocationKeys}
                  selectedLocationCount={selectedLocations.length}
                  recommendedLocationCount={recommendedLocationCount}
                  preferredVenueBucket={preferredVenueBucket}
                  excludedVenueBuckets={excludedVenueBuckets}
                  logisticsLookup={logisticsLookup}
                  onToggleSelectedLocation={location => {
                    setIsRouteConfirmed(false);
                    toggleSelectedLocation(location, recommendedLocationCount);
                  }}
                  onClearSelectedLocations={() => {
                    setIsRouteConfirmed(false);
                    clearSelectedLocations();
                  }}
                  onVoteLocation={setLocationVote}
                  onTogglePreferredVenueBucket={togglePreferredVenueBucket}
                  onToggleExcludedVenueBucket={toggleExcludedVenueBucket}
                  emptyShotMessage={emptyShotMessage}
                  shots={displayedShots}
                  timeline={plan.timeline}
                  intelligence={intelligence}
                  photographerSunWeatherNotes={plan.photographerPlan?.sunWeatherNotes}
                  checklist={plan.clientPrepChecklist}
                  contingencyPlans={plan.contingencyPlans}
                />
              )}
              desktopContent={(
                <PlannerDesktopReviewContent
                  activeReviewTab={activeReviewTab}
                  mapContent={(
                    <PlannerLocationMap
                      locations={displayedLocations}
                      selectedLocationName={effectiveSelectedReviewLocationName}
                      onSelectLocation={setSelectedReviewLocationName}
                    />
                  )}
                  locations={candidateLocations}
                  selectedLocation={selectedReviewLocation}
                  onSelectLocation={setSelectedReviewLocationName}
                  emptyLocationMessage={emptyLocationMessage}
                  locationVotes={locationVotes}
                  selectedLocationKeys={selectedLocationKeys}
                  selectedLocationCount={selectedLocations.length}
                  recommendedLocationCount={recommendedLocationCount}
                  preferredVenueBucket={preferredVenueBucket}
                  excludedVenueBuckets={excludedVenueBuckets}
                  logisticsLookup={logisticsLookup}
                  locationRefinements={plan.locationRefinements}
                  onToggleSelectedLocation={location => {
                    setIsRouteConfirmed(false);
                    toggleSelectedLocation(location, recommendedLocationCount);
                  }}
                  onClearSelectedLocations={() => {
                    setIsRouteConfirmed(false);
                    clearSelectedLocations();
                  }}
                  onVoteLocation={setLocationVote}
                  onTogglePreferredVenueBucket={togglePreferredVenueBucket}
                  onToggleExcludedVenueBucket={toggleExcludedVenueBucket}
                  onAddMicroLocation={addMicroLocation}
                  onUpdateMicroLocation={updateMicroLocation}
                  onRemoveMicroLocation={removeMicroLocation}
                  onMoveMicroLocation={moveMicroLocation}
                  onSuggestMicroLocations={suggestMicroLocations}
                  displayedShots={displayedShots}
                  allShots={plan.shotList}
                  emptyShotMessage={emptyShotMessage}
                  isEditMode={isEditMode}
                  isShotListRegenerating={isRegenerating === 'shot-list'}
                  onRegenerateShotList={() => regenerateSection('shot-list')}
                  onUpdateShotField={updateShotField}
                  timeline={plan.timeline}
                  intelligence={intelligence}
                  photographerSunWeatherNotes={plan.photographerPlan?.sunWeatherNotes}
                  isTimelineRegenerating={isRegenerating === 'timeline'}
                  onRegenerateTimeline={() => regenerateSection('timeline')}
                  onOptimizeSunWeather={() => void sendPlannerBrainMessage('Optimize the timeline and shot cards around current sun and weather data. Move must-have portraits, backups, close-ups, and hero frames to the best windows.')}
                  onUpdateTimelineField={updateTimelineField}
                  checklist={plan.clientPrepChecklist}
                  contingencyPlans={plan.contingencyPlans}
                  onUpdateChecklistItem={updateChecklistItem}
                  onUpdateContingencyItem={updateContingencyItem}
                />
              )}
            />
          </Card>

          <div className="sticky bottom-3 z-10 md:hidden">
            <div className="rounded-2xl border border-gray-200 bg-white/95 p-3 shadow-lg backdrop-blur">
              <div className="grid gap-2 sm:grid-cols-2">
                <Button
                  variant="ghost"
                  isLoading={isRefining}
                  disabled={isRefining || isApplying}
                  onClick={() => void refinePlan()}
                >
                  {isRefining ? 'Refining...' : 'Refine'}
                </Button>
                <Button
                  variant="secondary"
                  isLoading={isApplying}
                  disabled={isRefining || isApplying}
                  onClick={() => void applyPlanToWorkspace()}
                >
                  {isApplying ? 'Applying...' : 'Create Project'}
                </Button>
              </div>
              {applyProgress && (
                <div className="mt-2">
                  <div className="mb-1 flex justify-between text-xs text-gray-500">
                    <span>{applyProgress.label}</span>
                    <span>{applyProgress.done}/{applyProgress.total}</span>
                  </div>
                  <ProgressBar
                    percent={Math.round((applyProgress.done / Math.max(applyProgress.total, 1)) * 100)}
                  />
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
