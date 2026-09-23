import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface StudioSettings {
  audio: {
    muted: boolean;
    volume: number;
  };
  guides: {
    showGrid: boolean;
    gridOpacity: number;
    showSkirt: boolean;
    showSpawns: boolean;
  };
  camera: {
    fov: number;
    panSensitivity: number;
    orbitSensitivity: number;
  };
}

export interface StudioSettingsStore {
  settings: StudioSettings;
  updateSettings: (updates: Partial<StudioSettings>) => void;
  updateAudio: (updates: Partial<StudioSettings['audio']>) => void;
  updateGuides: (updates: Partial<StudioSettings['guides']>) => void;
  updateCamera: (updates: Partial<StudioSettings['camera']>) => void;
}

const DEFAULT_SETTINGS: StudioSettings = {
  audio: {
    muted: false,
    volume: 80,
  },
  guides: {
    showGrid: true,
    gridOpacity: 30,
    showSkirt: true,
    showSpawns: true,
  },
  camera: {
    fov: 45,
    panSensitivity: 100,
    orbitSensitivity: 100,
  },
};

export const useStudioSettingsStore = create<StudioSettingsStore>()(
  persist(
    (set) => ({
      settings: DEFAULT_SETTINGS,
      updateSettings: (updates) =>
        set((state) => ({
          settings: { ...state.settings, ...updates },
        })),
      updateAudio: (updates) =>
        set((state) => ({
          settings: {
            ...state.settings,
            audio: { ...state.settings.audio, ...updates },
          },
        })),
      updateGuides: (updates) =>
        set((state) => ({
          settings: {
            ...state.settings,
            guides: { ...state.settings.guides, ...updates },
          },
        })),
      updateCamera: (updates) =>
        set((state) => ({
          settings: {
            ...state.settings,
            camera: { ...state.settings.camera, ...updates },
          },
        })),
    }),
    {
      name: 'saints_studio_settings',
    }
  )
);
