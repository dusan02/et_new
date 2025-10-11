'use client';

import { useState } from 'react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { EarningsDashboard } from '@/components/EarningsDashboard';

export default function Home() {
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col transition-colors duration-300">
      <Header lastUpdated={lastUpdated} />
      <main className="flex-1">
        <EarningsDashboard onLastUpdatedChange={setLastUpdated} />
      </main>
      <Footer />
    </div>
  );
}

