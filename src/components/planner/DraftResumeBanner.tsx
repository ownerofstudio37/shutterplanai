import { Button } from '@/components/ui/Button';

type DraftResumeBannerProps = {
  updatedAt: string;
  shootType: string;
  onDiscard: () => void;
  onResume: () => void;
};

export function DraftResumeBanner({ updatedAt, shootType, onDiscard, onResume }: DraftResumeBannerProps) {
  return (
    <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-semibold text-amber-900">Resume your last planner draft</p>
          <p className="mt-1 text-xs text-amber-800">Saved {new Date(updatedAt).toLocaleString()} • {shootType}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={onDiscard}>Discard draft</Button>
          <Button onClick={onResume}>Resume draft</Button>
        </div>
      </div>
    </div>
  );
}
