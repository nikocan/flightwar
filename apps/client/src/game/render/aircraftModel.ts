import * as THREE from 'three';
import type { AircraftModelParams } from '@sfe/shared';
import { glowTexture } from './textures';

/**
 * Procedural aircraft builder. Every aircraft is assembled from parametric parts so the game
 * has distinct, original 3D models without external assets. Orientation: nose → -Z, up → +Y.
 */

type P2 = [number, number];

interface ShapeSpec {
  length: number;
  radius: number;
  wing: P2[];
  wingY: number;
  canard: P2[] | null;
  fins: { points: P2[]; x: number; tilt: number }[];
  engines: number[];
  engineRadius: number;
  ring?: boolean;
  /** Optional wing-mounted engine pods at ±x. */
  pods?: number;
}

const SHAPES: Record<AircraftModelParams['shape'], ShapeSpec> = {
  falcon: {
    length: 1, radius: 0.62,
    wing: [[0.5, -0.4], [3.6, 1.2], [3.6, 1.75], [0.5, 2.0]], wingY: -0.05,
    canard: [[0.4, -1.9], [1.25, -1.35], [1.25, -1.05], [0.4, -1.0]],
    fins: [{ points: [[1.2, 0], [2.45, 1.35], [2.8, 1.35], [2.65, 0]], x: 0.5, tilt: 0.3 }],
    engines: [-0.62, -0.21, 0.21, 0.62], engineRadius: 0.24, pods: 2.1,
  },
  delta: {
    length: 1.05, radius: 0.66,
    wing: [[0.5, -1.6], [3.9, 1.9], [3.9, 2.2], [0.5, 2.2]], wingY: -0.1,
    canard: null,
    fins: [{ points: [[0.9, 0], [2.3, 1.6], [2.7, 1.6], [2.6, 0]], x: 0, tilt: 0 }],
    engines: [0], engineRadius: 0.42,
  },
  stealth: {
    length: 0.95, radius: 0.5,
    wing: [[0.4, -2.0], [4.2, 1.5], [3.2, 1.9], [2.2, 1.3], [1.2, 2.1], [0.4, 1.6]], wingY: 0,
    canard: null,
    fins: [{ points: [[1.0, 0], [1.9, 0.7], [2.3, 0.7], [2.2, 0]], x: 0.7, tilt: 0.7 }],
    engines: [-0.4, 0.4], engineRadius: 0.22,
  },
  heavy: {
    length: 1.15, radius: 0.85,
    wing: [[0.7, -0.2], [4.2, 0.9], [4.2, 1.8], [0.7, 2.2]], wingY: 0.15,
    canard: [[0.6, -2.0], [1.6, -1.6], [1.6, -1.2], [0.6, -1.1]],
    fins: [{ points: [[1.3, 0], [2.4, 1.5], [2.9, 1.5], [2.9, 0]], x: 0.7, tilt: 0.12 }],
    engines: [-0.5, 0.5], engineRadius: 0.36,
  },
  needle: {
    length: 1.25, radius: 0.48,
    wing: [[0.4, 0.2], [2.6, 1.7], [2.6, 2.0], [0.4, 2.1]], wingY: 0,
    canard: [[0.3, -2.5], [1.0, -2.1], [1.0, -1.9], [0.3, -1.8]],
    fins: [{ points: [[1.6, 0], [2.6, 1.0], [2.9, 1.0], [2.9, 0]], x: 0.3, tilt: 0.45 }],
    engines: [0], engineRadius: 0.34,
  },
  fortress: {
    length: 1.2, radius: 0.95,
    wing: [[0.8, -0.6], [4.4, 0.4], [4.6, 1.9], [0.8, 2.3]], wingY: 0.1,
    canard: null,
    fins: [{ points: [[1.0, 0], [2.0, 1.6], [2.8, 1.6], [2.8, 0]], x: 0.9, tilt: 0.05 }],
    engines: [-0.62, 0, 0.62], engineRadius: 0.34,
  },
  forward: {
    length: 1.05, radius: 0.6,
    wing: [[0.5, 0.9], [3.6, -0.3], [3.6, 0.2], [0.5, 2.0]], wingY: 0,
    canard: [[0.4, -2.0], [1.3, -1.5], [1.3, -1.25], [0.4, -1.2]],
    fins: [{ points: [[1.3, 0], [2.4, 1.3], [2.8, 1.3], [2.7, 0]], x: 0.45, tilt: 0.3 }],
    engines: [-0.34, 0.34], engineRadius: 0.27,
  },
  halo: {
    length: 1.1, radius: 0.7,
    wing: [[0.5, -1.2], [3.4, 0.8], [3.0, 1.9], [0.5, 1.8]], wingY: 0,
    canard: null,
    fins: [{ points: [[1.2, 0], [2.3, 1.2], [2.7, 1.2], [2.6, 0]], x: 0.5, tilt: 0.5 }],
    engines: [-0.4, 0.4], engineRadius: 0.3, ring: true,
  },
};

function flatPartGeometry(points: P2[], thickness: number): THREE.BufferGeometry {
  const shape = new THREE.Shape(points.map(([x, z]) => new THREE.Vector2(x, z)));
  const geo = new THREE.ExtrudeGeometry(shape, { depth: thickness, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 1 });
  geo.rotateX(Math.PI / 2); // shape Y → world Z, extrusion → -Y
  geo.translate(0, thickness / 2, 0);
  return geo;
}

function finGeometry(points: P2[], thickness: number): THREE.BufferGeometry {
  const shape = new THREE.Shape(points.map(([z, y]) => new THREE.Vector2(z, y)));
  const geo = new THREE.ExtrudeGeometry(shape, { depth: thickness, bevelEnabled: false });
  geo.rotateY(-Math.PI / 2); // shape X → world Z
  geo.translate(thickness / 2, 0, 0);
  return geo;
}

export interface AircraftModel {
  group: THREE.Group;
  /** Local positions of engine exhausts (for flames and trails). */
  engines: THREE.Vector3[];
  flames: THREE.Mesh[];
  glows: THREE.Sprite[];
  dispose: () => void;
}

export function buildAircraft(params: AircraftModelParams, opts: { glow?: boolean } = {}): AircraftModel {
  const spec = SHAPES[params.shape];
  const group = new THREE.Group();
  const geos: THREE.BufferGeometry[] = [];
  const mats: THREE.Material[] = [];
  const track = <T extends THREE.BufferGeometry>(g: T) => (geos.push(g), g);
  const trackM = <T extends THREE.Material>(m: T) => (mats.push(m), m);

  const body = trackM(new THREE.MeshStandardMaterial({ color: params.primary, metalness: 0.55, roughness: 0.32 }));
  const trim = trackM(new THREE.MeshStandardMaterial({ color: params.secondary, metalness: 0.5, roughness: 0.4 }));
  const accent = trackM(new THREE.MeshStandardMaterial({ color: params.accent, emissive: params.accent, emissiveIntensity: 1.6, toneMapped: false }));
  const glass = trackM(new THREE.MeshStandardMaterial({ color: '#0b1d3a', metalness: 0.9, roughness: 0.08, emissive: '#1a4a8a', emissiveIntensity: 0.35 }));
  const dark = trackM(new THREE.MeshStandardMaterial({ color: '#1b1f2a', metalness: 0.7, roughness: 0.5 }));

  // Fuselage (lathe profile, then aligned to -Z).
  const L = spec.length;
  const R = spec.radius;
  const profile = [
    [0, 3.4], [0.2 * R / 0.62, 2.9], [0.45 * R / 0.62, 2.0], [0.6 * R / 0.62, 0.8], [R, -0.6], [0.9 * R, -1.8], [0.8 * R, -2.6], [0, -2.75],
  ].map(([r, y]) => new THREE.Vector2(r, y * L));
  const fuselageGeo = track(new THREE.LatheGeometry(profile, 18));
  fuselageGeo.rotateX(-Math.PI / 2);
  const fuselage = new THREE.Mesh(fuselageGeo, body);
  fuselage.scale.set(1, 0.78, 1);
  group.add(fuselage);

  // Dorsal stripe.
  const stripe = new THREE.Mesh(track(new THREE.BoxGeometry(0.12, 0.05, 3.2 * L)), accent);
  stripe.position.set(0, R * 0.78 - 0.02, 0.2);
  group.add(stripe);

  // Canopy.
  const canopy = new THREE.Mesh(track(new THREE.SphereGeometry(1, 16, 12)), glass);
  canopy.scale.set(0.36 * (R / 0.62), 0.3, 1.0 * L);
  canopy.position.set(0, R * 0.62, -1.15 * L);
  group.add(canopy);

  // Wings (mirrored).
  for (const side of [1, -1]) {
    const wingGeo = track(flatPartGeometry(spec.wing.map(([x, z]) => [x * side, z] as P2), 0.12));
    const wing = new THREE.Mesh(wingGeo, side > 0 ? body : body);
    wing.position.y = spec.wingY;
    group.add(wing);

    // Trim panel on the wing.
    const tip = spec.wing[1];
    const trimGeo = track(new THREE.BoxGeometry(0.9, 0.06, 0.5));
    const trimMesh = new THREE.Mesh(trimGeo, trim);
    trimMesh.position.set(tip[0] * 0.6 * side, spec.wingY + 0.08, (tip[1] + spec.wing[2][1]) * 0.5);
    group.add(trimMesh);

    // Wingtip light.
    const light = new THREE.Mesh(track(new THREE.SphereGeometry(0.09, 8, 6)), accent);
    light.position.set(tip[0] * side, spec.wingY, tip[1] + 0.2);
    group.add(light);

    if (spec.canard) {
      const c = new THREE.Mesh(track(flatPartGeometry(spec.canard.map(([x, z]) => [x * side, z * L] as P2), 0.07)), trim);
      c.position.y = 0.05;
      group.add(c);
    }
  }

  // Tail fins.
  for (const fin of spec.fins) {
    const sides = fin.x === 0 ? [0] : [1, -1];
    for (const side of sides) {
      const f = new THREE.Mesh(track(finGeometry(fin.points.map(([z, y]) => [z * L, y] as P2), 0.08)), trim);
      f.position.set(fin.x * side, R * 0.35, 0);
      f.rotation.z = -fin.tilt * side;
      group.add(f);
    }
  }

  // Engines.
  const engines: THREE.Vector3[] = [];
  const flames: THREE.Mesh[] = [];
  const glows: THREE.Sprite[] = [];
  const nozzleGeo = track(new THREE.CylinderGeometry(spec.engineRadius, spec.engineRadius * 1.15, 1.0, 14, 1, true));
  nozzleGeo.rotateX(Math.PI / 2);
  const nozzleMat = trackM(new THREE.MeshStandardMaterial({ color: '#30353f', metalness: 0.85, roughness: 0.35, side: THREE.DoubleSide }));
  const flameGeo = track(new THREE.ConeGeometry(spec.engineRadius * 0.85, 2.2, 12, 1, true));
  flameGeo.rotateX(-Math.PI / 2);
  flameGeo.translate(0, 0, 1.1);
  const flameMat = trackM(new THREE.MeshBasicMaterial({
    color: params.engine, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
  }));
  const coreMat = trackM(new THREE.MeshBasicMaterial({ color: '#ffffff', toneMapped: false }));
  const glowMat = trackM(new THREE.SpriteMaterial({
    map: glowTexture(), color: params.engine, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, toneMapped: false,
  }));
  const tailZ = 2.55 * L;
  for (const x of spec.engines) {
    const nozzle = new THREE.Mesh(nozzleGeo, nozzleMat);
    nozzle.position.set(x, 0, tailZ);
    group.add(nozzle);
    const core = new THREE.Mesh(track(new THREE.CircleGeometry(spec.engineRadius * 0.85, 14)), coreMat);
    core.position.set(x, 0, tailZ + 0.45);
    group.add(core);
    const flame = new THREE.Mesh(flameGeo, flameMat);
    flame.position.set(x, 0, tailZ + 0.45);
    group.add(flame);
    flames.push(flame);
    if (opts.glow !== false) {
      const glow = new THREE.Sprite(glowMat);
      glow.position.set(x, 0, tailZ + 0.7);
      glow.scale.setScalar(spec.engineRadius * 7);
      group.add(glow);
      glows.push(glow);
    }
    engines.push(new THREE.Vector3(x, 0, tailZ + 0.8));
  }

  if (spec.pods) {
    const podGeo = track(new THREE.CylinderGeometry(0.3, 0.26, 2.4, 12));
    podGeo.rotateX(Math.PI / 2);
    for (const side of [1, -1]) {
      const x = spec.pods * side;
      const pod = new THREE.Mesh(podGeo, trim);
      pod.position.set(x, spec.wingY - 0.15, 1.3);
      group.add(pod);
      const tip = new THREE.Mesh(track(new THREE.ConeGeometry(0.3, 0.7, 12)), body);
      tip.rotation.x = -Math.PI / 2;
      tip.position.set(x, spec.wingY - 0.15, -0.25);
      group.add(tip);
      const flame = new THREE.Mesh(flameGeo, flameMat);
      flame.position.set(x, spec.wingY - 0.15, 2.5);
      flame.scale.setScalar(0.9);
      group.add(flame);
      flames.push(flame);
      const lamp = new THREE.Mesh(track(new THREE.SphereGeometry(0.12, 8, 6)), accent);
      lamp.position.set(x, spec.wingY + 0.12, 0.2);
      group.add(lamp);
      engines.push(new THREE.Vector3(x, spec.wingY - 0.15, 2.9));
    }
  }

  if (spec.ring) {
    const ring = new THREE.Mesh(track(new THREE.TorusGeometry(2.2, 0.08, 8, 48)), accent);
    ring.rotation.x = Math.PI / 2;
    ring.position.z = 0.8;
    group.add(ring);
  }

  // Belly detail.
  const belly = new THREE.Mesh(track(new THREE.BoxGeometry(0.5, 0.18, 2.4 * L)), dark);
  belly.position.set(0, -R * 0.62, 0.4);
  group.add(belly);

  group.scale.setScalar(params.scale);

  return {
    group,
    engines,
    flames,
    glows,
    dispose: () => {
      geos.forEach((g) => g.dispose());
      mats.forEach((m) => m.dispose());
    },
  };
}
