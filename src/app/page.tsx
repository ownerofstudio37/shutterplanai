'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';

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
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col items-center justify-center p-4">
      <div className="text-center max-w-2xl">
        <h1 className="text-6xl font-bold text-gray-900 mb-4">🎬 ShutterPlan AI</h1>
        <p className="text-2xl text-gray-700 mb-6">Photography Planning Made Easy</p>
        <p className="text-lg text-gray-600 mb-8">
          Plan your photography projects with AI-powered shot suggestions, weather integration, and seamless project management.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
          <Link href="/auth/signup">
            <Button variant="primary" size="lg" className="min-w-48">
              Get Started Free
            </Button>
          </Link>
          <Link href="/auth/login">
            <Button variant="secondary" size="lg" className="min-w-48">
              Sign In
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12">
          <div>
            <div className="text-4xl mb-2">📸</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Project Planning</h3>
            <p className="text-gray-600">Organize your photography projects efficiently</p>
          </div>
          <div>
            <div className="text-4xl mb-2">✨</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">AI Suggestions</h3>
            <p className="text-gray-600">Get smart recommendations for your shots</p>
          </div>
          <div>
            <div className="text-4xl mb-2">🗺️</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Location Mapping</h3>
            <p className="text-gray-600">Plan shoots based on location and weather</p>
          </div>
        </div>
      </div>
    </div>
  );
}
