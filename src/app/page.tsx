'use client';

import { EarningsDashboard } from '@/components/EarningsDashboard';

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col transition-colors duration-300">
      <EarningsDashboard />
    </div>
  );
}

