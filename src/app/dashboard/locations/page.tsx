'use client';

import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { tokenUtils } from '@/lib/auth';

const MapWithNoSSR = dynamic(() => import('@/components/map/LocationMap'), {
  ssr: false,
  loading: () => (
    <div className="flex h-96 items-center justify-center rounded-lg border border-[#d8d2c8] bg-[#f4f1ec]">
      <p className="text-sm font-medium text-[#5f6b76]">Loading location atlas...</p>
    </div>
  ),
});

interface ProjectOption {
  id: string;
  title: string;
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
  status: 'planned' | 'taken' | 'approved' | 'rejected';
  latitude?: number | string | null;
  longitude?: number | string | null;
  micro_spot_name?: string;
  parking_notes?: string;
  background_description?: string;
  walking_distance?: string;
  restroom_location?: string;
}

function getAuthHeader() {
  const token = tokenUtils.getToken();
  const headers: Record<string, string> = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

function isMappableCoordinate(lat: number, lng: number) {
  const isFinitePair = Number.isFinite(lat) && Number.isFinite(lng);
  if (!isFinitePair) return false;

  const isWithinBounds = lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
  const isLikelyNullIsland = Math.abs(lat) < 0.05 && Math.abs(lng) < 0.05;
  return isWithinBounds && !isLikelyNullIsland;
}

function getStatusClass(status: ShotItem['status']) {
  if (status === 'taken') return 'bg-[#d9eee6] text-[#0f766e]';
  if (status === 'approved') return 'bg-[#dbeafe] text-[#1d4ed8]';
  if (status === 'rejected') return 'bg-[#fee2e2] text-[#b91c1c]';
  return 'bg-[#ece7df] text-[#5f6b76]';
}

function formatStatus(status: ShotItem['status']) {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export default function LocationsPage() {
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [shots, setShots] = useState<ShotItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [projectFilter, setProjectFilter] = useState('all');
  const [selectedShot, setSelectedShot] = useState<ShotItem | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [projectsRes, shotsRes] = await Promise.all([
        fetch('/api/projects', { headers: getAuthHeader() }),
        fetch('/api/shots', { headers: getAuthHeader() }),
      ]);

      const projectsResult = await projectsRes.json();
      const shotsResult = await shotsRes.json();

      if (projectsResult.success) {
        setProjects(projectsResult.data ?? []);
      }

      if (shotsResult.success) {
        setShots(shotsResult.data ?? []);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    queueMicrotask(() => {
      void loadData();
    });
  }, []);

  const filteredShots = useMemo(() => {
    return shots.filter(shot => {
      const matchesProject = projectFilter === 'all' || shot.project_id === projectFilter;
      const lat = Number(shot.latitude);
      const lng = Number(shot.longitude);
      const hasCoordinates = isMappableCoordinate(lat, lng);
      return matchesProject && hasCoordinates;
    });
  }, [shots, projectFilter]);

  const shotsWithoutLocation = useMemo(() => {
    return shots.filter(shot => {
      const matchesProject = projectFilter === 'all' || shot.project_id === projectFilter;
      const lat = Number(shot.latitude);
      const lng = Number(shot.longitude);
      const noCoordinates = !isMappableCoordinate(lat, lng);
      return matchesProject && noCoordinates;
    });
  }, [shots, projectFilter]);

  const stats = useMemo(() => {
    const scopedShots = projectFilter === 'all' ? shots : shots.filter(shot => shot.project_id === projectFilter);
    const mappedPercent = scopedShots.length === 0 ? 0 : Math.round((filteredShots.length / scopedShots.length) * 100);

    return {
      total: scopedShots.length,
      mapped: filteredShots.length,
      unmapped: shotsWithoutLocation.length,
      projects: new Set(scopedShots.map(shot => shot.project_id)).size,
      mappedPercent,
    };
  }, [shots, projectFilter, filteredShots, shotsWithoutLocation]);

  const selectedCoordinates =
    selectedShot?.latitude != null && selectedShot.longitude != null
      ? `${Number(selectedShot.latitude).toFixed(6)}, ${Number(selectedShot.longitude).toFixed(6)}`
      : null;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card className="border border-[#d8d2c8] bg-[#faf9f6] shadow-sm">
          <div className="flex h-96 items-center justify-center">
            <div className="text-center">
              <div className="mx-auto h-12 w-12 animate-spin rounded-full border-2 border-[#d8d2c8] border-b-[#1f2933]" />
              <p className="mt-4 text-sm font-medium text-[#5f6b76]">Building the location atlas...</p>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-lg bg-[#1f2933] text-white shadow-sm">
        <div className="grid gap-6 p-6 lg:grid-cols-[1.4fr_1fr] lg:p-8">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#d8d2c8]">Micro-logistics atlas</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-normal md:text-4xl">Plan exact arrival points, not vague addresses.</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#d8d2c8]">
              Audit shoot pins, parking notes, walking distances, backgrounds, and client-change logistics from one focused map workspace.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              ['Mapped', stats.mapped.toString()],
              ['Coverage', `${stats.mappedPercent}%`],
              ['Needs pins', stats.unmapped.toString()],
              ['Projects', stats.projects.toString()],
            ].map(([label, value]) => (
              <div key={label} className="rounded-lg border border-white/10 bg-white/10 p-4">
                <p className="text-xs font-medium uppercase tracking-[0.12em] text-[#d8d2c8]">{label}</p>
                <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Card className="border border-[#d8d2c8] bg-[#faf9f6] shadow-sm">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.7fr)] lg:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#7c6f64]">Atlas filter</p>
            <h2 className="mt-2 text-xl font-semibold text-[#1f2933]">Location readiness by project</h2>
            <p className="mt-1 text-sm text-[#5f6b76]">
              Surface only the route stops that matter for the current production plan.
            </p>
          </div>
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-[#7c6f64]" htmlFor="project-filter">
              Project
            </label>
            <select
              id="project-filter"
              aria-label="Filter by project"
              className="w-full rounded-lg border border-[#d8d2c8] bg-white px-4 py-3 text-sm font-medium text-[#1f2933] shadow-sm outline-none transition focus:border-[#1f2933] focus:ring-2 focus:ring-[#1f2933]/10"
              value={projectFilter}
              onChange={e => {
                setProjectFilter(e.target.value);
                setSelectedShot(null);
              }}
            >
              <option value="all">All projects</option>
              {projects.map(project => (
                <option key={project.id} value={project.id}>
                  {project.title}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      <Card className="border border-[#d8d2c8] bg-white shadow-sm">
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#7c6f64]">Field map</p>
            <h2 className="mt-2 text-xl font-semibold text-[#1f2933]">Micro-spot map</h2>
          </div>
          <div className="flex flex-wrap gap-2 text-xs font-medium text-[#5f6b76]">
            <span className="rounded-full bg-[#ece7df] px-3 py-1">Planned</span>
            <span className="rounded-full bg-[#d9eee6] px-3 py-1 text-[#0f766e]">Taken</span>
            <span className="rounded-full bg-[#dbeafe] px-3 py-1 text-[#1d4ed8]">Approved</span>
          </div>
        </div>

        {filteredShots.length === 0 ? (
          <div className="flex h-96 items-center justify-center rounded-lg border border-dashed border-[#d8d2c8] bg-[#faf9f6]">
            <div className="max-w-md text-center">
              <p className="font-semibold text-[#1f2933]">No mapped locations yet</p>
              <p className="mt-2 text-sm text-[#5f6b76]">
                Add precise coordinates in the Shots workspace to turn this project into a navigable route plan.
              </p>
            </div>
          </div>
        ) : (
          <div className="h-[32rem] overflow-hidden rounded-lg border border-[#d8d2c8]">
            <MapWithNoSSR shots={filteredShots} onSelectShot={setSelectedShot} />
          </div>
        )}
      </Card>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)]">
        <Card className="border border-[#d8d2c8] bg-white shadow-sm">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#7c6f64]">Selected stop</p>
              <h2 className="mt-2 text-xl font-semibold text-[#1f2933]">Micro-logistics card</h2>
            </div>
            {selectedShot && (
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusClass(selectedShot.status)}`}>
                {formatStatus(selectedShot.status)}
              </span>
            )}
          </div>

          {selectedShot ? (
            <div className="space-y-5">
              <div>
                <h3 className="text-lg font-semibold text-[#1f2933]">{selectedShot.title}</h3>
                <p className="mt-1 text-sm text-[#5f6b76]">{selectedShot.project_title || 'Unassigned project'}</p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  ['Main location', selectedShot.location || 'Not specified'],
                  ['Micro-spot', selectedShot.micro_spot_name || 'Not specified'],
                  ['Background', selectedShot.background_description || 'Not specified'],
                  ['Parking', selectedShot.parking_notes || 'Not specified'],
                  ['Walking distance', selectedShot.walking_distance || 'Not specified'],
                  ['Restroom or changing point', selectedShot.restroom_location || 'Not specified'],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-lg border border-[#ece7df] bg-[#faf9f6] p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#7c6f64]">{label}</p>
                    <p className="mt-2 text-sm leading-5 text-[#1f2933]">{value}</p>
                  </div>
                ))}
              </div>

              {selectedCoordinates && (
                <div className="rounded-lg border border-[#d8d2c8] bg-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#7c6f64]">Coordinates</p>
                  <p className="mt-2 font-mono text-sm text-[#1f2933]">{selectedCoordinates}</p>
                </div>
              )}

              <Button
                type="button"
                className="w-full bg-[#1f2933] hover:bg-[#111827]"
                onClick={() =>
                  window.open(`https://maps.google.com/?q=${selectedShot.latitude},${selectedShot.longitude}`, '_blank')
                }
              >
                Open in Google Maps
              </Button>
            </div>
          ) : (
            <div className="flex min-h-80 items-center justify-center rounded-lg border border-dashed border-[#d8d2c8] bg-[#faf9f6] p-8 text-center">
              <div>
                <p className="font-semibold text-[#1f2933]">Select a pin to inspect the stop.</p>
                <p className="mt-2 text-sm text-[#5f6b76]">
                  The card will show arrival instructions, client logistics, and exact coordinate handoff details.
                </p>
              </div>
            </div>
          )}
        </Card>

        <Card className="border border-[#d8d2c8] bg-white shadow-sm">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#7c6f64]">Pin queue</p>
              <h2 className="mt-2 text-xl font-semibold text-[#1f2933]">Needs coordinates</h2>
            </div>
            <span className="rounded-full bg-[#fff7ed] px-3 py-1 text-xs font-semibold text-[#9a3412]">
              {shotsWithoutLocation.length} open
            </span>
          </div>

          {shotsWithoutLocation.length === 0 ? (
            <div className="rounded-lg border border-[#d8d2c8] bg-[#f4f8f6] p-5">
              <p className="font-semibold text-[#1f2933]">Every visible shot has a usable pin.</p>
              <p className="mt-2 text-sm text-[#5f6b76]">This project is ready for route-level client guidance.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {shotsWithoutLocation.map(shot => (
                <div key={shot.id} className="rounded-lg border border-[#f3d2a7] bg-[#fffaf3] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-[#1f2933]">{shot.title}</p>
                      <p className="mt-1 text-xs text-[#7c6f64]">{shot.project_title || 'Unassigned project'}</p>
                    </div>
                    <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusClass(shot.status)}`}>
                      {formatStatus(shot.status)}
                    </span>
                  </div>
                  {shot.location && <p className="mt-3 text-sm text-[#5f6b76]">{shot.location}</p>}
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
