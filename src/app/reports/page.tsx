'use client';

import React, { useEffect, useState } from 'react';
import AppShell from '@/components/layout/AppShell';
import { Button } from '@/components/ui/Button';
import { getMonthlyReport } from '@/lib/services/clipService';
import type { MonthlyReportData } from '@/types/database';
import { formatNumber, convertToCSV, downloadCSV } from '@/lib/utils';
import {
  FileSpreadsheet,
  Download,
  Calendar,
  Users,
  Hash,
  Layers,
  ChevronDown,
  RefreshCw,
  PieChart as PieChartIcon,
  Table as TableIcon,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from 'recharts';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function MonthlyReportsPage() {
  const currentDate = new Date();
  const [selectedYear, setSelectedYear] = useState<number>(currentDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(currentDate.getMonth() + 1);

  const [report, setReport] = useState<MonthlyReportData | null>(null);
  const [loading, setLoading] = useState(true);

  // Available year options (e.g. from 2024 to 2030)
  const years = [2024, 2025, 2026, 2027, 2028, 2029, 2030];

  const loadReport = async () => {
    setLoading(true);
    try {
      const data = await getMonthlyReport(selectedYear, selectedMonth);
      setReport(data);
    } catch (err) {
      console.error('Failed to load monthly report:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, [selectedYear, selectedMonth]);

  // =========================================================================
  // CSV EXPORT HANDLERS
  // =========================================================================

  // 1. Export Complete Monthly Report (Every Entry with details)
  const handleExportCompleteReport = () => {
    if (!report) return;
    const headers = ['Date', 'Person Name', 'Assigned ID', 'Notes', 'Clips Count', 'Entry Created At'];
    const rows = report.all_entries.map((e) => [
      e.entry_date,
      e.person_name,
      e.id_value,
      e.id_notes || '',
      e.clips,
      e.entry_created_at,
    ]);
    const csv = convertToCSV(headers, rows);
    downloadCSV(`ClipTrack_Complete_${report.year}_${String(report.month).padStart(2, '0')}.csv`, csv);
  };

  // 2. Export Person-wise Summary
  const handleExportPersonReport = () => {
    if (!report) return;
    const headers = ['Person Name', 'Total Assigned IDs', 'Total Clips Produced', '% of Monthly Total'];
    const rows = report.person_summaries.map((p) => [
      p.person_name,
      p.assigned_ids_count,
      p.total_clips,
      report.overall_total_clips > 0
        ? `${((p.total_clips / report.overall_total_clips) * 100).toFixed(1)}%`
        : '0%',
    ]);
    const csv = convertToCSV(headers, rows);
    downloadCSV(`ClipTrack_Person_Summary_${report.year}_${String(report.month).padStart(2, '0')}.csv`, csv);
  };

  // 3. Export ID-wise Summary
  const handleExportIdReport = () => {
    if (!report) return;
    const headers = ['Assigned ID', 'Person Name', 'Notes', 'Total Clips'];
    const rows = report.id_summaries.map((i) => [
      i.id_value,
      i.person_name,
      i.notes || '',
      i.total_clips,
    ]);
    const csv = convertToCSV(headers, rows);
    downloadCSV(`ClipTrack_ID_Summary_${report.year}_${String(report.month).padStart(2, '0')}.csv`, csv);
  };

  // 4. Export Date-wise Daily Breakdown
  const handleExportDateReport = () => {
    if (!report) return;
    const headers = ['Date', 'Day of Week', 'Total Daily Clips'];
    const rows = report.daily_totals.map((d) => [
      d.date,
      d.formatted_date,
      d.total_clips,
    ]);
    const csv = convertToCSV(headers, rows);
    downloadCSV(`ClipTrack_Daily_Breakdown_${report.year}_${String(report.month).padStart(2, '0')}.csv`, csv);
  };

  const chartColors = ['#7C5CFC', '#3B82F6', '#10B981', '#F59E0B', '#EC4899', '#8B5CF6'];

  return (
    <AppShell
      title="Monthly Reports & Analytics"
      subtitle="Comprehensive monthly clip aggregations, person-wise & ID-wise breakdowns, and CSV export"
    >
      <div className="space-y-8 pb-12">
        {/* Month & Year Selection Bar with Export Buttons */}
        <div className="p-5 rounded-2xl bg-card border border-border shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-xs font-semibold uppercase tracking-wider text-foreground-muted flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-accent-purple" />
              Report Period:
            </span>

            {/* Month Select */}
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value, 10))}
              className="px-3.5 py-2 text-sm font-semibold bg-background border border-border rounded-xl text-foreground focus:outline-none focus:border-accent-purple"
            >
              {MONTH_NAMES.map((name, index) => (
                <option key={name} value={index + 1}>
                  {name}
                </option>
              ))}
            </select>

            {/* Year Select */}
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
              className="px-3.5 py-2 text-sm font-semibold bg-background border border-border rounded-xl text-foreground focus:outline-none focus:border-accent-purple"
            >
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>

            <Button
              variant="outline"
              size="sm"
              onClick={loadReport}
              isLoading={loading}
              leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
            >
              Update
            </Button>
          </div>

          {/* Export CSV Dropdown / Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportPersonReport}
              leftIcon={<Download className="w-3.5 h-3.5 text-accent-purple" />}
            >
              Export Person CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportIdReport}
              leftIcon={<Download className="w-3.5 h-3.5 text-accent-blue" />}
            >
              Export ID CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportDateReport}
              leftIcon={<Download className="w-3.5 h-3.5 text-accent-green" />}
            >
              Export Date CSV
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleExportCompleteReport}
              leftIcon={<FileSpreadsheet className="w-4 h-4" />}
            >
              Export All CSV
            </Button>
          </div>
        </div>

        {/* 4 Monthly KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl bg-card border border-border shadow-lg">
            <span className="text-xs font-semibold uppercase tracking-wider text-foreground-muted">
              Monthly Overall Total
            </span>
            <div className="mt-3 text-3xl font-extrabold text-accent-purple">
              {report ? formatNumber(report.overall_total_clips) : 0}
            </div>
            <p className="mt-1 text-xs text-foreground-subtle">
              Clips in {report?.month_name || ''}
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-card border border-border shadow-lg">
            <span className="text-xs font-semibold uppercase tracking-wider text-foreground-muted">
              Active People
            </span>
            <div className="mt-3 text-3xl font-extrabold text-accent-blue">
              {report ? report.total_people_active : 0}
            </div>
            <p className="mt-1 text-xs text-foreground-subtle">Produced clips this month</p>
          </div>

          <div className="p-5 rounded-2xl bg-card border border-border shadow-lg">
            <span className="text-xs font-semibold uppercase tracking-wider text-foreground-muted">
              Active IDs
            </span>
            <div className="mt-3 text-3xl font-extrabold text-accent-green">
              {report ? report.total_ids_active : 0}
            </div>
            <p className="mt-1 text-xs text-foreground-subtle">Individual ID tags active</p>
          </div>

          <div className="p-5 rounded-2xl bg-card border border-border shadow-lg">
            <span className="text-xs font-semibold uppercase tracking-wider text-foreground-muted">
              Total Recorded Entries
            </span>
            <div className="mt-3 text-3xl font-extrabold text-foreground">
              {report ? report.all_entries.length : 0}
            </div>
            <p className="mt-1 text-xs text-foreground-subtle">Daily entries logged</p>
          </div>
        </div>

        {/* Visual Charts: Person-wise Production Volume */}
        {report && report.person_summaries.length > 0 && (
          <div className="p-6 rounded-2xl bg-card border border-border shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                  <PieChartIcon className="w-4 h-4 text-accent-purple" />
                  Person-wise Production Volume
                </h3>
                <p className="text-xs text-foreground-muted">
                  Comparison of total clips delivered by each individual
                </p>
              </div>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={report.person_summaries.map((p) => ({
                    name: p.person_name,
                    clips: p.total_clips,
                  }))}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#26334D" opacity={0.6} />
                  <XAxis dataKey="name" stroke="#94A3B8" fontSize={12} tickLine={false} />
                  <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#151E32',
                      borderColor: '#26334D',
                      borderRadius: '12px',
                      color: '#F8FAFC',
                      fontSize: '12px',
                    }}
                  />
                  <Bar dataKey="clips" name="Total Clips" radius={[8, 8, 0, 0]}>
                    {report.person_summaries.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={chartColors[index % chartColors.length]}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* SECTION 5 REQUIREMENT: Detailed Person & ID Breakdown */}
        <div className="p-6 rounded-2xl bg-card border border-border shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <Users className="w-4 h-4 text-accent-purple" />
                Person & ID-wise Clip Breakdown
              </h3>
              <p className="text-xs text-foreground-muted">
                Each person&apos;s total clips and individual ID-wise counts for {report?.month_name}
              </p>
            </div>
            <div className="text-xs font-bold text-accent-purple px-3 py-1.5 rounded-xl bg-accent-purple/15 border border-accent-purple/30">
              Overall Total = {report ? formatNumber(report.overall_total_clips) : 0} clips
            </div>
          </div>

          {!report || report.person_summaries.length === 0 ? (
            <div className="p-8 text-center border border-dashed border-border rounded-xl">
              <Users className="w-8 h-8 text-foreground-subtle mx-auto mb-2 opacity-50" />
              <p className="text-sm font-semibold text-foreground">No personnel records found</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {report.person_summaries.map((person) => (
                <div
                  key={person.person_id}
                  className="rounded-2xl bg-background border border-border p-5 flex flex-col justify-between shadow-md hover:border-accent-purple/40 transition-all"
                >
                  <div>
                    {/* Person Header */}
                    <div className="flex items-center justify-between pb-3 border-b border-border mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-accent-purple/20 border border-accent-purple/30 flex items-center justify-center font-bold text-accent-purple text-sm">
                          {person.person_name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="text-base font-extrabold text-foreground">
                            {person.person_name}
                          </div>
                          <div className="text-xs text-foreground-muted">
                            {person.assigned_ids_count} assigned ID{person.assigned_ids_count === 1 ? '' : 's'}
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-lg font-black text-accent-purple">
                          {formatNumber(person.total_clips)}{' '}
                          <span className="text-xs font-semibold text-foreground-muted">clips</span>
                        </div>
                        <div className="text-[11px] text-accent-green font-semibold">
                          Total = {formatNumber(person.total_clips)} clips
                        </div>
                      </div>
                    </div>

                    {/* ID-wise Breakdown list */}
                    <div className="space-y-2">
                      <div className="text-[11px] font-semibold uppercase tracking-wider text-foreground-subtle">
                        ID Breakdown:
                      </div>
                      {person.id_breakdown.map((item) => (
                        <div
                          key={item.assigned_id}
                          className="flex items-center justify-between px-3 py-2 rounded-lg bg-card border border-border/80 text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded bg-accent-blue/15 text-accent-blue font-mono font-bold">
                              ID {item.id_value}
                            </span>
                            {item.notes && (
                              <span className="text-foreground-subtle truncate max-w-[120px]">
                                ({item.notes})
                              </span>
                            )}
                          </div>
                          <div className="font-bold text-foreground">
                            {formatNumber(item.clips)} clips
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Summary Footer */}
                  <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-xs font-bold">
                    <span className="text-foreground-muted">Person Total:</span>
                    <span className="text-accent-purple text-sm">
                      {formatNumber(person.total_clips)} clips
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* SECTION 5 REQUIREMENT: Daily Clip Breakdown Table */}
        <div className="p-6 rounded-2xl bg-card border border-border shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <TableIcon className="w-4 h-4 text-accent-blue" />
                Daily Clip Breakdown for {report?.month_name}
              </h3>
              <p className="text-xs text-foreground-muted">
                Day-by-day clip counts across the entire month
              </p>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleExportDateReport}
              leftIcon={<Download className="w-3.5 h-3.5" />}
            >
              Export Daily Breakdown CSV
            </Button>
          </div>

          {!report ? (
            <div className="p-8 text-center text-foreground-muted">Loading breakdown...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-xs uppercase tracking-wider text-foreground-subtle">
                    <th className="pb-3 font-semibold">Date</th>
                    <th className="pb-3 font-semibold">Day</th>
                    <th className="pb-3 font-semibold text-right">Daily Clips</th>
                    <th className="pb-3 font-semibold text-right">% of Month</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {report.daily_totals.map((day) => {
                    const percentage =
                      report.overall_total_clips > 0
                        ? ((day.total_clips / report.overall_total_clips) * 100).toFixed(1)
                        : '0.0';

                    return (
                      <tr
                        key={day.date}
                        className={`hover:bg-card-hover transition-colors ${
                          day.total_clips > 0 ? 'bg-accent-purple/[0.02]' : ''
                        }`}
                      >
                        <td className="py-2.5 font-mono text-xs font-medium text-foreground">
                          {day.date}
                        </td>
                        <td className="py-2.5 text-xs text-foreground-muted">
                          {day.formatted_date.split('(')[1]?.replace(')', '') || ''}
                        </td>
                        <td className="py-2.5 text-right font-extrabold text-sm">
                          <span
                            className={
                              day.total_clips > 0 ? 'text-accent-purple' : 'text-foreground-subtle'
                            }
                          >
                            {formatNumber(day.total_clips)}
                          </span>
                        </td>
                        <td className="py-2.5 text-right text-xs text-foreground-subtle">
                          {percentage}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-border font-bold">
                    <td colSpan={2} className="pt-4 text-xs uppercase tracking-wider text-foreground-muted">
                      Overall Monthly Total ({report.month_name})
                    </td>
                    <td className="pt-4 text-right text-lg text-accent-purple">
                      {formatNumber(report.overall_total_clips)} clips
                    </td>
                    <td className="pt-4 text-right text-xs text-accent-green">100%</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
