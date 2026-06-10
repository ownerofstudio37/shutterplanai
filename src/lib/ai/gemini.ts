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

  const response = await fetch(
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
}
