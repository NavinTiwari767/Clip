'use client';

import React, { useEffect, useState, useMemo } from 'react';
import AppShell from '@/components/layout/AppShell';
import { Button } from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import {
  getPeopleWithIds,
  getClipEntriesByDate,
  upsertClipEntry,
  deleteClipEntry,
} from '@/lib/services/clipService';
import type { PersonWithIds, ClipEntryDetail } from '@/types/database';
import { formatNumber, formatDate } from '@/lib/utils';
import { useAuth } from '@/lib/useAuth';
import { format, subDays, addDays, parseISO } from 'date-fns';
import {
  Calendar as CalendarIcon,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Save,
  Check,
  AlertCircle,
  Lock,
} from 'lucide-react';

export default function DailyEntryPage() {
  const { user, isAdmin } = useAuth();
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [people, setPeople] = useState<PersonWithIds[]>([]);
  const [entries, setEntries] = useState<ClipEntryDetail[]>([]);
  const [loading, setLoading] = useState(true);

  // Single Entry Form state
  const [selectedPersonId, setSelectedPersonId] = useState<string>('');
  const [selectedAssignedId, setSelectedAssignedId] = useState<string>('');
  const [clipsInput, setClipsInput] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Multi-ID Quick Sheet state
  const [multiSheetValues, setMultiSheetValues] = useState<Record<string, string>>({});
  const [multiSaving, setMultiSaving] = useState(false);

  // Edit Single Entry Modal (Admin only)
  const [editingEntry, setEditingEntry] = useState<ClipEntryDetail | null>(null);
  const [editClipsValue, setEditClipsValue] = useState<string>('');
  const [editLoading, setEditLoading] = useState(false);

  const [feedback, setFeedback] = useState<string | null>(null);

  const showNotification = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 3000);
  };

  // Load people list
  useEffect(() => {
    const fetchPeople = async () => {
      try {
        const data = await getPeopleWithIds();
        setPeople(data);
        if (data.length > 0) {
          if (!isAdmin && user?.email) {
            const myPerson = data.find((p) => p.email?.toLowerCase() === user.email.toLowerCase());
            if (myPerson) {
              setSelectedPersonId(myPerson.id);
              return;
            }
          }
          if (!selectedPersonId) {
            setSelectedPersonId(data[0].id);
          }
        }
      } catch (err) {
        console.error('Failed to load people:', err);
      }
    };
    fetchPeople();
  }, [user, isAdmin]);

  const currentPerson = useMemo(() => {
    return people.find((p) => p.id === selectedPersonId) || null;
  }, [people, selectedPersonId]);

  useEffect(() => {
    if (currentPerson && currentPerson.assigned_ids.length > 0) {
      setSelectedAssignedId(currentPerson.assigned_ids[0].id);
    } else {
      setSelectedAssignedId('');
    }
  }, [currentPerson]);

  const loadEntriesForDate = async (date: string) => {
    setLoading(true);
    try {
      const data = await getClipEntriesByDate(date);
      setEntries(data);

      const sheetMap: Record<string, string> = {};
      data.forEach((e) => {
        sheetMap[e.assigned_id] = String(e.clips);
      });
      setMultiSheetValues(sheetMap);
    } catch (err) {
      console.error('Failed to load daily entries:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEntriesForDate(selectedDate);
  }, [selectedDate]);

  const dailyTotalClips = useMemo(() => {
    return entries.reduce((sum, item) => sum + item.clips, 0);
  }, [entries]);

  const handlePrevDay = () => {
    const current = parseISO(selectedDate);
    setSelectedDate(format(subDays(current, 1), 'yyyy-MM-dd'));
  };

  const handleNextDay = () => {
    const current = parseISO(selectedDate);
    setSelectedDate(format(addDays(current, 1), 'yyyy-MM-dd'));
  };

  const handleToday = () => {
    setSelectedDate(format(new Date(), 'yyyy-MM-dd'));
  };

  // Submit Single Entry (Allowed for both Admin and User)
  const handleSingleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!selectedAssignedId) {
      setFormError('Please select an Assigned ID');
      return;
    }

    const clipsNum = parseInt(clipsInput, 10);
    if (isNaN(clipsNum) || clipsNum < 0) {
      setFormError('Please enter a valid clip count (0 or greater)');
      return;
    }

    setIsSubmitting(true);
    try {
      await upsertClipEntry(selectedAssignedId, selectedDate, clipsNum);
      showNotification('Clip entry saved successfully');
      setClipsInput('');
      loadEntriesForDate(selectedDate);
    } catch (err: any) {
      setFormError(err.message || 'Failed to save clip entry');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Save All in Multi Sheet (Allowed for both Admin and User)
  const handleSaveMultiSheet = async () => {
    if (!currentPerson || currentPerson.assigned_ids.length === 0) return;
    setMultiSaving(true);
    try {
      const promises = currentPerson.assigned_ids.map(async (idObj) => {
        const valStr = multiSheetValues[idObj.id];
        if (valStr !== undefined && valStr !== '') {
          const count = parseInt(valStr, 10);
          if (!isNaN(count) && count >= 0) {
            return upsertClipEntry(idObj.id, selectedDate, count);
          }
        }
        return Promise.resolve();
      });

      await Promise.all(promises);
      showNotification(`Saved clip entries for ${currentPerson.name}`);
      loadEntriesForDate(selectedDate);
    } catch (err: any) {
      alert(err.message || 'Failed to save batch entries');
    } finally {
      setMultiSaving(false);
    }
  };

  // Edit Existing Entry (Admin only)
  const handleUpdateEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      alert('Only Admins can edit records');
      return;
    }
    if (!editingEntry) return;

    const count = parseInt(editClipsValue, 10);
    if (isNaN(count) || count < 0) {
      alert('Clips count must be 0 or greater');
      return;
    }

    setEditLoading(true);
    try {
      await upsertClipEntry(editingEntry.assigned_id, editingEntry.entry_date, count);
      setEditingEntry(null);
      showNotification('Entry updated');
      loadEntriesForDate(selectedDate);
    } catch (err: any) {
      alert(err.message || 'Failed to update entry');
    } finally {
      setEditLoading(false);
    }
  };

  // Delete Entry (Admin only)
  const handleDeleteEntry = async (entry: ClipEntryDetail) => {
    if (!isAdmin) {
      alert('Only Admins can delete entries');
      return;
    }
    if (!confirm(`Delete entry of ${entry.clips} clips for ${entry.person_name} (ID ${entry.id_value}) on ${formatDate(entry.entry_date)}?`)) {
      return;
    }
    try {
      await deleteClipEntry(entry.entry_id);
      showNotification('Entry deleted');
      loadEntriesForDate(selectedDate);
    } catch (err: any) {
      alert(err.message || 'Failed to delete entry');
    }
  };

  return (
    <AppShell
      title="Daily Clip Entry"
      subtitle="Record and sum daily clip counts per assigned ID"
    >
      <div className="space-y-8 pb-12">
        {feedback && (
          <div className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl bg-accent-green text-white font-medium text-sm shadow-xl flex items-center gap-2 animate-fade-in">
            <CheckCircle2 className="w-4 h-4" />
            <span>{feedback}</span>
          </div>
        )}

        {/* Date Selector & Total Summary Bar */}
        <div className="p-5 rounded-2xl bg-card border border-border shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold uppercase tracking-wider text-foreground-muted mr-1">
              Active Date:
            </span>

            <div className="flex items-center gap-1 bg-background border border-border rounded-xl p-1">
              <button
                onClick={handlePrevDay}
                className="p-1.5 text-foreground-muted hover:text-foreground rounded-lg hover:bg-card transition-colors"
                title="Previous Day"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="relative">
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="bg-transparent text-sm font-semibold text-foreground px-2 py-1 focus:outline-none cursor-pointer"
                />
              </div>

              <button
                onClick={handleNextDay}
                className="p-1.5 text-foreground-muted hover:text-foreground rounded-lg hover:bg-card transition-colors"
                title="Next Day"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleToday}
              className="text-xs font-semibold"
            >
              Today
            </Button>
          </div>

          {/* Daily Total Display */}
          <div className="flex items-center gap-4 bg-background px-4 py-2.5 rounded-xl border border-border">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-foreground-subtle">
                Daily Total for {formatDate(selectedDate, 'dd MMM yyyy')}
              </div>
              <div className="text-xl md:text-2xl font-extrabold text-accent-purple flex items-baseline gap-1.5">
                <span>{formatNumber(dailyTotalClips)}</span>
                <span className="text-xs font-semibold text-foreground-muted">clips</span>
              </div>
            </div>
            <div className="h-8 w-px bg-border hidden sm:block" />
            <div className="text-right hidden sm:block">
              <div className="text-[11px] text-foreground-subtle">Total Entries</div>
              <div className="text-sm font-bold text-foreground">{entries.length} IDs logged</div>
            </div>
          </div>
        </div>

        {/* 2 Entry Modes */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* LEFT: Multi-ID Quick Sheet */}
          <div className="lg:col-span-2 p-6 rounded-2xl bg-card border border-border shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-accent-purple" />
                  Quick Multi-ID Entry Sheet
                </h3>
                <p className="text-xs text-foreground-muted">
                  Quickly enter clip numbers for all IDs assigned to this person on {formatDate(selectedDate, 'dd MMM')}
                </p>
              </div>

              {currentPerson && currentPerson.assigned_ids.length > 0 && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleSaveMultiSheet}
                  isLoading={multiSaving}
                  leftIcon={<Save className="w-4 h-4" />}
                >
                  Save All
                </Button>
              )}
            </div>

            {/* Person Selector Tabs */}
            <div className="mb-5">
              <label className="block text-xs font-semibold text-foreground-muted uppercase tracking-wider mb-2">
                Select Person:
              </label>
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {people.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setSelectedPersonId(p.id)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 flex items-center gap-2 ${
                      selectedPersonId === p.id
                        ? 'bg-accent-purple text-white shadow-md shadow-accent-purple/20'
                        : 'bg-background border border-border text-foreground-muted hover:text-foreground'
                    }`}
                  >
                    <span>{p.name}</span>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] ${
                        selectedPersonId === p.id
                          ? 'bg-white/20 text-white'
                          : 'bg-card text-foreground-subtle'
                      }`}
                    >
                      {p.assigned_ids.length} IDs
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Sheet Table */}
            {!currentPerson || currentPerson.assigned_ids.length === 0 ? (
              <div className="p-8 text-center border border-dashed border-border rounded-xl">
                <AlertCircle className="w-8 h-8 text-foreground-subtle mx-auto mb-2 opacity-50" />
                <p className="text-sm font-semibold text-foreground">
                  No IDs assigned to {currentPerson?.name || 'this person'}
                </p>
                <p className="text-xs text-foreground-muted mt-1">
                  Assign IDs in People & IDs to enable quick daily entry.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {currentPerson.assigned_ids.map((idObj) => {
                    const currentEntry = entries.find((e) => e.assigned_id === idObj.id);
                    const currentClips = multiSheetValues[idObj.id] ?? (currentEntry ? String(currentEntry.clips) : '');

                    return (
                      <div
                        key={idObj.id}
                        className={`p-3.5 rounded-xl border transition-all ${
                          currentEntry
                            ? 'bg-accent-purple/5 border-accent-purple/40'
                            : 'bg-background border-border hover:border-border/80'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-mono font-bold text-accent-blue text-sm">
                            ID {idObj.id_value}
                          </span>
                          {currentEntry && (
                            <span className="text-[10px] font-semibold text-accent-green flex items-center gap-1">
                              <Check className="w-3 h-3" /> Logged
                            </span>
                          )}
                        </div>

                        {idObj.notes && (
                          <div className="text-[11px] text-foreground-subtle truncate mb-2">
                            {idObj.notes}
                          </div>
                        )}

                        <div className="relative">
                          <input
                            type="number"
                            min="0"
                            placeholder="0 clips"
                            value={currentClips}
                            onChange={(e) => {
                              const val = e.target.value;
                              setMultiSheetValues((prev) => ({
                                ...prev,
                                [idObj.id]: val,
                              }));
                            }}
                            className="w-full px-3 py-2 text-sm font-mono font-bold bg-card border border-border rounded-lg text-foreground focus:outline-none focus:border-accent-purple text-right pr-12"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-foreground-subtle font-medium pointer-events-none">
                            clips
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-border/80">
                  <div className="text-xs text-foreground-muted">
                    Clips added here save directly to Supabase PostgreSQL database.
                  </div>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleSaveMultiSheet}
                    isLoading={multiSaving}
                    leftIcon={<Save className="w-4 h-4" />}
                  >
                    Save All For {currentPerson.name}
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* RIGHT: Single Entry Form */}
          <div className="p-6 rounded-2xl bg-card border border-border shadow-xl flex flex-col justify-between">
            <div>
              <h3 className="text-base font-bold text-foreground flex items-center gap-2 mb-1">
                <Plus className="w-4 h-4 text-accent-blue" />
                Add Single Entry
              </h3>
              <p className="text-xs text-foreground-muted mb-4">
                Record an individual ID clip count
              </p>

              {formError && (
                <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-300">
                  {formError}
                </div>
              )}

              <form onSubmit={handleSingleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-foreground-muted uppercase tracking-wider mb-1.5">
                    1. Person
                  </label>
                  <select
                    value={selectedPersonId}
                    onChange={(e) => setSelectedPersonId(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm bg-background border border-border rounded-xl text-foreground focus:outline-none focus:border-accent-purple"
                  >
                    {people.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.assigned_ids.length} IDs)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground-muted uppercase tracking-wider mb-1.5">
                    2. Assigned ID
                  </label>
                  <select
                    value={selectedAssignedId}
                    onChange={(e) => setSelectedAssignedId(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm font-mono bg-background border border-border rounded-xl text-foreground focus:outline-none focus:border-accent-purple"
                  >
                    {currentPerson?.assigned_ids.map((idObj) => (
                      <option key={idObj.id} value={idObj.id}>
                        ID {idObj.id_value} {idObj.notes ? `(${idObj.notes})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground-muted uppercase tracking-wider mb-1.5">
                    3. Number of Clips
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={clipsInput}
                    onChange={(e) => setClipsInput(e.target.value)}
                    placeholder="e.g. 20"
                    className="w-full px-3.5 py-2.5 text-sm font-mono font-bold bg-background border border-border rounded-xl text-foreground focus:outline-none focus:border-accent-purple"
                  />
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  className="w-full"
                  isLoading={isSubmitting}
                  leftIcon={<Check className="w-4 h-4" />}
                >
                  Save Clip Entry
                </Button>
              </form>
            </div>

            <div className="mt-4 pt-3 border-t border-border/80 text-[11px] text-foreground-subtle leading-relaxed">
              Users can add clip counts. Once recorded, only Administrators can edit or delete historical records.
            </div>
          </div>
        </div>

        {/* Entries Table for Selected Date */}
        <div className="p-6 rounded-2xl bg-card border border-border shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <div>
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-accent-green" />
                Entries for {formatDate(selectedDate, 'dd MMMM yyyy')}
              </h3>
              <p className="text-xs text-foreground-muted">
                {isAdmin
                  ? 'All clip records logged on this date. Edit count or delete incorrect entries.'
                  : 'All clip records logged on this date (Read-only view).'}
              </p>
            </div>

            <div className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-accent-purple/15 text-accent-purple border border-accent-purple/30">
              Total Clips: {formatNumber(dailyTotalClips)}
            </div>
          </div>

          {entries.length === 0 ? (
            <div className="p-10 text-center border border-dashed border-border rounded-xl">
              <CalendarIcon className="w-10 h-10 text-foreground-subtle mx-auto mb-2 opacity-50" />
              <p className="text-sm font-semibold text-foreground">
                No entries recorded for {formatDate(selectedDate, 'dd MMMM yyyy')}
              </p>
              <p className="text-xs text-foreground-muted mt-1">
                Use the forms above to log daily clips for staff IDs.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-xs uppercase tracking-wider text-foreground-subtle">
                    <th className="pb-3 font-semibold">Person</th>
                    <th className="pb-3 font-semibold">Assigned ID</th>
                    <th className="pb-3 font-semibold">Notes</th>
                    <th className="pb-3 font-semibold text-right">Clips Count</th>
                    {isAdmin && <th className="pb-3 font-semibold text-right">Admin Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {entries.map((entry) => (
                    <tr key={entry.entry_id} className="hover:bg-card-hover transition-colors">
                      <td className="py-3 font-bold text-foreground">{entry.person_name}</td>
                      <td className="py-3">
                        <span className="px-2.5 py-1 rounded-lg bg-accent-blue/10 border border-accent-blue/20 font-mono font-bold text-accent-blue text-xs">
                          ID {entry.id_value}
                        </span>
                      </td>
                      <td className="py-3 text-xs text-foreground-muted">
                        {entry.id_notes || <span className="text-foreground-subtle italic">-</span>}
                      </td>
                      <td className="py-3 text-right font-extrabold text-accent-purple text-base">
                        {formatNumber(entry.clips)}
                      </td>
                      {isAdmin && (
                        <td className="py-3 text-right space-x-1">
                          <button
                            onClick={() => {
                              setEditingEntry(entry);
                              setEditClipsValue(String(entry.clips));
                            }}
                            className="p-1.5 rounded-lg text-foreground-muted hover:text-foreground hover:bg-background border border-transparent hover:border-border transition-colors"
                            title="Edit clip count (Admin only)"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteEntry(entry)}
                            className="p-1.5 rounded-lg text-foreground-muted hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-colors"
                            title="Delete entry (Admin only)"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-border font-bold">
                    <td colSpan={3} className="pt-4 text-xs uppercase tracking-wider text-foreground-muted">
                      Total for {formatDate(selectedDate, 'dd MMM yyyy')}
                    </td>
                    <td className="pt-4 text-right text-lg text-accent-purple">
                      {formatNumber(dailyTotalClips)} clips
                    </td>
                    {isAdmin && <td className="pt-4"></td>}
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* MODAL: EDIT ENTRY COUNT (Admin Only) */}
      <Modal
        isOpen={!!editingEntry}
        onClose={() => setEditingEntry(null)}
        title="Edit Clip Count"
        description={`Admin Action: Update record for ${editingEntry?.person_name} (ID ${editingEntry?.id_value}) on ${editingEntry ? formatDate(editingEntry.entry_date) : ''}`}
      >
        <form onSubmit={handleUpdateEntry} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-foreground-muted uppercase tracking-wider mb-1.5">
              New Clip Count
            </label>
            <input
              type="number"
              min="0"
              required
              autoFocus
              value={editClipsValue}
              onChange={(e) => setEditClipsValue(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm font-mono font-bold bg-background border border-border rounded-xl text-foreground focus:outline-none focus:border-accent-purple"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setEditingEntry(null)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" isLoading={editLoading}>
              Save Updated Count
            </Button>
          </div>
        </form>
      </Modal>
    </AppShell>
  );
}
