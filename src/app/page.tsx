'use client';

import { EarningsDashboard } from '@/components/EarningsDashboard';

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <EarningsDashboard />
    </div>
  );
}

