'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
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
  planned_time?: string | null;
  notes?: string;
  status: 'planned' | 'taken' | 'approved' | 'rejected';
}

interface ShotFormState {
  title: string;
  description: string;
  location: string;
  plannedTime: string;
  notes: string;
  status: ShotItem['status'];
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
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | ShotItem['status']>('all');
  const [projectFilter, setProjectFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingShot, setEditingShot] = useState<ShotItem | null>(null);
  const [editForm, setEditForm] = useState<ShotFormState>({
    title: '',
    description: '',
    location: '',
    plannedTime: '',
    notes: '',
    status: 'planned',
  });

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

  const openEditModal = (shot: ShotItem) => {
    setEditingShot(shot);
    setEditForm({
      title: shot.title,
      description: shot.description,
      location: shot.location ?? '',
      plannedTime: shot.planned_time?.slice(0, 16) ?? '',
      notes: shot.notes ?? '',
      status: shot.status,
    });
  };

  const saveShot = async () => {
    if (!editingShot) return;

    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/shots/${editingShot.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
        body: JSON.stringify({
          title: editForm.title,
          description: editForm.description,
          location: editForm.location,
          plannedTime: editForm.plannedTime || null,
          notes: editForm.notes,
          status: editForm.status,
        }),
      });

      const result = await response.json();
      if (!result.success) {
        setError(result.error ?? 'Failed to update shot');
        return;
      }

      setEditingShot(null);
      await loadShots();
    } catch {
      setError('Failed to update shot');
    } finally {
      setIsSaving(false);
    }
  };

  const filteredShots = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return shots.filter(shot => {
      const matchesSearch =
        !query ||
        shot.title.toLowerCase().includes(query) ||
        shot.description.toLowerCase().includes(query) ||
        (shot.location ?? '').toLowerCase().includes(query) ||
        (shot.project_title ?? '').toLowerCase().includes(query);

      const matchesStatus = statusFilter === 'all' || shot.status === statusFilter;
      const matchesProject = projectFilter === 'all' || shot.project_id === projectFilter;

      return matchesSearch && matchesStatus && matchesProject;
    });
  }, [projectFilter, searchQuery, shots, statusFilter]);

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

        <div className="mb-4 grid gap-3 md:grid-cols-3">
          <input
            value={searchQuery}
            onChange={event => setSearchQuery(event.target.value)}
            className="w-full rounded-lg border border-gray-300 px-4 py-2"
            placeholder="Search shots by title, description, project, or location"
            aria-label="Search shots"
          />
          <select
            aria-label="Filter shots by project"
            value={projectFilter}
            onChange={event => setProjectFilter(event.target.value)}
            className="w-full rounded-lg border border-gray-300 px-4 py-2"
          >
            <option value="all">All projects</option>
            {projects.map(project => (
              <option key={project.id} value={project.id}>
                {project.title}
              </option>
            ))}
          </select>
          <select
            aria-label="Filter shots by status"
            value={statusFilter}
            onChange={event => setStatusFilter(event.target.value as 'all' | ShotItem['status'])}
            className="w-full rounded-lg border border-gray-300 px-4 py-2"
          >
            <option value="all">All statuses</option>
            <option value="planned">Planned</option>
            <option value="taken">Taken</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
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
        ) : filteredShots.length === 0 ? (
          <p className="text-gray-600">No shots match your search and filters.</p>
        ) : (
          <div className="space-y-3">
            {filteredShots.map(shot => (
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
                  <div className="flex gap-2">
                    <Button variant="secondary" size="sm" onClick={() => openEditModal(shot)}>
                      Edit
                    </Button>
                    <Button variant="danger" size="sm" onClick={() => void deleteShot(shot.id)}>
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Modal
        isOpen={Boolean(editingShot)}
        onClose={() => setEditingShot(null)}
        title="Edit Shot"
        actions={
          <>
            <Button variant="ghost" onClick={() => setEditingShot(null)}>
              Cancel
            </Button>
            <Button isLoading={isSaving} onClick={() => void saveShot()}>
              Save Changes
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <input
            value={editForm.title}
            onChange={event => setEditForm(prev => ({ ...prev, title: event.target.value }))}
            className="w-full rounded-lg border border-gray-300 px-4 py-2"
            placeholder="Shot title"
          />
          <textarea
            value={editForm.description}
            onChange={event => setEditForm(prev => ({ ...prev, description: event.target.value }))}
            className="min-h-24 w-full rounded-lg border border-gray-300 px-4 py-2"
            placeholder="Shot description"
          />
          <input
            value={editForm.location}
            onChange={event => setEditForm(prev => ({ ...prev, location: event.target.value }))}
            className="w-full rounded-lg border border-gray-300 px-4 py-2"
            placeholder="Location"
          />
          <input
            type="datetime-local"
            aria-label="Planned shoot time"
            value={editForm.plannedTime}
            onChange={event => setEditForm(prev => ({ ...prev, plannedTime: event.target.value }))}
            className="w-full rounded-lg border border-gray-300 px-4 py-2"
          />
          <textarea
            value={editForm.notes}
            onChange={event => setEditForm(prev => ({ ...prev, notes: event.target.value }))}
            className="min-h-24 w-full rounded-lg border border-gray-300 px-4 py-2"
            placeholder="Shot notes"
          />
          <select
            aria-label="Shot status"
            value={editForm.status}
            onChange={event =>
              setEditForm(prev => ({ ...prev, status: event.target.value as ShotItem['status'] }))
            }
            className="w-full rounded-lg border border-gray-300 px-4 py-2"
          >
            <option value="planned">Planned</option>
            <option value="taken">Taken</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </Modal>
    </div>
  );
}
