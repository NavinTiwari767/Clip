'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import AppShell from '@/components/layout/AppShell';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/lib/useAuth';
import { formatNumber } from '@/lib/utils';
import {
  CalendarDays,
  Tag,
  Plus,
  RefreshCw,
  Hash,
  Sparkles,
  Award,
  Layers,
  ChevronRight,
} from 'lucide-react';

interface HistoryResponse {
  person_id: string;
  person_name: string;
  days_count: number;
  range_start: string;
  range_end: string;
  total_clips: number;
  id_summaries: {
    assigned_id: string;
    id_value: string;
    notes?: string | null;
    total_clips: number;
  }[];
  daily_records: {
    date: string;
    formatted_date: string;
    total_clips: number;
    entries: {
      entry_id: string;
      assigned_id: string;
      id_value: string;
      notes?: string | null;
      clips: number;
    }[];
  }[];
}

export default function MyHistoryPage() {
  const { user, isAdmin } = useAuth();
  const [days, setDays] = useState<number>(12);
  const [data, setData] = useState<HistoryResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const loadHistory = async (selectedDays: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/my-history?days=${selectedDays}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error('Failed to load personal history:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory(days);
  }, [days]);

  const activeDaysCount = data?.daily_records.filter((d) => d.total_clips > 0).length || 0;
  const avgClipsPerActiveDay =
    activeDaysCount > 0 ? Math.round((data?.total_clips || 0) / activeDaysCount) : 0;

  return (
    <AppShell
      title="My Clip Production History"
      subtitle="Track your daily clip output and performance across all assigned IDs"
    >
      <div className="space-y-8 pb-12">
        {/* Top Filter Bar */}
        <div className="p-5 rounded-2xl bg-card border border-border shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-foreground">
                Showing Production for:
              </span>
              <span className="text-xs font-bold font-mono px-2.5 py-1 rounded-lg bg-accent-purple/15 text-accent-purple border border-accent-purple/30">
                {data?.person_name || user?.email}
              </span>
            </div>
            <p className="text-xs text-foreground-muted mt-1">
              Select time period to view day-by-day clip logs across your assigned IDs
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-foreground-subtle font-semibold mr-1">Period:</span>
            {[10, 12, 14, 30].map((d) => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  days === d
                    ? 'bg-accent-purple text-white shadow-md shadow-accent-purple/20'
                    : 'bg-background border border-border text-foreground-muted hover:text-foreground'
                }`}
              >
                Last {d} Days
              </button>
            ))}

            <Button
              variant="outline"
              size="sm"
              onClick={() => loadHistory(days)}
              isLoading={loading}
              leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
            >
              Refresh
            </Button>
          </div>
        </div>

        {/* 4 Summary Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl bg-card border border-border shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-foreground-muted">
                {days}-Day Production
              </span>
              <div className="p-2 rounded-xl bg-accent-purple/10 text-accent-purple border border-accent-purple/20">
                <Sparkles className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 text-3xl font-extrabold text-accent-purple">
              {data ? formatNumber(data.total_clips) : 0}
            </div>
            <p className="mt-1 text-xs text-foreground-subtle">
              Total clips in past {days} days
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-card border border-border shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-foreground-muted">
                Active Days
              </span>
              <div className="p-2 rounded-xl bg-accent-blue/10 text-accent-blue border border-accent-blue/20">
                <CalendarDays className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 text-3xl font-extrabold text-accent-blue">
              {activeDaysCount} <span className="text-sm font-normal text-foreground-muted">/ {days} days</span>
            </div>
            <p className="mt-1 text-xs text-foreground-subtle">
              Days with recorded production
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-card border border-border shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-foreground-muted">
                Daily Average
              </span>
              <div className="p-2 rounded-xl bg-accent-green/10 text-accent-green border border-accent-green/20">
                <Award className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 text-3xl font-extrabold text-accent-green">
              {formatNumber(avgClipsPerActiveDay)}
            </div>
            <p className="mt-1 text-xs text-foreground-subtle">
              Clips per working day
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-card border border-border shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-foreground-muted">
                Total Assigned IDs
              </span>
              <div className="p-2 rounded-xl bg-accent-blue/10 text-accent-blue border border-accent-blue/20">
                <Hash className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 text-3xl font-extrabold text-foreground">
              {data?.id_summaries.length || 0}
            </div>
            <p className="mt-1 text-xs text-foreground-subtle">
              IDs assigned by administrator
            </p>
          </div>
        </div>

        {/* SECTION 2 REQUIREMENT: Assigned IDs and Clips Breakdown */}
        {/* "admin dekh skta hai user kitna id asgn hua hai and kis id pe kitne clips kiye hai example 30001 - 10000 clips waise h sare" */}
        <div className="p-6 rounded-2xl bg-card border border-border shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <Tag className="w-4 h-4 text-accent-purple" />
                Assigned IDs & Cumulative Clip Production
              </h3>
              <p className="text-xs text-foreground-muted">
                Overall total clips produced on each individual assigned ID
              </p>
            </div>
            <Link href="/daily-entry">
              <Button variant="primary" size="sm" leftIcon={<Plus className="w-4 h-4" />}>
                Add Clip Count
              </Button>
            </Link>
          </div>

          {!data || data.id_summaries.length === 0 ? (
            <div className="p-8 text-center border border-dashed border-border rounded-xl">
              <Hash className="w-8 h-8 text-foreground-subtle mx-auto mb-2 opacity-50" />
              <p className="text-sm font-semibold text-foreground">No IDs assigned yet</p>
              <p className="text-xs text-foreground-muted mt-1">
                Your administrator will assign your tracking IDs.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {data.id_summaries.map((idObj) => (
                <div
                  key={idObj.assigned_id}
                  className="p-4 rounded-xl bg-background border border-border hover:border-accent-purple/50 transition-all flex flex-col justify-between"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-xs font-mono font-bold text-accent-blue bg-accent-blue/10 border border-accent-blue/20 px-2.5 py-1 rounded-md">
                        ID {idObj.id_value}
                      </span>
                      {idObj.notes && (
                        <div className="text-[11px] text-foreground-subtle mt-2 truncate">
                          {idObj.notes}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 pt-2 border-t border-border/60 flex items-baseline justify-between">
                    <span className="text-[11px] text-foreground-muted">All-time Clips:</span>
                    <span className="text-base font-extrabold text-accent-purple">
                      {formatNumber(idObj.total_clips)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* SECTION: Day-by-Day Historical Log (Past 10-12 Days) */}
        {/* "apna 10 aur 12 din kaunse id pe kitna clips kiya hai" */}
        <div className="p-6 rounded-2xl bg-card border border-border shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-accent-blue" />
                Day-by-Day Production Log (Last {days} Days)
              </h3>
              <p className="text-xs text-foreground-muted">
                Detailed daily breakdown of which ID you worked on and how many clips you produced each day
              </p>
            </div>
            <div className="text-xs font-bold text-accent-purple bg-accent-purple/10 px-3 py-1.5 rounded-xl border border-accent-purple/20">
              Period Total = {data ? formatNumber(data.total_clips) : 0} clips
            </div>
          </div>

          {!data || data.daily_records.length === 0 ? (
            <div className="p-8 text-center text-foreground-muted">Loading history...</div>
          ) : (
            <div className="space-y-3">
              {data.daily_records.map((day) => (
                <div
                  key={day.date}
                  className={`p-4 rounded-xl border transition-all ${
                    day.total_clips > 0
                      ? 'bg-background border-border hover:border-accent-purple/40 shadow-sm'
                      : 'bg-card/40 border-border/50 opacity-70'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-border/60 mb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-semibold text-foreground">
                        {day.date}
                      </span>
                      <span className="text-xs text-foreground-muted">
                        ({day.formatted_date.split('(')[1]?.replace(')', '') || ''})
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs text-foreground-muted">Daily Total:</span>
                      <span
                        className={`text-sm font-extrabold ${
                          day.total_clips > 0 ? 'text-accent-purple' : 'text-foreground-subtle'
                        }`}
                      >
                        {formatNumber(day.total_clips)} clips
                      </span>
                    </div>
                  </div>

                  {day.entries.length === 0 ? (
                    <div className="text-xs text-foreground-subtle italic py-1">
                      No clip entries recorded on this day.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pt-1">
                      {day.entries.map((entry) => (
                        <div
                          key={entry.entry_id}
                          className="flex items-center justify-between px-3 py-2 rounded-lg bg-card border border-border text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded bg-accent-blue/15 text-accent-blue font-mono font-bold">
                              ID {entry.id_value}
                            </span>
                            {entry.notes && (
                              <span className="text-foreground-subtle text-[11px] truncate max-w-[100px]">
                                ({entry.notes})
                              </span>
                            )}
                          </div>
                          <span className="font-bold text-accent-purple">
                            {formatNumber(entry.clips)} clips
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
