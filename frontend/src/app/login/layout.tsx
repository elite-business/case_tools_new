'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user, isLoading } = useAuthStore();

  // Redirect to dashboard if already authenticated
  useEffect(() => {
    if (!isLoading && user) {
      router.push('/dashboard');
    }
  }, [user, isLoading, router]);

  // Don't render anything if loading or already authenticated
  if (isLoading || user) {
    return (
      <div className="loading-fullscreen bg-gray-50 dark:bg-gray-950">
        <div className="loading-card">
          <div className="animate-pulse">
            <div className="flex items-center justify-center gap-3">
              <div className="h-12 w-12 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">CT</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">CaseTools</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">Loading...</p>
              </div>
            </div>
            <div className="flex justify-center mt-4">
              <div className="spinner"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Render clean login layout without sidebar/header
  return (
    <div 
      style={{ 
        width: '100%', 
        height: '100vh', 
        overflow: 'hidden',
        position: 'relative'
      }}
    >
      {children}
    </div>
  );
}