import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/serverAuth';
import { hydrateSessionPlanOutputs, type SessionPlan } from '@/lib/ai/gemini';

type PlannerBrainStage =
  | 'intake'
  | 'location_discovery'
  | 'location_selection'
  | 'micro_location_mapping'
  | 'shot_list_generation'
  | 'sun_weather_optimization'
  | 'client_guide_generation';

type PlannerBrainMessage = {
  role: 'user' | 'assistant';
  content: string;
  createdAt?: string;
};

type PlannerBrainRequest = {
  currentPlan?: SessionPlan | null;
  message?: string;
  stage?: PlannerBrainStage;
  chatHistory?: PlannerBrainMessage[];
  sessionInputs?: {
    shootType?: string;
    constraints?: string;
    mood?: string;
  };
};

type PlannerBrainResponse = {
  success: boolean;
  data?: {
    plan: SessionPlan;
    assistantMessage: string;
    changedSections: string[];
    stage: PlannerBrainStage;
  };
  error?: string;
};

function uniqueValues(values: string[]) {
  return Array.from(new Set(values.map(value => value.trim()).filter(Boolean)));
}

function limitToPrimaryLocation(plan: SessionPlan): SessionPlan {
  const primaryLocation = plan.locationSuggestions[0];
  if (!primaryLocation) return plan;
  const shotList = plan.shotList.map(shot => ({
    ...shot,
    location: primaryLocation.name,
    microSpot: primaryLocation.microLocations[0] || shot.microSpot,
    backupMicroSpot: primaryLocation.microLocations[1] || shot.backupMicroSpot || 'Nearest backup spot',
    notes: uniqueValues([shot.notes, 'Brain update: build this around one primary location.']).join(' '),
  }));

  return {
    ...plan,
    locationSuggestions: [primaryLocation],
    shotList,
    contingencyPlans: uniqueValues([
      'Keep the full session inside the chosen primary location and use micro-spots for variety.',
      ...plan.contingencyPlans,
    ]),
  };
}

function makeToddlerFriendly(plan: SessionPlan): SessionPlan {
  return {
    ...plan,
    timeline: plan.timeline.map((item, index) => ({
      ...item,
      notes: uniqueValues([
        item.notes,
        index <= 1
          ? 'Prioritize must-have family frames early while toddler energy is highest.'
          : 'Use movement, snack/reset time, and short prompts to avoid fatigue.',
      ]).join(' '),
    })),
    shotList: plan.shotList.map((shot, index) => ({
      ...shot,
      priority: index <= 3 ? 'must-have' : shot.priority,
      poseSuggestion: `${shot.poseSuggestion} Keep the prompt fast, playful, and under 60 seconds.`,
      lightWeatherNote: uniqueValues([
        shot.lightWeatherNote || '',
        'Prefer open shade and short walking transitions for kid comfort.',
      ]).join(' '),
    })),
    contingencyPlans: uniqueValues([
      'If toddlers fade, skip nice-to-have frames and protect the first 3-4 must-have deliverables.',
      'Use the closest shade or seated spot as a reset point between prompts.',
      ...plan.contingencyPlans,
    ]),
  };
}

function addEditorialPoses(plan: SessionPlan): SessionPlan {
  const editorialPrompts = [
    'Add a chin-forward micro-adjustment and quiet hands for an editorial finish.',
    'Use a slow walking prompt with a composed expression before asking for a candid laugh.',
    'Create a clean negative-space frame with the subject turned 30 degrees off camera.',
  ];

  return {
    ...plan,
    creativeDirection: `${plan.creativeDirection} Add a more editorial posing layer while keeping the session natural and client-friendly.`,
    shotList: plan.shotList.map((shot, index) => ({
      ...shot,
      poseSuggestion: `${shot.poseSuggestion} ${editorialPrompts[index % editorialPrompts.length]}`,
      angleSuggestion:
        shot.angleSuggestion ||
        'Use a slightly lower camera position for presence, then crop cleanly for editorial polish.',
    })),
  };
}

function warmClientGuide(plan: SessionPlan): SessionPlan {
  return {
    ...plan,
    clientPrepChecklist: uniqueValues([
      'Come as you are. I will guide the flow so you do not need to know what to do ahead of time.',
      ...plan.clientPrepChecklist,
    ]),
    clientGuide: plan.clientGuide
      ? {
          ...plan.clientGuide,
          reassurance:
            'You do not need to perform or pose perfectly. I will guide you through simple prompts, keep the pace calm, and make sure we get the important images.',
          tone: 'warm, reassuring, and easygoing',
        }
      : plan.clientGuide,
  };
}

function optimizeForWeatherAndSun(plan: SessionPlan, message: string): SessionPlan {
  const rainRisk = /rain|storm|wet|pavilion|covered/i.test(message);
  const windRisk = /wind|hair/i.test(message);
  const goldenHour = /golden|sunset|later|light/i.test(message);

  return {
    ...plan,
    timeline: plan.timeline.map((item, index) => ({
      ...item,
      notes: uniqueValues([
        item.notes,
        rainRisk && index === 0 ? 'If rain risk is high, start with protected portraits near the covered backup.' : '',
        goldenHour && index >= plan.timeline.length - 2 ? 'Reserve this block for hero portraits in the softest late light.' : '',
        windRisk ? 'Avoid hair-sensitive close-ups in exposed windy areas.' : '',
      ]).join(' '),
    })),
    shotList: plan.shotList.map((shot, index) => ({
      ...shot,
      timingHint: goldenHour && index <= 3 ? 'Late golden-hour priority' : shot.timingHint,
      lightWeatherNote: uniqueValues([
        shot.lightWeatherNote || '',
        rainRisk ? 'Move to covered backup first if rain arrives.' : '',
        windRisk ? 'Use a sheltered angle for close-ups and hair-sensitive frames.' : '',
        goldenHour ? 'Prioritize this near the softest evening light when possible.' : '',
      ]).join(' '),
    })),
    contingencyPlans: uniqueValues([
      rainRisk ? 'Rain plan: move must-have portraits to the covered backup first, then use open spots only if conditions improve.' : '',
      windRisk ? 'Wind plan: shoot close-ups away from exposed water or open fields.' : '',
      goldenHour ? 'Sun plan: reserve the strongest hero frames for the final soft-light window.' : '',
      ...plan.contingencyPlans,
    ]),
  };
}

function inferBrainStage(message: string, fallback: PlannerBrainStage): PlannerBrainStage {
  if (/location|spot|lake|park|venue|one spot|one location/i.test(message)) return 'location_selection';
  if (/micro|pin|inside|map/i.test(message)) return 'micro_location_mapping';
  if (/shot|pose|deliverable|editorial|lens|angle/i.test(message)) return 'shot_list_generation';
  if (/sun|weather|rain|wind|golden|uv|forecast/i.test(message)) return 'sun_weather_optimization';
  if (/client guide|warmer|arrival|parking|wear|bring|tone/i.test(message)) return 'client_guide_generation';
  return fallback;
}

function updatePlanFromMessage(plan: SessionPlan, message: string) {
  let nextPlan = plan;
  const changedSections: string[] = [];

  if (/one spot|one location|only one|single location|build this around only one/i.test(message)) {
    nextPlan = limitToPrimaryLocation(nextPlan);
    changedSections.push('chosen location', 'shot list', 'backup plan');
  }

  if (/toddler|kid|child|children|easier|short attention|stroller/i.test(message)) {
    nextPlan = makeToddlerFriendly(nextPlan);
    changedSections.push('timeline', 'shot list', 'backup plan');
  }

  if (/editorial|fashion|pose|posing|angle/i.test(message)) {
    nextPlan = addEditorialPoses(nextPlan);
    changedSections.push('shot list', 'poses');
  }

  if (/warmer|warm|reassur|client guide|sound/i.test(message)) {
    nextPlan = warmClientGuide(nextPlan);
    changedSections.push('client guide');
  }

  if (/sun|weather|rain|wind|golden|uv|forecast|later/i.test(message)) {
    nextPlan = optimizeForWeatherAndSun(nextPlan, message);
    changedSections.push('timeline', 'sun/weather', 'shot list');
  }

  if (changedSections.length === 0) {
    nextPlan = {
      ...nextPlan,
      creativeDirection: `${nextPlan.creativeDirection} Planner note: ${message}`,
    };
    changedSections.push('brief');
  }

  return {
    plan: nextPlan,
    changedSections: uniqueValues(changedSections),
  };
}

function buildAssistantMessage(input: { changedSections: string[]; stage: PlannerBrainStage }) {
  const sections = input.changedSections.join(', ');
  if (input.changedSections.includes('client guide')) {
    return `Done. I warmed up the client-facing language and updated ${sections}.`;
  }
  if (input.changedSections.includes('sun/weather')) {
    return `Done. I adjusted the plan around light/weather and updated ${sections}.`;
  }
  if (input.changedSections.includes('poses')) {
    return `Done. I added more editorial posing and angle direction across ${sections}.`;
  }
  return `Done. I updated ${sections} and kept the plan in the ${input.stage.replace(/_/g, ' ')} flow.`;
}

export async function POST(request: NextRequest): Promise<NextResponse<PlannerBrainResponse>> {
  const auth = await requireAuth(request);
  if (!auth.success) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  try {
    const body = (await request.json()) as PlannerBrainRequest;
    const message = body.message?.trim();

    if (!body.currentPlan || !Array.isArray(body.currentPlan.shotList)) {
      return NextResponse.json({ success: false, error: 'A current plan is required.' }, { status: 400 });
    }

    if (!message) {
      return NextResponse.json({ success: false, error: 'Message is required.' }, { status: 400 });
    }

    const stage = inferBrainStage(message, body.stage || 'shot_list_generation');
    const mutation = updatePlanFromMessage(body.currentPlan, message);
    const hydratedPlan = hydrateSessionPlanOutputs({
      plan: mutation.plan,
      shootType: body.sessionInputs?.shootType,
      constraints: body.sessionInputs?.constraints,
    });

    return NextResponse.json({
      success: true,
      data: {
        plan: {
          ...hydratedPlan,
          plannerBrain: {
            currentStage: stage,
            completedStages: uniqueValues([
              ...(hydratedPlan.plannerBrain?.completedStages ?? []),
              stage,
            ]) as PlannerBrainStage[],
            nextRecommendedStage: stage,
            lockedSections: hydratedPlan.plannerBrain?.lockedSections ?? [],
            manualModeAvailable: true,
          },
        },
        assistantMessage: buildAssistantMessage({ changedSections: mutation.changedSections, stage }),
        changedSections: mutation.changedSections,
        stage,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update planner brain.',
      },
      { status: 500 }
    );
  }
}
