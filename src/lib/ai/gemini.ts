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

function getGeminiConfig() {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

  if (!apiKey) {
    throw new Error('Missing GEMINI_API_KEY');
  }

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

function getGenericFallbackSuggestions(projectTitle: string): ShotSuggestion[] {
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
  const title = `${input.shootType} Session Plan`;
  const cityLabel = input.city || 'your area';

  return {
    projectTitle: title,
    creativeDirection: `A ${input.mood || 'balanced'} visual approach for ${input.subjectDetails || 'the subject'} with practical pacing and flexible backup options.`,
    timeline: [
      { timeBlock: 'Arrival + Warmup (0-10 min)', focus: 'Introduce flow and comfort', notes: 'Quick orientation, check wardrobe, set expectations.' },
      { timeBlock: 'Core Portraits (10-30 min)', focus: 'Reliable hero images', notes: 'Capture must-have frames first while energy is high.' },
      { timeBlock: 'Variety + Movement (30-50 min)', focus: 'Lifestyle and candid variety', notes: 'Use prompts and transitions between micro-locations.' },
      { timeBlock: 'Final Highlights (50-60 min)', focus: 'Signature closing shots', notes: 'Finish with 1-2 bold compositions and backup safety frame.' },
    ],
    locationSuggestions: [
      {
        name: `${cityLabel} Park / Open Green Space`,
        whyItWorks: 'Reliable backgrounds, room for movement, family-friendly flexibility.',
        microLocations: ['Tree-lined path', 'Open shade edge', 'Textured wall or fence'],
        logistics: {
          parking: 'Use main lot and arrive 10 minutes early.',
          restroom: 'Check visitor center or nearest public facility.',
          walkingDistance: '3-7 minutes between key spots.',
        },
      },
      {
        name: `${cityLabel} Urban Edge`,
        whyItWorks: 'Architectural lines for modern compositions and clean framing.',
        microLocations: ['Leading-line sidewalk', 'Neutral wall', 'Corner with depth layers'],
        logistics: {
          parking: 'Street parking with backup lot nearby.',
          restroom: 'Use nearby cafe/public venue.',
          walkingDistance: '2-5 minutes between spots.',
        },
      },
    ],
    shotList: [
      {
        title: 'Hero group portrait',
        description: 'Balanced, polished anchor frame for the full session.',
        location: `${cityLabel} Park / Open Green Space`,
        microSpot: 'Open shade edge',
        poseSuggestion: 'Triangular grouping with slight stagger and connected hands.',
        compositionSuggestion: 'Eye-level, centered with negative space for print crops.',
        timingHint: 'Early in session',
        notes: 'Capture this first as a guaranteed keeper.',
      },
      {
        title: 'Walking candid sequence',
        description: 'Natural interaction and movement for authentic emotion.',
        location: `${cityLabel} Park / Open Green Space`,
        microSpot: 'Tree-lined path',
        poseSuggestion: 'Prompt conversation while walking shoulder-to-shoulder.',
        compositionSuggestion: 'Slightly low angle, shallow depth for subject separation.',
        timingHint: 'Mid-session',
        notes: 'Shoot bursts across 10-15 second prompts.',
      },
      {
        title: 'Detail close-up set',
        description: 'Hands, accessories, expressions, and texture-based details.',
        location: `${cityLabel} Urban Edge`,
        microSpot: 'Textured wall',
        poseSuggestion: 'Hands together, subtle turns, relaxed shoulders.',
        compositionSuggestion: 'Tight crop with diagonal framing.',
        timingHint: 'Any time with stable light',
        notes: 'Use for album pacing and storytelling transitions.',
      },
    ],
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

async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries: number = 3
): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);

      // Don't retry on client errors (4xx)
      if (response.status >= 400 && response.status < 500) {
        return response;
      }

      // For server errors (5xx), retry with exponential backoff
      if (!response.ok && response.status >= 500) {
        if (attempt < maxRetries - 1) {
          const delayMs = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s
          await new Promise(resolve => setTimeout(resolve, delayMs));
          continue;
        }
      }

      return response;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt < maxRetries - 1) {
        const delayMs = Math.pow(2, attempt) * 1000;
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }

  throw lastError || new Error('Fetch failed after retries');
}

export async function generateShotSuggestions(input: {
  project: ProjectContext;
  existingShots: ExistingShotContext[];
  creativeBrief?: string;
}) {
  const { apiKey, model } = getGeminiConfig();

  const prompt = `You are helping a photographer plan a shoot.

Project:
- Title: ${input.project.title}
- Description: ${input.project.description || 'No description provided'}
- Status: ${input.project.status}

Creative brief from user:
${input.creativeBrief?.trim() || 'No extra brief provided.'}

Existing shots to avoid duplicating:
${input.existingShots.length === 0 ? 'No shots exist yet.' : input.existingShots
    .map(
      shot => `- ${shot.title}: ${shot.description || 'No description'} | ${shot.location || 'No location'} | ${shot.status}`
    )
    .join('\n')}

Return exactly 5 fresh shot suggestions as raw JSON only.
Each item must use this schema:
[
  {
    "title": "string",
    "description": "string",
    "location": "string",
    "notes": "string",
    "plannedTimeHint": "string"
  }
]

Keep titles concise. Make suggestions practical and visually distinct.`;

  try {
    const response = await fetchWithRetry(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            temperature: 0.8,
            responseMimeType: 'application/json',
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      // If Gemini is unavailable after retries, fall back to generic suggestions
      if (response.status >= 500) {
        console.warn('Gemini service temporarily unavailable, using fallback suggestions');
        return getGenericFallbackSuggestions(input.project.title);
      }
      throw new Error(`Gemini request failed: ${errorText}`);
    }

    const payload = (await response.json()) as {
      candidates?: Array<{
        content?: {
          parts?: Array<{
            text?: string;
          }>;
        };
      }>;
    };

    const text = payload.candidates?.[0]?.content?.parts?.map(part => part.text ?? '').join('') ?? '';

    if (!text) {
      throw new Error('Gemini returned an empty response');
    }

    return extractJsonArray(text);
  } catch (error) {
    // Final fallback: return generic suggestions if all else fails
    console.warn('Failed to generate AI suggestions, using fallback:', error);
    return getGenericFallbackSuggestions(input.project.title);
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

Create a full session plan for this shoot:
- Shoot type: ${input.shootType}
- Subject details: ${input.subjectDetails}
- City / area: ${input.city}
- Shoot date: ${input.shootDate || 'Not specified'}
- Mood/style: ${input.mood}
- Must-have shots: ${input.mustHaveShots || 'None specified'}
- Constraints: ${input.constraints || 'None specified'}

Return JSON only with this exact schema:
{
  "projectTitle": "string",
  "creativeDirection": "string",
  "timeline": [
    { "timeBlock": "string", "focus": "string", "notes": "string" }
  ],
  "locationSuggestions": [
    {
      "name": "string",
      "whyItWorks": "string",
      "microLocations": ["string"],
      "logistics": {
        "parking": "string",
        "restroom": "string",
        "walkingDistance": "string"
      }
    }
  ],
  "shotList": [
    {
      "title": "string",
      "description": "string",
      "location": "string",
      "microSpot": "string",
      "poseSuggestion": "string",
      "compositionSuggestion": "string",
      "timingHint": "string",
      "notes": "string"
    }
  ],
  "clientPrepChecklist": ["string"],
  "contingencyPlans": ["string"]
}

Requirements:
- Provide 3-5 timeline blocks.
- Provide 2-4 location suggestions with detailed micro-locations.
- Provide 8-14 shotList items.
- Keep all advice practical and specific for a working photographer.
- Include kid/family pacing considerations if relevant.
- Do not include markdown fences or any prose outside JSON.`;

  try {
    const response = await fetchWithRetry(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.7,
            responseMimeType: 'application/json',
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      if (response.status >= 500) {
        console.warn('Gemini planner unavailable, using fallback session plan');
        return getFallbackSessionPlan(input);
      }
      throw new Error(`Gemini planner request failed: ${errorText}`);
    }

    const payload = (await response.json()) as {
      candidates?: Array<{
        content?: {
          parts?: Array<{
            text?: string;
          }>;
        };
      }>;
    };

    const text = payload.candidates?.[0]?.content?.parts?.map(part => part.text ?? '').join('') ?? '';
    if (!text) {
      throw new Error('Gemini planner returned an empty response');
    }

    const parsed = extractJsonObject<SessionPlan>(text);

    return {
      projectTitle: parsed.projectTitle?.trim() || `${input.shootType} Session Plan`,
      creativeDirection: parsed.creativeDirection?.trim() || '',
      timeline: Array.isArray(parsed.timeline) ? parsed.timeline.slice(0, 8) : [],
      locationSuggestions: Array.isArray(parsed.locationSuggestions)
        ? parsed.locationSuggestions.slice(0, 6)
        : [],
      shotList: Array.isArray(parsed.shotList) ? parsed.shotList.slice(0, 20) : [],
      clientPrepChecklist: Array.isArray(parsed.clientPrepChecklist)
        ? parsed.clientPrepChecklist.slice(0, 12)
        : [],
      contingencyPlans: Array.isArray(parsed.contingencyPlans)
        ? parsed.contingencyPlans.slice(0, 12)
        : [],
    };
  } catch (error) {
    console.warn('Failed to generate session plan, using fallback:', error);
    return getFallbackSessionPlan(input);
  }
}
