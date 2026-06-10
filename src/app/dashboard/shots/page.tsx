'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { tokenUtils } from '@/lib/auth';

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

export default function ShotsPage() {
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [shots, setShots] = useState<ShotItem[]>([]);
  const [projectId, setProjectId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadProjects = async () => {
    const response = await fetch('/api/projects', {
      headers: getAuthHeader(),
    });

    const result = await response.json();
    if (result.success) {
      const options: ProjectOption[] = result.data ?? [];
      setProjects(options);
      if (!projectId && options.length > 0) {
        setProjectId(options[0].id);
      }
    }
  };

  const loadShots = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/shots', {
        headers: getAuthHeader(),
      });
      const result = await response.json();
      if (!result.success) {
        setError(result.error ?? 'Failed to load shots');
        setShots([]);
      } else {
        setShots(result.data ?? []);
      }
    } catch {
      setError('Failed to load shots');
      setShots([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void (async () => {
      await loadProjects();
      await loadShots();
    })();
  }, []);

  const createShot = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!projectId || !title.trim()) {
      setError('Select a project and provide a shot title');
      return;
    }

    setIsCreating(true);
    setError(null);
    try {
      const response = await fetch('/api/shots', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
        body: JSON.stringify({
          projectId,
          title,
          description,
          location,
          status: 'planned',
        }),
      });

      const result = await response.json();
      if (!result.success) {
        setError(result.error ?? 'Failed to create shot');
        return;
      }

      setTitle('');
      setDescription('');
      setLocation('');
      await loadShots();
    } catch {
      setError('Failed to create shot');
    } finally {
      setIsCreating(false);
    }
  };

  const deleteShot = async (shotId: string) => {
    setError(null);
    try {
      const response = await fetch(`/api/shots/${shotId}`, {
        method: 'DELETE',
        headers: getAuthHeader(),
      });

      const result = await response.json();
      if (!result.success) {
        setError(result.error ?? 'Failed to delete shot');
        return;
      }

      await loadShots();
    } catch {
      setError('Failed to delete shot');
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <h3 className="mb-4 text-lg font-semibold text-gray-900">Add Shot</h3>
        <form onSubmit={createShot} className="space-y-3">
          <select
            aria-label="Select project"
            className="w-full rounded-lg border border-gray-300 px-4 py-2"
            value={projectId}
            onChange={event => setProjectId(event.target.value)}
            disabled={isCreating || projects.length === 0}
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

          <input
            className="w-full rounded-lg border border-gray-300 px-4 py-2"
            value={title}
            onChange={event => setTitle(event.target.value)}
            placeholder="Shot title"
            disabled={isCreating}
          />
          <textarea
            className="min-h-24 w-full rounded-lg border border-gray-300 px-4 py-2"
            value={description}
            onChange={event => setDescription(event.target.value)}
            placeholder="Shot description"
            disabled={isCreating}
          />
          <input
            className="w-full rounded-lg border border-gray-300 px-4 py-2"
            value={location}
            onChange={event => setLocation(event.target.value)}
            placeholder="Location (optional)"
            disabled={isCreating}
          />
          <Button type="submit" isLoading={isCreating} disabled={projects.length === 0}>
            {isCreating ? 'Adding...' : 'Add Shot'}
          </Button>
        </form>
      </Card>

      <Card>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Planned Shots</h3>
          <Button variant="ghost" onClick={() => void loadShots()}>
            Refresh
          </Button>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {isLoading ? (
          <p className="text-gray-600">Loading shots...</p>
        ) : shots.length === 0 ? (
          <p className="text-gray-600">No shots planned yet.</p>
        ) : (
          <div className="space-y-3">
            {shots.map(shot => (
              <div key={shot.id} className="rounded-lg border border-gray-200 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h4 className="font-semibold text-gray-900">{shot.title}</h4>
                    <p className="mt-1 text-sm text-gray-600">{shot.description || 'No description'}</p>
                    <p className="mt-2 text-xs text-gray-500">
                      Project: {shot.project_title ?? 'Unknown'} · Status: {shot.status}
                      {shot.location ? ` · ${shot.location}` : ''}
                    </p>
                  </div>
                  <Button variant="danger" size="sm" onClick={() => void deleteShot(shot.id)}>
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
