'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { tokenUtils } from '@/lib/auth';

type BusinessProfile = {
  businessName: string;
  businessType: string;
  address: string;
  zipCode: string;
  baseLocation: string;
  websiteUrl: string;
  websiteSummary: string;
  brandTone: string;
  preferredLocationTypes: string;
  avoidLocationTypes: string;
  poseDirectionStyle: string;
  prepGuideNotes: string;
};

const EMPTY_PROFILE: BusinessProfile = {
  businessName: '',
  businessType: '',
  address: '',
  zipCode: '',
  baseLocation: '',
  websiteUrl: '',
  websiteSummary: '',
  brandTone: '',
  preferredLocationTypes: '',
  avoidLocationTypes: '',
  poseDirectionStyle: '',
  prepGuideNotes: '',
};

function getAuthHeader() {
  const token = tokenUtils.getToken();
  const headers: Record<string, string> = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

export default function SettingsPage() {
  const [profile, setProfile] = useState<BusinessProfile>(EMPTY_PROFILE);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/account/business-profile', {
          headers: {
            ...getAuthHeader(),
          },
        });

        const result = await response.json();
        if (!result.success) {
          setError(result.error ?? 'Failed to load profile');
          return;
        }

        setProfile({
          ...EMPTY_PROFILE,
          ...(result.data ?? {}),
        });
      } catch {
        setError('Failed to load profile');
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, []);

  const saveProfile = async () => {
    setIsSaving(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch('/api/account/business-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
        body: JSON.stringify(profile),
      });

      const result = await response.json();
      if (!result.success) {
        setError(result.error ?? 'Failed to save profile');
        return;
      }

      setProfile({
        ...EMPTY_PROFILE,
        ...(result.data ?? {}),
      });
      setMessage('Business profile saved. Planner outputs will now use this context.');
    } catch {
      setError('Failed to save profile');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <h3 className="mb-2 text-lg font-semibold text-gray-900">Business Profile</h3>
        <p className="text-sm text-gray-600">
          Add your brand details to improve location picks, prep guidance, and shot direction.
        </p>

        {error ? <p className="mt-3 rounded bg-red-50 p-2 text-sm text-red-700">{error}</p> : null}
        {message ? <p className="mt-3 rounded bg-green-50 p-2 text-sm text-green-700">{message}</p> : null}

        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="text-sm text-gray-700">
            Business name
            <input
              className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
              value={profile.businessName}
              onChange={e => setProfile(prev => ({ ...prev, businessName: e.target.value }))}
              placeholder="Studio 37 Photography"
              disabled={isLoading}
            />
          </label>

          <label className="text-sm text-gray-700">
            Business type
            <input
              className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
              value={profile.businessType}
              onChange={e => setProfile(prev => ({ ...prev, businessType: e.target.value }))}
              placeholder="Family + engagement photographer"
              disabled={isLoading}
            />
          </label>

          <label className="text-sm text-gray-700">
            Base location (city or ZIP)
            <input
              className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
              value={profile.baseLocation}
              onChange={e => setProfile(prev => ({ ...prev, baseLocation: e.target.value }))}
              placeholder="Magnolia, TX or 77355"
              disabled={isLoading}
            />
          </label>

          <label className="text-sm text-gray-700">
            ZIP code
            <input
              className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
              value={profile.zipCode}
              onChange={e => setProfile(prev => ({ ...prev, zipCode: e.target.value }))}
              placeholder="77355"
              disabled={isLoading}
            />
          </label>

          <label className="text-sm text-gray-700 md:col-span-2">
            Website URL
            <input
              className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
              value={profile.websiteUrl}
              onChange={e => setProfile(prev => ({ ...prev, websiteUrl: e.target.value }))}
              placeholder="https://yourstudio.com"
              disabled={isLoading}
            />
          </label>

          <label className="text-sm text-gray-700 md:col-span-2">
            Brand tone
            <input
              className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
              value={profile.brandTone}
              onChange={e => setProfile(prev => ({ ...prev, brandTone: e.target.value }))}
              placeholder="warm, true-to-color, candid, storytelling"
              disabled={isLoading}
            />
          </label>

          <label className="text-sm text-gray-700">
            Preferred location types (comma-separated)
            <input
              className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
              value={profile.preferredLocationTypes}
              onChange={e => setProfile(prev => ({ ...prev, preferredLocationTypes: e.target.value }))}
              placeholder="riverwalk, oak trees, historic district"
              disabled={isLoading}
            />
          </label>

          <label className="text-sm text-gray-700">
            Avoid location types (comma-separated)
            <input
              className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
              value={profile.avoidLocationTypes}
              onChange={e => setProfile(prev => ({ ...prev, avoidLocationTypes: e.target.value }))}
              placeholder="industrial, school campus, crowded malls"
              disabled={isLoading}
            />
          </label>

          <label className="text-sm text-gray-700 md:col-span-2">
            Pose direction style
            <textarea
              className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
              rows={3}
              value={profile.poseDirectionStyle}
              onChange={e => setProfile(prev => ({ ...prev, poseDirectionStyle: e.target.value }))}
              placeholder="I prompt movement first, then dial into clean hero frames."
              disabled={isLoading}
            />
          </label>

          <label className="text-sm text-gray-700 md:col-span-2">
            Prep guide notes
            <textarea
              className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
              rows={3}
              value={profile.prepGuideNotes}
              onChange={e => setProfile(prev => ({ ...prev, prepGuideNotes: e.target.value }))}
              placeholder="Ask clients to bring neutral outfits and arrive 10 minutes early."
              disabled={isLoading}
            />
          </label>

          {profile.websiteSummary ? (
            <div className="md:col-span-2 rounded bg-gray-50 p-3 text-sm text-gray-700">
              <strong>Website summary detected:</strong> {profile.websiteSummary}
            </div>
          ) : null}
        </div>

        <div className="mt-5">
          <Button onClick={saveProfile} isLoading={isSaving} disabled={isLoading || isSaving}>
            Save business profile
          </Button>
        </div>
      </Card>
    </div>
  );
}
