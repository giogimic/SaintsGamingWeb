'use client';

import React, { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { AmbientBackground } from '@/web/components/shared/ambient-background';
import { UserSettingsOverlayShell } from '@/web/components/user-settings/user-settings-overlay-shell';
import { GlobalPostComposer } from '@/web/components/feed/global-post-composer';
import { useAppStore } from "@/shared/store/useAppStore";

interface MainLayoutShellProps {
  children: React.ReactNode;
  navbar: React.ReactNode;
  commandPalette: React.ReactNode;
  messengerPopup: React.ReactNode;
  bottomBar: React.ReactNode;
  toaster: React.ReactNode;
}

export function MainLayoutShell({
  children,
  navbar,
  commandPalette,
  messengerPopup,
  bottomBar,
  toaster,
}: MainLayoutShellProps) {
  const pathname = usePathname();
  const isStudio = pathname?.startsWith('/studio');
  const isLobby = pathname?.startsWith('/lobby');
  const isBarsHidden = useAppStore((s) => s.isBarsHidden);

  // Global Tab key toggle to hide/show navigation bars and interface elements
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Tab") {
        const target = e.target as HTMLElement | null;
        if (
          target?.tagName === "INPUT" ||
          target?.tagName === "TEXTAREA" ||
          target?.tagName === "SELECT" ||
          target?.isContentEditable
        ) {
          return;
        }
        e.preventDefault();
        useAppStore.getState().toggleBars();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Studio route: absolute full-bleed with persistent layout, but hides website navbar and bottomBar to show studio tools
  if (isStudio) {
    return (
      <div className="fixed inset-0 w-screen h-screen overflow-hidden selection:bg-primary/30 z-[100] bg-[#0a0a0f]">
        <main className="w-full h-full overflow-hidden">
          {children}
        </main>
        <div className={`transition-opacity duration-300 ${isBarsHidden ? "opacity-0 pointer-events-none" : "opacity-100"}`}>
          {commandPalette}
          {messengerPopup}
        </div>
        {toaster}
        <UserSettingsOverlayShell />
        <GlobalPostComposer />
      </div>
    );
  }

  // Lobby MMO route: full-bleed viewport with persistent navbar and bottomBar encompassing the entire world
  if (isLobby) {
    return (
      <div className="fixed inset-0 w-screen h-screen overflow-hidden selection:bg-primary/30 bg-[#0a0a0f]">
        <AmbientBackground />
        {navbar}
        <main className="w-full h-full overflow-hidden">
          {children}
        </main>
        <div className={`transition-opacity duration-300 ${isBarsHidden ? "opacity-0 pointer-events-none" : "opacity-100"}`}>
          {commandPalette}
          {messengerPopup}
        </div>
        {bottomBar}
        {toaster}
        <UserSettingsOverlayShell />
        <GlobalPostComposer />
      </div>
    );
  }

  const isFeed = pathname?.startsWith('/feed') || pathname?.startsWith('/profile/inbox');

  // Standard website pages: full page layout with animated page enter and global navigation
  return (
    <div className={`flex flex-col min-h-screen relative overflow-x-hidden selection:bg-primary/30 ${isFeed ? "pb-0 sm:pb-10" : "pb-10"}`}>
      <AmbientBackground />
      {navbar}
      <main className={`flex-1 sg-page-enter z-10 ${isFeed ? "pt-0 sm:pt-16 pb-0 sm:pb-12" : "pt-14 sm:pt-16 pb-12"}`}>
        {children}
      </main>
      <div className={`transition-opacity duration-300 ${isBarsHidden ? "opacity-0 pointer-events-none" : "opacity-100"}`}>
        {commandPalette}
        {messengerPopup}
      </div>
      {bottomBar}
      {toaster}
      <UserSettingsOverlayShell />
      <GlobalPostComposer />
    </div>
  );
}
