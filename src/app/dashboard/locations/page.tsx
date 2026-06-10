'use client';

import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { tokenUtils } from '@/lib/auth';

const MapWithNoSSR = dynamic(() => import('@/components/map/LocationMap'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-96 bg-gray-100 rounded-lg">
      <p className="text-gray-600">Loading map...</p>
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
  latitude?: number | null;
  longitude?: number | null;
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
    const fetchData = async () => {
      await loadData();
    };
    void fetchData();
  }, []);

  const filteredShots = useMemo(() => {
    return shots.filter(shot => {
      const matchesProject = projectFilter === 'all' || shot.project_id === projectFilter;
      const hasCoordinates = shot.latitude !== null && shot.longitude !== null;
      return matchesProject && hasCoordinates;
    });
  }, [shots, projectFilter]);

  const shotsWithoutLocation = useMemo(() => {
    return shots.filter(shot => {
      const matchesProject = projectFilter === 'all' || shot.project_id === projectFilter;
      const noCoordinates = shot.latitude === null || shot.longitude === null;
      return matchesProject && noCoordinates;
    });
  }, [shots, projectFilter]);

  const stats = useMemo(() => {
    const allProjectShots = projectFilter === 'all' 
      ? shots 
      : shots.filter(s => s.project_id === projectFilter);
    
    return {
      total: allProjectShots.length,
      mapped: filteredShots.length,
      unmapped: shotsWithoutLocation.length,
    };
  }, [shots, projectFilter, filteredShots, shotsWithoutLocation]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600"></div>
              <p className="mt-4 text-gray-600">Loading locations...</p>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters & Stats */}
      <Card>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Project</label>
            <select
              aria-label="Filter by project"
              className="w-full rounded-lg border border-gray-300 px-4 py-2"
              value={projectFilter}
              onChange={e => setProjectFilter(e.target.value)}
            >
              <option value="all">All Projects</option>
              {projects.map(project => (
                <option key={project.id} value={project.id}>
                  {project.title}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <div className="text-lg font-bold text-blue-600">{stats.total}</div>
              <div className="text-xs text-gray-600">Total Shots</div>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <div className="text-lg font-bold text-green-600">{stats.mapped}</div>
              <div className="text-xs text-gray-600">Mapped</div>
            </div>
            <div className="text-center p-3 bg-amber-50 rounded-lg">
              <div className="text-lg font-bold text-amber-600">{stats.unmapped}</div>
              <div className="text-xs text-gray-600">Unmapped</div>
            </div>
          </div>
        </div>
      </Card>

      {/* Map Section */}
      <Card>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Location Map</h3>
        {filteredShots.length === 0 ? (
          <div className="flex items-center justify-center h-96 bg-gray-50 rounded-lg">
            <div className="text-center">
              <p className="text-gray-600 font-medium mb-2">No mapped locations yet</p>
              <p className="text-sm text-gray-500">
                Add coordinates to your shots in the Shots dashboard to see them on the map
              </p>
            </div>
          </div>
        ) : (
            <div className="map-container">
            <MapWithNoSSR shots={filteredShots} onSelectShot={setSelectedShot} />
          </div>
        )}
      </Card>

      {/* Details Section */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Shot Details */}
        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Shot Details</h3>

          {selectedShot ? (
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold text-gray-900">{selectedShot.title}</h4>
                <p className="text-sm text-gray-600 mt-1">{selectedShot.project_title}</p>
              </div>

              <div>
                <p className="text-xs font-medium text-gray-700 mb-1">Main Location</p>
                <p className="text-sm text-gray-900">{selectedShot.location || 'Not specified'}</p>
              </div>

              {selectedShot.micro_spot_name && (
                <div>
                  <p className="text-xs font-medium text-gray-700 mb-1">🎯 Micro-Spot</p>
                  <p className="text-sm text-gray-900">{selectedShot.micro_spot_name}</p>
                </div>
              )}

              {selectedShot.background_description && (
                <div>
                  <p className="text-xs font-medium text-gray-700 mb-1">📸 Background</p>
                  <p className="text-sm text-gray-900">{selectedShot.background_description}</p>
                </div>
              )}

              {selectedShot.parking_notes && (
                <div>
                  <p className="text-xs font-medium text-gray-700 mb-1">🚗 Parking</p>
                  <p className="text-sm text-gray-900">{selectedShot.parking_notes}</p>
                </div>
              )}

              {selectedShot.walking_distance && (
                <div>
                  <p className="text-xs font-medium text-gray-700 mb-1">🚶 Walking Distance</p>
                  <p className="text-sm text-gray-900">{selectedShot.walking_distance}</p>
                </div>
              )}

              {selectedShot.restroom_location && (
                <div>
                  <p className="text-xs font-medium text-gray-700 mb-1">🚻 Restroom</p>
                  <p className="text-sm text-gray-900">{selectedShot.restroom_location}</p>
                </div>
              )}

              {selectedShot.latitude && selectedShot.longitude && (
                <div className="pt-3 border-t">
                  <p className="text-xs font-medium text-gray-700 mb-1">Coordinates</p>
                  <p className="text-xs text-gray-600">
                    {selectedShot.latitude.toFixed(6)}, {selectedShot.longitude.toFixed(6)}
                  </p>
                </div>
              )}

              <Button
                type="button"
                className="w-full"
                onClick={() => window.open(
                  `https://maps.google.com/?q=${selectedShot.latitude},${selectedShot.longitude}`,
                  '_blank'
                )}
              >
                Open in Google Maps
              </Button>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">Click a pin on the map to view details</p>
            </div>
          )}
        </Card>

        {/* Unmapped Shots */}
        {shotsWithoutLocation.length > 0 && (
          <Card>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Unmapped Shots ({shotsWithoutLocation.length})</h3>
            <div className="space-y-2">
              {shotsWithoutLocation.map(shot => (
                <div
                  key={shot.id}
                  className="text-sm p-3 bg-amber-50 border border-amber-200 rounded text-amber-900 hover:bg-amber-100 cursor-pointer transition-colors"
                >
                  <p className="font-medium">{shot.title}</p>
                  <p className="text-xs text-amber-700 mt-1">{shot.project_title}</p>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-4 pt-4 border-t">
              💡 Add coordinates in Shots dashboard to map these locations
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}
