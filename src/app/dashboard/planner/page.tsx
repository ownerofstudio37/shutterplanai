'use client';

import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
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

type BusinessProfile = {
  businessName?: string;
  businessType?: string;
  address?: string;
  zipCode?: string;
  baseLocation?: string;
  websiteUrl?: string;
  websiteSummary?: string;
  brandTone?: string;
  preferredLocationTypes?: string;
  avoidLocationTypes?: string;
  poseDirectionStyle?: string;
  prepGuideNotes?: string;
};

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
type ReviewTab = 'map' | 'locations' | 'shot-list' | 'timeline' | 'prep';
type LocationVote = 'up' | 'down';
type WorkflowStage = 'intake' | 'review' | 'apply';

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

const PLANNER_PRESETS: PlannerPreset[] = [
  {
    id: 'family-30',
    label: 'Family 30 min',
    description: 'Short, efficient family session with kid-friendly pacing.',
    shootType: 'Family Session',
    locationMode: 'find-locations',
    duration: '30 minutes',
    mood: 'Warm + candid',
    subjectDetails: 'Immediate family with young kids, want efficient transitions and easy walking',
    mustHaveShots: 'Whole family portrait, siblings together, each child solo, parents together',
    constraints: 'Need stroller-friendly access, quick transitions, minimal walking',
    familyPacing: 'Fast-paced flow with short attention spans and minimal reset time',
  },
  {
    id: 'engagement-golden-hour',
    label: 'Engagement golden hour',
    description: 'Romantic, cinematic engagement session timed for soft evening light.',
    shootType: 'Engagement Session',
    locationMode: 'find-locations',
    duration: '90 minutes',
    mood: 'Romantic + cinematic',
    subjectDetails: 'Couple wants candid connection with a polished editorial finish',
    mustHaveShots: 'Wide scenic portraits, walking candids, close connection shots, ring detail',
    constraints: 'Need sunset-friendly sequence with easy outfit flow and low crowd pressure',
    engagementStory: 'Want the session to feel intimate, story-driven, and golden-hour focused',
  },
  {
    id: 'branding-downtown',
    label: 'Branding downtown',
    description: 'Urban branding session for website, speaking, and social content.',
    shootType: 'Branding Session',
    locationMode: 'find-locations',
    duration: '60 minutes',
    mood: 'Polished + professional',
    subjectDetails: 'Solo business owner who needs a confident mix of polished and approachable images',
    mustHaveShots: 'Website hero portrait, horizontal banner crop, speaking/profile image, social media variety',
    constraints: 'Need clean backgrounds, modern architecture, and quick location changes',
    brandingGoals: 'Website hero images, speaking profile photos, social content batch',
  },
  {
    id: 'event-coverage',
    label: 'Event coverage',
    description: 'Coverage plan for speakers, details, atmosphere, and networking moments.',
    shootType: 'Event Session',
    locationMode: 'use-provided',
    duration: '120 minutes',
    mood: 'Documentary + candid',
    subjectDetails: 'Business event with speakers, audience reactions, sponsor details, and networking',
    mustHaveShots: 'Speaker on stage, audience reactions, sponsor signage, venue details, candid networking',
    constraints: 'Need run-of-show awareness, low disruption, and coverage of key transitions',
    eventPriorities: 'Keynote moments, sponsor visibility, attendee candids, room-wide establishing shots',
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

function getBusinessProfileTemplates(
  question: ChatQuestion,
  sessionCategory: SessionCategory,
  businessProfile: BusinessProfile | null
): string[] {
  if (!businessProfile) return [];

  const templates: string[] = [];

  if (question.id === 'city') {
    if (businessProfile.baseLocation) templates.push(businessProfile.baseLocation);
    if (businessProfile.zipCode) templates.push(businessProfile.zipCode);
  }

  if (question.id === 'mood') {
    if (businessProfile.brandTone) templates.push(businessProfile.brandTone);
    if (businessProfile.poseDirectionStyle && sessionCategory === 'portrait') {
      templates.push(`Brand-forward, ${businessProfile.poseDirectionStyle}`);
    }
  }

  if (question.id === 'constraints') {
    if (businessProfile.prepGuideNotes) templates.push(businessProfile.prepGuideNotes);
    if (businessProfile.avoidLocationTypes) {
      templates.push(`Avoid: ${businessProfile.avoidLocationTypes}`);
    }
  }

  if (question.id === 'brandingGoals' && sessionCategory === 'portrait') {
    if (businessProfile.businessType) templates.push(`${businessProfile.businessType} brand shoot`);
    if (businessProfile.websiteSummary) templates.push('Website hero, about page, and social content');
  }

  if (question.id === 'providedLocations' && businessProfile.preferredLocationTypes) {
    templates.push(businessProfile.preferredLocationTypes);
  }

  return Array.from(new Set(templates.map(item => item.trim()).filter(Boolean))).slice(0, 4);
}

function PlannerSkeletonCard({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-gray-200 ${className}`.trim()} />;
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
  const [activeReviewTab, setActiveReviewTab] = useState<ReviewTab>('map');
  const [locationVotes, setLocationVotes] = useState<Record<string, LocationVote>>({});
  const [preferredVenueBucket, setPreferredVenueBucket] = useState<string | null>(null);
  const [excludedVenueBuckets, setExcludedVenueBuckets] = useState<string[]>([]);
  const [isAiTyping, setIsAiTyping] = useState(false);
  const [activePresetId, setActivePresetId] = useState<string | null>(null);
  const [activeMobileReviewTab, setActiveMobileReviewTab] = useState<ReviewTab | null>('map');
  const [selectedReviewLocationName, setSelectedReviewLocationName] = useState<string | null>(null);

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

    void loadBusinessProfile();
  }, []);

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

        if (aPreferred !== bPreferred) return bPreferred - aPreferred;
        if (aVoteScore !== bVoteScore) return bVoteScore - aVoteScore;
        return (b.confidenceScore ?? 0) - (a.confidenceScore ?? 0);
      });
  }, [excludedVenueBuckets, locationVotes, plan?.locationSuggestions, preferredVenueBucket]);

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

      setActiveReviewTab('map');
      setActiveMobileReviewTab('map');
      setLocationVotes({});
      setPreferredVenueBucket(null);
      setExcludedVenueBuckets([]);
      setSelectedReviewLocationName(null);
      setPlan(result.data ?? null);
    } catch {
      setError('Failed to generate session plan');
    } finally {
      setIsGenerating(false);
    }
  };

  const persistFeedback = async (applied: boolean = false) => {
    if (!plan) return;

    try {
      await fetch('/api/planner/feedback', {
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
    } catch (error) {
      console.warn('Failed to persist planner feedback:', error);
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

      // Persist feedback before navigating away
      await persistFeedback(true);

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

  const setLocationVote = (location: SessionPlanLocation, vote: LocationVote) => {
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
  };

  const togglePreferredVenueBucket = (venueBucket?: string) => {
    if (!venueBucket) return;
    setPreferredVenueBucket(prev => (prev === venueBucket ? null : venueBucket));
  };

  const toggleExcludedVenueBucket = (venueBucket?: string) => {
    if (!venueBucket) return;
    setExcludedVenueBuckets(prev =>
      prev.includes(venueBucket) ? prev.filter(item => item !== venueBucket) : [...prev, venueBucket]
    );
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
    setProvidedLocations(presetProvidedLocations);
    setFamilyPacing(preset.familyPacing || '');
    setEngagementStory(preset.engagementStory || '');
    setBrandingGoals(preset.brandingGoals || '');
    setEventPriorities(preset.eventPriorities || '');
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

  const toggleMobileReviewTab = (tab: ReviewTab) => {
    setActiveMobileReviewTab(prev => (prev === tab ? null : tab));
    setActiveReviewTab(tab);
  };

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Planner workflow</h2>
            <p className="text-sm text-gray-600">Move from intake to review, then apply the approved plan to your project workspace.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {workflowStages.map(stage => {
              const isActive = workflowStage === stage.id;
              const isAvailable =
                stage.id === 'intake' ||
                (stage.id === 'review' && !!plan) ||
                (stage.id === 'apply' && !!plan);

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
              <span className="rounded-full bg-indigo-50 px-2 py-1 font-medium text-indigo-700">
                Session: {shootType}
              </span>
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
              <Button variant="secondary" onClick={() => editAnswers()}>
                Reopen intake
              </Button>
            )}
            <Button
              isLoading={isGenerating}
              onClick={() => void generatePlan()}
              disabled={!isChatComplete || !isReviewConfirmed || isGenerating}
            >
              {isGenerating ? 'Generating...' : plan ? 'Regenerate Plan' : 'Generate Full Plan'}
            </Button>
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
          {workflowStage === 'intake' ? (
            <>
              <div className="mb-4 rounded-xl border border-indigo-200 bg-indigo-50 p-4">
                <div className="mb-3 flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-indigo-900">Quick-start presets</p>
                    <p className="text-xs text-indigo-700">Start with a proven planning setup, then tweak anything in the intake summary.</p>
                  </div>
                  {activePresetId && (
                    <span className="rounded-full bg-white px-2 py-1 text-xs font-medium text-indigo-700">
                      Active preset: {PLANNER_PRESETS.find(preset => preset.id === activePresetId)?.label}
                    </span>
                  )}
                </div>

                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  {PLANNER_PRESETS.map(preset => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => applyPreset(preset)}
                      className={`rounded-xl border px-4 py-3 text-left transition ${
                        activePresetId === preset.id
                          ? 'border-indigo-600 bg-white shadow-sm'
                          : 'border-indigo-200 bg-white/80 hover:border-indigo-300 hover:bg-white'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{preset.label}</p>
                          <p className="mt-1 text-xs text-gray-600">{preset.description}</p>
                        </div>
                        <span className="rounded-full bg-indigo-100 px-2 py-1 text-[11px] font-medium text-indigo-700">
                          {preset.duration}
                        </span>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
                        <span className="rounded-full bg-gray-100 px-2 py-1 text-gray-700">{preset.shootType}</span>
                        <span className="rounded-full bg-gray-100 px-2 py-1 text-gray-700">
                          {preset.locationMode === 'use-provided' ? 'Provided locations' : 'Find locations'}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

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
                          onClick={() => submitAnswerValue(option)}
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
                                onClick={() => submitAnswerValue(option)}
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
                              onClick={() => submitAnswerValue(option)}
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
                        <div className="mt-3 flex items-center gap-2">
                          <Button variant="secondary" onClick={goBackQuestion} disabled={chatStepIndex === 0}>
                            Back
                          </Button>
                          <Button onClick={submitCurrentAnswer}>
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
                  <div className="space-y-2">
                    {visibleQuestions.map(question => {
                      const answer = getAnswerForQuestion(question.id);
                      if (!answer && !question.required) return null;

                      return (
                        <div
                          key={`summary-${question.id}`}
                          className="flex flex-col gap-2 rounded-lg border border-green-200 bg-white/70 px-3 py-2 md:flex-row md:items-start md:justify-between"
                        >
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-green-700">
                              {getAdaptivePrompt(question, sessionCategory)}
                            </p>
                            <p className="mt-1 text-sm text-gray-800">{answer || '—'}</p>
                          </div>
                          <Button variant="ghost" onClick={() => jumpToQuestion(question.id)}>
                            Edit
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="secondary" onClick={editAnswers}>Edit answers</Button>
                    <Button onClick={reviewAnswers} disabled={isReviewConfirmed}>
                      {isReviewConfirmed ? 'Review confirmed' : 'Looks good — unlock generate'}
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="space-y-3 rounded border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
              <p className="font-semibold">Intake is locked for review.</p>
              <div className="grid gap-2 md:grid-cols-2">
                {visibleQuestions.map(question => {
                  const answer = getAnswerForQuestion(question.id);
                  if (!answer && !question.required) return null;

                  return (
                    <div key={`locked-${question.id}`} className="rounded-lg bg-white/80 px-3 py-2">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-blue-700">
                        {getAdaptivePrompt(question, sessionCategory)}
                      </p>
                      <p className="mt-1 text-sm text-gray-800">{answer || '—'}</p>
                    </div>
                  );
                })}
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

        <div className="sticky bottom-3 z-10 mt-4 md:hidden">
          <div className="rounded-2xl border border-gray-200 bg-white/95 p-3 shadow-lg backdrop-blur">
            <div className="flex flex-col gap-2">
              {workflowStage !== 'intake' && (
                <Button variant="secondary" onClick={() => editAnswers()}>
                  Reopen intake
                </Button>
              )}
              <Button
                isLoading={isGenerating}
                onClick={() => void generatePlan()}
                disabled={!isChatComplete || !isReviewConfirmed || isGenerating}
              >
                {isGenerating ? 'Generating...' : plan ? 'Regenerate Plan' : 'Generate Full Plan'}
              </Button>
            </div>
          </div>
        </div>

        {error && <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      </Card>

      {isGenerating && !plan && (
        <>
          <Card>
            <div className="space-y-4">
              <div>
                <p className="text-sm font-semibold text-gray-900">Building your plan</p>
                <p className="text-sm text-gray-600">Grounding the session with real locations, then assembling the review tabs.</p>
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                {['Checking your intake answers', 'Searching location candidates', 'Drafting timeline + shot flow'].map(step => (
                  <div key={step} className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                    <p className="mb-3 text-sm font-medium text-gray-700">{step}</p>
                    <PlannerSkeletonCard className="h-3 w-3/4" />
                    <PlannerSkeletonCard className="mt-2 h-3 w-full" />
                    <PlannerSkeletonCard className="mt-2 h-3 w-5/6" />
                  </div>
                ))}
              </div>
            </div>
          </Card>

          <Card>
            <div className="space-y-4">
              <PlannerSkeletonCard className="h-5 w-48" />
              <div className="grid gap-3 lg:grid-cols-2">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={`plan-skeleton-${index}`} className="rounded-xl border border-gray-200 p-4">
                    <PlannerSkeletonCard className="h-4 w-2/3" />
                    <PlannerSkeletonCard className="mt-3 h-3 w-full" />
                    <PlannerSkeletonCard className="mt-2 h-3 w-11/12" />
                    <PlannerSkeletonCard className="mt-4 h-16 w-full" />
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </>
      )}

      {plan && workflowStage !== 'intake' && (
        <>
          <Card>
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{plan.projectTitle}</h3>
                <p className="text-sm text-gray-600">{plan.creativeDirection}</p>
                <div className="mt-2 flex flex-wrap gap-2 text-xs">
                  <span className={`rounded-full px-2 py-1 font-medium ${workflowStage === 'apply' ? 'bg-violet-50 text-violet-700' : 'bg-blue-50 text-blue-700'}`}>
                    Current stage: {workflowStage === 'apply' ? 'Apply to Project' : 'Plan Review'}
                  </span>
                  <span className="rounded-full bg-blue-50 px-2 py-1 font-medium text-blue-700">
                    Location source: {plan.planningDiagnostics?.locationSource || 'unknown'}
                  </span>
                  <span className="rounded-full bg-indigo-50 px-2 py-1 font-medium text-indigo-700">
                    Session: {shootType}
                  </span>
                  <span className="rounded-full bg-emerald-50 px-2 py-1 font-medium text-emerald-700">
                    Mode: {locationMode === 'use-provided' ? 'Using provided locations' : 'Find locations'}
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
              <div className="hidden gap-2 md:flex">
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

            {planningSourceExplanation && (
              <div
                className={`mb-3 rounded-lg px-4 py-3 text-sm ${
                  planningSourceExplanation.tone === 'emerald'
                    ? 'border border-emerald-200 bg-emerald-50 text-emerald-900'
                    : planningSourceExplanation.tone === 'blue'
                      ? 'border border-blue-200 bg-blue-50 text-blue-900'
                      : 'border border-amber-200 bg-amber-50 text-amber-900'
                }`}
              >
                <p className="font-semibold">{planningSourceExplanation.title}</p>
                <p className="mt-1">{planningSourceExplanation.body}</p>
              </div>
            )}

            {isRefining && (
              <div className="mb-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
                Refining the current plan now. Review scores and backup guidance will update when the pass finishes.
              </div>
            )}

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

          <Card>
            <div className="mb-4 hidden flex-wrap gap-2 md:flex">
              {[
                { id: 'map', label: `Map (${displayedLocations.filter(location => location.latitude != null && location.longitude != null).length})` },
                { id: 'locations', label: `Locations (${displayedLocations.length})` },
                { id: 'shot-list', label: `Shot List (${displayedShots.length})` },
                { id: 'timeline', label: `Timeline (${plan.timeline.length})` },
                { id: 'prep', label: 'Prep + Backup' },
              ].map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveReviewTab(tab.id as ReviewTab)}
                  className={`rounded-full px-3 py-1.5 text-sm font-medium ${
                    activeReviewTab === tab.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="mb-4 space-y-3 md:hidden">
              {[
                { id: 'map', label: `Map (${displayedLocations.filter(location => location.latitude != null && location.longitude != null).length})` },
                { id: 'locations', label: `Locations (${displayedLocations.length})` },
                { id: 'shot-list', label: `Shot List (${displayedShots.length})` },
                { id: 'timeline', label: `Timeline (${plan.timeline.length})` },
                { id: 'prep', label: 'Prep + Backup' },
              ].map(tab => {
                const reviewTab = tab.id as ReviewTab;
                const isOpen = activeMobileReviewTab === reviewTab;

                return (
                  <div key={`mobile-${tab.id}`} className="overflow-hidden rounded-xl border border-gray-200 bg-white">
                    <button
                      type="button"
                      onClick={() => toggleMobileReviewTab(reviewTab)}
                      className="flex w-full items-center justify-between px-4 py-3 text-left"
                    >
                      <span className="text-sm font-semibold text-gray-900">{tab.label}</span>
                      <span className="text-xs text-gray-500">{isOpen ? 'Hide' : 'Show'}</span>
                    </button>

                    {isOpen && (
                      <div className="border-t border-gray-100 px-4 py-4">
                        {reviewTab === 'map' && (
                          <div className="space-y-4">
                            <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-900">
                              Use the map to pressure-test spacing, route order, and whether the plan clusters in the right part of town.
                            </div>

                            <PlannerLocationMap
                              locations={displayedLocations}
                              selectedLocationName={selectedReviewLocationName}
                              onSelectLocation={setSelectedReviewLocationName}
                            />

                            {selectedReviewLocation ? (
                              <div className="rounded-xl border border-gray-200 p-4">
                                <p className="text-sm font-semibold text-gray-900">
                                  {selectedReviewLocation.displayName || selectedReviewLocation.name}
                                </p>
                                <p className="mt-1 text-sm text-gray-600">{selectedReviewLocation.whyItWorks}</p>
                                <div className="mt-3 flex flex-wrap gap-2 text-xs text-gray-600">
                                  {selectedReviewLocation.venueBucket && (
                                    <span className="rounded-full bg-gray-100 px-2 py-1">
                                      Type: {selectedReviewLocation.venueBucket}
                                    </span>
                                  )}
                                  {typeof selectedReviewLocation.confidenceScore === 'number' && (
                                    <span className="rounded-full bg-gray-100 px-2 py-1">
                                      Confidence: {selectedReviewLocation.confidenceScore.toFixed(1)}/10
                                    </span>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                                <p className="font-semibold">No map-ready locations yet</p>
                                <p className="mt-1">Try regenerating with a broader area or use provided locations with clearer place names.</p>
                              </div>
                            )}
                          </div>
                        )}

                        {reviewTab === 'locations' && (
                          <div className="space-y-4">
                            <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-900">
                              Use the feedback controls to pressure-test location quality. Thumbs affect ordering locally, “Prefer this type” boosts similar spots in review, and “Exclude this type” removes that venue type from the current plan review.
                            </div>

                            {emptyLocationMessage && (
                              <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                                <p className="font-semibold">No visible locations right now</p>
                                <p className="mt-1">{emptyLocationMessage}</p>
                              </div>
                            )}

                            {displayedLocations.map(location => {
                              const locationKey = (location.displayName || location.name).toLowerCase();
                              const currentVote = locationVotes[locationKey];
                              const isPreferredType = !!location.venueBucket && preferredVenueBucket === location.venueBucket;
                              const isExcludedType = !!location.venueBucket && excludedVenueBuckets.includes(location.venueBucket);

                              return (
                                <div key={`mobile-${location.name}`} className="rounded-lg border border-gray-200 p-3">
                                  <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div>
                                      <p className="font-semibold text-gray-900">{location.displayName || location.name}</p>
                                      {location.displayName && location.displayName !== location.name && (
                                        <p className="mt-1 text-xs text-gray-500">AI label: {location.name}</p>
                                      )}
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                      <button
                                        type="button"
                                        onClick={() => setLocationVote(location, 'up')}
                                        className={`rounded-full border px-2 py-1 text-xs ${
                                          currentVote === 'up'
                                            ? 'border-emerald-600 bg-emerald-50 text-emerald-700'
                                            : 'border-gray-300 bg-white text-gray-700'
                                        }`}
                                      >
                                        👍 Relevant
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setLocationVote(location, 'down')}
                                        className={`rounded-full border px-2 py-1 text-xs ${
                                          currentVote === 'down'
                                            ? 'border-red-600 bg-red-50 text-red-700'
                                            : 'border-gray-300 bg-white text-gray-700'
                                        }`}
                                      >
                                        👎 Not relevant
                                      </button>
                                      {location.venueBucket && (
                                        <button
                                          type="button"
                                          onClick={() => togglePreferredVenueBucket(location.venueBucket)}
                                          className={`rounded-full border px-2 py-1 text-xs ${
                                            isPreferredType
                                              ? 'border-blue-600 bg-blue-50 text-blue-700'
                                              : 'border-gray-300 bg-white text-gray-700'
                                          }`}
                                        >
                                          ⭐ Prefer this type
                                        </button>
                                      )}
                                      {location.venueBucket && (
                                        <button
                                          type="button"
                                          onClick={() => toggleExcludedVenueBucket(location.venueBucket)}
                                          className={`rounded-full border px-2 py-1 text-xs ${
                                            isExcludedType
                                              ? 'border-amber-600 bg-amber-50 text-amber-700'
                                              : 'border-gray-300 bg-white text-gray-700'
                                          }`}
                                        >
                                          🚫 Exclude this type
                                        </button>
                                      )}
                                    </div>
                                  </div>

                                  <div className="mt-2 rounded-md bg-blue-50/60 px-3 py-2">
                                    <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Why this location was picked</p>
                                    <p className="mt-1 text-sm text-gray-700">{location.whyItWorks}</p>
                                  </div>
                                  <p className="mt-2 text-xs text-gray-500">Micro-spots: {location.microLocations.join(' • ')}</p>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {reviewTab === 'shot-list' && (
                          <div className="space-y-3">
                            {emptyShotMessage && (
                              <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                                <p className="font-semibold">No visible shots right now</p>
                                <p className="mt-1">{emptyShotMessage}</p>
                              </div>
                            )}

                            {displayedShots.map(shot => (
                              <div key={`mobile-${shot.title}-${shot.microSpot}`} className="rounded-lg border border-gray-200 p-3">
                                <p className="font-semibold text-gray-900">{shot.title}</p>
                                <p className="mt-1 text-sm text-gray-600">{shot.description}</p>
                                <p className="mt-2 text-xs text-gray-500">Location: {shot.location}</p>
                                <p className="text-xs text-gray-500">Micro-spot: {shot.microSpot}</p>
                                <p className="text-xs text-gray-500">Pose: {shot.poseSuggestion}</p>
                              </div>
                            ))}
                          </div>
                        )}

                        {reviewTab === 'timeline' && (
                          <div className="space-y-3">
                            {plan.timeline.map(item => (
                              <div key={`mobile-${item.timeBlock}-${item.focus}`} className="rounded-lg border border-gray-200 p-3">
                                <p className="text-sm font-semibold text-gray-900">{item.timeBlock}</p>
                                <p className="text-sm text-blue-700">{item.focus}</p>
                                <p className="mt-1 text-sm text-gray-600">{item.notes}</p>
                              </div>
                            ))}
                          </div>
                        )}

                        {reviewTab === 'prep' && (
                          <div className="space-y-4">
                            <div>
                              <h4 className="mb-2 text-base font-semibold text-gray-900">Client Prep Checklist</h4>
                              <ul className="list-inside list-disc space-y-1 text-sm text-gray-700">
                                {plan.clientPrepChecklist.map(item => (
                                  <li key={`mobile-prep-${item}`}>{item}</li>
                                ))}
                              </ul>
                            </div>
                            <div>
                              <h4 className="mb-2 text-base font-semibold text-gray-900">Contingency Plans</h4>
                              <ul className="list-inside list-disc space-y-1 text-sm text-gray-700">
                                {plan.contingencyPlans.map(item => (
                                  <li key={`mobile-contingency-${item}`}>{item}</li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="hidden md:block">
            {activeReviewTab === 'map' && (
              <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
                <div className="space-y-4">
                  <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-900">
                    Map-first review helps confirm spacing, route order, and whether the chosen locations cluster in the right part of the city.
                  </div>

                  <PlannerLocationMap
                    locations={displayedLocations}
                    selectedLocationName={selectedReviewLocationName}
                    onSelectLocation={setSelectedReviewLocationName}
                  />
                </div>

                <div className="space-y-4">
                  <div className="rounded-xl border border-gray-200 p-4">
                    <p className="text-sm font-semibold text-gray-900">Current stop order</p>
                    <div className="mt-3 space-y-2">
                      {displayedLocations.map((location, index) => {
                        const locationName = location.displayName || location.name;
                        const isSelected = locationName === (selectedReviewLocation?.displayName || selectedReviewLocation?.name);

                        return (
                          <button
                            key={`map-sequence-${locationName}`}
                            type="button"
                            onClick={() => setSelectedReviewLocationName(locationName)}
                            className={`w-full rounded-lg border px-3 py-2 text-left text-sm ${
                              isSelected
                                ? 'border-blue-600 bg-blue-50 text-blue-900'
                                : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                            }`}
                          >
                            <p className="font-medium">Stop {index + 1}: {locationName}</p>
                            <p className="mt-1 text-xs text-gray-500">{location.microLocations.slice(0, 2).join(' • ') || 'No micro-spots listed yet'}</p>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {selectedReviewLocation ? (
                    <div className="rounded-xl border border-gray-200 p-4">
                      <p className="text-sm font-semibold text-gray-900">
                        {selectedReviewLocation.displayName || selectedReviewLocation.name}
                      </p>
                      <p className="mt-1 text-sm text-gray-600">{selectedReviewLocation.whyItWorks}</p>
                      {Array.isArray(selectedReviewLocation.selectionReasons) && selectedReviewLocation.selectionReasons.length > 0 && (
                        <ul className="mt-3 list-disc space-y-1 pl-5 text-xs text-gray-700">
                          {selectedReviewLocation.selectionReasons.map(reason => (
                            <li key={`map-reason-${selectedReviewLocation.name}-${reason}`}>{reason}</li>
                          ))}
                        </ul>
                      )}
                      <div className="mt-3 grid gap-2 text-xs text-gray-600 sm:grid-cols-2">
                        <p>Parking: {selectedReviewLocation.logistics.parking}</p>
                        <p>Restroom: {selectedReviewLocation.logistics.restroom}</p>
                        <p>Walk: {selectedReviewLocation.logistics.walkingDistance}</p>
                        {selectedReviewLocation.venueBucket && <p>Type: {selectedReviewLocation.venueBucket}</p>}
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                      <p className="font-semibold">No map-ready locations yet</p>
                      <p className="mt-1">Try regenerating with a broader area or use provided locations with clearer place names.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeReviewTab === 'locations' && (
              <div className="space-y-4">
                <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-900">
                  Use the feedback controls to pressure-test location quality. Thumbs affect ordering locally, “Prefer this type” boosts similar spots in review, and “Exclude this type” removes that venue type from the current plan review.
                </div>

                {emptyLocationMessage && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                    <p className="font-semibold">No visible locations right now</p>
                    <p className="mt-1">{emptyLocationMessage}</p>
                  </div>
                )}

                {displayedLocations.map(location => {
                  const locationKey = (location.displayName || location.name).toLowerCase();
                  const currentVote = locationVotes[locationKey];
                  const isPreferredType = !!location.venueBucket && preferredVenueBucket === location.venueBucket;
                  const isExcludedType = !!location.venueBucket && excludedVenueBuckets.includes(location.venueBucket);

                  return (
                    <div key={location.name} className="rounded-lg border border-gray-200 p-3">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-gray-900">{location.displayName || location.name}</p>
                          {location.displayName && location.displayName !== location.name && (
                            <p className="mt-1 text-xs text-gray-500">AI label: {location.name}</p>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => setLocationVote(location, 'up')}
                            className={`rounded-full border px-2 py-1 text-xs ${
                              currentVote === 'up'
                                ? 'border-emerald-600 bg-emerald-50 text-emerald-700'
                                : 'border-gray-300 bg-white text-gray-700'
                            }`}
                          >
                            👍 Relevant
                          </button>
                          <button
                            type="button"
                            onClick={() => setLocationVote(location, 'down')}
                            className={`rounded-full border px-2 py-1 text-xs ${
                              currentVote === 'down'
                                ? 'border-red-600 bg-red-50 text-red-700'
                                : 'border-gray-300 bg-white text-gray-700'
                            }`}
                          >
                            👎 Not relevant
                          </button>
                          {location.venueBucket && (
                            <button
                              type="button"
                              onClick={() => togglePreferredVenueBucket(location.venueBucket)}
                              className={`rounded-full border px-2 py-1 text-xs ${
                                isPreferredType
                                  ? 'border-blue-600 bg-blue-50 text-blue-700'
                                  : 'border-gray-300 bg-white text-gray-700'
                              }`}
                            >
                              ⭐ Prefer this type
                            </button>
                          )}
                          {location.venueBucket && (
                            <button
                              type="button"
                              onClick={() => toggleExcludedVenueBucket(location.venueBucket)}
                              className={`rounded-full border px-2 py-1 text-xs ${
                                isExcludedType
                                  ? 'border-amber-600 bg-amber-50 text-amber-700'
                                  : 'border-gray-300 bg-white text-gray-700'
                              }`}
                            >
                              🚫 Exclude this type
                            </button>
                          )}
                        </div>
                      </div>

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
                  );
                })}

                {plan.locationRefinements && plan.locationRefinements.length > 0 && (
                  <div>
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
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeReviewTab === 'shot-list' && (
              <div className="space-y-3">
                {emptyShotMessage && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                    <p className="font-semibold">No visible shots right now</p>
                    <p className="mt-1">{emptyShotMessage}</p>
                  </div>
                )}

                <div className="grid gap-3 lg:grid-cols-2">
                {displayedShots.map(shot => (
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
              </div>
            )}

            {activeReviewTab === 'timeline' && (
              <div className="space-y-3">
                {plan.timeline.map(item => (
                  <div key={`${item.timeBlock}-${item.focus}`} className="rounded-lg border border-gray-200 p-3">
                    <p className="text-sm font-semibold text-gray-900">{item.timeBlock}</p>
                    <p className="text-sm text-blue-700">{item.focus}</p>
                    <p className="mt-1 text-sm text-gray-600">{item.notes}</p>
                  </div>
                ))}
              </div>
            )}

            {activeReviewTab === 'prep' && (
              <div className="grid gap-6 lg:grid-cols-2">
                <div>
                  <h4 className="mb-3 text-lg font-semibold text-gray-900">Client Prep Checklist</h4>
                  <ul className="list-inside list-disc space-y-1 text-sm text-gray-700">
                    {plan.clientPrepChecklist.map(item => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="mb-3 text-lg font-semibold text-gray-900">Contingency Plans</h4>
                  <ul className="list-inside list-disc space-y-1 text-sm text-gray-700">
                    {plan.contingencyPlans.map(item => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
            </div>
          </Card>

          <div className="sticky bottom-3 z-10 md:hidden">
            <div className="rounded-2xl border border-gray-200 bg-white/95 p-3 shadow-lg backdrop-blur">
              <div className="grid grid-cols-2 gap-2">
                <Button variant="ghost" isLoading={isRefining} onClick={() => void refinePlan()}>
                  {isRefining ? 'Refining...' : 'Refine'}
                </Button>
                <Button variant="secondary" isLoading={isApplying} onClick={() => void applyPlanToWorkspace()}>
                  {isApplying ? 'Applying...' : 'Create Project'}
                </Button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
