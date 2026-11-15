'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import Modal from '@/components/ui/Modal';

const ColonyStoreContent = dynamic(() => import('./ColonyStoreContent'), {
  loading: () => (
    <div className="flex items-center justify-center p-12 text-cyan-400 font-mono text-sm animate-pulse">
      Loading Colony Store &amp; Outpost Logistics...
    </div>
  ),
  ssr: false,
});

interface MarsMarketplaceProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function MarsMarketplace({ isOpen, onClose }: MarsMarketplaceProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="📦 COLONY SUPPLY STORE & INVENTORY"
    >
      <div className="max-h-[80vh] overflow-y-auto pr-1">
        <ColonyStoreContent layoutMode="modal" />
      </div>
    </Modal>
  );
}
