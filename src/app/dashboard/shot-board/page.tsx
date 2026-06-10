'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { tokenUtils } from '@/lib/auth';

interface ProjectItem {
  id: string;
  title: string;
  description: string;
  status: 'draft' | 'planning' | 'in-progress' | 'completed' | 'archived';
  start_date?: string | null;
  end_date?: string | null;
  tags?: string[];
}

interface ShotItem {
  id: string;
  project_id: string;
  project_title?: string;
  title: string;
  description: string;
  location?: string;
  planned_time?: string | null;
  notes?: string;
  image_url?: string | null;
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

function formatDate(value?: string | null) {
  if (!value) return 'Not scheduled';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'Not scheduled';

  return parsed.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function ShotBoardPage() {
  const searchParams = useSearchParams();
  const preselectedProjectId = searchParams?.get('project') ?? null;

  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [shots, setShots] = useState<ShotItem[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const [projectsResponse, shotsResponse] = await Promise.all([
          fetch('/api/projects', { headers: getAuthHeader() }),
          fetch('/api/shots', { headers: getAuthHeader() }),
        ]);

        const [projectsResult, shotsResult] = await Promise.all([
          projectsResponse.json(),
          shotsResponse.json(),
        ]);

        if (!projectsResult.success) {
          throw new Error(projectsResult.error ?? 'Failed to load projects');
        }

        if (!shotsResult.success) {
          throw new Error(shotsResult.error ?? 'Failed to load shots');
        }

        const loadedProjects: ProjectItem[] = projectsResult.data ?? [];
        setProjects(loadedProjects);
        setShots(shotsResult.data ?? []);

        if (preselectedProjectId && loadedProjects.some(project => project.id === preselectedProjectId)) {
          setSelectedProjectId(preselectedProjectId);
        } else if (loadedProjects.length > 0) {
          setSelectedProjectId(loadedProjects[0].id);
        }
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Failed to load shot board');
      } finally {
        setIsLoading(false);
      }
    };

    void loadData();
  }, [preselectedProjectId]);

  const selectedProject = useMemo(
    () => projects.find(project => project.id === selectedProjectId) ?? null,
    [projects, selectedProjectId]
  );

  const projectShots = useMemo(
    () => shots.filter(shot => shot.project_id === selectedProjectId),
    [shots, selectedProjectId]
  );

  const statusCounts = useMemo(
    () => ({
      planned: projectShots.filter(shot => shot.status === 'planned').length,
      taken: projectShots.filter(shot => shot.status === 'taken').length,
      approved: projectShots.filter(shot => shot.status === 'approved').length,
      rejected: projectShots.filter(shot => shot.status === 'rejected').length,
    }),
    [projectShots]
  );

  return (
    <div className="space-y-6 shot-board-print">
      <div className="print-hidden flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-2xl font-bold text-gray-900">Export Shot Board</h3>
          <p className="mt-1 text-sm text-gray-600">
            Choose a project, review the layout, then print or save as PDF.
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={() => window.print()}>
            Print / Save PDF
          </Button>
          <Link href="/dashboard/shots">
            <Button variant="ghost">Back to Shots</Button>
          </Link>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 print-hidden">
          {error}
        </div>
      )}

      <Card className="print-hidden">
        <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">Project</label>
            <select
              aria-label="Select project for shot board"
              value={selectedProjectId}
              onChange={event => setSelectedProjectId(event.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-2"
              disabled={isLoading || projects.length === 0}
            >
              {projects.length === 0 ? (
                <option value="">Create a project first</option>
              ) : (
                projects.map(project => (
                  <option key={project.id} value={project.id}>
                    {project.title}
                  </option>
                ))
              )}
            </select>
          </div>
          {selectedProjectId && (
            <Link href={`/dashboard/projects?focus=${selectedProjectId}`}>
              <Button variant="secondary">Open Project</Button>
            </Link>
          )}
        </div>
      </Card>

      {isLoading ? (
        <Card>
          <p className="text-gray-600">Loading shot board...</p>
        </Card>
      ) : !selectedProject ? (
        <Card>
          <p className="text-gray-600">No project selected. Create a project and add shots first.</p>
        </Card>
      ) : (
        <div className="space-y-6">
          <Card className="print-card border border-gray-200 shadow-sm">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-sm font-medium uppercase tracking-[0.2em] text-blue-600">ShutterPlan Shot Board</p>
                <h1 className="mt-2 text-3xl font-bold text-gray-900">{selectedProject.title}</h1>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-600">
                  {selectedProject.description || 'No project description provided.'}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
                    Status: {selectedProject.status}
                  </span>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                    Start: {formatDate(selectedProject.start_date)}
                  </span>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                    End: {formatDate(selectedProject.end_date)}
                  </span>
                </div>
                {selectedProject.tags && selectedProject.tags.length > 0 && (
                  <p className="mt-3 text-sm text-gray-500">Tags: {selectedProject.tags.join(', ')}</p>
                )}
              </div>

              <div className="grid min-w-72 grid-cols-2 gap-3">
                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-wide text-gray-500">Shots</p>
                  <p className="mt-2 text-2xl font-bold text-gray-900">{projectShots.length}</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-wide text-gray-500">Approved</p>
                  <p className="mt-2 text-2xl font-bold text-green-600">{statusCounts.approved}</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-wide text-gray-500">Planned</p>
                  <p className="mt-2 text-2xl font-bold text-yellow-600">{statusCounts.planned}</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-wide text-gray-500">Taken</p>
                  <p className="mt-2 text-2xl font-bold text-blue-600">{statusCounts.taken}</p>
                </div>
              </div>
            </div>
          </Card>

          {projectShots.length === 0 ? (
            <Card className="print-card border border-dashed border-gray-200 shadow-sm">
              <p className="text-gray-600">No shots in this project yet. Add some planned shots to generate a board.</p>
            </Card>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {projectShots.map((shot, index) => (
                <Card key={shot.id} className="print-card border border-gray-200 shadow-sm">
                  <div className="space-y-4">
                    {shot.image_url && (
                      <img
                        src={shot.image_url}
                        alt={shot.title}
                        className="h-56 w-full rounded-xl object-cover"
                      />
                    )}

                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-gray-400">Shot {index + 1}</p>
                        <h3 className="mt-1 text-xl font-semibold text-gray-900">{shot.title}</h3>
                      </div>
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium capitalize text-slate-700">
                        {shot.status}
                      </span>
                    </div>

                    <p className="text-sm leading-6 text-gray-600">{shot.description || 'No description provided.'}</p>

                    <dl className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-lg bg-slate-50 p-3">
                        <dt className="text-xs uppercase tracking-wide text-gray-500">Location</dt>
                        <dd className="mt-1 text-sm text-gray-800">{shot.location || 'Flexible / TBD'}</dd>
                      </div>
                      <div className="rounded-lg bg-slate-50 p-3">
                        <dt className="text-xs uppercase tracking-wide text-gray-500">Planned Time</dt>
                        <dd className="mt-1 text-sm text-gray-800">{formatDate(shot.planned_time)}</dd>
                      </div>
                    </dl>

                    <div className="rounded-lg bg-slate-50 p-3">
                      <p className="text-xs uppercase tracking-wide text-gray-500">Notes</p>
                      <p className="mt-1 whitespace-pre-wrap text-sm text-gray-700">
                        {shot.notes || 'No notes yet.'}
                      </p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
