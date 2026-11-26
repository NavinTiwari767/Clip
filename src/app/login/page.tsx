'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Scissors, Lock, Mail, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/lib/useAuth';
import { clearClientCache } from '@/lib/services/clipService';

export default function LoginPage() {
  const router = useRouter();
  const { setUserDirect } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
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

      clearClientCache();
      setUserDirect(data.user);
      router.push('/dashboard');
      router.refresh();
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected authentication error occurred.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-accent-purple/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/3 w-96 h-96 bg-accent-blue/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-accent-purple to-accent-blue shadow-xl shadow-accent-purple/20 mb-4 border border-accent-purple/30">
            <Scissors className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-foreground">
            ClipTrack Portal
          </h1>
          <p className="text-xs text-foreground-muted mt-1">
            Personal Clip Tracking & Production Management System
          </p>
        </div>

        <div className="bg-card border border-border rounded-3xl p-7 md:p-8 shadow-2xl backdrop-blur-xl">
          <div className="mb-6 pb-4 border-b border-border/80 flex items-center justify-between">
            <span className="text-sm font-semibold text-foreground">Sign In</span>
            <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-accent-green bg-accent-green/10 border border-accent-green/20 px-2 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-accent-green animate-pulse" />
              DenseAI Secure
            </span>
          </div>

          {errorMessage && (
            <div className="mb-5 p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-300 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div className="leading-relaxed">{errorMessage}</div>
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
        </div>

        <div className="text-center mt-6 text-xs text-foreground-subtle">
          ClipTrack System &bull; DenseAI Internal Portal
        </div>
      </div>
    </div>
  );
}
