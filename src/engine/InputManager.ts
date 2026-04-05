import { Vec2 } from '@/game/types';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '@/game/constants';

export interface InputState {
  mousePosition: Vec2;
  mouseVelocity: Vec2;
  leftClick: boolean;
  rightClick: boolean;
  leftClickDown: boolean;
  rightClickDown: boolean;
  keysDown: Set<string>;
  keysPressed: Set<string>;
  enterPressed: boolean;
  shiftDown: boolean;
  arrowDir: Vec2;
}

export class InputManager {
  private state: InputState;
  private prevMouse: Vec2 = { x: 0, y: 0 };
  private element: HTMLElement | null = null;
  private pendingPresses: Set<string> = new Set();
  private pendingLeftClick = false;
  private pendingRightClick = false;
  private pendingEnter = false;

  constructor() {
    this.state = {
      mousePosition: { x: 0, y: 0 },
      mouseVelocity: { x: 0, y: 0 },
      leftClick: false,
      rightClick: false,
      leftClickDown: false,
      rightClickDown: false,
      keysDown: new Set(),
      keysPressed: new Set(),
      enterPressed: false,
      shiftDown: false,
      arrowDir: { x: 0, y: 0 },
    };
  }

  attach(el: HTMLElement) {
    this.element = el;
    el.addEventListener('mousemove', this.onMouseMove);
    el.addEventListener('mousedown', this.onMouseDown);
    el.addEventListener('mouseup', this.onMouseUp);
    el.addEventListener('contextmenu', (e) => e.preventDefault());
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
  }

  detach() {
    if (this.element) {
      this.element.removeEventListener('mousemove', this.onMouseMove);
      this.element.removeEventListener('mousedown', this.onMouseDown);
      this.element.removeEventListener('mouseup', this.onMouseUp);
    }
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
  }

  private onMouseMove = (e: MouseEvent) => {
    if (!this.element) return;
    const rect = this.element.getBoundingClientRect();
    this.state.mousePosition = {
      x: ((e.clientX - rect.left) / rect.width) * CANVAS_WIDTH,
      y: ((e.clientY - rect.top) / rect.height) * CANVAS_HEIGHT,
    };
  };

  private onMouseDown = (e: MouseEvent) => {
    if (e.button === 0) {
      this.state.leftClickDown = true;
      this.pendingLeftClick = true;
    }
    if (e.button === 2) {
      this.state.rightClickDown = true;
      this.pendingRightClick = true;
    }
  };

  private onMouseUp = (e: MouseEvent) => {
    if (e.button === 0) this.state.leftClickDown = false;
    if (e.button === 2) this.state.rightClickDown = false;
  };

  private onKeyDown = (e: KeyboardEvent) => {
    const key = e.key.toLowerCase();
    if (key === 'tab' || key.startsWith('arrow') || key === ' ') e.preventDefault();
    if (!this.state.keysDown.has(key)) {
      this.pendingPresses.add(key);
    }
    this.state.keysDown.add(key);
    if (key === 'enter') this.pendingEnter = true;
    if (key === 'shift') this.state.shiftDown = true;
  };

  private onKeyUp = (e: KeyboardEvent) => {
    const key = e.key.toLowerCase();
    this.state.keysDown.delete(key);
    if (key === 'shift') this.state.shiftDown = false;
  };

  update() {
    this.state.mouseVelocity = {
      x: this.state.mousePosition.x - this.prevMouse.x,
      y: this.state.mousePosition.y - this.prevMouse.y,
    };
    this.prevMouse = { ...this.state.mousePosition };

    this.state.leftClick = this.pendingLeftClick;
    this.state.rightClick = this.pendingRightClick;
    this.state.enterPressed = this.pendingEnter;
    this.state.keysPressed = new Set(this.pendingPresses);

    this.pendingLeftClick = false;
    this.pendingRightClick = false;
    this.pendingEnter = false;
    this.pendingPresses.clear();

    let ax = 0, ay = 0;
    if (this.state.keysDown.has('arrowleft')) ax -= 1;
    if (this.state.keysDown.has('arrowright')) ax += 1;
    if (this.state.keysDown.has('arrowup')) ay -= 1;
    if (this.state.keysDown.has('arrowdown')) ay += 1;
    this.state.arrowDir = { x: ax, y: ay };
  }

  getState(): Readonly<InputState> {
    return this.state;
  }
}
