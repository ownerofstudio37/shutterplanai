import { Button } from '@/components/ui/Button';

type DraftResumeBannerProps = {
  updatedAt: string;
  shootType: string;
  hasWorkspacePlan?: boolean;
  versionCount?: number;
  messageCount?: number;
  locationCount?: number;
  shotCount?: number;
  onDiscard: () => void;
  onResume: () => void;
};

export function DraftResumeBanner({
  updatedAt,
  shootType,
  hasWorkspacePlan = false,
  versionCount = 0,
  messageCount = 0,
  locationCount = 0,
  shotCount = 0,
  onDiscard,
  onResume,
}: DraftResumeBannerProps) {
  const savedAt = new Date(updatedAt).toLocaleString();

  return (
    <div className={`mb-4 rounded-2xl border p-4 ${
      hasWorkspacePlan
        ? 'border-white/10 bg-white/5 text-white'
        : 'border-amber-200 bg-amber-50 text-amber-950'
    }`}>
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className={`text-xs font-semibold uppercase tracking-[0.16em] ${hasWorkspacePlan ? 'text-[#8f95a3]' : 'text-amber-800'}`}>
            {hasWorkspacePlan ? 'Saved planning workspace' : 'Saved planning brief'}
          </p>
          <p className={`mt-1 text-sm font-semibold ${hasWorkspacePlan ? 'text-[#eef1f7]' : 'text-amber-950'}`}>
            {hasWorkspacePlan ? 'Resume your full AI plan' : 'Resume your last planner draft'}
          </p>
          <p className={`mt-1 text-xs ${hasWorkspacePlan ? 'text-[#aeb4c0]' : 'text-amber-800'}`}>
            Saved {savedAt} for {shootType}
          </p>
          {hasWorkspacePlan && (
            <div className="mt-3 flex flex-wrap gap-2">
              {[
                `${locationCount} location${locationCount === 1 ? '' : 's'}`,
                `${shotCount} shot${shotCount === 1 ? '' : 's'}`,
                `${messageCount} chat message${messageCount === 1 ? '' : 's'}`,
                `${versionCount} version${versionCount === 1 ? '' : 's'}`,
              ].map(item => (
                <span key={item} className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-medium text-[#d7dce7]">
                  {item}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            onClick={onDiscard}
            className={hasWorkspacePlan ? 'border border-white/10 bg-white/5 text-white hover:bg-white/10' : 'bg-white hover:bg-amber-100'}
          >
            Start fresh
          </Button>
          <Button onClick={onResume} className={hasWorkspacePlan ? 'bg-white text-[#111827] hover:bg-[#e6e8ee]' : 'bg-[#1f2933] hover:bg-[#111827]'}>
            {hasWorkspacePlan ? 'Resume full plan' : 'Resume draft'}
          </Button>
        </div>
      </div>
    </div>
  );
}
