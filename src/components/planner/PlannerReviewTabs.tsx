import type { ReactNode } from 'react';

type FeedbackSaveStatus = 'idle' | 'saving' | 'saved';

type PlannerReviewTabItem<T extends string> = {
  id: T;
  label: string;
};

type PlannerReviewTabsProps<T extends string> = {
  tabs: PlannerReviewTabItem<T>[];
  activeReviewTab: T;
  activeMobileReviewTab: T | null;
  onSelectTab: (tab: T) => void;
  onToggleMobileTab: (tab: T) => void;
  feedbackSaveStatus: FeedbackSaveStatus;
  renderMobileContent: (tab: T) => ReactNode;
  desktopContent: ReactNode;
};

export function PlannerReviewTabs<T extends string>({
  tabs,
  activeReviewTab,
  activeMobileReviewTab,
  onSelectTab,
  onToggleMobileTab,
  feedbackSaveStatus,
  renderMobileContent,
  desktopContent,
}: PlannerReviewTabsProps<T>) {
  return (
    <>
      <div className="mb-4 hidden items-start justify-between gap-4 border-b border-[#e4ded5] pb-4 md:flex">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#7c6f64]">Review workbench</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {tabs.map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => onSelectTab(tab.id)}
                className={`rounded-lg border px-3 py-2 text-sm font-semibold transition ${
                  activeReviewTab === tab.id
                    ? 'border-[#1f2933] bg-[#1f2933] text-white'
                    : 'border-[#d8d2c8] bg-white text-[#5f6b76] hover:border-[#1f2933] hover:text-[#1f2933]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="min-h-8 rounded-md border border-[#e4ded5] bg-[#faf9f6] px-3 py-2 text-xs text-[#5f6b76]">
          {feedbackSaveStatus === 'saving' && (
            <div className="flex items-center gap-1.5">
              <div className="h-2 w-2 animate-pulse rounded-full bg-blue-500"></div>
              <span>Saving feedback...</span>
            </div>
          )}
          {feedbackSaveStatus === 'saved' && (
            <div className="flex items-center gap-1.5 text-emerald-700">
              <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
              <span>Feedback saved</span>
            </div>
          )}
          {feedbackSaveStatus === 'idle' && <span>Feedback ready</span>}
        </div>
      </div>

      <div className="mb-4 space-y-3 md:hidden">
        <div className="rounded-lg border border-[#d8d2c8] bg-[#faf9f6] px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#7c6f64]">Review workbench</p>
          <p className="mt-1 text-sm text-[#5f6b76]">Open each section to inspect the plan before creating the project.</p>
        </div>
        {tabs.map(tab => {
          const isOpen = activeMobileReviewTab === tab.id;

          return (
            <div key={`mobile-${tab.id}`} className="overflow-hidden rounded-lg border border-[#d8d2c8] bg-white">
              <button
                type="button"
                onClick={() => onToggleMobileTab(tab.id)}
                className={`flex w-full items-center justify-between px-4 py-3 text-left transition ${
                  isOpen ? 'bg-[#1f2933] text-white' : 'bg-white text-[#1f2933]'
                }`}
              >
                <span className="text-sm font-semibold">{tab.label}</span>
                <span className={`text-xs ${isOpen ? 'text-[#d1d5db]' : 'text-[#5f6b76]'}`}>{isOpen ? 'Hide' : 'Show'}</span>
              </button>

              {isOpen && <div className="border-t border-[#e4ded5] bg-[#faf9f6] px-4 py-4">{renderMobileContent(tab.id)}</div>}
            </div>
          );
        })}
      </div>

      <div className="hidden md:block">{desktopContent}</div>
    </>
  );
}
