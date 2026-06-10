'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { tokenUtils } from '@/lib/auth';

interface ProjectItem {
  id: string;
  title: string;
  description: string;
  status: 'draft' | 'planning' | 'in-progress' | 'completed' | 'archived';
  start_date?: string;
  end_date?: string | null;
  tags?: string[];
  created_at: string;
}

interface ProjectFormState {
  title: string;
  description: string;
  status: ProjectItem['status'];
  startDate: string;
  endDate: string;
  tags: string;
}

function getAuthHeader() {
  const token = tokenUtils.getToken();
  const headers: Record<string, string> = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [editingProject, setEditingProject] = useState<ProjectItem | null>(null);
  const [editForm, setEditForm] = useState<ProjectFormState>({
    title: '',
    description: '',
    status: 'draft',
    startDate: '',
    endDate: '',
    tags: '',
  });

  const loadProjects = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/projects', {
        headers: getAuthHeader(),
      });
      const result = await response.json();

      if (!result.success) {
        setError(result.error ?? 'Failed to load projects');
        setProjects([]);
      } else {
        setProjects(result.data ?? []);
      }
    } catch {
      setError('Failed to load projects');
      setProjects([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadProjects();
  }, []);

  const createProject = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!title.trim()) {
      setError('Project title is required');
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
        body: JSON.stringify({
          title,
          description,
          status: 'draft',
        }),
      });

      const result = await response.json();

      if (!result.success) {
        setError(result.error ?? 'Failed to create project');
        return;
      }

      setTitle('');
      setDescription('');
      await loadProjects();
    } catch {
      setError('Failed to create project');
    } finally {
      setIsCreating(false);
    }
  };

  const deleteProject = async (projectId: string) => {
    setError(null);

    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'DELETE',
        headers: getAuthHeader(),
      });

      const result = await response.json();
      if (!result.success) {
        setError(result.error ?? 'Failed to delete project');
        return;
      }

      await loadProjects();
    } catch {
      setError('Failed to delete project');
    }
  };

  const openEditModal = (project: ProjectItem) => {
    setEditingProject(project);
    setEditForm({
      title: project.title,
      description: project.description,
      status: project.status,
      startDate: project.start_date?.slice(0, 10) ?? '',
      endDate: project.end_date?.slice(0, 10) ?? '',
      tags: (project.tags ?? []).join(', '),
    });
  };

  const saveProject = async () => {
    if (!editingProject) return;

    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/projects/${editingProject.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
        body: JSON.stringify({
          title: editForm.title,
          description: editForm.description,
          status: editForm.status,
          startDate: editForm.startDate,
          endDate: editForm.endDate || null,
          tags: editForm.tags
            .split(',')
            .map(tag => tag.trim())
            .filter(Boolean),
        }),
      });

      const result = await response.json();
      if (!result.success) {
        setError(result.error ?? 'Failed to update project');
        return;
      }

      setEditingProject(null);
      await loadProjects();
    } catch {
      setError('Failed to update project');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <h3 className="mb-4 text-lg font-semibold text-gray-900">Create Project</h3>
        <form onSubmit={createProject} className="space-y-3">
          <input
            value={title}
            onChange={event => setTitle(event.target.value)}
            placeholder="Project title"
            className="w-full rounded-lg border border-gray-300 px-4 py-2"
            disabled={isCreating}
          />
          <textarea
            value={description}
            onChange={event => setDescription(event.target.value)}
            placeholder="Project description"
            className="min-h-24 w-full rounded-lg border border-gray-300 px-4 py-2"
            disabled={isCreating}
          />
          <Button type="submit" isLoading={isCreating}>
            {isCreating ? 'Creating...' : 'Create Project'}
          </Button>
        </form>
      </Card>

      <Card>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Your Projects</h3>
          <Button variant="ghost" onClick={() => void loadProjects()}>
            Refresh
          </Button>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {isLoading ? (
          <p className="text-gray-600">Loading projects...</p>
        ) : projects.length === 0 ? (
          <p className="text-gray-600">No projects yet. Create your first one above.</p>
        ) : (
          <div className="space-y-3">
            {projects.map(project => (
              <div key={project.id} className="rounded-lg border border-gray-200 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h4 className="font-semibold text-gray-900">{project.title}</h4>
                    <p className="mt-1 text-sm text-gray-600">{project.description || 'No description'}</p>
                    <p className="mt-2 text-xs uppercase tracking-wide text-gray-500">Status: {project.status}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="secondary" size="sm" onClick={() => openEditModal(project)}>
                      Edit
                    </Button>
                    <Button variant="danger" size="sm" onClick={() => void deleteProject(project.id)}>
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
        isOpen={Boolean(editingProject)}
        onClose={() => setEditingProject(null)}
        title="Edit Project"
        actions={
          <>
            <Button variant="ghost" onClick={() => setEditingProject(null)}>
              Cancel
            </Button>
            <Button isLoading={isSaving} onClick={() => void saveProject()}>
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
            placeholder="Project title"
          />
          <textarea
            value={editForm.description}
            onChange={event => setEditForm(prev => ({ ...prev, description: event.target.value }))}
            className="min-h-24 w-full rounded-lg border border-gray-300 px-4 py-2"
            placeholder="Project description"
          />
          <select
            aria-label="Project status"
            value={editForm.status}
            onChange={event =>
              setEditForm(prev => ({ ...prev, status: event.target.value as ProjectItem['status'] }))
            }
            className="w-full rounded-lg border border-gray-300 px-4 py-2"
          >
            <option value="draft">Draft</option>
            <option value="planning">Planning</option>
            <option value="in-progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="archived">Archived</option>
          </select>
          <input
            type="date"
            aria-label="Project start date"
            value={editForm.startDate}
            onChange={event => setEditForm(prev => ({ ...prev, startDate: event.target.value }))}
            className="w-full rounded-lg border border-gray-300 px-4 py-2"
          />
          <input
            type="date"
            aria-label="Project end date"
            value={editForm.endDate}
            onChange={event => setEditForm(prev => ({ ...prev, endDate: event.target.value }))}
            className="w-full rounded-lg border border-gray-300 px-4 py-2"
          />
          <input
            value={editForm.tags}
            onChange={event => setEditForm(prev => ({ ...prev, tags: event.target.value }))}
            className="w-full rounded-lg border border-gray-300 px-4 py-2"
            placeholder="Tags, comma separated"
          />
        </div>
      </Modal>
    </div>
  );
}
