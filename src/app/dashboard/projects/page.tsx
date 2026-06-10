'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { tokenUtils } from '@/lib/auth';

interface ProjectItem {
  id: string;
  title: string;
  description: string;
  status: 'draft' | 'planning' | 'in-progress' | 'completed' | 'archived';
  created_at: string;
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
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);

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
                  <Button variant="danger" size="sm" onClick={() => void deleteProject(project.id)}>
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
