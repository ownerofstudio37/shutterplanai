'use client';

/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useState } from 'react';
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
  guideLogoUrl: string;
  guidePrimaryColor: string;
  guideAccentColor: string;
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
  guideLogoUrl: '',
  guidePrimaryColor: '#1f2933',
  guideAccentColor: '#d8d2c8',
  preferredLocationTypes: '',
  avoidLocationTypes: '',
  poseDirectionStyle: '',
  prepGuideNotes: '',
};

const READINESS_FIELDS: Array<keyof BusinessProfile> = [
  'businessName',
  'businessType',
  'baseLocation',
  'websiteUrl',
  'brandTone',
  'guidePrimaryColor',
  'guideAccentColor',
  'preferredLocationTypes',
  'poseDirectionStyle',
  'prepGuideNotes',
];

function getAuthHeader() {
  const token = tokenUtils.getToken();
  const headers: Record<string, string> = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

function getInputClass() {
  return 'mt-2 min-h-11 w-full rounded-lg border border-[#d8d2c8] bg-white px-4 py-3 text-sm text-[#1f2933] shadow-sm outline-none transition placeholder:text-[#9a9187] focus:border-[#1f2933] focus:ring-2 focus:ring-[#1f2933]/10 disabled:bg-[#f4f1ec]';
}

function getReadinessLabel(score: number) {
  if (score >= 90) return 'Ready for polished AI outputs';
  if (score >= 60) return 'Strong profile, a few details left';
  if (score > 0) return 'Profile is underway';
  return 'Start with your studio basics';
}

interface TextFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  disabled: boolean;
  className?: string;
  type?: string;
}

function TextField({ label, value, onChange, placeholder, disabled, className = '', type = 'text' }: TextFieldProps) {
  return (
    <label className={`block text-sm font-medium text-[#1f2933] ${className}`}>
      {label}
      <input
        type={type}
        className={`${getInputClass()} ${type === 'color' ? 'h-11 p-1' : ''}`}
        value={value}
        onChange={event => onChange(event.target.value)}
        placeholder={placeholder}
        disabled={disabled}
      />
    </label>
  );
}

interface TextAreaFieldProps extends TextFieldProps {
  rows?: number;
}

function TextAreaField({ label, value, onChange, placeholder, disabled, className = '', rows = 3 }: TextAreaFieldProps) {
  return (
    <label className={`block text-sm font-medium text-[#1f2933] ${className}`}>
      {label}
      <textarea
        className={getInputClass()}
        rows={rows}
        value={value}
        onChange={event => onChange(event.target.value)}
        placeholder={placeholder}
        disabled={disabled}
      />
    </label>
  );
}

export default function SettingsPage() {
  const [profile, setProfile] = useState<BusinessProfile>(EMPTY_PROFILE);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isAnalyzingWebsite, setIsAnalyzingWebsite] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const readiness = useMemo(() => {
    const completedFields = READINESS_FIELDS.filter(field => profile[field].trim().length > 0).length;
    return Math.round((completedFields / READINESS_FIELDS.length) * 100);
  }, [profile]);

  const guidanceItems = useMemo(
    () => [
      {
        label: 'Studio identity',
        value: profile.businessName || 'Business name missing',
        complete: Boolean(profile.businessName.trim() && profile.businessType.trim()),
      },
      {
        label: 'Home market',
        value: profile.baseLocation || profile.zipCode || 'Base location missing',
        complete: Boolean(profile.baseLocation.trim() || profile.zipCode.trim()),
      },
      {
        label: 'Brand voice',
        value: profile.brandTone || 'Tone not set',
        complete: Boolean(profile.brandTone.trim()),
      },
      {
        label: 'Client prep',
        value: profile.prepGuideNotes || 'Prep defaults not set',
        complete: Boolean(profile.prepGuideNotes.trim()),
      },
    ],
    [profile]
  );

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

    queueMicrotask(() => {
      void load();
    });
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

  const analyzeWebsite = async () => {
    setIsAnalyzingWebsite(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch('/api/account/business-profile/analyze-website', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
        body: JSON.stringify({ websiteUrl: profile.websiteUrl }),
      });

      const result = await response.json();
      if (!result.success) {
        setError(result.error ?? 'Failed to analyze website');
        return;
      }

      setProfile({
        ...EMPTY_PROFILE,
        ...(result.data ?? {}),
      });
      setMessage(result.message ?? 'Website analyzed and profile updated.');
    } catch {
      setError('Failed to analyze website');
    } finally {
      setIsAnalyzingWebsite(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-lg bg-[#1f2933] text-white shadow-sm">
        <div className="grid gap-6 p-6 lg:grid-cols-[1.35fr_1fr] lg:p-8">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#d8d2c8]">AI studio profile</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-normal md:text-4xl">Teach ShutterPlan how your studio thinks.</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#d8d2c8]">
              Your brand profile becomes reusable context for location ideas, timeline pacing, posing direction, and client prep guidance.
            </p>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/10 p-5">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#d8d2c8]">Profile readiness</p>
                <p className="mt-2 text-4xl font-semibold text-white">{readiness}%</p>
              </div>
              <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#1f2933]">
                {getReadinessLabel(readiness)}
              </span>
            </div>
            <div className="mt-5 h-2 rounded-full bg-white/15">
              <div className="h-2 rounded-full bg-[#d8d2c8]" style={{ width: `${readiness}%` }} />
            </div>
          </div>
        </div>
      </section>

      {(error || message) && (
        <div
          className={`rounded-lg border px-4 py-3 text-sm font-medium ${
            error
              ? 'border-[#fecaca] bg-[#fef2f2] text-[#b91c1c]'
              : 'border-[#bbf7d0] bg-[#f0fdf4] text-[#166534]'
          }`}
        >
          {error || message}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
        <div className="space-y-6">
          <Card className="border border-[#d8d2c8] bg-white shadow-sm">
            <div className="mb-5">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#7c6f64]">Studio basics</p>
              <h2 className="mt-2 text-xl font-semibold text-[#1f2933]">Business identity</h2>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <TextField
                label="Business name"
                value={profile.businessName}
                onChange={value => setProfile(prev => ({ ...prev, businessName: value }))}
                placeholder="Studio 37 Photography"
                disabled={isLoading}
              />
              <TextField
                label="Business type"
                value={profile.businessType}
                onChange={value => setProfile(prev => ({ ...prev, businessType: value }))}
                placeholder="Family and engagement photographer"
                disabled={isLoading}
              />
              <TextField
                label="Base location"
                value={profile.baseLocation}
                onChange={value => setProfile(prev => ({ ...prev, baseLocation: value }))}
                placeholder="Magnolia, TX"
                disabled={isLoading}
              />
              <TextField
                label="ZIP code"
                value={profile.zipCode}
                onChange={value => setProfile(prev => ({ ...prev, zipCode: value }))}
                placeholder="77355"
                disabled={isLoading}
              />
              <TextField
                label="Studio address"
                value={profile.address}
                onChange={value => setProfile(prev => ({ ...prev, address: value }))}
                placeholder="Optional studio or office address"
                disabled={isLoading}
                className="md:col-span-2"
              />
            </div>
          </Card>

          <Card className="border border-[#d8d2c8] bg-white shadow-sm">
            <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#7c6f64]">Brand intelligence</p>
                <h2 className="mt-2 text-xl font-semibold text-[#1f2933]">Voice, website, and preferences</h2>
              </div>
              <Button
                variant="secondary"
                onClick={analyzeWebsite}
                isLoading={isAnalyzingWebsite}
                disabled={isLoading || isSaving || isAnalyzingWebsite || !profile.websiteUrl.trim()}
                className="border border-[#d8d2c8] bg-[#faf9f6] text-[#1f2933] hover:bg-[#ece7df]"
              >
                Analyze website
              </Button>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <TextField
                label="Website URL"
                value={profile.websiteUrl}
                onChange={value => setProfile(prev => ({ ...prev, websiteUrl: value }))}
                placeholder="https://yourstudio.com"
                disabled={isLoading}
                className="md:col-span-2"
              />
              <TextField
                label="Brand tone"
                value={profile.brandTone}
                onChange={value => setProfile(prev => ({ ...prev, brandTone: value }))}
                placeholder="Warm, true-to-color, candid, storytelling"
                disabled={isLoading}
                className="md:col-span-2"
              />
              <TextField
                label="Preferred location types"
                value={profile.preferredLocationTypes}
                onChange={value => setProfile(prev => ({ ...prev, preferredLocationTypes: value }))}
                placeholder="Riverwalk, oak trees, historic district"
                disabled={isLoading}
              />
              <TextField
                label="Avoid location types"
                value={profile.avoidLocationTypes}
                onChange={value => setProfile(prev => ({ ...prev, avoidLocationTypes: value }))}
                placeholder="Industrial, school campus, crowded malls"
                disabled={isLoading}
              />
              {profile.websiteSummary ? (
                <div className="rounded-lg border border-[#d8d2c8] bg-[#faf9f6] p-4 text-sm leading-6 text-[#1f2933] md:col-span-2">
                  <p className="mb-1 text-xs font-semibold uppercase tracking-[0.12em] text-[#7c6f64]">Website summary detected</p>
                  {profile.websiteSummary}
                </div>
              ) : null}
            </div>
          </Card>

          <Card className="border border-[#d8d2c8] bg-white shadow-sm">
            <div className="mb-5">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#7c6f64]">Client guide branding</p>
              <h2 className="mt-2 text-xl font-semibold text-[#1f2933]">Logo and color settings</h2>
              <p className="mt-2 text-sm leading-6 text-[#5f6b76]">
                These settings are applied automatically to new client guide links.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <TextField
                label="Guide logo URL"
                value={profile.guideLogoUrl}
                onChange={value => setProfile(prev => ({ ...prev, guideLogoUrl: value }))}
                placeholder="https://yourstudio.com/logo.png"
                disabled={isLoading}
                className="md:col-span-2"
              />
              <TextField
                label="Primary color"
                type="color"
                value={profile.guidePrimaryColor || '#1f2933'}
                onChange={value => setProfile(prev => ({ ...prev, guidePrimaryColor: value }))}
                placeholder="#1f2933"
                disabled={isLoading}
              />
              <TextField
                label="Accent color"
                type="color"
                value={profile.guideAccentColor || '#d8d2c8'}
                onChange={value => setProfile(prev => ({ ...prev, guideAccentColor: value }))}
                placeholder="#d8d2c8"
                disabled={isLoading}
              />
            </div>

            <div className="mt-5 overflow-hidden rounded-lg border border-[#d8d2c8] bg-[#faf9f6]">
              <div className="p-4 text-white" style={{ backgroundColor: profile.guidePrimaryColor || '#1f2933' }}>
                <div className="flex items-center gap-3">
                  {profile.guideLogoUrl ? (
                    <img src={profile.guideLogoUrl} alt="" className="h-10 w-10 rounded-md bg-white object-contain p-1" />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-md bg-white text-sm font-semibold text-[#1f2933]">
                      SP
                    </div>
                  )}
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: profile.guideAccentColor || '#d8d2c8' }}>
                      Client guide preview
                    </p>
                    <p className="text-lg font-semibold">{profile.businessName || 'Your Studio'}</p>
                  </div>
                </div>
              </div>
              <div className="p-4">
                <p className="text-sm font-semibold text-[#1f2933]">Family mini session at golden hour</p>
                <p className="mt-1 text-sm text-[#5f6b76]">Arrival, prep, timeline, and micro-logistics in one branded link.</p>
              </div>
            </div>
          </Card>

          <Card className="border border-[#d8d2c8] bg-white shadow-sm">
            <div className="mb-5">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#7c6f64]">Client experience defaults</p>
              <h2 className="mt-2 text-xl font-semibold text-[#1f2933]">Direction and prep guidance</h2>
            </div>
            <div className="grid grid-cols-1 gap-4">
              <TextAreaField
                label="Pose direction style"
                value={profile.poseDirectionStyle}
                onChange={value => setProfile(prev => ({ ...prev, poseDirectionStyle: value }))}
                placeholder="I prompt movement first, then dial into clean hero frames."
                disabled={isLoading}
                rows={4}
              />
              <TextAreaField
                label="Prep guide notes"
                value={profile.prepGuideNotes}
                onChange={value => setProfile(prev => ({ ...prev, prepGuideNotes: value }))}
                placeholder="Ask clients to bring neutral outfits and arrive 10 minutes early."
                disabled={isLoading}
                rows={4}
              />
            </div>
          </Card>
        </div>

        <aside className="space-y-6">
          <Card className="border border-[#d8d2c8] bg-[#faf9f6] shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#7c6f64]">AI context map</p>
            <h2 className="mt-2 text-xl font-semibold text-[#1f2933]">What the planner knows</h2>
            <div className="mt-5 space-y-3">
              {guidanceItems.map(item => (
                <div key={item.label} className="rounded-lg border border-[#d8d2c8] bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#7c6f64]">{item.label}</p>
                      <p className="mt-2 truncate text-sm font-medium text-[#1f2933]">{item.value}</p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${
                        item.complete ? 'bg-[#d9eee6] text-[#0f766e]' : 'bg-[#fff7ed] text-[#9a3412]'
                      }`}
                    >
                      {item.complete ? 'Set' : 'Open'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="border border-[#d8d2c8] bg-white shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#7c6f64]">Save changes</p>
            <h2 className="mt-2 text-xl font-semibold text-[#1f2933]">Profile sync</h2>
            <p className="mt-2 text-sm leading-6 text-[#5f6b76]">
              Saving updates the context used by AI session plans, shot suggestions, and generated client guidance.
            </p>
            <Button
              onClick={saveProfile}
              isLoading={isSaving}
              disabled={isLoading || isSaving}
              className="mt-5 w-full bg-[#1f2933] hover:bg-[#111827]"
            >
              Save business profile
            </Button>
          </Card>
        </aside>
      </div>
    </div>
  );
}
