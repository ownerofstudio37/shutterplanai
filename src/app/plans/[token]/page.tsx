'use client';

/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

type SharedLocation = {
  name?: string;
  displayName?: string;
  whyItWorks?: string;
  microLocations?: string[];
  selectionReasons?: string[];
  googleMapsUrl?: string;
  latitude?: number | null;
  longitude?: number | null;
  logistics?: {
    parking?: string;
    restroom?: string;
    walkingDistance?: string;
  };
};

type SharedShot = {
  title?: string;
  location?: string;
  microSpot?: string;
  description?: string;
  poseSuggestion?: string;
  compositionSuggestion?: string;
  timingHint?: string;
};

type SharedTimelineItem = {
  timeBlock?: string;
  focus?: string;
  notes?: string;
};

type SharedPlanResponse = {
  plan_data?: {
    projectTitle?: string;
    creativeDirection?: string;
    locationSuggestions?: SharedLocation[];
    shotList?: SharedShot[];
    timeline?: SharedTimelineItem[];
    clientPrepChecklist?: string[];
    contingencyPlans?: string[];
  };
  metadata?: {
    shootType?: string;
    city?: string;
    duration?: string;
    mood?: string;
    shootDate?: string;
    guideBranding?: {
      studioName?: string;
      logoUrl?: string;
      primaryColor?: string;
      accentColor?: string;
      websiteUrl?: string;
    };
  };
  requiresPassword?: boolean;
  error?: string;
};

type GuideRole = 'client' | 'assistant' | 'vendor' | 'photographer';
type ApprovalStatus = 'pending' | 'approved' | 'changes-requested';

function formatDate(value?: string) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function getLocationName(location: SharedLocation, index: number) {
  return location.displayName || location.name || `Location ${index + 1}`;
}

function getMapsUrl(location: SharedLocation, index: number) {
  if (location.googleMapsUrl) return location.googleMapsUrl;
  if (location.latitude != null && location.longitude != null) {
    return `https://maps.google.com/?q=${Number(location.latitude)},${Number(location.longitude)}`;
  }
  return `https://maps.google.com/?q=${encodeURIComponent(getLocationName(location, index))}`;
}

export default function SharedPlanPage() {
  const params = useParams<{ token: string }>();
  const token = params?.token;

  const [data, setData] = useState<SharedPlanResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [requiresPassword, setRequiresPassword] = useState(false);
  const [sharePassword, setSharePassword] = useState('');
  const [submittedPassword, setSubmittedPassword] = useState('');
  const [viewerRole, setViewerRole] = useState<GuideRole>('client');
  const [approvalStatus, setApprovalStatus] = useState<ApprovalStatus>('pending');
  const [commentScope, setCommentScope] = useState('overall');
  const [commentDraft, setCommentDraft] = useState('');
  const [collaborationMessage, setCollaborationMessage] = useState('');

  useEffect(() => {
    const fetchSharedPlan = async () => {
      if (!token) return;

      setIsLoading(true);
      setError('');
      try {
        const response = submittedPassword
          ? await fetch('/api/planner/export/access', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ token, password: submittedPassword }),
            })
          : await fetch(`/api/planner/export?${new URLSearchParams({ token }).toString()}`);
        const result = (await response.json()) as SharedPlanResponse;

        if (!response.ok) {
          setRequiresPassword(Boolean(result.requiresPassword));
          setError(result.error || 'Shared plan not found or expired.');
          return;
        }

        setRequiresPassword(false);
        setData(result);
      } catch {
        setError('Failed to load shared plan.');
      } finally {
        setIsLoading(false);
      }
    };

    void fetchSharedPlan();
  }, [submittedPassword, token]);

  const plan = data?.plan_data;
  const locations = useMemo(() => plan?.locationSuggestions ?? [], [plan?.locationSuggestions]);
  const shots = useMemo(() => plan?.shotList ?? [], [plan?.shotList]);
  const timeline = useMemo(() => plan?.timeline ?? [], [plan?.timeline]);
  const prepChecklist = plan?.clientPrepChecklist ?? [];
  const contingencies = plan?.contingencyPlans ?? [];
  const shootDate = formatDate(data?.metadata?.shootDate);
  const primaryLocation = locations[0];
  const branding = data?.metadata?.guideBranding;
  const primaryColor = branding?.primaryColor || '#1f2933';
  const accentColor = branding?.accentColor || '#d8d2c8';
  const studioName = branding?.studioName || 'ShutterPlan AI';
  const guideVersion = data?.metadata?.shootDate || data?.metadata?.duration || 'v1';

  const trackGuideEngagement = async (eventName: string, payload: Record<string, unknown> = {}) => {
    if (!token) return;
    try {
      await fetch('/api/planner/export/engagement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shareToken: token,
          eventName,
          payload: {
            role: viewerRole,
            guideVersion,
            ...payload,
          },
        }),
      });
    } catch {
      // Public guide analytics are best-effort.
    }
  };

  const selectRole = (role: GuideRole) => {
    setViewerRole(role);
    void trackGuideEngagement('planner_guide_role_selected', { role });
  };

  const submitApproval = (status: Exclude<ApprovalStatus, 'pending'>) => {
    setApprovalStatus(status);
    setCollaborationMessage(status === 'approved' ? 'Approval sent to your photographer.' : 'Change request sent to your photographer.');
    void trackGuideEngagement(
      status === 'approved' ? 'planner_guide_approved' : 'planner_guide_changes_requested',
      { approvalStatus: status }
    );
  };

  const submitComment = () => {
    const comment = commentDraft.trim();
    if (!comment) return;
    setCollaborationMessage('Comment sent to your photographer.');
    setCommentDraft('');
    void trackGuideEngagement('planner_guide_comment_added', {
      scope: commentScope,
      comment: comment.slice(0, 500),
    });
  };

  return (
    <main className="min-h-screen bg-[#f6f3ee] text-[#1f2933]">
      <div className="mx-auto max-w-6xl px-4 py-5 md:px-6 md:py-8">
        <header className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            {branding?.logoUrl ? (
              <img src={branding.logoUrl} alt="" className="h-12 w-12 rounded-lg border border-[#d8d2c8] bg-white object-contain p-1" />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-lg text-sm font-semibold text-white" style={{ backgroundColor: primaryColor }}>
                {studioName.slice(0, 2).toUpperCase()}
              </div>
            )}
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#7c6f64]">{studioName} client guide</p>
              <p className="mt-1 text-sm text-[#5f6b76]">Prepared by your photographer</p>
            </div>
          </div>
          <Link href="/auth/login" onClick={() => void trackGuideEngagement('planner_guide_dashboard_clicked')}>
            <Button variant="secondary" className="bg-white hover:bg-[#ebe5db]">Open photographer dashboard</Button>
          </Link>
        </header>

        {isLoading && (
          <Card className="border border-[#d8d2c8] shadow-sm">
            <div className="space-y-3">
              <div className="h-5 w-48 animate-pulse rounded bg-gray-100" />
              <div className="h-24 animate-pulse rounded-lg bg-gray-100" />
              <div className="grid gap-3 md:grid-cols-3">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div key={index} className="h-20 animate-pulse rounded-lg bg-gray-100" />
                ))}
              </div>
            </div>
          </Card>
        )}

        {error && (
          <Card className="border border-red-200 bg-red-50 shadow-sm">
            <p className="text-sm font-semibold text-red-800">{error}</p>
          </Card>
        )}

        {requiresPassword && !plan && (
          <Card className="border border-[#d8d2c8] bg-white shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#7c6f64]">Protected guide</p>
            <h1 className="mt-2 text-2xl font-semibold text-[#1f2933]">Enter the share password</h1>
            <p className="mt-2 text-sm text-[#5f6b76]">Your photographer protected this session guide before sharing it.</p>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
              <input
                type="password"
                value={sharePassword}
                onChange={event => setSharePassword(event.target.value)}
                placeholder="Share password"
                className="w-full rounded-lg border border-[#d8d2c8] bg-[#faf9f6] px-3 py-2 text-sm outline-none focus:border-[#1f2933]"
              />
              <Button
                type="button"
                onClick={() => setSubmittedPassword(sharePassword.trim())}
                className="bg-[#1f2933] hover:bg-[#111827]"
              >
                Unlock guide
              </Button>
            </div>
          </Card>
        )}

        {!isLoading && !error && plan && (
          <div className="space-y-5">
            <section className="overflow-hidden rounded-lg border border-[#d8d2c8] shadow-sm" style={{ backgroundColor: primaryColor }}>
              <div className="p-5 text-white md:p-7">
                <div className="max-w-4xl">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: accentColor }}>
                    Session plan
                  </p>
                  <h1 className="mt-3 text-3xl font-semibold tracking-normal md:text-4xl">
                    {plan.projectTitle || 'Photography Session Plan'}
                  </h1>
                  <p className="mt-3 max-w-3xl text-sm leading-6 text-[#d1d5db]">
                    {plan.creativeDirection || 'Your photographer has prepared the session details below.'}
                  </p>
                </div>

                <div className="mt-6 grid gap-3 md:grid-cols-4">
                  <div className="rounded-lg border border-white/10 bg-white/10 px-3 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em]" style={{ color: accentColor }}>Session</p>
                    <p className="mt-1 text-sm font-semibold">{data.metadata?.shootType || 'Photo session'}</p>
                  </div>
                  <div className="rounded-lg border border-white/10 bg-white/10 px-3 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em]" style={{ color: accentColor }}>Area</p>
                    <p className="mt-1 text-sm font-semibold">{data.metadata?.city || 'Location provided below'}</p>
                  </div>
                  <div className="rounded-lg border border-white/10 bg-white/10 px-3 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em]" style={{ color: accentColor }}>Duration</p>
                    <p className="mt-1 text-sm font-semibold">{data.metadata?.duration || 'See timeline'}</p>
                  </div>
                  <div className="rounded-lg border border-white/10 bg-white/10 px-3 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em]" style={{ color: accentColor }}>Date</p>
                    <p className="mt-1 text-sm font-semibold">{shootDate || 'Confirm with photographer'}</p>
                  </div>
                </div>
              </div>
            </section>

            <Card className="border border-[#d8d2c8] bg-white shadow-sm">
              <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#7c6f64]">Guide collaboration</p>
                  <h2 className="mt-2 text-xl font-semibold text-[#1f2933]">Approval and comments</h2>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {(['client', 'assistant', 'vendor', 'photographer'] as GuideRole[]).map(role => (
                      <button
                        key={role}
                        type="button"
                        onClick={() => selectRole(role)}
                        className={`rounded-lg border px-3 py-2.5 text-sm font-semibold capitalize ${
                          viewerRole === role
                            ? 'border-[#1f2933] bg-[#1f2933] text-white'
                            : 'border-[#d8d2c8] bg-[#faf9f6] text-[#5f6b76]'
                        }`}
                      >
                        {role}
                      </button>
                    ))}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button type="button" onClick={() => submitApproval('approved')} className="bg-[#0f766e] hover:bg-[#115e59]">
                      Approve guide
                    </Button>
                    <Button type="button" variant="secondary" onClick={() => submitApproval('changes-requested')} className="bg-white hover:bg-[#ebe5db]">
                      Request changes
                    </Button>
                  </div>
                  <p className="mt-3 text-xs font-medium text-[#5f6b76]">
                    Status: {approvalStatus === 'changes-requested' ? 'changes requested' : approvalStatus}
                  </p>
                  {collaborationMessage && <p className="mt-2 text-sm font-medium text-[#0f766e]">{collaborationMessage}</p>}
                </div>

                <div>
                  <label className="text-xs font-semibold uppercase tracking-[0.12em] text-[#7c6f64]" htmlFor="guide-comment-scope">
                    Comment target
                  </label>
                  <select
                    id="guide-comment-scope"
                    value={commentScope}
                    onChange={event => setCommentScope(event.target.value)}
                    className="mt-2 w-full rounded-lg border border-[#d8d2c8] bg-[#faf9f6] px-3 py-2 text-sm text-[#1f2933] outline-none focus:border-[#1f2933]"
                  >
                    <option value="overall">Overall guide</option>
                    <option value="locations">Locations</option>
                    <option value="timeline">Timeline</option>
                    <option value="shots">Shot list</option>
                    <option value="prep">Prep details</option>
                  </select>
                  <textarea
                    value={commentDraft}
                    onChange={event => setCommentDraft(event.target.value)}
                    placeholder="Add a comment or requested change"
                    className="mt-3 min-h-24 w-full rounded-lg border border-[#d8d2c8] bg-[#faf9f6] px-3 py-2 text-sm text-[#1f2933] outline-none focus:border-[#1f2933]"
                  />
                  <Button type="button" onClick={submitComment} disabled={!commentDraft.trim()} className="mt-3 bg-[#1f2933] hover:bg-[#111827]">
                    Send comment
                  </Button>
                </div>
              </div>
            </Card>

            <section className="grid gap-5 lg:grid-cols-[1fr_0.9fr]">
              <Card className="border border-[#d8d2c8] shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#7c6f64]">Arrival plan</p>
                <h2 className="mt-2 text-xl font-semibold text-[#1f2933]">Where to go first</h2>
                {primaryLocation ? (
                  <div className="mt-4 rounded-lg border border-[#e4ded5] bg-[#faf9f6] p-4">
                    <p className="text-lg font-semibold text-[#1f2933]">{getLocationName(primaryLocation, 0)}</p>
                    <p className="mt-2 text-sm leading-6 text-[#5f6b76]">{primaryLocation.whyItWorks || 'Your photographer will meet you here.'}</p>
                    <div className="mt-4 grid gap-2 text-xs text-[#5f6b76] md:grid-cols-3">
                      <p><span className="font-semibold text-[#1f2933]">Parking:</span> {primaryLocation.logistics?.parking || 'Confirm with photographer'}</p>
                      <p><span className="font-semibold text-[#1f2933]">Restroom:</span> {primaryLocation.logistics?.restroom || 'Confirm before arrival'}</p>
                      <p><span className="font-semibold text-[#1f2933]">Walking:</span> {primaryLocation.logistics?.walkingDistance || 'Keep transitions short'}</p>
                    </div>
                    <a
                      href={getMapsUrl(primaryLocation, 0)}
                      target="_blank"
                      rel="noreferrer noopener"
                      onClick={() => void trackGuideEngagement('planner_guide_map_opened', { locationName: getLocationName(primaryLocation, 0), locationIndex: 0 })}
                      className="mt-4 inline-flex rounded-lg bg-[#1f2933] px-4 py-2 text-sm font-medium text-white hover:bg-[#111827]"
                      style={{ backgroundColor: primaryColor }}
                    >
                      Open arrival map
                    </a>
                  </div>
                ) : (
                  <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                    Arrival location has not been included in this guide yet.
                  </p>
                )}
              </Card>

              <Card className="border border-[#d8d2c8] shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#7c6f64]">Before you arrive</p>
                <h2 className="mt-2 text-xl font-semibold text-[#1f2933]">Client prep checklist</h2>
                {prepChecklist.length > 0 ? (
                  <ul className="mt-4 space-y-2">
                    {prepChecklist.map((item, index) => (
                      <li key={`${item}-${index}`} className="flex gap-3 rounded-lg border border-[#e4ded5] bg-[#faf9f6] px-3 py-3 text-sm text-[#5f6b76]">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-white text-xs font-semibold text-[#1f2933]">
                          {index + 1}
                        </span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-4 rounded-lg border border-[#e4ded5] bg-[#faf9f6] p-4 text-sm text-[#5f6b76]">
                    No prep checklist was included.
                  </p>
                )}
              </Card>
            </section>

            {timeline.length > 0 && (
              <Card className="border border-[#d8d2c8] shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#7c6f64]">Session timeline</p>
                <h2 className="mt-2 text-xl font-semibold text-[#1f2933]">What to expect</h2>
                <div className="mt-4 grid gap-3">
                  {timeline.map((item, index) => (
                    <div key={`${item.timeBlock}-${index}`} className="grid gap-3 rounded-lg border border-[#e4ded5] bg-white p-4 md:grid-cols-[170px_1fr]">
                      <div>
                        <p className="text-sm font-semibold text-[#1f2933]">{item.timeBlock || `Block ${index + 1}`}</p>
                        <p className="mt-1 text-xs font-medium text-[#7c6f64]">{item.focus || 'Session flow'}</p>
                      </div>
                      <p className="text-sm leading-6 text-[#5f6b76]">{item.notes || 'Your photographer will guide this section.'}</p>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {locations.length > 0 && (
              <Card className="border border-[#d8d2c8] shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#7c6f64]">Locations</p>
                <h2 className="mt-2 text-xl font-semibold text-[#1f2933]">Planned stops and micro-spots</h2>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  {locations.map((location, index) => (
                    <div key={`${location.name}-${index}`} className="rounded-lg border border-[#e4ded5] bg-[#faf9f6] p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-[#1f2933]">{getLocationName(location, index)}</p>
                          <p className="mt-2 text-sm leading-6 text-[#5f6b76]">{location.whyItWorks || 'Location notes pending.'}</p>
                        </div>
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[#1f2933] text-xs font-semibold text-white">
                          {index + 1}
                        </span>
                      </div>
                      {location.microLocations?.length ? (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {location.microLocations.map(spot => (
                            <span key={`${location.name}-${spot}`} className="rounded-md bg-white px-2 py-1 text-xs font-medium text-[#5f6b76]">
                              {spot}
                            </span>
                          ))}
                        </div>
                      ) : null}
                      <a
                        href={getMapsUrl(location, index)}
                        target="_blank"
                        rel="noreferrer noopener"
                        onClick={() => void trackGuideEngagement('planner_guide_map_opened', { locationName: getLocationName(location, index), locationIndex: index })}
                        className="mt-3 inline-flex text-sm font-medium text-[#1f2933] underline"
                      >
                        Open map
                      </a>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {shots.length > 0 && (
              <Card className="border border-[#d8d2c8] shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#7c6f64]">Shot plan</p>
                <h2 className="mt-2 text-xl font-semibold text-[#1f2933]">Coverage your photographer is planning</h2>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  {shots.map((shot, index) => (
                    <div key={`${shot.title}-${index}`} className="rounded-lg border border-[#e4ded5] bg-white p-4">
                      <p className="font-semibold text-[#1f2933]">{shot.title || `Shot ${index + 1}`}</p>
                      <p className="mt-2 text-sm leading-6 text-[#5f6b76]">{shot.description || 'No description provided.'}</p>
                      <div className="mt-3 flex flex-wrap gap-2 text-xs text-[#5f6b76]">
                        <span className="rounded-md bg-[#f6f3ee] px-2 py-1">{shot.location || 'Location TBD'}</span>
                        {shot.microSpot && <span className="rounded-md bg-[#f6f3ee] px-2 py-1">{shot.microSpot}</span>}
                        {shot.timingHint && <span className="rounded-md bg-[#f6f3ee] px-2 py-1">{shot.timingHint}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {contingencies.length > 0 && (
              <Card className="border border-amber-200 bg-amber-50 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-800">Backup plan</p>
                <h2 className="mt-2 text-xl font-semibold text-amber-950">If conditions change</h2>
                <ul className="mt-4 grid gap-2 md:grid-cols-2">
                  {contingencies.map((item, index) => (
                    <li key={`${item}-${index}`} className="rounded-lg border border-amber-200 bg-white/70 px-3 py-3 text-sm leading-6 text-amber-950">
                      {item}
                    </li>
                  ))}
                </ul>
              </Card>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
