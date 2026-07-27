import { Button } from '@/components/ui/Button';

type PlannerEntryMode = 'chat' | 'manual';

type PlannerAssistantHeroProps = {
  mode: PlannerEntryMode;
  onModeChange: (mode: PlannerEntryMode) => void;
};

const flowSteps = [
  ['Find', 'AI location candidates ranked by style, logistics, sun, and weather risk.'],
  ['Map', 'Choose one location, then tune exact micro-spots, parking, resets, and walking order.'],
  ['Match', 'Turn client deliverables into a shot list with poses, angles, lens notes, and timing.'],
  ['Guide', 'Package the photographer plan and client prep summary from the same source data.'],
];

export function PlannerAssistantHero({ mode, onModeChange }: PlannerAssistantHeroProps) {
  return (
    <section className="overflow-hidden rounded-lg bg-[#1f2933] text-white shadow-sm">
      <div className="grid gap-6 p-5 md:p-7 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#d8d2c8]">AI shoot planning partner</p>
          <h1 className="mt-3 max-w-4xl text-3xl font-semibold tracking-normal md:text-5xl">
            Start with a shoot idea. Leave with the location, micro-spots, shot flow, and client guide.
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-6 text-[#e8e1d7] md:text-base">
            Chat through the plan naturally, or switch to manual mode when you already know the details.
          </p>
          <div className="mt-6 inline-grid rounded-lg border border-white/15 bg-white/10 p-1 sm:grid-cols-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onModeChange('chat')}
              className={`justify-start px-4 text-white hover:bg-white/10 ${mode === 'chat' ? 'bg-white text-[#1f2933] hover:bg-white' : ''}`}
            >
              Chat planner
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onModeChange('manual')}
              className={`justify-start px-4 text-white hover:bg-white/10 ${mode === 'manual' ? 'bg-white text-[#1f2933] hover:bg-white' : ''}`}
            >
              Manual builder
            </Button>
          </div>
        </div>

        <div className="grid gap-2">
          {flowSteps.map(([label, detail]) => (
            <div key={label} className="rounded-lg border border-white/10 bg-white/10 px-4 py-3">
              <p className="text-sm font-semibold text-white">{label}</p>
              <p className="mt-1 text-xs leading-5 text-[#d8d2c8]">{detail}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
