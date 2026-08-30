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

  // Studio route: absolute full-bleed without outer padding, margin, or transform containing blocks
  if (isStudio) {
    return (
      <div className="fixed inset-0 w-screen h-screen overflow-hidden selection:bg-primary/30 z-[100] bg-[#0a0a0f]">
        <main className="w-full h-full overflow-hidden">
          {children}
        </main>
        {commandPalette}
        {toaster}
      </div>
    );
  }

  // Lobby MMO route: full-bleed viewport without transform containing blocks
  if (isLobby) {
    return (
      <div className="flex flex-col min-h-screen relative overflow-x-hidden selection:bg-primary/30">
        <AmbientBackground />
        {navbar}
        <main className="flex-1 w-full h-full overflow-hidden">
          {children}
        </main>
        {commandPalette}
        {messengerPopup}
        {bottomBar}
        {toaster}
      </div>
    );
  }

  // Standard website pages: full page layout with animated page enter and global navigation
  return (
    <div className="flex flex-col min-h-screen relative overflow-x-hidden selection:bg-primary/30 pb-10">
      <AmbientBackground />
      {navbar}
      <main className="flex-1 sg-page-enter z-10 pt-14 sm:pt-16 pb-12">
        {children}
      </main>
      {commandPalette}
      {messengerPopup}
      {bottomBar}
      {toaster}
    </div>
  );
}
