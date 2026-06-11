'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { tokenUtils } from '@/lib/auth';
import type { PlannerAnalyticsSummary } from '@/app/api/planner/analytics/route';

interface ProjectItem {
  id: string;
  title: string;
  description: string;
  status: 'draft' | 'planning' | 'in-progress' | 'completed' | 'archived';
  created_at: string;
}

interface ShotItem {
  id: string;
  project_id: string;
  project_title?: string;
  title: string;
  planned_time?: string | null;
  status: 'planned' | 'taken' | 'approved' | 'rejected';
}

function getAuthHeader() {
  const token = tokenUtils.getToken();
  const headers: Record<string, string> = {};

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
}

function formatDate(dateString?: string | null) {
  if (!dateString) return 'Unscheduled';

  const parsed = new Date(dateString);
  if (Number.isNaN(parsed.getTime())) return 'Unscheduled';

  return parsed.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function getProjectStatusClass(status: ProjectItem['status']) {
  switch (status) {
    case 'completed':
      return 'border-emerald-200 bg-emerald-50 text-emerald-700';
    case 'in-progress':
      return 'border-blue-200 bg-blue-50 text-blue-700';
    case 'planning':
      return 'border-amber-200 bg-amber-50 text-amber-800';
    case 'archived':
      return 'border-gray-200 bg-gray-100 text-gray-700';
    default:
      return 'border-slate-200 bg-slate-50 text-slate-700';
  }
}

function getShotStatusClass(status: ShotItem['status']) {
  switch (status) {
    case 'approved':
      return 'border-emerald-200 bg-emerald-50 text-emerald-700';
    case 'taken':
      return 'border-blue-200 bg-blue-50 text-blue-700';
    case 'rejected':
      return 'border-red-200 bg-red-50 text-red-700';
    default:
      return 'border-amber-200 bg-amber-50 text-amber-800';
  }
}

function getProgressWidthClass(count: number, total: number) {
  const ratio = total === 0 ? 0 : count / total;

  if (ratio === 0) return 'w-0';
  if (ratio <= 0.2) return 'w-1/5';
  if (ratio <= 0.25) return 'w-1/4';
  if (ratio <= 1 / 3) return 'w-1/3';
  if (ratio <= 0.5) return 'w-1/2';
  if (ratio <= 2 / 3) return 'w-2/3';
  if (ratio <= 0.75) return 'w-3/4';
  if (ratio <= 0.8) return 'w-4/5';
  return 'w-full';
}

export default function Dashboard() {
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [shots, setShots] = useState<ShotItem[]>([]);
  const [plannerStats, setPlannerStats] = useState<PlannerAnalyticsSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadDashboard = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const [projectsResponse, shotsResponse, analyticsResponse] = await Promise.all([
          fetch('/api/projects', { headers: getAuthHeader() }),
          fetch('/api/shots', { headers: getAuthHeader() }),
          fetch('/api/planner/analytics', { headers: getAuthHeader() }),
        ]);

        const [projectsResult, shotsResult, analyticsResult] = await Promise.all([
          projectsResponse.json(),
          shotsResponse.json(),
          analyticsResponse.json(),
        ]);

        if (!projectsResult.success) {
          throw new Error(projectsResult.error ?? 'Failed to load projects');
        }

        if (!shotsResult.success) {
          throw new Error(shotsResult.error ?? 'Failed to load shots');
        }

        setProjects(projectsResult.data ?? []);
        setShots(shotsResult.data ?? []);
        if (analyticsResult.success) {
          setPlannerStats(analyticsResult.data as PlannerAnalyticsSummary);
        }
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Failed to load dashboard');
      } finally {
        setIsLoading(false);
      }
    };

    void loadDashboard();
  }, []);

  const activeProjects = useMemo(
    () => projects.filter(project => project.status === 'planning' || project.status === 'in-progress').length,
    [projects]
  );

  const recentProjects = useMemo(
    () => [...projects].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 5),
    [projects]
  );

  const upcomingShots = useMemo(
    () =>
      [...shots]
        .filter(shot => shot.planned_time)
        .sort((a, b) => (a.planned_time ?? '').localeCompare(b.planned_time ?? ''))
        .slice(0, 6),
    [shots]
  );

  const shotStatusBreakdown = useMemo(() => {
    return {
      planned: shots.filter(shot => shot.status === 'planned').length,
      taken: shots.filter(shot => shot.status === 'taken').length,
      approved: shots.filter(shot => shot.status === 'approved').length,
      rejected: shots.filter(shot => shot.status === 'rejected').length,
    };
  }, [shots]);

  const planningSignals = [
    {
      label: 'AI plans generated',
      value: isLoading ? '-' : String(plannerStats?.generate.total ?? 0),
      detail: plannerStats?.generate.total ? `${plannerStats.generate.successRate}% success rate` : 'Ready for the next session',
      href: '/dashboard/planner',
    },
    {
      label: 'Active productions',
      value: isLoading ? '-' : String(activeProjects),
      detail: `${projects.length} total project${projects.length === 1 ? '' : 's'}`,
      href: '/dashboard/projects',
    },
    {
      label: 'Coverage planned',
      value: isLoading ? '-' : String(shots.length),
      detail: `${shotStatusBreakdown.approved} approved frame${shotStatusBreakdown.approved === 1 ? '' : 's'}`,
      href: '/dashboard/shots',
    },
    {
      label: 'Client guides',
      value: isLoading ? '-' : String(plannerStats?.shareLinksCreated ?? 0),
      detail: plannerStats?.shareLinksCreated ? 'Delivered from planner exports' : 'No guide links yet',
      href: '/dashboard/shot-board',
    },
  ];

  const workflowCards = [
    {
      title: 'Smart AI Engine',
      metric: plannerStats?.refine.total ?? 0,
      metricLabel: 'refinement runs',
      body: 'Generate session timelines, composition ideas, and shot lists from the session variables that actually shape the day.',
      href: '/dashboard/planner',
      cta: 'Open planner',
    },
    {
      title: 'Micro-logistics',
      metric: plannerStats?.routesOptimized ?? 0,
      metricLabel: 'routes optimized',
      body: 'Turn location ideas into usable arrival plans with parking, restrooms, walking burden, and exact shoot order.',
      href: '/dashboard/locations',
      cta: 'Review locations',
    },
    {
      title: 'Sun and weather',
      metric: plannerStats?.generate.success ?? 0,
      metricLabel: 'telemetry-ready plans',
      body: 'Use forecast confidence, golden hour windows, and route timing before the client ever leaves home.',
      href: '/dashboard/calendar',
      cta: 'Check calendar',
    },
  ];

  return (
    <div className="space-y-5">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <section className="grid gap-5 xl:grid-cols-[1.5fr_0.9fr]">
        <div className="rounded-lg border border-[#d8d2c8] bg-[#1f2933] p-5 text-white shadow-sm md:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#c6b9a5]">
                Pre-production workspace
              </p>
              <h1 className="mt-3 text-3xl font-semibold tracking-normal md:text-4xl">
                Plan the shoot before the day starts moving.
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-[#d1d5db]">
                One workspace for AI timelines, exact location logistics, sun windows, weather risk, and client-ready delivery.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/dashboard/planner">
                <Button className="bg-white text-[#1f2933] hover:bg-[#f3f4f6]">Start plan</Button>
              </Link>
              <Link href="/dashboard/shot-board">
                <Button variant="ghost" className="border border-white/20 text-white hover:bg-white/10">
                  Build guide
                </Button>
              </Link>
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {planningSignals.map(signal => (
              <Link
                key={signal.label}
                href={signal.href}
                className="rounded-lg border border-white/10 bg-white/8 p-4 transition-colors hover:bg-white/12"
              >
                <p className="text-xs font-medium text-[#c6b9a5]">{signal.label}</p>
                <p className="mt-2 text-3xl font-semibold tracking-normal text-white">{signal.value}</p>
                <p className="mt-1 text-xs text-[#d1d5db]">{signal.detail}</p>
              </Link>
            ))}
          </div>
        </div>

        <Card className="border border-[#d8d2c8] shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#7c6f64]">Next shoot queue</p>
              <h2 className="mt-2 text-xl font-semibold text-[#1f2933]">Upcoming coverage</h2>
            </div>
            <Link href="/dashboard/shots">
              <Button variant="ghost" size="sm">View all</Button>
            </Link>
          </div>

          <div className="mt-4 space-y-3">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="h-16 animate-pulse rounded-lg bg-gray-100" />
              ))
            ) : upcomingShots.length === 0 ? (
              <div className="rounded-lg border border-dashed border-[#d8d2c8] bg-[#faf9f6] p-4 text-sm text-[#5f6b76]">
                No scheduled shots yet. Add planned times to see the next production queue.
              </div>
            ) : (
              upcomingShots.slice(0, 4).map(shot => (
                <div key={shot.id} className="rounded-lg border border-[#e4ded5] bg-[#faf9f6] p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-[#1f2933]">{shot.title}</p>
                      <p className="mt-1 text-xs text-[#5f6b76]">{shot.project_title ?? 'Unknown project'}</p>
                    </div>
                    <span className={`shrink-0 rounded-md border px-2 py-1 text-xs font-medium ${getShotStatusClass(shot.status)}`}>
                      {shot.status}
                    </span>
                  </div>
                  <p className="mt-2 text-xs font-medium text-[#7c6f64]">{formatDate(shot.planned_time)}</p>
                </div>
              ))
            )}
          </div>
        </Card>
      </section>

      <section className="grid gap-5 lg:grid-cols-3">
        {workflowCards.map(card => (
          <Card key={card.title} className="border border-[#d8d2c8] shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#7c6f64]">{card.title}</p>
            <div className="mt-4 flex items-end gap-2">
              <p className="text-4xl font-semibold tracking-normal text-[#1f2933]">
                {isLoading ? '-' : card.metric}
              </p>
              <p className="pb-1 text-sm text-[#5f6b76]">{card.metricLabel}</p>
            </div>
            <p className="mt-4 min-h-18 text-sm leading-6 text-[#5f6b76]">{card.body}</p>
            <Link href={card.href}>
              <Button variant="secondary" className="mt-5 w-full bg-[#ebe5db] hover:bg-[#ded8ce]">
                {card.cta}
              </Button>
            </Link>
          </Card>
        ))}
      </section>

      <section className="grid gap-5 xl:grid-cols-[1fr_1fr]">
        <Card className="border border-[#d8d2c8] shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#7c6f64]">Project pipeline</p>
              <h2 className="mt-2 text-xl font-semibold text-[#1f2933]">Recent client work</h2>
            </div>
            <Link href="/dashboard/projects">
              <Button variant="ghost" size="sm">Manage</Button>
            </Link>
          </div>

          <div className="mt-4 space-y-3">
            {isLoading ? (
              Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="h-14 animate-pulse rounded-lg bg-gray-100" />
              ))
            ) : recentProjects.length === 0 ? (
              <div className="rounded-lg border border-dashed border-[#d8d2c8] bg-[#faf9f6] p-4 text-sm text-[#5f6b76]">
                No projects yet. Start in the planner or create a client project.
              </div>
            ) : (
              recentProjects.map(project => (
                <div key={project.id} className="flex items-center justify-between gap-3 rounded-lg border border-[#e4ded5] bg-white p-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-[#1f2933]">{project.title}</p>
                    <p className="mt-1 text-xs text-[#5f6b76]">{formatDate(project.created_at)}</p>
                  </div>
                  <span className={`shrink-0 rounded-md border px-2 py-1 text-xs font-medium ${getProjectStatusClass(project.status)}`}>
                    {project.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </Card>

        <Card className="border border-[#d8d2c8] shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#7c6f64]">Coverage readiness</p>
              <h2 className="mt-2 text-xl font-semibold text-[#1f2933]">Shot status</h2>
            </div>
            <Link href="/dashboard/shots">
              <Button variant="ghost" size="sm">Edit shots</Button>
            </Link>
          </div>

          <div className="mt-5 space-y-4">
            {([
              ['planned', shotStatusBreakdown.planned, 'bg-amber-500'],
              ['taken', shotStatusBreakdown.taken, 'bg-blue-500'],
              ['approved', shotStatusBreakdown.approved, 'bg-emerald-500'],
              ['rejected', shotStatusBreakdown.rejected, 'bg-red-500'],
            ] as const).map(([label, count, barClass]) => {
              const widthClass = getProgressWidthClass(count, shots.length);

              return (
                <div key={label}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="capitalize text-[#1f2933]">{label}</span>
                    <span className="text-[#5f6b76]">{isLoading ? '-' : count}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-[#ebe5db]">
                    <div className={`h-2 rounded-full ${barClass} ${widthClass}`} />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <Link href="/dashboard/planner">
              <Button className="w-full bg-[#1f2933] hover:bg-[#111827]">Generate plan</Button>
            </Link>
            <Link href="/dashboard/shot-board">
              <Button variant="secondary" className="w-full bg-[#ebe5db] hover:bg-[#ded8ce]">
                Export board
              </Button>
            </Link>
          </div>
        </Card>
      </section>
    </div>
  );
}
