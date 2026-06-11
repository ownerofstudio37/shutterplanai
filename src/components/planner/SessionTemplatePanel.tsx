'use client';

import { useCallback, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { tokenUtils } from '@/lib/auth';

export type SessionTemplatePayload = {
  shootType?: string;
  locationMode?: 'find-locations' | 'use-provided';
  city?: string;
  duration?: string;
  mood?: string;
  subjectDetails?: string;
  mustHaveShots?: string;
  constraints?: string;
  providedLocations?: string;
  familyPacing?: string;
  engagementStory?: string;
  brandingGoals?: string;
  eventPriorities?: string;
  shootDate?: string;
  // V2: multi-day fields
  multiDay?: boolean;
  sessionDates?: string[];
  dailyDurationMinutes?: number;
  maxTravelMinutesPerDay?: number;
};

export type SessionTemplate = {
  id: string;
  name: string;
  template_payload: SessionTemplatePayload;
  created_at: string;
  updated_at: string;
};

type SessionTemplatePanelProps = {
  /** Current intake state — used when saving the active intake as a new template. */
  currentPayload: SessionTemplatePayload;
  /** Called when user loads a template into the planner. */
  onLoadTemplate: (payload: SessionTemplatePayload) => void;
};

function getAuthHeader(): Record<string, string> {
  const token = tokenUtils.getToken();
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

export function SessionTemplatePanel({ currentPayload, onLoadTemplate }: SessionTemplatePanelProps) {
  const [templates, setTemplates] = useState<SessionTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const loadTemplates = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/planner/templates', {
        headers: getAuthHeader(),
      });
      const body = (await response.json()) as { success: boolean; data?: SessionTemplate[]; error?: string };
      if (!body.success) {
        setError(body.error ?? 'Failed to load templates');
        return;
      }
      setTemplates(body.data ?? []);
    } catch {
      setError('Failed to load templates');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleToggle = useCallback(() => {
    setIsOpen(prev => {
      if (!prev) void loadTemplates();
      return !prev;
    });
  }, [loadTemplates]);

  const saveTemplate = useCallback(async () => {
    const trimmedName = newName.trim();
    if (!trimmedName) {
      setSaveError('Enter a name for this template');
      return;
    }
    setSaveError(null);
    setIsSaving(true);
    try {
      const response = await fetch('/api/planner/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({ name: trimmedName, templatePayload: currentPayload }),
      });
      const body = (await response.json()) as { success: boolean; data?: SessionTemplate; error?: string };
      if (!body.success) {
        setSaveError(body.error ?? 'Failed to save template');
        return;
      }
      if (body.data) {
        setTemplates(prev => [body.data!, ...prev]);
      }
      setNewName('');
    } catch {
      setSaveError('Failed to save template');
    } finally {
      setIsSaving(false);
    }
  }, [newName, currentPayload]);

  const handleLoad = useCallback(
    (template: SessionTemplate) => {
      onLoadTemplate(template.template_payload);
      setIsOpen(false);
    },
    [onLoadTemplate]
  );

  const deleteTemplate = useCallback(async (id: string) => {
    setDeletingId(id);
    try {
      const response = await fetch(`/api/planner/templates/${id}`, {
        method: 'DELETE',
        headers: getAuthHeader(),
      });
      const body = (await response.json()) as { success: boolean; error?: string };
      if (body.success) {
        setTemplates(prev => prev.filter(t => t.id !== id));
      } else {
        setError(body.error ?? 'Failed to delete template');
      }
    } catch {
      setError('Failed to delete template');
    } finally {
      setDeletingId(null);
    }
  }, []);

  return (
    <div className="mb-4">
      <button
        type="button"
        onClick={handleToggle}
        className="flex w-full items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-left text-sm font-semibold text-emerald-900 hover:bg-emerald-100 transition"
      >
        <span>📁 My Session Templates</span>
        <span className="text-emerald-700 text-xs font-normal">{isOpen ? 'Hide ▲' : 'Show ▼'}</span>
      </button>

      {isOpen && (
        <div className="mt-2 rounded-xl border border-emerald-200 bg-white p-4 shadow-sm">

          {/* Save current intake as template */}
          <div className="mb-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
              Save current intake as template
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="Template name (e.g. Golden Hour Family)"
                maxLength={120}
                className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none"
                onKeyDown={e => {
                  if (e.key === 'Enter') void saveTemplate();
                }}
              />
              <Button
                variant="secondary"
                isLoading={isSaving}
                onClick={() => void saveTemplate()}
                disabled={isSaving || !newName.trim()}
              >
                Save
              </Button>
            </div>
            {saveError && <p className="mt-1 text-xs text-red-600">{saveError}</p>}
          </div>

          {/* Template list */}
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Load a saved template</p>

          {isLoading && (
            <p className="text-sm text-gray-500 animate-pulse">Loading templates…</p>
          )}

          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}

          {!isLoading && !error && templates.length === 0 && (
            <p className="text-sm text-gray-500">No saved templates yet. Save your first one above.</p>
          )}

          {!isLoading && templates.length > 0 && (
            <div className="grid gap-2 md:grid-cols-2">
              {templates.map(template => (
                <div key={template.id} className="relative group">
                  <button
                    type="button"
                    onClick={() => handleLoad(template)}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-left hover:border-emerald-300 hover:bg-emerald-50 transition"
                  >
                    <p className="text-sm font-semibold text-gray-900 pr-6">{template.name}</p>
                    <div className="mt-1 flex flex-wrap gap-1 text-[11px]">
                      {template.template_payload.shootType && (
                        <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-indigo-700">
                          {template.template_payload.shootType}
                        </span>
                      )}
                      {template.template_payload.duration && (
                        <span className="rounded-full bg-gray-200 px-2 py-0.5 text-gray-700">
                          {template.template_payload.duration}
                        </span>
                      )}
                      {template.template_payload.city && (
                        <span className="rounded-full bg-gray-200 px-2 py-0.5 text-gray-700">
                          {template.template_payload.city}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-[11px] text-gray-400">
                      Saved {new Date(template.updated_at).toLocaleDateString()}
                    </p>
                  </button>
                  {/* Delete button */}
                  <button
                    type="button"
                    disabled={deletingId === template.id}
                    onClick={e => {
                      e.stopPropagation();
                      void deleteTemplate(template.id);
                    }}
                    aria-label={`Delete template ${template.name}`}
                    className="absolute top-2 right-2 flex h-6 w-6 items-center justify-center rounded-full text-gray-400 opacity-0 transition hover:bg-red-100 hover:text-red-600 group-hover:opacity-100 disabled:opacity-50"
                  >
                    {deletingId === template.id ? '…' : '×'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
