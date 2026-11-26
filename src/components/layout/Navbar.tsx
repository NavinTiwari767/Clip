'use client';

import React from 'react';
import Link from 'next/link';
import { Menu, Plus, Calendar, Shield, User, Tag } from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '@/lib/useAuth';

interface NavbarProps {
  onToggleSidebar: () => void;
  title?: string;
  subtitle?: string;
}

export default function Navbar({ onToggleSidebar, title, subtitle }: NavbarProps) {
  const todayFormatted = format(new Date(), 'EEEE, dd MMMM yyyy');
  const { user, isAdmin } = useAuth();

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-4 md:px-8 bg-background/80 backdrop-blur-md border-b border-border">
      {/* Left: Mobile hamburger & Page Title */}
      <div className="flex items-center gap-3 md:gap-4">
        <button
          onClick={onToggleSidebar}
          className="p-2 text-foreground-muted hover:text-foreground rounded-lg lg:hidden hover:bg-card border border-border"
          aria-label="Toggle menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {title && (
          <div>
            <h1 className="text-lg md:text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
              {title}
            </h1>
            {subtitle && <p className="text-xs text-foreground-muted hidden sm:block">{subtitle}</p>}
          </div>
        )}
      </div>

      {/* Right: Date, Quick Action & User Status */}
      <div className="flex items-center gap-3">
        {/* Date Display */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-card border border-border text-xs text-foreground-muted">
          <Calendar className="w-3.5 h-3.5 text-accent-blue" />
          <span>{todayFormatted}</span>
        </div>

        {/* Role-specific Primary Action */}
        {isAdmin ? (
          <Link
            href="/daily-entry"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs md:text-sm font-medium text-white bg-accent-purple hover:bg-accent-purple-hover rounded-lg transition-colors shadow-sm"
          >
            <Tag className="w-4 h-4" />
            <span>Assign IDs</span>
          </Link>
        ) : (
          <Link
            href="/daily-entry"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs md:text-sm font-medium text-white bg-accent-purple hover:bg-accent-purple-hover rounded-lg transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Add Entry</span>
          </Link>
        )}

        {/* User Role Tag */}
        <div
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium ${
            isAdmin
              ? 'bg-accent-purple/10 text-accent-purple border-accent-purple/30'
              : 'bg-accent-blue/10 text-accent-blue border-accent-blue/30'
          }`}
          title={user?.email}
        >
          {isAdmin ? <Shield className="w-3.5 h-3.5 text-accent-purple" /> : <User className="w-3.5 h-3.5 text-accent-blue" />}
          <span>{isAdmin ? 'Admin' : 'Member'}</span>
        </div>
      </div>
    </header>
  );
}
