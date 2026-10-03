'use client';

import { useEffect, useState } from 'react';
import { KEYBINDS } from '@/client/input/InputConstants';
import { matchesInputBinding } from '@/client/input/gameplayControls';
import { useGameStore } from '../store';

const RESERVED_KEYS = ['Tab', 'KeyC', 'KeyL', 'KeyX', 'KeyG', 'KeyP', 'KeyF', 'KeyM', 'KeyB', 'Enter'];

function bindingLabel(binding: string): string {
  const mouseLabels: Record<string, string> = {
    Mouse0: 'Left Mouse', Mouse1: 'Middle Mouse', Mouse2: 'Right Mouse',
    Mouse3: 'Mouse Button 4', Mouse4: 'Mouse Button 5',
  };
  return mouseLabels[binding] ?? binding.replace(/^Key/, '').replace(/^Digit/, '');
}

export function CursorKeybindControl() {
  const binding = useGameStore((state) => state.clientSettings.controls.keybinds.TOGGLE_CURSOR ?? 'Mouse1');
  const [capturing, setCapturing] = useState(false);
  const [error, setError] = useState('');

  const saveBinding = (key: string) => {
    const game = useGameStore.getState();
    game.patchClientSettings('controls', {
      keybinds: { ...game.clientSettings.controls.keybinds, TOGGLE_CURSOR: key },
    });
    setCapturing(false);
    setError('');
  };

  useEffect(() => {
    if (!capturing) return;
    const capture = (event: KeyboardEvent | PointerEvent) => {
      event.preventDefault();
      event.stopImmediatePropagation();
      if (!('button' in event) && (event.repeat || event.isComposing)) return;
      if (!('button' in event) && event.key === 'Escape') {
        setCapturing(false);
        setError('');
        return;
      }
      if (!('button' in event) && (event.ctrlKey || event.altKey || event.metaKey || event.shiftKey)) {
        setError('Choose a single key without modifiers.');
        return;
      }
      const game = useGameStore.getState();
      const otherBindings = Object.entries(KEYBINDS)
        .filter(([action]) => action !== 'TOGGLE_CURSOR')
        .flatMap(([, keys]) => keys);
      otherBindings.push(...RESERVED_KEYS, ...Object.entries(game.clientSettings.controls.keybinds)
        .filter(([action]) => action !== 'TOGGLE_CURSOR')
        .map(([, key]) => key));
      if (otherBindings.some((key) => key && matchesInputBinding(event, key))) {
        setError('That input already has a gameplay action. Choose another key or mouse button.');
        return;
      }
      const key = 'button' in event ? `Mouse${event.button}` : (event.code || event.key);
      if (!key || key === 'Unidentified' || key === 'Process') return;
      saveBinding(key);
    };
    window.addEventListener('keydown', capture, true);
    window.addEventListener('pointerdown', capture, true);
    return () => {
      window.removeEventListener('keydown', capture, true);
      window.removeEventListener('pointerdown', capture, true);
    };
  }, [capturing]);

  return (
    <div className="p-4 rounded-xl bg-[#0a1628]/60 border border-white/10 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-xs font-bold text-slate-100">Show / Hide Cursor</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Toggle between mouse look and the visible cursor.</div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Change show or hide cursor binding"
            aria-pressed={capturing}
            onClick={() => { setCapturing(true); setError(''); }}
            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-500/20 border border-amber-500/50 text-amber-300 cursor-pointer"
          >
            {capturing ? 'Press a key or mouse button…' : bindingLabel(binding)}
          </button>
          <button
            type="button"
            disabled={capturing}
            onClick={() => saveBinding('Mouse1')}
            className="text-[11px] text-slate-400 hover:text-slate-100 disabled:opacity-50"
          >
            Reset
          </button>
        </div>
      </div>
      {capturing && <p className="text-[11px] text-slate-300">Press Escape to cancel. Middle mouse is the default.</p>}
      {error && <p role="status" className="text-[11px] text-amber-300">{error}</p>}
    </div>
  );
}
