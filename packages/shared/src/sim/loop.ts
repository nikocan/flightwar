import { SIM_DT } from '../config/balance';

/**
 * Fixed-timestep accumulator. Rendering can run at any frame rate while the simulation
 * always advances in identical SIM_DT increments (deterministic, delta-time independent).
 */
export class FixedStepLoop {
  private accumulator = 0;

  constructor(
    readonly step = SIM_DT,
    /** Prevents the "spiral of death" after tab switches or long stalls. */
    readonly maxStepsPerFrame = 8,
  ) {}

  /**
   * Feeds a variable frame delta. Calls `tick` for every whole fixed step and returns the
   * interpolation alpha (0..1) for rendering between the previous and current state.
   */
  advance(frameDt: number, tick: (dt: number) => void): number {
    this.accumulator += Math.max(0, Math.min(frameDt, 0.25));
    let steps = 0;
    while (this.accumulator >= this.step && steps < this.maxStepsPerFrame) {
      tick(this.step);
      this.accumulator -= this.step;
      steps++;
    }
    if (steps === this.maxStepsPerFrame) this.accumulator = Math.min(this.accumulator, this.step);
    return this.accumulator / this.step;
  }

  reset(): void {
    this.accumulator = 0;
  }
}
