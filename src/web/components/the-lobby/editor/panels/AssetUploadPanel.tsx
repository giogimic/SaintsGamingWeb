'use client';

import React from 'react';
import { UploadCloud } from 'lucide-react';
import { useEditorStore } from '../editor-store';
import { DraggablePanel } from '../DraggablePanel';
import { AssetUploadView } from '../AssetUploadView';

export const AssetUploadPanel: React.FC = () => {
  const panelState = useEditorStore((s) => s.panels['assetUpload']);

  if (!panelState?.isOpen) return null;

  return (
    <DraggablePanel id="assetUpload" icon={<UploadCloud className="w-4 h-4" />} portalToBody={true}>
      <div className="flex flex-col h-full bg-[#050b14] overflow-hidden">
        <div className="flex-1 overflow-auto bg-[#02050b] p-3">
          <AssetUploadView />
        </div>
      </div>
    </DraggablePanel>
  );
};
