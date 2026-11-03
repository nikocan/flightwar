import * as THREE from 'three';
import type { EnemyDef } from '@sfe/shared';
import { glowTexture } from './textures';

/** Procedural enemy meshes. Enemies face +Z (towards the player). */
export interface EnemyModel {
  group: THREE.Group;
  /** Materials flashed white when the enemy is hit. */
  flashMats: THREE.MeshStandardMaterial[];
  baseEmissive: { mat: THREE.MeshStandardMaterial; color: THREE.Color; intensity: number }[];
  spinners: { obj: THREE.Object3D; axis: 'x' | 'y' | 'z'; speed: number }[];
  pulse: THREE.Object3D[];
  dispose: () => void;
}

function wingGeo(points: [number, number][], thickness: number) {
  const shape = new THREE.Shape(points.map(([x, z]) => new THREE.Vector2(x, z)));
  const g = new THREE.ExtrudeGeometry(shape, { depth: thickness, bevelEnabled: false });
  g.rotateX(Math.PI / 2);
  g.translate(0, thickness / 2, 0);
  return g;
}

export function buildEnemy(model: EnemyDef['model'], color: string): EnemyModel {
  const group = new THREE.Group();
  const geos: THREE.BufferGeometry[] = [];
  const mats: THREE.Material[] = [];
  const flashMats: THREE.MeshStandardMaterial[] = [];
  const spinners: EnemyModel['spinners'] = [];
  const pulse: THREE.Object3D[] = [];
  const g = <T extends THREE.BufferGeometry>(x: T) => (geos.push(x), x);
  const std = (params: THREE.MeshStandardMaterialParameters) => {
    const m = new THREE.MeshStandardMaterial(params);
    mats.push(m);
    flashMats.push(m);
    return m;
  };
  const hull = std({ color: '#2a2d3a', metalness: 0.7, roughness: 0.35 });
  const plate = std({ color, metalness: 0.4, roughness: 0.45 });
  const glowMat = std({ color, emissive: color, emissiveIntensity: 2.2, toneMapped: false });
  const add = (geo: THREE.BufferGeometry, mat: THREE.Material, x = 0, y = 0, z = 0) => {
    const m = new THREE.Mesh(g(geo), mat);
    m.position.set(x, y, z);
    group.add(m);
    return m;
  };
  const sprite = (scale: number, x = 0, y = 0, z = 0) => {
    const sm = new THREE.SpriteMaterial({ map: glowTexture(), color, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, toneMapped: false });
    mats.push(sm);
    const s = new THREE.Sprite(sm);
    s.scale.setScalar(scale);
    s.position.set(x, y, z);
    group.add(s);
    return s;
  };

  switch (model) {
    case 'drone': {
      add(new THREE.OctahedronGeometry(0.85, 1), hull);
      const ring = add(new THREE.TorusGeometry(1.15, 0.12, 8, 28), glowMat);
      ring.rotation.x = Math.PI / 2;
      spinners.push({ obj: ring, axis: 'z', speed: 3 });
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
        const arm = add(new THREE.BoxGeometry(0.16, 0.16, 1.1), plate, Math.cos(a) * 0.9, 0, Math.sin(a) * 0.9);
        arm.rotation.y = -a + Math.PI / 2;
        const rotor = add(new THREE.CylinderGeometry(0.42, 0.42, 0.04, 16), glowMat, Math.cos(a) * 1.45, 0.12, Math.sin(a) * 1.45);
        spinners.push({ obj: rotor, axis: 'y', speed: 18 });
      }
      add(new THREE.SphereGeometry(0.32, 12, 10), glowMat, 0, 0, 0.75);
      sprite(2.6, 0, 0, 0.8);
      break;
    }
    case 'fighter': {
      const body = add(new THREE.ConeGeometry(0.55, 4.2, 10), hull, 0, 0, 0.2);
      body.rotation.x = Math.PI / 2;
      for (const s of [1, -1]) {
        add(wingGeo([[0.3 * s, 0.6], [2.4 * s, -1.4], [2.4 * s, -1.8], [0.3 * s, -1.5]], 0.1), plate);
        add(wingGeo([[0.2 * s, -1.0], [1.0 * s, -2.0], [0.2 * s, -2.1]], 0.08), hull, 0, 0.5);
        add(new THREE.BoxGeometry(0.08, 0.08, 1.4), glowMat, 1.5 * s, 0.08, -0.6);
      }
      add(new THREE.SphereGeometry(0.28, 10, 8), glowMat, 0, 0.3, 0.8);
      sprite(2.2, 0, 0, -2.2);
      break;
    }
    case 'bomber': {
      add(wingGeo([[0, 2.6], [4.8, -1.2], [4.4, -1.9], [1.8, -1.2], [0, -2.0], [-1.8, -1.2], [-4.4, -1.9], [-4.8, -1.2]], 0.45), hull);
      const hump = add(new THREE.SphereGeometry(1.3, 16, 12), plate, 0, 0.35, 0.2);
      hump.scale.set(1, 0.55, 1.6);
      for (const x of [-3.2, -1.6, 1.6, 3.2]) {
        add(new THREE.CylinderGeometry(0.3, 0.3, 0.25, 12), glowMat, x, -0.2, -0.6 + Math.abs(x) * -0.1);
        sprite(1.6, x, 0, -1.6);
      }
      const eye = add(new THREE.BoxGeometry(2.2, 0.15, 0.2), glowMat, 0, 0.5, 1.55);
      pulse.push(eye);
      break;
    }
    case 'missileDrone': {
      const b = add(new THREE.CylinderGeometry(0.5, 0.7, 2.2, 8), hull);
      b.rotation.x = Math.PI / 2;
      for (const s of [1, -1]) add(new THREE.BoxGeometry(0.4, 0.4, 1.4), plate, 0.9 * s, 0, 0);
      add(new THREE.SphereGeometry(0.3, 10, 8), glowMat, 0, 0, 1.1);
      sprite(2, 0, 0, -1.2);
      break;
    }
    case 'shield': {
      add(new THREE.DodecahedronGeometry(1.1, 0), hull);
      const shell = add(new THREE.IcosahedronGeometry(1.9, 1), new THREE.MeshBasicMaterial({ color, wireframe: true, transparent: true, opacity: 0.4 }));
      mats.push(shell.material as THREE.Material);
      spinners.push({ obj: shell, axis: 'y', speed: 0.8 });
      add(new THREE.SphereGeometry(0.35, 10, 8), glowMat, 0, 0, 1.0);
      break;
    }
    case 'guardian': {
      // Armoured battleship: layered deck, superstructure, turrets, glowing core and red light strips.
      const deck = add(new THREE.BoxGeometry(17, 1.6, 8), hull, 0, 0, 0);
      deck.scale.set(1, 1, 1);
      add(new THREE.BoxGeometry(12, 1.2, 10), plate, 0, 1.2, -0.5);
      add(new THREE.BoxGeometry(7, 1.6, 7), hull, 0, 2.6, -1);
      add(new THREE.BoxGeometry(3.4, 2.2, 3.4), plate, 0, 4.2, -1.5);
      add(new THREE.BoxGeometry(1.2, 3.2, 1.2), hull, 0, 6.4, -1.8);
      // Bow (front wedge)
      const bow = add(new THREE.CylinderGeometry(0.01, 5.5, 6, 4, 1), hull, 0, -0.2, 6);
      bow.rotation.set(Math.PI / 2, Math.PI / 4, 0);
      bow.scale.set(1.5, 1, 0.35);
      // Side hull arms with wing plates
      for (const sx of [1, -1]) {
        const arm = add(new THREE.BoxGeometry(6, 1.2, 4), hull, 10.5 * sx, -0.4, 0.5);
        arm.rotation.z = -0.12 * sx;
        add(wingGeo([[8 * sx, 3], [16 * sx, 0], [16 * sx, -2], [8 * sx, -3]], 0.4), plate, 0, 0.6);
        const pod = add(new THREE.CylinderGeometry(1, 1.2, 4.5, 10), hull, 13 * sx, -1.4, 1);
        pod.rotation.x = Math.PI / 2;
        add(new THREE.SphereGeometry(0.55, 10, 8), glowMat, 13 * sx, -1.4, 3.3);
        // Turrets
        for (const tx of [3.2, 6.2]) {
          add(new THREE.CylinderGeometry(0.9, 1.1, 0.8, 10), plate, tx * sx, 2.2, 1.5);
          const barrel = add(new THREE.CylinderGeometry(0.16, 0.16, 2.6, 6), hull, tx * sx, 2.5, 2.8);
          barrel.rotation.x = Math.PI / 2;
          const barrel2 = add(new THREE.CylinderGeometry(0.16, 0.16, 2.6, 6), hull, tx * sx + 0.45 * sx, 2.5, 2.8);
          barrel2.rotation.x = Math.PI / 2;
        }
        // Red light strips along the deck front
        for (let k = 0; k < 5; k++) add(new THREE.BoxGeometry(1, 0.22, 0.2), glowMat, (1.8 + k * 1.6) * sx, 0.35, 4.05);
        // Under-hull lights
        for (let k = 0; k < 3; k++) add(new THREE.SphereGeometry(0.28, 8, 6), glowMat, (2 + k * 3) * sx, -0.9, 2);
      }
      // Glowing core in the bow
      const core = add(new THREE.IcosahedronGeometry(1.5, 2), glowMat, 0, 0.3, 5.2);
      pulse.push(core);
      const eye = add(new THREE.SphereGeometry(0.8, 16, 12), std({ color: '#ffffff', emissive: '#ffffff', emissiveIntensity: 3, toneMapped: false }), 0, 0.3, 6.1);
      pulse.push(eye);
      const ring = add(new THREE.TorusGeometry(2.6, 0.22, 8, 36), glowMat, 0, 0.3, 5.4);
      spinners.push({ obj: ring, axis: 'z', speed: 1.2 });
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const spike = new THREE.Mesh(g(new THREE.ConeGeometry(0.22, 0.9, 6)), glowMat);
        spike.position.set(Math.cos(a) * 3.0, Math.sin(a) * 3.0, 0);
        spike.rotation.z = a - Math.PI / 2;
        ring.add(spike);
      }
      sprite(12, 0, 0.3, 6.5);
      sprite(4, -13, -1.4, 3.6);
      sprite(4, 13, -1.4, 3.6);
      group.scale.setScalar(0.85);
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

const WHITE = new THREE.Color('#ffffff');

/** Applies (or clears) the white hit flash. */
export function setHitFlash(m: EnemyModel, amount: number): void {
  for (const b of m.baseEmissive) {
    if (amount > 0) {
      b.mat.emissive.copy(WHITE);
      b.mat.emissiveIntensity = Math.max(b.intensity, 1.2 * amount);
    } else {
      b.mat.emissive.copy(b.color);
      b.mat.emissiveIntensity = b.intensity;
    }
  }
}
