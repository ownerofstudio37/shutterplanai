'use client';

import { Button } from '@/components/ui/Button';

type RefinementIncentiveBannerProps = {
  isRefining: boolean;
  onRefinePlan: () => void;
};

const BULLETS = [
  { icon: '⛅', text: 'Golden-hour & weather timing for each location' },
  { icon: '🚗', text: 'Parking difficulty and crowd-risk scores' },
  { icon: '📍', text: 'Optimised route order to minimise drive time' },
];

/**
 * Shown once after a plan is generated — before the user has refined it.
 * Teases what the "Refine" action unlocks and nudges the user to try it.
 */
export function RefinementIncentiveBanner({ isRefining, onRefinePlan }: RefinementIncentiveBannerProps) {
  return (
    <div className="rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-indigo-900">
            💡 Tip — refine your plan for deeper insights
          </p>
          <ul className="mt-1.5 space-y-1">
            {BULLETS.map(bullet => (
              <li key={bullet.text} className="flex items-start gap-1.5 text-xs text-indigo-700">
                <span className="mt-px shrink-0">{bullet.icon}</span>
                <span>{bullet.text}</span>
              </li>
            ))}
          </ul>
        </div>
        <Button
          variant="secondary"
          isLoading={isRefining}
          onClick={onRefinePlan}
          className="shrink-0 self-start sm:self-center"
        >
          Refine for insights →
        </Button>
      </div>
    </div>
  );
}
