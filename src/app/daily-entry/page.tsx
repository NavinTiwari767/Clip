'use client';

import React, { useEffect, useState, useMemo } from 'react';
import AppShell from '@/components/layout/AppShell';
import { Button } from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import {
  getPeopleWithIds,
  peekPeopleCache,
  getClipEntriesByDate,
  peekDailyEntriesCache,
  upsertClipEntry,
  batchCreateClipEntries,
  updateClipEntry,
  deleteClipEntry,
  createAssignedId,
  deleteAssignedId,
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
  Tag,
  Hash,
  SlidersHorizontal,
  UserCheck,
} from 'lucide-react';

export default function DailyEntryPage() {
  const { user, isAdmin } = useAuth();
  const initialDate = format(new Date(), 'yyyy-MM-dd');
  const [selectedDate, setSelectedDate] = useState<string>(initialDate);
  const cachedPeople = peekPeopleCache();
  const cachedEntries = peekDailyEntriesCache(initialDate);
  const [people, setPeople] = useState<PersonWithIds[]>(cachedPeople || []);
  const [entries, setEntries] = useState<ClipEntryDetail[]>(cachedEntries || []);
  const [loading, setLoading] = useState(!cachedEntries);

  // Admin: selected person for ID assignment & optional table filter
  const [selectedPersonId, setSelectedPersonId] = useState<string>('');
  const [filterPersonId, setFilterPersonId] = useState<string>('all');

  // Admin: Type ID(s) directly (NO dropdown!)
  const [assignIdInput, setAssignIdInput] = useState<string>('');
  const [assignIdNotes, setAssignIdNotes] = useState<string>('');
  const [assignLoading, setAssignLoading] = useState(false);
  const [assignError, setAssignError] = useState<string | null>(null);

  // Admin: Edit / Manipulate Clip Entry Modal (Clips + Date)
  const [editingEntry, setEditingEntry] = useState<ClipEntryDetail | null>(null);
  const [editClipsValue, setEditClipsValue] = useState<string>('');
  const [editDateValue, setEditDateValue] = useState<string>('');
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Member: Single Entry Form state (clickable ID pills, no dropdown)
  const [selectedAssignedId, setSelectedAssignedId] = useState<string>('');
  const [clipsInput, setClipsInput] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Member: Multi-ID Quick Sheet state (only for unlogged IDs)
  const [multiSheetValues, setMultiSheetValues] = useState<Record<string, string>>({});
  const [multiSaving, setMultiSaving] = useState(false);

  const [feedback, setFeedback] = useState<string | null>(null);

  const showNotification = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 3500);
  };

  const fetchPeople = async (force = false) => {
    try {
      const data = await getPeopleWithIds(force);
      setPeople(data);
      if (data.length > 0) {
        if (!isAdmin && user?.email) {
          const myPerson = data.find(
            (p) => p.email?.toLowerCase() === user.email.toLowerCase()
          );
          if (myPerson) {
            setSelectedPersonId(myPerson.id);
            return;
          }
        }
        setSelectedPersonId((prev) => prev || data[0].id);
      }
    } catch (err) {
      console.error('Failed to load people:', err);
    }
  };

  useEffect(() => {
    fetchPeople(false);
  }, [user?.email, isAdmin]);

  const currentPerson = useMemo(() => {
    if (!isAdmin && user?.email) {
      return (
        people.find((p) => p.email?.toLowerCase() === user.email.toLowerCase()) || null
      );
    }
    return people.find((p) => p.id === selectedPersonId) || null;
  }, [people, selectedPersonId, isAdmin, user]);

  const loadEntriesForDate = async (date: string, force = false) => {
    const cached = !force ? peekDailyEntriesCache(date) : null;
    if (cached) {
      setEntries(cached);
      setLoading(false);
    } else {
      setLoading(true);
    }
    try {
      const data = await getClipEntriesByDate(date, force);
      setEntries(data);
      setMultiSheetValues({});
    } catch (err) {
      console.error('Failed to load daily entries:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEntriesForDate(selectedDate, false);
  }, [selectedDate]);

  // Auto-select first unlogged assigned ID for Member single form
  useEffect(() => {
    if (!isAdmin && currentPerson) {
      const loggedSet = new Set(entries.map((e) => e.assigned_id));
      const firstUnlogged = currentPerson.assigned_ids.find((idObj) => !loggedSet.has(idObj.id));
      setSelectedAssignedId(firstUnlogged?.id || '');
    }
  }, [currentPerson, entries, isAdmin]);

  // Filter table entries (for Admin filter or Member's own entries)
  const visibleEntries = useMemo(() => {
    if (!isAdmin && currentPerson) {
      return entries.filter((e) => e.person_id === currentPerson.id);
    }
    if (isAdmin && filterPersonId !== 'all') {
      return entries.filter((e) => e.person_id === filterPersonId);
    }
    return entries;
  }, [entries, isAdmin, currentPerson, filterPersonId]);

  const dailyTotalClips = useMemo(() => {
    return visibleEntries.reduce((sum, item) => sum + item.clips, 0);
  }, [visibleEntries]);

  const handlePrevDay = () => {
    setSelectedDate(format(subDays(parseISO(selectedDate), 1), 'yyyy-MM-dd'));
  };

  const handleNextDay = () => {
    setSelectedDate(format(addDays(parseISO(selectedDate), 1), 'yyyy-MM-dd'));
  };

  const handleToday = () => {
    setSelectedDate(format(new Date(), 'yyyy-MM-dd'));
  };

  // =========================================================================
  // ADMIN: Assign ID(s) by typing directly (e.g. "3000" or "3000, 400")
  // =========================================================================
  const handleAdminAssignId = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin || !currentPerson) return;

    setAssignError(null);
    const trimmed = assignIdInput.trim();
    if (!trimmed) {
      setAssignError('Please type an ID (e.g. 3000 or 400)');
      return;
    }

    setAssignLoading(true);
    try {
      const hasMultiple = trimmed.includes(',') || trimmed.includes('\n');
      if (hasMultiple) {
        await createAssignedId(currentPerson.id, '', assignIdNotes.trim() || null, trimmed);
        showNotification(`IDs assigned to ${currentPerson.name}!`);
      } else {
        await createAssignedId(currentPerson.id, trimmed, assignIdNotes.trim() || null);
        showNotification(`ID ${trimmed} assigned to ${currentPerson.name}!`);
      }
      setAssignIdInput('');
      setAssignIdNotes('');
      await fetchPeople(true);
    } catch (err: any) {
      setAssignError(err.message || 'Failed to assign ID');
    } finally {
      setAssignLoading(false);
    }
  };

  const handleAdminRemoveId = async (idRecordId: string, idVal: string) => {
    if (!isAdmin || !currentPerson) return;
    if (!confirm(`Remove ID "${idVal}" from ${currentPerson.name}? All clip records for this ID will also be removed.`)) {
      return;
    }
    try {
      await deleteAssignedId(idRecordId);
      showNotification(`ID ${idVal} removed from ${currentPerson.name}`);
      await Promise.all([fetchPeople(true), loadEntriesForDate(selectedDate, true)]);
    } catch (err: any) {
      alert(err.message || 'Failed to remove ID');
    }
  };

  // =========================================================================
  // ADMIN: Manipulate (Edit Clips & Date / Delete) Existing Clip Entries
  // =========================================================================
  const handleAdminUpdateEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin || !editingEntry) return;

    setEditError(null);
    const count = parseInt(editClipsValue, 10);
    if (isNaN(count) || count < 0) {
      setEditError('Clips count must be 0 or greater');
      return;
    }

    setEditLoading(true);
    try {
      await updateClipEntry(editingEntry.entry_id, count, editDateValue || editingEntry.entry_date);
      setEditingEntry(null);
      showNotification('Clip record updated successfully');
      await Promise.all([fetchPeople(true), loadEntriesForDate(selectedDate, true)]);
    } catch (err: any) {
      setEditError(err.message || 'Failed to update clip record');
    } finally {
      setEditLoading(false);
    }
  };

  const handleAdminDeleteEntry = async (entry: ClipEntryDetail) => {
    if (!isAdmin) return;
    if (
      !confirm(
        `Delete entry of ${entry.clips} clips for ${entry.person_name} (ID ${entry.id_value}) on ${formatDate(entry.entry_date)}?`
      )
    ) {
      return;
    }
    try {
      await deleteClipEntry(entry.entry_id);
      showNotification('Clip entry deleted');
      await Promise.all([fetchPeople(true), loadEntriesForDate(selectedDate, true)]);
    } catch (err: any) {
      alert(err.message || 'Failed to delete entry');
    }
  };

  // =========================================================================
  // MEMBER (USER): Add New Clip Counts for Their Own Assigned IDs
  // =========================================================================
  const handleMemberSingleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isAdmin) return;
    setFormError(null);

    if (!selectedAssignedId) {
      setFormError('Please select an available Assigned ID above');
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
      showNotification('Clip entry saved successfully!');
      setClipsInput('');
      await Promise.all([fetchPeople(true), loadEntriesForDate(selectedDate, true)]);
    } catch (err: any) {
      setFormError(err.message || 'Failed to save clip entry');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMemberSaveMultiSheet = async () => {
    if (isAdmin || !currentPerson || currentPerson.assigned_ids.length === 0) return;

    const existingMap = new Map(entries.map((e) => [e.assigned_id, e]));
    const pendingEntries = currentPerson.assigned_ids
      .filter((idObj) => !existingMap.has(idObj.id))
      .map((idObj) => ({
        assigned_id: idObj.id,
        entry_date: selectedDate,
        clips: parseInt(multiSheetValues[idObj.id] ?? '', 10),
      }))
      .filter((item) => !isNaN(item.clips) && item.clips >= 0);

    if (pendingEntries.length === 0) {
      alert('Please enter clip counts for at least one unlogged ID.');
      return;
    }

    setMultiSaving(true);
    try {
      await batchCreateClipEntries(pendingEntries);
      showNotification(`Saved ${pendingEntries.length} clip entry(s)!`);
      await Promise.all([fetchPeople(true), loadEntriesForDate(selectedDate, true)]);
    } catch (err: any) {
      alert(err.message || 'Failed to save entries');
    } finally {
      setMultiSaving(false);
    }
  };

  return (
    <AppShell
      title={isAdmin ? 'Assign IDs & Edit Clip Records' : 'Daily Clip Entry'}
      subtitle={
        isAdmin
          ? 'Type IDs (e.g. 3000, 400) to assign to members, and edit or delete clip records'
          : 'View IDs assigned to your name and record your daily clip counts'
      }
    >
      <div className="space-y-8 pb-12">
        {feedback && (
          <div className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl bg-accent-green text-white font-medium text-sm shadow-xl flex items-center gap-2 animate-fade-in">
            <CheckCircle2 className="w-4 h-4" />
            <span>{feedback}</span>
          </div>
        )}

        {/* ===================================================================== */}
        {/* ADMIN WORKSPACE: ASSIGN IDs (TYPE ID, NO DROPDOWN, NO CLIP ADDING)    */}
        {/* ===================================================================== */}
        {isAdmin ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* LEFT (2 cols): Selected Member & Their Currently Assigned IDs */}
            <div className="lg:col-span-2 p-6 rounded-2xl bg-card border border-border shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                    <Tag className="w-4 h-4 text-accent-purple" />
                    Member&apos;s Assigned IDs
                  </h3>
                  <p className="text-xs text-foreground-muted">
                    Select a member to view their assigned IDs or assign new IDs on the right
                  </p>
                </div>
                <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-accent-purple/15 text-accent-purple border border-accent-purple/30">
                  Admin Assigns IDs Only
                </span>
              </div>

              {/* Member Pills */}
              <div className="mb-5">
                <label className="block text-xs font-semibold text-foreground-muted uppercase tracking-wider mb-2">
                  1. Select Member:
                </label>
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  {people.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setSelectedPersonId(p.id)}
                      className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 flex items-center gap-2 ${
                        currentPerson?.id === p.id
                          ? 'bg-accent-purple text-white shadow-md shadow-accent-purple/20'
                          : 'bg-background border border-border text-foreground-muted hover:text-foreground'
                      }`}
                    >
                      <span>{p.name}</span>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] ${
                          currentPerson?.id === p.id
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

              {/* Assigned IDs Grid for Selected Member */}
              {!currentPerson ? (
                <div className="p-8 text-center border border-dashed border-border rounded-xl text-xs text-foreground-muted">
                  No members found. Add a member in Members & IDs first.
                </div>
              ) : currentPerson.assigned_ids.length === 0 ? (
                <div className="p-8 text-center border border-dashed border-border rounded-xl">
                  <Hash className="w-8 h-8 text-foreground-subtle mx-auto mb-2 opacity-50" />
                  <p className="text-sm font-semibold text-foreground">
                    No IDs assigned to {currentPerson.name} yet
                  </p>
                  <p className="text-xs text-foreground-muted mt-1">
                    Type an ID like <code className="text-accent-purple font-mono">3000</code> or{' '}
                    <code className="text-accent-purple font-mono">400</code> in the box on the right to assign!
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 max-h-72 overflow-y-auto pr-1">
                  {currentPerson.assigned_ids.map((idObj) => (
                    <div
                      key={idObj.id}
                      className="p-3.5 rounded-xl bg-background border border-border hover:border-accent-purple/40 transition-all flex items-center justify-between"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-accent-blue text-sm">
                            ID {idObj.id_value}
                          </span>
                        </div>
                        <div className="text-[11px] font-bold text-accent-purple mt-1 font-mono">
                          {formatNumber(idObj.total_clips || 0)} total clips
                        </div>
                        {idObj.notes && (
                          <div className="text-[10px] text-foreground-subtle truncate mt-0.5">
                            {idObj.notes}
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleAdminRemoveId(idObj.id, idObj.id_value)}
                        className="p-1.5 text-foreground-subtle hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors shrink-0"
                        title="Remove this assigned ID"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* RIGHT (1 col): Type ID Directly Form (NO DROPDOWN!) */}
            <div className="p-6 rounded-2xl bg-card border border-border shadow-xl flex flex-col justify-between">
              <div>
                <h3 className="text-base font-bold text-foreground flex items-center gap-2 mb-1">
                  <Plus className="w-4 h-4 text-accent-purple" />
                  Assign ID to {currentPerson?.name || 'Member'}
                </h3>
                <p className="text-xs text-foreground-muted mb-4">
                  Type the ID number directly (e.g. 3000 or 400). Member will see it on their account!
                </p>

                {assignError && (
                  <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-300">
                    {assignError}
                  </div>
                )}

                <form onSubmit={handleAdminAssignId} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-foreground-muted uppercase tracking-wider mb-1.5">
                      1. Member Name
                    </label>
                    <div className="px-3.5 py-2.5 text-sm font-bold bg-background/70 border border-border rounded-xl text-foreground flex items-center justify-between">
                      <span>{currentPerson?.name || 'Select a member'}</span>
                      {currentPerson?.email && (
                        <span className="text-[11px] font-mono text-foreground-subtle">
                          {currentPerson.email}
                        </span>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-foreground-muted uppercase tracking-wider mb-1.5">
                      2. Type ID Value(s) — e.g. 3000 or 3000, 400
                    </label>
                    <div className="relative">
                      <Hash className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-accent-purple" />
                      <input
                        type="text"
                        required
                        value={assignIdInput}
                        onChange={(e) => setAssignIdInput(e.target.value)}
                        placeholder="e.g. 3000 or 3000, 400"
                        className="w-full pl-10 pr-4 py-2.5 text-sm font-mono font-bold bg-background border border-border rounded-xl text-foreground placeholder:text-foreground-subtle focus:outline-none focus:border-accent-purple"
                      />
                    </div>
                    <p className="text-[11px] text-foreground-subtle mt-1">
                      Separate multiple IDs with commas (e.g. 3000, 400, 500) to assign 10-20 IDs at once.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-foreground-muted uppercase tracking-wider mb-1.5">
                      3. Notes (Optional)
                    </label>
                    <input
                      type="text"
                      value={assignIdNotes}
                      onChange={(e) => setAssignIdNotes(e.target.value)}
                      placeholder="e.g. Shift A, Main batch"
                      className="w-full px-3.5 py-2.5 text-sm bg-background border border-border rounded-xl text-foreground placeholder:text-foreground-subtle focus:outline-none focus:border-accent-purple"
                    />
                  </div>

                  <Button
                    type="submit"
                    variant="primary"
                    size="md"
                    className="w-full"
                    isLoading={assignLoading}
                    disabled={!currentPerson}
                    leftIcon={<Check className="w-4 h-4" />}
                  >
                    Assign ID to {currentPerson?.name || 'Member'}
                  </Button>
                </form>
              </div>

              <div className="mt-4 pt-3 border-t border-border/80 text-[11px] text-foreground-subtle leading-relaxed">
                Admin only assigns IDs and edits/deletes existing clip entries below. Members enter their daily clips from their login.
              </div>
            </div>
          </div>
        ) : (
          /* =================================================================== */
          /* MEMBER (USER) WORKSPACE: SEE ASSIGNED IDs & ADD DAILY CLIPS         */
          /* =================================================================== */
          <>
            {/* Clear Banner Showing IDs Assigned to Their Name */}
            <div className="p-5 rounded-2xl bg-card border border-accent-purple/30 shadow-lg">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-accent-purple/15 border border-accent-purple/30 flex items-center justify-center text-accent-purple shrink-0">
                    <UserCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-foreground">
                      {currentPerson
                        ? `Welcome, ${currentPerson.name} — IDs Assigned to Your Name:`
                        : `Logged in as ${user?.email || 'Member'}`}
                    </div>
                    <p className="text-xs text-foreground-muted">
                      {currentPerson && currentPerson.assigned_ids.length > 0
                        ? `You have ${currentPerson.assigned_ids.length} assigned ID(s). Enter your clip counts for today or past dates below.`
                        : 'No IDs are currently assigned to your account. Contact Admin to assign IDs to you.'}
                    </p>
                  </div>
                </div>
              </div>

              {currentPerson && currentPerson.assigned_ids.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-4 pt-3 border-t border-border/70">
                  {currentPerson.assigned_ids.map((idObj) => (
                    <span
                      key={idObj.id}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-background border border-border text-xs font-mono"
                    >
                      <span className="font-bold text-accent-blue">ID {idObj.id_value}</span>
                      {idObj.notes && <span className="text-foreground-subtle">({idObj.notes})</span>}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {currentPerson && currentPerson.assigned_ids.length > 0 && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* LEFT (2 cols): Quick Multi-ID Entry Sheet for Member */}
                <div className="lg:col-span-2 p-6 rounded-2xl bg-card border border-border shadow-xl">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-accent-purple" />
                        My Assigned IDs — Clip Entry Sheet
                      </h3>
                      <p className="text-xs text-foreground-muted">
                        Enter clips for your assigned IDs on {formatDate(selectedDate, 'dd MMM yyyy')}
                      </p>
                    </div>

                    <Button
                      variant="primary"
                      size="sm"
                      onClick={handleMemberSaveMultiSheet}
                      isLoading={multiSaving}
                      leftIcon={<Save className="w-4 h-4" />}
                    >
                      Save New Clips
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {currentPerson.assigned_ids.map((idObj) => {
                      const existingEntry = entries.find((e) => e.assigned_id === idObj.id);
                      const isLogged = !!existingEntry;

                      return (
                        <div
                          key={idObj.id}
                          className={`p-3.5 rounded-xl border transition-all ${
                            isLogged
                              ? 'bg-accent-green/5 border-accent-green/30'
                              : 'bg-background border-border hover:border-accent-purple/40'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-mono font-bold text-accent-blue text-sm">
                              ID {idObj.id_value}
                            </span>
                            {isLogged ? (
                              <span className="text-[10px] font-semibold text-accent-green flex items-center gap-1">
                                <Lock className="w-3 h-3" /> Logged
                              </span>
                            ) : (
                              <span className="text-[10px] font-medium text-foreground-subtle">
                                Open
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
                              disabled={isLogged}
                              placeholder="0"
                              value={
                                isLogged
                                  ? String(existingEntry.clips)
                                  : multiSheetValues[idObj.id] ?? ''
                              }
                              onChange={(e) => {
                                const val = e.target.value;
                                setMultiSheetValues((prev) => ({
                                  ...prev,
                                  [idObj.id]: val,
                                }));
                              }}
                              className={`w-full px-3 py-2 text-sm font-mono font-bold rounded-lg text-right pr-12 focus:outline-none ${
                                isLogged
                                  ? 'bg-card/50 border border-accent-green/20 text-accent-green cursor-not-allowed'
                                  : 'bg-card border border-border text-foreground focus:border-accent-purple'
                              }`}
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-foreground-subtle font-medium pointer-events-none">
                              clips
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex items-center justify-between pt-4 mt-4 border-t border-border/80">
                    <div className="text-xs text-foreground-muted">
                      Already-logged IDs are locked. Contact Admin to edit submitted counts.
                    </div>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={handleMemberSaveMultiSheet}
                      isLoading={multiSaving}
                      leftIcon={<Save className="w-4 h-4" />}
                    >
                      Save New Clips
                    </Button>
                  </div>
                </div>

                {/* RIGHT (1 col): Single ID Clip Entry (Clickable ID Pills, No Dropdown!) */}
                <div className="p-6 rounded-2xl bg-card border border-border shadow-xl flex flex-col justify-between">
                  <div>
                    <h3 className="text-base font-bold text-foreground flex items-center gap-2 mb-1">
                      <Plus className="w-4 h-4 text-accent-blue" />
                      Single ID Clip Entry
                    </h3>
                    <p className="text-xs text-foreground-muted mb-4">
                      Pick an ID assigned to you and enter clips
                    </p>

                    {formError && (
                      <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-300">
                        {formError}
                      </div>
                    )}

                    <form onSubmit={handleMemberSingleSubmit} className="space-y-4">
                      <div>
                        <label className="block text-xs font-semibold text-foreground-muted uppercase tracking-wider mb-1.5">
                          1. Your Assigned IDs (Click to select)
                        </label>
                        <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto p-2 rounded-xl bg-background border border-border">
                          {currentPerson.assigned_ids.map((idObj) => {
                            const isLogged = entries.some((e) => e.assigned_id === idObj.id);
                            const isSelected = selectedAssignedId === idObj.id;
                            return (
                              <button
                                key={idObj.id}
                                type="button"
                                disabled={isLogged}
                                onClick={() => setSelectedAssignedId(idObj.id)}
                                className={`px-2.5 py-1.5 rounded-lg font-mono text-xs font-bold transition-all flex items-center gap-1 ${
                                  isLogged
                                    ? 'bg-accent-green/10 text-accent-green/60 border border-accent-green/20 cursor-not-allowed'
                                    : isSelected
                                    ? 'bg-accent-purple text-white shadow-sm'
                                    : 'bg-card border border-border text-foreground hover:border-accent-purple/50'
                                }`}
                                title={
                                  isLogged
                                    ? 'Already logged for this date (Admin edit only)'
                                    : idObj.notes || `Select ID ${idObj.id_value}`
                                }
                              >
                                <span>ID {idObj.id_value}</span>
                                {isLogged && <Check className="w-3 h-3" />}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-foreground-muted uppercase tracking-wider mb-1.5">
                          2. Number of Clips
                        </label>
                        <input
                          type="number"
                          min="0"
                          required
                          value={clipsInput}
                          onChange={(e) => setClipsInput(e.target.value)}
                          placeholder="e.g. 250"
                          className="w-full px-3.5 py-2.5 text-sm font-mono font-bold bg-background border border-border rounded-xl text-foreground focus:outline-none focus:border-accent-purple"
                        />
                      </div>

                      <Button
                        type="submit"
                        variant="primary"
                        size="md"
                        className="w-full"
                        isLoading={isSubmitting}
                        disabled={!selectedAssignedId}
                        leftIcon={<Check className="w-4 h-4" />}
                      >
                        {selectedAssignedId ? 'Save Clip Entry' : 'All IDs Logged Today'}
                      </Button>
                    </form>
                  </div>

                  <div className="mt-4 pt-3 border-t border-border/80 text-[11px] text-foreground-subtle leading-relaxed">
                    Once submitted, only Administrators can edit or delete clip records.
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* ===================================================================== */}
        {/* DATE BAR & ENTRIES TABLE (ADMIN MANIPULATES; MEMBER VIEWS ONLY)       */}
        {/* ===================================================================== */}
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

              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent text-sm font-semibold text-foreground px-2 py-1 focus:outline-none cursor-pointer"
              />

              <button
                onClick={handleNextDay}
                className="p-1.5 text-foreground-muted hover:text-foreground rounded-lg hover:bg-card transition-colors"
                title="Next Day"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <Button variant="outline" size="sm" onClick={handleToday} className="text-xs font-semibold">
              Today
            </Button>

            {isAdmin && (
              <select
                value={filterPersonId}
                onChange={(e) => setFilterPersonId(e.target.value)}
                className="px-3 py-1.5 text-xs font-semibold bg-background border border-border rounded-xl text-foreground focus:outline-none focus:border-accent-purple"
              >
                <option value="all">All Members</option>
                {people.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="flex items-center gap-4 bg-background px-4 py-2.5 rounded-xl border border-border">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-foreground-subtle">
                {isAdmin ? 'Filtered Total' : 'Your Total'} for {formatDate(selectedDate, 'dd MMM yyyy')}
              </div>
              <div className="text-xl md:text-2xl font-extrabold text-accent-purple flex items-baseline gap-1.5">
                <span>{formatNumber(dailyTotalClips)}</span>
                <span className="text-xs font-semibold text-foreground-muted">clips</span>
              </div>
            </div>
            <div className="h-8 w-px bg-border hidden sm:block" />
            <div className="text-right hidden sm:block">
              <div className="text-[11px] text-foreground-subtle">Entries</div>
              <div className="text-sm font-bold text-foreground">{visibleEntries.length} IDs logged</div>
            </div>
          </div>
        </div>

        {/* Entries Table */}
        <div className="p-6 rounded-2xl bg-card border border-border shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <div>
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                {isAdmin ? (
                  <SlidersHorizontal className="w-4 h-4 text-accent-purple" />
                ) : (
                  <CalendarIcon className="w-4 h-4 text-accent-green" />
                )}
                {isAdmin
                  ? `Clip Records for ${formatDate(selectedDate, 'dd MMMM yyyy')} (Admin Edit & Delete)`
                  : `Your Logged Clips for ${formatDate(selectedDate, 'dd MMMM yyyy')}`}
              </h3>
              <p className="text-xs text-foreground-muted">
                {isAdmin
                  ? 'Manipulate records: change clip counts, edit entry date, or delete incorrect entries.'
                  : 'Submitted records for this date (Read-only view).'}
              </p>
            </div>

            <div className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-accent-purple/15 text-accent-purple border border-accent-purple/30">
              Total Clips: {formatNumber(dailyTotalClips)}
            </div>
          </div>

          {loading ? (
            <div className="p-8 text-center text-xs text-foreground-muted">Loading entries...</div>
          ) : visibleEntries.length === 0 ? (
            <div className="p-10 text-center border border-dashed border-border rounded-xl">
              <CalendarIcon className="w-10 h-10 text-foreground-subtle mx-auto mb-2 opacity-50" />
              <p className="text-sm font-semibold text-foreground">
                No entries recorded for {formatDate(selectedDate, 'dd MMMM yyyy')}
              </p>
              <p className="text-xs text-foreground-muted mt-1">
                {isAdmin
                  ? 'Select another date or member above to view and edit existing clip records.'
                  : 'Use the forms above to log daily clips for your assigned IDs.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-xs uppercase tracking-wider text-foreground-subtle">
                    <th className="pb-3 font-semibold">Member</th>
                    <th className="pb-3 font-semibold">Assigned ID</th>
                    <th className="pb-3 font-semibold">Notes</th>
                    <th className="pb-3 font-semibold text-right">Clips Count</th>
                    {isAdmin && <th className="pb-3 font-semibold text-right">Manipulate (Edit / Delete)</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {visibleEntries.map((entry) => (
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
                              setEditDateValue(entry.entry_date);
                              setEditError(null);
                            }}
                            className="p-1.5 rounded-lg text-foreground-muted hover:text-foreground hover:bg-background border border-transparent hover:border-border transition-colors"
                            title="Edit clip count or date (Admin only)"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleAdminDeleteEntry(entry)}
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

      {/* MODAL: ADMIN MANIPULATE CLIP RECORD (Edit Count + Date) */}
      <Modal
        isOpen={!!editingEntry}
        onClose={() => setEditingEntry(null)}
        title="Edit / Manipulate Clip Record"
        description={`Update record for ${editingEntry?.person_name} (ID ${editingEntry?.id_value})`}
      >
        <form onSubmit={handleAdminUpdateEntry} className="space-y-4">
          {editError && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-xs text-red-300">
              {editError}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-foreground-muted uppercase tracking-wider mb-1.5">
              Entry Date
            </label>
            <input
              type="date"
              required
              value={editDateValue}
              onChange={(e) => setEditDateValue(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm bg-background border border-border rounded-xl text-foreground focus:outline-none focus:border-accent-purple"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground-muted uppercase tracking-wider mb-1.5">
              Clip Count
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
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>
    </AppShell>
  );
}
