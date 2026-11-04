import * as THREE from 'three';
import type { AircraftModelParams } from '@sfe/shared';
import { glowTexture } from './textures';
import { PALETTE, addOutline, glossMat, glowMat, roundedBody, smoothOutline, softPlate, toonMat } from './toon';

/**
 * Stylised cartoon aircraft builder (smooth lathe bodies, bevelled curved wings, toon shading,
 * glossy canopy, inverted-hull outlines). Orientation: nose → -Z, up → +Y.
 * A GLB from the asset manifest replaces this automatically when supplied.
 */

type P2 = [number, number];

interface Variant {
  length: number;
  radius: number;
  span: number;
  sweep: number;
  engines: number[];
  canards: boolean;
  twinTail: boolean;
  ring?: boolean;
}

const VARIANTS: Record<AircraftModelParams['shape'], Variant> = {
  falcon: { length: 7.4, radius: 0.95, span: 4.7, sweep: 1.5, engines: [-0.62, 0, 0.62], canards: true, twinTail: true },
  delta: { length: 7.2, radius: 1.0, span: 4.3, sweep: 2.6, engines: [-0.45, 0.45], canards: false, twinTail: false },
  stealth: { length: 6.8, radius: 0.85, span: 5.0, sweep: 2.4, engines: [-0.5, 0.5], canards: false, twinTail: true },
  heavy: { length: 8.0, radius: 1.2, span: 5.0, sweep: 1.0, engines: [-0.75, 0, 0.75], canards: true, twinTail: true },
  needle: { length: 8.4, radius: 0.8, span: 3.6, sweep: 1.8, engines: [0], canards: true, twinTail: false },
  fortress: { length: 8.2, radius: 1.3, span: 5.4, sweep: 0.8, engines: [-0.85, 0, 0.85], canards: false, twinTail: true },
  forward: { length: 7.4, radius: 0.95, span: 4.5, sweep: -0.8, engines: [-0.5, 0.5], canards: true, twinTail: true },
  halo: { length: 7.6, radius: 1.0, span: 4.4, sweep: 1.6, engines: [-0.55, 0.55], canards: false, twinTail: true, ring: true },
};

export interface AircraftModel {
  group: THREE.Group;
  /** Local positions of engine exhausts (for flames and trails). */
  engines: THREE.Vector3[];
  flames: THREE.Mesh[];
  glows: THREE.Sprite[];
  /** Advances GLB animation clips (if any). */
  update?: (dt: number) => void;
  /** Flat 2.5D card: keep it facing the camera, only a gentle screen-space tilt when banking. */
  billboard?: boolean;
  dispose: () => void;
}

export function buildAircraft(params: AircraftModelParams, opts: { glow?: boolean; outline?: boolean } = {}): AircraftModel {
  const v = VARIANTS[params.shape];
  const group = new THREE.Group();
  const geos: THREE.BufferGeometry[] = [];
  const mats: THREE.Material[] = [];
  const G = <T extends THREE.BufferGeometry>(g: T) => (geos.push(g), g);
  const M = <T extends THREE.Material>(m: T) => (mats.push(m), m);
  const outline = opts.outline !== false;
  const add = (geo: THREE.BufferGeometry, mat: THREE.Material, pos: [number, number, number] = [0, 0, 0], ol = 0.075) => {
    const mesh = new THREE.Mesh(G(geo), mat);
    mesh.position.set(...pos);
    group.add(mesh);
    if (outline && ol > 0) addOutline(mesh, ol);
    return mesh;
  };

  const white = M(toonMat(params.primary, { rim: 0.08 }));
  const accent2 = M(toonMat(params.secondary, { rim: 0.1 }));
  const red = M(toonMat(params.accent, { rim: 0.08 }));
  const dark = M(toonMat(PALETTE.outline, { rim: 0.15 }));
  const canopy = M(glossMat('#59c8ff', '#1d6fd1', 0.35));
  const engineGlow = M(glowMat(params.engine, 2.2));
  const light = M(glowMat(params.accent, 2.4));
  const yellow = M(toonMat(PALETTE.yellow, { rim: 0.08 }));

  const L = v.length;
  const R = v.radius;

  // Fuselage: plump rounded body, slightly flattened.
  const body = add(roundedBody(L, R, 0.42, 0.62), white);
  body.scale.set(1, 0.82, 1);

  // Red nose cap.
  const nose = add(roundedBody(L * 0.3, R * 0.78, 0.85, 0.97), red, [0, -0.02, -L * 0.37]);
  nose.scale.set(1, 0.85, 1);

  // Blue belly / side panels.
  const belly = add(roundedBody(L * 0.6, R * 0.82, 0.6, 0.8), accent2, [0, -R * 0.28, 0.35], 0.06);
  belly.scale.set(1.08, 0.6, 1);

  // Glossy canopy.
  const cockpit = add(new THREE.SphereGeometry(1, 32, 20), canopy, [0, R * 0.55, -L * 0.17], 0.05);
  cockpit.scale.set(R * 0.55, R * 0.48, L * 0.17);
  const frame = add(new THREE.TorusGeometry(1, 0.09, 10, 40), yellow, [0, R * 0.55, -L * 0.17], 0.03);
  frame.rotation.x = Math.PI / 2;
  frame.scale.set(R * 0.58, L * 0.18, 1);
  const shine = new THREE.Mesh(G(new THREE.SphereGeometry(1, 16, 10)), M(new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.55 })));
  shine.scale.set(R * 0.16, R * 0.08, L * 0.07);
  shine.position.set(-R * 0.15, R * 0.98, -L * 0.21);
  group.add(shine);

  // Wings (mirrored): white base, red wingtip band, blue accent stripe, weapon pod.
  const span = v.span;
  const sw = v.sweep;
  for (const s of [1, -1]) {
    const wingPts = smoothOutline([[0.6 * s, -0.8], [span * s, sw], [(span + 0.15) * s, sw + 0.75], [0.6 * s, 2.2]] as P2[], 5);
    add(softPlate(wingPts, 0.14, 0.13), white, [0, -0.1, 0.4]);
    const tipPts = smoothOutline([[(span - 1.1) * s, sw * 0.76 - 0.05], [span * s, sw], [(span + 0.15) * s, sw + 0.75], [(span - 1.1) * s, sw + 0.85]] as P2[], 4);
    add(softPlate(tipPts, 0.16, 0.12), red, [0, -0.09, 0.4], 0.05);
    const stripe = smoothOutline([[1.1 * s, -0.05], [(span - 1.4) * s, sw * 0.7], [(span - 1.4) * s, sw * 0.7 + 0.35], [1.1 * s, 0.45]] as P2[], 3);
    add(softPlate(stripe, 0.04, 0.04), accent2, [0, 0.05, 0.4], 0);
    // Wingtip light
    add(new THREE.SphereGeometry(0.16, 14, 10), light, [(span + 0.05) * s, -0.05, sw + 0.7], 0);
    // Under-wing weapon pod
    const pod = add(new THREE.CapsuleGeometry(0.17, 1.2, 6, 14), white, [span * 0.55 * s, -0.36, sw * 0.5 + 0.6], 0.05);
    pod.rotation.x = Math.PI / 2;
    add(new THREE.SphereGeometry(0.17, 12, 10), red, [span * 0.55 * s, -0.36, sw * 0.5 - 0.15], 0);
    // Air intake
    const intake = add(new THREE.CapsuleGeometry(0.34, 0.9, 6, 16), yellow, [(R * 0.85) * s, -0.05, -0.2], 0.06);
    intake.rotation.x = Math.PI / 2;
    intake.scale.set(1, 1.25, 1);
    add(new THREE.CircleGeometry(0.26, 16), dark, [(R * 0.85) * s, -0.05, -0.92], 0).rotation.y = Math.PI;

    if (v.canards) {
      add(softPlate(smoothOutline([[0.5 * s, -2.4], [1.5 * s, -1.75], [1.5 * s, -1.45], [0.5 * s, -1.4]] as P2[], 3), 0.06, 0.07), red, [0, 0.12, 0], 0.05);
    }
  }

  // Tail fins (rounded, red, canted outward).
  const finPts: P2[] = smoothOutline([[0, 0], [0.9, 1.5], [1.35, 1.55], [1.55, 0]] as P2[], 4);
  const finShape = new THREE.Shape(finPts.map(([z, y]) => new THREE.Vector2(z, y)));
  const finGeo = new THREE.ExtrudeGeometry(finShape, { depth: 0.08, bevelEnabled: true, bevelSize: 0.07, bevelThickness: 0.07, bevelSegments: 4, curveSegments: 12 });
  finGeo.rotateY(-Math.PI / 2);
  finGeo.translate(0.04, 0, 0);
  finGeo.computeVertexNormals();
  for (const s of v.twinTail ? [1, -1] : [0]) {
    const fin = add(finGeo, red, [0.48 * s, R * 0.45, L * 0.18]);
    fin.rotation.z = -0.32 * s;
    const tip = new THREE.Mesh(G(new THREE.SphereGeometry(0.22, 12, 8)), accent2);
    tip.position.set(0, 1.5, 1.15);
    tip.scale.set(0.6, 0.5, 1.6);
    fin.add(tip);
  }

  // Engines: rounded blue housings, dark nozzle rings, glowing cores, additive flames.
  const engines: THREE.Vector3[] = [];
  const flames: THREE.Mesh[] = [];
  const glows: THREE.Sprite[] = [];
  const er = 0.36;
  const tailZ = L * 0.44;
  const flameGeo = G(new THREE.ConeGeometry(er * 0.85, 2.6, 16, 1, true));
  flameGeo.rotateX(-Math.PI / 2);
  flameGeo.translate(0, 0, 1.3);
  const flameMat = M(new THREE.MeshBasicMaterial({ color: params.engine, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
  const spriteMat = M(new THREE.SpriteMaterial({ map: glowTexture(), color: params.engine, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.8, toneMapped: false }));
  for (const x of v.engines) {
    const housing = add(new THREE.CapsuleGeometry(er, 1.1, 8, 20), accent2, [x, -0.1, tailZ - 0.4], 0.06);
    housing.rotation.x = Math.PI / 2;
    const ring = add(new THREE.TorusGeometry(er * 0.92, 0.1, 10, 24), dark, [x, -0.1, tailZ + 0.2], 0);
    ring.rotation.y = 0;
    add(new THREE.CircleGeometry(er * 0.82, 24), engineGlow, [x, -0.1, tailZ + 0.22], 0);
    const flame = new THREE.Mesh(flameGeo, flameMat);
    flame.position.set(x, -0.1, tailZ + 0.25);
    group.add(flame);
    flames.push(flame);
    if (opts.glow !== false) {
      const glow = new THREE.Sprite(spriteMat);
      glow.position.set(x, -0.1, tailZ + 0.5);
      glow.scale.setScalar(er * 6);
      group.add(glow);
      glows.push(glow);
    }
    engines.push(new THREE.Vector3(x, -0.1, tailZ + 0.7));
  }

  if (v.ring) {
    const ring = add(new THREE.TorusGeometry(span * 0.55, 0.1, 10, 64), light, [0, 0, 0.8], 0);
    ring.rotation.x = Math.PI / 2;
  }

  group.scale.setScalar(params.scale * 0.82);

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
