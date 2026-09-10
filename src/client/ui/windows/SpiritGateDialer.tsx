import React, { useEffect, useState } from 'react';
import { useHudStore } from '../../state/useHudStore';
import { socketManager } from '../../net/SocketManager';

interface DialableNode {
  mapId: string;
  name: string;
  description: string;
  isActive: boolean;
  publicAccess: boolean;
}

export function SpiritGateDialer() {
  const isDialerOpen = useHudStore((s) => s.openWindows.includes('spiritGateDialer'));
  const toggleWindow = useHudStore((s) => s.toggleWindow);
  const closeWindow = useHudStore((s) => s.closeWindow);
  const [nodes, setNodes] = useState<DialableNode[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isDialerOpen) return;
    
    setLoading(true);
    // Request atlas nodes from server
    socketManager.emit('portal_request_nodes' as any, {});

    const onNodesReceived = (data: { nodes: DialableNode[] }) => {
      setNodes(data.nodes || []);
      setLoading(false);
    };

    socketManager.raw?.on('portal_nodes_response' as any, onNodesReceived);

    return () => {
      socketManager.raw?.off('portal_nodes_response' as any, onNodesReceived);
    };
  }, [isDialerOpen]);

  const handleDial = (mapId: string) => {
    socketManager.emit('portal_dial' as any, { targetMapId: mapId });
    closeWindow('spiritGateDialer');
  };

  if (!isDialerOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-2xl overflow-hidden shadow-2xl rounded-xl bg-[#050b14]/95 border border-primary/40 sg-glass">
        
        {/* Header */}
        <div className="relative px-6 py-4 border-b bg-black/40 border-border/50">
          <h2 className="text-2xl font-bold tracking-tight sg-text-gradient font-inter">
            Spirit Gate Nexus
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">Select a destination to dial the gate.</p>
          <button 
            onClick={() => closeWindow('spiritGateDialer')}
            className="absolute p-2 text-gray-400 transition-colors top-4 right-4 hover:text-white"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[60vh] overflow-y-auto">
          {loading ? (
            <div className="py-12 text-center text-muted-foreground">Aligning astral frequencies...</div>
          ) : nodes.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">No active destinations found.</div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {nodes.map(node => (
                <div 
                  key={node.mapId} 
                  className="flex flex-col p-4 transition-colors border rounded-lg cursor-pointer bg-card/40 border-border/50 hover:bg-primary/20 hover:border-primary/40"
                  onClick={() => handleDial(node.mapId)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-white">{node.name}</span>
                    <span className={`text-xs px-2 py-1 rounded ${node.publicAccess ? 'bg-green-500/20 text-green-400' : 'bg-orange-500/20 text-orange-400'}`}>
                      {node.publicAccess ? 'Public' : 'Private'}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">{node.description}</p>
                  
                  <div className="mt-4 text-xs font-mono text-primary/80">
                    ID: {node.mapId}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
