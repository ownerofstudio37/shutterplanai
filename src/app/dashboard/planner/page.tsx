'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { PlannerWorkflowStages } from '@/components/planner/PlannerWorkflowStages';
import { PlannerIntakeCard } from '@/components/planner/PlannerIntakeCard';
import { PlannerReviewHeaderCard } from '@/components/planner/PlannerReviewHeaderCard';
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
  type LocationRefinement,
  type LocationMode,
  type ChatQuestion,
  type ChatQuestionId,
  type SessionCategory,
  type BusinessProfile,
  type PlannerPreset,
  type PlannerDraftState,
  type PlannerDraft,
  type PlannerIntelligence,
  type ReviewTab,
  type LocationVote,
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

function getAuthHeader() {
  const token = tokenUtils.getToken();
  const headers: Record<string, string> = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

const PlannerLocationMap = dynamic(() => import('@/components/map/PlannerLocationMap'), {
  ssr: false,
  loading: () => (
    <div className="flex h-90 items-center justify-center rounded-xl border border-gray-200 bg-gray-100 text-sm text-gray-600">
      Loading map review...
    </div>
  ),
});

export default function PlannerPage() {
  const router = useRouter();

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
  const [familyPacing, setFamilyPacing] = useState('');
  const [engagementStory, setEngagementStory] = useState('');
  const [brandingGoals, setBrandingGoals] = useState('');
  const [eventPriorities, setEventPriorities] = useState('');
  const [chatStepIndex, setChatStepIndex] = useState(0);
  const [draftAnswer, setDraftAnswer] = useState('');
  const [isReviewConfirmed, setIsReviewConfirmed] = useState(false);
  const [businessProfile, setBusinessProfile] = useState<BusinessProfile | null>(null);
  const [billingUsage, setBillingUsage] = useState<BillingUsageSummary | null>(null);
  const [activeReviewTab, setActiveReviewTab] = useState<ReviewTab>('map');
  const [locationVotes, setLocationVotes] = useState<Record<string, LocationVote>>({});
  const [preferredVenueBucket, setPreferredVenueBucket] = useState<string | null>(null);
  const [excludedVenueBuckets, setExcludedVenueBuckets] = useState<string[]>([]);
  const [isAiTyping, setIsAiTyping] = useState(false);
  const [activePresetId, setActivePresetId] = useState<string | null>(null);
  const [activeMobileReviewTab, setActiveMobileReviewTab] = useState<ReviewTab | null>('map');
  const [selectedReviewLocationName, setSelectedReviewLocationName] = useState<string | null>(null);

  const [plan, setPlan] = useState<SessionPlan | null>(null);
  const [error, setRawError] = useState<PlannerErrorInfo | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Helper: classify raw error string before storing
  const setError = (raw: string | null) => setRawError(raw ? classifyPlannerError(raw) : null);
  const [isRefining, setIsRefining] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [applyProgress, setApplyProgress] = useState<{ done: number; total: number; label: string } | null>(null);
  const [feedbackSaveStatus, setFeedbackSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [isRegenerating, setIsRegenerating] = useState<'idle' | 'locations' | 'shot-list' | 'timeline'>('idle');
  const [draftId, setDraftId] = useState<string>('');
  const [draftSaveStatus, setDraftSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [draftBootstrapComplete, setDraftBootstrapComplete] = useState(false);
  const [resumableDraft, setResumableDraft] = useState<PlannerDraft | null>(null);
  const [intelligence, setIntelligence] = useState<PlannerIntelligence | null>(null);
  const [isLoadingIntelligence, setIsLoadingIntelligence] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isCreatingShareLink, setIsCreatingShareLink] = useState(false);
  const [isRevokingShareLink, setIsRevokingShareLink] = useState(false);
  const [shareUrl, setShareUrl] = useState<string>('');
  const [shareToken, setShareToken] = useState<string>('');
  const [shareLinkError, setShareLinkError] = useState<string>('');

  // V2: multi-day state
  const [multiDay, setMultiDay] = useState(false);
  const [sessionDates, setSessionDates] = useState<string[]>([]);
  const [dailyDurationMinutes, setDailyDurationMinutes] = useState<number | undefined>(undefined);
  const [maxTravelMinutesPerDay, setMaxTravelMinutesPerDay] = useState<number | undefined>(undefined);

  const durationMinutes = useMemo(() => parseDurationMinutes(duration), [duration]);
  const expectedShotRange = useMemo(() => getExpectedShotRange(durationMinutes), [durationMinutes]);
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

  useEffect(() => {
    if (chatStepIndex > visibleQuestions.length) {
      setChatStepIndex(visibleQuestions.length);
    }
  }, [chatStepIndex, visibleQuestions.length]);

  const getAnswerForQuestion = (id: ChatQuestionId) => {
    switch (id) {
      case 'shootType':
        return shootType;
      case 'locationMode':
        return locationMode === 'find-locations' ? 'Find locations for me' : 'I already have locations';
      case 'providedLocations':
        return providedLocations;
      case 'city':
        return city;
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
  };

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

  const activeQuestion = visibleQuestions[chatStepIndex] ?? null;
  const activePrompt = activeQuestion ? getAdaptivePrompt(activeQuestion, sessionCategory) : '';
  const activePlaceholder = activeQuestion ? getAdaptivePlaceholder(activeQuestion, sessionCategory) : '';
  const activeQuickReplies = activeQuestion ? getQuickReplyOptions(activeQuestion, sessionCategory) : [];
  const activeProfileTemplates = activeQuestion
    ? getBusinessProfileTemplates(activeQuestion, sessionCategory, businessProfile)
    : [];
  const isChatComplete = chatStepIndex >= visibleQuestions.length;
  const workflowStage: WorkflowStage = plan ? (isApplying ? 'apply' : 'review') : 'intake';

  const buildCurrentDraft = (currentDraftId: string): PlannerDraft => ({
    id: currentDraftId,
    status: workflowStage === 'apply' ? 'applying' : workflowStage,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    planState: {
      shootType,
      city,
      duration,
      mood,
      subjectDetails,
      mustHaveShots,
      constraints,
      locationMode,
      providedLocations,
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
  });

  const hydrateFromDraft = (draft: PlannerDraft) => {
    const draftState = draft.planState;
    const mode = draftState.locationMode ?? 'find-locations';
    const nextCategory = getSessionCategory(draftState.shootType || 'Family Session');
    const nextVisibleQuestions = CHAT_QUESTIONS.filter(
      question => !question.showWhen || question.showWhen(mode, nextCategory)
    );

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
    setPlan(null);
    setError(null);
    setIsReviewConfirmed(true);
    setChatStepIndex(nextVisibleQuestions.length);
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

  useEffect(() => {
    if (!activeQuestion) {
      setDraftAnswer('');
      return;
    }
    setDraftAnswer(getAnswerForQuestion(activeQuestion.id));
  }, [activeQuestion]);

  useEffect(() => {
    if (!activeQuestion || isChatComplete) {
      setIsAiTyping(false);
      return;
    }

    setIsAiTyping(true);
    const timer = window.setTimeout(() => setIsAiTyping(false), 450);
    return () => window.clearTimeout(timer);
  }, [activeQuestion, isChatComplete]);

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
    });
  }, [loadBillingUsage]);

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

    const mapServerDraft = (row: Record<string, unknown>): PlannerDraft | null => {
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
          const serverDraft = mapServerDraft(result.data[0]);
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

    const resolvedDraftId = draftId || `draft-${globalThis.crypto?.randomUUID?.() || Date.now()}`;
    if (!draftId) {
      setDraftId(resolvedDraftId);
    }

    const draftPayload = buildCurrentDraft(resolvedDraftId);
    const normalizedDraftPayload: PlannerDraft = {
      ...draftPayload,
      status: workflowStage === 'apply' ? 'applying' : workflowStage,
      updatedAt: new Date().toISOString(),
    };

    localStorage.setItem(PLANNER_DRAFT_STORAGE_KEY, JSON.stringify(normalizedDraftPayload));
    setDraftSaveStatus('saving');

    const timer = window.setTimeout(async () => {
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
    draftBootstrapComplete,
    draftId,
    workflowStage,
    shootType,
    city,
    duration,
    mood,
    subjectDetails,
    mustHaveShots,
    constraints,
    locationMode,
    providedLocations,
    familyPacing,
    engagementStory,
    brandingGoals,
    eventPriorities,
    shootDate,
    multiDay,
    sessionDates,
    dailyDurationMinutes,
    maxTravelMinutesPerDay,
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

  const locationIndex = useMemo(() => {
    const map = new Map<string, SessionPlanLocation>();
    (plan?.locationSuggestions ?? []).forEach(location => {
      map.set(location.name.toLowerCase(), location);
    });
    return map;
  }, [plan]);

  const refinementIndex = useMemo(() => {
    const map = new Map<string, LocationRefinement>();
    (plan?.locationRefinements ?? []).forEach(refinement => {
      map.set(refinement.name.toLowerCase(), refinement);
    });
    return map;
  }, [plan]);

  const routeRankLookup = useMemo(() => {
    const map = new Map<string, number>();
    if (!plan || !intelligence?.optimizedRoute) return map;

    intelligence.optimizedRoute.forEach((originalIndex, optimizedIndex) => {
      const location = plan.locationSuggestions[originalIndex];
      if (!location) return;
      map.set((location.displayName || location.name).toLowerCase(), optimizedIndex);
    });

    return map;
  }, [intelligence?.optimizedRoute, plan]);

  const logisticsLookup = useMemo(() => {
    const map = new Map<string, PlannerIntelligence['logistics'][number]>();
    if (!plan || !intelligence?.logistics) return map;

    plan.locationSuggestions.forEach((location, index) => {
      const logistics = intelligence.logistics[index];
      if (!logistics) return;
      map.set((location.displayName || location.name).toLowerCase(), logistics);
    });

    return map;
  }, [intelligence?.logistics, plan]);

  const displayedLocations = useMemo(() => {
    const locations = [...(plan?.locationSuggestions ?? [])];

    return locations
      .filter(location => !location.venueBucket || !excludedVenueBuckets.includes(location.venueBucket))
      .sort((a, b) => {
        const aKey = (a.displayName || a.name).toLowerCase();
        const bKey = (b.displayName || b.name).toLowerCase();
        const aVote = locationVotes[aKey];
        const bVote = locationVotes[bKey];
        const aPreferred = preferredVenueBucket && a.venueBucket === preferredVenueBucket ? 1 : 0;
        const bPreferred = preferredVenueBucket && b.venueBucket === preferredVenueBucket ? 1 : 0;
        const aVoteScore = aVote === 'up' ? 1 : aVote === 'down' ? -1 : 0;
        const bVoteScore = bVote === 'up' ? 1 : bVote === 'down' ? -1 : 0;
        const aRouteRank = routeRankLookup.get(aKey);
        const bRouteRank = routeRankLookup.get(bKey);

        if (aPreferred !== bPreferred) return bPreferred - aPreferred;
        if (aVoteScore !== bVoteScore) return bVoteScore - aVoteScore;
        if (typeof aRouteRank === 'number' && typeof bRouteRank === 'number' && aRouteRank !== bRouteRank) {
          return aRouteRank - bRouteRank;
        }
        return (b.confidenceScore ?? 0) - (a.confidenceScore ?? 0);
      });
  }, [excludedVenueBuckets, locationVotes, plan?.locationSuggestions, preferredVenueBucket, routeRankLookup]);

  const displayedLocationNames = useMemo(
    () => new Set(displayedLocations.map(location => (location.displayName || location.name).toLowerCase())),
    [displayedLocations]
  );

  const displayedShots = useMemo(() => {
    const shots = plan?.shotList ?? [];
    if (displayedLocationNames.size === 0) return shots;

    const filtered = shots.filter(shot => displayedLocationNames.has((shot.location || '').toLowerCase()));
    return filtered.length > 0 ? filtered : shots;
  }, [displayedLocationNames, plan?.shotList]);

  const selectedReviewLocation = useMemo(() => {
    if (!selectedReviewLocationName) return displayedLocations[0] ?? null;

    return (
      displayedLocations.find(location => (location.displayName || location.name) === selectedReviewLocationName) ??
      displayedLocations[0] ??
      null
    );
  }, [displayedLocations, selectedReviewLocationName]);

  useEffect(() => {
    if (displayedLocations.length === 0) {
      setSelectedReviewLocationName(null);
      return;
    }

    const hasSelectedLocation = displayedLocations.some(
      location => (location.displayName || location.name) === selectedReviewLocationName
    );

    if (!hasSelectedLocation) {
      setSelectedReviewLocationName(displayedLocations[0].displayName || displayedLocations[0].name);
    }
  }, [displayedLocations, selectedReviewLocationName]);

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

      setActiveReviewTab('map');
      setActiveMobileReviewTab('map');
      setLocationVotes({});
      setPreferredVenueBucket(null);
      setExcludedVenueBuckets([]);
      setSelectedReviewLocationName(null);
      setPlan(result.data ?? null);
      void (async () => {
        await trackPlannerEvent('planner_generate_success', {
          sessionCategory,
          locationMode,
          locationCount: result.data?.locationSuggestions?.length ?? 0,
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
          sessionId: `${shootType}-${city}-${Date.now()}`,
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

  const applyPlanToWorkspace = async () => {
    if (!plan) return;

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
          title: plan.projectTitle,
          description: `${plan.creativeDirection}\n\nDuration: ${duration || 'Not specified'}\nConstraints: ${constraints || 'None'}`,
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
      const totalShots = plan.shotList.length;
      setApplyProgress({ done: 0, total: totalShots, label: `Saving shot 1 of ${totalShots}…` });

      for (const shot of plan.shotList) {
        const location = locationIndex.get((shot.location || '').toLowerCase());
        const refinement = refinementIndex.get((shot.location || '').toLowerCase());
        const sanitizedCoordinates = sanitizeCoordinates(
          shot.latitude ?? location?.latitude ?? null,
          shot.longitude ?? location?.longitude ?? null
        );

        const notes = [
          shot.notes,
          `Pose suggestion: ${shot.poseSuggestion}`,
          `Composition: ${shot.compositionSuggestion}`,
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
      setDraftId('');
      void trackPlannerEvent('planner_apply_success', {
        createdShots,
        failedShots: failedShots.length,
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
    setChatStepIndex(nextIndex);
  };

  const submitAnswerValue = (value: string) => {
    if (!activeQuestion) return;
    setDraftAnswer(value);
    setError(null);
    setAnswerForQuestion(activeQuestion.id, value);
    setChatStepIndex(prev => Math.min(prev + 1, visibleQuestions.length));
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
    setChatStepIndex(prev => Math.max(0, prev - 1));
  };

  const reviewAnswers = () => {
    setError(null);
    setIsReviewConfirmed(true);
  };

  const editAnswers = () => {
    setError(null);
    setPlan(null);
    setIsReviewConfirmed(false);
    setChatStepIndex(Math.max(0, visibleQuestions.length - 1));
  };

  const setLocationVote = useCallback((location: SessionPlanLocation, vote: LocationVote) => {
    const key = (location.displayName || location.name).toLowerCase();
    setLocationVotes(prev => {
      if (prev[key] === vote) {
        const next = { ...prev };
        delete next[key];
        return next;
      }

      return {
        ...prev,
        [key]: vote,
      };
    });
  }, []);

  const togglePreferredVenueBucket = useCallback((venueBucket?: string) => {
    if (!venueBucket) return;
    setPreferredVenueBucket(prev => (prev === venueBucket ? null : venueBucket));
  }, []);

  const toggleExcludedVenueBucket = useCallback((venueBucket?: string) => {
    if (!venueBucket) return;
    setExcludedVenueBuckets(prev =>
      prev.includes(venueBucket) ? prev.filter(item => item !== venueBucket) : [...prev, venueBucket]
    );
  }, []);

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
    { id: 'intake', label: '1. Intake', description: 'Answer the planning chat' },
    { id: 'review', label: '2. Plan Review', description: 'Inspect locations and shot flow' },
    { id: 'apply', label: '3. Apply to Project', description: 'Create your project and shot list' },
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
  }, [plan?.planningDiagnostics?.locationSource]);

  const emptyLocationMessage = useMemo(() => {
    if (displayedLocations.length > 0) return null;
    if ((plan?.locationSuggestions?.length ?? 0) === 0) {
      return 'No locations made it into the current plan. Try broadening the area, using a ZIP, or switching to provided locations.';
    }
    if (excludedVenueBuckets.length > 0) {
      return 'All current locations are hidden by your excluded type filters. Re-enable a venue type to see them again.';
    }
    return 'No locations match the current review filters. Clear preferences or regenerate for a broader set.';
  }, [displayedLocations.length, excludedVenueBuckets.length, plan?.locationSuggestions?.length]);

  const emptyShotMessage = useMemo(() => {
    if (displayedShots.length > 0) return null;
    if ((plan?.shotList?.length ?? 0) === 0) {
      return 'No shots were generated for this plan yet. Regenerate the plan or refine it after locations are confirmed.';
    }
    return 'No shots match the currently visible locations. Re-enable a location type or regenerate the plan.';
  }, [displayedShots.length, plan?.shotList?.length]);

  const toggleMobileReviewTab = useCallback((tab: ReviewTab) => {
    setActiveMobileReviewTab(prev => (prev === tab ? null : tab));
    setActiveReviewTab(tab);
  }, []);

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
    setFeedbackSaveStatus('saved');
    setTimeout(() => setFeedbackSaveStatus('idle'), 1200);
    void trackPlannerEvent('planner_route_optimized', {
      locationCount: reorderedLocations.length,
    });
  };

  const updateLocationField = (index: number, field: keyof SessionPlanLocation, value: string) => {
    setPlan(prev => {
      if (!prev) return prev;
      const nextLocations = [...prev.locationSuggestions];
      const target = nextLocations[index];
      if (!target) return prev;
      nextLocations[index] = { ...target, [field]: value };
      return { ...prev, locationSuggestions: nextLocations };
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

  const createShareLink = async () => {
    if (!plan) return;

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
      const response = await fetch('/api/planner/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
        body: JSON.stringify({
          plan,
          planMetadata: {
            shootType,
            city,
            duration,
            mood,
            shootDate,
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

  const reviewTabItems: Array<{ id: ReviewTab; label: string }> = [
    { id: 'map', label: `Map (${displayedLocations.filter(location => location.latitude != null && location.longitude != null).length})` },
    { id: 'locations', label: `Locations (${displayedLocations.length})` },
    { id: 'shot-list', label: `Shot List (${displayedShots.length})` },
    { id: 'timeline', label: `Timeline (${plan?.timeline.length ?? 0})` },
    { id: 'prep', label: 'Prep + Backup' },
  ];

  return (
    <div className="space-y-6">
      <PlannerWorkflowStages stages={workflowStages} currentStage={workflowStage} hasPlan={!!plan} />

      {billingUsage && isFreeTier && (
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
        </Card>
      )}

      {workflowStage === 'intake' && (
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

      {workflowStage === 'intake' && (
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

      <PlannerIntakeCard
        workflowStage={workflowStage}
        shootType={shootType}
        locationMode={locationMode}
        city={city}
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
        chatStepIndex={chatStepIndex}
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
            shotCount={plan.shotList.length}
            expectedShotRange={expectedShotRange}
            durationMinutes={durationMinutes}
          />

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
                      selectedLocationName={selectedReviewLocationName}
                      onSelectLocation={setSelectedReviewLocationName}
                    />
                  }
                  selectedLocation={selectedReviewLocation}
                  locations={displayedLocations}
                  emptyLocationMessage={emptyLocationMessage}
                  locationVotes={locationVotes}
                  preferredVenueBucket={preferredVenueBucket}
                  excludedVenueBuckets={excludedVenueBuckets}
                  logisticsLookup={logisticsLookup}
                  onVoteLocation={setLocationVote}
                  onTogglePreferredVenueBucket={togglePreferredVenueBucket}
                  onToggleExcludedVenueBucket={toggleExcludedVenueBucket}
                  emptyShotMessage={emptyShotMessage}
                  shots={displayedShots}
                  timeline={plan.timeline}
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
                      selectedLocationName={selectedReviewLocationName}
                      onSelectLocation={setSelectedReviewLocationName}
                    />
                  )}
                  locations={displayedLocations}
                  selectedLocation={selectedReviewLocation}
                  onSelectLocation={setSelectedReviewLocationName}
                  emptyLocationMessage={emptyLocationMessage}
                  locationVotes={locationVotes}
                  preferredVenueBucket={preferredVenueBucket}
                  excludedVenueBuckets={excludedVenueBuckets}
                  logisticsLookup={logisticsLookup}
                  locationRefinements={plan.locationRefinements}
                  onVoteLocation={setLocationVote}
                  onTogglePreferredVenueBucket={togglePreferredVenueBucket}
                  onToggleExcludedVenueBucket={toggleExcludedVenueBucket}
                  displayedShots={displayedShots}
                  allShots={plan.shotList}
                  emptyShotMessage={emptyShotMessage}
                  isEditMode={isEditMode}
                  isShotListRegenerating={isRegenerating === 'shot-list'}
                  onRegenerateShotList={() => regenerateSection('shot-list')}
                  onUpdateShotField={updateShotField}
                  timeline={plan.timeline}
                  isTimelineRegenerating={isRegenerating === 'timeline'}
                  onRegenerateTimeline={() => regenerateSection('timeline')}
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
