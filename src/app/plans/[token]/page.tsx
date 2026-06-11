'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';

type SharedPlanResponse = {
  plan_data?: {
    projectTitle?: string;
    creativeDirection?: string;
    locationSuggestions?: Array<{ name?: string; displayName?: string; whyItWorks?: string }>;
    shotList?: Array<{ title?: string; location?: string; description?: string }>;
    timeline?: Array<{ timeBlock?: string; focus?: string; notes?: string }>;
    clientPrepChecklist?: string[];
    contingencyPlans?: string[];
  };
  metadata?: {
    shootType?: string;
    city?: string;
    duration?: string;
    mood?: string;
  };
};

export default function SharedPlanPage() {
  const params = useParams<{ token: string }>();
  const token = params?.token;

  const [data, setData] = useState<SharedPlanResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchSharedPlan = async () => {
      if (!token) return;

      setIsLoading(true);
      setError('');
      try {
        const response = await fetch(`/api/planner/export?token=${encodeURIComponent(token)}`);
        const result = (await response.json()) as SharedPlanResponse & { error?: string };

        if (!response.ok) {
          setError(result.error || 'Shared plan not found or expired.');
          return;
        }

        setData(result);
      } catch {
        setError('Failed to load shared plan.');
      } finally {
        setIsLoading(false);
      }
    };

    void fetchSharedPlan();
  }, [token]);

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <Card>
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Shared session plan</h1>
            <p className="text-sm text-gray-600">Review this exported plan snapshot.</p>
          </div>
          <Link href="/auth/login" className="text-sm font-medium text-blue-600 hover:underline">
            Open your dashboard
          </Link>
        </div>
      </Card>

      {isLoading && (
        <Card>
          <p className="text-sm text-gray-600">Loading shared plan...</p>
        </Card>
      )}

      {error && (
        <Card>
          <p className="text-sm text-red-700">{error}</p>
        </Card>
      )}

      {!isLoading && !error && data?.plan_data && (
        <>
          <Card>
            <h2 className="text-lg font-semibold text-gray-900">{data.plan_data.projectTitle || 'Session Plan'}</h2>
            <p className="mt-1 text-sm text-gray-600">{data.plan_data.creativeDirection || 'No creative direction provided.'}</p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              {data.metadata?.shootType && <span className="rounded-full bg-indigo-50 px-2 py-1 text-indigo-700">{data.metadata.shootType}</span>}
              {data.metadata?.city && <span className="rounded-full bg-gray-100 px-2 py-1 text-gray-700">{data.metadata.city}</span>}
              {data.metadata?.duration && <span className="rounded-full bg-gray-100 px-2 py-1 text-gray-700">{data.metadata.duration}</span>}
            </div>
          </Card>

          <Card>
            <h3 className="text-base font-semibold text-gray-900">Locations</h3>
            <div className="mt-3 space-y-2">
              {(data.plan_data.locationSuggestions || []).map((location, index) => (
                <div key={`${location.name}-${index}`} className="rounded-lg border border-gray-200 p-3">
                  <p className="font-medium text-gray-900">{location.displayName || location.name || `Location ${index + 1}`}</p>
                  <p className="text-sm text-gray-600">{location.whyItWorks || 'No notes provided.'}</p>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <h3 className="text-base font-semibold text-gray-900">Shot list</h3>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              {(data.plan_data.shotList || []).map((shot, index) => (
                <div key={`${shot.title}-${index}`} className="rounded-lg border border-gray-200 p-3">
                  <p className="font-medium text-gray-900">{shot.title || `Shot ${index + 1}`}</p>
                  <p className="text-sm text-gray-600">{shot.description || 'No description provided.'}</p>
                  <p className="mt-1 text-xs text-gray-500">{shot.location || 'Location not set'}</p>
                </div>
              ))}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
