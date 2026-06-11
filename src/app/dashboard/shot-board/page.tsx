'use client';

/* eslint-disable @next/next/no-img-element */

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
  latitude?: number | null;
  longitude?: number | null;
  micro_spot_name?: string | null;
  parking_notes?: string | null;
  background_description?: string | null;
  walking_distance?: string | null;
  restroom_location?: string | null;
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

function getStatusClass(status: ShotItem['status']) {
  if (status === 'taken') return 'bg-[#d9eee6] text-[#0f766e]';
  if (status === 'approved') return 'bg-[#dbeafe] text-[#1d4ed8]';
  if (status === 'rejected') return 'bg-[#fee2e2] text-[#b91c1c]';
  return 'bg-[#ece7df] text-[#5f6b76]';
}

function formatStatus(status: string) {
  return status.charAt(0).toUpperCase() + status.slice(1).replace('-', ' ');
}

function hasCoordinates(shot: ShotItem) {
  return shot.latitude != null && shot.longitude != null;
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

    queueMicrotask(() => {
      void loadData();
    });
  }, [preselectedProjectId]);

  const selectedProject = useMemo(
    () => projects.find(project => project.id === selectedProjectId) ?? null,
    [projects, selectedProjectId]
  );

  const projectShots = useMemo(
    () => shots.filter(shot => shot.project_id === selectedProjectId),
    [shots, selectedProjectId]
  );

  const boardStats = useMemo(
    () => ({
      scheduled: projectShots.filter(shot => shot.planned_time).length,
      mapped: projectShots.filter(hasCoordinates).length,
      logistics: projectShots.filter(
        shot => shot.micro_spot_name || shot.parking_notes || shot.walking_distance || shot.restroom_location
      ).length,
    }),
    [projectShots]
  );

  return (
    <div className="shot-board-print space-y-6">
      <section className="print-hidden overflow-hidden rounded-lg bg-[#1f2933] text-white shadow-sm">
        <div className="grid gap-6 p-6 lg:grid-cols-[1.4fr_auto] lg:items-end lg:p-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#d8d2c8]">Production packet</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-normal md:text-4xl">Export a shot board clients and crew can follow.</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#d8d2c8]">
              Choose a project, verify the sequence, and print a field-ready PDF with creative notes and micro-logistics.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button className="bg-white text-[#1f2933] hover:bg-[#faf9f6]" onClick={() => window.print()}>
              Print / Save PDF
            </Button>
            <Link
              href="/dashboard/shots"
              className="rounded-lg border border-white/15 px-4 py-2 text-base font-medium text-white transition hover:bg-white/10"
            >
              Back to Shots
            </Link>
          </div>
        </div>
      </section>

      {error && (
        <div className="print-hidden rounded-lg border border-[#fecaca] bg-[#fef2f2] px-4 py-3 text-sm font-medium text-[#b91c1c]">
          {error}
        </div>
      )}

      <Card className="print-hidden border border-[#d8d2c8] bg-[#faf9f6] shadow-sm">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div>
            <label
              className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-[#7c6f64]"
              htmlFor="shot-board-project"
            >
              Project
            </label>
            <select
              id="shot-board-project"
              aria-label="Select project for shot board"
              value={selectedProjectId}
              onChange={event => setSelectedProjectId(event.target.value)}
              className="w-full rounded-lg border border-[#d8d2c8] bg-white px-4 py-3 text-sm font-medium text-[#1f2933] shadow-sm outline-none transition focus:border-[#1f2933] focus:ring-2 focus:ring-[#1f2933]/10"
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
            <Link
              href={`/dashboard/projects?focus=${selectedProjectId}`}
              className="rounded-lg border border-[#d8d2c8] bg-white px-4 py-3 text-center text-sm font-semibold text-[#1f2933] transition hover:bg-[#ece7df]"
            >
              Open Project
            </Link>
          )}
        </div>
      </Card>

      {isLoading ? (
        <Card className="border border-[#d8d2c8] bg-[#faf9f6] shadow-sm">
          <div className="flex min-h-64 items-center justify-center">
            <div className="text-center">
              <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-[#d8d2c8] border-b-[#1f2933]" />
              <p className="mt-4 text-sm font-medium text-[#5f6b76]">Loading shot board...</p>
            </div>
          </div>
        </Card>
      ) : !selectedProject ? (
        <Card className="border border-[#d8d2c8] bg-[#faf9f6] shadow-sm">
          <div className="py-12 text-center">
            <p className="font-semibold text-[#1f2933]">No project selected.</p>
            <p className="mt-2 text-sm text-[#5f6b76]">Create a project and add shots first.</p>
          </div>
        </Card>
      ) : (
        <div className="space-y-6">
          <Card className="print-card border border-[#d8d2c8] bg-white shadow-sm">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-3xl">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#7c6f64]">ShutterPlan shot board</p>
                <h2 className="mt-2 text-3xl font-semibold text-[#1f2933]">{selectedProject.title}</h2>
                <p className="mt-3 text-sm leading-6 text-[#5f6b76]">
                  {selectedProject.description || 'No project description provided.'}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="rounded-full bg-[#ece7df] px-3 py-1 text-xs font-semibold text-[#1f2933]">
                    Status: {formatStatus(selectedProject.status)}
                  </span>
                  <span className="rounded-full bg-[#faf9f6] px-3 py-1 text-xs font-semibold text-[#5f6b76]">
                    Start: {formatDate(selectedProject.start_date)}
                  </span>
                  <span className="rounded-full bg-[#faf9f6] px-3 py-1 text-xs font-semibold text-[#5f6b76]">
                    End: {formatDate(selectedProject.end_date)}
                  </span>
                </div>
                {selectedProject.tags && selectedProject.tags.length > 0 && (
                  <p className="mt-3 text-sm text-[#5f6b76]">Tags: {selectedProject.tags.join(', ')}</p>
                )}
              </div>

              <div className="grid min-w-72 grid-cols-2 gap-3">
                {[
                  ['Shots', projectShots.length.toString()],
                  ['Scheduled', boardStats.scheduled.toString()],
                  ['Mapped', boardStats.mapped.toString()],
                  ['Logistics', boardStats.logistics.toString()],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-lg border border-[#ece7df] bg-[#faf9f6] p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#7c6f64]">{label}</p>
                    <p className="mt-2 text-2xl font-semibold text-[#1f2933]">{value}</p>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          {projectShots.length === 0 ? (
            <Card className="print-card border border-dashed border-[#d8d2c8] bg-[#faf9f6] shadow-sm">
              <p className="text-[#5f6b76]">No shots in this project yet. Add planned shots to generate a board.</p>
            </Card>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {projectShots.map((shot, index) => (
                <Card key={shot.id} className="print-card border border-[#d8d2c8] bg-white shadow-sm">
                  <div className="space-y-4">
                    {shot.image_url && (
                      <img
                        src={shot.image_url}
                        alt={shot.title}
                        className="h-56 w-full rounded-lg border border-[#ece7df] object-cover"
                      />
                    )}

                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#7c6f64]">Shot {index + 1}</p>
                        <h3 className="mt-1 text-xl font-semibold text-[#1f2933]">{shot.title}</h3>
                      </div>
                      <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${getStatusClass(shot.status)}`}>
                        {formatStatus(shot.status)}
                      </span>
                    </div>

                    <p className="text-sm leading-6 text-[#5f6b76]">{shot.description || 'No description provided.'}</p>

                    <dl className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-lg border border-[#ece7df] bg-[#faf9f6] p-3">
                        <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-[#7c6f64]">Location</dt>
                        <dd className="mt-1 text-sm text-[#1f2933]">{shot.location || 'Flexible / TBD'}</dd>
                      </div>
                      <div className="rounded-lg border border-[#ece7df] bg-[#faf9f6] p-3">
                        <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-[#7c6f64]">Planned time</dt>
                        <dd className="mt-1 text-sm text-[#1f2933]">{formatDate(shot.planned_time)}</dd>
                      </div>
                    </dl>

                    {(shot.micro_spot_name || shot.walking_distance || shot.restroom_location || hasCoordinates(shot)) && (
                      <dl className="grid gap-3 sm:grid-cols-2">
                        {shot.micro_spot_name && (
                          <div className="rounded-lg border border-[#ece7df] bg-[#faf9f6] p-3">
                            <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-[#7c6f64]">Micro-spot</dt>
                            <dd className="mt-1 text-sm text-[#1f2933]">{shot.micro_spot_name}</dd>
                          </div>
                        )}
                        {shot.walking_distance && (
                          <div className="rounded-lg border border-[#ece7df] bg-[#faf9f6] p-3">
                            <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-[#7c6f64]">Walking distance</dt>
                            <dd className="mt-1 text-sm text-[#1f2933]">{shot.walking_distance}</dd>
                          </div>
                        )}
                        {shot.restroom_location && (
                          <div className="rounded-lg border border-[#ece7df] bg-[#faf9f6] p-3">
                            <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-[#7c6f64]">Restroom</dt>
                            <dd className="mt-1 text-sm text-[#1f2933]">{shot.restroom_location}</dd>
                          </div>
                        )}
                        {hasCoordinates(shot) && (
                          <div className="rounded-lg border border-[#ece7df] bg-[#faf9f6] p-3">
                            <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-[#7c6f64]">Coordinates</dt>
                            <dd className="mt-1 font-mono text-sm text-[#1f2933]">
                              {Number(shot.latitude).toFixed(6)}, {Number(shot.longitude).toFixed(6)}
                            </dd>
                          </div>
                        )}
                      </dl>
                    )}

                    {(shot.parking_notes || shot.background_description) && (
                      <div className="space-y-2 rounded-lg border border-[#ece7df] bg-[#faf9f6] p-3">
                        {shot.parking_notes && (
                          <p className="text-sm leading-6 text-[#5f6b76]">
                            <span className="font-semibold text-[#1f2933]">Parking:</span> {shot.parking_notes}
                          </p>
                        )}
                        {shot.background_description && (
                          <p className="text-sm leading-6 text-[#5f6b76]">
                            <span className="font-semibold text-[#1f2933]">Background:</span> {shot.background_description}
                          </p>
                        )}
                      </div>
                    )}

                    <div className="rounded-lg border border-[#ece7df] bg-[#faf9f6] p-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#7c6f64]">Notes</p>
                      <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-[#5f6b76]">{shot.notes || 'No notes yet.'}</p>
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
