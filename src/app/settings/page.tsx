'use client';

import React, { useState, useEffect } from 'react';
import AppShell from '@/components/layout/AppShell';
import { Button } from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import { useAuth } from '@/lib/useAuth';
import {
  ShieldCheck,
  Database,
  CheckCircle2,
  Server,
  UserCheck,
  Shield,
  User,
  Plus,
  Trash2,
  KeyRound,
  Lock,
} from 'lucide-react';
import { formatDate } from '@/lib/utils';

interface AppUser {
  id: string;
  email: string;
  full_name?: string;
  role: 'admin' | 'user';
  created_at: string;
}

export default function SettingsPage() {
  const { user, isAdmin } = useAuth();
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testMessage, setTestMessage] = useState<string | null>(null);

  // Users management state
  const [usersList, setUsersList] = useState<AppUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Add Member Modal state
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState<'user' | 'admin'>('user');
  const [addingUser, setAddingUser] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  // Reset Password Modal state
  const [resetTarget, setResetTarget] = useState<AppUser | null>(null);
  const [resetPasswordValue, setResetPasswordValue] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const loadUsers = async () => {
    if (!isAdmin) return;
    setLoadingUsers(true);
    try {
      const res = await fetch('/api/users');
      if (res.ok) {
        const data = await res.json();
        setUsersList(data.users || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      loadUsers();
    }
  }, [isAdmin]);

  // Test DB connection
  const handleTestConnection = async () => {
    setTestStatus('testing');
    setTestMessage(null);

    try {
      const res = await fetch('/api/dashboard');
      if (res.ok) {
        const data = await res.json();
        setTestStatus('success');
        setTestMessage(
          `Connected to Supabase PostgreSQL! Database has ${data.totalPeople} people and ${data.totalAssignedIds} assigned IDs.`
        );
      } else {
        setTestStatus('error');
        setTestMessage('Failed to query database endpoint.');
      }
    } catch (err: any) {
      setTestStatus('error');
      setTestMessage(err.message || 'Connection test failed');
    }
  };

  // Add new member/admin
  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError(null);
    setAddingUser(true);

    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: newEmail,
          password: newPassword,
          full_name: newName,
          role: newRole,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setAddError(data.error || 'Failed to add user');
        setAddingUser(false);
        return;
      }

      showToast(`User ${newEmail} created! Share this email & password with them.`);
      setIsAddUserOpen(false);
      setNewEmail('');
      setNewPassword('');
      setNewName('');
      setNewRole('user');
      loadUsers();
    } catch (err: any) {
      setAddError(err.message || 'Error creating user');
    } finally {
      setAddingUser(false);
    }
  };

  // Delete user
  const handleDeleteUser = async (u: AppUser) => {
    if (!confirm(`Are you sure you want to remove user account for ${u.email}?`)) {
      return;
    }
    try {
      const res = await fetch(`/api/users/${u.id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast(`User ${u.email} deleted`);
        loadUsers();
      } else {
        const d = await res.json();
        alert(d.error || 'Failed to delete user');
      }
    } catch (e: any) {
      alert(e.message || 'Failed to delete user');
    }
  };

  // Reset Password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetTarget || !resetPasswordValue.trim()) return;
    setResetLoading(true);

    try {
      const res = await fetch(`/api/users/${resetTarget.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: resetPasswordValue.trim() }),
      });

      if (res.ok) {
        showToast(`Password updated for ${resetTarget.email}`);
        setResetTarget(null);
        setResetPasswordValue('');
      } else {
        const d = await res.json();
        alert(d.error || 'Failed to reset password');
      }
    } catch (e: any) {
      alert(e.message || 'Failed to reset password');
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <AppShell
      title="System Settings & Team Management"
      subtitle="Manage team members, roles, passwords, and database connectivity"
    >
      <div className="space-y-8 pb-12 max-w-5xl">
        {toastMessage && (
          <div className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl bg-accent-green text-white font-medium text-sm shadow-xl flex items-center gap-2 animate-fade-in">
            <CheckCircle2 className="w-4 h-4" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Current Active Session Info */}
        <div className="p-6 rounded-2xl bg-card border border-border shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-accent-green" />
                Current Active Session
              </h3>
              <p className="text-xs text-foreground-muted">
                Authenticated user details and assigned permissions
              </p>
            </div>
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${
                isAdmin
                  ? 'bg-accent-purple/10 text-accent-purple border-accent-purple/30'
                  : 'bg-accent-blue/10 text-accent-blue border-accent-blue/30'
              }`}
            >
              {isAdmin ? 'Administrator' : 'Member'}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div className="p-4 rounded-xl bg-background border border-border">
              <div className="text-xs text-foreground-subtle font-semibold uppercase">Email Address</div>
              <div className="text-sm font-bold text-foreground mt-1 font-mono">{user?.email || 'N/A'}</div>
            </div>

            <div className="p-4 rounded-xl bg-background border border-border">
              <div className="text-xs text-foreground-subtle font-semibold uppercase">Access Level</div>
              <div className="text-sm font-bold mt-1 text-accent-green">
                {isAdmin ? 'Full CRUD (Add, Edit, Delete all records)' : 'Read + Add Clip Entries Only'}
              </div>
            </div>
          </div>
        </div>

        {/* Team Members Management (Admin Only) */}
        {isAdmin && (
          <div className="p-6 rounded-2xl bg-card border border-border shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <div>
                <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-accent-purple" />
                  Team Members & Access Control
                </h3>
                <p className="text-xs text-foreground-muted">
                  Add team members, assign passwords, and set roles (Member or Admin)
                </p>
              </div>

              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  setNewEmail('');
                  setNewPassword('');
                  setNewName('');
                  setNewRole('user');
                  setAddError(null);
                  setIsAddUserOpen(true);
                }}
                leftIcon={<Plus className="w-4 h-4" />}
              >
                Add Member
              </Button>
            </div>

            {loadingUsers ? (
              <div className="p-8 text-center text-foreground-muted text-xs">Loading members list...</div>
            ) : (
              <div className="overflow-x-auto mt-4">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-border text-xs uppercase tracking-wider text-foreground-subtle">
                      <th className="pb-3 font-semibold">User</th>
                      <th className="pb-3 font-semibold">Email</th>
                      <th className="pb-3 font-semibold">Role</th>
                      <th className="pb-3 font-semibold">Created</th>
                      <th className="pb-3 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {usersList.map((u) => (
                      <tr key={u.id} className="hover:bg-card-hover transition-colors">
                        <td className="py-3 font-semibold text-foreground">
                          {u.full_name || u.email.split('@')[0]}
                        </td>
                        <td className="py-3 font-mono text-xs text-foreground-muted">{u.email}</td>
                        <td className="py-3">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider border ${
                              u.role === 'admin'
                                ? 'bg-accent-purple/10 text-accent-purple border-accent-purple/30'
                                : 'bg-accent-blue/10 text-accent-blue border-accent-blue/30'
                            }`}
                          >
                            {u.role === 'admin' ? 'Admin' : 'Member'}
                          </span>
                        </td>
                        <td className="py-3 text-xs text-foreground-subtle">
                          {formatDate(u.created_at, 'dd MMM yyyy')}
                        </td>
                        <td className="py-3 text-right space-x-1">
                          <button
                            onClick={() => {
                              setResetTarget(u);
                              setResetPasswordValue('');
                            }}
                            className="p-1.5 rounded-lg text-foreground-muted hover:text-foreground hover:bg-background border border-transparent hover:border-border transition-colors"
                            title="Reset Password"
                          >
                            <KeyRound className="w-4 h-4" />
                          </button>
                          {user?.id !== u.id && (
                            <button
                              onClick={() => handleDeleteUser(u)}
                              className="p-1.5 rounded-lg text-foreground-muted hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-colors"
                              title="Delete Member"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Supabase PostgreSQL Database Connection */}
        <div className="p-6 rounded-2xl bg-card border border-border shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <div>
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <Database className="w-5 h-5 text-accent-blue" />
                Supabase PostgreSQL Connection
              </h3>
              <p className="text-xs text-foreground-muted">
                Live database connection status for project <code>ixrsdsidhklzyqejvyxe</code>
              </p>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleTestConnection}
              isLoading={testStatus === 'testing'}
              leftIcon={<Server className="w-4 h-4" />}
            >
              Test Live Connection
            </Button>
          </div>

          {testMessage && (
            <div
              className={`mb-4 p-4 rounded-xl text-xs flex items-start gap-2.5 ${
                testStatus === 'success'
                  ? 'bg-accent-green/10 border border-accent-green/30 text-accent-green'
                  : 'bg-red-500/10 border border-red-500/30 text-red-300'
              }`}
            >
              {testStatus === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              ) : (
                <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
              )}
              <div className="leading-relaxed">{testMessage}</div>
            </div>
          )}

          <div className="p-3.5 rounded-xl bg-background border border-border font-mono text-xs text-foreground space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-foreground-subtle">Database Host:</span>
              <span className="text-accent-blue">aws-0-ap-south-1.pooler.supabase.com:5432</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-foreground-subtle">Database Name:</span>
              <span className="text-accent-purple">postgres</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-foreground-subtle">Pooler User:</span>
              <span className="text-foreground">postgres.ixrsdsidhklzyqejvyxe</span>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL: ADD TEAM MEMBER (Admin Only) */}
      <Modal
        isOpen={isAddUserOpen}
        onClose={() => setIsAddUserOpen(false)}
        title="Add Team Member"
        description="Create credentials for a new team member or administrator"
      >
        <form onSubmit={handleAddUser} className="space-y-4">
          {addError && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-xs text-red-300">
              {addError}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-foreground-muted uppercase tracking-wider mb-1.5">
              Full Name
            </label>
            <input
              type="text"
              required
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. Rahul Sharma"
              className="w-full px-3.5 py-2.5 text-sm bg-background border border-border rounded-xl text-foreground focus:outline-none focus:border-accent-purple"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground-muted uppercase tracking-wider mb-1.5">
              Email Address
            </label>
            <input
              type="email"
              required
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="member@denseai.com"
              className="w-full px-3.5 py-2.5 text-sm bg-background border border-border rounded-xl text-foreground focus:outline-none focus:border-accent-purple"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground-muted uppercase tracking-wider mb-1.5">
              Password
            </label>
            <input
              type="text"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Create a password for this user"
              className="w-full px-3.5 py-2.5 text-sm bg-background border border-border rounded-xl text-foreground focus:outline-none focus:border-accent-purple"
            />
            <p className="text-[11px] text-foreground-subtle mt-1">
              You can send this password directly to the member so they can log in.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground-muted uppercase tracking-wider mb-1.5">
              Role
            </label>
            <select
              value={newRole}
              onChange={(e) => setNewRole(e.target.value as 'user' | 'admin')}
              className="w-full px-3.5 py-2.5 text-sm bg-background border border-border rounded-xl text-foreground focus:outline-none focus:border-accent-purple"
            >
              <option value="user">Member (Can Add Clips & View All)</option>
              <option value="admin">Administrator (Full CRUD)</option>
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setIsAddUserOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" isLoading={addingUser}>
              Create Account
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL: RESET PASSWORD (Admin Only) */}
      <Modal
        isOpen={!!resetTarget}
        onClose={() => setResetTarget(null)}
        title={`Reset Password for ${resetTarget?.email}`}
        description="Set a new password for this user account"
      >
        <form onSubmit={handleResetPassword} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-foreground-muted uppercase tracking-wider mb-1.5">
              New Password
            </label>
            <input
              type="text"
              required
              autoFocus
              value={resetPasswordValue}
              onChange={(e) => setResetPasswordValue(e.target.value)}
              placeholder="Enter new password"
              className="w-full px-3.5 py-2.5 text-sm bg-background border border-border rounded-xl text-foreground focus:outline-none focus:border-accent-purple"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setResetTarget(null)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" isLoading={resetLoading}>
              Update Password
            </Button>
          </div>
        </form>
      </Modal>
    </AppShell>
  );
}
