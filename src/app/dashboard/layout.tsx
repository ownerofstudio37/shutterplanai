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

  return (
    <div className="min-h-screen bg-[#f6f3ee] text-[#1f2933]">
      <div className="grid min-h-screen lg:grid-cols-[280px_1fr]">
        <aside className="border-r border-[#ded8ce] bg-[#111827] text-white">
          <div className="flex h-full flex-col">
            <div className="border-b border-white/10 px-5 py-5">
              <Link href="/dashboard" className="block">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#9ca3af]">
                  ShutterPlan AI
                </p>
                <h1 className="mt-2 text-xl font-semibold tracking-normal text-white">
                  Studio Ops
                </h1>
              </Link>
            </div>

            <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
              {navItems.map(item => {
                const isActive = pathname === item.href || Boolean(pathname?.startsWith(`${item.href}/`));

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`block rounded-lg border px-3 py-3 transition-colors ${
                      isActive
                        ? 'border-white/15 bg-white text-[#111827] shadow-sm'
                        : 'border-transparent text-[#d1d5db] hover:border-white/10 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <span className={`block text-[10px] font-semibold uppercase tracking-[0.14em] ${
                      isActive ? 'text-[#64748b]' : 'text-[#8b95a1]'
                    }`}>
                      {item.eyebrow}
                    </span>
                    <span className="mt-1 block text-sm font-semibold">{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            <div className="border-t border-white/10 p-4">
              <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                <p className="text-sm font-semibold text-white">{user.name}</p>
                <p className="mt-1 truncate text-xs text-[#9ca3af]">{user.email}</p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLogout}
                  className="mt-3 w-full border border-white/10 text-white hover:bg-white/10"
                >
                  Sign out
                </Button>
              </div>
            </div>
          </div>
        </aside>

        <main className="min-w-0">
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
                <span className="rounded-md border border-[#d8d2c8] bg-white px-3 py-2 text-sm text-[#5f6b76]">
                  Welcome back, {firstName}
                </span>
                <Link href="/dashboard/planner">
                  <Button className="bg-[#1f2933] hover:bg-[#111827]">Plan a shoot</Button>
                </Link>
              </div>
            </div>
          </header>

          <div className="px-4 py-5 md:px-8 md:py-7">{children}</div>
        </main>
      </div>
    </div>
  );
}
