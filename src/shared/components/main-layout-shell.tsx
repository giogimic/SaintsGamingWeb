'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { AmbientBackground } from '@/shared/components/ambient-background';

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

  // Studio route: absolute full-bleed with persistent navbar and bottomBar
  if (isStudio) {
    return (
      <div className="fixed inset-0 w-screen h-screen overflow-hidden selection:bg-primary/30 z-[100] bg-[#0a0a0f]">
        {navbar}
        <main className="w-full h-full overflow-hidden">
          {children}
        </main>
        {commandPalette}
        {bottomBar}
        {toaster}
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
        {commandPalette}
        {messengerPopup}
        {bottomBar}
        {toaster}
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
      {commandPalette}
      {messengerPopup}
      {bottomBar}
      {toaster}
    </div>
  );
}
