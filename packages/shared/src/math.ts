/** Small allocation-free math helpers used by the simulation. */

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export const vec3 = (x = 0, y = 0, z = 0): Vec3 => ({ x, y, z });

export const clamp = (v: number, min: number, max: number): number =>
  v < min ? min : v > max ? max : v;

export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

/** Exponential approach that is frame-rate independent. */
export const approach = (current: number, target: number, rate: number, dt: number): number =>
  target + (current - target) * Math.exp(-rate * dt);

export const length3 = (x: number, y: number, z: number): number => Math.sqrt(x * x + y * y + z * z);

export const distSq = (a: Vec3, b: Vec3): number => {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return dx * dx + dy * dy + dz * dz;
};

/** Normalizes (x,y,z) into `out`. Returns `out`. Zero vectors become (0,0,-1). */
export const normalizeInto = (out: Vec3, x: number, y: number, z: number): Vec3 => {
  const len = Math.sqrt(x * x + y * y + z * z);
  if (len < 1e-9) {
    out.x = 0;
    out.y = 0;
    out.z = -1;
    return out;
  }
  out.x = x / len;
  out.y = y / len;
  out.z = z / len;
  return out;
};

export const degToRad = (d: number): number => (d * Math.PI) / 180;
