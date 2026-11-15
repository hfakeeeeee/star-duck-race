// Render time advances with the monotonic animation clock. Server clock corrections
// are slewed gradually instead of resetting the animation at each React/poll update.
export class MotionClock {
  private value = 0;
  private rate = 0;
  private error = 0;
  private at = 0;
  private key = "";
  private initialized = false;
  sample(position: number, rate: number, now: number, key: string) {
    const value = this.read(now);
    if (!this.initialized || rate !== this.rate || key !== this.key) {
      this.value = position; this.error = 0; this.at = now; this.initialized = true;
    } else if (rate === 0) { this.value = position; this.error = 0; }
    else this.error = position - value;
    this.rate = rate; this.key = key;
    return this.value;
  }
  read(now: number) {
    if (!this.initialized) return this.value;
    const dt = Math.max(0, (now - this.at) / 1000);
    const limit = dt * Math.min(.15, this.rate * .25);
    const correction = Math.max(-limit, Math.min(limit, this.error * (1 - Math.exp(-dt / .4))));
    this.value += dt * this.rate + correction; this.error -= correction; this.at = now;
    return this.value;
  }
}
export const dampFactor = (dt: number, response = 7) => 1 - Math.exp(-Math.max(0, dt) * response);
