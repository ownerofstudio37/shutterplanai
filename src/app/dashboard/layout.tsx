'use client';

import { ReactNode, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/Button';

interface DashboardLayoutProps {
  children: ReactNode;
}

const navItems = [
  { href: '/dashboard', label: 'Command Center', eyebrow: 'Overview' },
  { href: '/dashboard/planner', label: 'AI Planner', eyebrow: 'Pre-production' },
  { href: '/dashboard/projects', label: 'Projects', eyebrow: 'Client work' },
  { href: '/dashboard/locations', label: 'Location Atlas', eyebrow: 'Micro-spots' },
  { href: '/dashboard/calendar', label: 'Sun Calendar', eyebrow: 'Telemetry' },
  { href: '/dashboard/shots', label: 'Shot Library', eyebrow: 'Coverage' },
  { href: '/dashboard/shot-board', label: 'Client Guides', eyebrow: 'Export' },
  { href: '/dashboard/settings', label: 'Studio Settings', eyebrow: 'Profile' },
];

function getPageTitle(pathname: string | null) {
  if (!pathname) return 'Command Center';

  const current = navItems
    .filter(item => pathname === item.href || pathname.startsWith(`${item.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0];

  return current?.label ?? 'Command Center';
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user, logout, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/auth/login');
    }
  }, [isLoading, router, user]);

  const handleLogout = async () => {
    await logout();
    router.push('/auth/login');
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f6f3ee]">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-[#d7d1c7] border-t-[#1f2933]" />
          <p className="mt-4 text-sm font-medium text-[#5f6b76]">Opening studio workspace...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f6f3ee]">
        <p className="text-sm text-[#5f6b76]">Redirecting to login...</p>
      </div>
    );
  }

  const firstName = user.name.split(' ')[0] || 'there';
  const pageTitle = getPageTitle(pathname);
  const isPlannerRoute = Boolean(pathname?.startsWith('/dashboard/planner'));

  return (
    <div className={`min-h-screen text-[#1f2933] ${isPlannerRoute ? 'bg-[#08090b]' : 'bg-[#f6f3ee]'}`}>
      <div className={`grid min-h-screen ${isPlannerRoute ? 'lg:grid-cols-[64px_1fr]' : 'lg:grid-cols-[280px_1fr]'}`}>
        <aside className={`border-b text-white lg:border-b-0 lg:border-r ${
          isPlannerRoute ? 'border-white/5 bg-[#08090b]' : 'border-[#ded8ce] bg-[#111827]'
        }`}>
          <div className="flex flex-col lg:h-full">
            <div className={`border-b border-white/10 px-4 py-4 ${isPlannerRoute ? 'lg:px-3 lg:py-5' : 'lg:px-5 lg:py-5'}`}>
              <Link href="/dashboard" className="block">
                <p className={`text-[11px] font-semibold uppercase tracking-[0.18em] text-[#9ca3af] ${isPlannerRoute ? 'lg:hidden' : ''}`}>
                  ShutterPlan AI
                </p>
                <h1 className={`mt-2 text-xl font-semibold tracking-normal text-white ${isPlannerRoute ? 'lg:hidden' : ''}`}>
                  Studio Ops
                </h1>
                {isPlannerRoute && (
                  <span className="hidden h-9 w-9 items-center justify-center rounded-full bg-white text-sm font-semibold text-[#08090b] lg:flex">
                    S
                  </span>
                )}
              </Link>
            </div>

            <nav className={`grid grid-cols-2 gap-2 px-3 py-3 sm:grid-cols-4 lg:flex-1 lg:overflow-y-auto ${
              isPlannerRoute ? 'lg:flex lg:grid-cols-none lg:flex-col lg:items-center lg:gap-3 lg:px-2 lg:py-4' : 'lg:block lg:space-y-1 lg:py-4'
            }`}>
              {navItems.map(item => {
                const isActive = pathname === item.href || Boolean(pathname?.startsWith(`${item.href}/`));

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={item.label}
                    className={`block rounded-lg border transition-colors ${
                      isPlannerRoute
                        ? `flex h-10 w-10 items-center justify-center px-0 py-0 ${
                            isActive
                              ? 'border-white/10 bg-white/10 text-white shadow-sm'
                              : 'border-transparent text-[#a1a1aa] hover:border-white/10 hover:bg-white/5 hover:text-white'
                          }`
                        : `px-3 py-3 ${
                            isActive
                              ? 'border-white/15 bg-white text-[#111827] shadow-sm'
                              : 'border-transparent text-[#d1d5db] hover:border-white/10 hover:bg-white/10 hover:text-white'
                          }`
                    }`}
                  >
                    {isPlannerRoute ? (
                      <span className="text-xs font-semibold">{item.label.slice(0, 1)}</span>
                    ) : (
                      <>
                        <span className={`block text-[10px] font-semibold uppercase tracking-[0.14em] ${
                          isActive ? 'text-[#64748b]' : 'text-[#8b95a1]'
                        }`}>
                          {item.eyebrow}
                        </span>
                        <span className="mt-1 block text-sm font-semibold">{item.label}</span>
                      </>
                    )}
                  </Link>
                );
              })}
            </nav>

            <div className={`hidden border-t border-white/10 lg:block ${isPlannerRoute ? 'p-2' : 'p-4'}`}>
              <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                <p className={`text-sm font-semibold text-white ${isPlannerRoute ? 'sr-only' : ''}`}>{user.name}</p>
                <p className={`mt-1 truncate text-xs text-[#9ca3af] ${isPlannerRoute ? 'sr-only' : ''}`}>{user.email}</p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLogout}
                  className={`${isPlannerRoute ? 'mt-0 h-9 w-9 px-0 text-xs' : 'mt-3 w-full'} border border-white/10 text-white hover:bg-white/10`}
                >
                  {isPlannerRoute ? 'Out' : 'Sign out'}
                </Button>
              </div>
            </div>
          </div>
        </aside>

        <main className="min-w-0">
          {!isPlannerRoute && (
            <header className="sticky top-0 z-20 border-b border-[#ded8ce] bg-[#f6f3ee]/95 px-4 py-4 backdrop-blur md:px-8">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#7c6f64]">
                    {new Date().toLocaleDateString(undefined, {
                      weekday: 'long',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </p>
                  <h2 className="mt-1 text-2xl font-semibold tracking-normal text-[#1f2933]">
                    {pageTitle}
                  </h2>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="min-h-10 rounded-md border border-[#d8d2c8] bg-white px-3 py-2 text-sm text-[#5f6b76]">
                    Welcome back, {firstName}
                  </span>
                  <Link href="/dashboard/planner">
                    <Button className="bg-[#1f2933] hover:bg-[#111827]">Plan a shoot</Button>
                  </Link>
                </div>
              </div>
            </header>
          )}

          <div className={isPlannerRoute ? 'min-h-screen' : 'px-4 py-5 md:px-8 md:py-7'}>{children}</div>
        </main>
      </div>
    </div>
  );
}
