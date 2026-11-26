'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import AppShell from '@/components/layout/AppShell';
import { Button } from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import {
  getPeopleWithIds,
  peekPeopleCache,
  createPerson,
  updatePerson,
  deletePerson,
  createAssignedId,
  deleteAssignedId,
} from '@/lib/services/clipService';
import type { PersonWithIds } from '@/types/database';
import { useAuth } from '@/lib/useAuth';
import { formatNumber } from '@/lib/utils';
import {
  Users,
  Plus,
  Search,
  Tag,
  Edit2,
  Trash2,
  ExternalLink,
  PlusCircle,
  Hash,
  AlertTriangle,
  UserCheck,
  Lock,
  Mail,
  Key,
  Layers,
} from 'lucide-react';

export default function PeoplePage() {
  const { isAdmin } = useAuth();
  const cachedPeople = peekPeopleCache();
  const [people, setPeople] = useState<PersonWithIds[]>(cachedPeople || []);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(!cachedPeople);

  // Add Member Modal State (Name + Email + Password)
  const [isAddPersonOpen, setIsAddPersonOpen] = useState(false);
  const [newPersonName, setNewPersonName] = useState('');
  const [newPersonEmail, setNewPersonEmail] = useState('');
  const [newPersonPassword, setNewPersonPassword] = useState('');
  const [addPersonLoading, setAddPersonLoading] = useState(false);

  // Edit Member Modal State
  const [editPerson, setEditPerson] = useState<PersonWithIds | null>(null);
  const [editPersonName, setEditPersonName] = useState('');
  const [editPersonEmail, setEditPersonEmail] = useState('');
  const [editPersonPassword, setEditPersonPassword] = useState('');
  const [editPersonLoading, setEditPersonLoading] = useState(false);

  // Delete Member Modal State
  const [deletePersonTarget, setDeletePersonTarget] = useState<PersonWithIds | null>(null);
  const [deletePersonLoading, setDeletePersonLoading] = useState(false);

  // Assign ID Modal (Single or Bulk 10-20 IDs)
  const [targetPersonForId, setTargetPersonForId] = useState<PersonWithIds | null>(null);
  const [assignMode, setAssignMode] = useState<'single' | 'bulk'>('single');
  const [newIdValue, setNewIdValue] = useState('');
  const [bulkIdsText, setBulkIdsText] = useState('');
  const [newIdNotes, setNewIdNotes] = useState('');
  const [addIdLoading, setAddIdLoading] = useState(false);
  const [idError, setIdError] = useState<string | null>(null);

  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const loadPeople = async (force = false) => {
    if (!peekPeopleCache() || force) setLoading(true);
    try {
      const data = await getPeopleWithIds(force);
      setPeople(data);
    } catch (err) {
      console.error('Failed to load people:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPeople(false);
  }, []);

  const showToast = (msg: string) => {
    setFeedbackMessage(msg);
    setTimeout(() => setFeedbackMessage(null), 3500);
  };

  // 1. Add Person / Member (Admin only)
  const handleAddPerson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      alert('Only Admins can add members');
      return;
    }
    if (!newPersonName.trim()) return;
    setAddPersonLoading(true);
    try {
      await createPerson(
        newPersonName.trim(),
        newPersonEmail.trim() || undefined,
        newPersonPassword.trim() || undefined
      );
      setNewPersonName('');
      setNewPersonEmail('');
      setNewPersonPassword('');
      setIsAddPersonOpen(false);
      showToast('Member created successfully. They can now log in.');
      loadPeople();
    } catch (err: any) {
      alert(err.message || 'Failed to add member');
    } finally {
      setAddPersonLoading(false);
    }
  };

  // 2. Edit Person / Member (Admin only)
  const handleEditPerson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      alert('Only Admins can edit members');
      return;
    }
    if (!editPerson || !editPersonName.trim()) return;
    setEditPersonLoading(true);
    try {
      await updatePerson(
        editPerson.id,
        editPersonName.trim(),
        editPersonEmail.trim() || undefined,
        editPersonPassword.trim() || undefined
      );
      setEditPerson(null);
      showToast('Member updated successfully');
      loadPeople();
    } catch (err: any) {
      alert(err.message || 'Failed to update member');
    } finally {
      setEditPersonLoading(false);
    }
  };

  // 3. Delete Person (Admin only)
  const handleDeletePerson = async () => {
    if (!isAdmin) {
      alert('Only Admins can delete members');
      return;
    }
    if (!deletePersonTarget) return;
    setDeletePersonLoading(true);
    try {
      await deletePerson(deletePersonTarget.id);
      setDeletePersonTarget(null);
      showToast('Member and assigned IDs deleted');
      loadPeople();
    } catch (err: any) {
      alert(err.message || 'Failed to delete member');
    } finally {
      setDeletePersonLoading(false);
    }
  };

  // 4. Assign ID (Single or Bulk)
  const handleAddId = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      alert('Only Admins can assign IDs');
      return;
    }
    if (!targetPersonForId) return;

    setAddIdLoading(true);
    setIdError(null);
    try {
      if (assignMode === 'bulk') {
        if (!bulkIdsText.trim()) {
          setIdError('Please enter at least one ID');
          setAddIdLoading(false);
          return;
        }
        await createAssignedId(
          targetPersonForId.id,
          '',
          newIdNotes.trim() || null,
          bulkIdsText.trim()
        );
        showToast(`Bulk IDs assigned to ${targetPersonForId.name}`);
      } else {
        if (!newIdValue.trim()) {
          setIdError('Please enter an ID value');
          setAddIdLoading(false);
          return;
        }
        await createAssignedId(
          targetPersonForId.id,
          newIdValue.trim(),
          newIdNotes.trim() || null
        );
        showToast(`ID ${newIdValue.trim()} assigned to ${targetPersonForId.name}`);
      }

      setNewIdValue('');
      setBulkIdsText('');
      setNewIdNotes('');
      setTargetPersonForId(null);
      loadPeople();
    } catch (err: any) {
      setIdError(err.message || 'Failed to assign ID');
    } finally {
      setAddIdLoading(false);
    }
  };

  // 5. Delete an Assigned ID (Admin only)
  const handleDeleteId = async (idRecordId: string, idVal: string, personName: string) => {
    if (!isAdmin) {
      alert('Only Admins can delete assigned IDs');
      return;
    }
    if (!confirm(`Are you sure you want to remove ID "${idVal}" from ${personName}? Associated clip records will be removed.`)) {
      return;
    }
    try {
      await deleteAssignedId(idRecordId);
      showToast(`ID ${idVal} removed`);
      loadPeople();
    } catch (err: any) {
      alert(err.message || 'Failed to delete ID');
    }
  };

  // Filter people by search
  const filteredPeople = people.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.email && p.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
    p.assigned_ids.some((id) => id.id_value.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <AppShell
      title="People & Members Management"
      subtitle="Admin assigns unlimited IDs to members and tracks clip volume per ID"
    >
      <div className="space-y-6 pb-12">
        {feedbackMessage && (
          <div className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl bg-accent-green text-white font-medium text-sm shadow-xl flex items-center gap-2 animate-fade-in">
            <UserCheck className="w-4 h-4" />
            <span>{feedbackMessage}</span>
          </div>
        )}

        {/* Member View Mode Banner */}
        {!isAdmin && (
          <div className="p-3.5 rounded-xl bg-accent-blue/10 border border-accent-blue/20 text-xs text-accent-blue flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-accent-blue shrink-0" />
              <span>
                <strong>Member View Mode:</strong> You can view all team members and their assigned IDs. Administrator assigns IDs and manages accounts.
              </span>
            </div>
            <span className="font-mono text-[11px] bg-accent-blue/20 px-2 py-0.5 rounded">Read Only</span>
          </div>
        )}

        {/* Action Bar: Search & Add Member */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card border border-border p-4 md:p-5 rounded-2xl shadow-lg">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-foreground-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, email, or ID (e.g. Rahul, 30001)..."
              className="w-full pl-10 pr-4 py-2 text-sm bg-background border border-border rounded-xl text-foreground placeholder:text-foreground-subtle focus:outline-none focus:border-accent-purple"
            />
          </div>

          <div className="flex items-center gap-3">
            <div className="text-xs text-foreground-muted hidden md:block">
              Total: <span className="font-bold text-foreground">{people.length}</span> members
            </div>
            {isAdmin && (
              <Button
                variant="primary"
                size="md"
                onClick={() => {
                  setNewPersonName('');
                  setNewPersonEmail('');
                  setNewPersonPassword('');
                  setIsAddPersonOpen(true);
                }}
                leftIcon={<Plus className="w-4 h-4" />}
              >
                Add New Member
              </Button>
            )}
          </div>
        </div>

        {/* People Cards Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-48 rounded-2xl bg-card/50 border border-border animate-pulse" />
            ))}
          </div>
        ) : filteredPeople.length === 0 ? (
          <div className="p-12 text-center rounded-2xl bg-card border border-dashed border-border shadow-md">
            <Users className="w-12 h-12 text-foreground-subtle mx-auto mb-3 opacity-50" />
            <h3 className="text-base font-bold text-foreground">No members found</h3>
            <p className="text-xs text-foreground-muted mt-1 max-w-sm mx-auto">
              {searchQuery
                ? `No members or IDs match "${searchQuery}".`
                : 'Get started by creating your first team member and assign IDs to them.'}
            </p>
            {isAdmin && !searchQuery && (
              <Button
                variant="primary"
                size="sm"
                className="mt-4"
                onClick={() => setIsAddPersonOpen(true)}
                leftIcon={<Plus className="w-4 h-4" />}
              >
                Add First Member
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPeople.map((person) => (
              <div
                key={person.id}
                className="rounded-2xl bg-card border border-border p-5 flex flex-col justify-between hover:border-accent-purple/40 transition-all shadow-xl group"
              >
                <div>
                  {/* Member Header */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-accent-purple/20 to-accent-blue/20 border border-accent-purple/30 flex items-center justify-center font-bold text-accent-purple text-lg shadow-sm">
                        {person.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <Link
                          href={`/people/${person.id}`}
                          className="text-base font-bold text-foreground hover:text-accent-purple transition-colors flex items-center gap-1.5"
                        >
                          <span>{person.name}</span>
                          <ExternalLink className="w-3.5 h-3.5 text-foreground-subtle opacity-0 group-hover:opacity-100 transition-opacity" />
                        </Link>
                        {person.email ? (
                          <div className="text-xs text-foreground-muted flex items-center gap-1 font-mono">
                            <Mail className="w-3 h-3 text-foreground-subtle" />
                            {person.email}
                          </div>
                        ) : (
                          <div className="text-xs text-foreground-subtle italic">No login email set</div>
                        )}
                      </div>
                    </div>

                    {/* Actions Menu (Admin Only) */}
                    {isAdmin && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setEditPerson(person);
                            setEditPersonName(person.name);
                            setEditPersonEmail(person.email || '');
                            setEditPersonPassword('');
                          }}
                          className="p-1.5 rounded-lg text-foreground-muted hover:text-foreground hover:bg-background border border-transparent hover:border-border transition-colors"
                          title="Edit member details & password"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeletePersonTarget(person)}
                          className="p-1.5 rounded-lg text-foreground-muted hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-colors"
                          title="Delete member"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Cumulative Total Clips Badge */}
                  <div className="mb-3 px-3 py-2 rounded-xl bg-background border border-border/80 flex items-center justify-between text-xs">
                    <span className="text-foreground-muted font-medium">Total Production:</span>
                    <span className="font-extrabold text-accent-purple text-sm">
                      {formatNumber(person.total_clips || 0)}{' '}
                      <span className="text-xs font-normal text-foreground-muted">clips</span>
                    </span>
                  </div>

                  {/* Assigned IDs List with Clips per ID */}
                  {/* "admin dekh skta hai user kitna id asgn hua hai and kis id pe kitne clips kiye hai example 30001 - 10000 clips waise h sare" */}
                  <div className="border-t border-border/80 pt-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold uppercase tracking-wider text-foreground-subtle flex items-center gap-1">
                        <Tag className="w-3 h-3 text-accent-purple" />
                        Assigned IDs ({person.assigned_ids.length})
                      </span>
                      {isAdmin && (
                        <button
                          onClick={() => {
                            setTargetPersonForId(person);
                            setAssignMode('single');
                            setNewIdValue('');
                            setBulkIdsText('');
                            setNewIdNotes('');
                            setIdError(null);
                          }}
                          className="text-xs font-semibold text-accent-purple hover:text-accent-purple-hover flex items-center gap-1 hover:underline"
                        >
                          <PlusCircle className="w-3.5 h-3.5" />
                          Assign ID(s)
                        </button>
                      )}
                    </div>

                    {person.assigned_ids.length === 0 ? (
                      <p className="text-xs text-foreground-subtle italic py-2">
                        No IDs assigned yet.
                      </p>
                    ) : (
                      <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                        {person.assigned_ids.map((idItem) => (
                          <div
                            key={idItem.id}
                            className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-background border border-border text-xs hover:border-accent-purple/40 transition-all"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="font-mono font-bold text-accent-blue bg-accent-blue/10 px-2 py-0.5 rounded text-xs shrink-0">
                                ID {idItem.id_value}
                              </span>
                              {idItem.notes && (
                                <span className="text-[11px] text-foreground-subtle truncate max-w-[100px]">
                                  {idItem.notes}
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <span className="font-bold text-accent-purple font-mono">
                                {formatNumber(idItem.total_clips || 0)} clips
                              </span>
                              {isAdmin && (
                                <button
                                  onClick={() => handleDeleteId(idItem.id, idItem.id_value, person.name)}
                                  className="text-foreground-subtle hover:text-red-400 opacity-60 hover:opacity-100 transition-opacity ml-1"
                                  title="Delete this assigned ID"
                                >
                                  &times;
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Footer Link */}
                <div className="mt-5 pt-3 border-t border-border flex items-center justify-between">
                  <Link
                    href={`/people/${person.id}`}
                    className="text-xs font-semibold text-accent-purple hover:underline flex items-center gap-1"
                  >
                    ID Details &rarr;
                  </Link>

                  <Link
                    href={isAdmin ? `/my-history?personId=${person.id}` : `/daily-entry`}
                    className="text-xs font-medium text-accent-blue hover:underline"
                  >
                    {isAdmin ? `10-12 Day History →` : `Add Clips`}
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODAL: ADD MEMBER WITH LOGIN CREDENTIALS (Admin Only) */}
      <Modal
        isOpen={isAddPersonOpen}
        onClose={() => setIsAddPersonOpen(false)}
        title="Add New Member Account"
        description="Admin Action: Create a member profile with login credentials"
      >
        <form onSubmit={handleAddPerson} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-foreground-muted uppercase tracking-wider mb-1.5">
              Member Full Name
            </label>
            <input
              type="text"
              required
              autoFocus
              value={newPersonName}
              onChange={(e) => setNewPersonName(e.target.value)}
              placeholder="e.g. Rahul Sharma"
              className="w-full px-3.5 py-2.5 text-sm bg-background border border-border rounded-xl text-foreground placeholder:text-foreground-subtle focus:outline-none focus:border-accent-purple"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground-muted uppercase tracking-wider mb-1.5">
              Login Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-foreground-muted" />
              <input
                type="email"
                required
                value={newPersonEmail}
                onChange={(e) => setNewPersonEmail(e.target.value)}
                placeholder="rahul@denseai.com"
                className="w-full pl-10 pr-4 py-2.5 text-sm bg-background border border-border rounded-xl text-foreground placeholder:text-foreground-subtle focus:outline-none focus:border-accent-purple"
              />
            </div>
            <p className="text-[11px] text-foreground-subtle mt-1">
              Member will use this email to log in and record clips.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground-muted uppercase tracking-wider mb-1.5">
              Login Password
            </label>
            <div className="relative">
              <Key className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-foreground-muted" />
              <input
                type="text"
                required
                value={newPersonPassword}
                onChange={(e) => setNewPersonPassword(e.target.value)}
                placeholder="e.g. rahul123"
                className="w-full pl-10 pr-4 py-2.5 text-sm bg-background border border-border rounded-xl text-foreground placeholder:text-foreground-subtle focus:outline-none focus:border-accent-purple"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsAddPersonOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={addPersonLoading}
            >
              Create Member
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL: EDIT MEMBER (Admin Only) */}
      <Modal
        isOpen={!!editPerson}
        onClose={() => setEditPerson(null)}
        title="Edit Member Account"
        description="Admin Action: Update member details or reset login password"
      >
        <form onSubmit={handleEditPerson} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-foreground-muted uppercase tracking-wider mb-1.5">
              Member Name
            </label>
            <input
              type="text"
              required
              value={editPersonName}
              onChange={(e) => setEditPersonName(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm bg-background border border-border rounded-xl text-foreground focus:outline-none focus:border-accent-purple"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground-muted uppercase tracking-wider mb-1.5">
              Login Email
            </label>
            <input
              type="email"
              value={editPersonEmail}
              onChange={(e) => setEditPersonEmail(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm bg-background border border-border rounded-xl text-foreground focus:outline-none focus:border-accent-purple"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground-muted uppercase tracking-wider mb-1.5">
              New Password (Leave blank to keep unchanged)
            </label>
            <input
              type="text"
              value={editPersonPassword}
              onChange={(e) => setEditPersonPassword(e.target.value)}
              placeholder="Enter new password if resetting"
              className="w-full px-3.5 py-2.5 text-sm bg-background border border-border rounded-xl text-foreground focus:outline-none focus:border-accent-purple"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setEditPerson(null)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={editPersonLoading}
            >
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL: DELETE MEMBER (Admin Only) */}
      <Modal
        isOpen={!!deletePersonTarget}
        onClose={() => setDeletePersonTarget(null)}
        title="Delete Member Confirmation"
      >
        <div className="space-y-4">
          <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-300 flex items-start gap-2.5">
            <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div>
              Permanently delete <strong className="text-white">{deletePersonTarget?.name}</strong> and all {deletePersonTarget?.assigned_ids.length} assigned IDs?
              Their login account and all daily clip counts will be erased.
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setDeletePersonTarget(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              size="sm"
              onClick={handleDeletePerson}
              isLoading={deletePersonLoading}
            >
              Delete Permanently
            </Button>
          </div>
        </div>
      </Modal>

      {/* MODAL: ASSIGN ID (Single or Bulk 10-20 IDs) */}
      {/* "admin id assign karega bass ek din ke pass 10 20 or jyad bhi kar skt ahai" */}
      <Modal
        isOpen={!!targetPersonForId}
        onClose={() => setTargetPersonForId(null)}
        title={`Assign ID(s) to ${targetPersonForId?.name}`}
        description="Assign single or multiple tracking IDs (10, 20 or more) to this member"
      >
        <form onSubmit={handleAddId} className="space-y-4">
          {idError && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-xs text-red-300">
              {idError}
            </div>
          )}

          {/* Mode Switcher */}
          <div className="flex rounded-xl bg-background border border-border p-1">
            <button
              type="button"
              onClick={() => setAssignMode('single')}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                assignMode === 'single'
                  ? 'bg-accent-purple text-white shadow-sm'
                  : 'text-foreground-muted hover:text-foreground'
              }`}
            >
              Single ID
            </button>
            <button
              type="button"
              onClick={() => setAssignMode('bulk')}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                assignMode === 'bulk'
                  ? 'bg-accent-purple text-white shadow-sm'
                  : 'text-foreground-muted hover:text-foreground'
              }`}
            >
              Bulk Add (10, 20+ IDs)
            </button>
          </div>

          {assignMode === 'single' ? (
            <div>
              <label className="block text-xs font-semibold text-foreground-muted uppercase tracking-wider mb-1.5">
                Assigned ID Value (e.g. 30001, 2, 4, 50)
              </label>
              <div className="relative">
                <Hash className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-foreground-muted" />
                <input
                  type="text"
                  required
                  autoFocus
                  value={newIdValue}
                  onChange={(e) => setNewIdValue(e.target.value)}
                  placeholder="e.g. 30001"
                  className="w-full pl-10 pr-4 py-2.5 text-sm font-mono bg-background border border-border rounded-xl text-foreground placeholder:text-foreground-subtle focus:outline-none focus:border-accent-purple"
                />
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-semibold text-foreground-muted uppercase tracking-wider mb-1.5">
                Bulk IDs (Paste comma or newline separated IDs)
              </label>
              <textarea
                rows={4}
                required
                autoFocus
                value={bulkIdsText}
                onChange={(e) => setBulkIdsText(e.target.value)}
                placeholder="30001, 30002, 30003&#10;30004&#10;30005"
                className="w-full px-3.5 py-2.5 text-sm font-mono bg-background border border-border rounded-xl text-foreground placeholder:text-foreground-subtle focus:outline-none focus:border-accent-purple"
              />
              <p className="text-[11px] text-foreground-subtle mt-1">
                Enter multiple IDs separated by commas or lines (e.g. assign 10, 20, 50 IDs at once).
              </p>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-foreground-muted uppercase tracking-wider mb-1.5">
              Notes / Description (Optional)
            </label>
            <input
              type="text"
              value={newIdNotes}
              onChange={(e) => setNewIdNotes(e.target.value)}
              placeholder="e.g. Shift 1, Primary line"
              className="w-full px-3.5 py-2.5 text-sm bg-background border border-border rounded-xl text-foreground placeholder:text-foreground-subtle focus:outline-none focus:border-accent-purple"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setTargetPersonForId(null)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={addIdLoading}
            >
              {assignMode === 'bulk' ? 'Assign All IDs' : 'Assign ID'}
            </Button>
          </div>
        </form>
      </Modal>
    </AppShell>
  );
}
