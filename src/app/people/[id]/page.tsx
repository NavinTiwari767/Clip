'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import AppShell from '@/components/layout/AppShell';
import { Button } from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import {
  getPersonById,
  updatePerson,
  deletePerson,
  createAssignedId,
  updateAssignedId,
  deleteAssignedId,
} from '@/lib/services/clipService';
import type { PersonWithIds, AssignedId } from '@/types/database';
import { useAuth } from '@/lib/useAuth';
import {
  ArrowLeft,
  Tag,
  Plus,
  Edit2,
  Trash2,
  CalendarCheck,
  Hash,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import { formatDate } from '@/lib/utils';

export default function PersonDetailPage() {
  const params = useParams();
  const router = useRouter();
  const personId = params.id as string;
  const { isAdmin } = useAuth();

  const [person, setPerson] = useState<PersonWithIds | null>(null);
  const [loading, setLoading] = useState(true);

  // Edit Person Name Modal
  const [isEditNameOpen, setIsEditNameOpen] = useState(false);
  const [nameValue, setNameValue] = useState('');
  const [nameLoading, setNameLoading] = useState(false);

  // Add Assigned ID Modal
  const [isAddIdOpen, setIsAddIdOpen] = useState(false);
  const [idValue, setIdValue] = useState('');
  const [idNotes, setIdNotes] = useState('');
  const [addIdLoading, setAddIdLoading] = useState(false);
  const [idError, setIdError] = useState<string | null>(null);

  // Edit Assigned ID Modal
  const [editingId, setEditingId] = useState<AssignedId | null>(null);
  const [editIdValue, setEditIdValue] = useState('');
  const [editIdNotes, setEditIdNotes] = useState('');
  const [editIdLoading, setEditIdLoading] = useState(false);

  // Delete Person Modal
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [feedback, setFeedback] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await getPersonById(personId);
      if (!data) {
        router.push('/people');
        return;
      }
      setPerson(data);
      setNameValue(data.name);
    } catch (err) {
      console.error('Failed to load person:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (personId) {
      loadData();
    }
  }, [personId]);

  const showNotification = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 3000);
  };

  const handleUpdateName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    if (!nameValue.trim()) return;
    setNameLoading(true);
    try {
      await updatePerson(personId, nameValue.trim());
      setIsEditNameOpen(false);
      showNotification('Person name updated');
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to update name');
    } finally {
      setNameLoading(false);
    }
  };

  const handleAddId = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    if (!idValue.trim()) return;
    setAddIdLoading(true);
    setIdError(null);
    try {
      await createAssignedId(personId, idValue.trim(), idNotes.trim() || null);
      setIdValue('');
      setIdNotes('');
      setIsAddIdOpen(false);
      showNotification(`ID ${idValue.trim()} assigned successfully`);
      loadData();
    } catch (err: any) {
      setIdError(err.message || 'Failed to assign ID');
    } finally {
      setAddIdLoading(false);
    }
  };

  const handleUpdateId = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    if (!editingId || !editIdValue.trim()) return;
    setEditIdLoading(true);
    try {
      await updateAssignedId(editingId.id, editIdValue.trim(), editIdNotes.trim() || null);
      setEditingId(null);
      showNotification(`ID ${editIdValue.trim()} updated`);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to update ID');
    } finally {
      setEditIdLoading(false);
    }
  };

  const handleDeleteId = async (id: string, val: string) => {
    if (!isAdmin) return;
    if (!confirm(`Are you sure you want to delete ID "${val}"? All associated clip entries will also be deleted.`)) {
      return;
    }
    try {
      await deleteAssignedId(id);
      showNotification(`ID ${val} deleted`);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete ID');
    }
  };

  const handleDeletePerson = async () => {
    if (!isAdmin) return;
    setDeleteLoading(true);
    try {
      await deletePerson(personId);
      router.push('/people');
    } catch (err: any) {
      alert(err.message || 'Failed to delete person');
      setDeleteLoading(false);
    }
  };

  if (loading || !person) {
    return (
      <AppShell title="Person Profile">
        <div className="p-8 text-center text-foreground-muted">Loading profile...</div>
      </AppShell>
    );
  }

  return (
    <AppShell
      title={`Person: ${person.name}`}
      subtitle="View and manage assigned tracking IDs and individual history"
    >
      <div className="space-y-6 pb-12">
        {feedback && (
          <div className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl bg-accent-green text-white font-medium text-sm shadow-xl flex items-center gap-2 animate-fade-in">
            <CheckCircle2 className="w-4 h-4" />
            <span>{feedback}</span>
          </div>
        )}

        {/* Navigation Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-foreground-muted">
          <Link href="/people" className="hover:text-foreground flex items-center gap-1">
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to People
          </Link>
          <span>/</span>
          <span className="text-foreground font-semibold">{person.name}</span>
        </div>

        {/* Profile Card */}
        <div className="p-6 rounded-2xl bg-card border border-border shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-accent-purple to-accent-blue flex items-center justify-center font-extrabold text-white text-2xl shadow-lg shadow-accent-purple/20">
              {person.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-extrabold text-foreground">{person.name}</h2>
                {isAdmin && (
                  <button
                    onClick={() => setIsEditNameOpen(true)}
                    className="p-1 text-foreground-muted hover:text-accent-purple transition-colors"
                    title="Edit Name (Admin only)"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                )}
              </div>
              <div className="text-xs text-foreground-muted mt-1 flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-foreground-subtle" />
                  Added {formatDate(person.created_at, 'dd MMM yyyy')}
                </span>
                <span>&bull;</span>
                <span className="font-semibold text-accent-blue">
                  {person.assigned_ids.length} Assigned ID{person.assigned_ids.length === 1 ? '' : 's'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link href={`/daily-entry?personId=${person.id}`}>
              <Button variant="primary" size="sm" leftIcon={<CalendarCheck className="w-4 h-4" />}>
                Record Daily Clips
              </Button>
            </Link>
            {isAdmin && (
              <Button
                variant="danger"
                size="sm"
                onClick={() => setIsDeleteOpen(true)}
                leftIcon={<Trash2 className="w-4 h-4" />}
              >
                Delete Person
              </Button>
            )}
          </div>
        </div>

        {/* Assigned IDs Management Section */}
        <div className="p-6 rounded-2xl bg-card border border-border shadow-xl">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                <Tag className="w-5 h-5 text-accent-purple" />
                Assigned Tracking IDs
              </h3>
              <p className="text-xs text-foreground-muted mt-0.5">
                IDs assigned to {person.name} for individual production tracking
              </p>
            </div>

            {isAdmin && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setIdValue('');
                  setIdNotes('');
                  setIdError(null);
                  setIsAddIdOpen(true);
                }}
                leftIcon={<Plus className="w-4 h-4 text-accent-purple" />}
              >
                Assign New ID
              </Button>
            )}
          </div>

          {person.assigned_ids.length === 0 ? (
            <div className="p-10 text-center border border-dashed border-border rounded-xl">
              <Hash className="w-10 h-10 text-foreground-subtle mx-auto mb-2 opacity-50" />
              <h4 className="text-sm font-bold text-foreground">No IDs assigned to {person.name}</h4>
              <p className="text-xs text-foreground-muted mt-1">
                {isAdmin
                  ? 'Assign IDs like 2, 4, 50 to track daily clip counts.'
                  : 'No tracking IDs assigned by admin.'}
              </p>
              {isAdmin && (
                <Button
                  variant="primary"
                  size="sm"
                  className="mt-4"
                  onClick={() => setIsAddIdOpen(true)}
                  leftIcon={<Plus className="w-4 h-4" />}
                >
                  Assign First ID
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-xs uppercase tracking-wider text-foreground-subtle">
                    <th className="pb-3 font-semibold">ID Value</th>
                    <th className="pb-3 font-semibold">Notes / Purpose</th>
                    <th className="pb-3 font-semibold">Assigned Date</th>
                    {isAdmin && <th className="pb-3 font-semibold text-right">Admin Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {person.assigned_ids.map((idItem) => (
                    <tr key={idItem.id} className="hover:bg-card-hover transition-colors">
                      <td className="py-3.5 font-mono font-bold text-accent-blue text-base">
                        <span className="px-3 py-1 rounded-lg bg-accent-blue/10 border border-accent-blue/20">
                          ID {idItem.id_value}
                        </span>
                      </td>
                      <td className="py-3.5 text-foreground-muted text-xs">
                        {idItem.notes || <span className="text-foreground-subtle italic">No notes</span>}
                      </td>
                      <td className="py-3.5 text-foreground-subtle text-xs">
                        {formatDate(idItem.created_at, 'dd MMM yyyy')}
                      </td>
                      {isAdmin && (
                        <td className="py-3.5 text-right space-x-1">
                          <button
                            onClick={() => {
                              setEditingId(idItem);
                              setEditIdValue(idItem.id_value);
                              setEditIdNotes(idItem.notes || '');
                            }}
                            className="p-1.5 rounded-lg text-foreground-muted hover:text-foreground hover:bg-background border border-transparent hover:border-border transition-colors"
                            title="Edit ID value or notes"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteId(idItem.id, idItem.id_value)}
                            className="p-1.5 rounded-lg text-foreground-muted hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-colors"
                            title="Delete this assigned ID"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* MODAL: EDIT NAME */}
      <Modal
        isOpen={isEditNameOpen}
        onClose={() => setIsEditNameOpen(false)}
        title="Edit Person Name"
      >
        <form onSubmit={handleUpdateName} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-foreground-muted uppercase tracking-wider mb-1.5">
              Name
            </label>
            <input
              type="text"
              required
              value={nameValue}
              onChange={(e) => setNameValue(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm bg-background border border-border rounded-xl text-foreground focus:outline-none focus:border-accent-purple"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setIsEditNameOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" isLoading={nameLoading}>
              Save Name
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL: ADD ID */}
      <Modal
        isOpen={isAddIdOpen}
        onClose={() => setIsAddIdOpen(false)}
        title={`Assign ID to ${person.name}`}
      >
        <form onSubmit={handleAddId} className="space-y-4">
          {idError && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-xs text-red-300">
              {idError}
            </div>
          )}
          <div>
            <label className="block text-xs font-semibold text-foreground-muted uppercase tracking-wider mb-1.5">
              ID Value (e.g. 2, 4, 50, 10)
            </label>
            <input
              type="text"
              required
              autoFocus
              value={idValue}
              onChange={(e) => setIdValue(e.target.value)}
              placeholder="e.g. 50"
              className="w-full px-3.5 py-2.5 text-sm font-mono bg-background border border-border rounded-xl text-foreground focus:outline-none focus:border-accent-purple"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-foreground-muted uppercase tracking-wider mb-1.5">
              Notes (Optional)
            </label>
            <input
              type="text"
              value={idNotes}
              onChange={(e) => setIdNotes(e.target.value)}
              placeholder="e.g. Primary, Shift 2"
              className="w-full px-3.5 py-2.5 text-sm bg-background border border-border rounded-xl text-foreground focus:outline-none focus:border-accent-purple"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setIsAddIdOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" isLoading={addIdLoading}>
              Assign ID
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL: EDIT ID */}
      <Modal
        isOpen={!!editingId}
        onClose={() => setEditingId(null)}
        title="Edit Assigned ID"
      >
        <form onSubmit={handleUpdateId} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-foreground-muted uppercase tracking-wider mb-1.5">
              ID Value
            </label>
            <input
              type="text"
              required
              value={editIdValue}
              onChange={(e) => setEditIdValue(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm font-mono bg-background border border-border rounded-xl text-foreground focus:outline-none focus:border-accent-purple"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-foreground-muted uppercase tracking-wider mb-1.5">
              Notes
            </label>
            <input
              type="text"
              value={editIdNotes}
              onChange={(e) => setEditIdNotes(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm bg-background border border-border rounded-xl text-foreground focus:outline-none focus:border-accent-purple"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setEditingId(null)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" isLoading={editIdLoading}>
              Save
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL: DELETE PERSON */}
      <Modal
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        title="Delete Person Confirmation"
      >
        <div className="space-y-4">
          <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-300 flex items-start gap-2.5">
            <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div>
              Permanently delete <strong>{person.name}</strong> and all {person.assigned_ids.length} assigned IDs?
              All historical clip records will also be erased.
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setIsDeleteOpen(false)}>
              Cancel
            </Button>
            <Button type="button" variant="danger" size="sm" onClick={handleDeletePerson} isLoading={deleteLoading}>
              Delete Person
            </Button>
          </div>
        </div>
      </Modal>
    </AppShell>
  );
}
