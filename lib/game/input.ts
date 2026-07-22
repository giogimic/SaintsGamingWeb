/**
 * Input Manager — handles keyboard and gamepad input
 */
import { Direction } from "./store";

export type InputAction =
  | "move_up"
  | "move_down"
  | "move_left"
  | "move_right"
  | "interact"
  | "cancel"
  | "menu"
  | "sprint";

interface InputState {
  keys: Set<string>;
  actions: Set<InputAction>;
  justPressed: Set<InputAction>;
  previousActions: Set<InputAction>;
}

class InputManager {
  private state: InputState = {
    keys: new Set(),
    actions: new Set(),
    justPressed: new Set(),
    previousActions: new Set(),
  };

  private keyMap: Record<string, InputAction> = {
    ArrowUp: "move_up",
    ArrowDown: "move_down",
    ArrowLeft: "move_left",
    ArrowRight: "move_right",
    w: "move_up",
    s: "move_down",
    a: "move_left",
    d: "move_right",
    W: "move_up",
    S: "move_down",
    A: "move_left",
    D: "move_right",
    z: "interact",
    Enter: "interact",
    x: "cancel",
    Escape: "menu",
    Shift: "sprint",
  };

  constructor() {
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleKeyUp = this.handleKeyUp.bind(this);
  }

  attach() {
    window.addEventListener("keydown", this.handleKeyDown);
    window.addEventListener("keyup", this.handleKeyUp);
  }

  detach() {
    window.removeEventListener("keydown", this.handleKeyDown);
    window.removeEventListener("keyup", this.handleKeyUp);
  }

  private handleKeyDown(e: KeyboardEvent) {
    const action = this.keyMap[e.key];
    if (action) {
      e.preventDefault();
      this.state.keys.add(e.key);
      this.state.actions.add(action);
    }
  }

  private handleKeyUp(e: KeyboardEvent) {
    const action = this.keyMap[e.key];
    if (action) {
      this.state.keys.delete(e.key);
      this.state.actions.delete(action);
    }
  }

  /**
   * Update input state — call once per frame
   */
  update() {
    // Calculate justPressed (actions that were not in previous frame)
    this.state.justPressed.clear();
    for (const action of this.state.actions) {
      if (!this.state.previousActions.has(action)) {
        this.state.justPressed.add(action);
      }
    }
    // Store current actions for next frame comparison
    this.state.previousActions = new Set(this.state.actions);
  }

  /**
   * Check if action is currently held down
   */
  isHeld(action: InputAction): boolean {
    return this.state.actions.has(action);
  }

  /**
   * Check if action was just pressed this frame
   */
  isJustPressed(action: InputAction): boolean {
    return this.state.justPressed.has(action);
  }

  /**
   * Get current movement direction (if any)
   */
  getDirection(): Direction | null {
    if (this.isHeld("move_up")) return "up";
    if (this.isHeld("move_down")) return "down";
    if (this.isHeld("move_left")) return "left";
    if (this.isHeld("move_right")) return "right";
    return null;
  }

  /**
   * Check if sprint is held
   */
  isSprinting(): boolean {
    return this.isHeld("sprint");
  }
}

export const inputManager = new InputManager();