'use client';

import React, { useEffect, useCallback } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  variant?: 'default' | 'danger' | 'success';
}

const borderColors: Record<string, string> = {
  default: 'border-[#6B3FA0]/50',
  danger: 'border-[#EF4444]/50',
  success: 'border-[#22C55E]/50',
};

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  variant = 'default',
}: ModalProps) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-[fade-in_0.2s_ease-out]"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-[#0B1026]/80 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        className={`
          relative z-10 w-full max-w-lg max-h-[85vh] overflow-y-auto
          bg-gradient-to-b from-[#1a1f3d] to-[#0B1026]
          rounded-2xl border-2 ${borderColors[variant]}
          shadow-2xl
          animate-[slide-up_0.3s_ease-out]
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h2 className="text-xl font-bold text-[#F8FAFC]">{title}</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg
                       text-[#F8FAFC]/60 hover:text-[#F8FAFC] hover:bg-white/10
                       transition-colors focus:outline-none focus:ring-2 focus:ring-[#6B3FA0]"
            aria-label="Close dialog"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}
