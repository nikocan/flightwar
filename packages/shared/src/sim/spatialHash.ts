/**
 * Uniform grid over the X/Z plane used as a broad phase for projectile-vs-enemy tests.
 * Items are stored by index into a caller-owned array; the hash is rebuilt every step
 * (cheap for the few dozen enemies we have) and never allocates after warm-up.
 */
export class SpatialHash {
  private readonly cells = new Map<number, number[]>();
  private readonly used: number[][] = [];
  private readonly pool: number[][] = [];
  private readonly queryStamp: Uint32Array;
  private stamp = 1;

  constructor(
    readonly cellSize: number,
    maxItems = 1024,
  ) {
    this.queryStamp = new Uint32Array(maxItems);
  }

  private key(cx: number, cz: number): number {
    // Pack two signed 16-bit cell coordinates into one number key.
    return ((cx + 32768) << 16) | (cz + 32768);
  }

  clear(): void {
    for (const list of this.used) {
      list.length = 0;
      this.pool.push(list);
    }
    this.used.length = 0;
    this.cells.clear();
  }

  /** Inserts item `index` covering a circle of `radius` around (x, z). */
  insert(index: number, x: number, z: number, radius: number): void {
    const s = this.cellSize;
    const minX = Math.floor((x - radius) / s);
    const maxX = Math.floor((x + radius) / s);
    const minZ = Math.floor((z - radius) / s);
    const maxZ = Math.floor((z + radius) / s);
    for (let cx = minX; cx <= maxX; cx++) {
      for (let cz = minZ; cz <= maxZ; cz++) {
        const k = this.key(cx, cz);
        let list = this.cells.get(k);
        if (!list) {
          list = this.pool.pop() ?? [];
          this.cells.set(k, list);
          this.used.push(list);
        }
        list.push(index);
      }
    }
  }

  /**
   * Collects unique item indices whose cells overlap the AABB [minX..maxX] x [minZ..maxZ].
   * Results are written into `out` (cleared first) and returned.
   */
  query(minX: number, minZ: number, maxX: number, maxZ: number, out: number[]): number[] {
    out.length = 0;
    this.stamp = (this.stamp + 1) >>> 0 || 1;
    const s = this.cellSize;
    const x0 = Math.floor(minX / s);
    const x1 = Math.floor(maxX / s);
    const z0 = Math.floor(minZ / s);
    const z1 = Math.floor(maxZ / s);
    for (let cx = x0; cx <= x1; cx++) {
      for (let cz = z0; cz <= z1; cz++) {
        const list = this.cells.get(this.key(cx, cz));
        if (!list) continue;
        for (let i = 0; i < list.length; i++) {
          const idx = list[i];
          if (this.queryStamp[idx] !== this.stamp) {
            this.queryStamp[idx] = this.stamp;
            out.push(idx);
          }
        }
      }
    }
    return out;
  }
}
