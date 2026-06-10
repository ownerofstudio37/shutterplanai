'use client';

import { ReactNode, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';

interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user, logout, isLoading } = useAuth();
  const router = useRouter();

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
      <div className="flex min-h-screen items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100">
        <p className="text-gray-600">Redirecting to login...</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <aside className="relative flex w-64 flex-col bg-white shadow-lg">
        <div className="p-6 border-b">
          <h1 className="text-2xl font-bold text-blue-600">ShutterPlan</h1>
          <p className="text-sm text-gray-600 mt-1">Photography Planning</p>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          <Link
            href="/dashboard"
            className="block px-4 py-2 text-gray-700 hover:bg-blue-50 rounded-lg transition-colors"
          >
            Dashboard
          </Link>
          <Link
            href="/dashboard/projects"
            className="block px-4 py-2 text-gray-700 hover:bg-blue-50 rounded-lg transition-colors"
          >
            Projects
          </Link>
          <Link
            href="/dashboard/shots"
            className="block px-4 py-2 text-gray-700 hover:bg-blue-50 rounded-lg transition-colors"
          >
            Shots
          </Link>
          <Link
            href="/dashboard/locations"
            className="block px-4 py-2 text-gray-700 hover:bg-blue-50 rounded-lg transition-colors"
          >
            Locations
          </Link>
          <Link
            href="/dashboard/calendar"
            className="block px-4 py-2 text-gray-700 hover:bg-blue-50 rounded-lg transition-colors"
          >
            Calendar
          </Link>
          <Link
            href="/dashboard/shot-board"
            className="block px-4 py-2 text-gray-700 hover:bg-blue-50 rounded-lg transition-colors"
          >
            Shot Board
          </Link>
          <Link
            href="/dashboard/settings"
            className="block px-4 py-2 text-gray-700 hover:bg-blue-50 rounded-lg transition-colors"
          >
            Settings
          </Link>
        </nav>

        <div className="p-4 border-t bg-gray-50">
          <div className="mb-4">
            <p className="text-sm font-medium text-gray-900">{user.name}</p>
            <p className="text-xs text-gray-600">{user.email}</p>
          </div>
          <Button variant="secondary" size="sm" onClick={handleLogout} className="w-full">
            Logout
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {/* Header */}
        <header className="bg-white shadow-sm px-6 py-4 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900">Welcome back, {user.name.split(' ')[0]}!</h2>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">{new Date().toLocaleDateString()}</span>
          </div>
        </header>

        {/* Content */}
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
