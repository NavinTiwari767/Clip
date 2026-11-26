'use client';

import React, { useState } from 'react';
import AppShell from '@/components/layout/AppShell';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/lib/useAuth';
import {
  ShieldCheck,
  Database,
  Key,
  CheckCircle2,
  Copy,
  Check,
  Server,
  UserCheck,
  Shield,
  User,
} from 'lucide-react';

export default function SettingsPage() {
  const { user, isAdmin } = useAuth();
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testMessage, setTestMessage] = useState<string | null>(null);
  const [copiedSchema, setCopiedSchema] = useState(false);

  const adminEmails = [
    'anikeshaman@denseai.co',
    'arpita@denseai.com',
    'aditya@denseai.com',
    'navintiwari@denseai.com',
  ];

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

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSchema(true);
    setTimeout(() => setCopiedSchema(false), 2000);
  };

  return (
    <AppShell
      title="System Settings & Database"
      subtitle="Role-based permissions, Supabase PostgreSQL configuration, and system status"
    >
      <div className="space-y-8 pb-12 max-w-5xl">
        {/* Role & Current Session Info */}
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

        {/* Designated Admin Accounts */}
        <div className="p-6 rounded-2xl bg-card border border-border shadow-xl">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-accent-purple" />
                Designated Admin Accounts
              </h3>
              <p className="text-xs text-foreground-muted">
                These 4 administrator emails have full permission to add, edit, and delete people, IDs, and clip counts:
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
            {adminEmails.map((email) => (
              <div
                key={email}
                className="p-3.5 rounded-xl bg-background border border-border flex items-center justify-between"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-accent-purple/10 text-accent-purple">
                    <Shield className="w-4 h-4" />
                  </div>
                  <span className="font-mono text-xs font-bold text-foreground">{email}</span>
                </div>
                <span className="text-[11px] font-semibold text-accent-purple bg-accent-purple/10 px-2 py-0.5 rounded">
                  Admin
                </span>
              </div>
            ))}
          </div>

          <div className="mt-4 p-3.5 rounded-xl bg-card-hover border border-border text-xs text-foreground-muted flex items-start gap-2">
            <User className="w-4 h-4 text-accent-blue shrink-0 mt-0.5" />
            <div>
              <strong>Regular User / Team Member Policy:</strong> Any other team email logging into the system can view all dashboards, reports, and people, and can record their daily clip counts. However, only the 4 admins above have authorization to edit, change dates, or delete records.
            </div>
          </div>
        </div>

        {/* Supabase PostgreSQL Database Connection */}
        <div className="p-6 rounded-2xl bg-card border border-border shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <div>
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <Database className="w-5 h-5 text-accent-blue" />
                Supabase PostgreSQL Connection
              </h3>
              <p className="text-xs text-foreground-muted">
                Connected to project <code>ixrsdsidhklzyqejvyxe</code> (ap-south-1 Mumbai)
              </p>
            </div>

            <Button
              variant="primary"
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
              <span className="text-foreground-subtle">Direct Pooler User:</span>
              <span className="text-foreground">postgres.ixrsdsidhklzyqejvyxe</span>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
