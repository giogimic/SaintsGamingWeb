'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Shield,
  Server,
  Camera,
  UploadCloud,
  Wrench,
  Activity,
  Users,
  Minus,
  Square,
  Maximize2,
  X,
  RefreshCw,
  Play,
  Square as StopSquare,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  ExternalLink,
  Send,
  Layers,
  Settings,
  Sliders,
  Sparkles,
  Database,
  Terminal,
  Clock,
  Eye,
  Check,
  Radio,
  History,
} from 'lucide-react';
import { useAuth } from '@/shared/hooks/use-auth';
import { PERMISSION_LEVELS } from '@/web/lib/permissions';
import { useRealmSettings } from '@/web/hooks/studio-data';
import { useGameStore } from '../store';
import { soundSynth } from '@/engine/sound-synth';
import {
  ADMIN_SECTIONS,
  ADMIN_CAPABILITIES,
  AdminSectionId,
} from './adminCapabilityRegistry';
import {
  validateWorldForPublish,
  listPublishSnapshots,
  rollbackToSnapshot,
  createPublishSnapshot,
  type ValidationGateResult,
} from '@/app/actions/publishing';
import type { WorldPublishSnapshot } from '@prisma/client';

interface CharacterSelectAdminWindowProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CharacterSelectAdminWindow({
  isOpen,
  onClose,
}: CharacterSelectAdminWindowProps) {
  const { user, isModerator, isAdmin, isDeveloper } = useAuth();
  const userLevel = user?.permissionLevel ?? 0;

  // Dynamic Realm & Hero conventions from Studio / Settings
  const { settings: realmSettings, mutateSettings } = useRealmSettings();
  const heroSingular = (realmSettings as any)?.playerClassName || 'Saint';
  const heroPlural = (realmSettings as any)?.playerClassNamePlural || 'Saints';
  const realmTitle = (realmSettings as any)?.realmName || 'The Lobby';

  // Active section state
  const [activeSection, setActiveSection] = useState<AdminSectionId>('overview');

  // Window position & layout state
  const [isMinimized, setIsMinimized] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [position, setPosition] = useState({ x: 60, y: 60 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ mouseX: 0, mouseY: 0, posX: 0, posY: 0 });
  const windowRef = useRef<HTMLDivElement>(null);

  // Summary API data state
  const [summaryData, setSummaryData] = useState<any>(null);
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);
  const [lastCheckTime, setLastCheckTime] = useState<string>('Just now');

  // Realm Server Controls state
  const [serverStatus, setServerStatus] = useState<{
    status: 'online' | 'offline';
    players: number;
    capacity: number;
    isDevOverride?: boolean;
  }>({ status: 'online', players: 0, capacity: 500 });
  const [isServerActionLoading, setIsServerActionLoading] = useState(false);
  const [serverActionMsg, setServerActionMsg] = useState<string | null>(null);

  // Camera Policy State
  const [cameraStyle, setCameraStyle] = useState<'isometric' | 'follow45' | 'topdown' | 'free'>('isometric');
  const [cameraSmoothing, setCameraSmoothing] = useState<number>(35);
  const [borderClamping, setBorderClamping] = useState<boolean>(true);
  const [vignetteEnabled, setVignetteEnabled] = useState<boolean>(true);
  const [vignetteIntensity, setVignetteIntensity] = useState<number>(15);
  const [allowCustomPlayerCamera, setAllowCustomPlayerCamera] = useState<boolean>(false);
  const [authoredMapAuthority, setAuthoredMapAuthority] = useState<boolean>(true);
  const [isSavingCamera, setIsSavingCamera] = useState<boolean>(false);
  const [cameraSavedToast, setCameraSavedToast] = useState<boolean>(false);

  // Releases & Snapshots State
  const [snapshots, setSnapshots] = useState<WorldPublishSnapshot[]>([]);
  const [validationResult, setValidationResult] = useState<ValidationGateResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isRollingBack, setIsRollingBack] = useState(false);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [publishTitle, setPublishTitle] = useState('');
  const [publishVersion, setPublishVersion] = useState('');
  const [publishNotes, setPublishNotes] = useState('');

  // Maintenance State (Developer 1000+)
  const [maintenanceProfile, setMaintenanceProfile] = useState<'auto' | 'quick' | 'app' | 'db' | 'full' | 'restart'>('auto');
  const [dataRetentionMode, setDataRetentionMode] = useState<'keep' | 'wipe'>('keep');
  const [isExecutingMaintenance, setIsExecutingMaintenance] = useState(false);
  const [maintenanceOutput, setMaintenanceOutput] = useState<string | null>(null);
  const [showMaintenanceConfirm, setShowMaintenanceConfirm] = useState(false);

  // Staff State
  const [announceText, setAnnounceText] = useState('');
  const [announceSent, setAnnounceSent] = useState(false);

  // Confirmation Modal State (Destructive operations)
  const [confirmModal, setConfirmModal] = useState<{
    title: string;
    description: string;
    actionLabel: string;
    onConfirm: () => void;
  } | null>(null);

  // Socket communication from GameStore
  const emitSocketEvent = useGameStore((s) => s.emitSocketEvent);
  const otherPlayers = useGameStore((s) => s.otherPlayers);

  // Filter accessible sections based on user role
  const accessibleSections = useMemo(() => {
    return ADMIN_SECTIONS.filter((s) => userLevel >= s.minPermission);
  }, [userLevel]);

  // Load summary data
  const fetchSummary = async () => {
    setIsLoadingSummary(true);
    try {
      const res = await fetch('/api/admin/game-summary');
      if (res.ok) {
        const data = await res.json();
        setSummaryData(data);
        setLastCheckTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));

        if (data.realmSettings) {
          if (data.realmSettings.defaultCameraStyle) {
            setCameraStyle(data.realmSettings.defaultCameraStyle);
          }
          if (data.realmSettings.allowCustomPlayerCamera !== undefined) {
            setAllowCustomPlayerCamera(data.realmSettings.allowCustomPlayerCamera);
          }
        }
      }
    } catch {
      /* ignore */
    } finally {
      setIsLoadingSummary(false);
    }
  };

  // Load server status
  const fetchServerStatus = async () => {
    try {
      const res = await fetch('/api/game/server-status');
      if (res.ok) {
        const data = await res.json();
        setServerStatus(data);
      }
    } catch {
      /* ignore */
    }
  };

  // Load snapshots & validation
  const fetchReleases = async () => {
    try {
      const [snapRes, valRes] = await Promise.all([
        listPublishSnapshots(),
        validateWorldForPublish(),
      ]);
      if (snapRes.success && snapRes.data) {
        setSnapshots(snapRes.data);
      }
      setValidationResult(valRes);
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchSummary();
      fetchServerStatus();
      if (userLevel >= 400) {
        fetchReleases();
      }
    }
  }, [isOpen, userLevel]);

  // Reset section if current active section is not permitted
  useEffect(() => {
    if (!accessibleSections.some((s) => s.id === activeSection)) {
      setActiveSection(accessibleSections[0]?.id || 'overview');
    }
  }, [accessibleSections, activeSection]);

  // Dragging handlers (drag from header only)
  const handlePointerDownHeader = (e: React.PointerEvent) => {
    if (isMaximized) return;
    if ((e.target as HTMLElement).closest('button')) return;
    setIsDragging(true);
    dragStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      posX: position.x,
      posY: position.y,
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMoveHeader = (e: React.PointerEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStartRef.current.mouseX;
    const dy = e.clientY - dragStartRef.current.mouseY;
    setPosition({
      x: Math.max(10, Math.min(window.innerWidth - 300, dragStartRef.current.posX + dx)),
      y: Math.max(10, Math.min(window.innerHeight - 100, dragStartRef.current.posY + dy)),
    });
  };

  const handlePointerUpHeader = (e: React.PointerEvent) => {
    setIsDragging(false);
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
  };

  // Toggle Realm Server
  const handleToggleServer = async (targetStatus: 'online' | 'offline') => {
    if (targetStatus === 'offline') {
      setConfirmModal({
        title: `Stop ${realmTitle} Realm?`,
        description: `Taking the live game realm offline will disconnect all active ${heroPlural.toLowerCase()} and suspend gateway connections.`,
        actionLabel: 'Stop Realm',
        onConfirm: async () => {
          await executeServerStatusChange('offline');
        },
      });
      return;
    }
    await executeServerStatusChange('online');
  };

  const executeServerStatusChange = async (targetStatus: 'online' | 'offline') => {
    setIsServerActionLoading(true);
    soundSynth?.playActionSound?.();
    setServerActionMsg(`Requesting server ${targetStatus.toUpperCase()} state...`);
    try {
      const res = await fetch('/api/game/server-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: targetStatus === 'online' ? 'start' : 'stop', status: targetStatus }),
      });
      if (res.ok) {
        const data = await res.json();
        setServerStatus((prev) => ({ ...prev, status: data.status }));
        setServerActionMsg(`Realm is now ${data.status.toUpperCase()}`);
      }
    } catch (err: any) {
      setServerActionMsg(`Error: ${err.message || 'Failed to update realm status'}`);
    } finally {
      setIsServerActionLoading(false);
      setTimeout(() => setServerActionMsg(null), 3000);
      fetchServerStatus();
    }
  };

  const handleResetDevOverride = async () => {
    setIsServerActionLoading(true);
    soundSynth?.playActionSound?.();
    try {
      await fetch('/api/game/server-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset' }),
      });
      await fetchServerStatus();
      setServerActionMsg('Server state override reset to auto-detect');
    } catch {}
    setIsServerActionLoading(false);
    setTimeout(() => setServerActionMsg(null), 3000);
  };

  // Save Camera Policy
  const handleSaveCameraPolicy = async () => {
    setIsSavingCamera(true);
    soundSynth?.playActionSound?.();
    try {
      const res = await fetch('/api/realm/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          defaultCameraStyle: cameraStyle,
          cameraSmoothingFactor: cameraSmoothing / 100,
          allowCustomPlayerCamera,
        }),
      });
      if (res.ok) {
        setCameraSavedToast(true);
        setTimeout(() => setCameraSavedToast(false), 2500);
        mutateSettings?.();
      }
    } catch {}
    setIsSavingCamera(false);
  };

  // Run Content Validation
  const handleRunValidation = async () => {
    setIsValidating(true);
    soundSynth?.playActionSound?.();
    try {
      const res = await validateWorldForPublish();
      setValidationResult(res);
    } catch {}
    setIsValidating(false);
  };

  // Rollback to Snapshot
  const handleRollbackSnapshot = (snapshotId: string, versionTitle: string) => {
    setConfirmModal({
      title: `Roll Back to ${versionTitle}?`,
      description: `Reverting to snapshot will restore templates and world definitions to this state. Live player progression remains intact.`,
      actionLabel: 'Roll Back',
      onConfirm: async () => {
        setIsRollingBack(true);
        soundSynth?.playActionSound?.();
        try {
          const res = await rollbackToSnapshot(snapshotId);
          if (res.success) {
            fetchReleases();
          }
        } catch {}
        setIsRollingBack(false);
      },
    });
  };

  // Create Publish Snapshot
  const handleCreateSnapshot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!publishTitle.trim()) return;
    soundSynth?.playActionSound?.();
    try {
      const res = await createPublishSnapshot({
        title: publishTitle,
        version: publishVersion || undefined,
        description: publishNotes || undefined,
      });
      if (res.success) {
        setShowPublishModal(false);
        setPublishTitle('');
        setPublishVersion('');
        setPublishNotes('');
        fetchReleases();
        fetchSummary();
      }
    } catch {}
  };

  // Execute Maintenance Action
  const handleExecuteMaintenance = async () => {
    setShowMaintenanceConfirm(false);
    setIsExecutingMaintenance(true);
    soundSynth?.playActionSound?.();
    setMaintenanceOutput(`Initializing ${maintenanceProfile.toUpperCase()} execution...`);
    try {
      const res = await fetch('/api/admin/system/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          updateType: maintenanceProfile,
          wipeGameData: dataRetentionMode === 'wipe',
        }),
      });
      const data = await res.json();
      setMaintenanceOutput(data.message || 'Maintenance execution complete.');
    } catch (err: any) {
      setMaintenanceOutput(`Execution error: ${err.message || 'Failed to trigger maintenance'}`);
    } finally {
      setIsExecutingMaintenance(false);
    }
  };

  // Send Staff Announcement
  const handleSendAnnounce = (e: React.FormEvent) => {
    e.preventDefault();
    const text = announceText.trim();
    if (!text) return;
    soundSynth?.playActionSound?.();
    emitSocketEvent?.('staff_announce', text);
    setAnnounceSent(true);
    setAnnounceText('');
    setTimeout(() => setAnnounceSent(false), 3000);
  };

  if (!isOpen) return null;

  // Active section metadata
  const currentSectionMeta = ADMIN_SECTIONS.find((s) => s.id === activeSection) || ADMIN_SECTIONS[0];

  return (
    <div
      ref={windowRef}
      style={{
        position: 'fixed',
        left: isMaximized ? 0 : `${position.x}px`,
        top: isMaximized ? 0 : `${position.y}px`,
        width: isMaximized ? '100vw' : '920px',
        height: isMaximized ? '100vh' : isMinimized ? '42px' : '620px',
        maxWidth: isMaximized ? '100vw' : 'calc(100vw - 20px)',
        maxHeight: isMaximized ? '100vh' : 'calc(100vh - 20px)',
        zIndex: 1000,
      }}
      className={`pointer-events-auto flex flex-col font-sans transition-all duration-150 select-none ${
        isMaximized
          ? 'rounded-none border-0'
          : 'rounded-2xl border border-white/10 shadow-[0_20px_70px_rgba(0,0,0,0.85)]'
      } bg-[#050b14]/98 backdrop-blur-xl overflow-hidden`}
    >
      {/* ── 1. SHALLOW TITLE BAR (Exact Image 1 Spec) ── */}
      <div
        onPointerDown={handlePointerDownHeader}
        onPointerMove={handlePointerMoveHeader}
        onPointerUp={handlePointerUpHeader}
        onDoubleClick={() => setIsMinimized((prev) => !prev)}
        className="h-10 px-3.5 flex items-center justify-between border-b border-white/10 bg-black/40 cursor-grab active:cursor-grabbing shrink-0"
      >
        {/* Left identity cluster */}
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center text-primary font-mono font-bold text-[10px] shadow-sm">
            <Shield size={11} className="text-primary" />
          </div>
          <span className="font-mono font-black text-xs text-primary tracking-wider uppercase">
            ADMIN
          </span>
          <span className="text-muted-foreground/40 text-xs">·</span>
          <span className="font-mono text-xs text-muted-foreground">
            {currentSectionMeta.subtitle}
          </span>
        </div>

        {/* Right tiny OS-style window controls */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setIsMinimized((prev) => !prev)}
            className="w-6 h-6 flex items-center justify-center rounded hover:bg-white/10 text-muted-foreground hover:text-foreground text-xs transition-colors cursor-pointer"
            title={isMinimized ? 'Expand' : 'Minimize'}
          >
            <Minus size={13} />
          </button>
          <button
            type="button"
            onClick={() => setIsMaximized((prev) => !prev)}
            className="w-6 h-6 flex items-center justify-center rounded hover:bg-white/10 text-muted-foreground hover:text-foreground text-xs transition-colors cursor-pointer"
            title={isMaximized ? 'Restore' : 'Maximize'}
          >
            <Square size={11} />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="w-6 h-6 flex items-center justify-center rounded hover:bg-red-500/20 hover:text-red-400 text-muted-foreground text-xs transition-colors cursor-pointer"
            title="Close Console"
          >
            <X size={13} />
          </button>
        </div>
      </div>

      {/* When minimized, hide body and footer */}
      {!isMinimized && (
        <>
          {/* ── 2. WORKSPACE AREA (Left Rail + Open Center) ── */}
          <div className="flex-1 flex overflow-hidden">
            
            {/* ── Left Rail (Quiet, text-first, permission-filtered) ── */}
            <nav className="w-36 sm:w-40 shrink-0 border-r border-white/5 bg-black/20 p-2 flex flex-col gap-1 overflow-y-auto">
              <div className="px-2 py-1 mb-1">
                <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/60">
                  Sections
                </span>
              </div>
              {accessibleSections.map((sec) => {
                const isActive = activeSection === sec.id;
                return (
                  <button
                    key={sec.id}
                    onClick={() => {
                      soundSynth?.playSelectSound?.();
                      setActiveSection(sec.id);
                    }}
                    className={`text-left px-2.5 py-1.5 rounded-lg font-mono text-xs transition-all cursor-pointer flex items-center justify-between ${
                      isActive
                        ? 'bg-primary/15 text-primary border border-primary/30 font-bold shadow-sm'
                        : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
                    }`}
                  >
                    <span>{sec.label}</span>
                    {sec.id === 'maintenance' && (
                      <span className="text-[9px] px-1 py-0.2 rounded bg-red-500/20 text-red-300 font-mono">
                        DEV
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>

            {/* ── Main Continuous Content Region (Low chrome, body-open) ── */}
            <div className="flex-1 flex flex-col overflow-hidden bg-gradient-to-b from-transparent to-black/20">
              
              {/* Optional Section Top Toolbar Strip */}
              <div className="h-8 px-4 flex items-center justify-between border-b border-white/5 bg-black/10 text-xs font-mono text-muted-foreground shrink-0">
                <div className="flex items-center gap-3">
                  <span className="text-[11px] text-muted-foreground/70 uppercase tracking-wider">
                    {activeSection === 'overview' && 'System Telemetry · Overview'}
                    {activeSection === 'realm' && 'Live Gateway & Shard Management'}
                    {activeSection === 'camera' && 'Global Viewport Policy Defaults'}
                    {activeSection === 'releases' && 'Release Snapshots & Validation'}
                    {activeSection === 'maintenance' && 'Root Operation Pipeline'}
                    {activeSection === 'diagnostics' && 'System Heartbeat & Bus Health'}
                    {activeSection === 'staff' && 'Live Realm Moderation'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      soundSynth?.playSelectSound?.();
                      fetchSummary();
                      fetchServerStatus();
                      if (userLevel >= 400) fetchReleases();
                    }}
                    className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] text-muted-foreground hover:text-foreground hover:bg-white/5 transition-all cursor-pointer"
                  >
                    <RefreshCw size={10} className={isLoadingSummary ? 'animate-spin' : ''} />
                    <span>Sync</span>
                  </button>
                </div>
              </div>

              {/* Main Section Content Workspace */}
              <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4 font-mono text-xs">
                
                {/* ── OVERVIEW SECTION ── */}
                {activeSection === 'overview' && (
                  <div className="space-y-4 animate-in fade-in duration-200">
                    {/* Status strip */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="p-3 rounded-xl border border-white/5 bg-black/30">
                        <div className="text-[10px] text-muted-foreground uppercase mb-1">Realm State</div>
                        <div className="flex items-center gap-2">
                          <span className={`w-2.5 h-2.5 rounded-full ${serverStatus.status === 'online' ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
                          <span className="text-sm font-bold text-foreground uppercase tracking-wider">
                            {serverStatus.status}
                          </span>
                        </div>
                      </div>

                      <div className="p-3 rounded-xl border border-white/5 bg-black/30">
                        <div className="text-[10px] text-muted-foreground uppercase mb-1">Active {heroPlural}</div>
                        <div className="text-sm font-bold text-foreground">
                          {serverStatus.players}{' '}
                          <span className="text-xs text-muted-foreground font-normal">/ {serverStatus.capacity} max</span>
                        </div>
                      </div>

                      <div className="p-3 rounded-xl border border-white/5 bg-black/30">
                        <div className="text-[10px] text-muted-foreground uppercase mb-1">Live Content Version</div>
                        <div className="text-sm font-bold text-primary">
                          {summaryData?.releaseSummary?.liveVersion || 'v2.1.720'}
                        </div>
                      </div>
                    </div>

                    {/* Operational Alerts Strip */}
                    <div className="p-3.5 rounded-xl border border-white/5 bg-black/30 space-y-2">
                      <div className="flex items-center justify-between border-b border-white/5 pb-1.5">
                        <span className="text-[11px] font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                          <AlertCircle size={13} className="text-primary" /> Active Alerts &amp; Tasks
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {summaryData?.commandSummary?.alerts?.length ?? 0} items
                        </span>
                      </div>
                      {(!summaryData?.commandSummary?.alerts || summaryData.commandSummary.alerts.length === 0) ? (
                        <div className="py-2 text-center text-muted-foreground text-xs">
                          All world definitions and gateway services operating normally.
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          {summaryData.commandSummary.alerts.map((al: any) => (
                            <div key={al.id} className="flex items-start gap-2 text-[11px] p-2 rounded-lg bg-white/5 border border-white/5">
                              <AlertTriangle size={12} className={al.severity === 'error' ? 'text-red-400' : 'text-amber-400'} />
                              <div className="flex-1">
                                <span className="font-bold text-foreground mr-1">{al.title}:</span>
                                <span className="text-muted-foreground">{al.message}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Operator Activity Log */}
                    <div className="p-3.5 rounded-xl border border-white/5 bg-black/30 space-y-2">
                      <div className="flex items-center justify-between border-b border-white/5 pb-1.5">
                        <span className="text-[11px] font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                          <Clock size={13} className="text-muted-foreground" /> Recent Operator Mutations
                        </span>
                        <span className="text-[10px] text-muted-foreground">Authoritative Audit Trail</span>
                      </div>
                      {(!summaryData?.recentAuditLogs || summaryData.recentAuditLogs.length === 0) ? (
                        <div className="py-3 text-center text-muted-foreground text-xs">
                          No recent mutations logged in memory buffer.
                        </div>
                      ) : (
                        <div className="space-y-1 max-h-40 overflow-y-auto">
                          {summaryData.recentAuditLogs.slice(0, 5).map((log: any) => (
                            <div key={log.id} className="flex items-center justify-between p-1.5 rounded hover:bg-white/5 text-[11px] text-muted-foreground">
                              <div className="flex items-center gap-2 truncate">
                                <span className="text-primary font-bold">{log.action}</span>
                                <span className="text-muted-foreground/60">by {log.userId}</span>
                              </div>
                              <span className="text-[10px] text-muted-foreground/40 shrink-0">
                                {new Date(log.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Quick Jump Links */}
                    <div className="pt-2 flex flex-wrap gap-2">
                      <a
                        href="/admin/game"
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 rounded-lg border border-white/10 hover:border-primary/40 bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-foreground text-[11px] flex items-center gap-1.5 transition-all"
                      >
                        <ExternalLink size={11} /> Game Operations
                      </a>
                      <a
                        href="/admin/game/gates"
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 rounded-lg border border-white/10 hover:border-primary/40 bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-foreground text-[11px] flex items-center gap-1.5 transition-all"
                      >
                        <ExternalLink size={11} /> Gateways
                      </a>
                      <a
                        href="/admin/game-servers"
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 rounded-lg border border-white/10 hover:border-primary/40 bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-foreground text-[11px] flex items-center gap-1.5 transition-all"
                      >
                        <ExternalLink size={11} /> Game Servers
                      </a>
                    </div>
                  </div>
                )}

                {/* ── REALM CONTROL SECTION ── */}
                {activeSection === 'realm' && (
                  <div className="space-y-4 animate-in fade-in duration-200">
                    <div className="p-4 rounded-xl border border-white/5 bg-black/30 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-bold text-foreground uppercase tracking-wide">
                            {realmTitle} Realm Gateway
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            Controls whether the server accepts active connections from {heroPlural}.
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider ${
                            serverStatus.status === 'online' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'bg-red-500/20 text-red-400 border border-red-500/40'
                          }`}>
                            {serverStatus.status}
                          </span>
                        </div>
                      </div>

                      {/* Action response banner */}
                      {serverActionMsg && (
                        <div className="p-2.5 rounded-lg bg-primary/10 border border-primary/30 text-primary text-xs flex items-center gap-2">
                          <CheckCircle2 size={13} /> {serverActionMsg}
                        </div>
                      )}

                      {/* Server controls */}
                      {isAdmin ? (
                        <div className="flex flex-wrap gap-2 pt-2 border-t border-white/5">
                          {serverStatus.status === 'offline' ? (
                            <button
                              onClick={() => handleToggleServer('online')}
                              disabled={isServerActionLoading}
                              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg active:scale-95 transition-all cursor-pointer"
                            >
                              <Play size={13} /> Start Realm
                            </button>
                          ) : (
                            <button
                              onClick={() => handleToggleServer('offline')}
                              disabled={isServerActionLoading}
                              className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg active:scale-95 transition-all cursor-pointer"
                            >
                              <StopSquare size={13} /> Stop Realm
                            </button>
                          )}
                          <button
                            onClick={handleResetDevOverride}
                            disabled={isServerActionLoading}
                            className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-muted-foreground hover:text-foreground text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                          >
                            <RotateCcw size={12} /> Reset Override
                          </button>
                        </div>
                      ) : (
                        <div className="text-[11px] text-muted-foreground italic">
                          Moderator view only. Realm start/stop controls require Admin permissions.
                        </div>
                      )}
                    </div>

                    {/* Occupancy telemetry strip */}
                    <div className="p-4 rounded-xl border border-white/5 bg-black/30 space-y-2">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-muted-foreground uppercase">{heroPlural} Occupancy:</span>
                        <span className="font-bold text-foreground">{serverStatus.players} / {serverStatus.capacity}</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-white/5 overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all duration-300"
                          style={{ width: `${Math.min(100, Math.max(2, (serverStatus.players / serverStatus.capacity) * 100))}%` }}
                        />
                      </div>
                      <div className="text-[10px] text-muted-foreground/60 pt-1">
                        Go MMO Destination: {summaryData?.gatewayStatus?.goMmoUrl || 'Standalone / Next.js cluster fallback'}
                      </div>
                    </div>
                  </div>
                )}

                {/* ── CAMERA POLICY SECTION (Admin 400+) ── */}
                {activeSection === 'camera' && (
                  <div className="space-y-4 animate-in fade-in duration-200">
                    <div className="p-4 rounded-xl border border-white/5 bg-black/30 space-y-3">
                      <div>
                        <div className="text-sm font-bold text-foreground uppercase tracking-wide">
                          Default Game Viewport Style
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          Authoritative presentation perspective applied to connecting {heroPlural}.
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                        {(['isometric', 'follow45', 'topdown', 'free'] as const).map((style) => (
                          <button
                            key={style}
                            onClick={() => {
                              soundSynth?.playSelectSound?.();
                              setCameraStyle(style);
                            }}
                            className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                              cameraStyle === style
                                ? 'bg-primary/20 border-primary text-primary font-bold shadow-sm'
                                : 'bg-black/40 border-white/5 text-muted-foreground hover:text-foreground'
                            }`}
                          >
                            <div className="capitalize text-xs font-mono">{style}</div>
                            <div className="text-[9px] text-muted-foreground/60 mt-0.5">
                              {style === 'isometric' && 'Classic 2.5D'}
                              {style === 'follow45' && '45° Tilt Follow'}
                              {style === 'topdown' && 'Direct Overhead'}
                              {style === 'free' && 'Unlocked Orbit'}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Camera fine tuning sliders */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="p-3.5 rounded-xl border border-white/5 bg-black/30 space-y-2">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-muted-foreground">Follow Smoothing</span>
                          <span className="text-primary font-bold">{cameraSmoothing}%</span>
                        </div>
                        <input
                          type="range"
                          min="5"
                          max="95"
                          value={cameraSmoothing}
                          onChange={(e) => setCameraSmoothing(Number(e.target.value))}
                          className="w-full accent-primary cursor-pointer"
                        />
                      </div>

                      <div className="p-3.5 rounded-xl border border-white/5 bg-black/30 space-y-2">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-muted-foreground">Vignette Edge Attenuation</span>
                          <span className="text-primary font-bold">{vignetteIntensity}</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="40"
                          value={vignetteIntensity}
                          onChange={(e) => setVignetteIntensity(Number(e.target.value))}
                          className="w-full accent-primary cursor-pointer"
                        />
                      </div>
                    </div>

                    {/* Camera Authority Toggles */}
                    <div className="p-3.5 rounded-xl border border-white/5 bg-black/30 space-y-2.5">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={allowCustomPlayerCamera}
                          onChange={(e) => setAllowCustomPlayerCamera(e.target.checked)}
                          className="rounded accent-primary"
                        />
                        <span className="text-xs text-foreground">
                          Allow individual {heroSingular} to customize camera perspective in local Options
                        </span>
                      </label>

                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={authoredMapAuthority}
                          onChange={(e) => setAuthoredMapAuthority(e.target.checked)}
                          className="rounded accent-primary"
                        />
                        <span className="text-xs text-foreground">
                          Authored map camera definitions override global default when joining maps
                        </span>
                      </label>
                    </div>

                    {cameraSavedToast && (
                      <div className="p-2 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
                        <CheckCircle2 size={13} /> Camera policy saved successfully to realm configuration.
                      </div>
                    )}
                  </div>
                )}

                {/* ── RELEASES SECTION (Admin 400+) ── */}
                {activeSection === 'releases' && (
                  <div className="space-y-4 animate-in fade-in duration-200">
                    {/* Live version summary */}
                    <div className="p-4 rounded-xl border border-white/5 bg-black/30 flex items-center justify-between">
                      <div>
                        <div className="text-sm font-bold text-foreground uppercase tracking-wide">
                          World Content State
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          Active release version: <span className="text-primary font-bold">{summaryData?.releaseSummary?.liveVersion || 'v2.1.720'}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={handleRunValidation}
                          disabled={isValidating}
                          className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-muted-foreground hover:text-foreground text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                        >
                          <CheckCircle2 size={12} className={isValidating ? 'animate-spin' : 'text-emerald-400'} />
                          <span>{isValidating ? 'Validating...' : 'Validate Content'}</span>
                        </button>
                        <button
                          onClick={() => setShowPublishModal(true)}
                          className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground font-bold text-xs flex items-center gap-1.5 shadow active:scale-95 transition-all cursor-pointer"
                        >
                          <UploadCloud size={12} /> Create Snapshot
                        </button>
                      </div>
                    </div>

                    {/* Validation Gate Report */}
                    {validationResult && (
                      <div className={`p-3 rounded-xl border ${validationResult.valid ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-red-500/10 border-red-500/30'} space-y-1`}>
                        <div className="flex items-center justify-between text-xs font-bold">
                          <span className={validationResult.valid ? 'text-emerald-400' : 'text-red-400'}>
                            {validationResult.valid ? '✓ Content Integrity Verified' : '⚠ Validation Gate Failures'}
                          </span>
                          <span className="text-muted-foreground text-[10px]">
                            {validationResult.errorCount} Errors · {validationResult.warningCount} Warnings
                          </span>
                        </div>
                        {validationResult.errors.length > 0 && (
                          <div className="text-[11px] text-red-300 space-y-0.5 pt-1">
                            {validationResult.errors.map((err, i) => (
                              <div key={i}>• {err}</div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Snapshot History */}
                    <div className="p-3.5 rounded-xl border border-white/5 bg-black/30 space-y-2">
                      <div className="text-[11px] font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5 border-b border-white/5 pb-1.5">
                        <History size={13} className="text-muted-foreground" /> Snapshot Archive ({snapshots.length})
                      </div>
                      {snapshots.length === 0 ? (
                        <div className="py-4 text-center text-muted-foreground text-xs">
                          No release snapshots archived yet.
                        </div>
                      ) : (
                        <div className="space-y-1.5 max-h-48 overflow-y-auto">
                          {snapshots.map((snap) => (
                            <div key={snap.id} className="flex items-center justify-between p-2 rounded-lg bg-white/5 border border-white/5 text-[11px]">
                              <div>
                                <div className="font-bold text-foreground">{snap.title}</div>
                                <div className="text-[10px] text-muted-foreground">
                                  {snap.version ? `v${snap.version}` : 'unversioned'} · {new Date(snap.createdAt).toLocaleDateString()}
                                </div>
                              </div>
                              <button
                                onClick={() => handleRollbackSnapshot(snap.id, snap.title)}
                                disabled={isRollingBack}
                                className="px-2.5 py-1 rounded bg-white/5 hover:bg-red-500/20 text-muted-foreground hover:text-red-300 border border-white/10 text-[10px] font-bold transition-all cursor-pointer"
                              >
                                Roll Back
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* ── MAINTENANCE SECTION (Developer 1000+ Only) ── */}
                {activeSection === 'maintenance' && (
                  <div className="space-y-4 animate-in fade-in duration-200">
                    <div className="p-4 rounded-xl border border-white/5 bg-black/30 space-y-3">
                      <div>
                        <div className="text-sm font-bold text-foreground uppercase tracking-wide flex items-center gap-2">
                          <Wrench size={14} className="text-red-400" /> Operational Maintenance Engine
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          Direct pipeline updates, database sync, service restarts, and container management.
                        </div>
                      </div>

                      {/* Profile Selection */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
                        {[
                          { id: 'auto', label: 'Smart Auto', desc: 'Inspect commits & rebuild needed' },
                          { id: 'quick', label: 'Quick Sync', desc: 'Git pull + fast restart (~5s)' },
                          { id: 'app', label: 'App Rebuild', desc: 'Recompile Next.js bundle' },
                          { id: 'db', label: 'DB & Content', desc: 'Prisma migrations & assets' },
                          { id: 'full', label: 'Full Clean', desc: 'Prune cache, migration & rebuild' },
                          { id: 'restart', label: 'Restart Only', desc: 'Restart node/services' },
                        ].map((p) => (
                          <button
                            key={p.id}
                            onClick={() => {
                              soundSynth?.playSelectSound?.();
                              setMaintenanceProfile(p.id as any);
                            }}
                            className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                              maintenanceProfile === p.id
                                ? 'bg-primary/20 border-primary text-primary font-bold shadow-sm'
                                : 'bg-black/40 border-white/5 text-muted-foreground hover:text-foreground'
                            }`}
                          >
                            <div className="text-xs font-mono">{p.label}</div>
                            <div className="text-[9px] text-muted-foreground/60 mt-0.5">{p.desc}</div>
                          </button>
                        ))}
                      </div>

                      {/* Data retention option */}
                      <div className="pt-2 border-t border-white/5 flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Data Retention Baseline:</span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setDataRetentionMode('keep')}
                            className={`px-2.5 py-1 rounded text-[11px] font-mono cursor-pointer transition-all ${
                              dataRetentionMode === 'keep' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'text-muted-foreground'
                            }`}
                          >
                            Keep Data
                          </button>
                          <button
                            onClick={() => setDataRetentionMode('wipe')}
                            className={`px-2.5 py-1 rounded text-[11px] font-mono cursor-pointer transition-all ${
                              dataRetentionMode === 'wipe' ? 'bg-red-500/20 text-red-300 border border-red-500/40' : 'text-muted-foreground'
                            }`}
                          >
                            Wipe Test Data
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Maintenance output log */}
                    {maintenanceOutput && (
                      <div className="p-3 rounded-xl bg-black/50 border border-white/10 font-mono text-[11px] text-muted-foreground space-y-1">
                        <div className="text-foreground font-bold uppercase tracking-wider text-[10px]">Execution Feedback</div>
                        <div className="text-emerald-400">{maintenanceOutput}</div>
                      </div>
                    )}
                  </div>
                )}

                {/* ── DIAGNOSTICS SECTION ── */}
                {activeSection === 'diagnostics' && (
                  <div className="space-y-4 animate-in fade-in duration-200">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="p-3.5 rounded-xl border border-white/5 bg-black/30 space-y-1">
                        <div className="text-[10px] text-muted-foreground uppercase">Gateway Telemetry</div>
                        <div className="text-base font-bold text-foreground">
                          {summaryData?.diagnostics?.heartbeatMs ?? 1} ms
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          Realtime socket latency baseline
                        </div>
                      </div>

                      <div className="p-3.5 rounded-xl border border-white/5 bg-black/30 space-y-1">
                        <div className="text-[10px] text-muted-foreground uppercase">Database Provider</div>
                        <div className="text-base font-bold text-foreground">
                          {summaryData?.diagnostics?.dbProvider || 'SQLite (Local)'}
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          Active operational persistence engine
                        </div>
                      </div>
                    </div>

                    <div className="p-3.5 rounded-xl border border-white/5 bg-black/30 space-y-2">
                      <div className="text-[11px] font-bold text-foreground uppercase tracking-wider">
                        Environment Diagnostics
                      </div>
                      <div className="space-y-1 text-xs text-muted-foreground">
                        <div className="flex justify-between py-1 border-b border-white/5">
                          <span>Runtime Platform</span>
                          <span className="text-foreground">{summaryData?.diagnostics?.platform || 'windows'}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-white/5">
                          <span>Node Engine</span>
                          <span className="text-foreground">{summaryData?.diagnostics?.runtime || 'Node.js'}</span>
                        </div>
                        <div className="flex justify-between py-1">
                          <span>Execution Mode</span>
                          <span className="text-foreground">{summaryData?.diagnostics?.nodeEnv || 'development'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2">
                      <a
                        href="/admin/dev/system"
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 rounded-lg border border-white/10 hover:border-primary/40 bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-foreground text-[11px] inline-flex items-center gap-1.5 transition-all"
                      >
                        <ExternalLink size={11} /> Open Deep System Diagnostics
                      </a>
                    </div>
                  </div>
                )}

                {/* ── STAFF TOOLS SECTION ── */}
                {activeSection === 'staff' && (
                  <div className="space-y-4 animate-in fade-in duration-200">
                    {/* Announcement Form */}
                    <div className="p-4 rounded-xl border border-white/5 bg-black/30 space-y-3">
                      <div className="text-sm font-bold text-foreground uppercase tracking-wide">
                        Broadcast Map Announcement
                      </div>
                      <form onSubmit={handleSendAnnounce} className="space-y-2">
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={announceText}
                            onChange={(e) => setAnnounceText(e.target.value)}
                            placeholder={`Broadcast high-priority announcement to all active ${heroPlural.toLowerCase()}...`}
                            className="flex-1 bg-black/50 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary"
                          />
                          <button
                            type="submit"
                            disabled={!announceText.trim()}
                            className="px-3 py-1.5 rounded-xl bg-primary text-primary-foreground font-bold text-xs flex items-center gap-1.5 disabled:opacity-50 transition-all cursor-pointer"
                          >
                            <Send size={11} /> Send
                          </button>
                        </div>
                        {announceSent && (
                          <div className="text-[10px] text-emerald-400">
                            ✓ Announcement broadcast sent to map instances.
                          </div>
                        )}
                      </form>
                    </div>

                    {/* Nearby Active Players */}
                    <div className="p-3.5 rounded-xl border border-white/5 bg-black/30 space-y-2">
                      <div className="text-[11px] font-bold text-foreground uppercase tracking-wider flex items-center justify-between border-b border-white/5 pb-1.5">
                        <span>Connected {heroPlural} Presence</span>
                        <span className="text-muted-foreground text-[10px]">
                          {Object.keys(otherPlayers || {}).length} on active shard
                        </span>
                      </div>
                      {Object.keys(otherPlayers || {}).length === 0 ? (
                        <div className="py-3 text-center text-muted-foreground text-xs">
                          No other {heroPlural.toLowerCase()} currently connected to this shard instance.
                        </div>
                      ) : (
                        <div className="space-y-1.5 max-h-40 overflow-y-auto">
                          {Object.entries(otherPlayers || {}).map(([sId, p]: any) => (
                            <div key={sId} className="flex items-center justify-between p-2 rounded-lg bg-white/5 border border-white/5 text-[11px]">
                              <div>
                                <span className="font-bold text-foreground">{p.name || 'Saint'}</span>
                                <span className="text-muted-foreground text-[10px] ml-2">X:{p.x} Y:{p.y}</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={() => {
                                    soundSynth?.playActionSound?.();
                                    useGameStore.getState().setPlayerPosition({ x: p.x, y: p.y }, p.direction || 'down', false);
                                    emitSocketEvent?.('player_move', { x: p.x, y: p.y, direction: p.direction || 'down' });
                                  }}
                                  className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/15 text-[10px] text-muted-foreground hover:text-foreground cursor-pointer"
                                >
                                  Teleport
                                </button>
                                {isAdmin && (
                                  <button
                                    onClick={() => {
                                      setConfirmModal({
                                        title: `Remove ${p.name || 'player'} from realm?`,
                                        description: `Forces immediate disconnection from this game session.`,
                                        actionLabel: 'Remove Player',
                                        onConfirm: () => {
                                          soundSynth?.playActionSound?.();
                                          emitSocketEvent?.('staff_kick', { socketId: sId });
                                        },
                                      });
                                    }}
                                    className="px-2 py-0.5 rounded bg-red-500/20 hover:bg-red-500/30 text-red-300 text-[10px] cursor-pointer"
                                  >
                                    Kick
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── 3. THIN BOTTOM DIVIDER & FOOTER (Exact Image 1 Spec) ── */}
          <div className="h-11 px-4 border-t border-white/10 bg-black/40 flex items-center justify-between shrink-0">
            {/* Left small rounded utility pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto">
              <button
                type="button"
                onClick={() => {
                  soundSynth?.playSelectSound?.();
                  fetchSummary();
                  fetchServerStatus();
                }}
                className="px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-[11px] font-mono hover:bg-white/10 text-muted-foreground hover:text-foreground flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <RefreshCw size={10} className={isLoadingSummary ? 'animate-spin' : ''} />
                <span>Refresh</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveSection('overview')}
                className="px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-[11px] font-mono hover:bg-white/10 text-muted-foreground hover:text-foreground flex items-center gap-1 transition-all cursor-pointer"
              >
                <AlertCircle size={10} className="text-primary" />
                <span>Alerts ({summaryData?.commandSummary?.alerts?.length ?? 0})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveSection('realm')}
                className="px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-[11px] font-mono hover:bg-white/10 text-muted-foreground hover:text-foreground flex items-center gap-1 transition-all cursor-pointer"
              >
                <Users size={10} />
                <span>{heroPlural} ({serverStatus.players})</span>
              </button>
            </div>

            {/* Center compact status text */}
            <div className="hidden md:flex items-center gap-2 text-[11px] font-mono text-muted-foreground/70">
              <span>{summaryData?.diagnostics?.nodeEnv || 'dev'}</span>
              <span>·</span>
              <span>{summaryData?.releaseSummary?.liveVersion || 'v2.1.720'}</span>
              <span>·</span>
              <span className={serverStatus.status === 'online' ? 'text-emerald-400' : 'text-red-400'}>
                {serverStatus.status}
              </span>
              <span>·</span>
              <span>Check: {lastCheckTime}</span>
            </div>

            {/* Right one strong primary action */}
            <div className="flex items-center gap-2">
              {activeSection === 'overview' && (
                <a
                  href="/admin"
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-1.5 rounded-xl bg-primary text-primary-foreground font-mono text-xs font-bold uppercase tracking-wider hover:brightness-110 shadow-lg active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <ExternalLink size={12} />
                  <span>Open Full Admin</span>
                </a>
              )}

              {activeSection === 'realm' && isAdmin && (
                serverStatus.status === 'offline' ? (
                  <button
                    onClick={() => handleToggleServer('online')}
                    disabled={isServerActionLoading}
                    className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-bold uppercase tracking-wider shadow-lg active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Play size={12} />
                    <span>Start Realm</span>
                  </button>
                ) : (
                  <button
                    onClick={() => handleToggleServer('offline')}
                    disabled={isServerActionLoading}
                    className="px-4 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-mono text-xs font-bold uppercase tracking-wider shadow-lg active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <StopSquare size={12} />
                    <span>Stop Realm</span>
                  </button>
                )
              )}

              {activeSection === 'camera' && isAdmin && (
                <button
                  onClick={handleSaveCameraPolicy}
                  disabled={isSavingCamera}
                  className="px-4 py-1.5 rounded-xl bg-primary text-primary-foreground font-mono text-xs font-bold uppercase tracking-wider hover:brightness-110 shadow-lg active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Check size={12} />
                  <span>{isSavingCamera ? 'Saving...' : 'Save Policy'}</span>
                </button>
              )}

              {activeSection === 'releases' && isAdmin && (
                <button
                  onClick={handleRunValidation}
                  disabled={isValidating}
                  className="px-4 py-1.5 rounded-xl bg-primary text-primary-foreground font-mono text-xs font-bold uppercase tracking-wider hover:brightness-110 shadow-lg active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle2 size={12} />
                  <span>{isValidating ? 'Validating...' : 'Validate Content'}</span>
                </button>
              )}

              {activeSection === 'maintenance' && isDeveloper && (
                <button
                  onClick={() => setShowMaintenanceConfirm(true)}
                  disabled={isExecutingMaintenance}
                  className="px-4 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-mono text-xs font-bold uppercase tracking-wider shadow-lg active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Wrench size={12} />
                  <span>{isExecutingMaintenance ? 'Executing...' : 'Run Update'}</span>
                </button>
              )}

              {activeSection === 'diagnostics' && (
                <a
                  href="/admin/dev/system"
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-foreground border border-white/10 font-mono text-xs font-bold uppercase tracking-wider shadow active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <ExternalLink size={12} />
                  <span>Full Diagnostics</span>
                </a>
              )}

              {activeSection === 'staff' && (
                <button
                  onClick={handleSendAnnounce}
                  disabled={!announceText.trim()}
                  className="px-4 py-1.5 rounded-xl bg-primary text-primary-foreground font-mono text-xs font-bold uppercase tracking-wider hover:brightness-110 shadow-lg active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Send size={12} />
                  <span>Broadcast</span>
                </button>
              )}
            </div>
          </div>
        </>
      )}

      {/* ── SAFETY CONFIRMATION MODAL ── */}
      {confirmModal && (
        <div className="fixed inset-0 z-[1200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-sm rounded-2xl border border-destructive/40 bg-[#0a0512] p-6 shadow-2xl font-mono text-center">
            <div className="w-12 h-12 rounded-full bg-destructive/15 border border-destructive/30 flex items-center justify-center mx-auto mb-3 text-destructive">
              <AlertTriangle size={24} />
            </div>
            <h3 className="text-base font-black text-foreground uppercase tracking-wider mb-2">
              {confirmModal.title}
            </h3>
            <p className="text-xs text-muted-foreground mb-6 leading-relaxed">
              {confirmModal.description}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmModal(null)}
                className="flex-1 py-2 rounded-xl border border-border bg-white/5 text-muted-foreground hover:text-foreground text-xs font-bold uppercase transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const cb = confirmModal.onConfirm;
                  setConfirmModal(null);
                  cb();
                }}
                className="flex-1 py-2 rounded-xl bg-destructive hover:bg-destructive/90 text-destructive-foreground text-xs font-bold uppercase tracking-wider shadow-lg active:scale-95 transition-all cursor-pointer"
              >
                {confirmModal.actionLabel}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MAINTENANCE CONFIRMATION MODAL ── */}
      {showMaintenanceConfirm && (
        <div className="fixed inset-0 z-[1200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-sm rounded-2xl border border-red-500/40 bg-[#0a0512] p-6 shadow-2xl font-mono text-center">
            <div className="w-12 h-12 rounded-full bg-red-500/15 border border-red-500/30 flex items-center justify-center mx-auto mb-3 text-red-400">
              <Wrench size={24} />
            </div>
            <h3 className="text-base font-black text-foreground uppercase tracking-wider mb-2">
              Trigger {maintenanceProfile.toUpperCase()} Maintenance?
            </h3>
            <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
              Target Profile: <strong className="text-primary">{maintenanceProfile}</strong>
              <br />
              Data Retention: <strong className={dataRetentionMode === 'wipe' ? 'text-red-400' : 'text-emerald-400'}>
                {dataRetentionMode === 'wipe' ? 'WIPE TEST DATA' : 'KEEP ALL DATA'}
              </strong>
            </p>
            {dataRetentionMode === 'wipe' && (
              <div className="p-2.5 rounded-lg bg-red-500/20 border border-red-500/40 text-red-300 text-[11px] mb-4 text-left">
                ⚠ WARNING: All player inventory items, creatures, and test world maps will be reset.
              </div>
            )}
            <div className="flex gap-2">
              <button
                onClick={() => setShowMaintenanceConfirm(false)}
                className="flex-1 py-2 rounded-xl border border-border bg-white/5 text-muted-foreground hover:text-foreground text-xs font-bold uppercase transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteMaintenance}
                className="flex-1 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold uppercase tracking-wider shadow-lg active:scale-95 transition-all cursor-pointer"
              >
                Execute
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── CREATE SNAPSHOT MODAL ── */}
      {showPublishModal && (
        <div className="fixed inset-0 z-[1200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <form
            onSubmit={handleCreateSnapshot}
            className="w-full max-w-md rounded-2xl border border-primary/40 bg-[#0a0512] p-6 shadow-2xl font-mono space-y-4"
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <span className="text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                <UploadCloud size={14} className="text-primary" /> Create Release Snapshot
              </span>
              <button
                type="button"
                onClick={() => setShowPublishModal(false)}
                className="text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground uppercase block mb-1">Release Title *</label>
              <input
                type="text"
                required
                value={publishTitle}
                onChange={(e) => setPublishTitle(e.target.value)}
                placeholder="e.g. World Alpha Baseline"
                className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground uppercase block mb-1">Semantic Version</label>
              <input
                type="text"
                value={publishVersion}
                onChange={(e) => setPublishVersion(e.target.value)}
                placeholder="2.1.720"
                className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground uppercase block mb-1">Release Notes</label>
              <textarea
                value={publishNotes}
                onChange={(e) => setPublishNotes(e.target.value)}
                placeholder="Summary of world additions, balance changes, or map updates..."
                rows={3}
                className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => setShowPublishModal(false)}
                className="px-3 py-1.5 rounded-xl border border-white/10 bg-white/5 text-muted-foreground hover:text-foreground text-xs uppercase cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-xl bg-primary text-primary-foreground font-bold text-xs uppercase tracking-wider hover:brightness-110 shadow cursor-pointer"
              >
                Create Snapshot
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
