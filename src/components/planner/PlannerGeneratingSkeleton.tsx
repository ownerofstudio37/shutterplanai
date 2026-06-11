import { Card } from '@/components/ui/Card';

function SkeletonBar({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-gray-200 ${className}`.trim()} />;
}

export function PlannerGeneratingSkeleton() {
  return (
    <>
      <Card>
        <div className="space-y-4">
          <div>
            <p className="text-sm font-semibold text-gray-900">Building your plan</p>
            <p className="text-sm text-gray-600">
              Grounding the session with real locations, then assembling the review tabs.
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {['Checking your intake answers', 'Searching location candidates', 'Drafting timeline + shot flow'].map(step => (
              <div key={step} className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                <p className="mb-3 text-sm font-medium text-gray-700">{step}</p>
                <SkeletonBar className="h-3 w-3/4" />
                <SkeletonBar className="mt-2 h-3 w-full" />
                <SkeletonBar className="mt-2 h-3 w-5/6" />
              </div>
            ))}
          </div>
        </div>
      </Card>

      <Card>
        <div className="space-y-4">
          <SkeletonBar className="h-5 w-48" />
          <div className="grid gap-3 lg:grid-cols-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={`plan-skeleton-${index}`} className="rounded-xl border border-gray-200 p-4">
                <SkeletonBar className="h-4 w-2/3" />
                <SkeletonBar className="mt-3 h-3 w-full" />
                <SkeletonBar className="mt-2 h-3 w-11/12" />
                <SkeletonBar className="mt-4 h-16 w-full" />
              </div>
            ))}
          </div>
        </div>
      </Card>
    </>
  );
}
