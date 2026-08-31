"use client";

import { create } from "zustand";

export type UserSettingsTab = "account" | "posts" | "appearance" | "gaming" | "security";

interface UserSettingsState {
  isOpen: boolean;
  activeTab: UserSettingsTab;
  isMinimized: boolean;
  isMaximized: boolean;
  openSettings: (tab?: UserSettingsTab) => void;
  closeSettings: () => void;
  toggleSettings: (tab?: UserSettingsTab) => void;
  setActiveTab: (tab: UserSettingsTab) => void;
  setMinimized: (minimized: boolean) => void;
  setMaximized: (maximized: boolean) => void;
}

export const useUserSettingsStore = create<UserSettingsState>((set) => ({
  isOpen: false,
  activeTab: "account",
  isMinimized: false,
  isMaximized: false,
  openSettings: (tab) => set((state) => ({ 
    isOpen: true, 
    isMinimized: false, 
    activeTab: tab || state.activeTab 
  })),
  closeSettings: () => set({ isOpen: false, isMinimized: false }),
  toggleSettings: (tab) => set((state) => ({ 
    isOpen: !state.isOpen, 
    isMinimized: false,
    activeTab: tab || state.activeTab 
  })),
  setActiveTab: (tab) => set({ activeTab: tab }),
  setMinimized: (minimized) => set({ isMinimized: minimized }),
  setMaximized: (maximized) => set({ isMaximized: maximized }),
}));
