'use client';

import React, { useState, useMemo } from 'react';
import { useEditorStore } from '../editor-store';
import { useGameStore } from '../../store';
import {
  Folder,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  Box,
  Users,
  Globe,
  Sun,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Search,
  Layers,
  Sparkles,
  Crosshair,
  Trash2,
} from 'lucide-react';
import { soundSynth } from '@/engine/sound-synth';

interface HierarchyNode {
  id: string;
  label: string;
  type: 'folder' | 'terrain' | 'prop' | 'npc' | 'gate' | 'light' | 'spawn';
  children?: HierarchyNode[];
  visible?: boolean;
  locked?: boolean;
  metadata?: string;
}

export function WorldHierarchyPanel() {
  const currentMapId = useGameStore((s) => s.currentMapId);
  const activeMapData = useGameStore((s) => s.activeMapData);
  const openPanel = useEditorStore((s) => s.openPanel);
  const showToast = useGameStore((s) => s.showToast);

  const [search, setSearch] = useState('');
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({
    root: true,
    terrain: true,
    props: true,
    entities: true,
    warps: true,
    environment: false,
  });
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>('root');

  // Build tree from live map data
  const hierarchyTree: HierarchyNode = useMemo(() => {
    const mapName = activeMapData?.name || currentMapId || 'Current World';
    const width = activeMapData?.width || 64;
    const height = activeMapData?.height || 64;

    return {
      id: 'root',
      label: `${mapName} (${width}×${height})`,
      type: 'folder',
      children: [
        {
          id: 'terrain',
          label: 'Terrain & Voxel Matrix',
          type: 'folder',
          children: [
            {
              id: 'terrain_base',
              label: 'Voxel Substratum (Layer 0)',
              type: 'terrain',
              metadata: `${width * height} cells`,
            },
            {
              id: 'terrain_splat',
              label: 'Surface Foliage Splats',
              type: 'terrain',
              metadata: 'Splat Alpha Buffer',
            },
            {
              id: 'terrain_height',
              label: 'Stratigraphy Elevation Grids',
              type: 'terrain',
              metadata: '32 Voxel Planes',
            },
          ],
        },
        {
          id: 'props',
          label: 'Props & Structures',
          type: 'folder',
          children: [
            {
              id: 'prop_structures_batch',
              label: 'Batched Static Meshes',
              type: 'prop',
              metadata: 'GPU Instanced',
            },
            {
              id: 'prop_custom_prefabs',
              label: 'Placed Blueprint Assets',
              type: 'prop',
              metadata: 'Dynamic Bounds',
            },
          ],
        },
        {
          id: 'entities',
          label: 'Entities & Spawners',
          type: 'folder',
          children: [
            {
              id: 'ent_player_spawn',
              label: 'Primary Player Spawn Pin',
              type: 'spawn',
              metadata: 'X: 32, Y: 32',
            },
            {
              id: 'ent_npc_registry',
              label: 'Registered Regional NPCs',
              type: 'npc',
              metadata: 'Active AI Hooks',
            },
            {
              id: 'ent_creature_spawners',
              label: 'Creature Spawner Nodes',
              type: 'npc',
              metadata: 'Encounter Groups',
            },
          ],
        },
        {
          id: 'warps',
          label: 'Warp Gates & Transitions',
          type: 'folder',
          children: [
            {
              id: 'warp_regional_gates',
              label: 'Seamless Shard Gateways',
              type: 'gate',
              metadata: 'Spatial Links',
            },
            {
              id: 'warp_boundary_triggers',
              label: 'Boundary World Transitions',
              type: 'gate',
              metadata: 'Atlas Cross-Connect',
            },
          ],
        },
        {
          id: 'environment',
          label: 'Lighting & Atmosphere',
          type: 'folder',
          children: [
            {
              id: 'env_sun_light',
              label: 'Directional Sunlight & Shadows',
              type: 'light',
              metadata: '45° Pitch, Warm Gold',
            },
            {
              id: 'env_ambient_fog',
              label: 'Volumetric Depth Fog',
              type: 'light',
              metadata: 'Range 20-180m',
            },
          ],
        },
      ],
    };
  }, [activeMapData, currentMapId]);

  const toggleFolder = (id: string) => {
    soundSynth?.playUiClick?.();
    setExpandedFolders((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleSelectNode = (node: HierarchyNode) => {
    soundSynth?.playSelectSound?.();
    setSelectedNodeId(node.id);
    if (node.type !== 'folder') {
      openPanel('properties');
      showToast(`Selected: ${node.label}`);
    }
  };

  const renderNode = (node: HierarchyNode, depth = 0) => {
    const isFolder = node.type === 'folder';
    const isExpanded = !!expandedFolders[node.id];
    const isSelected = selectedNodeId === node.id;

    const matchesSearch =
      !search ||
      node.label.toLowerCase().includes(search.toLowerCase()) ||
      (node.metadata && node.metadata.toLowerCase().includes(search.toLowerCase()));

    if (search && !matchesSearch && !isFolder) {
      return null;
    }

    const getNodeIcon = () => {
      switch (node.type) {
        case 'folder':
          return isExpanded ? (
            <FolderOpen className="w-3.5 h-3.5 text-primary/80" />
          ) : (
            <Folder className="w-3.5 h-3.5 text-muted-foreground/70" />
          );
        case 'terrain':
          return <Layers className="w-3.5 h-3.5 text-emerald-400" />;
        case 'prop':
          return <Box className="w-3.5 h-3.5 text-amber-400" />;
        case 'npc':
        case 'spawn':
          return <Users className="w-3.5 h-3.5 text-blue-400" />;
        case 'gate':
          return <Globe className="w-3.5 h-3.5 text-purple-400" />;
        case 'light':
          return <Sun className="w-3.5 h-3.5 text-amber-300" />;
        default:
          return <Sparkles className="w-3.5 h-3.5 text-primary" />;
      }
    };

    return (
      <div key={node.id} className="flex flex-col">
        <div
          onClick={() => {
            if (isFolder) toggleFolder(node.id);
            handleSelectNode(node);
          }}
          style={{ paddingLeft: `${depth * 14 + 6}px` }}
          className={`flex items-center justify-between py-1.5 pr-2 rounded-lg transition-colors cursor-pointer group ${
            isSelected
              ? 'bg-primary/20 text-primary font-semibold border-l-2 border-primary'
              : 'text-foreground/80 hover:bg-white/5 hover:text-foreground'
          }`}
        >
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            {isFolder ? (
              <span className="text-muted-foreground/60 w-3 h-3 flex items-center justify-center">
                {isExpanded ? (
                  <ChevronDown className="w-3 h-3" />
                ) : (
                  <ChevronRight className="w-3 h-3" />
                )}
              </span>
            ) : (
              <span className="w-3 h-3" />
            )}
            {getNodeIcon()}
            <span className="truncate text-[11px]">{node.label}</span>
          </div>

          {node.metadata && (
            <span className="text-[9px] text-muted-foreground/50 font-mono shrink-0 pl-2">
              {node.metadata}
            </span>
          )}
        </div>

        {isFolder && isExpanded && node.children && (
          <div className="flex flex-col">
            {node.children.map((child) => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full gap-3 text-foreground/90 font-mono text-xs select-none">
      {/* ── Search Bar ── */}
      <div className="relative">
        <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground/60" />
        <input
          type="text"
          placeholder="Filter hierarchy nodes..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-8 pr-3 py-1.5 bg-black/40 border border-border/50 rounded-lg text-xs font-mono text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/60 transition-colors"
        />
      </div>

      {/* ── Hierarchy Treeview ── */}
      <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar border border-border/30 rounded-xl bg-black/20 p-1.5">
        {renderNode(hierarchyTree)}
      </div>

      {/* ── Bottom Controls ── */}
      <div className="pt-2 border-t border-border/30 flex items-center justify-between text-[11px] shrink-0">
        <button
          onClick={() => {
            openPanel('properties');
            showToast('Inspect selected node');
          }}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-primary/15 hover:bg-primary/25 text-primary border border-primary/40 text-[10px] font-bold transition-colors cursor-pointer"
        >
          <Crosshair className="w-3 h-3" />
          <span>Inspect Node</span>
        </button>
        <span className="text-[10px] text-muted-foreground/60">
          Root: {currentMapId || 'DEMO_SANDBOX'}
        </span>
      </div>
    </div>
  );
}
