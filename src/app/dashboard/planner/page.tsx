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
    locationSource: 'grounded-candidates' | 'fallback-geocode' | 'city-fallback';
    resolvedCity: string;
    usedAccountFallbackCity: boolean;
  };
}

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

  const [plan, setPlan] = useState<SessionPlan | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRefining, setIsRefining] = useState(false);
  const [isApplying, setIsApplying] = useState(false);

  const durationMinutes = useMemo(() => parseDurationMinutes(duration), [duration]);
  const expectedShotRange = useMemo(() => getExpectedShotRange(durationMinutes), [durationMinutes]);

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
          duration,
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
          <input className="w-full rounded-lg border border-gray-300 px-4 py-2" value={duration} onChange={e => setDuration(e.target.value)} placeholder="Session duration (e.g. 60 min, 2 hours)" />
          <input className="w-full rounded-lg border border-gray-300 px-4 py-2" value={mood} onChange={e => setMood(e.target.value)} placeholder="Mood/style" />
        </div>

        <textarea className="mt-3 min-h-20 w-full rounded-lg border border-gray-300 px-4 py-2" value={subjectDetails} onChange={e => setSubjectDetails(e.target.value)} placeholder="Who is being photographed? ages, group size, etc." />
        <textarea className="mt-3 min-h-20 w-full rounded-lg border border-gray-300 px-4 py-2" value={mustHaveShots} onChange={e => setMustHaveShots(e.target.value)} placeholder="Must-have shots" />
        <textarea className="mt-3 min-h-20 w-full rounded-lg border border-gray-300 px-4 py-2" value={constraints} onChange={e => setConstraints(e.target.value)} placeholder="Constraints (weather, mobility, permits, timing, kids attention span...)" />

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
                    <p className="mt-1 text-sm text-gray-600">{location.whyItWorks}</p>
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
