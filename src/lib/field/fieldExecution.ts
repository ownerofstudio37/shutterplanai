export type FieldShot = {
  id: string;
  title: string;
  location?: string | null;
  planned_time?: string | null;
  status?: string;
};

export type FieldLocationGroup<TShot extends FieldShot = FieldShot> = {
  key: string;
  location: string;
  shots: TShot[];
  plannedStart: string | null;
};

export function groupShotsByLocation<TShot extends FieldShot>(shots: TShot[]): Array<FieldLocationGroup<TShot>> {
  const groups = new Map<string, FieldLocationGroup<TShot>>();

  shots.forEach(shot => {
    const location = shot.location?.trim() || 'Flexible / TBD';
    const key = location.toLowerCase();
    const existing = groups.get(key);

    if (existing) {
      existing.shots.push(shot);
      existing.plannedStart = getEarlierDate(existing.plannedStart, shot.planned_time ?? null);
      return;
    }

    groups.set(key, {
      key,
      location,
      shots: [shot],
      plannedStart: shot.planned_time ?? null,
    });
  });

  return [...groups.values()].sort((a, b) => {
    const aTime = a.plannedStart ? new Date(a.plannedStart).getTime() : Number.POSITIVE_INFINITY;
    const bTime = b.plannedStart ? new Date(b.plannedStart).getTime() : Number.POSITIVE_INFINITY;
    return aTime - bTime || a.location.localeCompare(b.location);
  });
}

export function getVarianceMinutes(plannedStart?: string | null, actualStart?: string | null) {
  if (!plannedStart || !actualStart) return null;
  const planned = new Date(plannedStart).getTime();
  const actual = new Date(actualStart).getTime();
  if (Number.isNaN(planned) || Number.isNaN(actual)) return null;
  return Math.round((actual - planned) / 60_000);
}

export function buildRunningLateSuggestion(input: {
  plannedStart?: string | null;
  completedShots: number;
  totalShots: number;
  now?: Date;
}) {
  if (!input.plannedStart || input.totalShots === 0 || input.completedShots >= input.totalShots) return null;

  const planned = new Date(input.plannedStart).getTime();
  if (Number.isNaN(planned)) return null;

  const minutesLate = Math.round(((input.now ?? new Date()).getTime() - planned) / 60_000);
  if (minutesLate < 8) return null;

  const remaining = input.totalShots - input.completedShots;
  if (minutesLate < 15) {
    return `Running ${minutesLate} minutes behind. Prioritize the next ${Math.min(remaining, 3)} must-have shots and keep transitions under 3 minutes.`;
  }

  return `Running ${minutesLate} minutes behind. Capture one wide, one close, and one interaction shot here, then move to the next location.`;
}

export function mergeFieldNote(existingNotes: string | undefined, fieldNote: string) {
  const trimmed = fieldNote.trim();
  if (!trimmed) return existingNotes ?? '';
  const base = existingNotes?.trim();
  const fieldLine = `Field note: ${trimmed}`;
  if (!base) return fieldLine;
  if (base.includes(fieldLine)) return base;
  return `${base}\n${fieldLine}`;
}

function getEarlierDate(current: string | null, candidate: string | null) {
  if (!current) return candidate;
  if (!candidate) return current;

  const currentTime = new Date(current).getTime();
  const candidateTime = new Date(candidate).getTime();

  if (Number.isNaN(currentTime)) return candidate;
  if (Number.isNaN(candidateTime)) return current;
  return candidateTime < currentTime ? candidate : current;
}
