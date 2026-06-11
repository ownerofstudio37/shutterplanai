'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';

const onboardingSteps = [
  ['1', 'Create your studio workspace'],
  ['2', 'Add shoot details and brand context'],
  ['3', 'Send clients a polished plan'],
];

function inputClass() {
  return 'mt-2 w-full rounded-lg border border-[#d8d2c8] bg-white px-4 py-3 text-sm text-[#1f2933] shadow-sm outline-none transition placeholder:text-[#9a9187] focus:border-[#1f2933] focus:ring-2 focus:ring-[#1f2933]/10 disabled:bg-[#f4f1ec]';
}

export default function SignupPage() {
  const router = useRouter();
  const { signup, isLoading, error } = useAuth();
  const [formData, setFormData] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [formError, setFormError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setFormError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.email || !formData.password) {
      setFormError('All fields are required');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setFormError('Passwords do not match');
      return;
    }

    if (formData.password.length < 8) {
      setFormError('Password must be at least 8 characters');
      return;
    }

    try {
      await signup(formData.email, formData.password, formData.name);
      router.push('/dashboard');
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Signup failed');
    }
  };

  return (
    <main className="grid min-h-screen bg-[#f4f1ec] text-[#1f2933] lg:grid-cols-[1.05fr_0.95fr]">
      <section className="flex min-h-screen items-center justify-center px-5 py-10">
        <div className="w-full max-w-md">
          <div className="mb-8">
            <Link href="/" className="text-lg font-semibold text-[#1f2933]">
              ShutterPlan AI
            </Link>
          </div>

          <div className="rounded-lg border border-[#d8d2c8] bg-white p-6 shadow-sm md:p-8">
            <div className="mb-8">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#7c6f64]">Start your workspace</p>
              <h1 className="mt-2 text-3xl font-semibold text-[#1f2933]">Build your first shoot plan</h1>
              <p className="mt-2 text-sm leading-6 text-[#5f6b76]">
                Create an account to organize projects, generate AI timelines, map micro-spots, and share client-ready guides.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {(error || formError) && (
                <div className="rounded-lg border border-[#fecaca] bg-[#fef2f2] px-4 py-3 text-sm font-medium text-[#b91c1c]">
                  {error || formError}
                </div>
              )}

              <label className="block text-sm font-semibold text-[#1f2933]">
                Full name
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  disabled={isLoading}
                  className={inputClass()}
                  placeholder="Jordan Lee"
                  autoComplete="name"
                />
              </label>

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
                  placeholder="At least 8 characters"
                  autoComplete="new-password"
                />
              </label>

              <label className="block text-sm font-semibold text-[#1f2933]">
                Confirm password
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  disabled={isLoading}
                  className={inputClass()}
                  placeholder="Re-enter your password"
                  autoComplete="new-password"
                />
              </label>

              <Button type="submit" isLoading={isLoading} className="w-full bg-[#1f2933] hover:bg-[#111827]">
                {isLoading ? 'Creating account...' : 'Create account'}
              </Button>
            </form>

            <div className="mt-6 border-t border-[#ece7df] pt-6 text-center text-sm text-[#5f6b76]">
              <p>
                Already have an account?{' '}
                <Link href="/auth/login" className="font-semibold text-[#1f2933] hover:text-[#5f6b76]">
                  Sign in
                </Link>
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="relative hidden overflow-hidden bg-[#1f2933] text-white lg:block">
        <div
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              "url('https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1400&q=80')",
            backgroundPosition: 'center',
            backgroundSize: 'cover',
          }}
        />
        <div className="absolute inset-0 bg-[#1f2933]/70" />
        <div className="relative z-10 flex h-full flex-col justify-end p-10">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#d8d2c8]">From scattered notes to one plan</p>
          <h2 className="mt-4 max-w-xl text-5xl font-semibold tracking-normal">Make every session easier to prepare, shoot, and hand off.</h2>
          <div className="mt-8 grid max-w-lg gap-3">
            {onboardingSteps.map(([step, label]) => (
              <div key={step} className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/10 p-4">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-sm font-semibold text-[#1f2933]">
                  {step}
                </span>
                <p className="text-sm font-semibold text-[#f4f1ec]">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
