'use client';

import React from 'react';
import Modal from '@/components/ui/Modal';
import ColonyStoreContent from './ColonyStoreContent';

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
