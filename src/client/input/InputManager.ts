/**
 * Input Manager — Pure DOM event listener for keys and mouse.
 * 
 * Tracks the raw state of keyboard and mouse. Zero game logic.
 */
export class InputManager {
  private keys: Record<string, boolean> = {};
  private mousePos: { x: number; y: number } = { x: 0, y: 0 };
  private mouseDown: boolean = false;
  private canvasElement: HTMLCanvasElement | null = null;
  private isListening = false;

  public attach(canvas: HTMLCanvasElement | null = null) {
    if (this.isListening) this.detach();
    this.canvasElement = canvas;

    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('mousemove', this.onMouseMove);
    window.addEventListener('mousedown', this.onMouseDown);
    window.addEventListener('mouseup', this.onMouseUp);
    
    // Prevent context menu on right click in game
    if (this.canvasElement) {
      this.canvasElement.addEventListener('contextmenu', this.onContextMenu);
    }
    this.isListening = true;
  }

  public detach() {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('mousemove', this.onMouseMove);
    window.removeEventListener('mousedown', this.onMouseDown);
    window.removeEventListener('mouseup', this.onMouseUp);

    if (this.canvasElement) {
      this.canvasElement.removeEventListener('contextmenu', this.onContextMenu);
    }
    
    this.keys = {};
    this.mouseDown = false;
    this.canvasElement = null;
    this.isListening = false;
  }

  // --- State Getters ---

  public isKeyPressed(key: string): boolean {
    return !!this.keys[key.toLowerCase()];
  }

  public isAnyKeyPressed(keys: string[]): boolean {
    return keys.some(k => this.isKeyPressed(k));
  }

  public getMousePosition() {
    return this.mousePos;
  }

  public isMousePressed() {
    return this.mouseDown;
  }

  // --- Event Handlers ---

  private onKeyDown = (e: KeyboardEvent) => {
    // Ignore input if focused on an input/textarea (like chat)
    if (
      document.activeElement instanceof HTMLInputElement ||
      document.activeElement instanceof HTMLTextAreaElement
    ) {
      return;
    }
    this.keys[e.key.toLowerCase()] = true;
  };

  private onKeyUp = (e: KeyboardEvent) => {
    this.keys[e.key.toLowerCase()] = false;
  };

  private onMouseMove = (e: MouseEvent) => {
    this.mousePos = { x: e.clientX, y: e.clientY };
  };

  private onMouseDown = (e: MouseEvent) => {
    // 0 = left click, 2 = right click
    if (e.button === 0) this.mouseDown = true; 
  };

  private onMouseUp = (e: MouseEvent) => {
    if (e.button === 0) this.mouseDown = false;
  };

  private onContextMenu = (e: MouseEvent) => {
    e.preventDefault();
  };
}

export const inputManager = new InputManager();
