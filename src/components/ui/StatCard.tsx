import React from 'react';
import { LucideIcon } from 'lucide-react';
import { formatNumber } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: LucideIcon;
  iconColor?: 'purple' | 'blue' | 'green' | 'amber';
  trend?: string;
  trendPositive?: boolean;
}

export default function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconColor = 'purple',
  trend,
  trendPositive,
}: StatCardProps) {
  const colorStyles = {
    purple: {
      bg: 'bg-accent-purple/10 border-accent-purple/20 text-accent-purple',
      glow: 'hover:border-accent-purple/40',
    },
    blue: {
      bg: 'bg-accent-blue/10 border-accent-blue/20 text-accent-blue',
      glow: 'hover:border-accent-blue/40',
    },
    green: {
      bg: 'bg-accent-green/10 border-accent-green/20 text-accent-green',
      glow: 'hover:border-accent-green/40',
    },
    amber: {
      bg: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
      glow: 'hover:border-amber-500/40',
    },
  }[iconColor];

  const displayValue = typeof value === 'number' ? formatNumber(value) : value;

  return (
    <div
      className={`relative p-5 rounded-2xl bg-card border border-border shadow-lg transition-all duration-200 hover:-translate-y-0.5 ${colorStyles.glow}`}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold tracking-wider uppercase text-foreground-muted">
          {title}
        </span>
        <div className={`p-2.5 rounded-xl border ${colorStyles.bg}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>

      <div className="mt-4 flex items-baseline justify-between">
        <div className="text-2xl md:text-3xl font-extrabold tracking-tight text-foreground">
          {displayValue}
        </div>
        {trend && (
          <span
            className={`text-xs font-semibold px-2 py-0.5 rounded-md ${
              trendPositive
                ? 'bg-accent-green/10 text-accent-green border border-accent-green/20'
                : 'bg-red-500/10 text-red-400 border border-red-500/20'
            }`}
          >
            {trend}
          </span>
        )}
      </div>

      {subtitle && <p className="mt-1.5 text-xs text-foreground-subtle truncate">{subtitle}</p>}
    </div>
  );
}

