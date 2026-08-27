/**
 * Saints Gaming — Master Accessibility, Adaptive Keybinding Matrix & Screen Reader ARIA Engine (Bible 32 & WCAG 2.1)
 * Manages adaptive keybinding remapping, colorblind visual matrix filters, UI font scaling, and screen reader ARIA announcement queues.
 */

export type GameAction =
  | 'MOVE_UP'
  | 'MOVE_DOWN'
  | 'MOVE_LEFT'
  | 'MOVE_RIGHT'
  | 'INTERACT'
  | 'PRIMARY_ATTACK'
  | 'SPECIAL_ABILITY_1'
  | 'SPECIAL_ABILITY_2'
  | 'SPECIAL_ABILITY_3'
  | 'SPECIAL_ABILITY_4'
  | 'TOGGLE_INVENTORY'
  | 'OPEN_MAP'
  | 'OPEN_CHAT';

export type InputDevice = 'KEYBOARD' | 'MOUSE' | 'GAMEPAD';

export interface KeybindingDefinition {
  action: GameAction;
  primaryKey: string;
  secondaryKey?: string;
  device: InputDevice;
}

export type ColorblindMode =
  | 'DEFAULT'
  | 'PROTANOPIA'
  | 'DEUTERANOPIA'
  | 'TRITANOPIA'
  | 'ACHROMATOPSIA'
  | 'HIGH_CONTRAST_DARK'
  | 'HIGH_CONTRAST_LIGHT';

export interface AriaAnnouncement {
  id: string;
  text: string;
  priority: 'POLITE' | 'ASSERTIVE';
  timestamp: number;
}

export interface AccessibilitySettings {
  colorblindMode: ColorblindMode;
  uiScale: number;
  reducedMotion: boolean;
  screenReaderEnabled: boolean;
  highContrastText: boolean;
}

export const DEFAULT_KEYBINDINGS: Record<GameAction, { primary: string; secondary?: string }> = {
  MOVE_UP: { primary: 'KeyW', secondary: 'ArrowUp' },
  MOVE_DOWN: { primary: 'KeyS', secondary: 'ArrowDown' },
  MOVE_LEFT: { primary: 'KeyA', secondary: 'ArrowLeft' },
  MOVE_RIGHT: { primary: 'KeyD', secondary: 'ArrowRight' },
  INTERACT: { primary: 'KeyE' },
  PRIMARY_ATTACK: { primary: 'Space', secondary: 'MouseLeft' },
  SPECIAL_ABILITY_1: { primary: 'Digit1' },
  SPECIAL_ABILITY_2: { primary: 'Digit2' },
  SPECIAL_ABILITY_3: { primary: 'Digit3' },
  SPECIAL_ABILITY_4: { primary: 'Digit4' },
  TOGGLE_INVENTORY: { primary: 'KeyI', secondary: 'KeyB' },
  OPEN_MAP: { primary: 'KeyM' },
  OPEN_CHAT: { primary: 'Enter' },
};

export class AccessibilityEngine {
  private bindings = new Map<GameAction, KeybindingDefinition>();
  private settings: AccessibilitySettings = {
    colorblindMode: 'DEFAULT',
    uiScale: 1.0,
    reducedMotion: false,
    screenReaderEnabled: false,
    highContrastText: false,
  };
  private announcementQueue: AriaAnnouncement[] = [];

  constructor() {
    this.resetDefaultKeybindings();
  }

  /**
   * Resets all keybindings to defaults.
   */
  public resetDefaultKeybindings() {
    this.bindings.clear();
    for (const [action, keys] of Object.entries(DEFAULT_KEYBINDINGS) as [GameAction, { primary: string; secondary?: string }][]) {
      this.bindings.set(action, {
        action,
        primaryKey: keys.primary,
        secondaryKey: keys.secondary,
        device: 'KEYBOARD',
      });
    }
  }

  /**
   * Retrieves binding definition for an action.
   */
  public getBinding(action: GameAction): KeybindingDefinition | null {
    return this.bindings.get(action) || null;
  }

  /**
   * Remaps a key with collision detection and optional auto-swapping.
   */
  public rebindKey(
    action: GameAction,
    newKey: string,
    isSecondary: boolean = false,
    autoSwapConflict: boolean = true
  ): { success: boolean; conflictAction?: GameAction } {
    const currentBinding = this.bindings.get(action);
    if (!currentBinding) return { success: false };

    // Check for conflicts across other actions
    let conflictAction: GameAction | undefined;
    for (const [otherAction, def] of this.bindings.entries()) {
      if (otherAction === action) continue;
      if (def.primaryKey === newKey || def.secondaryKey === newKey) {
        conflictAction = otherAction;
        break;
      }
    }

    if (conflictAction) {
      if (!autoSwapConflict) {
        return { success: false, conflictAction };
      }

      // Auto-swap: give conflicting action the old key
      const conflictDef = this.bindings.get(conflictAction)!;
      const oldKey = isSecondary ? currentBinding.secondaryKey : currentBinding.primaryKey;

      if (conflictDef.primaryKey === newKey) {
        conflictDef.primaryKey = oldKey || '';
      } else if (conflictDef.secondaryKey === newKey) {
        conflictDef.secondaryKey = oldKey;
      }
    }

    if (isSecondary) {
      currentBinding.secondaryKey = newKey;
    } else {
      currentBinding.primaryKey = newKey;
    }

    return { success: true, conflictAction };
  }

  /**
   * Returns standard SVG/CSS color matrix values for colorblind vision deficiencies.
   */
  public getColorMatrix(mode: ColorblindMode): string {
    switch (mode) {
      case 'PROTANOPIA':
        // Red weakness
        return '0.567, 0.433, 0, 0, 0, 0.558, 0.442, 0, 0, 0, 0, 0.242, 0.758, 0, 0, 0, 0, 0, 1, 0';
      case 'DEUTERANOPIA':
        // Green weakness
        return '0.625, 0.375, 0, 0, 0, 0.7, 0.3, 0, 0, 0, 0, 0.3, 0.7, 0, 0, 0, 0, 0, 1, 0';
      case 'TRITANOPIA':
        // Blue weakness
        return '0.95, 0.05, 0, 0, 0, 0, 0.433, 0.567, 0, 0, 0, 0.475, 0.525, 0, 0, 0, 0, 0, 1, 0';
      case 'ACHROMATOPSIA':
        // Monochrome / grayscale
        return '0.299, 0.587, 0.114, 0, 0, 0.299, 0.587, 0.114, 0, 0, 0.299, 0.587, 0.114, 0, 0, 0, 0, 0, 1, 0';
      case 'HIGH_CONTRAST_DARK':
      case 'HIGH_CONTRAST_LIGHT':
      case 'DEFAULT':
      default:
        return '1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0';
    }
  }

  /**
   * Sets UI scale multiplier clamped safely between 1.0x and 2.0x.
   */
  public setUiScale(scale: number): number {
    const clamped = Math.max(1.0, Math.min(2.0, Number(scale.toFixed(2))));
    this.settings.uiScale = clamped;
    return clamped;
  }

  /**
   * Queues an accessible ARIA live region announcement.
   */
  public queueAriaAnnouncement(
    text: string,
    priority: 'POLITE' | 'ASSERTIVE' = 'POLITE'
  ): AriaAnnouncement {
    const announcement: AriaAnnouncement = {
      id: `aria_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      text,
      priority,
      timestamp: Date.now(),
    };
    this.announcementQueue.push(announcement);
    return announcement;
  }

  /**
   * Flushes and clears pending screen reader announcements.
   */
  public flushAriaAnnouncements(): AriaAnnouncement[] {
    const items = [...this.announcementQueue];
    this.announcementQueue = [];
    return items;
  }
}
