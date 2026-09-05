'use client';

import React, { useState } from 'react';
import { useSession } from 'next-auth/react';
import ServerControl from '../ServerControl';
import { Server, ShieldAlert, Terminal, Shield } from 'lucide-react';
import {
  canUseStudioEngineConfig,
  canUseStudioServerControls,
} from '@/shared/game/studioPermissions';
import {
  WindowMenuBar,
  WindowMenuDropdown,
  WindowMenuButton,
  WindowMenuDivider,
} from '../WindowMenuBar';

/** Dev Tools: server controls. */
export const DevToolsPanel: React.FC<{ asSubPanel?: boolean }> = ({ asSubPanel }) => {
  const { data: session } = useSession();
  const level = (session?.user as any)?.permissionLevel ?? 0;
  const canServer = canUseStudioServerControls(level);
  const canEngine = canUseStudioEngineConfig(level);

  const [activeTab, setActiveTab] = useState<'server'>('server');

  if (!canServer && !canEngine) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 p-6 text-center text-xs text-slate-400 font-mono">
        <ShieldAlert className="w-6 h-6 text-amber-500" />
        <p>Dev Tools require Admin+ (server) or Developer+ (engine config).</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden font-mono -m-3 mb-0">
      {/* ── WINDOW SUB-MENU APP BAR ── */}
      {!asSubPanel && (
        <WindowMenuBar>
          <WindowMenuDropdown
            label="Dev Actions"
            items={[
              {
                label: 'Restart Go Backend',
                shortcut: 'Ctrl+R',
                onClick: () => window.dispatchEvent(new CustomEvent('studio_restart_backend')),
              }
            ]}
          />
          <WindowMenuDivider />
          <WindowMenuButton
            label="Server"
            icon={Server}
            active={activeTab === 'server'}
            onClick={() => setActiveTab('server')}
          />
          <div className="flex-1" />
          <span className="flex items-center gap-1 text-[9px] text-amber-400 font-bold px-1.5 py-0.5 rounded bg-amber-500/15 border border-amber-500/30">
            <Shield className="w-2.5 h-2.5" /> Level {level}
          </span>
        </WindowMenuBar>
      )}

      <div className="flex-1 overflow-y-auto p-3 min-h-[300px]">
        {activeTab === 'server' && canServer && <ServerControl />}
      </div>
    </div>
  );
};

export default DevToolsPanel;
