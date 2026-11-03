/** Collision primitives. Fast projectiles use swept tests so they never tunnel through targets. */

export function spheresOverlap(
  ax: number, ay: number, az: number, ar: number,
  bx: number, by: number, bz: number, br: number,
): boolean {
  const dx = ax - bx;
  const dy = ay - by;
  const dz = az - bz;
  const r = ar + br;
  return dx * dx + dy * dy + dz * dz <= r * r;
}

/**
 * Does the segment P0->P1 (a moving sphere of radius `pr`) touch the sphere (C, cr)?
 * Returns the parametric time of first contact in [0,1], or -1 for no hit.
 */
export function segmentSphereHit(
  p0x: number, p0y: number, p0z: number,
  p1x: number, p1y: number, p1z: number,
  pr: number,
  cx: number, cy: number, cz: number, cr: number,
): number {
  const dx = p1x - p0x;
  const dy = p1y - p0y;
  const dz = p1z - p0z;
  const fx = p0x - cx;
  const fy = p0y - cy;
  const fz = p0z - cz;
  const r = pr + cr;
  const c = fx * fx + fy * fy + fz * fz - r * r;
  if (c <= 0) return 0; // already overlapping at segment start
  const a = dx * dx + dy * dy + dz * dz;
  if (a < 1e-12) return -1;
  const b = 2 * (fx * dx + fy * dy + fz * dz);
  const disc = b * b - 4 * a * c;
  if (disc < 0) return -1;
  const t = (-b - Math.sqrt(disc)) / (2 * a);
  return t >= 0 && t <= 1 ? t : -1;
}
