'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Check if user is authenticated using cookies, otherwise redirect to login
    const token = Cookies.get('token');
    if (token) {
      router.replace('/dashboard');
    } else {
      router.replace('/login');
    }
  }, []);

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