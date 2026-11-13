'use client';

import React, { useState, useRef, useEffect } from 'react';

interface TooltipProps {
  term: string;
  definition: string;
  children: React.ReactNode;
}

export default function Tooltip({ term, definition, children }: TooltipProps) {
  const [show, setShow] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLSpanElement>(null);

  // Close on outside click (mobile)
  useEffect(() => {
    if (!show) return;
    const handleClick = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setShow(false);
      }
    };
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [show]);

  return (
    <span
      ref={containerRef}
      className="relative inline-block"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
      onClick={() => setShow((p) => !p)}
    >
      <span
        className="underline decoration-dotted decoration-[#6B3FA0] underline-offset-2
                   cursor-help text-[#F8FAFC]"
        role="button"
        tabIndex={0}
        aria-describedby={`tooltip-${term}`}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setShow((p) => !p);
          }
        }}
      >
        {children}
      </span>

      {show && (
        <div
          ref={tooltipRef}
          id={`tooltip-${term}`}
          role="tooltip"
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-40
                     w-56 p-3 rounded-xl
                     bg-[#1a1f3d] border border-[#6B3FA0]/50
                     shadow-lg shadow-[#6B3FA0]/20
                     text-sm text-[#F8FAFC]
                     animate-[fade-in_0.15s_ease-out]"
        >
          <p className="font-bold text-[#E87040] mb-1">🔬 {term}</p>
          <p className="text-[#F8FAFC]/80 leading-relaxed">{definition}</p>
          <div
            className="absolute top-full left-1/2 -translate-x-1/2
                        w-0 h-0 border-l-8 border-r-8 border-t-8
                        border-transparent border-t-[#1a1f3d]"
            aria-hidden="true"
          />
        </div>
      )}
    </span>
  );
}
