import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

type PlannerIntelligence = {
  goldenHours: {
    sunrise: string;
    sunset: string;
    goldenHourStart: string;
    goldenHourEnd: string;
  };
  optimizedRoute: number[];
};

type PlanningSourceExplanation = {
  tone: 'emerald' | 'blue' | 'amber';
  title: string;
  body: string;
};

type PlannerDiagnostics = {
  locationSource?: string;
  locationCandidateCount?: number;
  resolvedCity?: string;
  usedBusinessZipDisambiguation?: boolean;
  businessGeoAnchorSource?: string;
};

type PlannerReviewHeaderCardProps = {
  projectTitle: string;
  creativeDirection: string;
  workflowStage: 'intake' | 'review' | 'apply';
  diagnostics?: PlannerDiagnostics;
  shootType: string;
  locationMode: 'find-locations' | 'use-provided';
  isEditMode: boolean;
  onToggleEditMode: () => void;
  isCreatingShareLink: boolean;
  onCreateShareLink: () => void;
  isRefining: boolean;
  onRefinePlan: () => void;
  isApplying: boolean;
  onApplyPlan: () => void;
  planningSourceExplanation?: PlanningSourceExplanation | null;
  isLoadingIntelligence: boolean;
  intelligence?: PlannerIntelligence | null;
  onApplyOptimizedRouteOrder: () => void;
  shareUrl: string;
  onCopyShareLink: () => void;
  shareLinkError: string;
  shotCount: number;
  expectedShotRange: { min: number; max: number };
  durationMinutes: number;
};

export function PlannerReviewHeaderCard({
  projectTitle,
  creativeDirection,
  workflowStage,
  diagnostics,
  shootType,
  locationMode,
  isEditMode,
  onToggleEditMode,
  isCreatingShareLink,
  onCreateShareLink,
  isRefining,
  onRefinePlan,
  isApplying,
  onApplyPlan,
  planningSourceExplanation,
  isLoadingIntelligence,
  intelligence,
  onApplyOptimizedRouteOrder,
  shareUrl,
  onCopyShareLink,
  shareLinkError,
  shotCount,
  expectedShotRange,
  durationMinutes,
}: PlannerReviewHeaderCardProps) {
  return (
    <Card>
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{projectTitle}</h3>
          <p className="text-sm text-gray-600">{creativeDirection}</p>
          <div className="mt-2 flex flex-wrap gap-2 text-xs">
            <span className={`rounded-full px-2 py-1 font-medium ${workflowStage === 'apply' ? 'bg-violet-50 text-violet-700' : 'bg-blue-50 text-blue-700'}`}>
              Current stage: {workflowStage === 'apply' ? 'Apply to Project' : 'Plan Review'}
            </span>
            <span className="rounded-full bg-blue-50 px-2 py-1 font-medium text-blue-700">
              Location source: {diagnostics?.locationSource || 'unknown'}
            </span>
            <span className="rounded-full bg-indigo-50 px-2 py-1 font-medium text-indigo-700">Session: {shootType}</span>
            <span className="rounded-full bg-emerald-50 px-2 py-1 font-medium text-emerald-700">
              Mode: {locationMode === 'use-provided' ? 'Using provided locations' : 'Find locations'}
            </span>
            <span className="rounded-full bg-gray-100 px-2 py-1 font-medium text-gray-700">
              Candidates: {diagnostics?.locationCandidateCount ?? 0}
            </span>
            <span className="rounded-full bg-gray-100 px-2 py-1 font-medium text-gray-700">
              Resolved city: {diagnostics?.resolvedCity || 'N/A'}
            </span>
            {diagnostics?.usedBusinessZipDisambiguation && (
              <span className="rounded-full bg-emerald-50 px-2 py-1 font-medium text-emerald-700">
                Disambiguated with business anchor: {diagnostics.businessGeoAnchorSource || 'account location'}
              </span>
            )}
          </div>
        </div>
        <div className="hidden gap-2 md:flex">
          <Button variant="ghost" onClick={onToggleEditMode}>{isEditMode ? 'Done editing' : 'Edit output'}</Button>
          <Button variant="ghost" isLoading={isCreatingShareLink} onClick={onCreateShareLink}>
            {isCreatingShareLink ? 'Creating link...' : 'Create share link'}
          </Button>
          <Button variant="ghost" isLoading={isRefining} onClick={onRefinePlan}>
            {isRefining ? 'Refining...' : 'Refine Plan'}
          </Button>
          <Button variant="secondary" isLoading={isApplying} onClick={onApplyPlan}>
            {isApplying ? 'Applying...' : 'Create Project + Shot List'}
          </Button>
          <Link href="/dashboard/shot-board">
            <Button variant="ghost">Open Shot Board</Button>
          </Link>
        </div>
      </div>

      {planningSourceExplanation && (
        <div
          className={`mb-3 rounded-lg px-4 py-3 text-sm ${
            planningSourceExplanation.tone === 'emerald'
              ? 'border border-emerald-200 bg-emerald-50 text-emerald-900'
              : planningSourceExplanation.tone === 'blue'
                ? 'border border-blue-200 bg-blue-50 text-blue-900'
                : 'border border-amber-200 bg-amber-50 text-amber-900'
          }`}
        >
          <p className="font-semibold">{planningSourceExplanation.title}</p>
          <p className="mt-1">{planningSourceExplanation.body}</p>
        </div>
      )}

      {isRefining && (
        <div className="mb-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
          Refining the current plan now. Review scores and backup guidance will update when the pass finishes.
        </div>
      )}

      {isLoadingIntelligence && (
        <div className="mb-3 rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm text-indigo-900">
          Computing weather, sun window, and route intelligence…
        </div>
      )}

      {intelligence && (
        <div className="mb-3 rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm text-indigo-900">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="rounded-full bg-white px-2 py-1 font-medium text-indigo-700">
                Golden hour: {new Date(intelligence.goldenHours.goldenHourStart).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                {' '}
                - {new Date(intelligence.goldenHours.goldenHourEnd).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
              </span>
              <span className="rounded-full bg-white px-2 py-1 font-medium text-indigo-700">
                Sunrise: {new Date(intelligence.goldenHours.sunrise).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
              </span>
              <span className="rounded-full bg-white px-2 py-1 font-medium text-indigo-700">
                Sunset: {new Date(intelligence.goldenHours.sunset).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
              </span>
            </div>
            {intelligence.optimizedRoute.length > 1 && (
              <Button variant="secondary" onClick={onApplyOptimizedRouteOrder}>Apply optimized route order</Button>
            )}
          </div>
        </div>
      )}

      {shareUrl && (
        <div className="mb-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          <p className="font-semibold">Share link ready</p>
          <div className="mt-2 flex flex-col gap-2 md:flex-row md:items-center">
            <input title="Share URL" readOnly value={shareUrl} className="w-full rounded border border-emerald-300 bg-white px-2 py-1 text-xs text-emerald-900" />
            <Button variant="secondary" onClick={onCopyShareLink}>Copy link</Button>
          </div>
        </div>
      )}

      {shareLinkError && (
        <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{shareLinkError}</div>
      )}

      {(diagnostics?.locationSource !== 'grounded-candidates' ||
        (diagnostics?.locationCandidateCount ?? 0) < 3 ||
        shotCount < expectedShotRange.min ||
        shotCount > expectedShotRange.max) && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <p className="font-semibold">Validation warnings</p>
          <ul className="mt-1 list-disc space-y-1 pl-5">
            {diagnostics?.locationSource !== 'grounded-candidates' && (
              <li>Location plan is using fallback mode, not fully grounded candidates.</li>
            )}
            {(diagnostics?.locationCandidateCount ?? 0) < 3 && (
              <li>Fewer than 3 real location candidates found. Consider a broader nearby city or ZIP.</li>
            )}
            {shotCount < expectedShotRange.min || shotCount > expectedShotRange.max ? (
              <li>
                Shot count ({shotCount}) is outside expected {expectedShotRange.min}-{expectedShotRange.max}
                {' '}for {durationMinutes} minutes.
              </li>
            ) : null}
          </ul>
        </div>
      )}
    </Card>
  );
}
