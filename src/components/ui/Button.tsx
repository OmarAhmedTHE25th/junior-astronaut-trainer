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
    'bg-gradient-to-r from-[#3B82F6] to-[#6B3FA0] text-white shadow-lg shadow-[#6B3FA0]/30 hover:shadow-[#6B3FA0]/50',
  secondary:
    'bg-[#1a1f3d] text-[#F8FAFC] border-2 border-[#6B3FA0]/50 hover:border-[#6B3FA0]',
  danger:
    'bg-gradient-to-r from-[#EF4444] to-[#dc2626] text-white shadow-lg shadow-[#EF4444]/30',
  success:
    'bg-gradient-to-r from-[#22C55E] to-[#16a34a] text-white shadow-lg shadow-[#22C55E]/30',
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
        focus:outline-none focus:ring-2 focus:ring-[#6B3FA0] focus:ring-offset-2 focus:ring-offset-[#0B1026]
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
