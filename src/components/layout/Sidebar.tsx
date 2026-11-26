'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  CalendarCheck,
  CalendarDays,
  BarChart3,
  Settings,
  LogOut,
  Scissors,
  X,
  ShieldCheck,
  UserCheck,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '@/lib/useAuth';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { user, isAdmin, logout } = useAuth();

  const navLinks = [
    {
      label: 'Dashboard',
      href: '/dashboard',
      icon: LayoutDashboard,
    },
    {
      label: 'People & IDs',
      href: '/people',
      icon: Users,
      matchSubPaths: true,
    },
    {
      label: 'Daily Clip Entry',
      href: '/daily-entry',
      icon: CalendarCheck,
    },
    {
      label: 'My Clip History',
      href: '/my-history',
      icon: CalendarDays,
    },
    {
      label: 'Monthly Reports',
      href: '/reports',
      icon: BarChart3,
    },
    {
      label: 'Settings',
      href: '/settings',
      icon: Settings,
    },
  ];

  const isLinkActive = (href: string, matchSubPaths?: boolean) => {
    if (href === '/dashboard' && pathname === '/dashboard') return true;
    if (matchSubPaths) {
      return pathname.startsWith(href);
    }
    return pathname === href;
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 flex flex-col w-64 bg-sidebar border-r border-border transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand / Header */}
        <div className="flex items-center justify-between h-16 px-6 border-b border-border">
          <Link href="/dashboard" className="flex items-center gap-3 group">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-accent-purple to-accent-blue shadow-lg group-hover:scale-105 transition-transform">
              <Scissors className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="text-base font-bold tracking-tight text-foreground flex items-center gap-1.5">
                ClipTrack
                <span
                  className={`text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded border ${
                    isAdmin
                      ? 'bg-accent-purple/20 text-accent-purple border-accent-purple/30'
                      : 'bg-accent-blue/20 text-accent-blue border-accent-blue/30'
                  }`}
                >
                  {isAdmin ? 'Admin' : 'Member'}
                </span>
              </div>
              <div className="text-xs text-foreground-muted">DenseAI Tracking</div>
            </div>
          </Link>

          <button
            onClick={onClose}
            className="p-1.5 text-foreground-muted hover:text-foreground rounded-lg lg:hidden hover:bg-card"
            title="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User Role Badge */}
        <div className="px-4 py-3 mx-4 my-4 rounded-xl bg-card border border-border/80 flex items-center gap-3">
          <div
            className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 ${
              isAdmin
                ? 'bg-accent-purple/10 border-accent-purple/30 text-accent-purple'
                : 'bg-accent-blue/10 border-accent-blue/30 text-accent-blue'
            }`}
          >
            {isAdmin ? <ShieldCheck className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-semibold text-foreground truncate">
              {user?.email || 'Logged In'}
            </div>
            <div
              className={`text-[11px] font-medium flex items-center gap-1 ${
                isAdmin ? 'text-accent-purple' : 'text-accent-blue'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full animate-pulse ${
                  isAdmin ? 'bg-accent-purple' : 'bg-accent-blue'
                }`}
              />
              {isAdmin ? 'Full CRUD Access' : 'Add & View Only'}
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 px-3 py-2 space-y-1.5 overflow-y-auto">
          <div className="px-3 pb-2 text-[11px] font-semibold tracking-wider uppercase text-foreground-subtle">
            Main Navigation
          </div>

          {navLinks.map((link) => {
            const active = isLinkActive(link.href, link.matchSubPaths);
            const Icon = link.icon;

            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => onClose()}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all group ${
                  active
                    ? 'bg-accent-purple/15 text-white border border-accent-purple/40 shadow-sm'
                    : 'text-foreground-muted hover:text-foreground hover:bg-card'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`w-4 h-4 transition-colors ${
                      active ? 'text-accent-purple' : 'text-foreground-muted group-hover:text-foreground'
                    }`}
                  />
                  <span>{link.label}</span>
                </div>
                {active && <ChevronRight className="w-3.5 h-3.5 text-accent-purple" />}
              </Link>
            );
          })}
        </div>

        {/* Footer / Logout */}
        <div className="p-4 border-t border-border">
          <button
            onClick={logout}
            className="flex items-center justify-center w-full gap-2.5 px-4 py-2.5 text-sm font-medium text-red-400 bg-red-500/10 hover:bg-red-500/20 hover:text-red-300 border border-red-500/20 rounded-xl transition-all"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
}
