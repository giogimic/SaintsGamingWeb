'use client';

import React, { useEffect, useMemo } from 'react';
import dynamic from 'serapht/dynamic';
import { useGameStore } from '../store';
import { DockZone } from './DockZone';
import { DockableWidget } from './DockableWidget';
import { DockZoneId, DOCK_ZONE_DEFINITIONS } from './dock-types';
import { HUD_WIDGET_IDS } from './default-presets';

import MiniMapRadar from '../MiniMapRadar';
import PeerPresenceHud from '../PeerPresenceHud';
import PlayerVitalsHud from './PlayerVitalsHud';
import TargetFrame from '../target-frame';
import QuestTrackerOverlay from '../quest-tracker-overlay';
import Hotbar from '../Hotbar';
import ClassicPanel from '../ClassicPanel';
import { GameChat } from '../chat/GameChat';

interface LobbyHudDockLayoutProps {
  enableStudio?: boolean;
}

const PRIMARY_DOCK_ZONES: DockZoneId[] = [
  'top-left',
  'top-center',
  'top-right',
  'mid-left',
  'mid-right',
  'bottom-left',
  'bottom-center',
  'bottom-right',
];

export function LobbyHudDockLayout({ enableStudio = false }: LobbyHudDockLayoutProps) {
  const activePreset = useGameStore((s) => s.activeHudPreset);
  const isEditing = useGameStore((s) => s.isEditingInterface || s.isUiEditMode);
  const hydrateHudPresets = useGameStore((s) => s.hydrateHudPresets);

  useEffect(() => {
    hydrateHudPresets();
  }, [hydrateHudPresets]);

  // Map widget ID to its corresponding React node
  const renderWidgetContent = (widgetId: string) => {
    switch (widgetId) {
      case HUD_WIDGET_IDS.ORBS:
        return <PlayerVitalsHud />;
      case HUD_WIDGET_IDS.PEER_PRESENCE:
        return !enableStudio ? <PeerPresenceHud /> : null;
      case HUD_WIDGET_IDS.TARGET_FRAME:
        return <TargetFrame />;
      case HUD_WIDGET_IDS.MINIMAP:
        return <MiniMapRadar enableStudio={enableStudio} />;

      case HUD_WIDGET_IDS.QUEST_TRACKER:
        return <QuestTrackerOverlay />;
      case HUD_WIDGET_IDS.CHAT:
        return <GameChat />;
      case HUD_WIDGET_IDS.HOTBAR:
        return <Hotbar />;
      case HUD_WIDGET_IDS.CLASSIC_PANEL:
        return <ClassicPanel />;
      default:
        return null;
    }
  };

  // Group widgets by their assigned dock zones
  const zoneWidgetsMap = useMemo(() => {
    const map: Record<DockZoneId, Array<{ id: string; order: number; visible: boolean }>> = {
      'top-left': [],
      'top-center': [],
      'top-right': [],
      'mid-left': [],
      'mid-right': [],
      'bottom-left': [],
      'bottom-center': [],
      'bottom-right': [],
      'floating': [],
    };

    if (activePreset?.widgets) {
      for (const [id, cfg] of Object.entries(activePreset.widgets)) {
        if (cfg && cfg.zoneId && map[cfg.zoneId]) {
          map[cfg.zoneId].push({
            id,
            order: typeof cfg.order === 'number' ? cfg.order : 0,
            visible: cfg.visible !== false,
          });
        }
      }
    }

    // Sort widgets within each zone by order
    for (const zoneId of PRIMARY_DOCK_ZONES) {
      map[zoneId].sort((a, b) => a.order - b.order);
    }

    return map;
  }, [activePreset]);

  return (
    <>
      {PRIMARY_DOCK_ZONES.map((zoneId) => {
        const widgets = zoneWidgetsMap[zoneId] || [];
        const hasVisibleWidgets = widgets.some((w) => w.visible);

        // If not in edit mode and no visible widgets exist in this zone, do not render container
        if (!isEditing && (!widgets.length || !hasVisibleWidgets)) {
          return null;
        }

        return (
          <DockZone key={zoneId} zoneId={zoneId}>
            {widgets.map(({ id }) => {
              const content = renderWidgetContent(id);
              if (!content && !isEditing) return null;

              return (
                <DockableWidget key={id} id={id}>
                  {content}
                </DockableWidget>
              );
            })}
          </DockZone>
        );
      })}
    </>
  );
}
