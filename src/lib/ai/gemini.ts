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

function getGeminiConfig() {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  if (!apiKey) throw new Error('Missing GEMINI_API_KEY');
  return { apiKey, model };
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

async function fetchWithRetry(url: string, options: RequestInit, maxRetries = 3): Promise<Response> {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);
      if (response.status >= 400 && response.status < 500) return response;
      if (!response.ok && response.status >= 500 && attempt < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        continue;
      }
      return response;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
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

function getFallbackSessionPlan(input: {
  shootType: string;
  subjectDetails: string;
  city: string;
  mood: string;
  constraints?: string;
}): SessionPlan {
  const cityLabel = input.city || 'your area';
  const isFamilySession = /family|newborn|maternity|kids|children/i.test(input.shootType);

  const fallbackLocations = isFamilySession
    ? [
        {
          name: `${cityLabel} Botanical Garden`,
          whyItWorks: 'Safe walking paths, shade variety, and soft natural backdrops suited for families.',
          microLocations: ['Tree canopy path', 'Garden archway', 'Bench with open shade'],
          logistics: {
            parking: 'Main visitor lot near entrance.',
            restroom: 'Visitor center facilities available.',
            walkingDistance: '2-6 minutes between spots.',
          },
        },
        {
          name: `${cityLabel} Historic Town Square`,
          whyItWorks: 'Textured architecture and flexible composition options without long walks.',
          microLocations: ['Brick storefront corner', 'Courthouse steps', 'Arcade walkway'],
          logistics: {
            parking: 'Street parking plus nearby public lot.',
            restroom: 'Public facilities or nearby cafe.',
            walkingDistance: '1-4 minutes between spots.',
          },
        },
        {
          name: `${cityLabel} Community Park`,
          whyItWorks: 'Open space for movement prompts and candid family interactions.',
          microLocations: ['Open lawn edge', 'Tree-lined trail', 'Pond overlook'],
          logistics: {
            parking: 'Central lot adjacent to main path.',
            restroom: 'Park restroom near pavilion.',
            walkingDistance: '3-8 minutes between spots.',
          },
        },
      ]
    : [
        {
          name: `${cityLabel} Downtown Arts District`,
          whyItWorks: 'Clean lines and visual variety for polished hero frames.',
          microLocations: ['Murals wall', 'Neutral facade', 'Leading-line corridor'],
          logistics: {
            parking: 'Metered parking and nearby garage.',
            restroom: 'Nearby coffee shop or public venue.',
            walkingDistance: '2-5 minutes between spots.',
          },
        },
        {
          name: `${cityLabel} Waterfront Promenade`,
          whyItWorks: 'Depth, light direction options, and layered backgrounds.',
          microLocations: ['Railing overlook', 'Stone steps', 'Tree-lined stretch'],
          logistics: {
            parking: 'Public lot near promenade entrance.',
            restroom: 'Restroom near visitor area.',
            walkingDistance: '3-7 minutes between spots.',
          },
        },
        {
          name: `${cityLabel} Civic Plaza`,
          whyItWorks: 'Open geometry and repeatable composition anchors.',
          microLocations: ['Symmetrical staircase', 'Pillar corridor', 'Open concrete plane'],
          logistics: {
            parking: 'Parking garage within one block.',
            restroom: 'Nearby municipal/public building.',
            walkingDistance: '1-4 minutes between spots.',
          },
        },
      ];

  const fallbackShots: SessionPlanShot[] = [
    {
      title: 'Hero group portrait',
      description: 'Balanced, polished anchor frame for the full session.',
      location: fallbackLocations[0].name,
      microSpot: fallbackLocations[0].microLocations[0],
      poseSuggestion: 'Triangular grouping with slight stagger and connected hands.',
      compositionSuggestion: 'Eye-level, centered with negative space for print crops.',
      timingHint: 'Start of session',
      notes: 'Capture this first as a guaranteed keeper.',
    },
    {
      title: 'Parents / couple portrait',
      description: 'Connection-focused portrait with soft depth and clean background.',
      location: fallbackLocations[0].name,
      microSpot: fallbackLocations[0].microLocations[1],
      poseSuggestion: 'Close stance, foreheads near, natural interaction prompt.',
      compositionSuggestion: 'Medium-tight crop at 85mm equivalent with foreground blur.',
      timingHint: 'Early-mid session',
      notes: 'Prioritize natural expressions over rigid posing.',
    },
    {
      title: 'Walking candid sequence',
      description: 'Natural interaction and movement for authentic emotion.',
      location: fallbackLocations[0].name,
      microSpot: fallbackLocations[0].microLocations[2],
      poseSuggestion: 'Prompt conversation while walking shoulder-to-shoulder.',
      compositionSuggestion: 'Slightly low angle, shallow depth for subject separation.',
      timingHint: 'Mid-session',
      notes: 'Shoot bursts across 10-15 second prompts.',
    },
    {
      title: 'Sibling / child connection',
      description: 'Playful interaction frame with layered depth.',
      location: fallbackLocations[1].name,
      microSpot: fallbackLocations[1].microLocations[0],
      poseSuggestion: 'Prompt a short game or shared joke to trigger natural expression.',
      compositionSuggestion: 'Horizontal framing with environmental context.',
      timingHint: 'Mid-session',
      notes: 'Use continuous AF for movement.',
    },
    {
      title: 'Seated storytelling portrait',
      description: 'Calmer frame for variety and album pacing.',
      location: fallbackLocations[1].name,
      microSpot: fallbackLocations[1].microLocations[1],
      poseSuggestion: 'Layered seated positions with subtle hand connection.',
      compositionSuggestion: 'Symmetry-forward framing with slight angle break.',
      timingHint: 'Mid-session reset',
      notes: 'Great when kids need a brief pause.',
    },
    {
      title: 'Individual portrait A',
      description: 'Confident solo frame with clean separation.',
      location: fallbackLocations[1].name,
      microSpot: fallbackLocations[1].microLocations[2],
      poseSuggestion: 'Relaxed stance, shoulder turn, weight on back foot.',
      compositionSuggestion: 'Vertical portrait with architectural leading lines.',
      timingHint: 'Mid-late session',
      notes: 'Capture both smiling and neutral expression.',
    },
    {
      title: 'Individual portrait B',
      description: 'Second solo portrait style for visual variety.',
      location: fallbackLocations[2].name,
      microSpot: fallbackLocations[2].microLocations[0],
      poseSuggestion: 'Walking or gentle movement to reduce stiffness.',
      compositionSuggestion: 'Off-center composition with negative space.',
      timingHint: 'Mid-late session',
      notes: 'Use burst mode for natural cadence.',
    },
    {
      title: 'Detail close-up set',
      description: 'Hands, accessories, expressions, and texture-based details.',
      location: fallbackLocations[2].name,
      microSpot: fallbackLocations[2].microLocations[1],
      poseSuggestion: 'Hands together, subtle turns, relaxed shoulders.',
      compositionSuggestion: 'Tight crop with diagonal framing.',
      timingHint: 'Any stable light window',
      notes: 'Use for album pacing and storytelling transitions.',
    },
    {
      title: 'Wide environmental portrait',
      description: 'Scene-setting frame that anchors location and mood.',
      location: fallbackLocations[2].name,
      microSpot: fallbackLocations[2].microLocations[2],
      poseSuggestion: 'Small-in-frame placement with connected body language.',
      compositionSuggestion: 'Wide lens with strong foreground-background layering.',
      timingHint: 'Golden hour if available',
      notes: 'Keep horizon and verticals clean.',
    },
    {
      title: 'Closing signature frame',
      description: 'Final high-impact shot to end the session.',
      location: fallbackLocations[0].name,
      microSpot: fallbackLocations[0].microLocations[0],
      poseSuggestion: 'Confident, connected stance with direct engagement.',
      compositionSuggestion: 'Cinematic crop with controlled negative space.',
      timingHint: 'End of session',
      notes: 'Leave with one guaranteed portfolio-level frame.',
    },
  ];

  return {
    projectTitle: `${input.shootType} Session Plan`,
    creativeDirection: `A ${input.mood || 'balanced'} visual approach for ${input.subjectDetails || 'the subject'} with practical pacing and flexible backup options.`,
    timeline: [
      { timeBlock: 'Arrival + Warmup (0-10 min)', focus: 'Introduce flow and comfort', notes: 'Quick orientation, check wardrobe, set expectations.' },
      { timeBlock: 'Core Portraits (10-30 min)', focus: 'Reliable hero images', notes: 'Capture must-have frames first while energy is high.' },
      { timeBlock: 'Variety + Movement (30-50 min)', focus: 'Lifestyle and candid variety', notes: 'Use prompts and transitions between micro-locations.' },
      { timeBlock: 'Final Highlights (50-60 min)', focus: 'Signature closing shots', notes: 'Finish with 1-2 bold compositions and backup safety frame.' },
    ],
    locationSuggestions: fallbackLocations,
    shotList: fallbackShots,
    clientPrepChecklist: [
      'Arrive 10 minutes early to avoid rushing the first setup.',
      'Bring comfortable walking shoes between micro-locations.',
      'Pack water, wipes, and one quick wardrobe backup option.',
      'Confirm parking + restroom stops before arrival.',
    ],
    contingencyPlans: [
      'If weather shifts, move to covered walkways or nearby indoor public spaces.',
      'If kids lose focus, switch to movement prompts and shorter shot cycles.',
      'If location is crowded, prioritize tighter compositions and alternate micro-spots.',
    ],
  };
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
  mood: string;
  mustHaveShots?: string;
  constraints?: string;
}) {
  const { apiKey, model } = getGeminiConfig();
  const prompt = `You are an expert photography pre-production planner.

Build a complete session plan for:
- Shoot type: ${input.shootType}
- Subject details: ${input.subjectDetails}
- City: ${input.city}
- Date: ${input.shootDate || 'Not specified'}
- Mood: ${input.mood}
- Must-have shots: ${input.mustHaveShots || 'None'}
- Constraints: ${input.constraints || 'None'}

Location rules:
- Use only real, publicly searchable places in/near ${input.city}.
- Do NOT invent names like "Urban Edge" or "Open Green Space".
- Prefer specific places (parks, plazas, streets, landmarks, trails, venues) that can be pinned on maps.
- Keep each location name concise but real.

Return JSON only with schema:
{
"projectTitle":"string",
"creativeDirection":"string",
"timeline":[{"timeBlock":"string","focus":"string","notes":"string"}],
"locationSuggestions":[{"name":"string","whyItWorks":"string","microLocations":["string"],"logistics":{"parking":"string","restroom":"string","walkingDistance":"string"}}],
"shotList":[{"title":"string","description":"string","location":"string","microSpot":"string","poseSuggestion":"string","compositionSuggestion":"string","timingHint":"string","notes":"string"}],
"clientPrepChecklist":["string"],
"contingencyPlans":["string"]
}`;

  const qualityGuardrails = `

Quality requirements:
- Return 4-6 locationSuggestions.
- Return 10-16 shotList items.
- No generic placeholders (e.g., "Urban Edge", "Open Green Space").
- Locations must be family-safe if shoot type implies family/newborn/kids.
- Every shot must reference one of the listed locationSuggestions.`;

  try {
    const response = await fetchWithRetry(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `${prompt}${qualityGuardrails}` }] }],
          generationConfig: { temperature: 0.7, responseMimeType: 'application/json' },
        }),
      }
    );
    if (!response.ok) {
      if (response.status >= 500) return getFallbackSessionPlan(input);
      throw new Error(await response.text());
    }
    const payload = (await response.json()) as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
    const text = payload.candidates?.[0]?.content?.parts?.map(part => part.text ?? '').join('') ?? '';
    if (!text) throw new Error('Empty AI response');
    const parsed = extractJsonObject<SessionPlan>(text);
    const normalizedPlan = {
      projectTitle: parsed.projectTitle?.trim() || `${input.shootType} Session Plan`,
      creativeDirection: parsed.creativeDirection?.trim() || '',
      timeline: Array.isArray(parsed.timeline) ? parsed.timeline.slice(0, 8) : [],
      locationSuggestions: Array.isArray(parsed.locationSuggestions) ? parsed.locationSuggestions.slice(0, 6) : [],
      shotList: Array.isArray(parsed.shotList) ? parsed.shotList.slice(0, 20) : [],
      clientPrepChecklist: Array.isArray(parsed.clientPrepChecklist) ? parsed.clientPrepChecklist.slice(0, 12) : [],
      contingencyPlans: Array.isArray(parsed.contingencyPlans) ? parsed.contingencyPlans.slice(0, 12) : [],
    };

    if (normalizedPlan.locationSuggestions.length < 3 || normalizedPlan.shotList.length < 8) {
      throw new Error('Plan quality below threshold');
    }

    return normalizedPlan;
  } catch {
    return getFallbackSessionPlan(input);
  }
}

export async function refineSessionPlan(input: {
  plan: SessionPlan;
  subjectDetails?: string;
  mood?: string;
  constraints?: string;
}) {
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
