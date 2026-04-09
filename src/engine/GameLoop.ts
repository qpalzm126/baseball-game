export type UpdateFn = (dt: number, time: number) => void;
export type RenderFn = () => void;

const BG_INTERVAL_MS = 33; // ~30 fps fallback when tab is hidden

export class GameLoop {
  private animationFrameId: number | null = null;
  private bgIntervalId: ReturnType<typeof setInterval> | null = null;
  private lastTime = 0;
  private updateFn: UpdateFn;
  private renderFn: RenderFn;
  private running = false;
  private _backgroundMode = false;

  constructor(updateFn: UpdateFn, renderFn: RenderFn) {
    this.updateFn = updateFn;
    this.renderFn = renderFn;
  }

  /**
   * When enabled, the loop falls back to setInterval while the tab is hidden
   * so that PvP game state keeps advancing even when unfocused.
   */
  setBackgroundMode(enabled: boolean) {
    if (this._backgroundMode === enabled) return;
    this._backgroundMode = enabled;

    if (enabled) {
      document.addEventListener('visibilitychange', this.onVisibilityChange);
    } else {
      document.removeEventListener('visibilitychange', this.onVisibilityChange);
      this.stopBgInterval();
    }
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();

    if (this._backgroundMode && document.hidden) {
      this.startBgInterval();
    } else {
      this.loop(this.lastTime);
    }
  }

  stop() {
    this.running = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.stopBgInterval();
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
  }

  private onVisibilityChange = () => {
    if (!this.running || !this._backgroundMode) return;

    if (document.hidden) {
      if (this.animationFrameId !== null) {
        cancelAnimationFrame(this.animationFrameId);
        this.animationFrameId = null;
      }
      this.startBgInterval();
    } else {
      this.stopBgInterval();
      this.lastTime = performance.now();
      this.animationFrameId = requestAnimationFrame(this.loop);
    }
  };

  private startBgInterval() {
    if (this.bgIntervalId !== null) return;
    this.lastTime = performance.now();
    this.bgIntervalId = setInterval(() => {
      if (!this.running) return;
      const now = performance.now();
      const dt = Math.min((now - this.lastTime) / 1000, 0.05);
      this.lastTime = now;
      this.updateFn(dt, now);
    }, BG_INTERVAL_MS);
  }

  private stopBgInterval() {
    if (this.bgIntervalId !== null) {
      clearInterval(this.bgIntervalId);
      this.bgIntervalId = null;
    }
  }

  private loop = (time: number) => {
    if (!this.running) return;
    const dt = Math.min((time - this.lastTime) / 1000, 0.05);
    this.lastTime = time;

    this.updateFn(dt, time);
    this.renderFn();

    this.animationFrameId = requestAnimationFrame(this.loop);
  };
}
