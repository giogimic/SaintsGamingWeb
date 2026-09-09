import React from 'react';
import { useToastStore } from '../state/useToastStore';

export function ToastOverlay() {
  const toasts = useToastStore((s: any) => s.toasts);
  const removeToast = useToastStore((s: any) => s.removeToast);

  return (
    <div className="absolute top-20 right-4 flex flex-col gap-2 z-[9999] pointer-events-none">
      {toasts.map((t: any) => (
        <div 
          key={t.id} 
          className="bg-black/80 border border-white/20 text-white px-4 py-2 rounded-lg shadow-lg backdrop-blur-sm pointer-events-auto cursor-pointer animate-in fade-in slide-in-from-right-4"
          onClick={() => removeToast(t.id)}
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}
