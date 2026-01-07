'use client';

import React from 'react';
import AppLayout from '@/components/antd/AppLayout';
import { AuthGuard } from '@/components/auth/AuthGuard';

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // AuthGuard handles all authentication logic
  return (
    <AuthGuard>
      <AppLayout>
        {children}
      </AppLayout>
    </AuthGuard>
  );
}