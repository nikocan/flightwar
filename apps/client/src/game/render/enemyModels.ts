import * as THREE from 'three';
import type { EnemyDef } from '@sfe/shared';
import { glowTexture } from './textures';
import { PALETTE, addOutline, glossMat, glowMat, roundedBody, smoothOutline, softPlate, toonMat } from './toon';

/** Materials that support the white hit flash. */
export type FlashMaterial = THREE.MeshStandardMaterial | THREE.MeshToonMaterial | THREE.MeshPhysicalMaterial;

/** Cartoon enemy meshes. Enemies face +Z (towards the player). */
export interface EnemyModel {
  group: THREE.Group;
  flashMats: FlashMaterial[];
  baseEmissive: { mat: FlashMaterial; color: THREE.Color; intensity: number }[];
  spinners: { obj: THREE.Object3D; axis: 'x' | 'y' | 'z'; speed: number }[];
  pulse: THREE.Object3D[];
  /** Advances GLB animation clips (if any). */
  update?: (dt: number) => void;
  /** Boss phase art switch (1..3), for sprite bosses. */
  setPhase?: (phase: number) => void;
  /** Hit flash for models without emissive materials (sprite cards). */
  flash?: (amount: number) => void;
  dispose: () => void;
}

type P2 = [number, number];

export function buildEnemy(model: EnemyDef['model'], color: string): EnemyModel {
  const group = new THREE.Group();
  const geos: THREE.BufferGeometry[] = [];
  const mats: THREE.Material[] = [];
  const flashMats: FlashMaterial[] = [];
  const spinners: EnemyModel['spinners'] = [];
  const pulse: THREE.Object3D[] = [];
  const G = <T extends THREE.BufferGeometry>(g: T) => (geos.push(g), g);
  const toon = (c: THREE.ColorRepresentation, rim = 0.3) => {
    const m = toonMat(c, { rim });
    mats.push(m);
    flashMats.push(m);
    return m;
  };
  const gloss = (c: THREE.ColorRepresentation, e: THREE.ColorRepresentation = '#000000') => {
    const m = glossMat(c, e, 0.5);
    mats.push(m);
    flashMats.push(m);
    return m;
  };
  const glow = (c: THREE.ColorRepresentation, i = 2) => {
    const m = glowMat(c, i);
    mats.push(m);
    return m;
  };
  const add = (geo: THREE.BufferGeometry, mat: THREE.Material, pos: [number, number, number] = [0, 0, 0], ol = 0.07, parent: THREE.Object3D = group) => {
    const m = new THREE.Mesh(G(geo), mat);
    m.position.set(...pos);
    parent.add(m);
    if (ol > 0) addOutline(m, ol);
    return m;
  };
  const sprite = (c: string, scale: number, pos: [number, number, number]) => {
    const sm = new THREE.SpriteMaterial({ map: glowTexture(), color: c, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.8, toneMapped: false });
    mats.push(sm);
    const s = new THREE.Sprite(sm);
    s.scale.setScalar(scale);
    s.position.set(...pos);
    group.add(s);
    return s;
  };
  /** Lathe body turned to face +Z. */
  const bodyGeo = (len: number, r: number, nose = 0.5, tail = 0.6) => {
    const g = roundedBody(len, r, nose, tail, 32);
    g.rotateY(Math.PI);
    return g;
  };
  const wings = (pts: P2[], thick: number, mat: THREE.Material, y = 0, z = 0, ol = 0.07) => {
    for (const s of [1, -1]) add(softPlate(smoothOutline(pts.map(([x, zz]) => [x * s, -zz] as P2), 4), thick, 0.12), mat, [0, y, z], ol);
  };

  switch (model) {
    case 'drone': {
      // Scout drone: small round orange body, coral fins, big friendly red "eye".
      const orange = toon(PALETTE.orange);
      const coral = toon(PALETTE.coral);
      const b = add(new THREE.SphereGeometry(1, 28, 20), orange);
      b.scale.set(1.05, 0.85, 1.15);
      add(new THREE.SphereGeometry(0.55, 20, 14), gloss('#ffe3a3', '#ffb347'), [0, 0.55, -0.1], 0.05);
      wings([[0.6, -0.4], [1.9, 0.3], [1.8, 0.75], [0.6, 0.6]], 0.1, coral, -0.1);
      const ring = add(new THREE.TorusGeometry(1.25, 0.1, 10, 32), glow(PALETTE.yellow, 1.8), [0, -0.1, 0], 0);
      ring.rotation.x = Math.PI / 2;
      spinners.push({ obj: ring, axis: 'z', speed: 3 });
      const eye = add(new THREE.SphereGeometry(0.34, 16, 12), glow(PALETTE.red, 2.4), [0, 0.05, 1.0], 0.04);
      pulse.push(eye);
      sprite(PALETTE.orange, 2.4, [0, 0, -1.1]);
      break;
    }
    case 'fighter': {
      // Purple fighter with pink energy weapons.
      const purple = toon(PALETTE.deepPurple);
      const violet = toon(PALETTE.violet);
      const pink = toon(PALETTE.pink);
      add(bodyGeo(4.4, 0.75, 0.45, 0.6), purple);
      add(new THREE.SphereGeometry(1, 20, 14), gloss('#ff6b9a', '#ff2a6d'), [0, 0.42, 0.6], 0.05).scale.set(0.42, 0.34, 0.8);
      wings([[0.5, -0.3], [2.6, 1.2], [2.7, 1.7], [0.5, 1.3]], 0.12, violet, -0.05);
      wings([[2.0, 0.9], [2.6, 1.2], [2.7, 1.7], [2.0, 1.6]], 0.14, pink, -0.04, 0, 0.04);
      for (const s of [1, -1]) {
        const gun = add(new THREE.CapsuleGeometry(0.14, 0.9, 6, 12), pink, [1.2 * s, -0.25, 0.4], 0.04);
        gun.rotation.x = Math.PI / 2;
        add(new THREE.SphereGeometry(0.12, 10, 8), glow(PALETTE.pink, 2.6), [1.2 * s, -0.25, 1.0], 0);
      }
      add(new THREE.CircleGeometry(0.4, 18), glow('#ff6bd6', 2.4), [0, 0, -2.25], 0).rotation.y = Math.PI;
      sprite('#ff6bd6', 2.4, [0, 0, -2.5]);
      break;
    }
    case 'bomber': {
      // Heavy bomber: chubby navy-purple body, wide wings, visible missile launchers.
      const navy = toon('#4b3aa8');
      const lilac = toon(PALETTE.purple);
      const yellow = toon(PALETTE.yellow);
      add(bodyGeo(7.5, 1.7, 0.55, 0.7), navy).scale.set(1, 0.8, 1);
      add(new THREE.SphereGeometry(1, 20, 14), gloss('#9fe3ff', '#2f7bea'), [0, 0.95, 1.4], 0.06).scale.set(0.8, 0.55, 1.2);
      wings([[1.2, -1.6], [5.2, -0.2], [5.3, 1.0], [1.2, 1.6]], 0.3, lilac, 0);
      for (const s of [1, -1]) {
        for (const x of [2.4, 3.6]) {
          const tube = add(new THREE.CapsuleGeometry(0.3, 1.6, 6, 14), yellow, [x * s, -0.55, 0.2], 0.05);
          tube.rotation.x = Math.PI / 2;
          add(new THREE.SphereGeometry(0.3, 12, 8), toon(PALETTE.red), [x * s, -0.55, 1.2], 0.04);
        }
        add(new THREE.SphereGeometry(0.22, 10, 8), glow(PALETTE.yellow, 2.2), [5.1 * s, 0.1, 0.6], 0);
      }
      const eye = add(new THREE.BoxGeometry(1.8, 0.18, 0.2), glow(PALETTE.coral, 2.2), [0, 0.2, 3.65], 0);
      pulse.push(eye);
      sprite(PALETTE.purple, 3, [-1, 0, -3.8]);
      sprite(PALETTE.purple, 3, [1, 0, -3.8]);
      break;
    }
    case 'missileDrone': {
      const yellow = toon(PALETTE.yellow);
      add(bodyGeo(2.6, 0.65), yellow);
      for (const s of [1, -1]) add(new THREE.CapsuleGeometry(0.22, 1, 6, 12), toon(PALETTE.coral), [0.85 * s, 0, 0], 0.05).rotation.x = Math.PI / 2;
      add(new THREE.SphereGeometry(0.25, 12, 10), glow(PALETTE.red, 2.4), [0, 0, 1.3], 0);
      break;
    }
    case 'shield': {
      // Shield drone: blue body inside an animated energy bubble.
      add(new THREE.SphereGeometry(1.1, 24, 18), toon(PALETTE.blue));
      wings([[0.8, -0.4], [2.0, 0.2], [1.9, 0.7], [0.8, 0.6]], 0.1, toon(PALETTE.sky), 0);
      add(new THREE.SphereGeometry(0.3, 14, 10), glow(PALETTE.ocean, 2.4), [0, 0.1, 1.05], 0);
      const bubbleMat = new THREE.MeshBasicMaterial({ color: PALETTE.ocean, transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false });
      mats.push(bubbleMat);
      const bubble = add(new THREE.IcosahedronGeometry(2.1, 3), bubbleMat, [0, 0, 0], 0);
      spinners.push({ obj: bubble, axis: 'y', speed: 0.8 });
      pulse.push(bubble);
      break;
    }
    case 'guardian': {
      // ── Gölge Komutanı (Shadow Commander) ──
      const purple = toon('#6d3fd6', 0.3);
      const violet = toon(PALETTE.violet, 0.35);
      const darkV = toon('#3f2a8f', 0.2);
      const pink = toon(PALETTE.pink, 0.3);
      const blueGlow = glow('#5fd8ff', 2.2);
      const pinkGlow = glow('#ff6bd6', 2.2);

      // Massive rounded hull + armoured dorsal ridge.
      add(bodyGeo(15, 3.4, 0.55, 0.65), purple, [0, 0, 0], 0.14).scale.set(1.15, 0.7, 1);
      add(bodyGeo(9, 1.8, 0.6, 0.7), darkV, [0, 1.9, -1.2], 0.12).scale.set(1, 0.7, 1);
      add(bodyGeo(5, 1.0, 0.6, 0.8), violet, [0, 3.0, -2.5], 0.1);

      // Wide swept wings with pink leading edges and violet tips.
      wings([[2.5, -4.5], [12.5, 1.8], [12.8, 3.6], [2.5, 2.8]], 0.7, violet, -0.4, 0, 0.14);
      wings([[9.5, 0.5], [12.5, 1.8], [12.8, 3.6], [9.5, 3.2]], 0.8, pink, -0.38, 0, 0.1);
      wings([[2.0, 1.0], [7.0, 4.6], [7.2, 5.6], [2.0, 4.2]], 0.5, darkV, 0.6, 0, 0.1);

      // Central reactor (orange-red core, rotating ring, glow).
      const reactorZ = 6.9;
      const reactorGroup = new THREE.Group();
      reactorGroup.position.set(0, 0.1, reactorZ);
      group.add(reactorGroup);
      add(new THREE.TorusGeometry(2.1, 0.45, 14, 40), darkV, [0, 0, 0], 0.08, reactorGroup);
      const core = add(new THREE.SphereGeometry(1.55, 28, 20), glow('#ff5a2a', 2.4), [0, 0, 0.2], 0, reactorGroup);
      pulse.push(core);
      const inner = add(new THREE.SphereGeometry(0.75, 20, 14), glow('#ffd76a', 3), [0, 0, 1.2], 0, reactorGroup);
      pulse.push(inner);
      const spinRing = add(new THREE.TorusGeometry(2.7, 0.14, 8, 48), pinkGlow, [0, 0, 0.3], 0, reactorGroup);
      spinners.push({ obj: spinRing, axis: 'z', speed: 1.4 });
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const nub = new THREE.Mesh(G(new THREE.SphereGeometry(0.28, 10, 8)), pinkGlow);
        nub.position.set(Math.cos(a) * 2.7, Math.sin(a) * 2.7, 0);
        spinRing.add(nub);
      }
      sprite('#ff7a3d', 7, [0, 0.1, reactorZ + 1.2]);

      // Turret pods on the wings (rotate via spinners) + nose cannons.
      for (const s of [1, -1]) {
        for (const x of [5.2, 8.6]) {
          const turret = new THREE.Group();
          turret.position.set(x * s, 0.9, 1.2 - x * 0.12);
          group.add(turret);
          add(new THREE.SphereGeometry(0.95, 18, 12, 0, Math.PI * 2, 0, Math.PI / 2), purple, [0, 0, 0], 0.07, turret);
          for (const bx of [-0.3, 0.3]) {
            const barrel = add(new THREE.CapsuleGeometry(0.16, 1.3, 6, 10), darkV, [bx, 0.35, 0.9], 0.05, turret);
            barrel.rotation.x = Math.PI / 2;
          }
          add(new THREE.SphereGeometry(0.16, 8, 6), pinkGlow, [0, 0.35, 1.7], 0, turret);
          spinners.push({ obj: turret, axis: 'y', speed: 0.5 * s });
        }
        // Engine pods with blue thrusters (rear)
        const pod = add(new THREE.CapsuleGeometry(0.9, 3.2, 8, 18), darkV, [4.2 * s, -0.9, -4.6], 0.08);
        pod.rotation.x = Math.PI / 2;
        add(new THREE.CircleGeometry(0.75, 20), blueGlow, [4.2 * s, -0.9, -7.05], 0).rotation.y = Math.PI;
        sprite('#5fd8ff', 4, [4.2 * s, -0.9, -7.5]);
        // Cyan "eyes" and wing-tip lights
        add(new THREE.SphereGeometry(0.35, 12, 10), blueGlow, [1.6 * s, 0.9, 5.4], 0);
        add(new THREE.SphereGeometry(0.4, 12, 10), pinkGlow, [12.6 * s, -0.3, -2.6], 0);
      }
      group.scale.setScalar(1.0);
      break;
    }
  }

  const baseEmissive = flashMats.map((mat) => ({ mat, color: mat.emissive.clone(), intensity: mat.emissiveIntensity }));

  return {
    group,
    flashMats,
    baseEmissive,
    spinners,
    pulse,
    dispose: () => {
      geos.forEach((x) => x.dispose());
      mats.forEach((m) => m.dispose());
    },
  };
}

const FLASH = new THREE.Color('#ffe6f2');

/** Applies (or clears) the white hit flash. */
export function setHitFlash(m: EnemyModel, amount: number): void {
  m.flash?.(amount);
  for (const b of m.baseEmissive) {
    if (amount > 0) {
      // Subtle, short flash: keeps the cartoon colours readable under constant fire.
      b.mat.emissive.copy(FLASH);
      b.mat.emissiveIntensity = Math.max(b.intensity, 0.22 * amount);
    } else {
      b.mat.emissive.copy(b.color);
      b.mat.emissiveIntensity = b.intensity;
    }
  }
}
