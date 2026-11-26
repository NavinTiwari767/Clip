'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import AppShell from '@/components/layout/AppShell';
import { Button } from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import {
  getPeopleWithIds,
  createPerson,
  updatePerson,
  deletePerson,
  createAssignedId,
  deleteAssignedId,
} from '@/lib/services/clipService';
import type { PersonWithIds } from '@/types/database';
import { useAuth } from '@/lib/useAuth';
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
  ShieldAlert,
} from 'lucide-react';

export default function PeoplePage() {
  const { isAdmin } = useAuth();
  const [people, setPeople] = useState<PersonWithIds[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // Modals state
  const [isAddPersonOpen, setIsAddPersonOpen] = useState(false);
  const [newPersonName, setNewPersonName] = useState('');
  const [addPersonLoading, setAddPersonLoading] = useState(false);

  const [editPerson, setEditPerson] = useState<PersonWithIds | null>(null);
  const [editPersonName, setEditPersonName] = useState('');
  const [editPersonLoading, setEditPersonLoading] = useState(false);

  const [deletePersonTarget, setDeletePersonTarget] = useState<PersonWithIds | null>(null);
  const [deletePersonLoading, setDeletePersonLoading] = useState(false);

  // Quick Add ID Modal
  const [targetPersonForId, setTargetPersonForId] = useState<PersonWithIds | null>(null);
  const [newIdValue, setNewIdValue] = useState('');
  const [newIdNotes, setNewIdNotes] = useState('');
  const [addIdLoading, setAddIdLoading] = useState(false);
  const [idError, setIdError] = useState<string | null>(null);

  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const loadPeople = async () => {
    setLoading(true);
    try {
      const data = await getPeopleWithIds();
      setPeople(data);
    } catch (err) {
      console.error('Failed to load people:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPeople();
  }, []);

  const showToast = (msg: string) => {
    setFeedbackMessage(msg);
    setTimeout(() => setFeedbackMessage(null), 3500);
  };

  // 1. Add Person (Admin only)
  const handleAddPerson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      alert('Only Admins can add people');
      return;
    }
    if (!newPersonName.trim()) return;
    setAddPersonLoading(true);
    try {
      await createPerson(newPersonName.trim());
      setNewPersonName('');
      setIsAddPersonOpen(false);
      showToast('Person added successfully');
      loadPeople();
    } catch (err: any) {
      alert(err.message || 'Failed to add person');
    } finally {
      setAddPersonLoading(false);
    }
  };

  // 2. Edit Person (Admin only)
  const handleEditPerson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      alert('Only Admins can edit people');
      return;
    }
    if (!editPerson || !editPersonName.trim()) return;
    setEditPersonLoading(true);
    try {
      await updatePerson(editPerson.id, editPersonName.trim());
      setEditPerson(null);
      showToast('Person updated successfully');
      loadPeople();
    } catch (err: any) {
      alert(err.message || 'Failed to update person');
    } finally {
      setEditPersonLoading(false);
    }
  };

  // 3. Delete Person (Admin only)
  const handleDeletePerson = async () => {
    if (!isAdmin) {
      alert('Only Admins can delete people');
      return;
    }
    if (!deletePersonTarget) return;
    setDeletePersonLoading(true);
    try {
      await deletePerson(deletePersonTarget.id);
      setDeletePersonTarget(null);
      showToast('Person and assigned IDs deleted');
      loadPeople();
    } catch (err: any) {
      alert(err.message || 'Failed to delete person');
    } finally {
      setDeletePersonLoading(false);
    }
  };

  // 4. Quick Add ID (Admin only)
  const handleAddId = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      alert('Only Admins can assign IDs');
      return;
    }
    if (!targetPersonForId || !newIdValue.trim()) return;
    setAddIdLoading(true);
    setIdError(null);
    try {
      await createAssignedId(targetPersonForId.id, newIdValue.trim(), newIdNotes.trim() || null);
      setNewIdValue('');
      setNewIdNotes('');
      setTargetPersonForId(null);
      showToast(`ID ${newIdValue.trim()} assigned to ${targetPersonForId.name}`);
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
    p.assigned_ids.some((id) => id.id_value.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <AppShell
      title="People & Assigned IDs"
      subtitle="View tracked individuals and their assigned clip tracking IDs"
    >
      <div className="space-y-6 pb-12">
        {/* Toast Feedback */}
        {feedbackMessage && (
          <div className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl bg-accent-green text-white font-medium text-sm shadow-xl flex items-center gap-2 animate-fade-in">
            <UserCheck className="w-4 h-4" />
            <span>{feedbackMessage}</span>
          </div>
        )}

        {/* User Permission Banner for Regular Members */}
        {!isAdmin && (
          <div className="p-3.5 rounded-xl bg-accent-blue/10 border border-accent-blue/20 text-xs text-accent-blue flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-accent-blue shrink-0" />
              <span>
                <strong>Member View Mode:</strong> You can view all people and their assigned IDs. Creating, editing, or deleting people is reserved for Admins.
              </span>
            </div>
            <span className="font-mono text-[11px] bg-accent-blue/20 px-2 py-0.5 rounded">Read Only</span>
          </div>
        )}

        {/* Action Bar: Search & Add Person */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card border border-border p-4 md:p-5 rounded-2xl shadow-lg">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-foreground-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by person name or assigned ID (e.g. Rahul, 50)..."
              className="w-full pl-10 pr-4 py-2 text-sm bg-background border border-border rounded-xl text-foreground placeholder:text-foreground-subtle focus:outline-none focus:border-accent-purple"
            />
          </div>

          <div className="flex items-center gap-3">
            <div className="text-xs text-foreground-muted hidden md:block">
              Total: <span className="font-bold text-foreground">{people.length}</span> people
            </div>
            {isAdmin && (
              <Button
                variant="primary"
                size="md"
                onClick={() => {
                  setNewPersonName('');
                  setIsAddPersonOpen(true);
                }}
                leftIcon={<Plus className="w-4 h-4" />}
              >
                Add New Person
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
            <h3 className="text-base font-bold text-foreground">No people found</h3>
            <p className="text-xs text-foreground-muted mt-1 max-w-sm mx-auto">
              {searchQuery
                ? `No people or IDs match "${searchQuery}". Try a different keyword.`
                : 'No people registered yet.'}
            </p>
            {isAdmin && !searchQuery && (
              <Button
                variant="primary"
                size="sm"
                className="mt-4"
                onClick={() => setIsAddPersonOpen(true)}
                leftIcon={<Plus className="w-4 h-4" />}
              >
                Add First Person
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
                  {/* Person Header */}
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-purple/20 to-accent-blue/20 border border-accent-purple/30 flex items-center justify-center font-bold text-accent-purple text-base">
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
                        <span className="text-xs text-foreground-muted">
                          {person.assigned_ids.length} Assigned ID
                          {person.assigned_ids.length === 1 ? '' : 's'}
                        </span>
                      </div>
                    </div>

                    {/* Actions Menu (Admin Only) */}
                    {isAdmin && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setEditPerson(person);
                            setEditPersonName(person.name);
                          }}
                          className="p-1.5 rounded-lg text-foreground-muted hover:text-foreground hover:bg-background border border-transparent hover:border-border transition-colors"
                          title="Edit person name (Admin only)"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeletePersonTarget(person)}
                          className="p-1.5 rounded-lg text-foreground-muted hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-colors"
                          title="Delete person (Admin only)"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Assigned IDs List */}
                  <div className="border-t border-border/80 pt-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold uppercase tracking-wider text-foreground-subtle flex items-center gap-1">
                        <Tag className="w-3 h-3 text-accent-purple" />
                        Assigned IDs
                      </span>
                      {isAdmin && (
                        <button
                          onClick={() => {
                            setTargetPersonForId(person);
                            setNewIdValue('');
                            setNewIdNotes('');
                            setIdError(null);
                          }}
                          className="text-xs font-semibold text-accent-purple hover:text-accent-purple-hover flex items-center gap-1 hover:underline"
                        >
                          <PlusCircle className="w-3.5 h-3.5" />
                          Assign ID
                        </button>
                      )}
                    </div>

                    {person.assigned_ids.length === 0 ? (
                      <p className="text-xs text-foreground-subtle italic py-2">
                        No IDs assigned yet.
                      </p>
                    ) : (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {person.assigned_ids.map((idItem) => (
                          <div
                            key={idItem.id}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-background border border-border text-xs font-mono font-medium text-foreground hover:border-accent-purple/50 group/tag transition-all"
                            title={idItem.notes ? `Note: ${idItem.notes}` : undefined}
                          >
                            <span className="text-accent-blue font-bold">ID {idItem.id_value}</span>
                            {idItem.notes && (
                              <span className="text-[10px] text-foreground-subtle max-w-[80px] truncate">
                                ({idItem.notes})
                              </span>
                            )}
                            {isAdmin && (
                              <button
                                onClick={() => handleDeleteId(idItem.id, idItem.id_value, person.name)}
                                className="text-foreground-subtle hover:text-red-400 opacity-60 hover:opacity-100 transition-opacity ml-0.5"
                                title="Delete this assigned ID (Admin only)"
                              >
                                &times;
                              </button>
                            )}
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
                    View Details & History &rarr;
                  </Link>

                  <Link
                    href={`/daily-entry?personId=${person.id}`}
                    className="text-xs font-medium text-accent-blue hover:underline"
                  >
                    Add Clips for {person.name.split(' ')[0]}
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODAL: ADD PERSON (Admin Only) */}
      <Modal
        isOpen={isAddPersonOpen}
        onClose={() => setIsAddPersonOpen(false)}
        title="Add New Person"
        description="Admin Action: Create a new person to track clip production"
      >
        <form onSubmit={handleAddPerson} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-foreground-muted uppercase tracking-wider mb-1.5">
              Person Full Name
            </label>
            <input
              type="text"
              required
              autoFocus
              value={newPersonName}
              onChange={(e) => setNewPersonName(e.target.value)}
              placeholder="e.g. Rahul, Amit, Priya"
              className="w-full px-3.5 py-2.5 text-sm bg-background border border-border rounded-xl text-foreground placeholder:text-foreground-subtle focus:outline-none focus:border-accent-purple"
            />
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
              Create Person
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL: EDIT PERSON (Admin Only) */}
      <Modal
        isOpen={!!editPerson}
        onClose={() => setEditPerson(null)}
        title="Edit Person Name"
        description="Admin Action: Update the name of this tracked individual"
      >
        <form onSubmit={handleEditPerson} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-foreground-muted uppercase tracking-wider mb-1.5">
              Person Name
            </label>
            <input
              type="text"
              required
              autoFocus
              value={editPersonName}
              onChange={(e) => setEditPersonName(e.target.value)}
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

      {/* MODAL: DELETE PERSON CONFIRMATION (Admin Only) */}
      <Modal
        isOpen={!!deletePersonTarget}
        onClose={() => setDeletePersonTarget(null)}
        title="Delete Person Confirmation"
        description="Warning: this action is irreversible"
      >
        <div className="space-y-4">
          <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-300 flex items-start gap-2.5">
            <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div>
              Deleting <strong className="text-white">{deletePersonTarget?.name}</strong> will also
              permanently delete all of their{' '}
              <strong>{deletePersonTarget?.assigned_ids.length} assigned IDs</strong> and all historical
              daily clip records associated with them.
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

      {/* MODAL: QUICK ASSIGN ID (Admin Only) */}
      <Modal
        isOpen={!!targetPersonForId}
        onClose={() => setTargetPersonForId(null)}
        title={`Assign ID to ${targetPersonForId?.name}`}
        description="Admin Action: Assign a unique tracking ID number to this person"
      >
        <form onSubmit={handleAddId} className="space-y-4">
          {idError && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-xs text-red-300">
              {idError}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-foreground-muted uppercase tracking-wider mb-1.5">
              Assigned ID Value (e.g. 2, 4, 50, 10, 15)
            </label>
            <div className="relative">
              <Hash className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-foreground-muted" />
              <input
                type="text"
                required
                autoFocus
                value={newIdValue}
                onChange={(e) => setNewIdValue(e.target.value)}
                placeholder="e.g. 2"
                className="w-full pl-10 pr-4 py-2.5 text-sm font-mono bg-background border border-border rounded-xl text-foreground placeholder:text-foreground-subtle focus:outline-none focus:border-accent-purple"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground-muted uppercase tracking-wider mb-1.5">
              Notes / Description (Optional)
            </label>
            <input
              type="text"
              value={newIdNotes}
              onChange={(e) => setNewIdNotes(e.target.value)}
              placeholder="e.g. Primary line, Shift B, Bulk machine"
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
              Assign ID
            </Button>
          </div>
        </form>
      </Modal>
    </AppShell>
  );
}
