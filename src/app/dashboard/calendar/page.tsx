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

  // Previous month days
  for (let i = firstDay - 1; i >= 0; i--) {
    const dayDate = new Date(date.getFullYear(), date.getMonth() - 1, previousMonthDays - i);
    days.push({
      date: dayDate,
      day: previousMonthDays - i,
      isCurrentMonth: false,
      shots: [],
    });
  }

  // Current month days
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

  // Next month days
  const remainingDays = 42 - days.length; // 6 weeks * 7 days
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

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

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
    const fetchData = async () => {
      await loadData();
    };
    void fetchData();
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

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600"></div>
              <p className="mt-4 text-gray-600">Loading calendar...</p>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Project</label>
            <select
              aria-label="Filter by project"
              className="w-full rounded-lg border border-gray-300 px-4 py-2"
              value={projectFilter}
              onChange={e => setProjectFilter(e.target.value)}
            >
              <option value="all">All Projects</option>
              {projects.map(project => (
                <option key={project.id} value={project.id}>
                  {project.title}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <select
              aria-label="Filter by status"
              className="w-full rounded-lg border border-gray-300 px-4 py-2"
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as typeof statusFilter)}
            >
              <option value="all">All Statuses</option>
              <option value="planned">Planned</option>
              <option value="taken">Taken</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Calendar */}
        <div className="lg:col-span-2">
          <Card>
            {/* Calendar Header */}
            <div className="mb-6 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                {MONTH_NAMES[currentDate.getMonth()]} {currentDate.getFullYear()}
              </h3>
              <div className="flex gap-2">
                <button
                  onClick={goToToday}
                  className="px-3 py-1 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  Today
                </button>
                <button
                  onClick={previousMonth}
                  className="px-3 py-1 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  ← Prev
                </button>
                <button
                  onClick={nextMonth}
                  className="px-3 py-1 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Next →
                </button>
              </div>
            </div>

            {/* Day Headers */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {DAY_NAMES.map(day => (
                <div key={day} className="text-center text-sm font-semibold text-gray-600 py-2">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1 bg-gray-50 p-2 rounded-lg">
              {calendarDays.map((calDay, idx) => (
                <div
                  key={idx}
                  className={`min-h-24 p-2 rounded border text-xs ${
                    calDay.isCurrentMonth
                      ? 'bg-white border-gray-200 hover:bg-gray-50'
                      : 'bg-gray-100 border-gray-100 text-gray-400'
                  } transition-colors`}
                >
                  <div className={`font-semibold mb-1 ${calDay.isCurrentMonth ? 'text-gray-900' : ''}`}>
                    {calDay.day}
                  </div>
                  <div className="space-y-1">
                    {calDay.shots.slice(0, 2).map((shot, idx) => (
                      <div
                        key={idx}
                        className="bg-blue-100 text-blue-700 px-1 py-0.5 rounded truncate cursor-pointer hover:bg-blue-200 transition-colors"
                        title={shot.title}
                      >
                        {shot.title}
                      </div>
                    ))}
                    {calDay.shots.length > 2 && (
                      <div className="text-gray-500 text-xs px-1 py-0.5">
                        +{calDay.shots.length - 2} more
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Stats */}
            <div className="mt-6 pt-6 border-t grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{filteredShots.length}</div>
                <div className="text-sm text-gray-600">Total Shots</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {filteredShots.filter(s => s.planned_time).length}
                </div>
                <div className="text-sm text-gray-600">Scheduled</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-violet-600">
                  {new Set(filteredShots.map(s => s.project_id)).size}
                </div>
                <div className="text-sm text-gray-600">Projects</div>
              </div>
            </div>
          </Card>
        </div>

        {/* Upcoming Shoots */}
        <div>
          <Card>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Upcoming Shoots</h3>

            {upcomingShots.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500">No upcoming shoots scheduled</p>
              </div>
            ) : (
              <div className="space-y-3">
                {upcomingShots.map(shot => {
                  const shotDate = new Date(shot.planned_time || new Date());
                  const today = new Date();
                  const isToday =
                    shotDate.toDateString() === today.toDateString();
                  const isTomorrow =
                    shotDate.toDateString() ===
                    new Date(today.getTime() + 24 * 60 * 60 * 1000).toDateString();

                  let dateLabel = shotDate.toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                  });

                  if (isToday) dateLabel = 'Today';
                  if (isTomorrow) dateLabel = 'Tomorrow';

                  return (
                    <div
                      key={shot.id}
                      className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-start gap-2">
                        <div className={`mt-1 h-3 w-3 rounded-full flex-shrink-0 ${
                          shot.status === 'taken'
                            ? 'bg-green-500'
                            : shot.status === 'approved'
                              ? 'bg-blue-500'
                              : shot.status === 'rejected'
                                ? 'bg-red-500'
                                : 'bg-gray-400'
                        }`} />
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-gray-900 truncate">{shot.title}</h4>
                          <p className="text-xs text-gray-500 mt-0.5">{shot.project_title}</p>
                          <p className="text-xs font-medium text-blue-600 mt-1">{dateLabel}</p>
                          {shot.location && (
                            <p className="text-xs text-gray-600 mt-1">📍 {shot.location}</p>
                          )}
                        </div>
                      </div>
                      <div className="mt-2 text-xs">
                        <span className={`inline-block px-2 py-0.5 rounded-full ${
                          shot.status === 'taken'
                            ? 'bg-green-100 text-green-700'
                            : shot.status === 'approved'
                              ? 'bg-blue-100 text-blue-700'
                              : shot.status === 'rejected'
                                ? 'bg-red-100 text-red-700'
                                : 'bg-gray-100 text-gray-700'
                        }`}>
                          {shot.status.charAt(0).toUpperCase() + shot.status.slice(1)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
