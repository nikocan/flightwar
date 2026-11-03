import * as THREE from 'three';
import type { QualityProfile } from '../../state/settings';
import { TERRAIN_BASE_Y, toonTerrainHeight } from './Environment';
import { glowTexture } from './textures';
import { PALETTE, addOutline, glowMat, toonMat } from './toon';

const WRAP = 780;
const NEAR_Z = 70;

interface Placed {
  obj: THREE.Object3D;
  /** Terrain-space z (world z = tz + scroll). */
  tz: number;
  x: number;
  /** Re-place on wrap (recomputes height). */
  place: (x: number, tz: number) => void;
}

/** Ground height in world Y at terrain coords. */
const groundY = (x: number, tz: number) => TERRAIN_BASE_Y + Math.max(0, toonTerrainHeight(x, tz));

/** Is this a reasonably flat cliff top? */
function flatTop(x: number, tz: number): boolean {
  const h = toonTerrainHeight(x, tz);
  if (h < 10) return false;
  const e = 3;
  return (
    Math.abs(toonTerrainHeight(x + e, tz) - h) < 1.5 &&
    Math.abs(toonTerrainHeight(x - e, tz) - h) < 1.5 &&
    Math.abs(toonTerrainHeight(x, tz + e) - h) < 1.5 &&
    Math.abs(toonTerrainHeight(x, tz - e) - h) < 1.5
  );
}

function waterfallMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    uniforms: { uTime: { value: 0 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `
      uniform float uTime; varying vec2 vUv;
      float h(float x){ return fract(sin(x * 91.7) * 43758.5453); }
      void main(){
        float col = floor(vUv.x * 18.0);
        float r = h(col);
        float flow = fract(vUv.y * 2.5 + uTime * (0.9 + r * 0.8) + r * 3.0);
        float streak = smoothstep(0.15, 0.55, flow) * smoothstep(1.0, 0.7, flow);
        vec3 c = mix(vec3(0.55, 0.88, 1.0), vec3(1.0), streak * 0.85 + (1.0 - vUv.y) * 0.25);
        float edge = smoothstep(0.0, 0.12, vUv.x) * smoothstep(1.0, 0.88, vUv.x);
        float a = (0.78 + 0.22 * streak) * edge * smoothstep(1.0, 0.94, vUv.y);
        gl_FragColor = vec4(c, a);
        #include <colorspace_fragment>
      }`,
  });
}

function flagMaterial(color: string): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    side: THREE.DoubleSide,
    uniforms: { uTime: { value: 0 }, uColor: { value: new THREE.Color(color) } },
    vertexShader: `
      uniform float uTime; varying vec2 vUv; varying float vShade;
      void main(){
        vUv = uv;
        vec3 p = position;
        float w = sin(uv.x * 6.0 - uTime * 5.0) * 0.35 * uv.x;
        p.z += w;
        vShade = 0.85 + 0.15 * cos(uv.x * 6.0 - uTime * 5.0);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
      }`,
    fragmentShader: `
      uniform vec3 uColor; varying vec2 vUv; varying float vShade;
      void main(){
        vec3 c = uColor * vShade;
        // Simple white emblem stripe
        float stripe = step(0.42, vUv.y) * step(vUv.y, 0.58) * step(0.25, vUv.x) * step(vUv.x, 0.75);
        c = mix(c, vec3(1.0), stripe * 0.9);
        gl_FragColor = vec4(c, 1.0);
        #include <colorspace_fragment>
      }`,
  });
}

/**
 * Decorative cartoon world props that scroll with the canyon: blossom trees, waterfalls,
 * flag towers and an arched bridge. Trees use instancing (one draw call per part).
 */
export class CartoonProps {
  readonly root = new THREE.Group();
  private placed: Placed[] = [];
  private animated: THREE.ShaderMaterial[] = [];
  private disposables: { dispose: () => void }[] = [];
  private trunks!: THREE.InstancedMesh;
  private crowns!: THREE.InstancedMesh;
  private trees: { x: number; tz: number; s: number; pink: boolean; sway: number }[] = [];
  private readonly dummy = new THREE.Object3D();
  private seed = 4242;
  private bridge: THREE.Object3D | null = null;

  constructor(scene: THREE.Scene, quality: QualityProfile) {
    scene.add(this.root);
    this.buildTrees(Math.round(quality.clouds * 1.6) + 24);
    this.buildWaterfalls(quality.clouds > 20 ? 8 : 4);
    this.buildTowers(6);
    this.buildBridge();
  }

  private rnd(): number {
    this.seed = (this.seed * 16807) % 2147483647;
    return this.seed / 2147483647;
  }

  private findFlat(minX: number, maxX: number, tz: number, tries = 24): number | null {
    for (let i = 0; i < tries; i++) {
      const x = (this.rnd() < 0.5 ? -1 : 1) * (minX + this.rnd() * (maxX - minX));
      if (flatTop(x, tz)) return x;
    }
    return null;
  }

  // ─────────── trees ───────────
  private buildTrees(count: number): void {
    const trunkGeo = new THREE.CylinderGeometry(0.35, 0.5, 3, 8);
    trunkGeo.translate(0, 1.5, 0);
    const crownGeo = new THREE.IcosahedronGeometry(1, 2);
    const trunkMat = toonMat('#9a6a46', { rim: 0.1 });
    const crownMat = toonMat('#ffffff', { rim: 0.25 });
    this.trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, count);
    this.crowns = new THREE.InstancedMesh(crownGeo, crownMat, count * 3);
    this.crowns.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(count * 9), 3);
    this.trunks.frustumCulled = false;
    this.crowns.frustumCulled = false;
    this.root.add(this.trunks, this.crowns);
    this.disposables.push(trunkGeo, crownGeo, trunkMat, crownMat);
    for (let i = 0; i < count; i++) {
      const tz = -700 + this.rnd() * WRAP;
      const x = this.findFlat(46, 170, tz) ?? 80 + this.rnd() * 60;
      this.trees.push({ x, tz, s: 1.6 + this.rnd() * 1.6, pink: this.rnd() < 0.45, sway: this.rnd() * 6 });
    }
    const pink = [new THREE.Color(PALETTE.pink), new THREE.Color('#ff9ccb'), new THREE.Color('#ffd0e6')];
    const green = [new THREE.Color(PALETTE.mint), new THREE.Color('#4cc98a'), new THREE.Color('#9be8bf')];
    this.trees.forEach((t, i) => {
      const set = t.pink ? pink : green;
      for (let k = 0; k < 3; k++) this.crowns.setColorAt(i * 3 + k, set[k]);
    });
  }

  private updateTrees(scroll: number, time: number): void {
    const d = this.dummy;
    this.trees.forEach((t, i) => {
      let z = t.tz + scroll;
      // Trees recycle before reaching the camera so they never block the HUD view.
      if (z > -25) {
        t.tz -= WRAP;
        t.x = this.findFlat(46, 170, t.tz) ?? t.x;
        z = t.tz + scroll;
      }
      const y = groundY(t.x, t.tz);
      const sway = Math.sin(time * 1.4 + t.sway) * 0.05;
      d.position.set(t.x, y, z);
      d.rotation.set(0, 0, sway);
      d.scale.setScalar(t.s);
      d.updateMatrix();
      this.trunks.setMatrixAt(i, d.matrix);
      const blobs: [number, number, number, number][] = [[0, 4.2, 0, 2.1], [-1.3, 3.4, 0.4, 1.5], [1.2, 3.6, -0.3, 1.6]];
      blobs.forEach(([bx, by, bz, bs], k) => {
        d.position.set(t.x + (bx + sway * 6) * t.s, y + by * t.s, z + bz * t.s);
        d.rotation.set(0, 0, 0);
        d.scale.setScalar(bs * t.s * (1 + Math.sin(time * 2 + t.sway + k) * 0.02));
        d.updateMatrix();
        this.crowns.setMatrixAt(i * 3 + k, d.matrix);
      });
    });
    this.trunks.instanceMatrix.needsUpdate = true;
    this.crowns.instanceMatrix.needsUpdate = true;
  }

  // ─────────── waterfalls ───────────
  private buildWaterfalls(count: number): void {
    const mat = waterfallMaterial();
    this.animated.push(mat);
    this.disposables.push(mat);
    const mistMat = new THREE.SpriteMaterial({ map: glowTexture(), color: '#ffffff', transparent: true, opacity: 0.75, depthWrite: false });
    this.disposables.push(mistMat);
    for (let i = 0; i < count; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      const group = new THREE.Group();
      const geo = new THREE.PlaneGeometry(1, 1, 1, 1);
      geo.translate(0, 0.5, 0);
      this.disposables.push(geo);
      const sheet = new THREE.Mesh(geo, mat);
      group.add(sheet);
      const mist = new THREE.Sprite(mistMat);
      group.add(mist);
      const mist2 = new THREE.Sprite(mistMat);
      group.add(mist2);
      this.root.add(group);
      const place = (x: number, tz: number) => {
        const top = groundY(x + side * 12, tz);
        const bottom = TERRAIN_BASE_Y;
        const height = Math.max(12, top - bottom);
        const width = 6 + (i % 3) * 2;
        sheet.scale.set(width, height, 1);
        group.position.set(x, bottom, 0);
        group.rotation.y = side < 0 ? 0.95 : -0.95;
        mist.position.set(0, 1.5, 1.5);
        mist.scale.set(width * 2.6, width * 1.3, 1);
        mist2.position.set(0, 4, 2.5);
        mist2.scale.set(width * 1.8, width * 1.2, 1);
      };
      const tz = -680 + (i / count) * WRAP + this.rnd() * 40;
      const x = side * (33 + this.rnd() * 3);
      place(x, tz);
      this.placed.push({ obj: group, tz, x, place });
    }
  }

  // ─────────── flag towers ───────────
  private buildTowers(count: number): void {
    const bodyMat = toonMat('#ffffff', { rim: 0.3 });
    const roofMat = toonMat(PALETTE.blue, { rim: 0.35 });
    const baseMat = toonMat('#c9d6e8', { rim: 0.2 });
    const lamp = glowMat(PALETTE.ocean, 2.2);
    const pole = toonMat('#e6edf6', { rim: 0.2 });
    const bodyGeo = new THREE.CylinderGeometry(1.6, 2, 9, 20);
    const roofGeo = new THREE.SphereGeometry(2.1, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2);
    const baseGeo = new THREE.CylinderGeometry(3, 3.3, 1.4, 20);
    const ringGeo = new THREE.TorusGeometry(1.75, 0.18, 8, 24);
    const poleGeo = new THREE.CylinderGeometry(0.1, 0.1, 6, 6);
    const flagGeo = new THREE.PlaneGeometry(3.2, 2, 16, 4);
    flagGeo.translate(1.6, 0, 0);
    this.disposables.push(bodyMat, roofMat, baseMat, lamp, pole, bodyGeo, roofGeo, baseGeo, ringGeo, poleGeo, flagGeo);
    for (let i = 0; i < count; i++) {
      const g = new THREE.Group();
      const base = new THREE.Mesh(baseGeo, baseMat);
      base.position.y = 0.7;
      const body = new THREE.Mesh(bodyGeo, bodyMat);
      body.position.y = 5.8;
      const roof = new THREE.Mesh(roofGeo, roofMat);
      roof.position.y = 10.3;
      const ring = new THREE.Mesh(ringGeo, lamp);
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 8.2;
      const p = new THREE.Mesh(poleGeo, pole);
      p.position.y = 14;
      const fm = flagMaterial(i % 2 ? PALETTE.red : PALETTE.coral);
      this.animated.push(fm);
      this.disposables.push(fm);
      const flag = new THREE.Mesh(flagGeo, fm);
      flag.position.set(0.1, 15.8, 0);
      g.add(base, body, roof, ring, p, flag);
      for (const m of [body, roof, base]) addOutline(m, 0.12);
      g.scale.setScalar(1.3);
      this.root.add(g);
      const place = (x: number, tz: number) => {
        g.position.set(x, groundY(x, tz) - 0.3, 0);
      };
      const tz = -700 + (i / count) * WRAP + this.rnd() * 60;
      const x = this.findFlat(48, 90, tz) ?? (i % 2 ? 1 : -1) * 62;
      place(x, tz);
      this.placed.push({ obj: g, tz, x, place: (_x, ntz) => place(this.findFlat(48, 90, ntz) ?? _x, ntz) });
    }
  }

  // ─────────── bridge ───────────
  private buildBridge(): void {
    const stone = toonMat('#f1e2c4', { rim: 0.25 });
    const stoneDark = toonMat('#cdb48c', { rim: 0.15 });
    const rail = toonMat(PALETTE.blue, { rim: 0.3 });
    const lamp = glowMat(PALETTE.yellow, 2);
    this.disposables.push(stone, stoneDark, rail, lamp);
    const g = new THREE.Group();
    const span = 124;
    const deckGeo = new THREE.BoxGeometry(span, 2.2, 6);
    const deck = new THREE.Mesh(deckGeo, stone);
    g.add(deck);
    addOutline(deck, 0.15);
    const railGeo = new THREE.BoxGeometry(span, 0.6, 0.5);
    for (const z of [-2.8, 2.8]) {
      const r = new THREE.Mesh(railGeo, rail);
      r.position.set(0, 1.6, z);
      g.add(r);
    }
    const archGeo = new THREE.TorusGeometry(11, 1.4, 10, 32, Math.PI);
    const pillarGeo = new THREE.CylinderGeometry(1.6, 2.2, 40, 12);
    const lampGeo = new THREE.SphereGeometry(0.5, 10, 8);
    this.disposables.push(deckGeo, railGeo, archGeo, pillarGeo, lampGeo);
    for (const x of [-44, -22, 0, 22, 44]) {
      const arch = new THREE.Mesh(archGeo, stoneDark);
      arch.position.set(x, -1, 0);
      arch.rotation.z = Math.PI;
      arch.scale.set(1, 1, 2.2);
      g.add(arch);
    }
    for (const x of [-55, -33, -11, 11, 33, 55]) {
      const pil = new THREE.Mesh(pillarGeo, stoneDark);
      pil.position.set(x, -21, 0);
      g.add(pil);
      const l = new THREE.Mesh(lampGeo, lamp);
      l.position.set(x, 2.6, 2.8);
      g.add(l);
    }
    this.root.add(g);
    this.bridge = g;
    const place = (_x: number, tz: number) => {
      const top = Math.min(groundY(-60, tz), groundY(60, tz));
      g.position.set(0, Math.max(TERRAIN_BASE_Y + 22, top - 1), 0);
    };
    const tz = -420;
    place(0, tz);
    this.placed.push({ obj: g, tz, x: 0, place });
  }

  update(dt: number, scroll: number, time: number): void {
    for (const m of this.animated) m.uniforms.uTime.value = time;
    this.updateTrees(scroll, time);
    for (const p of this.placed) {
      let z = p.tz + scroll;
      // Recycle before props reach the camera so the screen edges stay clear.
      if (z > (p.obj === this.bridge ? NEAR_Z : -15)) {
        p.tz -= WRAP;
        p.place(p.x, p.tz);
        z = p.tz + scroll;
      }
      p.obj.position.z = z;
    }
    void dt;
  }

  dispose(): void {
    this.root.removeFromParent();
    this.disposables.forEach((d) => d.dispose());
    this.trunks.dispose();
    this.crowns.dispose();
  }
}
