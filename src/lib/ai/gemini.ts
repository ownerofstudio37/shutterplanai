import type { LocationCandidate } from '@/lib/geo/geocode';

interface ProjectContext {
  title: string;
  description: string;
  status: string;
}

interface ExistingShotContext {
  title: string;
  description: string;
  location: string | null;
  status: string;
}

export interface ShotSuggestion {
  title: string;
  description: string;
  location: string;
  notes: string;
  plannedTimeHint: string;
}

export interface SessionPlanLocation {
  name: string;
  whyItWorks: string;
  microLocations: string[];
  selectionReasons?: string[];
  confidenceScore?: number;
  venueBucket?: string;
  sourceQuery?: string;
  displayName?: string;
  googleMapsUrl?: string;
  latitude?: number | null;
  longitude?: number | null;
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
}

export interface SessionPlan {
  projectTitle: string;
  creativeDirection: string;
  timeline: SessionPlanTimelineItem[];
  locationSuggestions: SessionPlanLocation[];
  shotList: SessionPlanShot[];
  clientPrepChecklist: string[];
  contingencyPlans: string[];
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

export interface SessionPlanRefinement {
  locationRefinements: LocationRefinement[];
  updatedContingencyPlans: string[];
}

type SessionCategory = 'family' | 'engagement' | 'portrait' | 'event';

export interface BusinessContext {
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
}

interface SessionPlanningDataPackage {
  sessionCategory: SessionCategory;
  durationMinutes: number;
  shotCountTarget: { min: number; max: number };
  locationCandidates: Array<{
    name: string;
    displayName?: string;
    latitude?: number | null;
    longitude?: number | null;
    relevanceScore?: number;
  }>;
  requiredShots: SessionPlanShot[];
  clientPrepChecklist: string[];
  contingencyPlans: string[];
  timeline: SessionPlanTimelineItem[];
  hardRules: string[];
  businessContext?: BusinessContext;
}

function getSessionCategory(shootType: string): SessionCategory {
  const value = shootType.toLowerCase();
  if (/family|newborn|maternity|kids|children/.test(value)) return 'family';
  if (/engagement|proposal|couple|anniversary/.test(value)) return 'engagement';
  if (/branding|brand|headshot|personal brand/.test(value)) return 'portrait';
  if (/event|wedding|party|corporate/.test(value)) return 'event';
  return 'portrait';
}

function parseDurationMinutes(duration?: string): number {
  if (!duration) return 90;
  const value = duration.toLowerCase().trim();

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

function getShotCountTarget(durationMinutes: number) {
  if (durationMinutes <= 35) return { min: 5, max: 8 };
  if (durationMinutes <= 60) return { min: 7, max: 11 };
  if (durationMinutes <= 90) return { min: 9, max: 14 };
  return { min: 12, max: 18 };
}

function buildTimelineForDuration(durationMinutes: number): SessionPlanTimelineItem[] {
  if (durationMinutes <= 35) {
    return [
      { timeBlock: 'Arrival + Fast Setup (0-5 min)', focus: 'Quick alignment', notes: 'Confirm must-have shots and pick first micro-spot immediately.' },
      { timeBlock: `Core Portraits (5-${Math.max(15, durationMinutes - 12)} min)`, focus: 'Priority hero frames', notes: 'Capture strongest compositions first with minimal transitions.' },
      { timeBlock: `Movement + Details (${Math.max(15, durationMinutes - 12)}-${durationMinutes} min)`, focus: 'Candid + ring/detail finishers', notes: 'End with quick candid movement and close-up detail safety frames.' },
    ];
  }

  if (durationMinutes <= 60) {
    const block1End = Math.round(durationMinutes * 0.2);
    const block2End = Math.round(durationMinutes * 0.55);
    const block3End = Math.round(durationMinutes * 0.85);
    return [
      { timeBlock: `Arrival + Warmup (0-${block1End} min)`, focus: 'Comfort + setup', notes: 'Confirm shot order and settle into natural pacing.' },
      { timeBlock: `Core Portraits (${block1End}-${block2End} min)`, focus: 'Hero compositions', notes: 'Prioritize must-have frames while energy is highest.' },
      { timeBlock: `Variety + Movement (${block2End}-${block3End} min)`, focus: 'Lifestyle variety', notes: 'Shift to candid prompts and perspective changes.' },
      { timeBlock: `Closing Signatures (${block3End}-${durationMinutes} min)`, focus: 'Final impact frames', notes: 'Close with one safe frame and one creative frame.' },
    ];
  }

  const block1End = Math.round(durationMinutes * 0.18);
  const block2End = Math.round(durationMinutes * 0.45);
  const block3End = Math.round(durationMinutes * 0.75);
  return [
    { timeBlock: `Arrival + Warmup (0-${block1End} min)`, focus: 'Introduce flow and comfort', notes: 'Quick orientation, confirm wardrobe, and align on key outcomes.' },
    { timeBlock: `Core Portraits (${block1End}-${block2End} min)`, focus: 'Reliable hero images', notes: 'Capture must-have frames first while energy is high.' },
    { timeBlock: `Variety + Movement (${block2End}-${block3End} min)`, focus: 'Lifestyle and candid variety', notes: 'Use prompts and transitions between micro-locations.' },
    { timeBlock: `Final Highlights (${block3End}-${durationMinutes} min)`, focus: 'Signature closing shots', notes: 'Finish with 1-2 bold compositions and backup safety frame.' },
  ];
}

function buildClientPrepChecklist(input: {
  sessionCategory: SessionCategory;
  durationMinutes: number;
  businessContext?: BusinessContext;
}): string[] {
  const common = [
    'Arrive 10 minutes early so the session can start on time.',
    input.durationMinutes <= 45
      ? 'Keep the wardrobe simple and move-ready for a short session.'
      : 'Bring comfortable shoes for movement between micro-locations.',
    'Share any must-have shots or no-go ideas before arrival.',
  ];

  if (input.sessionCategory === 'engagement') {
    const base = [
      ...common,
      'Bring rings cleaned and ready for close-up detail shots.',
      'Keep hands groomed and pockets clear for clean posing.',
      'If changing outfits, bring a compact backup and a place to change.',
    ];
    return [
      ...(input.businessContext?.prepGuideNotes ? [`Brand prep note: ${input.businessContext.prepGuideNotes}`] : []),
      ...base,
    ].slice(0, 7);
  }

  if (input.sessionCategory === 'family') {
    const base = [
      ...common,
      'Pack snacks, water, and any comfort items for kids.',
      'Bring wipes, tissues, and a backup outfit for small messes.',
      'Let everyone wear shoes they can walk in comfortably.',
    ];
    return [
      ...(input.businessContext?.prepGuideNotes ? [`Brand prep note: ${input.businessContext.prepGuideNotes}`] : []),
      ...base,
    ].slice(0, 7);
  }

  if (input.sessionCategory === 'event') {
    const base = [
      ...common,
      'Send any logos, speakers, or VIP names that need to be captured.',
      'Confirm any venue or permit constraints before arrival.',
      'Bring a shot priority list for key moments and must-have people.',
    ];
    return [
      ...(input.businessContext?.prepGuideNotes ? [`Brand prep note: ${input.businessContext.prepGuideNotes}`] : []),
      ...base,
    ].slice(0, 7);
  }

  const base = [
    ...common,
    'Bring outfit options that read cleanly on camera without heavy pattern clashes.',
    'Confirm preferred focal length / framing style if you have one.',
    'Share any accessibility or mobility needs before the session begins.',
  ];

  return [
    ...(input.businessContext?.prepGuideNotes ? [`Brand prep note: ${input.businessContext.prepGuideNotes}`] : []),
    ...base,
  ].slice(0, 7);
}

function buildContingencyPlans(input: { sessionCategory: SessionCategory; durationMinutes: number }): string[] {
  const plans = [
    'If weather shifts, move to covered walkways or nearby indoor public spaces.',
    'If the location is crowded, switch to tighter compositions and alternate micro-spots.',
  ];

  if (input.sessionCategory === 'family') {
    plans.unshift('If energy drops, switch to quick movement prompts and short burst cycles.');
  } else if (input.sessionCategory === 'engagement') {
    plans.unshift('If energy feels stiff, switch to walking prompts and close interactive poses.');
  } else {
    plans.unshift('If the light becomes harsh, move to open shade and use reflective backgrounds.');
  }

  if (input.durationMinutes <= 45) {
    plans.push('If time runs short, prioritize the hero shot, detail shot, and one closing frame.');
  }

  return plans.slice(0, 4);
}

function buildRequiredShotTemplates(input: {
  sessionCategory: SessionCategory;
  durationMinutes: number;
}): SessionPlanShot[] {
  if (input.sessionCategory === 'engagement') {
    return [
      {
        title: 'Hero couple portrait',
        description: 'Clean anchor frame with natural connection.',
        location: '',
        microSpot: 'Primary scenic spot',
        poseSuggestion: 'Close stance with soft touch points and relaxed eye lines.',
        compositionSuggestion: 'Eye-level frame with separation from background.',
        timingHint: 'Start of session',
        notes: 'Use this as the primary portfolio frame.',
      },
      {
        title: 'Walking handhold',
        description: 'Movement-based candid that feels effortless.',
        location: '',
        microSpot: 'Pathway or promenade',
        poseSuggestion: 'Walk slowly, look at each other, and keep the pace natural.',
        compositionSuggestion: 'Slightly wide framing with room to move through the scene.',
        timingHint: 'Early-mid session',
        notes: 'Great for reducing stiffness.',
      },
      {
        title: 'Forehead to forehead',
        description: 'Intimate portrait with a soft emotional tone.',
        location: '',
        microSpot: 'Open shade',
        poseSuggestion: 'Foreheads together, shoulders relaxed, hands connected.',
        compositionSuggestion: 'Medium-tight crop with shallow background separation.',
        timingHint: 'Mid-session',
        notes: 'Keep it calm and minimal.',
      },
      {
        title: 'Ring detail close-up',
        description: 'Close-up of the ring and hand connection.',
        location: '',
        microSpot: 'Any clean background',
        poseSuggestion: 'Hold hands naturally and rotate slightly toward the light.',
        compositionSuggestion: 'Tight detail crop with shallow depth of field.',
        timingHint: 'Any time',
        notes: 'Make sure nails and hands are clean and natural.',
      },
      {
        title: 'Laughing candid',
        description: 'Natural laugh frame for a lively expression.',
        location: '',
        microSpot: 'Flexible scenic spot',
        poseSuggestion: 'Prompt a quick inside joke or movement cue.',
        compositionSuggestion: 'Loose composition that leaves room for motion.',
        timingHint: 'Mid-session',
        notes: 'Use burst mode to catch real expressions.',
      },
      {
        title: 'Wide environmental portrait',
        description: 'Contextual frame that shows the setting and mood.',
        location: '',
        microSpot: 'Scenic overview',
        poseSuggestion: 'Keep the couple small in frame with strong environment lines.',
        compositionSuggestion: 'Wide framing with layers and leading lines.',
        timingHint: 'Late session',
        notes: 'A strong finale or opener depending on light.',
      },
    ].slice(0, input.durationMinutes <= 35 ? 5 : 6);
  }

  if (input.sessionCategory === 'family') {
    return [
      {
        title: 'Whole family portrait',
        description: 'Anchor frame with everyone visible and connected.',
        location: '',
        microSpot: 'Open family-friendly area',
        poseSuggestion: 'Triangular grouping with staggered heights and connected hands.',
        compositionSuggestion: 'Centered frame with clean background separation.',
        timingHint: 'Start of session',
        notes: 'Get the hardest shot first.',
      },
      {
        title: 'Parents together',
        description: 'Couple-focused frame to give the gallery variety.',
        location: '',
        microSpot: 'Open shade or clean backdrop',
        poseSuggestion: 'Close stance, subtle touch points, relaxed expressions.',
        compositionSuggestion: 'Medium-tight crop with soft background blur.',
        timingHint: 'Early session',
        notes: 'Provides a polished adult-only frame.',
      },
      {
        title: 'Kids together candid',
        description: 'Natural sibling interaction or group play frame.',
        location: '',
        microSpot: 'Path or open lawn',
        poseSuggestion: 'Prompt a short interaction game or movement cue.',
        compositionSuggestion: 'Horizontal framing with room for motion.',
        timingHint: 'Mid-session',
        notes: 'Keep directions short and playful.',
      },
      {
        title: 'Individual child portrait',
        description: 'One clean portrait per child for variety.',
        location: '',
        microSpot: 'Calm, quiet background',
        poseSuggestion: 'Simple sitting or standing pose with natural expression.',
        compositionSuggestion: 'Tight framing for expression focus.',
        timingHint: 'Mid-session',
        notes: 'Rotate quickly to keep attention high.',
      },
      {
        title: 'Walking candid sequence',
        description: 'Movement frame to capture real family energy.',
        location: '',
        microSpot: 'Trail or walkway',
        poseSuggestion: 'Walk together and prompt conversation.',
        compositionSuggestion: 'Slightly wide framing with directional flow.',
        timingHint: 'Any time',
        notes: 'Great if kids need a reset.',
      },
      {
        title: 'Closing connection frame',
        description: 'Final shot with everyone together for a strong ender.',
        location: '',
        microSpot: 'Best remaining scenic spot',
        poseSuggestion: 'Tight connected grouping with relaxed smiles.',
        compositionSuggestion: 'Balanced composition with a clean edge.',
        timingHint: 'End of session',
        notes: 'Use as your final keep-safe frame.',
      },
    ].slice(0, input.durationMinutes <= 35 ? 5 : 6);
  }

  return [
    {
      title: 'Hero portrait',
      description: 'Main subject portrait with clean framing.',
      location: '',
      microSpot: 'Primary scenic spot',
      poseSuggestion: 'Relaxed posture with a slight shoulder turn.',
      compositionSuggestion: 'Medium framing with good separation.',
      timingHint: 'Start of session',
      notes: 'This should be the most reliable frame.',
    },
    {
      title: 'Environmental portrait',
      description: 'Subject framed by the setting for context.',
      location: '',
      microSpot: 'Best scenic backdrop',
      poseSuggestion: 'Stand or sit naturally in the environment.',
      compositionSuggestion: 'Wide-to-medium framing with leading lines.',
      timingHint: 'Mid-session',
      notes: 'Use a clean background with visual depth.',
    },
    {
      title: 'Movement variation',
      description: 'A candid action frame with motion.',
      location: '',
      microSpot: 'Pathway or open area',
      poseSuggestion: 'Walk slowly or shift weight to create natural movement.',
      compositionSuggestion: 'Loose framing with a bit of room to move.',
      timingHint: 'Mid-session',
      notes: 'Use to avoid a static gallery.',
    },
    {
      title: 'Detail close-up',
      description: 'Hands, accessories, textures, or meaningful details.',
      location: '',
      microSpot: 'Clean detail spot',
      poseSuggestion: 'Hold or angle the details toward the light.',
      compositionSuggestion: 'Tight crop and shallow depth of field.',
      timingHint: 'Any time',
      notes: 'Great for album pacing.',
    },
    {
      title: 'Closing signature frame',
      description: 'The final polished frame to end the sequence.',
      location: '',
      microSpot: 'Best remaining spot',
      poseSuggestion: 'Confident, connected, and relaxed.',
      compositionSuggestion: 'Cinematic framing with strong composition.',
      timingHint: 'End of session',
      notes: 'Leave with one portfolio-level image.',
    },
  ].slice(0, input.durationMinutes <= 35 ? 4 : 5);
}

function mergeShots(primary: SessionPlanShot[], secondary: SessionPlanShot[], maxItems: number) {
  const seen = new Set<string>();
  const output: SessionPlanShot[] = [];

  for (const shot of [...primary, ...secondary]) {
    const key = shot.title.toLowerCase().trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    output.push(shot);
    if (output.length >= maxItems) break;
  }

  return output;
}

function buildSessionPlanningDataPackage(input: {
  shootType: string;
  city: string;
  duration?: string;
  locationCandidates?: LocationCandidate[];
  businessContext?: BusinessContext;
}) : SessionPlanningDataPackage {
  const sessionCategory = getSessionCategory(input.shootType);
  const durationMinutes = parseDurationMinutes(input.duration);
  const shotCountTarget = getShotCountTarget(durationMinutes);
  const requiredShots = buildRequiredShotTemplates({
    sessionCategory,
    durationMinutes,
  });

  return {
    sessionCategory,
    durationMinutes,
    shotCountTarget,
    locationCandidates: (input.locationCandidates ?? []).map(candidate => ({
      name: candidate.name,
      displayName: candidate.displayName,
      latitude: candidate.latitude,
      longitude: candidate.longitude,
      relevanceScore: candidate.relevanceScore,
    })),
    requiredShots,
    clientPrepChecklist: buildClientPrepChecklist({
      sessionCategory,
      durationMinutes,
      businessContext: input.businessContext,
    }),
    contingencyPlans: buildContingencyPlans({ sessionCategory, durationMinutes }),
    timeline: buildTimelineForDuration(durationMinutes),
    hardRules: [
      sessionCategory === 'engagement'
        ? 'Couple-only session. No kid, sibling, or family-group shots.'
        : '',
      sessionCategory === 'family'
        ? 'Family-friendly pacing, low-walk, and child-safe location choices only.'
        : '',
      `Use ${durationMinutes} minutes as the session length target.`,
      `Generate between ${shotCountTarget.min} and ${shotCountTarget.max} shots.`,
      'Use only real location candidates and do not invent locations.',
      input.businessContext?.avoidLocationTypes
        ? `Avoid location types: ${input.businessContext.avoidLocationTypes}.`
        : '',
    ].filter(Boolean),
    businessContext: input.businessContext,
  };
}

function buildCreativeDirection(input: {
  sessionCategory: SessionCategory;
  subjectDetails: string;
  mood: string;
  durationMinutes: number;
  mustHaveShots?: string;
  constraints?: string;
  businessContext?: BusinessContext;
}) {
  const toneMap: Record<SessionCategory, string> = {
    family: 'warm, playful, and low-pressure',
    engagement: 'romantic, connected, and editorial',
    portrait: 'clean, confident, and polished',
    event: 'observational, flexible, and moment-driven',
  };

  const focusMap: Record<SessionCategory, string> = {
    family: 'keep transitions short and prioritize group connection frames first',
    engagement: 'keep the couple moving, interacting, and close to each other',
    portrait: 'create strong subject separation and clean posture variations',
    event: 'cover the must-have moments, then build supporting detail frames',
  };

  const detailBits = [
    input.subjectDetails?.trim(),
    input.mustHaveShots?.trim() ? `Must-haves: ${input.mustHaveShots.trim()}` : '',
    input.constraints?.trim() ? `Constraints: ${input.constraints.trim()}` : '',
    input.businessContext?.brandTone?.trim() ? `Brand tone: ${input.businessContext.brandTone.trim()}` : '',
    input.businessContext?.websiteSummary?.trim() ? `Website context: ${input.businessContext.websiteSummary.trim()}` : '',
    input.businessContext?.poseDirectionStyle?.trim() ? `Pose direction style: ${input.businessContext.poseDirectionStyle.trim()}` : '',
  ].filter(Boolean);

  return [
    `A ${toneMap[input.sessionCategory]} approach tailored for a ${input.durationMinutes}-minute ${input.sessionCategory} session.`,
    `Visual goal: ${input.mood || 'balanced'} energy with ${focusMap[input.sessionCategory]}.`,
    detailBits.length > 0 ? detailBits.join(' ') : 'No extra brief provided.',
  ].join(' ');
}

function buildSupplementalShotTemplates(input: {
  sessionCategory: SessionCategory;
  durationMinutes: number;
}): SessionPlanShot[] {
  if (input.sessionCategory === 'engagement') {
    return [
      {
        title: 'Over-the-shoulder close-up',
        description: 'A tighter framing that adds intimacy and depth.',
        location: '',
        microSpot: 'Best close background',
        poseSuggestion: 'Have one partner look past the other into the light.',
        compositionSuggestion: 'Tight crop with strong foreground separation.',
        timingHint: 'Mid-session',
        notes: 'Useful when you want variety without changing location.',
      },
      {
        title: 'Ring and hands detail',
        description: 'A detail frame focused on the rings and hand connection.',
        location: '',
        microSpot: 'Any clean detail surface',
        poseSuggestion: 'Interlock hands and rotate slightly toward the camera.',
        compositionSuggestion: 'Macro-leaning crop with shallow depth of field.',
        timingHint: 'Any time',
        notes: 'Keep the hands relaxed and clean.',
      },
    ].slice(0, input.durationMinutes <= 45 ? 1 : 2);
  }

  if (input.sessionCategory === 'family') {
    return [
      {
        title: 'Parent with child close-up',
        description: 'A softer connection frame that breaks up the gallery.',
        location: '',
        microSpot: 'Quiet backdrop',
        poseSuggestion: 'Have the child sit or lean naturally into a parent.',
        compositionSuggestion: 'Medium-tight framing with a gentle angle.',
        timingHint: 'Mid-session',
        notes: 'Works well for calmer pacing.',
      },
      {
        title: 'Movement burst sequence',
        description: 'A quick series of walking or playful frames.',
        location: '',
        microSpot: 'Open walking path',
        poseSuggestion: 'Count down, walk, twirl, or play a short game.',
        compositionSuggestion: 'Loose framing with room for motion blur.',
        timingHint: 'Mid-session',
        notes: 'Great for restless kids.',
      },
    ].slice(0, input.durationMinutes <= 45 ? 1 : 2);
  }

  return [
    {
      title: 'Environmental variation',
      description: 'A wider frame that shows the setting and adds pacing.',
      location: '',
      microSpot: 'Best scenic background',
      poseSuggestion: 'Use a simple stance or seated pose with clean lines.',
      compositionSuggestion: 'Wide framing with the subject slightly off center.',
      timingHint: 'Mid-session',
      notes: 'Adds variety for a short list.',
    },
    {
      title: 'Profile or seated portrait',
      description: 'A quieter framing option for a polished final set.',
      location: '',
      microSpot: 'Any clean backdrop',
      poseSuggestion: 'Turn the body slightly and keep the expression relaxed.',
      compositionSuggestion: 'Medium crop with soft background separation.',
      timingHint: 'Late session',
      notes: 'Useful for ending on a calm frame.',
    },
  ].slice(0, input.durationMinutes <= 45 ? 1 : 2);
}

function buildGroundedLocationSuggestions(input: {
  sessionCategory: SessionCategory;
  city: string;
  locationCandidates: Array<{
    name: string;
    displayName?: string;
    latitude?: number | null;
    longitude?: number | null;
    relevanceScore?: number;
  }>;
}): SessionPlanLocation[] {
  const preferred = input.locationCandidates.slice(0, 6);

  if (preferred.length === 0) {
    return [
      {
        name: input.city,
        whyItWorks: 'Central city fallback when no better real candidates are available.',
        microLocations: ['Open shade', 'Simple walkway', 'Quiet corner'],
        logistics: {
          parking: 'Confirm parking before arrival.',
          restroom: 'Check a nearby public restroom or venue.',
          walkingDistance: 'Keep transitions minimal.',
        },
      },
    ];
  }

  return preferred.map((candidate, index) => {
    const label = candidate.displayName?.split(',').slice(0, 2).join(',').trim() || candidate.name;
    const isFirst = index === 0;

    return {
      name: label,
      displayName: candidate.displayName || label,
      latitude: candidate.latitude ?? null,
      longitude: candidate.longitude ?? null,
      googleMapsUrl:
        candidate.latitude != null && candidate.longitude != null
          ? `https://maps.google.com/?q=${candidate.latitude},${candidate.longitude}`
          : `https://maps.google.com/?q=${encodeURIComponent(candidate.displayName || label)}`,
      whyItWorks:
        input.sessionCategory === 'engagement'
          ? isFirst
            ? 'Best anchor spot for a couple session with easy flow and strong visual variety.'
            : 'Secondary real-world option that keeps the session moving without long travel.'
          : input.sessionCategory === 'family'
            ? isFirst
              ? 'Family-friendly anchor location with the shortest walk and best pacing.'
              : 'Alternate spot that still supports quick transitions and calmer pacing.'
            : isFirst
              ? 'Strong foundational location with reliable composition options.'
              : 'Supporting location that adds variety without inventing a new venue.',
      microLocations:
        input.sessionCategory === 'engagement'
          ? ['Primary scenic angle', 'Quiet side path', 'Clean backdrop corner']
          : input.sessionCategory === 'family'
            ? ['Open shade area', 'Walking path', 'Quiet seated spot']
            : ['Leading lines', 'Texture wall', 'Open frame'],
      logistics: {
        parking: 'Confirm the closest practical parking option before the shoot.',
        restroom: 'Verify restroom access or nearby public facilities before arrival.',
        walkingDistance: candidate.latitude != null && candidate.longitude != null
          ? 'Aim for short transitions between micro-spots.'
          : 'Confirm access and keep transitions short.',
      },
    };
  });
}

function buildDeterministicPlan(input: {
  shootType: string;
  subjectDetails: string;
  city: string;
  duration?: string;
  mood: string;
  mustHaveShots?: string;
  constraints?: string;
  locationCandidates?: LocationCandidate[];
  businessContext?: BusinessContext;
}): SessionPlan {
  const planningData = buildSessionPlanningDataPackage({
    shootType: input.shootType,
    city: input.city,
    duration: input.duration,
    locationCandidates: input.locationCandidates,
    businessContext: input.businessContext,
  });

  const locationSuggestions = buildGroundedLocationSuggestions({
    sessionCategory: planningData.sessionCategory,
    city: input.city,
    locationCandidates: planningData.locationCandidates,
  });

  const supplementalShots = buildSupplementalShotTemplates({
    sessionCategory: planningData.sessionCategory,
    durationMinutes: planningData.durationMinutes,
  });

  const shotPool = mergeShots(
    planningData.requiredShots,
    supplementalShots,
    planningData.shotCountTarget.max
  ).map((shot, index) => {
    const location = locationSuggestions[index % locationSuggestions.length];
    const microSpot = location.microLocations[index % location.microLocations.length] || shot.microSpot;
    const brandNotes: string[] = [];
    if (planningData.businessContext?.businessName) {
      brandNotes.push(`Brand: ${planningData.businessContext.businessName}`);
    }
    if (planningData.businessContext?.brandTone) {
      brandNotes.push(`Brand tone: ${planningData.businessContext.brandTone}`);
    }
    if (planningData.businessContext?.poseDirectionStyle) {
      brandNotes.push(`Pose style: ${planningData.businessContext.poseDirectionStyle}`);
    }

    return {
      ...shot,
      location: location.name,
      microSpot,
      notes: [shot.notes || 'Grounded from session planning data.', ...brandNotes].filter(Boolean).join(' '),
    };
  });

  return {
    projectTitle: `${input.businessContext?.businessName ? `${input.businessContext.businessName} • ` : ''}${input.shootType} Session Plan`,
    creativeDirection: buildCreativeDirection({
      sessionCategory: planningData.sessionCategory,
      subjectDetails: input.subjectDetails,
      mood: input.mood,
      durationMinutes: planningData.durationMinutes,
      mustHaveShots: input.mustHaveShots,
      constraints: input.constraints,
      businessContext: input.businessContext,
    }),
    timeline: planningData.timeline,
    locationSuggestions,
    shotList: shotPool,
    clientPrepChecklist: planningData.clientPrepChecklist,
    contingencyPlans: planningData.contingencyPlans,
  };
}

function getGeminiConfig() {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL || 'gemini-3.1-pro-preview';
  if (!apiKey) throw new Error('Missing GEMINI_API_KEY');
  return { apiKey, model };
}

function getGeminiTimeoutMs() {
  const value = Number(process.env.GEMINI_TIMEOUT_MS);
  return Number.isFinite(value) && value >= 5_000 ? value : 35_000;
}

function getGeminiMaxRetries() {
  const value = Number(process.env.GEMINI_MAX_RETRIES);
  return Number.isFinite(value) && value >= 1 ? Math.min(Math.round(value), 4) : 2;
}

function isRetryableStatus(status: number) {
  return status === 408 || status === 429 || status >= 500;
}

function isAbortError(error: unknown) {
  return error instanceof DOMException
    ? error.name === 'AbortError'
    : error instanceof Error && error.name === 'AbortError';
}

function extractJsonArray(text: string): ShotSuggestion[] {
  const trimmed = text.trim();
  const fencedMatch = trimmed.match(/```json\s*([\s\S]*?)```/i);
  const candidate = fencedMatch?.[1] ?? trimmed;
  const startIndex = candidate.indexOf('[');
  const endIndex = candidate.lastIndexOf(']');
  if (startIndex === -1 || endIndex === -1) {
    throw new Error('AI response did not include JSON suggestions');
  }
  const parsed = JSON.parse(candidate.slice(startIndex, endIndex + 1)) as ShotSuggestion[];
  return parsed.map(item => ({
    title: item.title?.trim() || 'Untitled shot',
    description: item.description?.trim() || '',
    location: item.location?.trim() || '',
    notes: item.notes?.trim() || '',
    plannedTimeHint: item.plannedTimeHint?.trim() || '',
  }));
}

function extractJsonObject<T>(text: string): T {
  const trimmed = text.trim();
  const fencedMatch = trimmed.match(/```json\s*([\s\S]*?)```/i);
  const candidate = fencedMatch?.[1] ?? trimmed;
  const startIndex = candidate.indexOf('{');
  const endIndex = candidate.lastIndexOf('}');
  if (startIndex === -1 || endIndex === -1) {
    throw new Error('AI response did not include JSON object');
  }
  return JSON.parse(candidate.slice(startIndex, endIndex + 1)) as T;
}

async function fetchWithRetry(url: string, options: RequestInit, maxRetries = getGeminiMaxRetries()): Promise<Response> {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), getGeminiTimeoutMs());
    try {
      const response = await fetch(url, { ...options, signal: controller.signal });
      if (!response.ok && isRetryableStatus(response.status) && attempt < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        continue;
      }
      return response;
    } catch (error) {
      lastError = isAbortError(error)
        ? new Error('AI provider request timed out')
        : error instanceof Error
          ? error
          : new Error(String(error));
      if (attempt < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    } finally {
      clearTimeout(timeout);
    }
  }
  throw lastError || new Error('Fetch failed after retries');
}

function getGenericFallbackSuggestions(): ShotSuggestion[] {
  return [
    {
      title: 'Wide establishing shot',
      description: 'Capture the overall environment and setting',
      location: 'Primary location',
      notes: 'Set the scene and context',
      plannedTimeHint: 'Beginning of shoot',
    },
    {
      title: 'Detail/close-up shot',
      description: 'Focus on specific details or elements',
      location: 'Main subject area',
      notes: 'Highlight interesting textures or details',
      plannedTimeHint: 'Mid-shoot',
    },
    {
      title: 'Subject portrait',
      description: 'Professional shot of main subject',
      location: 'Studio or posed area',
      notes: 'Clean background, good lighting',
      plannedTimeHint: 'Peak lighting time',
    },
    {
      title: 'Candid/lifestyle shot',
      description: 'Natural, unposed moment',
      location: 'Interactive environment',
      notes: 'Capture authentic emotion',
      plannedTimeHint: 'During activity',
    },
    {
      title: 'Final/closing shot',
      description: 'Wrap-up shot to conclude the story',
      location: 'Significant location',
      notes: 'Memorable ending frame',
      plannedTimeHint: 'End of shoot',
    },
  ];
}

function getFallbackRefinement(input: { plan: SessionPlan }): SessionPlanRefinement {
  const locationRefinements = (input.plan.locationSuggestions ?? []).map((location, index) => ({
    name: location.name,
    kidFriendlinessScore: Math.max(4, 8 - index),
    crowdRiskScore: 5 + index,
    walkingBurdenScore: 4 + index,
    overallScore: Math.max(5, 8 - index),
    bestTimeWindow: index === 0 ? 'Early session or golden hour' : 'Mid-session with flexible timing',
    rationale:
      index === 0
        ? 'Balanced logistics and flexible backgrounds make this a safer primary choice.'
        : 'Useful as a secondary option if primary location becomes crowded.',
    recommendedMicroSpots: location.microLocations?.slice(0, 3) ?? [],
  }));
  return {
    locationRefinements,
    updatedContingencyPlans: [
      ...(input.plan.contingencyPlans ?? []),
      'Prioritize top-ranked location first, then pivot to second-ranked option if crowding increases.',
    ].slice(0, 12),
  };
}

export async function generateShotSuggestions(input: {
  project: ProjectContext;
  existingShots: ExistingShotContext[];
  creativeBrief?: string;
}) {
  const { apiKey, model } = getGeminiConfig();
  const prompt = `You are helping a photographer plan a shoot.

Project title: ${input.project.title}
Project description: ${input.project.description || 'None'}
Creative brief: ${input.creativeBrief?.trim() || 'None'}

Avoid duplicates from existing shots:
${input.existingShots.map(s => `- ${s.title}`).join('\n') || 'No existing shots'}

Return exactly 5 suggestions as raw JSON array using:
[{"title":"string","description":"string","location":"string","notes":"string","plannedTimeHint":"string"}]`;

  try {
    const response = await fetchWithRetry(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.8, responseMimeType: 'application/json' },
        }),
      }
    );
    if (!response.ok) {
      if (response.status >= 500) return getGenericFallbackSuggestions();
      throw new Error(await response.text());
    }
    const payload = (await response.json()) as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
    const text = payload.candidates?.[0]?.content?.parts?.map(part => part.text ?? '').join('') ?? '';
    if (!text) throw new Error('Empty AI response');
    return extractJsonArray(text);
  } catch {
    return getGenericFallbackSuggestions();
  }
}

export async function generateSessionPlan(input: {
  shootType: string;
  subjectDetails: string;
  city: string;
  shootDate?: string;
  duration?: string;
  mood: string;
  mustHaveShots?: string;
  constraints?: string;
  locationCandidates?: LocationCandidate[];
  businessContext?: BusinessContext;
}) {
  const plan = buildDeterministicPlan(input);
  return plan;
}

export async function refineSessionPlan(input: {
  plan: SessionPlan;
  subjectDetails?: string;
  mood?: string;
  constraints?: string;
}) {
  if (!process.env.GEMINI_API_KEY) {
    return getFallbackRefinement(input);
  }

  const { apiKey, model } = getGeminiConfig();
  const prompt = `You are a photography planning quality-control assistant.

Given this plan, score each location:
- Kid friendliness (higher is better)
- Crowd risk (higher is riskier)
- Walking burden (higher is harder)
- Overall suitability (higher is better)

Context:
- Subject details: ${input.subjectDetails || 'Not specified'}
- Mood: ${input.mood || 'Not specified'}
- Constraints: ${input.constraints || 'None'}

Plan JSON:
${JSON.stringify(input.plan)}

Return JSON only with schema:
{
"locationRefinements":[{"name":"string","kidFriendlinessScore":1,"crowdRiskScore":1,"walkingBurdenScore":1,"overallScore":1,"bestTimeWindow":"string","rationale":"string","recommendedMicroSpots":["string"]}],
"updatedContingencyPlans":["string"]
}

Scoring rules: scores are integers 1-10. Higher kidFriendlinessScore = better. Higher crowdRiskScore = riskier. Higher walkingBurdenScore = harder. Higher overallScore = better overall pick.`;

  try {
    const response = await fetchWithRetry(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.4, responseMimeType: 'application/json' },
        }),
      }
    );
    if (!response.ok) {
      if (response.status >= 500) return getFallbackRefinement(input);
      throw new Error(await response.text());
    }
    const payload = (await response.json()) as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
    const text = payload.candidates?.[0]?.content?.parts?.map(part => part.text ?? '').join('') ?? '';
    if (!text) throw new Error('Empty AI response');
    const parsed = extractJsonObject<SessionPlanRefinement>(text);
    const locationRefinements = (parsed.locationRefinements ?? [])
      .map(item => ({
        ...item,
        kidFriendlinessScore: Math.min(10, Math.max(1, Math.round(Number(item.kidFriendlinessScore) || 1))),
        crowdRiskScore: Math.min(10, Math.max(1, Math.round(Number(item.crowdRiskScore) || 1))),
        walkingBurdenScore: Math.min(10, Math.max(1, Math.round(Number(item.walkingBurdenScore) || 1))),
        overallScore: Math.min(10, Math.max(1, Math.round(Number(item.overallScore) || 1))),
        recommendedMicroSpots: Array.isArray(item.recommendedMicroSpots) ? item.recommendedMicroSpots.slice(0, 5) : [],
      }))
      .slice(0, 10)
      .sort((a, b) => b.overallScore - a.overallScore);
    return {
      locationRefinements,
      updatedContingencyPlans: Array.isArray(parsed.updatedContingencyPlans) ? parsed.updatedContingencyPlans.slice(0, 12) : [],
    };
  } catch {
    return getFallbackRefinement(input);
  }
}
