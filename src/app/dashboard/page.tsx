'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { tokenUtils } from '@/lib/auth';
import Link from 'next/link';
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
  if (!dateString) return 'Not scheduled';

  const parsed = new Date(dateString);
  if (Number.isNaN(parsed.getTime())) return 'Not scheduled';

  return parsed.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function getProjectStatusClass(status: ProjectItem['status']) {
  switch (status) {
    case 'completed':
      return 'bg-green-100 text-green-700';
    case 'in-progress':
      return 'bg-blue-100 text-blue-700';
    case 'planning':
      return 'bg-yellow-100 text-yellow-800';
    case 'archived':
      return 'bg-gray-200 text-gray-700';
    default:
      return 'bg-slate-100 text-slate-700';
  }
}

function getShotStatusClass(status: ShotItem['status']) {
  switch (status) {
    case 'approved':
      return 'bg-green-100 text-green-700';
    case 'taken':
      return 'bg-blue-100 text-blue-700';
    case 'rejected':
      return 'bg-red-100 text-red-700';
    default:
      return 'bg-yellow-100 text-yellow-800';
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

  const completedProjects = useMemo(
    () => projects.filter(project => project.status === 'completed').length,
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

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <Card>
          <div className="text-center">
            <div className="text-4xl font-bold text-blue-600">{isLoading ? '—' : activeProjects}</div>
            <p className="text-gray-600 mt-2">Active Projects</p>
          </div>
        </Card>

        <Card>
          <div className="text-center">
            <div className="text-4xl font-bold text-green-600">{isLoading ? '—' : shots.length}</div>
            <p className="text-gray-600 mt-2">Total Shots Planned</p>
          </div>
        </Card>

        <Card>
          <div className="text-center">
            <div className="text-4xl font-bold text-purple-600">{isLoading ? '—' : completedProjects}</div>
            <p className="text-gray-600 mt-2">Completed Projects</p>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Projects</h3>
          {isLoading ? (
            <p className="text-gray-600">Loading projects...</p>
          ) : recentProjects.length === 0 ? (
            <p className="text-gray-600">No projects yet. Create your first project to get started.</p>
          ) : (
            <div className="space-y-3">
              {recentProjects.map(project => (
                <div key={project.id} className="flex items-center justify-between border-b pb-3 last:border-b-0">
                  <div>
                    <p className="font-medium text-gray-800">{project.title}</p>
                    <p className="text-sm text-gray-500">{formatDate(project.created_at)}</p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-medium ${getProjectStatusClass(project.status)}`}>
                    {project.status}
                  </span>
                </div>
              ))}
            </div>
          )}
          <Link href="/dashboard/projects">
            <Button variant="ghost" className="mt-4 w-full">
              View All Projects →
            </Button>
          </Link>
        </Card>

        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="space-y-3">
            <Link href="/dashboard/projects">
              <Button variant="primary" className="w-full text-left">
                ✨ Create New Project
              </Button>
            </Link>
            <Link href="/dashboard/projects">
              <Button variant="secondary" className="w-full text-left">
                📁 Manage Projects
              </Button>
            </Link>
            <Link href="/dashboard/shots">
              <Button variant="secondary" className="w-full text-left">
                📸 Plan New Shot
              </Button>
            </Link>
            <Link href="/dashboard/shot-board">
              <Button variant="secondary" className="w-full text-left">
                🖨️ Export Shot Board
              </Button>
            </Link>
            <Link href="/dashboard/settings">
              <Button variant="secondary" className="w-full text-left">
                ⚙️ Settings
              </Button>
            </Link>
          </div>
        </Card>

        <Card>
          <h3 className="mb-4 text-lg font-semibold text-gray-900">Shot Status Overview</h3>
          <div className="space-y-4">
            {([
              ['planned', shotStatusBreakdown.planned, 'bg-yellow-500'],
              ['taken', shotStatusBreakdown.taken, 'bg-blue-500'],
              ['approved', shotStatusBreakdown.approved, 'bg-green-500'],
              ['rejected', shotStatusBreakdown.rejected, 'bg-red-500'],
            ] as const).map(([label, count, barClass]) => {
              const widthClass = getProgressWidthClass(count, shots.length);

              return (
                <div key={label}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="capitalize text-gray-700">{label}</span>
                    <span className="text-gray-500">{count}</span>
                  </div>
                  <div className="h-2 rounded-full bg-gray-200">
                    <div className={`h-2 rounded-full ${barClass} ${widthClass}`} />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {(isLoading || plannerStats) && (
        <Card>
          <h3 className="mb-4 text-lg font-semibold text-gray-900">Planner Activity</h3>
          {isLoading ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="animate-pulse rounded-xl bg-gray-100 p-4 h-20" />
              ))}
            </div>
          ) : plannerStats ? (
            <>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                  <p className="text-2xl font-bold text-gray-900">{plannerStats.generate.total}</p>
                  <p className="mt-1 text-sm text-gray-600">Plans Generated</p>
                  {plannerStats.generate.total > 0 && (
                    <p className="mt-1 text-xs font-medium text-green-600">{plannerStats.generate.successRate}% success</p>
                  )}
                </div>
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                  <p className="text-2xl font-bold text-gray-900">{plannerStats.refine.total}</p>
                  <p className="mt-1 text-sm text-gray-600">Refines Run</p>
                  {plannerStats.refine.failed > 0 && (
                    <p className="mt-1 text-xs text-red-500">{plannerStats.refine.failed} failed</p>
                  )}
                </div>
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                  <p className="text-2xl font-bold text-gray-900">{plannerStats.apply.success}</p>
                  <p className="mt-1 text-sm text-gray-600">Projects Applied</p>
                  {plannerStats.apply.failed > 0 && (
                    <p className="mt-1 text-xs text-red-500">{plannerStats.apply.failed} failed</p>
                  )}
                </div>
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                  <p className="text-2xl font-bold text-gray-900">{plannerStats.shareLinksCreated}</p>
                  <p className="mt-1 text-sm text-gray-600">Share Links</p>
                </div>
              </div>
              {(plannerStats.draftsResumed > 0 || plannerStats.routesOptimized > 0) && (
                <div className="mt-3 flex gap-4 text-sm text-gray-500">
                  {plannerStats.draftsResumed > 0 && (
                    <span>{plannerStats.draftsResumed} draft{plannerStats.draftsResumed !== 1 ? 's' : ''} resumed</span>
                  )}
                  {plannerStats.routesOptimized > 0 && (
                    <span>{plannerStats.routesOptimized} route{plannerStats.routesOptimized !== 1 ? 's' : ''} optimized</span>
                  )}
                </div>
              )}
              <Link href="/dashboard/planner">
                <Button variant="ghost" className="mt-4 w-full">
                  Open AI Planner →
                </Button>
              </Link>
            </>
          ) : null}
        </Card>
      )}

      <Card>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Upcoming Shoots</h3>
        {isLoading ? (
          <p className="text-gray-600">Loading shots...</p>
        ) : upcomingShots.length === 0 ? (
          <p className="text-gray-600">No upcoming shots yet. Add planned times to your shots to see them here.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="px-4 py-2 text-left font-semibold">Shot</th>
                  <th className="px-4 py-2 text-left font-semibold">Project</th>
                  <th className="px-4 py-2 text-left font-semibold">Date</th>
                  <th className="px-4 py-2 text-left font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {upcomingShots.map(shot => (
                  <tr key={shot.id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-800">{shot.title}</td>
                    <td className="px-4 py-3 text-gray-600">{shot.project_title ?? 'Unknown project'}</td>
                    <td className="px-4 py-3 text-gray-600">{formatDate(shot.planned_time)}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-3 py-1 text-xs font-medium ${getShotStatusClass(shot.status)}`}>
                        {shot.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
