/**
 * Toast Store — Lightweight notification queue.
 *
 * Fully independent of all other stores. Systems and socket handlers
 * call `showToast()` to push messages.
 */
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

export interface ToastMessage {
  id: number;
  message: string;
  timestamp: number;
}

export interface ToastState {
  toasts: ToastMessage[];
  toastHistory: ToastMessage[];

  showToast: (message: string) => void;
  removeToast: (id: number) => void;
  clearToastHistory: () => void;
}

const MAX_VISIBLE = 3;
const MAX_HISTORY = 50;
const TOAST_DURATION_MS = 3000;

export const useToastStore = create<ToastState>()(
  immer((set) => ({
    toasts: [],
    toastHistory: [],

    showToast: (message) => {
      const id = Date.now() + Math.random();
      const timestamp = Date.now();
      set((s) => {
        s.toasts = [...s.toasts, { id, message, timestamp }].slice(-MAX_VISIBLE);
        s.toastHistory = [{ id, message, timestamp }, ...s.toastHistory].slice(0, MAX_HISTORY);
      });
      setTimeout(() => {
        set((s) => {
          s.toasts = s.toasts.filter((t) => t.id !== id);
        });
      }, TOAST_DURATION_MS);
    },

    removeToast: (id) => set((s) => {
      s.toasts = s.toasts.filter((t) => t.id !== id);
    }),

    clearToastHistory: () => set((s) => { s.toastHistory = []; }),
  }))
);
