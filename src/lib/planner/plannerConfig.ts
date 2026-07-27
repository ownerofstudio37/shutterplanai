// ─── Domain types ────────────────────────────────────────────────────────────

export interface SessionPlanLocation {
  name: string;
  whyItWorks: string;
  microLocations: string[];
  microLocationPlan?: SessionPlanMicroLocation[];
  selectionReasons?: string[];
  confidenceScore?: number;
  venueBucket?: string;
  sourceQuery?: string;
  visualFit?: string;
  crowdRisk?: 'low' | 'medium' | 'high';
  permitRisk?: 'low' | 'medium' | 'high';
  weatherBackupQuality?: 'poor' | 'fair' | 'strong';
  sunDirectionUsefulness?: string;
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

export interface SessionPlanMicroLocation {
  id: string;
  name: string;
  exactPin?: string;
  purpose: string;
  bestLightDirection: string;
  bestShotTypes: string[];
  walkingOrder: number;
  backupUse: string;
  parkingNote?: string;
  restroomNote?: string;
  resetNote?: string;
  latitude?: number | null;
  longitude?: number | null;
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
  lensSuggestion?: string;
  deliverableCategory?: string;
  angleSuggestion?: string;
  backupMicroSpot?: string;
  priority?: 'must-have' | 'should-have' | 'nice-to-have';
  lightWeatherNote?: string;
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
  plannerBrain?: PlannerBrainState;
  photographerPlan?: PhotographerPlanOutput;
  clientGuide?: ClientGuideOutput;
}

export type PlannerStageId =
  | 'intake'
  | 'location_discovery'
  | 'location_selection'
  | 'micro_location_mapping'
  | 'shot_list_generation'
  | 'sun_weather_optimization'
  | 'client_guide_generation';

export interface PlannerBrainState {
  currentStage: PlannerStageId;
  completedStages: PlannerStageId[];
  nextRecommendedStage: PlannerStageId;
  lockedSections: string[];
  manualModeAvailable: boolean;
}

export interface PhotographerPlanOutput {
  timeline: SessionPlanTimelineItem[];
  shotList: SessionPlanShot[];
  microLocationMap: SessionPlanMicroLocation[];
  sunWeatherNotes: string[];
  priorityChecklist: string[];
  backupPlan: string[];
}

export interface ClientGuideOutput {
  arrivalInstructions: string;
  parking: string;
  whatToWearAndBring: string[];
  sessionFlow: string;
  weatherExpectations: string;
  reassurance: string;
  tone: string;
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
  | 'desiredLocationCount'
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
  desiredLocationCount?: string;
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
  desiredLocationCount?: string;
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
    morningGoldenHourStart?: string;
    morningGoldenHourEnd?: string;
    morningBlueHourStart?: string;
    morningBlueHourEnd?: string;
    eveningBlueHourStart?: string;
    eveningBlueHourEnd?: string;
  };
  weather?: {
    temperature?: number;
    apparentTemperature?: number;
    humidity?: number;
    cloudCover: number;
    uvIndex: number;
    windSpeed: number;
    windGustSpeed: number;
    precipitationProbability: number;
    conditionSummary?: string;
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
  sunWindows?: {
    morningGolden: {
      label: string;
      startsAt: string;
      endsAt: string;
      confidence: number;
      summary: string;
    };
    eveningGolden: {
      label: string;
      startsAt: string;
      endsAt: string;
      confidence: number;
      summary: string;
    };
    morningBlue: {
      label: string;
      startsAt: string;
      endsAt: string;
      confidence: number;
      summary: string;
    };
    eveningBlue: {
      label: string;
      startsAt: string;
      endsAt: string;
      confidence: number;
      summary: string;
    };
  };
  logistics: Array<{
    parkingDifficulty: number;
    restroomAccessibility: number;
    permitLikelihood: number;
    crowdRisk: number;
    accessibility: number;
    overallRisk: number;
    warnings: string[];
    venueHoursSummary?: string;
    parkingCost?: string;
    restroomConfidence?: 'low' | 'medium' | 'high';
    permit?: {
      likelihood: 'low' | 'medium' | 'high';
      sourceNote: string;
      leadTimeDays: number;
      noPermitAlternatives: string[];
    };
    crowd?: {
      eventRisk: 'low' | 'medium' | 'high';
      sourceNote: string;
    };
    needsVerification?: boolean;
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
    prompt: 'Should I find the shoot location, or are we building around one you already chose?',
    options: ['Find locations for me', 'I already have locations'],
    required: true,
  },
  {
    id: 'providedLocations',
    prompt: 'What chosen location should we map micro-spots inside?',
    placeholder: 'Example: White Rock Lake, then note any known parking, trail, garden, or building zones',
    showWhen: mode => mode === 'use-provided',
    required: true,
  },
  {
    id: 'city',
    prompt: 'What city or area should I search for location candidates?',
    placeholder: 'Dallas, TX or a neighborhood/ZIP',
    showWhen: mode => mode === 'find-locations',
  },
  {
    id: 'desiredLocationCount',
    prompt: 'How many final shoot locations do you actually want to use?',
    options: ['1 location', '2 locations', '3 locations', '4+ locations'],
    placeholder: 'Most sessions only need 1-2 locations',
    required: true,
  },
  {
    id: 'subjectDetails',
    prompt: 'Who is being photographed, and what does the client need delivered?',
    placeholder: '5 people, 2 toddlers, grandparents included; needs full family, siblings, parents, kid solos',
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
    prompt: 'How long do we have to move through the location and complete the shot list?',
    placeholder: '60 minutes',
    required: true,
  },
  {
    id: 'mood',
    prompt: 'What is your shooting style for this plan?',
    placeholder: 'Warm, candid, movement-first, true-to-color, editorial, lightly posed',
    required: true,
  },
  {
    id: 'mustHaveShots',
    prompt: 'What deliverables or must-have frames should the shot list cover?',
    placeholder: 'Whole family, siblings, parents together, individual portraits, detail shots, horizontal hero crop',
  },
  {
    id: 'constraints',
    prompt: 'What should I plan around for sun, weather, logistics, or client comfort?',
    placeholder: 'Golden hour, shade, wind/rain backup, mobility, parking, permits, restroom, short toddler attention span',
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
    desiredLocationCount: '1 location',
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
    desiredLocationCount: '2 locations',
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
    desiredLocationCount: '2 locations',
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
    desiredLocationCount: '3 locations',
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
  if (question.id === 'desiredLocationCount') {
    if (sessionCategory === 'family') return 'How many locations should the family actually visit?';
    if (sessionCategory === 'engagement') return 'How many locations should be in the final engagement route?';
    if (sessionCategory === 'event') return 'How many venue zones should the event coverage prioritize?';
    return 'How many final shoot locations should this plan use?';
  }

  if (question.id === 'subjectDetails') {
    if (sessionCategory === 'family') return 'Who is in the family, and what images do they expect in the gallery?';
    if (sessionCategory === 'engagement') return 'Tell me about the couple, their story, and the images they care most about.';
    if (sessionCategory === 'event') return 'Who are the key people, moments, and deliverables to prioritize?';
  }

  if (question.id === 'mustHaveShots') {
    if (sessionCategory === 'family') return 'Which family deliverables are non-negotiable?';
    if (sessionCategory === 'engagement') return 'Which couple moments, ring/details, and hero frames are required?';
    if (sessionCategory === 'event') return 'List must-capture moments, VIPs, sponsor details, and room shots.';
  }

  if (question.id === 'constraints') {
    if (sessionCategory === 'family') return 'Any sun, weather, walking, nap, stroller, or attention-span constraints?';
    if (sessionCategory === 'engagement') return 'Any sun, weather, outfit-change, permit, or privacy constraints?';
    if (sessionCategory === 'event') return 'Any timing, venue-rule, weather, access, or lighting constraints?';
  }

  return question.prompt;
}

export function getAdaptivePlaceholder(question: ChatQuestion, sessionCategory: SessionCategory) {
  if (question.id === 'desiredLocationCount') {
    if (sessionCategory === 'family') return '1 location is usually best for young kids';
    if (sessionCategory === 'engagement') return '2 locations for variety without rushing';
    if (sessionCategory === 'event') return '3 venue zones or coverage areas';
    return '2 locations';
  }

  if (question.id === 'subjectDetails') {
    if (sessionCategory === 'family') return '2 parents, 3 kids; needs full family, siblings, kid solos, parent portraits';
    if (sessionCategory === 'engagement') return 'Recently engaged couple; wants walking candids, ring detail, wide scenic hero images';
    if (sessionCategory === 'event') return '80-person event; keynote, networking, sponsor details, audience reactions';
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
