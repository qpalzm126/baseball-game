export type UpdateFn = (dt: number, time: number) => void;
export type RenderFn = () => void;

export class GameLoop {
  private animationFrameId: number | null = null;
  private lastTime = 0;
  private updateFn: UpdateFn;
  private renderFn: RenderFn;
  private running = false;

  constructor(updateFn: UpdateFn, renderFn: RenderFn) {
    this.updateFn = updateFn;
    this.renderFn = renderFn;
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    this.loop(this.lastTime);
  }

  stop() {
    this.running = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
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
