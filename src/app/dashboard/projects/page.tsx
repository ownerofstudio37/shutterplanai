'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
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

function getStatusClass(status: ProjectItem['status']) {
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

function formatDate(value?: string | null) {
  if (!value) return 'Not scheduled';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not scheduled';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | ProjectItem['status']>('all');
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
    queueMicrotask(() => {
      void loadProjects();
    });
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

  const filteredProjects = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return projects.filter(project => {
      const matchesSearch =
        !query ||
        project.title.toLowerCase().includes(query) ||
        project.description.toLowerCase().includes(query) ||
        (project.tags ?? []).some(tag => tag.toLowerCase().includes(query));

      const matchesStatus = statusFilter === 'all' || project.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [projects, searchQuery, statusFilter]);

  const statusCounts = useMemo(() => {
    return {
      active: projects.filter(project => project.status === 'planning' || project.status === 'in-progress').length,
      draft: projects.filter(project => project.status === 'draft').length,
      completed: projects.filter(project => project.status === 'completed').length,
      archived: projects.filter(project => project.status === 'archived').length,
    };
  }, [projects]);

  return (
    <div className="space-y-5">
      <section className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-lg border border-[#d8d2c8] bg-[#1f2933] p-5 text-white shadow-sm md:p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#c6b9a5]">Project pipeline</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-normal">Client work, from brief to delivery.</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#d1d5db]">
            Keep shoots organized by production stage, then move the best plans into shot boards and client guides.
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-4">
            {[
              ['Active', statusCounts.active],
              ['Draft', statusCounts.draft],
              ['Completed', statusCounts.completed],
              ['Archived', statusCounts.archived],
            ].map(([label, value]) => (
              <div key={label} className="rounded-lg border border-white/10 bg-white/10 px-3 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#c6b9a5]">{label}</p>
                <p className="mt-1 text-2xl font-semibold">{isLoading ? '-' : value}</p>
              </div>
            ))}
          </div>
        </div>

        <Card className="border border-[#d8d2c8] shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#7c6f64]">Quick create</p>
          <h2 className="mt-2 text-xl font-semibold text-[#1f2933]">Start a client project</h2>
          <form onSubmit={createProject} className="mt-4 space-y-3">
            <input
              value={title}
              onChange={event => setTitle(event.target.value)}
              placeholder="Project title"
              className="w-full rounded-lg border border-[#d8d2c8] bg-[#faf9f6] min-h-11 px-4 py-2.5 text-sm outline-none focus:border-[#1f2933]"
              disabled={isCreating}
            />
            <textarea
              value={description}
              onChange={event => setDescription(event.target.value)}
              placeholder="Client, shoot type, goal, deliverables..."
              className="min-h-24 w-full rounded-lg border border-[#d8d2c8] bg-[#faf9f6] min-h-11 px-4 py-2.5 text-sm outline-none focus:border-[#1f2933]"
              disabled={isCreating}
            />
            <Button type="submit" isLoading={isCreating} className="bg-[#1f2933] hover:bg-[#111827]">
              {isCreating ? 'Creating...' : 'Create project'}
            </Button>
          </form>
        </Card>
      </section>

      <Card className="border border-[#d8d2c8] shadow-sm">
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#7c6f64]">Workspace</p>
            <h3 className="mt-2 text-xl font-semibold text-[#1f2933]">Production projects</h3>
          </div>
          <Button variant="ghost" onClick={() => void loadProjects()}>
            Refresh
          </Button>
        </div>

        <div className="mb-4 grid gap-3 md:grid-cols-[1fr_220px]">
          <input
            value={searchQuery}
            onChange={event => setSearchQuery(event.target.value)}
            className="w-full rounded-lg border border-[#d8d2c8] bg-[#faf9f6] min-h-11 px-4 py-2.5 text-sm outline-none focus:border-[#1f2933]"
            placeholder="Search title, description, or tag"
            aria-label="Search projects"
          />
          <select
            aria-label="Filter projects by status"
            value={statusFilter}
            onChange={event => setStatusFilter(event.target.value as 'all' | ProjectItem['status'])}
            className="w-full rounded-lg border border-[#d8d2c8] bg-[#faf9f6] min-h-11 px-4 py-2.5 text-sm outline-none focus:border-[#1f2933]"
          >
            <option value="all">All statuses</option>
            <option value="draft">Draft</option>
            <option value="planning">Planning</option>
            <option value="in-progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="archived">Archived</option>
          </select>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {isLoading ? (
          <p className="text-[#5f6b76]">Loading projects...</p>
        ) : projects.length === 0 ? (
          <p className="rounded-lg border border-dashed border-[#d8d2c8] bg-[#faf9f6] p-4 text-sm text-[#5f6b76]">No projects yet. Create your first one above.</p>
        ) : filteredProjects.length === 0 ? (
          <p className="rounded-lg border border-dashed border-[#d8d2c8] bg-[#faf9f6] p-4 text-sm text-[#5f6b76]">No projects match your search and filters.</p>
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {filteredProjects.map(project => (
              <article key={project.id} className="rounded-lg border border-[#d8d2c8] bg-white p-4">
                <div className="flex flex-col gap-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h4 className="truncate font-semibold text-[#1f2933]">{project.title}</h4>
                      <p className="mt-2 line-clamp-3 text-sm leading-6 text-[#5f6b76]">{project.description || 'No description'}</p>
                    </div>
                    <span className={`shrink-0 rounded-md border px-2 py-1 text-xs font-medium ${getStatusClass(project.status)}`}>
                      {project.status}
                    </span>
                  </div>

                  <div className="grid gap-2 text-xs text-[#5f6b76] sm:grid-cols-2">
                    <p className="rounded-md bg-[#f6f3ee] px-3 py-2"><span className="font-semibold text-[#1f2933]">Start:</span> {formatDate(project.start_date)}</p>
                    <p className="rounded-md bg-[#f6f3ee] px-3 py-2"><span className="font-semibold text-[#1f2933]">End:</span> {formatDate(project.end_date)}</p>
                  </div>

                  {project.tags && project.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {project.tags.map(tag => (
                        <span key={`${project.id}-${tag}`} className="rounded-md bg-[#f6f3ee] px-2 py-1 text-xs text-[#5f6b76]">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2 border-t border-[#e4ded5] pt-3">
                    <Link href={`/dashboard/shot-board?project=${project.id}`}>
                      <Button variant="ghost" size="sm">Export</Button>
                    </Link>
                    <Button variant="secondary" size="sm" onClick={() => openEditModal(project)}>
                      Edit
                    </Button>
                    <Button variant="danger" size="sm" onClick={() => void deleteProject(project.id)}>
                      Delete
                    </Button>
                  </div>
                </div>
              </article>
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
            className="w-full rounded-lg border border-gray-300 min-h-11 px-4 py-2.5"
            placeholder="Project title"
          />
          <textarea
            value={editForm.description}
            onChange={event => setEditForm(prev => ({ ...prev, description: event.target.value }))}
            className="min-h-24 w-full rounded-lg border border-gray-300 min-h-11 px-4 py-2.5"
            placeholder="Project description"
          />
          <select
            aria-label="Project status"
            value={editForm.status}
            onChange={event =>
              setEditForm(prev => ({ ...prev, status: event.target.value as ProjectItem['status'] }))
            }
            className="w-full rounded-lg border border-gray-300 min-h-11 px-4 py-2.5"
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
            className="w-full rounded-lg border border-gray-300 min-h-11 px-4 py-2.5"
          />
          <input
            type="date"
            aria-label="Project end date"
            value={editForm.endDate}
            onChange={event => setEditForm(prev => ({ ...prev, endDate: event.target.value }))}
            className="w-full rounded-lg border border-gray-300 min-h-11 px-4 py-2.5"
          />
          <input
            value={editForm.tags}
            onChange={event => setEditForm(prev => ({ ...prev, tags: event.target.value }))}
            className="w-full rounded-lg border border-gray-300 min-h-11 px-4 py-2.5"
            placeholder="Tags, comma separated"
          />
        </div>
      </Modal>
    </div>
  );
}
