import React, { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost' | 'success';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      className = '',
      variant = 'primary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      disabled,
      ...props
    },
    ref
  ) => {
    const baseClasses =
      'inline-flex items-center justify-center font-medium rounded-xl transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background disabled:opacity-50 disabled:cursor-not-allowed select-none';

    const sizeClasses = {
      sm: 'text-xs px-3 py-1.5 gap-1.5',
      md: 'text-sm px-4 py-2.5 gap-2',
      lg: 'text-base px-5 py-3 gap-2.5',
    }[size];

    const variantClasses = {
      primary:
        'bg-accent-purple hover:bg-accent-purple-hover text-white shadow-md shadow-accent-purple/20 focus:ring-accent-purple active:scale-[0.99]',
      secondary:
        'bg-accent-blue hover:bg-accent-blue-hover text-white shadow-md shadow-accent-blue/20 focus:ring-accent-blue active:scale-[0.99]',
      success:
        'bg-accent-green hover:bg-emerald-600 text-white shadow-md shadow-accent-green/20 focus:ring-accent-green active:scale-[0.99]',
      outline:
        'bg-transparent hover:bg-card border border-border text-foreground hover:border-accent-purple/50 focus:ring-accent-purple',
      danger:
        'bg-red-500/15 hover:bg-red-500/25 text-red-400 hover:text-red-300 border border-red-500/30 focus:ring-red-500',
      ghost: 'bg-transparent hover:bg-card text-foreground-muted hover:text-foreground focus:ring-border',
    }[variant];

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={`${baseClasses} ${sizeClasses} ${variantClasses} ${className}`}
        {...props}
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin text-current" />
        ) : (
          leftIcon && <span className="shrink-0">{leftIcon}</span>
        )}
        <span>{children}</span>
        {!isLoading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
      </button>
    );
  }
);

Button.displayName = 'Button';

