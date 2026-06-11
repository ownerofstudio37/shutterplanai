'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';

const planningSignals = ['AI shoot plans', 'Location atlas', 'Client guides'];

function inputClass() {
  return 'mt-2 w-full rounded-lg border border-[#d8d2c8] bg-white px-4 py-3 text-sm text-[#1f2933] shadow-sm outline-none transition placeholder:text-[#9a9187] focus:border-[#1f2933] focus:ring-2 focus:ring-[#1f2933]/10 disabled:bg-[#f4f1ec]';
}

export default function LoginPage() {
  const router = useRouter();
  const { login, isLoading, error } = useAuth();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [formError, setFormError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setFormError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email || !formData.password) {
      setFormError('Email and password are required');
      return;
    }

    try {
      await login(formData.email, formData.password);
      router.push('/dashboard');
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Login failed');
    }
  };

  return (
    <main className="grid min-h-screen bg-[#f4f1ec] text-[#1f2933] lg:grid-cols-[0.95fr_1.05fr]">
      <section className="relative hidden overflow-hidden bg-[#1f2933] text-white lg:block">
        <div
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              "url('https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=1400&q=80')",
            backgroundPosition: 'center',
            backgroundSize: 'cover',
          }}
        />
        <div className="absolute inset-0 bg-[#1f2933]/70" />
        <div className="relative z-10 flex h-full flex-col justify-between p-10">
          <Link href="/" className="text-lg font-semibold text-white">
            ShutterPlan AI
          </Link>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#d8d2c8]">Welcome back</p>
            <h1 className="mt-4 max-w-xl text-5xl font-semibold tracking-normal">Pick up the plan where you left it.</h1>
            <div className="mt-8 grid max-w-md gap-3">
              {planningSignals.map(signal => (
                <div key={signal} className="rounded-lg border border-white/10 bg-white/10 px-4 py-3 text-sm font-semibold text-[#f4f1ec]">
                  {signal}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="flex min-h-screen items-center justify-center px-5 py-10">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <Link href="/" className="text-lg font-semibold text-[#1f2933]">
              ShutterPlan AI
            </Link>
          </div>

          <div className="rounded-lg border border-[#d8d2c8] bg-white p-6 shadow-sm md:p-8">
            <div className="mb-8">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#7c6f64]">Secure sign in</p>
              <h1 className="mt-2 text-3xl font-semibold text-[#1f2933]">Open your workspace</h1>
              <p className="mt-2 text-sm leading-6 text-[#5f6b76]">
                Access your projects, planner drafts, location pins, and client-ready shoot guides.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {(error || formError) && (
                <div className="rounded-lg border border-[#fecaca] bg-[#fef2f2] px-4 py-3 text-sm font-medium text-[#b91c1c]">
                  {error || formError}
                </div>
              )}

              <label className="block text-sm font-semibold text-[#1f2933]">
                Email
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  disabled={isLoading}
                  className={inputClass()}
                  placeholder="you@example.com"
                  autoComplete="email"
                />
              </label>

              <label className="block text-sm font-semibold text-[#1f2933]">
                Password
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  disabled={isLoading}
                  className={inputClass()}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                />
              </label>

              <Button type="submit" isLoading={isLoading} className="w-full bg-[#1f2933] hover:bg-[#111827]">
                {isLoading ? 'Signing in...' : 'Sign in'}
              </Button>
            </form>

            <div className="mt-6 border-t border-[#ece7df] pt-6 text-center text-sm text-[#5f6b76]">
              <p>
                New to ShutterPlan?{' '}
                <Link href="/auth/signup" className="font-semibold text-[#1f2933] hover:text-[#5f6b76]">
                  Create an account
                </Link>
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
