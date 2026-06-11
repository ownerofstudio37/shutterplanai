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
      <div className="mb-4 hidden flex-wrap items-center justify-between gap-2 md:flex">
        <div className="flex flex-wrap gap-2">
          {tabs.map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => onSelectTab(tab.id)}
              className={`rounded-full px-3 py-1.5 text-sm font-medium ${
                activeReviewTab === tab.id ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          {feedbackSaveStatus === 'saving' && (
            <>
              <div className="h-2 w-2 animate-pulse rounded-full bg-blue-500"></div>
              <span>Saving feedback...</span>
            </>
          )}
          {feedbackSaveStatus === 'saved' && (
            <>
              <svg className="h-4 w-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="text-green-600">Feedback saved</span>
            </>
          )}
        </div>
      </div>

      <div className="mb-4 space-y-3 md:hidden">
        {tabs.map(tab => {
          const isOpen = activeMobileReviewTab === tab.id;

          return (
            <div key={`mobile-${tab.id}`} className="overflow-hidden rounded-xl border border-gray-200 bg-white">
              <button
                type="button"
                onClick={() => onToggleMobileTab(tab.id)}
                className="flex w-full items-center justify-between px-4 py-3 text-left"
              >
                <span className="text-sm font-semibold text-gray-900">{tab.label}</span>
                <span className="text-xs text-gray-500">{isOpen ? 'Hide' : 'Show'}</span>
              </button>

              {isOpen && <div className="border-t border-gray-100 px-4 py-4">{renderMobileContent(tab.id)}</div>}
            </div>
          );
        })}
      </div>

      <div className="hidden md:block">{desktopContent}</div>
    </>
  );
}
