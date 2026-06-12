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

const GUIDE_TEMPLATE_STARTERS: Array<{
  id: string;
  name: string;
  sessionType: string;
  description: string;
  payload: SessionTemplatePayload;
}> = [
  {
    id: 'family-client-ready',
    name: 'Family Client Guide',
    sessionType: 'Family Session',
    description: 'Fast pacing, outfit prep, stroller logistics, and kid reset windows.',
    payload: {
      shootType: 'Family Session',
      locationMode: 'find-locations',
      duration: '60 minutes',
      mood: 'Warm + candid',
      subjectDetails: 'Family with young kids, needs a relaxed flow and simple transitions',
      mustHaveShots: 'Whole family portrait, siblings, each child solo, parents together, playful candids',
      constraints: 'Prioritize stroller-friendly routes, restroom access, snack breaks, and short walking distances',
      familyPacing: 'Keep poses short, rotate kids often, and leave a reset window midway through the session',
    },
  },
  {
    id: 'engagement-golden-guide',
    name: 'Engagement Client Guide',
    sessionType: 'Engagement Session',
    description: 'Golden-hour timing, outfit flow, map handoff, and romantic shot sequencing.',
    payload: {
      shootType: 'Engagement Session',
      locationMode: 'find-locations',
      duration: '90 minutes',
      mood: 'Romantic + cinematic',
      subjectDetails: 'Engaged couple wants candid connection with a polished editorial finish',
      mustHaveShots: 'Walking candids, ring detail, wide scenic portraits, close connection shots, final sunset portraits',
      constraints: 'Minimize crowd risk, sequence locations for golden hour, and leave time for one outfit change',
      engagementStory: 'Build the flow around natural movement, emotional prompts, and sunset portraits',
    },
  },
  {
    id: 'branding-content-guide',
    name: 'Branding Client Guide',
    sessionType: 'Branding Session',
    description: 'Website crops, wardrobe variety, prop reminders, and content batch coverage.',
    payload: {
      shootType: 'Branding Session',
      locationMode: 'find-locations',
      duration: '75 minutes',
      mood: 'Polished + approachable',
      subjectDetails: 'Solo business owner needs website, social, and profile images',
      mustHaveShots: 'Website hero, horizontal banner, profile portrait, working/action shots, detail images',
      constraints: 'Need clean backgrounds, modern texture, quick transitions, and wardrobe variety',
      brandingGoals: 'Website hero images, about page portraits, speaking profile photos, and social content batch',
    },
  },
  {
    id: 'event-run-of-show-guide',
    name: 'Event Client Guide',
    sessionType: 'Event Session',
    description: 'Run-of-show coverage, sponsor visibility, venue access, and vendor coordination.',
    payload: {
      shootType: 'Event Session',
      locationMode: 'use-provided',
      duration: '120 minutes',
      mood: 'Documentary + professional',
      subjectDetails: 'Business event with speakers, audience reactions, details, and networking',
      mustHaveShots: 'Speaker on stage, audience reactions, sponsor signage, venue details, candid networking',
      constraints: 'Confirm venue access, parking, vendor arrival, stage lighting, and no-disruption shooting zones',
      providedLocations: 'Main stage, sponsor wall, registration table, networking area, venue exterior',
      eventPriorities: 'Keynote moments, sponsor visibility, VIP candids, attendee energy, and room-wide context',
    },
  },
];

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

  const loadStarterTemplate = useCallback(
    (payload: SessionTemplatePayload) => {
      onLoadTemplate(payload);
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
        <span>Session templates</span>
        <span className="text-emerald-700 text-xs font-normal">{isOpen ? 'Hide ▲' : 'Show ▼'}</span>
      </button>

      {isOpen && (
        <div className="mt-2 rounded-xl border border-emerald-200 bg-white p-4 shadow-sm">
          <div className="mb-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
              Guide starters by session type
            </p>
            <div className="grid gap-2 md:grid-cols-2">
              {GUIDE_TEMPLATE_STARTERS.map(template => (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => loadStarterTemplate(template.payload)}
                  className="min-h-28 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-left transition hover:border-emerald-300 hover:bg-emerald-50"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{template.name}</p>
                      <p className="mt-1 text-xs font-medium text-emerald-700">{template.sessionType}</p>
                    </div>
                    <span className="rounded-md bg-white px-2 py-1 text-[11px] font-semibold text-gray-600">
                      Load
                    </span>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-gray-500">{template.description}</p>
                </button>
              ))}
            </div>
          </div>

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
                className="flex-1 rounded-lg border border-gray-300 min-h-11 px-3 py-2.5 text-sm focus:border-emerald-400 focus:outline-none"
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
                      {template.template_payload.locationMode && (
                        <span className="rounded-full bg-gray-200 px-2 py-0.5 text-gray-700">
                          {template.template_payload.locationMode === 'use-provided' ? 'Provided spots' : 'AI locations'}
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
