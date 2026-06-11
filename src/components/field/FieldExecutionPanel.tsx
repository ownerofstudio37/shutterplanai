'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import {
  buildRunningLateSuggestion,
  getVarianceMinutes,
  groupShotsByLocation,
  mergeFieldNote,
} from '@/lib/field/fieldExecution';
import { tokenUtils } from '@/lib/auth';

type FieldShot = {
  id: string;
  title: string;
  description?: string;
  location?: string | null;
  planned_time?: string | null;
  notes?: string;
  status: 'planned' | 'taken' | 'approved' | 'rejected';
};

type FieldProgress = {
  completedShotIds: string[];
  pendingShotIds: string[];
  shotNotes: Record<string, string>;
  locationNotes: Record<string, string>;
  locationActuals: Record<string, { startedAt?: string; endedAt?: string }>;
  updatedAt: string;
};

type FieldExecutionPanelProps = {
  projectId: string;
  projectTitle: string;
  shots: FieldShot[];
  onShotSynced: (shot: Partial<FieldShot> & { id: string }) => void;
};

const emptyProgress: FieldProgress = {
  completedShotIds: [],
  pendingShotIds: [],
  shotNotes: {},
  locationNotes: {},
  locationActuals: {},
  updatedAt: '',
};

function getAuthHeader() {
  const token = tokenUtils.getToken();
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

function getStorageKey(projectId: string) {
  return `shutterplan-field-progress:${projectId}`;
}

function readStoredProgress(storageKey: string): FieldProgress {
  try {
    const raw = localStorage.getItem(storageKey);
    return raw ? { ...emptyProgress, ...JSON.parse(raw) } : emptyProgress;
  } catch {
    return emptyProgress;
  }
}

function formatShortTime(value?: string | null) {
  if (!value) return 'Flexible';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'Flexible';
  return parsed.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

function formatVariance(minutes: number | null) {
  if (minutes == null) return 'No variance yet';
  if (minutes === 0) return 'On time';
  return minutes > 0 ? `${minutes} min late` : `${Math.abs(minutes)} min early`;
}

export function FieldExecutionPanel({ projectId, projectTitle, shots, onShotSynced }: FieldExecutionPanelProps) {
  const storageKey = useMemo(() => getStorageKey(projectId), [projectId]);
  const [progress, setProgress] = useState<FieldProgress>(() => readStoredProgress(storageKey));
  const [isOnline, setIsOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine));
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'saved' | 'offline'>('idle');

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    queueMicrotask(() => setProgress(readStoredProgress(storageKey)));
  }, [storageKey]);

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify({ ...progress, updatedAt: new Date().toISOString() }));
  }, [progress, storageKey]);

  const completedShotIds = useMemo(() => {
    const ids = new Set(progress.completedShotIds);
    shots.forEach(shot => {
      if (shot.status === 'taken' || shot.status === 'approved') ids.add(shot.id);
    });
    return ids;
  }, [progress.completedShotIds, shots]);

  const locationGroups = useMemo(() => groupShotsByLocation(shots), [shots]);
  const completionPercent = shots.length > 0 ? Math.round((completedShotIds.size / shots.length) * 100) : 0;

  const syncShot = useCallback(
    async (shot: FieldShot, completed: boolean, fieldNote: string) => {
      if (!navigator.onLine) {
        setSyncStatus('offline');
        return false;
      }

      setSyncStatus('syncing');
      try {
        const response = await fetch(`/api/shots/${shot.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            ...getAuthHeader(),
          },
          body: JSON.stringify({
            status: completed ? 'taken' : 'planned',
            notes: mergeFieldNote(shot.notes, fieldNote),
          }),
        });
        const result = (await response.json()) as { success?: boolean; data?: FieldShot };
        if (!response.ok || !result.success || !result.data) {
          throw new Error('Failed to sync shot');
        }
        onShotSynced(result.data);
        setSyncStatus('saved');
        return true;
      } catch {
        setSyncStatus('offline');
        return false;
      }
    },
    [onShotSynced]
  );

  const updateProgress = (updater: (current: FieldProgress) => FieldProgress) => {
    setProgress(current => updater({ ...emptyProgress, ...current }));
  };

  const toggleShot = async (shot: FieldShot) => {
    const nextCompleted = !completedShotIds.has(shot.id);
    const fieldNote = progress.shotNotes[shot.id] ?? '';

    updateProgress(current => ({
      ...current,
      completedShotIds: nextCompleted
        ? [...new Set([...current.completedShotIds, shot.id])]
        : current.completedShotIds.filter(id => id !== shot.id),
      pendingShotIds: [...new Set([...current.pendingShotIds, shot.id])],
    }));

    const synced = await syncShot(shot, nextCompleted, fieldNote);
    if (synced) {
      updateProgress(current => ({
        ...current,
        pendingShotIds: current.pendingShotIds.filter(id => id !== shot.id),
      }));
    }
  };

  const syncPendingShots = useCallback(async () => {
    if (!navigator.onLine || progress.pendingShotIds.length === 0) return;

    for (const shotId of progress.pendingShotIds) {
      const shot = shots.find(item => item.id === shotId);
      if (!shot) continue;
      const completed = completedShotIds.has(shotId);
      const synced = await syncShot(shot, completed, progress.shotNotes[shotId] ?? '');
      if (synced) {
        setProgress(current => ({
          ...current,
          pendingShotIds: current.pendingShotIds.filter(id => id !== shotId),
        }));
      }
    }
  }, [completedShotIds, progress.pendingShotIds, progress.shotNotes, shots, syncShot]);

  useEffect(() => {
    if (!isOnline) return;
    queueMicrotask(() => void syncPendingShots());
  }, [isOnline, syncPendingShots]);

  const setShotNote = (shotId: string, value: string) => {
    updateProgress(current => ({
      ...current,
      shotNotes: {
        ...current.shotNotes,
        [shotId]: value,
      },
      pendingShotIds: value.trim() ? [...new Set([...current.pendingShotIds, shotId])] : current.pendingShotIds,
    }));
  };

  const setLocationNote = (locationKey: string, value: string) => {
    updateProgress(current => ({
      ...current,
      locationNotes: {
        ...current.locationNotes,
        [locationKey]: value,
      },
    }));
  };

  const markLocationTime = (locationKey: string, field: 'startedAt' | 'endedAt') => {
    updateProgress(current => ({
      ...current,
      locationActuals: {
        ...current.locationActuals,
        [locationKey]: {
          ...current.locationActuals[locationKey],
          [field]: new Date().toISOString(),
        },
      },
    }));
  };

  return (
    <Card className="print-hidden border border-[#1f2933] bg-[#f8faf8] shadow-sm">
      <div className="space-y-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#0f766e]">Shoot-day mode</p>
            <h2 className="mt-2 text-2xl font-semibold text-[#1f2933]">{projectTitle}</h2>
            <p className="mt-2 text-sm text-[#5f6b76]">
              {completedShotIds.size}/{shots.length} shots complete. Progress is saved locally and queued when offline.
            </p>
          </div>
          <div className="rounded-lg border border-[#d8d2c8] bg-white px-4 py-3 text-sm font-semibold text-[#1f2933]">
            {completionPercent}% complete - {isOnline ? syncStatus === 'syncing' ? 'Syncing' : 'Online' : 'Offline'}
          </div>
        </div>

        <div className="h-3 overflow-hidden rounded-full bg-[#e4ded5]">
          <div className="h-full bg-[#0f766e]" style={{ width: `${completionPercent}%` }} />
        </div>

        <div className="space-y-4">
          {locationGroups.map(group => {
            const actual = progress.locationActuals[group.key] ?? {};
            const completedInGroup = group.shots.filter(shot => completedShotIds.has(shot.id)).length;
            const variance = getVarianceMinutes(group.plannedStart, actual.startedAt);
            const lateSuggestion = buildRunningLateSuggestion({
              plannedStart: group.plannedStart,
              completedShots: completedInGroup,
              totalShots: group.shots.length,
            });

            return (
              <section key={group.key} className="rounded-lg border border-[#d8d2c8] bg-white p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#7c6f64]">
                      {formatShortTime(group.plannedStart)} - {formatVariance(variance)}
                    </p>
                    <h3 className="mt-1 text-lg font-semibold text-[#1f2933]">{group.location}</h3>
                    <p className="mt-1 text-sm text-[#5f6b76]">
                      {completedInGroup}/{group.shots.length} shots complete
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Button type="button" variant="secondary" onClick={() => markLocationTime(group.key, 'startedAt')}>
                      Start
                    </Button>
                    <Button type="button" variant="secondary" onClick={() => markLocationTime(group.key, 'endedAt')}>
                      Finish
                    </Button>
                  </div>
                </div>

                {lateSuggestion && (
                  <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-900">
                    {lateSuggestion}
                  </p>
                )}

                <textarea
                  value={progress.locationNotes[group.key] ?? ''}
                  onChange={event => setLocationNote(group.key, event.target.value)}
                  placeholder="Quick location note"
                  className="mt-3 min-h-20 w-full rounded-lg border border-[#d8d2c8] bg-[#faf9f6] px-3 py-2 text-sm text-[#1f2933] outline-none focus:border-[#1f2933]"
                />

                <div className="mt-3 space-y-2">
                  {group.shots.map(shot => {
                    const completed = completedShotIds.has(shot.id);
                    const pending = progress.pendingShotIds.includes(shot.id);

                    return (
                      <div key={shot.id} className="rounded-lg border border-[#ece7df] bg-[#faf9f6] p-3">
                        <div className="flex items-start gap-3">
                          <button
                            type="button"
                            onClick={() => void toggleShot(shot)}
                            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border text-lg font-semibold ${
                              completed
                                ? 'border-[#0f766e] bg-[#0f766e] text-white'
                                : 'border-[#d8d2c8] bg-white text-[#5f6b76]'
                            }`}
                            aria-label={completed ? `Mark ${shot.title} incomplete` : `Mark ${shot.title} complete`}
                          >
                            {completed ? 'Done' : ''}
                          </button>
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-[#1f2933]">{shot.title}</p>
                            <p className="mt-1 text-xs text-[#7c6f64]">
                              {formatShortTime(shot.planned_time)}{pending ? ' - pending sync' : ''}
                            </p>
                          </div>
                        </div>
                        <textarea
                          value={progress.shotNotes[shot.id] ?? ''}
                          onChange={event => setShotNote(shot.id, event.target.value)}
                          placeholder="Quick shot note"
                          className="mt-3 min-h-16 w-full rounded-lg border border-[#d8d2c8] bg-white px-3 py-2 text-sm text-[#1f2933] outline-none focus:border-[#1f2933]"
                        />
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </Card>
  );
}
