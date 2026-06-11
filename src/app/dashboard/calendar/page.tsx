'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/Card';
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
  status: 'planned' | 'taken' | 'approved' | 'rejected';
  planned_time?: string | null;
  location?: string;
  notes?: string;
}

interface CalendarDay {
  date: Date;
  day: number;
  isCurrentMonth: boolean;
  shots: ShotItem[];
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function getAuthHeader() {
  const token = tokenUtils.getToken();
  const headers: Record<string, string> = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

function getDaysInMonth(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

function getFirstDayOfMonth(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
}

function getCalendarGrid(date: Date, shots: ShotItem[]): CalendarDay[] {
  const days: CalendarDay[] = [];
  const daysInMonth = getDaysInMonth(date);
  const firstDay = getFirstDayOfMonth(date);
  const previousMonthDays = getDaysInMonth(new Date(date.getFullYear(), date.getMonth() - 1, 1));

  for (let i = firstDay - 1; i >= 0; i--) {
    const dayDate = new Date(date.getFullYear(), date.getMonth() - 1, previousMonthDays - i);
    days.push({
      date: dayDate,
      day: previousMonthDays - i,
      isCurrentMonth: false,
      shots: [],
    });
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const dayDate = new Date(date.getFullYear(), date.getMonth(), day);
    const dayShots = shots.filter(shot => {
      if (!shot.planned_time) return false;
      const shotDate = new Date(shot.planned_time);
      return (
        shotDate.getFullYear() === dayDate.getFullYear() &&
        shotDate.getMonth() === dayDate.getMonth() &&
        shotDate.getDate() === dayDate.getDate()
      );
    });

    days.push({
      date: dayDate,
      day,
      isCurrentMonth: true,
      shots: dayShots,
    });
  }

  const remainingDays = 42 - days.length;
  for (let day = 1; day <= remainingDays; day++) {
    const dayDate = new Date(date.getFullYear(), date.getMonth() + 1, day);
    days.push({
      date: dayDate,
      day,
      isCurrentMonth: false,
      shots: [],
    });
  }

  return days;
}

function getStatusClass(status: ShotItem['status']) {
  if (status === 'taken') return 'bg-[#d9eee6] text-[#0f766e]';
  if (status === 'approved') return 'bg-[#dbeafe] text-[#1d4ed8]';
  if (status === 'rejected') return 'bg-[#fee2e2] text-[#b91c1c]';
  return 'bg-[#ece7df] text-[#5f6b76]';
}

function getStatusDotClass(status: ShotItem['status']) {
  if (status === 'taken') return 'bg-[#0f766e]';
  if (status === 'approved') return 'bg-[#2563eb]';
  if (status === 'rejected') return 'bg-[#dc2626]';
  return 'bg-[#5f6b76]';
}

function formatStatus(status: ShotItem['status']) {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function formatDateLabel(date: Date) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  const comparable = new Date(date);
  comparable.setHours(0, 0, 0, 0);

  if (comparable.getTime() === today.getTime()) return 'Today';
  if (comparable.getTime() === tomorrow.getTime()) return 'Tomorrow';

  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

function formatTimeLabel(date: Date) {
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [shots, setShots] = useState<ShotItem[]>([]);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [projectFilter, setProjectFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'planned' | 'taken' | 'approved' | 'rejected'>('all');

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
    queueMicrotask(() => {
      void loadData();
    });
  }, []);

  const filteredShots = useMemo(() => {
    return shots.filter(shot => {
      const matchesProject = projectFilter === 'all' || shot.project_id === projectFilter;
      const matchesStatus = statusFilter === 'all' || shot.status === statusFilter;
      return matchesProject && matchesStatus;
    });
  }, [shots, projectFilter, statusFilter]);

  const calendarDays = useMemo(() => {
    return getCalendarGrid(currentDate, filteredShots);
  }, [currentDate, filteredShots]);

  const upcomingShots = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return filteredShots
      .filter(shot => {
        if (!shot.planned_time) return false;
        const shotDate = new Date(shot.planned_time);
        return shotDate >= today;
      })
      .sort((a, b) => {
        const dateA = new Date(a.planned_time || 0);
        const dateB = new Date(b.planned_time || 0);
        return dateA.getTime() - dateB.getTime();
      })
      .slice(0, 10);
  }, [filteredShots]);

  const stats = useMemo(() => {
    const scheduled = filteredShots.filter(shot => shot.planned_time).length;
    const currentMonthShots = calendarDays.reduce((total, day) => {
      if (!day.isCurrentMonth) return total;
      return total + day.shots.length;
    }, 0);

    return {
      total: filteredShots.length,
      scheduled,
      upcoming: upcomingShots.length,
      projects: new Set(filteredShots.map(shot => shot.project_id)).size,
      currentMonthShots,
    };
  }, [filteredShots, calendarDays, upcomingShots]);

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card className="border border-[#d8d2c8] bg-[#faf9f6] shadow-sm">
          <div className="flex h-96 items-center justify-center">
            <div className="text-center">
              <div className="mx-auto h-12 w-12 animate-spin rounded-full border-2 border-[#d8d2c8] border-b-[#1f2933]" />
              <p className="mt-4 text-sm font-medium text-[#5f6b76]">Loading production calendar...</p>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-lg bg-[#1f2933] text-white shadow-sm">
        <div className="grid gap-6 p-6 lg:grid-cols-[1.35fr_1fr] lg:p-8">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#d8d2c8]">Shoot telemetry calendar</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-normal md:text-4xl">Keep every production day visible.</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#d8d2c8]">
              Scan scheduled shots, active projects, and upcoming client handoffs in a calendar built for field planning.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              ['Scheduled', stats.scheduled.toString()],
              ['This month', stats.currentMonthShots.toString()],
              ['Upcoming', stats.upcoming.toString()],
              ['Projects', stats.projects.toString()],
            ].map(([label, value]) => (
              <div key={label} className="rounded-lg border border-white/10 bg-white/10 p-4">
                <p className="text-xs font-medium uppercase tracking-[0.12em] text-[#d8d2c8]">{label}</p>
                <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Card className="border border-[#d8d2c8] bg-[#faf9f6] shadow-sm">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-[#7c6f64]" htmlFor="calendar-project-filter">
              Project
            </label>
            <select
              id="calendar-project-filter"
              aria-label="Filter by project"
              className="w-full rounded-lg border border-[#d8d2c8] bg-white px-4 py-3 text-sm font-medium text-[#1f2933] shadow-sm outline-none transition focus:border-[#1f2933] focus:ring-2 focus:ring-[#1f2933]/10"
              value={projectFilter}
              onChange={e => setProjectFilter(e.target.value)}
            >
              <option value="all">All projects</option>
              {projects.map(project => (
                <option key={project.id} value={project.id}>
                  {project.title}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-[#7c6f64]" htmlFor="calendar-status-filter">
              Status
            </label>
            <select
              id="calendar-status-filter"
              aria-label="Filter by status"
              className="w-full rounded-lg border border-[#d8d2c8] bg-white px-4 py-3 text-sm font-medium text-[#1f2933] shadow-sm outline-none transition focus:border-[#1f2933] focus:ring-2 focus:ring-[#1f2933]/10"
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as typeof statusFilter)}
            >
              <option value="all">All statuses</option>
              <option value="planned">Planned</option>
              <option value="taken">Taken</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.65fr)_minmax(340px,0.85fr)]">
        <Card className="border border-[#d8d2c8] bg-white shadow-sm">
          <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#7c6f64]">Month board</p>
              <h2 className="mt-2 text-2xl font-semibold text-[#1f2933]">
                {MONTH_NAMES[currentDate.getMonth()]} {currentDate.getFullYear()}
              </h2>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={goToToday}
                className="rounded-lg bg-[#1f2933] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#111827]"
              >
                Today
              </button>
              <button
                type="button"
                onClick={previousMonth}
                className="rounded-lg border border-[#d8d2c8] bg-white px-4 py-2 text-sm font-semibold text-[#1f2933] transition hover:bg-[#faf9f6]"
              >
                Previous
              </button>
              <button
                type="button"
                onClick={nextMonth}
                className="rounded-lg border border-[#d8d2c8] bg-white px-4 py-2 text-sm font-semibold text-[#1f2933] transition hover:bg-[#faf9f6]"
              >
                Next
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1">
            {DAY_NAMES.map(day => (
              <div key={day} className="py-2 text-center text-xs font-semibold uppercase tracking-[0.12em] text-[#7c6f64]">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1 rounded-lg border border-[#d8d2c8] bg-[#ece7df] p-1">
            {calendarDays.map(calDay => (
              <div
                key={calDay.date.toISOString()}
                className={`min-h-28 rounded-md border p-2 text-xs transition ${
                  calDay.isCurrentMonth
                    ? 'border-[#d8d2c8] bg-white hover:bg-[#faf9f6]'
                    : 'border-[#ece7df] bg-[#f4f1ec] text-[#9a9187]'
                }`}
              >
                <div className={`mb-2 font-semibold ${calDay.isCurrentMonth ? 'text-[#1f2933]' : 'text-[#9a9187]'}`}>
                  {calDay.day}
                </div>
                <div className="space-y-1">
                  {calDay.shots.slice(0, 3).map(shot => (
                    <div
                      key={shot.id}
                      className={`truncate rounded px-2 py-1 font-medium ${getStatusClass(shot.status)}`}
                      title={shot.title}
                    >
                      {shot.title}
                    </div>
                  ))}
                  {calDay.shots.length > 3 && (
                    <div className="rounded bg-[#faf9f6] px-2 py-1 font-medium text-[#5f6b76]">
                      +{calDay.shots.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 grid gap-3 border-t border-[#ece7df] pt-6 sm:grid-cols-3">
            {[
              ['Visible shots', stats.total.toString()],
              ['Scheduled', stats.scheduled.toString()],
              ['Active projects', stats.projects.toString()],
            ].map(([label, value]) => (
              <div key={label} className="rounded-lg border border-[#ece7df] bg-[#faf9f6] p-4 text-center">
                <p className="text-2xl font-semibold text-[#1f2933]">{value}</p>
                <p className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-[#7c6f64]">{label}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card className="border border-[#d8d2c8] bg-white shadow-sm">
          <div className="mb-5">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#7c6f64]">Production queue</p>
            <h2 className="mt-2 text-xl font-semibold text-[#1f2933]">Upcoming shoots</h2>
          </div>

          {upcomingShots.length === 0 ? (
            <div className="flex min-h-80 items-center justify-center rounded-lg border border-dashed border-[#d8d2c8] bg-[#faf9f6] p-8 text-center">
              <div>
                <p className="font-semibold text-[#1f2933]">No upcoming shoots scheduled.</p>
                <p className="mt-2 text-sm text-[#5f6b76]">Planned times will appear here once shots are scheduled.</p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingShots.map(shot => {
                const shotDate = new Date(shot.planned_time || new Date());

                return (
                  <div key={shot.id} className="rounded-lg border border-[#d8d2c8] bg-[#faf9f6] p-4">
                    <div className="flex items-start gap-3">
                      <div className={`mt-1.5 h-3 w-3 shrink-0 rounded-full ${getStatusDotClass(shot.status)}`} />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <h3 className="min-w-0 flex-1 truncate font-semibold text-[#1f2933]">{shot.title}</h3>
                          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusClass(shot.status)}`}>
                            {formatStatus(shot.status)}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-[#7c6f64]">{shot.project_title || 'Unassigned project'}</p>
                        <p className="mt-3 text-sm font-semibold text-[#1f2933]">
                          {formatDateLabel(shotDate)} at {formatTimeLabel(shotDate)}
                        </p>
                        {shot.location && <p className="mt-2 text-sm leading-5 text-[#5f6b76]">{shot.location}</p>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
