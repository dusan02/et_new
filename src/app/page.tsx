'use client';

import { useState } from 'react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { EarningsDashboard } from '@/components/EarningsDashboard';

export default function Home() {
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [stats, setStats] = useState<any>(null);

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 transition-colors duration-300">
      {/* Horná časť - 0-100-0 (plná šírka) */}
      <Header lastUpdated={lastUpdated} stats={stats} />
      
      {/* Stredná a spodná časť - 20-60-20 */}
      <div className="flex min-h-[calc(100vh-200px)]">
        {/* Ľavý prázdny priestor - 20% */}
        <div className="w-[20%] bg-white dark:bg-gray-900"></div>
        
        {/* Hlavný obsah - 60% */}
        <div className="w-[60%] flex flex-col">
          <main className="flex-1">
            <EarningsDashboard onLastUpdatedChange={setLastUpdated} onStatsChange={setStats} />
          </main>
          <Footer />
        </div>
        
        {/* Pravý prázdny priestor - 20% */}
        <div className="w-[20%] bg-white dark:bg-gray-900"></div>
      </div>
    </div>
  );
}

