'use client';

import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import { isSupabaseConfigured } from '@/lib/services/clipService';
import { AlertTriangle, ArrowRight, Settings } from 'lucide-react';
import Link from 'next/link';

interface AppShellProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
}

export default function AppShell({ children, title, subtitle }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [supabaseReady, setSupabaseReady] = useState(true);

  useEffect(() => {
    setSupabaseReady(isSupabaseConfigured());
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-64">
        <Navbar
          onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
          title={title}
          subtitle={subtitle}
        />

        {/* Supabase credentials warning banner if placeholder */}
        {!supabaseReady && (
          <div className="bg-amber-500/10 border-b border-amber-500/30 px-4 md:px-8 py-2.5 flex items-center justify-between text-xs text-amber-200">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                <strong>Supabase Setup Needed:</strong> Database credentials are not yet configured in{' '}
                <code className="px-1.5 py-0.5 rounded bg-black/40 text-amber-300">.env.local</code>.
              </span>
            </div>
            <Link
              href="/settings"
              className="flex items-center gap-1 font-semibold text-amber-300 hover:text-white underline ml-3 shrink-0"
            >
              Configure in Settings <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        )}

        <main className="flex-1 p-4 md:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

