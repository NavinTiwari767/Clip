'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import AppShell from '@/components/layout/AppShell';
import StatCard from '@/components/ui/StatCard';
import { Button } from '@/components/ui/Button';
import { getDashboardData } from '@/lib/services/clipService';
import { formatNumber, formatDate } from '@/lib/utils';
import { useAuth } from '@/lib/useAuth';
import type { ClipEntryDetail } from '@/types/database';
import {
  Users,
  Hash,
  CalendarCheck2,
  CalendarDays,
  Plus,
  ArrowRight,
  TrendingUp,
  Clock,
  ExternalLink,
  RefreshCw,
  BarChart2,
  Sparkles,
  Tag,
  SlidersHorizontal,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

export default function DashboardPage() {
  const { isAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{
    totalPeople: number;
    totalAssignedIds: number;
    todayTotalClips: number;
    currentMonthTotalClips: number;
    personMonthlySummaries: {
      person_id: string;
      name: string;
      total_clips: number;
      assigned_ids_count: number;
    }[];
    recentEntries: ClipEntryDetail[];
    last7DaysTrend: { date: string; label: string; clips: number }[];
  }>({
    totalPeople: 0,
    totalAssignedIds: 0,
    todayTotalClips: 0,
    currentMonthTotalClips: 0,
    personMonthlySummaries: [],
    recentEntries: [],
    last7DaysTrend: [],
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await getDashboardData();
      setData(res);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <AppShell
      title={isAdmin ? 'Admin Dashboard' : 'Member Dashboard'}
      subtitle="Overview of clip production, team members, assigned IDs, and daily activity"
    >
      <div className="space-y-8 pb-12">
        {/* Top Header Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card/60 border border-border p-5 rounded-2xl backdrop-blur-sm">
          <div>
            <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
              <span>Clip Activity Center</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-accent-purple/20 text-accent-purple border border-accent-purple/30">
                Live Data
              </span>
            </h2>
            <p className="text-xs text-foreground-muted mt-1">
              {isAdmin
                ? 'Assign IDs to members, monitor ID-wise clips, and edit/manage clip records'
                : 'View live production totals and add daily clips for your assigned IDs'}
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={loadData}
              isLoading={loading}
              leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
            >
              Refresh
            </Button>
            {isAdmin ? (
              <Link href="/daily-entry">
                <Button
                  variant="primary"
                  size="sm"
                  leftIcon={<Tag className="w-4 h-4" />}
                >
                  Assign IDs & Manage
                </Button>
              </Link>
            ) : (
              <Link href="/daily-entry">
                <Button
                  variant="primary"
                  size="sm"
                  leftIcon={<Plus className="w-4 h-4" />}
                >
                  New Daily Entry
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* 4 Primary Metric Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Members"
            value={data.totalPeople}
            subtitle="Registered active team members"
            icon={Users}
            iconColor="purple"
          />
          <StatCard
            title="Total Assigned IDs"
            value={data.totalAssignedIds}
            subtitle="Individual tracking tags"
            icon={Hash}
            iconColor="blue"
          />
          <StatCard
            title="Today's Total Clips"
            value={data.todayTotalClips}
            subtitle="Clips entered for today"
            icon={CalendarCheck2}
            iconColor="green"
            trend={data.todayTotalClips > 0 ? 'Active' : 'No entries yet'}
            trendPositive={data.todayTotalClips > 0}
          />
          <StatCard
            title="Current Month Total"
            value={data.currentMonthTotalClips}
            subtitle="Accumulated this month"
            icon={CalendarDays}
            iconColor="purple"
          />
        </div>

        {/* Visual Charts & Highlights */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main 7-Day Clip Production Trend */}
          <div className="lg:col-span-2 p-6 rounded-2xl bg-card border border-border flex flex-col justify-between shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-accent-blue" />
                  Recent Daily Clip Trend
                </h3>
                <p className="text-xs text-foreground-muted">
                  Daily production volume over the past 7 days
                </p>
              </div>
              <Link
                href="/reports"
                className="text-xs font-semibold text-accent-purple hover:text-accent-purple-hover flex items-center gap-1"
              >
                Full Analytics <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="h-64 w-full pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={data.last7DaysTrend}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="clipGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#7C5CFC" stopOpacity={0.5} />
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#26334D" opacity={0.6} />
                  <XAxis
                    dataKey="label"
                    stroke="#94A3B8"
                    fontSize={11}
                    tickLine={false}
                    axisLine={{ stroke: '#26334D' }}
                  />
                  <YAxis
                    stroke="#94A3B8"
                    fontSize={11}
                    tickLine={false}
                    axisLine={{ stroke: '#26334D' }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#151E32',
                      borderColor: '#26334D',
                      borderRadius: '12px',
                      color: '#F8FAFC',
                      fontSize: '12px',
                    }}
                    labelStyle={{ color: '#94A3B8', fontWeight: 600 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="clips"
                    name="Clips"
                    stroke="#7C5CFC"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#clipGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Quick Actions & System Status */}
          <div className="p-6 rounded-2xl bg-card border border-border flex flex-col justify-between shadow-xl">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-accent-purple" />
                  Quick Management
                </h3>
              </div>

              <div className="space-y-3">
                {isAdmin ? (
                  <>
                    <Link
                      href="/daily-entry"
                      className="flex items-center justify-between p-3.5 rounded-xl bg-background border border-border hover:border-accent-purple/50 transition-all group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-accent-purple/10 text-accent-purple">
                          <SlidersHorizontal className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-foreground group-hover:text-accent-purple transition-colors">
                            Assign IDs & Edit Clips
                          </div>
                          <div className="text-xs text-foreground-muted">
                            Type IDs to assign & edit/delete entries
                          </div>
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-foreground-muted group-hover:translate-x-1 transition-transform" />
                    </Link>

                    <Link
                      href="/people"
                      className="flex items-center justify-between p-3.5 rounded-xl bg-background border border-border hover:border-accent-blue/50 transition-all group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-accent-blue/10 text-accent-blue">
                          <Users className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-foreground group-hover:text-accent-blue transition-colors">
                            Manage Members & Passwords
                          </div>
                          <div className="text-xs text-foreground-muted">
                            Add members & view ID-wise clip counts
                          </div>
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-foreground-muted group-hover:translate-x-1 transition-transform" />
                    </Link>
                  </>
                ) : (
                  <>
                    <Link
                      href="/daily-entry"
                      className="flex items-center justify-between p-3.5 rounded-xl bg-background border border-border hover:border-accent-purple/50 transition-all group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-accent-purple/10 text-accent-purple">
                          <Plus className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-foreground group-hover:text-accent-purple transition-colors">
                            Add Daily Clip Entry
                          </div>
                          <div className="text-xs text-foreground-muted">
                            Log clips for your assigned IDs
                          </div>
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-foreground-muted group-hover:translate-x-1 transition-transform" />
                    </Link>

                    <Link
                      href="/my-history"
                      className="flex items-center justify-between p-3.5 rounded-xl bg-background border border-border hover:border-accent-blue/50 transition-all group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-accent-blue/10 text-accent-blue">
                          <CalendarDays className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-foreground group-hover:text-accent-blue transition-colors">
                            My 10-12 Day History
                          </div>
                          <div className="text-xs text-foreground-muted">
                            Check IDs & daily clip counts
                          </div>
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-foreground-muted group-hover:translate-x-1 transition-transform" />
                    </Link>
                  </>
                )}

                <Link
                  href="/reports"
                  className="flex items-center justify-between p-3.5 rounded-xl bg-background border border-border hover:border-accent-green/50 transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-accent-green/10 text-accent-green">
                      <BarChart2 className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-foreground group-hover:text-accent-green transition-colors">
                        Monthly Reports & CSV
                      </div>
                      <div className="text-xs text-foreground-muted">
                        Export ID, person & daily sheets
                      </div>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-foreground-muted group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-border/80 flex items-center justify-between text-xs text-foreground-muted">
              <span>Database Backend</span>
              <span className="font-semibold text-accent-green flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-accent-green animate-pulse"></span>
                Supabase Connected
              </span>
            </div>
          </div>
        </div>

        {/* Person-wise Monthly Clip Summary & Recent Daily Entries */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Person-wise Monthly Clip Summary */}
          <div className="p-6 rounded-2xl bg-card border border-border shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                  <Users className="w-4 h-4 text-accent-purple" />
                  Person-wise Monthly Summary
                </h3>
                <p className="text-xs text-foreground-muted">
                  Cumulative clips produced this month per person
                </p>
              </div>
              <Link
                href="/people"
                className="text-xs font-semibold text-accent-purple hover:underline"
              >
                View All People
              </Link>
            </div>

            {data.personMonthlySummaries.length === 0 ? (
              <div className="p-8 text-center border border-dashed border-border rounded-xl">
                <Users className="w-8 h-8 text-foreground-subtle mx-auto mb-2 opacity-50" />
                <p className="text-sm font-medium text-foreground">No entries recorded this month</p>
                <p className="text-xs text-foreground-muted mt-1">
                  {isAdmin ? 'Assign IDs to members so they can log clips' : 'Add entries in Daily Clip Entry to view rankings'}
                </p>
                <Link href={isAdmin ? '/people' : '/daily-entry'} className="inline-block mt-3">
                  <Button variant="outline" size="sm">
                    {isAdmin ? 'Assign IDs' : 'Enter First Clips'}
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {data.personMonthlySummaries.map((person, idx) => (
                  <div
                    key={person.person_id}
                    className="flex items-center justify-between p-3.5 rounded-xl bg-background border border-border hover:border-accent-purple/30 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-accent-purple/15 text-accent-purple font-bold text-xs">
                        #{idx + 1}
                      </div>
                      <div>
                        <Link
                          href={`/people/${person.person_id}`}
                          className="text-sm font-bold text-foreground hover:text-accent-purple transition-colors flex items-center gap-1.5"
                        >
                          {person.name}
                          <ExternalLink className="w-3 h-3 text-foreground-subtle" />
                        </Link>
                        <div className="text-xs text-foreground-muted">
                          {person.assigned_ids_count} assigned ID{person.assigned_ids_count === 1 ? '' : 's'}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-base font-extrabold text-foreground">
                        {formatNumber(person.total_clips)}{' '}
                        <span className="text-xs font-medium text-foreground-muted">clips</span>
                      </div>
                      <div className="text-[11px] text-accent-green">
                        {data.currentMonthTotalClips > 0
                          ? `${Math.round((person.total_clips / data.currentMonthTotalClips) * 100)}% of month`
                          : '0%'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Daily Entries */}
          <div className="p-6 rounded-2xl bg-card border border-border shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                  <Clock className="w-4 h-4 text-accent-blue" />
                  Recent Daily Entries
                </h3>
                <p className="text-xs text-foreground-muted">
                  Latest clip records registered in the system
                </p>
              </div>
              <Link
                href="/daily-entry"
                className="text-xs font-semibold text-accent-blue hover:underline"
              >
                {isAdmin ? 'Manage / Edit Records' : 'Go to Entry Table'}
              </Link>
            </div>

            {data.recentEntries.length === 0 ? (
              <div className="p-8 text-center border border-dashed border-border rounded-xl">
                <Clock className="w-8 h-8 text-foreground-subtle mx-auto mb-2 opacity-50" />
                <p className="text-sm font-medium text-foreground">No recent entries found</p>
                <p className="text-xs text-foreground-muted mt-1">
                  Entries saved by members will automatically show up here
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-border text-xs uppercase tracking-wider text-foreground-subtle">
                      <th className="pb-2.5 font-semibold">Date</th>
                      <th className="pb-2.5 font-semibold">Person</th>
                      <th className="pb-2.5 font-semibold">ID</th>
                      <th className="pb-2.5 font-semibold text-right">Clips</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {data.recentEntries.map((entry) => (
                      <tr
                        key={entry.entry_id}
                        className="hover:bg-card-hover transition-colors"
                      >
                        <td className="py-2.5 text-xs text-foreground-muted">
                          {formatDate(entry.entry_date, 'dd MMM yyyy')}
                        </td>
                        <td className="py-2.5 font-semibold text-foreground">
                          {entry.person_name}
                        </td>
                        <td className="py-2.5">
                          <span className="px-2 py-0.5 rounded-md bg-accent-blue/10 text-accent-blue border border-accent-blue/20 text-xs font-mono font-semibold">
                            ID {entry.id_value}
                          </span>
                        </td>
                        <td className="py-2.5 text-right font-bold text-accent-purple">
                          {formatNumber(entry.clips)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
