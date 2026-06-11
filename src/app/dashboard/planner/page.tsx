'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { tokenUtils } from '@/lib/auth';

interface SessionPlanLocation {
  name: string;
  whyItWorks: string;
  microLocations: string[];
  selectionReasons?: string[];
  confidenceScore?: number;
  venueBucket?: string;
  sourceQuery?: string;
  latitude?: number | null;
  longitude?: number | null;
  displayName?: string;
  googleMapsUrl?: string;
  logistics: {
    parking: string;
    restroom: string;
    walkingDistance: string;
  };
}

interface SessionPlanTimelineItem {
  timeBlock: string;
  focus: string;
  notes: string;
}

interface SessionPlanShot {
  title: string;
  description: string;
  location: string;
  microSpot: string;
  poseSuggestion: string;
  compositionSuggestion: string;
  timingHint: string;
  notes: string;
  latitude?: number | null;
  longitude?: number | null;
  geocodedLocationName?: string | null;
}

interface SessionPlan {
  projectTitle: string;
  creativeDirection: string;
  timeline: SessionPlanTimelineItem[];
  locationSuggestions: SessionPlanLocation[];
  shotList: SessionPlanShot[];
  clientPrepChecklist: string[];
  contingencyPlans: string[];
  locationRefinements?: LocationRefinement[];
  planningDiagnostics?: {
    locationCandidateCount: number;
    locationSource: 'grounded-candidates' | 'fallback-geocode' | 'city-fallback' | 'user-provided';
    resolvedCity: string;
    usedAccountFallbackCity: boolean;
    usedBusinessZipDisambiguation?: boolean;
    businessGeoAnchorSource?: string;
  };
}

type LocationMode = 'find-locations' | 'use-provided';
type ChatQuestionId =
  | 'shootType'
  | 'locationMode'
  | 'providedLocations'
  | 'city'
  | 'subjectDetails'
  | 'familyPacing'
  | 'engagementStory'
  | 'brandingGoals'
  | 'eventPriorities'
  | 'shootDate'
  | 'duration'
  | 'mood'
  | 'mustHaveShots'
  | 'constraints';

type ChatQuestion = {
  id: ChatQuestionId;
  prompt: string;
  placeholder?: string;
  options?: string[];
  required?: boolean;
  showWhen?: (mode: LocationMode, sessionCategory: SessionCategory) => boolean;
};

type SessionCategory = 'family' | 'engagement' | 'portrait' | 'event';

interface LocationRefinement {
  name: string;
  kidFriendlinessScore: number;
  crowdRiskScore: number;
  walkingBurdenScore: number;
  overallScore: number;
  bestTimeWindow: string;
  rationale: string;
  recommendedMicroSpots: string[];
}

function getAuthHeader() {
  const token = tokenUtils.getToken();
  const headers: Record<string, string> = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function sanitizeCoordinates(latitude: unknown, longitude: unknown) {
  const lat = typeof latitude === 'number' ? latitude : Number(latitude);
  const lng = typeof longitude === 'number' ? longitude : Number(longitude);

  const hasFinite = Number.isFinite(lat) && Number.isFinite(lng);
  if (!hasFinite) {
    return { latitude: null, longitude: null };
  }

  const isWithinBounds = lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
  const isLikelyNullIsland = Math.abs(lat) < 0.05 && Math.abs(lng) < 0.05;

  if (!isWithinBounds || isLikelyNullIsland) {
    return { latitude: null, longitude: null };
  }

  return { latitude: lat, longitude: lng };
}

function parseDurationMinutes(durationValue: string): number {
  const value = durationValue.toLowerCase().trim();
  if (!value) return 90;

  const hourMatch = value.match(/(\d+(?:\.\d+)?)\s*(h|hr|hrs|hour|hours)/);
  const minuteMatch = value.match(/(\d+)\s*(m|min|mins|minute|minutes)/);

  const hours = hourMatch ? Number(hourMatch[1]) : 0;
  const minutes = minuteMatch ? Number(minuteMatch[1]) : 0;
  const combined = Math.round(hours * 60 + minutes);
  if (combined > 0) return Math.max(20, Math.min(240, combined));

  const numericOnly = Number(value.replace(/[^0-9]/g, ''));
  if (Number.isFinite(numericOnly) && numericOnly > 0) {
    return Math.max(20, Math.min(240, numericOnly));
  }

  return 90;
}

function getExpectedShotRange(durationMinutes: number) {
  if (durationMinutes <= 35) return { min: 5, max: 8 };
  if (durationMinutes <= 60) return { min: 7, max: 11 };
  if (durationMinutes <= 90) return { min: 9, max: 14 };
  return { min: 12, max: 18 };
}

const CHAT_QUESTIONS: ChatQuestion[] = [
  {
    id: 'shootType',
    prompt: 'What type of shoot are you planning?',
    options: ['Family Session', 'Engagement Session', 'Branding Session', 'Portrait Session', 'Event Session'],
    required: true,
  },
  {
    id: 'locationMode',
    prompt: 'Do you want me to find locations, or are your locations already selected?',
    options: ['Find locations for me', 'I already have locations'],
    required: true,
  },
  {
    id: 'providedLocations',
    prompt: 'List your chosen locations (comma-separated).',
    placeholder: 'Example: Trinity River Greenbelt, White Rock Lake, Historic Downtown Square',
    showWhen: mode => mode === 'use-provided',
    required: true,
  },
  {
    id: 'city',
    prompt: 'What city/area should I center the plan around?',
    placeholder: 'Dallas, TX',
    showWhen: mode => mode === 'find-locations',
  },
  {
    id: 'subjectDetails',
    prompt: 'Who is being photographed?',
    placeholder: '5 people, 2 toddlers, grandparents included',
    required: true,
  },
  {
    id: 'familyPacing',
    prompt: 'Anything about kids attention span or family pacing I should optimize for?',
    placeholder: 'Need fast transitions, one child gets tired after 30 minutes',
    showWhen: (_mode, category) => category === 'family',
  },
  {
    id: 'engagementStory',
    prompt: 'Anything meaningful about the couple or proposal story to reflect?',
    placeholder: 'Proposed at a lake at sunset, want that vibe reflected',
    showWhen: (_mode, category) => category === 'engagement',
  },
  {
    id: 'brandingGoals',
    prompt: 'What brand outcomes should this session create?',
    placeholder: 'Website hero images, speaking profile photos, social content batch',
    showWhen: (_mode, category) => category === 'portrait',
  },
  {
    id: 'eventPriorities',
    prompt: 'What are the event priorities and non-negotiable moments?',
    placeholder: 'Speaker on stage, sponsor signage, audience reactions, networking',
    showWhen: (_mode, category) => category === 'event',
  },
  {
    id: 'shootDate',
    prompt: 'When is the shoot? (optional)',
    placeholder: '2026-06-28 6:30 PM',
  },
  {
    id: 'duration',
    prompt: 'How long is the session?',
    placeholder: '60 minutes',
    required: true,
  },
  {
    id: 'mood',
    prompt: 'What mood/style do you want?',
    placeholder: 'Warm, candid, storytelling',
    required: true,
  },
  {
    id: 'mustHaveShots',
    prompt: 'Any must-have shots?',
    placeholder: 'Whole family portrait, siblings, parents together',
  },
  {
    id: 'constraints',
    prompt: 'Any constraints I should plan around?',
    placeholder: 'Mobility, weather risk, permit limits, short toddler attention span',
  },
];

function getSessionCategory(shootTypeValue: string): SessionCategory {
  const value = shootTypeValue.toLowerCase();
  if (/family|newborn|maternity|kids|children/.test(value)) return 'family';
  if (/engagement|proposal|couple|anniversary/.test(value)) return 'engagement';
  if (/branding|brand|headshot|personal brand/.test(value)) return 'portrait';
  if (/event|wedding|party|corporate/.test(value)) return 'event';
  return 'portrait';
}

function getAdaptivePrompt(question: ChatQuestion, sessionCategory: SessionCategory) {
  if (question.id === 'subjectDetails') {
    if (sessionCategory === 'family') return 'Who is being photographed (ages, family members, any kids)?';
    if (sessionCategory === 'engagement') return 'Tell me about the couple and any important story context.';
    if (sessionCategory === 'event') return 'Who are the key people and moments to prioritize?';
  }

  if (question.id === 'mustHaveShots') {
    if (sessionCategory === 'family') return 'What family moments are non-negotiable?';
    if (sessionCategory === 'engagement') return 'Any specific couple moments or ring/detail shots required?';
    if (sessionCategory === 'event') return 'List must-capture moments, VIPs, and detail shots.';
  }

  if (question.id === 'constraints') {
    if (sessionCategory === 'family') return 'Any family constraints (mobility, naps, attention span, stroller)?';
    if (sessionCategory === 'engagement') return 'Any constraints (outfit changes, permit risk, privacy concerns)?';
    if (sessionCategory === 'event') return 'Any event constraints (run-of-show timing, venue rules, access limits)?';
  }

  return question.prompt;
}

function getAdaptivePlaceholder(question: ChatQuestion, sessionCategory: SessionCategory) {
  if (question.id === 'subjectDetails') {
    if (sessionCategory === 'family') return '2 parents, 3 kids (ages 2, 5, 8), stroller needed';
    if (sessionCategory === 'engagement') return 'Recently engaged couple, natural chemistry, want candid + editorial mix';
    if (sessionCategory === 'event') return '80-person event, keynote + networking + sponsor details';
  }

  return question.placeholder || 'Type your answer...';
}

function getQuickReplyOptions(question: ChatQuestion, sessionCategory: SessionCategory): string[] {
  if (question.id === 'duration') {
    return ['30 minutes', '45 minutes', '60 minutes', '90 minutes', '120 minutes'];
  }

  if (question.id === 'mood') {
    if (sessionCategory === 'family') return ['Warm + candid', 'Playful + natural', 'Classic family portraits'];
    if (sessionCategory === 'engagement') return ['Romantic + cinematic', 'Candid + emotional', 'Editorial + modern'];
    if (sessionCategory === 'event') return ['Documentary + candid', 'Clean + professional', 'Energetic + social'];
    return ['Polished + professional', 'Bold + editorial', 'Natural + approachable'];
  }

  if (question.id === 'city') {
    return ['Skip (use account base location)'];
  }

  return [];
}

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

  const [plan, setPlan] = useState<SessionPlan | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRefining, setIsRefining] = useState(false);
  const [isApplying, setIsApplying] = useState(false);

  const durationMinutes = useMemo(() => parseDurationMinutes(duration), [duration]);
  const expectedShotRange = useMemo(() => getExpectedShotRange(durationMinutes), [durationMinutes]);
  const sessionCategory = useMemo(() => getSessionCategory(shootType), [shootType]);

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

  useEffect(() => {
    if (!activeQuestion) {
      setDraftAnswer('');
      return;
    }
    setDraftAnswer(getAnswerForQuestion(activeQuestion.id));
  }, [activeQuestion]);

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

  const generatePlan = async () => {
    setIsGenerating(true);
    setError(null);

    const providedLocationList = providedLocations
      .split(/\n|,/)
      .map(item => item.trim())
      .filter(Boolean)
      .slice(0, 12);

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
        }),
      });

      const result = await response.json();
      if (!result.success) {
        setError(result.error ?? 'Failed to generate session plan');
        return;
      }

      setPlan(result.data ?? null);
    } catch {
      setError('Failed to generate session plan');
    } finally {
      setIsGenerating(false);
    }
  };

  const applyPlanToWorkspace = async () => {
    if (!plan) return;

    setIsApplying(true);
    setError(null);

    try {
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

      router.push(`/dashboard/shot-board?project=${projectId}`);
    } catch {
      setError('Failed while applying plan to workspace');
    } finally {
      setIsApplying(false);
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
    } catch {
      setError('Failed to refine plan');
    } finally {
      setIsRefining(false);
    }
  };

  const isChatComplete = chatStepIndex >= visibleQuestions.length;

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

    setError(null);
    setAnswerForQuestion(activeQuestion.id, value);
    setChatStepIndex(prev => Math.min(prev + 1, visibleQuestions.length));
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
    setIsReviewConfirmed(false);
    setChatStepIndex(Math.max(0, visibleQuestions.length - 1));
  };

  return (
    <div className="space-y-6">
      <Card>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-semibold text-gray-900">AI Planning Chat</h3>
            <p className="text-sm text-gray-600">Answer a quick chat questionnaire, then generate a full plan.</p>
          </div>
          <Button
            isLoading={isGenerating}
            onClick={() => void generatePlan()}
            disabled={!isChatComplete || !isReviewConfirmed || isGenerating}
          >
            {isGenerating ? 'Generating...' : 'Generate Full Plan'}
          </Button>
        </div>

        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
          <div className="mb-3 flex items-center justify-between text-xs text-gray-600">
            <span>Step {Math.min(chatStepIndex + 1, visibleQuestions.length)} of {visibleQuestions.length}</span>
            <span>{Math.round((Math.min(chatStepIndex, visibleQuestions.length) / Math.max(visibleQuestions.length, 1)) * 100)}% complete</span>
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
              <div className="mr-12 rounded-2xl rounded-bl-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm">
                {activePrompt}
              </div>

              {activeQuestion.options && activeQuestion.options.length > 0 ? (
                <div className="ml-12 mt-2 flex flex-wrap gap-2">
                  {activeQuestion.options.map(option => (
                    <button
                      key={`${activeQuestion.id}-${option}`}
                      type="button"
                      onClick={() => {
                        setDraftAnswer(option);
                        setError(null);
                      }}
                      className={`rounded-full border px-3 py-1.5 text-sm ${
                        draftAnswer === option
                          ? 'border-blue-600 bg-blue-50 text-blue-700'
                          : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="ml-12">
                  {activeQuickReplies.length > 0 && (
                    <div className="mb-2 flex flex-wrap gap-2">
                      {activeQuickReplies.map(option => (
                        <button
                          key={`${activeQuestion.id}-quick-${option}`}
                          type="button"
                          onClick={() => {
                            setDraftAnswer(option);
                            setError(null);
                          }}
                          className={`rounded-full border px-2.5 py-1 text-xs ${
                            draftAnswer === option
                              ? 'border-blue-600 bg-blue-50 text-blue-700'
                              : 'border-blue-200 bg-white text-blue-700 hover:border-blue-300'
                          }`}
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  )}
                  <textarea
                    className="mt-2 min-h-20 w-full rounded-2xl rounded-br-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm"
                    value={draftAnswer}
                    onChange={e => setDraftAnswer(e.target.value)}
                    placeholder={activePlaceholder}
                    onKeyDown={e => {
                      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                        e.preventDefault();
                        submitCurrentAnswer();
                      }
                    }}
                  />
                  <p className="mt-1 text-[11px] text-gray-500">Tip: press Cmd/Ctrl + Enter to continue quickly.</p>
                </div>
              )}

              <div className="mt-3 flex items-center gap-2">
                <Button variant="secondary" onClick={goBackQuestion} disabled={chatStepIndex === 0}>
                  Back
                </Button>
                <Button onClick={submitCurrentAnswer}>
                  {chatStepIndex === visibleQuestions.length - 1 ? 'Finish intake' : 'Continue'}
                </Button>
              </div>
            </div>
          )}

          {isChatComplete && (
            <div className="space-y-3 rounded border border-green-200 bg-green-50 p-3 text-sm text-green-900">
              <p className="font-semibold">Intake complete. Review before generating.</p>
              <div className="grid gap-2 md:grid-cols-2">
                <p><span className="font-medium">Shoot type:</span> {shootType}</p>
                <p><span className="font-medium">Location mode:</span> {locationMode === 'use-provided' ? 'Using provided locations' : 'Find locations for me'}</p>
                {locationMode === 'find-locations' ? (
                  <p><span className="font-medium">City:</span> {city || 'Account fallback'}</p>
                ) : (
                  <p className="md:col-span-2"><span className="font-medium">Provided locations:</span> {providedLocations || 'None provided'}</p>
                )}
                <p><span className="font-medium">Duration:</span> {duration}</p>
                <p><span className="font-medium">Mood:</span> {mood}</p>
                {sessionCategory === 'family' && familyPacing && (
                  <p className="md:col-span-2"><span className="font-medium">Family pacing:</span> {familyPacing}</p>
                )}
                {sessionCategory === 'engagement' && engagementStory && (
                  <p className="md:col-span-2"><span className="font-medium">Couple story:</span> {engagementStory}</p>
                )}
                {sessionCategory === 'portrait' && brandingGoals && (
                  <p className="md:col-span-2"><span className="font-medium">Brand goals:</span> {brandingGoals}</p>
                )}
                {sessionCategory === 'event' && eventPriorities && (
                  <p className="md:col-span-2"><span className="font-medium">Event priorities:</span> {eventPriorities}</p>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" onClick={editAnswers}>Edit answers</Button>
                <Button onClick={reviewAnswers} disabled={isReviewConfirmed}>
                  {isReviewConfirmed ? 'Review confirmed' : 'Looks good — unlock generate'}
                </Button>
              </div>
            </div>
          )}
        </div>

        <p className="mt-2 text-xs text-gray-500">
          Duration target: {durationMinutes} min • Expected shot range: {expectedShotRange.min}-{expectedShotRange.max}
        </p>
        {!city.trim() && (
          <p className="mt-1 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
            City is blank. Planner will fall back to your account base location/ZIP if available.
          </p>
        )}

        {error && <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      </Card>

      {plan && (
        <>
          <Card>
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{plan.projectTitle}</h3>
                <p className="text-sm text-gray-600">{plan.creativeDirection}</p>
                <div className="mt-2 flex flex-wrap gap-2 text-xs">
                  <span className="rounded-full bg-blue-50 px-2 py-1 font-medium text-blue-700">
                    Location source: {plan.planningDiagnostics?.locationSource || 'unknown'}
                  </span>
                  <span className="rounded-full bg-gray-100 px-2 py-1 font-medium text-gray-700">
                    Candidates: {plan.planningDiagnostics?.locationCandidateCount ?? 0}
                  </span>
                  <span className="rounded-full bg-gray-100 px-2 py-1 font-medium text-gray-700">
                    Resolved city: {plan.planningDiagnostics?.resolvedCity || city || 'N/A'}
                  </span>
                  {plan.planningDiagnostics?.usedBusinessZipDisambiguation && (
                    <span className="rounded-full bg-emerald-50 px-2 py-1 font-medium text-emerald-700">
                      Disambiguated with business anchor: {plan.planningDiagnostics.businessGeoAnchorSource || 'account location'}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" isLoading={isRefining} onClick={() => void refinePlan()}>
                  {isRefining ? 'Refining...' : 'Refine Plan'}
                </Button>
                <Button variant="secondary" isLoading={isApplying} onClick={() => void applyPlanToWorkspace()}>
                  {isApplying ? 'Applying...' : 'Create Project + Shot List'}
                </Button>
                <Link href="/dashboard/shot-board">
                  <Button variant="ghost">Open Shot Board</Button>
                </Link>
              </div>
            </div>

            {(plan.planningDiagnostics?.locationSource !== 'grounded-candidates' ||
              (plan.planningDiagnostics?.locationCandidateCount ?? 0) < 3 ||
              plan.shotList.length < expectedShotRange.min ||
              plan.shotList.length > expectedShotRange.max) && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                <p className="font-semibold">Validation warnings</p>
                <ul className="mt-1 list-disc space-y-1 pl-5">
                  {plan.planningDiagnostics?.locationSource !== 'grounded-candidates' && (
                    <li>Location plan is using fallback mode, not fully grounded candidates.</li>
                  )}
                  {(plan.planningDiagnostics?.locationCandidateCount ?? 0) < 3 && (
                    <li>Fewer than 3 real location candidates found. Consider a broader nearby city or ZIP.</li>
                  )}
                  {plan.shotList.length < expectedShotRange.min || plan.shotList.length > expectedShotRange.max ? (
                    <li>
                      Shot count ({plan.shotList.length}) is outside expected {expectedShotRange.min}-{expectedShotRange.max}
                      {' '}for {durationMinutes} minutes.
                    </li>
                  ) : null}
                </ul>
              </div>
            )}
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <h4 className="mb-3 text-lg font-semibold text-gray-900">Timeline</h4>
              <div className="space-y-3">
                {plan.timeline.map(item => (
                  <div key={`${item.timeBlock}-${item.focus}`} className="rounded-lg border border-gray-200 p-3">
                    <p className="text-sm font-semibold text-gray-900">{item.timeBlock}</p>
                    <p className="text-sm text-blue-700">{item.focus}</p>
                    <p className="mt-1 text-sm text-gray-600">{item.notes}</p>
                  </div>
                ))}
              </div>
            </Card>

            <Card>
              <h4 className="mb-3 text-lg font-semibold text-gray-900">Location + Micro-Location Suggestions</h4>
              <div className="space-y-3">
                {plan.locationSuggestions.map(location => (
                  <div key={location.name} className="rounded-lg border border-gray-200 p-3">
                    <p className="font-semibold text-gray-900">{location.displayName || location.name}</p>
                    {location.displayName && location.displayName !== location.name && (
                      <p className="mt-1 text-xs text-gray-500">AI label: {location.name}</p>
                    )}
                    <div className="mt-2 rounded-md bg-blue-50/60 px-3 py-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Why this location was picked</p>
                      <p className="mt-1 text-sm text-gray-700">{location.whyItWorks}</p>
                      {Array.isArray(location.selectionReasons) && location.selectionReasons.length > 0 && (
                        <ul className="mt-1 list-disc space-y-1 pl-5 text-xs text-gray-700">
                          {location.selectionReasons.map(reason => (
                            <li key={`${location.name}-${reason}`}>{reason}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-gray-600">
                      {typeof location.confidenceScore === 'number' && (
                        <span className="rounded-full bg-gray-100 px-2 py-1">Confidence: {location.confidenceScore.toFixed(1)}/10</span>
                      )}
                      {location.venueBucket && (
                        <span className="rounded-full bg-gray-100 px-2 py-1">Type: {location.venueBucket}</span>
                      )}
                      {location.sourceQuery && (
                        <span className="rounded-full bg-gray-100 px-2 py-1">Source: {location.sourceQuery}</span>
                      )}
                    </div>
                    {location.latitude != null && location.longitude != null && (
                      <div className="mt-2 flex flex-wrap items-center gap-3 text-xs">
                        <p className="text-blue-700">
                          Coordinates: {Number(location.latitude).toFixed(5)}, {Number(location.longitude).toFixed(5)}
                        </p>
                        <a
                          href={
                            location.googleMapsUrl ||
                            `https://maps.google.com/?q=${Number(location.latitude)},${Number(location.longitude)}`
                          }
                          target="_blank"
                          rel="noreferrer noopener"
                          className="font-medium text-blue-600 hover:text-blue-700 hover:underline"
                        >
                          Show on Google Maps
                        </a>
                      </div>
                    )}
                    {location.latitude == null && location.longitude == null && (
                      <a
                        href={
                          location.googleMapsUrl ||
                          `https://maps.google.com/?q=${encodeURIComponent(location.displayName || location.name)}`
                        }
                        target="_blank"
                        rel="noreferrer noopener"
                        className="mt-2 inline-block text-xs font-medium text-blue-600 hover:text-blue-700 hover:underline"
                      >
                        Show on Google Maps
                      </a>
                    )}
                    <p className="mt-2 text-xs text-gray-500">Micro-spots: {location.microLocations.join(' • ')}</p>
                    <p className="mt-2 text-xs text-gray-500">Parking: {location.logistics.parking}</p>
                    <p className="text-xs text-gray-500">Restroom: {location.logistics.restroom}</p>
                    <p className="text-xs text-gray-500">Walk: {location.logistics.walkingDistance}</p>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {plan.locationRefinements && plan.locationRefinements.length > 0 && (
            <Card>
              <h4 className="mb-3 text-lg font-semibold text-gray-900">Refined Location Scores</h4>
              <div className="space-y-3">
                {plan.locationRefinements.map(ref => (
                  <div key={ref.name} className="rounded-lg border border-gray-200 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-semibold text-gray-900">{ref.name}</p>
                      <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                        Overall {ref.overallScore}/10
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-gray-600">{ref.rationale}</p>
                    <div className="mt-2 grid gap-2 text-xs text-gray-700 sm:grid-cols-3">
                      <p>Kid-friendly: {ref.kidFriendlinessScore}/10</p>
                      <p>Crowd risk: {ref.crowdRiskScore}/10</p>
                      <p>Walking burden: {ref.walkingBurdenScore}/10</p>
                    </div>
                    <p className="mt-1 text-xs text-gray-500">Best time window: {ref.bestTimeWindow}</p>
                    {ref.recommendedMicroSpots?.length > 0 && (
                      <p className="mt-1 text-xs text-gray-500">
                        Recommended micro-spots: {ref.recommendedMicroSpots.join(' • ')}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          )}

          <Card>
            <h4 className="mb-3 text-lg font-semibold text-gray-900">Grounded Shot List</h4>
            <div className="grid gap-3 lg:grid-cols-2">
              {plan.shotList.map(shot => (
                <div key={`${shot.title}-${shot.microSpot}`} className="rounded-lg border border-gray-200 p-3">
                  <p className="font-semibold text-gray-900">{shot.title}</p>
                  <p className="mt-1 text-sm text-gray-600">{shot.description}</p>
                  <p className="mt-2 text-xs text-gray-500">Location: {shot.location}</p>
                  {shot.latitude != null && shot.longitude != null && (
                    <p className="text-xs text-blue-700">
                      Coordinates: {Number(shot.latitude).toFixed(5)}, {Number(shot.longitude).toFixed(5)}
                    </p>
                  )}
                  <p className="text-xs text-gray-500">Micro-spot: {shot.microSpot}</p>
                  <p className="text-xs text-gray-500">Pose: {shot.poseSuggestion}</p>
                  <p className="text-xs text-gray-500">Composition: {shot.compositionSuggestion}</p>
                  <p className="text-xs text-gray-500">Timing: {shot.timingHint}</p>
                </div>
              ))}
            </div>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <h4 className="mb-3 text-lg font-semibold text-gray-900">Client Prep Checklist</h4>
              <ul className="list-inside list-disc space-y-1 text-sm text-gray-700">
                {plan.clientPrepChecklist.map(item => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </Card>

            <Card>
              <h4 className="mb-3 text-lg font-semibold text-gray-900">Contingency Plans</h4>
              <ul className="list-inside list-disc space-y-1 text-sm text-gray-700">
                {plan.contingencyPlans.map(item => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
