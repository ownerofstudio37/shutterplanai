'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { tokenUtils } from '@/lib/auth';

interface SessionPlanLocation {
  name: string;
  whyItWorks: string;
  microLocations: string[];
  latitude?: number | null;
  longitude?: number | null;
  displayName?: string;
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
}

function getAuthHeader() {
  const token = tokenUtils.getToken();
  const headers: Record<string, string> = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

export default function PlannerPage() {
  const router = useRouter();

  const [shootType, setShootType] = useState('Family Session');
  const [subjectDetails, setSubjectDetails] = useState('5 people, 2 toddlers');
  const [city, setCity] = useState('Dallas, TX');
  const [shootDate, setShootDate] = useState('');
  const [mood, setMood] = useState('Warm, candid, emotional');
  const [mustHaveShots, setMustHaveShots] = useState('Whole family portrait, parents together, each kid solo');
  const [constraints, setConstraints] = useState('Need stroller-friendly paths and quick transitions');

  const [plan, setPlan] = useState<SessionPlan | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isApplying, setIsApplying] = useState(false);

  const locationIndex = useMemo(() => {
    const map = new Map<string, SessionPlanLocation>();
    (plan?.locationSuggestions ?? []).forEach(location => {
      map.set(location.name.toLowerCase(), location);
    });
    return map;
  }, [plan]);

  const generatePlan = async () => {
    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch('/api/ai/session-plan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
        body: JSON.stringify({
          shootType,
          subjectDetails,
          city,
          shootDate,
          mood,
          mustHaveShots,
          constraints,
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
          description: `${plan.creativeDirection}\n\nConstraints: ${constraints || 'None'}`,
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

      for (const shot of plan.shotList) {
        const location = locationIndex.get((shot.location || '').toLowerCase());
        const latitude = shot.latitude ?? location?.latitude ?? null;
        const longitude = shot.longitude ?? location?.longitude ?? null;

        const notes = [
          shot.notes,
          `Pose suggestion: ${shot.poseSuggestion}`,
          `Composition: ${shot.compositionSuggestion}`,
          `Timing: ${shot.timingHint}`,
          shot.geocodedLocationName ? `Map match: ${shot.geocodedLocationName}` : '',
          location?.logistics?.parking ? `Parking: ${location.logistics.parking}` : '',
          location?.logistics?.restroom ? `Restroom: ${location.logistics.restroom}` : '',
          location?.logistics?.walkingDistance
            ? `Walking distance: ${location.logistics.walkingDistance}`
            : '',
        ]
          .filter(Boolean)
          .join('\n');

        await fetch('/api/shots', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...getAuthHeader(),
          },
          body: JSON.stringify({
            projectId,
            title: shot.title,
            description: shot.description,
            location: shot.location,
            latitude,
            longitude,
            notes,
            microSpotName: shot.microSpot,
            parkingNotes: location?.logistics?.parking ?? '',
            walkingDistance: location?.logistics?.walkingDistance ?? '',
            restroomLocation: location?.logistics?.restroom ?? '',
            backgroundDescription: location?.whyItWorks ?? '',
            status: 'planned',
          }),
        });
      }

      router.push(`/dashboard/shot-board?project=${projectId}`);
    } catch {
      setError('Failed while applying plan to workspace');
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-semibold text-gray-900">Describe My Shoot</h3>
            <p className="text-sm text-gray-600">One input → full session plan, locations, poses, compositions, and shot list.</p>
          </div>
          <Button isLoading={isGenerating} onClick={() => void generatePlan()}>
            {isGenerating ? 'Generating...' : 'Generate Full Plan'}
          </Button>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <input className="w-full rounded-lg border border-gray-300 px-4 py-2" value={shootType} onChange={e => setShootType(e.target.value)} placeholder="Shoot type" />
          <input className="w-full rounded-lg border border-gray-300 px-4 py-2" value={city} onChange={e => setCity(e.target.value)} placeholder="City / area" />
          <input className="w-full rounded-lg border border-gray-300 px-4 py-2" value={shootDate} onChange={e => setShootDate(e.target.value)} placeholder="Shoot date/time (optional)" />
          <input className="w-full rounded-lg border border-gray-300 px-4 py-2" value={mood} onChange={e => setMood(e.target.value)} placeholder="Mood/style" />
        </div>

        <textarea className="mt-3 min-h-20 w-full rounded-lg border border-gray-300 px-4 py-2" value={subjectDetails} onChange={e => setSubjectDetails(e.target.value)} placeholder="Who is being photographed? ages, group size, etc." />
        <textarea className="mt-3 min-h-20 w-full rounded-lg border border-gray-300 px-4 py-2" value={mustHaveShots} onChange={e => setMustHaveShots(e.target.value)} placeholder="Must-have shots" />
        <textarea className="mt-3 min-h-20 w-full rounded-lg border border-gray-300 px-4 py-2" value={constraints} onChange={e => setConstraints(e.target.value)} placeholder="Constraints (weather, mobility, permits, timing, kids attention span...)" />

        {error && <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      </Card>

      {plan && (
        <>
          <Card>
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{plan.projectTitle}</h3>
                <p className="text-sm text-gray-600">{plan.creativeDirection}</p>
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" isLoading={isApplying} onClick={() => void applyPlanToWorkspace()}>
                  {isApplying ? 'Applying...' : 'Create Project + Shot List'}
                </Button>
                <Link href="/dashboard/shot-board">
                  <Button variant="ghost">Open Shot Board</Button>
                </Link>
              </div>
            </div>
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
                    <p className="font-semibold text-gray-900">{location.name}</p>
                    <p className="mt-1 text-sm text-gray-600">{location.whyItWorks}</p>
                    {location.latitude != null && location.longitude != null && (
                      <p className="mt-2 text-xs text-blue-700">
                        Coordinates: {Number(location.latitude).toFixed(5)}, {Number(location.longitude).toFixed(5)}
                      </p>
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

          <Card>
            <h4 className="mb-3 text-lg font-semibold text-gray-900">AI Shot List</h4>
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
