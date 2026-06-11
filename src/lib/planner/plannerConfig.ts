// ─── Domain types ────────────────────────────────────────────────────────────

export interface SessionPlanLocation {
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

export interface SessionPlanTimelineItem {
  timeBlock: string;
  focus: string;
  notes: string;
}

export interface SessionPlanShot {
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

export interface LocationRefinement {
  name: string;
  kidFriendlinessScore: number;
  crowdRiskScore: number;
  walkingBurdenScore: number;
  overallScore: number;
  bestTimeWindow: string;
  rationale: string;
  recommendedMicroSpots: string[];
}

export interface SessionPlan {
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

export type BusinessProfile = {
  businessName?: string;
  businessType?: string;
  address?: string;
  zipCode?: string;
  baseLocation?: string;
  websiteUrl?: string;
  websiteSummary?: string;
  brandTone?: string;
  guideLogoUrl?: string;
  guidePrimaryColor?: string;
  guideAccentColor?: string;
  preferredLocationTypes?: string;
  avoidLocationTypes?: string;
  poseDirectionStyle?: string;
  prepGuideNotes?: string;
};

export type LocationMode = 'find-locations' | 'use-provided';

export type ChatQuestionId =
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

export type ChatQuestion = {
  id: ChatQuestionId;
  prompt: string;
  placeholder?: string;
  options?: string[];
  required?: boolean;
  showWhen?: (mode: LocationMode, sessionCategory: SessionCategory) => boolean;
};

export type SessionCategory = 'family' | 'engagement' | 'portrait' | 'event';
export type ReviewTab = 'map' | 'locations' | 'shot-list' | 'timeline' | 'prep';
export type LocationVote = 'up' | 'down';
export type WorkflowStage = 'intake' | 'review' | 'apply';

export type PlannerPreset = {
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

export type PlannerDraftState = {
  shootType: string;
  city: string;
  duration: string;
  mood: string;
  subjectDetails: string;
  mustHaveShots: string;
  constraints: string;
  locationMode: LocationMode;
  providedLocations: string;
  familyPacing?: string;
  engagementStory?: string;
  brandingGoals?: string;
  eventPriorities?: string;
  shootDate?: string;
  // V2: multi-day fields (behind feature flag — ignored by single-day flow)
  multiDay?: boolean;
  sessionDates?: string[]; // ISO date strings e.g. ['2026-07-01', '2026-07-02']
  dailyDurationMinutes?: number; // per-day shoot duration override
  maxTravelMinutesPerDay?: number; // travel budget per day
};

export type PlannerDraft = {
  id: string;
  planState: PlannerDraftState;
  status: 'intake' | 'review' | 'applying';
  createdAt: string;
  updatedAt: string;
};

export type PlannerIntelligence = {
  goldenHours: {
    sunrise: string;
    sunset: string;
    goldenHourStart: string;
    goldenHourEnd: string;
  };
  weather?: {
    cloudCover: number;
    uvIndex: number;
    windSpeed: number;
    windGustSpeed: number;
    precipitationProbability: number;
    recommendations: string[];
    provider: 'open-meteo' | 'fallback';
  };
  confidence?: {
    overall: number;
    windows: Array<{
      label: string;
      startsAt: string;
      endsAt: string;
      confidence: number;
      summary: string;
    }>;
  };
  logistics: Array<{
    parkingDifficulty: number;
    restroomAccessibility: number;
    permitLikelihood: number;
    crowdRisk: number;
    accessibility: number;
    overallRisk: number;
    warnings: string[];
  }>;
  optimizedRoute: number[];
};

// ─── Constants ────────────────────────────────────────────────────────────────

export const PLANNER_DRAFT_STORAGE_KEY = 'planner:draft:v1';

export const CHAT_QUESTIONS: ChatQuestion[] = [
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

export const PLANNER_PRESETS: PlannerPreset[] = [
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

// ─── Chat helpers ─────────────────────────────────────────────────────────────

export function getSessionCategory(shootTypeValue: string): SessionCategory {
  const value = shootTypeValue.toLowerCase();
  if (/family|newborn|maternity|kids|children/.test(value)) return 'family';
  if (/engagement|proposal|couple|anniversary/.test(value)) return 'engagement';
  if (/branding|brand|headshot|personal brand/.test(value)) return 'portrait';
  if (/event|wedding|party|corporate/.test(value)) return 'event';
  return 'portrait';
}

export function getAdaptivePrompt(question: ChatQuestion, sessionCategory: SessionCategory) {
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

export function getAdaptivePlaceholder(question: ChatQuestion, sessionCategory: SessionCategory) {
  if (question.id === 'subjectDetails') {
    if (sessionCategory === 'family') return '2 parents, 3 kids (ages 2, 5, 8), stroller needed';
    if (sessionCategory === 'engagement') return 'Recently engaged couple, natural chemistry, want candid + editorial mix';
    if (sessionCategory === 'event') return '80-person event, keynote + networking + sponsor details';
  }

  return question.placeholder ?? 'Type your answer...';
}

export function getQuickReplyOptions(question: ChatQuestion, sessionCategory: SessionCategory): string[] {
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

export function getBusinessProfileTemplates(
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
