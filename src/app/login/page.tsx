'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Scissors, Lock, Mail, ShieldAlert, ArrowRight, CheckCircle2, AlertCircle, ShieldCheck, User } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const adminEmails = [
    'anikeshaman@denseai.co',
    'arpita@denseai.com',
    'aditya@denseai.com',
    'navintiwari@denseai.com'
  ];

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data.error || 'Invalid email or password');
        setIsLoading(false);
        return;
      }

      setSuccessMessage(
        data.user.role === 'admin'
          ? 'Admin login verified! Redirecting to Dashboard...'
          : 'Member login verified! Redirecting to Dashboard...'
      );

      setTimeout(() => {
        router.push('/dashboard');
        router.refresh();
      }, 500);
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected authentication error occurred.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background Decorative Ambient Glows */}
      <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-accent-purple/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/3 w-96 h-96 bg-accent-blue/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-accent-purple to-accent-blue shadow-xl shadow-accent-purple/20 mb-3 border border-accent-purple/30">
            <Scissors className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-foreground">
            ClipTrack Portal
          </h1>
          <p className="text-xs text-foreground-muted mt-1">
            Personal Clip Tracking & Production Management System
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-card border border-border rounded-3xl p-6 md:p-8 shadow-2xl backdrop-blur-xl">
          <div className="mb-5 pb-3 border-b border-border/80 flex items-center justify-between">
            <span className="text-sm font-semibold text-foreground">Sign In</span>
            <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-accent-green bg-accent-green/10 border border-accent-green/20 px-2 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-accent-green animate-pulse" />
              DenseAI Secure
            </span>
          </div>

          {errorMessage && (
            <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-300 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div className="leading-relaxed">{errorMessage}</div>
            </div>
          )}

          {successMessage && (
            <div className="mb-4 p-3 rounded-xl bg-accent-green/10 border border-accent-green/30 text-xs text-accent-green flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-accent-green shrink-0 mt-0.5" />
              <div className="leading-relaxed">{successMessage}</div>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-foreground-muted uppercase tracking-wider mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-foreground-muted">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@denseai.com"
                  className="w-full pl-10 pr-4 py-2.5 text-sm bg-background border border-border rounded-xl text-foreground placeholder:text-foreground-subtle focus:outline-none focus:border-accent-purple focus:ring-1 focus:ring-accent-purple transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground-muted uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-foreground-muted">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 text-sm bg-background border border-border rounded-xl text-foreground placeholder:text-foreground-subtle focus:outline-none focus:border-accent-purple focus:ring-1 focus:ring-accent-purple transition-colors"
                />
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full mt-2"
              isLoading={isLoading}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Sign In to System
            </Button>
          </form>

          {/* Quick Admin Email Helpers */}
          <div className="mt-5 pt-4 border-t border-border/80">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-foreground-subtle mb-2 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-accent-purple" />
              Designated Admin Accounts (Full CRUD):
            </div>
            <div className="flex flex-wrap gap-1.5">
              {adminEmails.map((adm) => (
                <button
                  type="button"
                  key={adm}
                  onClick={() => {
                    setEmail(adm);
                    setPassword('admin');
                  }}
                  className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-accent-purple/10 text-accent-purple hover:bg-accent-purple/20 transition-colors"
                  title="Click to fill email & default password"
                >
                  {adm}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-foreground-subtle mt-2">
              Default password for initial admin login: <code className="text-accent-purple font-mono">admin</code>
            </p>
          </div>
        </div>

        {/* Role permission info */}
        <div className="mt-4 p-3 rounded-2xl bg-card/60 border border-border/60 text-[11px] text-foreground-subtle space-y-1">
          <div className="flex items-center gap-1.5 font-semibold text-foreground">
            <User className="w-3.5 h-3.5 text-accent-blue" />
            Role Policy:
          </div>
          <p>&bull; <strong>Admin:</strong> Full CRUD (add, edit, delete people, IDs & clip records).</p>
          <p>&bull; <strong>User / Member:</strong> Can add clip entries and view all data. Editing and deleting is reserved for Admins.</p>
        </div>
      </div>
    </div>
  );
}
