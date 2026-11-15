'use client';

import React from 'react';

interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  type?: 'button' | 'submit' | 'reset';
  ariaLabel?: string;
}

const variantStyles: Record<string, string> = {
  primary:
    'bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-extrabold border border-cyan-200 shadow-sm',
  secondary:
    'bg-slate-800/90 hover:bg-slate-700 text-slate-100 border border-slate-300/25 hover:border-slate-300/50',
  danger:
    'bg-rose-600 hover:bg-rose-500 text-white font-bold border border-rose-400/50 shadow-sm',
  success:
    'bg-emerald-600 hover:bg-emerald-500 text-white font-bold border border-emerald-400/50 shadow-sm',
};

const sizeStyles: Record<string, string> = {
  sm: 'px-3 py-1.5 text-sm min-h-[36px] min-w-[44px]',
  md: 'px-5 py-2.5 text-base min-h-[44px] min-w-[44px]',
  lg: 'px-8 py-4 text-lg min-h-[52px] min-w-[52px]',
};

export default function Button({
  variant = 'primary',
  size = 'md',
  children,
  onClick,
  disabled = false,
  className = '',
  type = 'button',
  ariaLabel,
}: ButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className={`
        inline-flex items-center justify-center gap-2
        rounded-xl font-bold
        transition-all duration-200 ease-out
        hover:scale-105 active:scale-95
        focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 focus:ring-offset-[#090D16]
        disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100
        cursor-pointer select-none
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        ${className}
      `}
    >
      {children}
    </button>
  );
}
