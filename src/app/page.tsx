'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';

const workflowCards = [
  {
    label: 'AI brief',
    title: 'Family session, five people, two toddlers',
    meta: 'Shot list, pacing, prep notes',
  },
  {
    label: 'Micro-logistics',
    title: 'Willow tree by the lake, south parking lot',
    meta: '0.2 mi walk, restroom nearby',
  },
  {
    label: 'Client guide',
    title: 'Arrival link, timeline, wardrobe direction',
    meta: 'Ready to send',
  },
];

const features = [
  ['AI timelines', 'Turn a rough shoot brief into a paced plan with shot priorities, breaks, and client prep.'],
  ['Location shortlisting', 'Let AI surface 6-10 options, then choose the real 1-3 stops for the shoot.'],
  ['Micro-location maps', 'Tune exact spots, parking anchors, walking order, backgrounds, and restroom logistics.'],
  ['Sun-aware planning', 'Keep shoot timing, calendar context, and field constraints visible before the day gets busy.'],
  ['Client handoff', 'Generate a polished mobile guide that gets clients to the right place with the right expectations.'],
];

const routeSteps = [
  ['1', 'AI finds candidates', 'Compare parks, downtown blocks, venues, and backup options with logistics context.'],
  ['2', 'Photographer chooses stops', 'Pick the final route count during intake, then shortlist the actual shoot locations.'],
  ['3', 'Micro-spots get mapped', 'Edit exact locations, walking order, reset points, and client arrival guidance.'],
  ['4', 'Guide goes out prepared', 'Send a mobile guide with arrival map, timeline, wardrobe notes, and route clarity.'],
];

export default function Home() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && user) {
      router.push('/dashboard');
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#faf9f6]">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-2 border-[#d8d2c8] border-b-[#1f2933]" />
          <p className="mt-4 text-sm font-medium text-[#5f6b76]">Loading ShutterPlan...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#f4f1ec] text-[#1f2933]">
      <section className="relative overflow-hidden bg-[#1f2933] text-white">
        <div
          className="absolute inset-0 opacity-35"
          style={{
            backgroundImage:
              "url('https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1800&q=80')",
            backgroundPosition: 'center',
            backgroundSize: 'cover',
          }}
        />
        <div className="absolute inset-0 bg-[#1f2933]/75" />

        <nav className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-5 py-5 md:px-8">
          <Link href="/" className="text-lg font-semibold tracking-normal text-white">
            ShutterPlan AI
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/auth/login" className="text-sm font-semibold text-[#d8d2c8] transition hover:text-white">
              Sign in
            </Link>
            <Link
              href="/auth/signup"
              className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-[#1f2933] transition hover:bg-[#faf9f6]"
            >
              Start free
            </Link>
          </div>
        </nav>

        <div className="relative z-10 mx-auto grid min-h-[calc(100vh-5rem)] max-w-7xl items-center gap-10 px-5 pb-16 pt-8 md:px-8 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#d8d2c8]">One planning workspace for photographers</p>
            <h1 className="mt-5 max-w-4xl text-5xl font-semibold tracking-normal md:text-7xl">
              Fewer apps. Faster plans. Better-prepared clients.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-[#e8e1d7] md:text-lg">
              ShutterPlan AI replaces tab-juggling with one flow for location candidates, route decisions, exact micro-spots, and a client-ready guide.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/auth/signup">
                <Button size="lg" className="w-full bg-white text-[#1f2933] hover:bg-[#faf9f6] sm:w-auto">
                  Start planning
                </Button>
              </Link>
              <Link
                href="/auth/login"
                className="rounded-lg border border-white/20 px-6 py-3 text-center text-lg font-medium text-white transition hover:bg-white/10"
              >
                Sign in
              </Link>
            </div>
            <div className="mt-10 grid max-w-2xl grid-cols-3 gap-3">
              {[
                ['4', 'core planning tools'],
                ['1', 'client-ready handoff'],
                ['0', 'copy-paste planning'],
              ].map(([value, label]) => (
                <div key={label} className="rounded-lg border border-white/10 bg-white/10 p-4">
                  <p className="text-2xl font-semibold text-white">{value}</p>
                  <p className="mt-1 text-xs font-medium uppercase tracking-[0.12em] text-[#d8d2c8]">{label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-white/10 bg-white/10 p-4 shadow-2xl backdrop-blur">
            <div className="rounded-lg bg-[#faf9f6] p-4 text-[#1f2933]">
              <div className="flex items-start justify-between gap-4 border-b border-[#d8d2c8] pb-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#7c6f64]">Tomorrow at golden hour</p>
                  <h2 className="mt-2 text-2xl font-semibold">The Dawson family</h2>
                </div>
                <span className="rounded-full bg-[#d9eee6] px-3 py-1 text-xs font-semibold text-[#0f766e]">Ready</span>
              </div>
              <div className="mt-4 space-y-3">
                {workflowCards.map(card => (
                  <div key={card.label} className="rounded-lg border border-[#d8d2c8] bg-white p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#7c6f64]">{card.label}</p>
                    <p className="mt-2 text-sm font-semibold text-[#1f2933]">{card.title}</p>
                    <p className="mt-1 text-sm text-[#5f6b76]">{card.meta}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2">
                {['Timeline', 'Map pins', 'Guide'].map(item => (
                  <div key={item} className="rounded-md bg-[#ece7df] px-3 py-2 text-center text-xs font-semibold text-[#5f6b76]">
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-14 md:px-8">
        <div className="mb-8 max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#7c6f64]">Planner upgrade</p>
          <h2 className="mt-2 text-3xl font-semibold text-[#1f2933]">AI gathers the messy details. You choose the route.</h2>
          <p className="mt-3 text-sm leading-6 text-[#5f6b76]">
            Stop bouncing between maps, notes, weather, and client emails. ShutterPlan separates discovery from final route selection so the guide reflects the places clients will actually visit.
          </p>
        </div>
        <div className="mb-12 grid gap-3 md:grid-cols-4">
          {routeSteps.map(([step, title, description]) => (
            <div key={title} className="rounded-lg border border-[#d8d2c8] bg-white p-5 shadow-sm">
              <span className="flex h-8 w-8 items-center justify-center rounded-md bg-[#1f2933] text-sm font-semibold text-white">
                {step}
              </span>
              <h3 className="mt-4 text-lg font-semibold text-[#1f2933]">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-[#5f6b76]">{description}</p>
            </div>
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {features.map(([title, description]) => (
            <div key={title} className="rounded-lg border border-[#d8d2c8] bg-white p-5 shadow-sm">
              <h3 className="text-lg font-semibold text-[#1f2933]">{title}</h3>
              <p className="mt-3 text-sm leading-6 text-[#5f6b76]">{description}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
