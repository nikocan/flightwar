import * as THREE from 'three';
import type { QualityProfile } from '../../state/settings';
import { cloudTexture, glowTexture } from './textures';
import { CartoonProps } from './CartoonProps';

/** Visual theme for a chapter — Phase 3 will add one per chapter. */
export interface EnvironmentTheme {
  zenith: string;
  horizon: string;
  fog: string;
  sun: string;
  sunDir: [number, number, number];
  fogNear: number;
  fogFar: number;
  water: string;
  waterShallow: string;
  sand: string;
  grass: string;
  rock: string;
  snow: string;
  hemiSky: string;
  hemiGround: string;
  /** Cartoon look: terraced cliffs, cel-shaded light, foam river, decorative props. */
  toon?: boolean;
  cliff?: string;
  cliffDark?: string;
  foam?: string;
}

/** Bright cartoon "Waterfall Canyon" — the primary art direction. */
const WATERFALL_CANYON: EnvironmentTheme = {
  zenith: '#3aa8f5', horizon: '#c9ecff', fog: '#bfe6ff', sun: '#fff4d6', sunDir: [0.4, 0.75, 0.35],
  fogNear: 170, fogFar: 700,
  water: '#18a6d8', waterShallow: '#5fe0e6', sand: '#f3dca2', grass: '#72dda5', rock: '#d9a77a', snow: '#ffffff',
  hemiSky: '#d8f1ff', hemiGround: '#8fd3a8',
  toon: true, cliff: '#d9a77a', cliffDark: '#a8714f', foam: '#ffffff',
};

export const THEMES: Record<string, EnvironmentTheme> = {
  waterfallCanyon: WATERFALL_CANYON,
  menuDusk: {
    zenith: '#101a52', horizon: '#f09aa8', fog: '#7f78b8', sun: '#ffb070', sunDir: [0.15, 0.1, -1],
    fogNear: 90, fogFar: 520,
    water: '#123a7a', waterShallow: '#3f8fd0', sand: '#b9a07a', grass: '#3d7a3c', rock: '#5f5a6e', snow: '#e8e4ff',
    hemiSky: '#a9b8ff', hemiGround: '#2a3326',
  },
  // Chapter 1 now uses the cartoon canyon (the original realistic theme is kept as 'skyAcademyClassic').
  skyAcademy: WATERFALL_CANYON,
  skyAcademyClassic: {
    zenith: '#1f5fc4', horizon: '#cfe9ff', fog: '#c4e0f7', sun: '#fff1c9', sunDir: [0.35, 0.42, -1],
    fogNear: 140, fogFar: 640,
    water: '#0d4f8a', waterShallow: '#2aa7c9', sand: '#d9c58f', grass: '#4f9a45', rock: '#7d7a77', snow: '#f4f8ff',
    hemiSky: '#cfe9ff', hemiGround: '#3f5f36',
  },
};

const NOISE_GLSL = /* glsl */ `
float hash(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 5; i++) { v += a * noise(p); p = p * 2.03 + vec2(17.1, 9.2); a *= 0.5; }
  return v;
}
#ifdef TOON
float terrainHeight(vec2 p) {
  // Cartoon mesas: flat grassy tops, steep rounded cliffs, river in the middle.
  float canyon = smoothstep(30.0, 46.0, abs(p.x)) + smoothstep(90.0, 200.0, abs(p.x)) * 0.9;
  float h = canyon * (20.0 + fbm(p * 0.01) * 26.0);
  float stepH = 13.0;
  float k = h / stepH;
  h = (floor(k) + smoothstep(0.3, 0.7, fract(k))) * stepH;
  h += fbm(p * 0.07) * 2.2 * min(canyon, 1.0);
  return h - 5.0;
}
#else
float terrainHeight(vec2 p) {
  float canyon = smoothstep(16.0, 120.0, abs(p.x));
  float ridges = 1.0 - abs(noise(p * 0.02) * 2.0 - 1.0);
  float h = fbm(p * 0.011) * 60.0 * canyon + ridges * 22.0 * canyon + fbm(p * 0.06) * 5.0;
  h += canyon * canyon * 36.0;
  return h - 7.0;
}
#endif
`;

/**
 * Scrolling world: sky dome, procedural canyon terrain with a river, clouds,
 * floating academy islands and speed streaks. The world moves towards the camera to
 * convey forward flight while the gameplay arena stays fixed.
 */
export class Environment {
  readonly root = new THREE.Group();
  private terrainMat: THREE.ShaderMaterial;
  private clouds: THREE.InstancedMesh;
  private cloudData: { x: number; y: number; z: number; s: number }[] = [];
  private islands: THREE.Group[] = [];
  private streaks: THREE.InstancedMesh;
  private streakData: { x: number; y: number; z: number }[] = [];
  private readonly dummy = new THREE.Object3D();
  private scroll = 0;
  /** Distance the world has scrolled (terrain coordinate offset). */
  get scrollOffset(): number {
    return this.scroll;
  }
  private disposables: { dispose: () => void }[] = [];
  private sky!: THREE.Mesh;
  private envTarget: THREE.WebGLRenderTarget | null = null;
  private scene: THREE.Scene;
  private props: CartoonProps | null = null;

  constructor(scene: THREE.Scene, quality: QualityProfile, theme: EnvironmentTheme = THEMES.skyAcademy) {
    this.scene = scene;
    scene.add(this.root);
    scene.fog = new THREE.Fog(theme.fog, theme.fogNear, theme.fogFar);
    scene.background = new THREE.Color(theme.horizon);
    const sunDir = new THREE.Vector3(...theme.sunDir).normalize();

    // Lights
    // Cartoon lighting is softer so cel bands keep their colour instead of clipping to white.
    const hemi = new THREE.HemisphereLight(theme.hemiSky, theme.hemiGround, theme.toon ? 0.75 : 1.1);
    const sun = new THREE.DirectionalLight(theme.sun, theme.toon ? 1.05 : 2.4);
    sun.position.copy(sunDir).multiplyScalar(100);
    const back = new THREE.DirectionalLight(theme.toon ? '#ffd9ef' : '#8fb8ff', theme.toon ? 0.45 : 1.1);
    back.position.set(-20, 30, 60);
    this.root.add(hemi, sun, back);

    // Sky dome
    const skyGeo = new THREE.SphereGeometry(1400, 32, 16);
    const skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      uniforms: {
        uZenith: { value: new THREE.Color(theme.zenith) },
        uHorizon: { value: new THREE.Color(theme.horizon) },
        uSun: { value: new THREE.Color(theme.sun) },
        uSunDir: { value: sunDir },
      },
      vertexShader: /* glsl */ `
        varying vec3 vDir;
        void main() {
          vDir = normalize(position);
          vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          gl_Position = p.xyww;
        }`,
      fragmentShader: /* glsl */ `
        uniform vec3 uZenith; uniform vec3 uHorizon; uniform vec3 uSun; uniform vec3 uSunDir;
        varying vec3 vDir;
        void main() {
          float h = clamp(vDir.y, -1.0, 1.0);
          vec3 col = mix(uHorizon, uZenith, pow(max(h, 0.0), 0.55));
          col = mix(col, uHorizon * 0.95, smoothstep(0.0, -0.3, h));
          float s = max(dot(normalize(vDir), uSunDir), 0.0);
          col += uSun * (pow(s, 900.0) * 6.0 + pow(s, 24.0) * 0.45 + pow(s, 4.0) * 0.12);
          gl_FragColor = vec4(col, 1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
    });
    const sky = new THREE.Mesh(skyGeo, skyMat);
    this.sky = sky;
    sky.frustumCulled = false;
    sky.renderOrder = -10;
    this.root.add(sky);
    this.disposables.push(skyGeo, skyMat);

    // Terrain
    const seg = quality.terrainSegments;
    const terrainGeo = new THREE.PlaneGeometry(1000, 1100, seg, Math.round(seg * 1.2));
    terrainGeo.rotateX(-Math.PI / 2);
    this.terrainMat = new THREE.ShaderMaterial({
      defines: theme.toon ? { TOON: '' } : {},
      uniforms: {
        uCliff: { value: new THREE.Color(theme.cliff ?? theme.rock) },
        uCliffDark: { value: new THREE.Color(theme.cliffDark ?? theme.rock) },
        uFoam: { value: new THREE.Color(theme.foam ?? '#ffffff') },
        uScroll: { value: 0 },
        uTime: { value: 0 },
        uSunDir: { value: sunDir },
        uSunColor: { value: new THREE.Color(theme.sun) },
        uFog: { value: new THREE.Color(theme.fog) },
        uFogNear: { value: theme.fogNear * 0.8 },
        uFogFar: { value: theme.fogFar },
        uWater: { value: new THREE.Color(theme.water) },
        uWaterShallow: { value: new THREE.Color(theme.waterShallow) },
        uSand: { value: new THREE.Color(theme.sand) },
        uGrass: { value: new THREE.Color(theme.grass) },
        uRock: { value: new THREE.Color(theme.rock) },
        uSnow: { value: new THREE.Color(theme.snow) },
        uSky: { value: new THREE.Color(theme.hemiSky) },
      },
      vertexShader: /* glsl */ `
        uniform float uScroll;
        varying float vH;
        varying vec3 vN;
        varying vec3 vWorld;
        varying vec2 vP;
        ${NOISE_GLSL}
        void main() {
          vec4 world = modelMatrix * vec4(position, 1.0);
          vec2 p = vec2(world.x, world.z - uScroll);
          float h = terrainHeight(p);
          float e = 2.0;
          float hx = terrainHeight(p + vec2(e, 0.0)) - terrainHeight(p - vec2(e, 0.0));
          float hz = terrainHeight(p + vec2(0.0, e)) - terrainHeight(p - vec2(0.0, e));
          vN = normalize(vec3(-hx, 2.0 * e, -hz));
          vH = h;
          vP = p;
          world.y += max(h, 0.0);
          vWorld = world.xyz;
          gl_Position = projectionMatrix * viewMatrix * world;
        }`,
      fragmentShader: /* glsl */ `
        uniform vec3 uSunDir; uniform vec3 uSunColor; uniform vec3 uFog; uniform float uFogNear; uniform float uFogFar;
        uniform vec3 uWater; uniform vec3 uWaterShallow; uniform vec3 uSand; uniform vec3 uGrass; uniform vec3 uRock; uniform vec3 uSnow; uniform vec3 uSky;
        uniform float uTime; uniform vec3 uCliff; uniform vec3 uCliffDark; uniform vec3 uFoam;
        varying float vH; varying vec3 vN; varying vec3 vWorld; varying vec2 vP;
        ${NOISE_GLSL}
        void main() {
          vec3 n = normalize(vN);
          #ifdef TOON
          vec3 tc;
          float tdiff = max(dot(n, normalize(uSunDir)), 0.0);
          if (vH < 0.0) {
            // Turquoise river with scrolling foam streaks and soft sparkles.
            float edge = smoothstep(-3.5, 0.0, vH);
            tc = mix(uWater, uWaterShallow, edge);
            float streak = noise(vec2(vP.x * 0.35, vP.y * 0.04 + uTime * 1.6));
            float foam = smoothstep(0.86, 0.9, streak) * 0.7 + smoothstep(-0.35, -0.02, vH) * 0.9;
            tc = mix(tc, uFoam, clamp(foam, 0.0, 1.0) * 0.75);
            tc += pow(noise(vP * 0.9 + vec2(uTime * 1.2, -uTime)), 24.0) * 0.6;
            tdiff = 1.0;
          } else {
            float slope = 1.0 - n.y;
            float grassAmt = 1.0 - smoothstep(0.22, 0.34, slope);
            // Layered cliff strata in warm sandstone tones.
            float band = smoothstep(0.45, 0.55, fract(vH * 0.11 + noise(vP * 0.03) * 1.4));
            vec3 rock = mix(uCliff, uCliffDark, band * 0.28 + noise(vP * 0.2) * 0.12);
            vec3 grass = mix(uGrass * 0.88, uGrass * 1.08, noise(vP * 0.12));
            tc = mix(rock, grass, grassAmt);
            tc = mix(uSand, tc, smoothstep(0.4, 2.2, vH));
          }
          // Cel shading: three soft light bands.
          float cel = tdiff < 0.25 ? 0.62 : tdiff < 0.6 ? 0.82 : 1.0;
          vec3 tlit = tc * (uSky * 0.32 + cel * 0.78);
          float tdist = length(vWorld - cameraPosition);
          float tf = smoothstep(uFogNear, uFogFar, tdist);
          gl_FragColor = vec4(mix(tlit, uFog, tf), 1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
          return;
          #endif
          float detail = noise(vP * 0.35) * 0.5 + noise(vP * 1.3) * 0.5;
          vec3 col;
          if (vH < 0.0) {
            float depth = clamp(-vH / 6.0, 0.0, 1.0);
            col = mix(uWaterShallow, uWater, depth);
            float ripple = noise(vP * 0.5 + vec2(0.0, uTime * 0.8)) * 0.12;
            float sparkle = pow(noise(vP * 1.2 + vec2(uTime * 1.5, -uTime)), 28.0);
            col += ripple + sparkle * 0.55;
            n = vec3(0.0, 1.0, 0.0);
          } else {
            float slope = 1.0 - n.y;
            col = mix(uSand, uGrass, smoothstep(0.8, 3.0, vH));
            col *= 0.85 + detail * 0.3;
            col = mix(col, uRock * (0.8 + detail * 0.4), smoothstep(0.18, 0.42, slope));
            col = mix(col, uSnow, smoothstep(62.0, 78.0, vH + detail * 8.0) * (1.0 - smoothstep(0.45, 0.7, slope)));
          }
          float diff = max(dot(n, normalize(uSunDir)), 0.0);
          vec3 lit = col * (uSky * 0.45 + uSunColor * diff * 0.95);
          float dist = length(vWorld - cameraPosition);
          float f = smoothstep(uFogNear, uFogFar, dist);
          gl_FragColor = vec4(mix(lit, uFog, f), 1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
    });
    const terrain = new THREE.Mesh(terrainGeo, this.terrainMat);
    terrain.position.set(0, -26, -440);
    terrain.frustumCulled = false;
    this.root.add(terrain);
    this.disposables.push(terrainGeo, this.terrainMat);

    // Clouds
    const cloudGeo = new THREE.PlaneGeometry(1, 1);
    const cloudMat = new THREE.MeshBasicMaterial({ map: cloudTexture(), transparent: true, depthWrite: false, opacity: 0.92, fog: true });
    this.clouds = new THREE.InstancedMesh(cloudGeo, cloudMat, quality.clouds);
    this.clouds.frustumCulled = false;
    let seed = 12345;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < quality.clouds; i++) {
      const layer = rnd();
      let x = (rnd() - 0.5) * 520;
      let y: number;
      if (layer < 0.45) y = -14 - rnd() * 8; // below the aircraft
      else if (layer < 0.8) y = 30 + rnd() * 50; // high
      else y = -4 + rnd() * 26; // at flight level, kept to the sides
      if (y > -10 && y < 22 && Math.abs(x) < 45) x = Math.sign(x || 1) * (45 + rnd() * 120);
      this.cloudData.push({ x, y, z: -700 + rnd() * 760, s: 35 + rnd() * 70 });
    }
    this.root.add(this.clouds);
    this.disposables.push(cloudGeo, cloudMat);

    // Floating academy islands
    const rockGeo = new THREE.ConeGeometry(1, 1.6, 7, 1);
    rockGeo.rotateX(Math.PI);
    const topGeo = new THREE.CylinderGeometry(1, 0.95, 0.25, 7);
    const towerGeo = new THREE.CylinderGeometry(0.12, 0.18, 1.6, 8);
    const beaconGeo = new THREE.SphereGeometry(0.16, 10, 8);
    const rockMat = new THREE.MeshStandardMaterial({ color: '#6b625a', roughness: 0.95, flatShading: true });
    const topMat = new THREE.MeshStandardMaterial({ color: theme.grass, roughness: 0.9, flatShading: true });
    const towerMat = new THREE.MeshStandardMaterial({ color: '#e7eef8', metalness: 0.4, roughness: 0.3 });
    const beaconMat = new THREE.MeshBasicMaterial({ color: '#00e5ff', toneMapped: false });
    const beaconGlow = new THREE.SpriteMaterial({ map: glowTexture(), color: '#00e5ff', blending: THREE.AdditiveBlending, depthWrite: false, transparent: true });
    this.disposables.push(rockGeo, topGeo, towerGeo, beaconGeo, rockMat, topMat, towerMat, beaconMat, beaconGlow);
    const islandCount = theme.toon ? 0 : Math.max(4, Math.round(quality.clouds / 6));
    for (let i = 0; i < islandCount; i++) {
      const g = new THREE.Group();
      const rock = new THREE.Mesh(rockGeo, rockMat);
      rock.position.y = -0.8;
      const top = new THREE.Mesh(topGeo, topMat);
      g.add(rock, top);
      const towers = 1 + Math.floor(rnd() * 3);
      for (let k = 0; k < towers; k++) {
        const tw = new THREE.Mesh(towerGeo, towerMat);
        const ox = (rnd() - 0.5) * 1.1;
        const oz = (rnd() - 0.5) * 1.1;
        const h = 0.6 + rnd() * 0.9;
        tw.scale.y = h;
        tw.position.set(ox, 0.1 + 0.8 * h, oz);
        const b = new THREE.Mesh(beaconGeo, beaconMat);
        b.position.set(ox, 0.15 + 1.6 * h, oz);
        g.add(tw, b);
        if (quality.glowSprites) {
          const s = new THREE.Sprite(beaconGlow);
          s.position.copy(b.position);
          s.scale.setScalar(0.9);
          g.add(s);
        }
      }
      const side = rnd() < 0.5 ? -1 : 1;
      g.position.set(side * (75 + rnd() * 140), -12 + rnd() * 46, -700 + rnd() * 760);
      g.scale.setScalar(5 + rnd() * 8);
      g.rotation.y = rnd() * Math.PI * 2;
      this.islands.push(g);
      this.root.add(g);
    }

    if (theme.toon) this.props = new CartoonProps(scene, quality);

    // Speed streaks
    const streakCount = Math.round(quality.particles / 25);
    const streakGeo = new THREE.BoxGeometry(0.05, 0.05, 7);
    const streakMat = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false });
    this.streaks = new THREE.InstancedMesh(streakGeo, streakMat, streakCount);
    this.streaks.frustumCulled = false;
    for (let i = 0; i < streakCount; i++) {
      const a = rnd() * Math.PI * 2;
      const r = 9 + rnd() * 30;
      this.streakData.push({ x: Math.cos(a) * r, y: 2 + Math.sin(a) * r * 0.6, z: -180 + rnd() * 200 });
    }
    this.root.add(this.streaks);
    this.disposables.push(streakGeo, streakMat);
  }

  /**
   * Image-based lighting: uses a supplied HDR when available, otherwise bakes the procedural
   * sunset sky into a prefiltered environment map so PBR metals get real reflections.
   */
  bakeEnvironment(renderer: THREE.WebGLRenderer, hdr?: THREE.Texture): void {
    const pmrem = new THREE.PMREMGenerator(renderer);
    if (hdr) {
      this.envTarget = pmrem.fromEquirectangular(hdr);
    } else {
      const envScene = new THREE.Scene();
      const skyCopy = new THREE.Mesh(this.sky.geometry, this.sky.material);
      skyCopy.scale.setScalar(0.05);
      envScene.add(skyCopy);
      this.envTarget = pmrem.fromScene(envScene, 0.02);
    }
    pmrem.dispose();
    this.scene.environment = this.envTarget.texture;
    this.scene.environmentIntensity = 0.9;
  }

  /** `speed` is the forward flight speed in world units / second. */
  update(dt: number, speed: number, time: number): void {
    this.scroll += speed * dt;
    this.terrainMat.uniforms.uScroll.value = this.scroll;
    this.terrainMat.uniforms.uTime.value = time;
    this.props?.update(dt, this.scroll, time);

    const d = this.dummy;
    for (let i = 0; i < this.cloudData.length; i++) {
      const c = this.cloudData[i];
      c.z += speed * dt * 0.9;
      if (c.z > 80) c.z -= 780;
      d.position.set(c.x, c.y, c.z);
      d.rotation.set(0, 0, 0);
      d.scale.set(c.s, c.s * 0.55, 1);
      d.updateMatrix();
      this.clouds.setMatrixAt(i, d.matrix);
    }
    this.clouds.instanceMatrix.needsUpdate = true;

    for (const g of this.islands) {
      g.position.z += speed * dt * 0.75;
      g.rotation.y += dt * 0.05;
      if (g.position.z > 80) g.position.z -= 780;
    }

    for (let i = 0; i < this.streakData.length; i++) {
      const s = this.streakData[i];
      s.z += speed * dt * 2.4;
      if (s.z > 25) s.z -= 210;
      d.position.set(s.x, s.y, s.z);
      d.scale.set(1, 1, 0.6 + speed / 80);
      d.updateMatrix();
      this.streaks.setMatrixAt(i, d.matrix);
    }
    this.streaks.instanceMatrix.needsUpdate = true;
  }

  dispose(): void {
    if (this.scene.environment === this.envTarget?.texture) this.scene.environment = null;
    this.envTarget?.dispose();
    this.props?.dispose();
    this.root.removeFromParent();
    this.disposables.forEach((x) => x.dispose());
    this.clouds.dispose();
    this.streaks.dispose();
  }
}

// ── JavaScript port of the TOON terrain height (keeps props sitting on the shader terrain) ──
const fract = (v: number) => v - Math.floor(v);
function hashJS(x: number, y: number): number {
  let a = fract(x * 0.1031), b = fract(y * 0.1031), c = fract(x * 0.1031);
  const d = a * (b + 33.33) + b * (c + 33.33) + c * (a + 33.33);
  a += d; b += d; c += d;
  return fract((a + b) * c);
}
function noiseJS(x: number, y: number): number {
  const ix = Math.floor(x), iy = Math.floor(y);
  const fx = x - ix, fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
  const a = hashJS(ix, iy), b = hashJS(ix + 1, iy), c = hashJS(ix, iy + 1), d = hashJS(ix + 1, iy + 1);
  return (a + (b - a) * ux) + ((c + (d - c) * ux) - (a + (b - a) * ux)) * uy;
}
function fbmJS(x: number, y: number): number {
  let v = 0, a = 0.5;
  for (let i = 0; i < 5; i++) { v += a * noiseJS(x, y); x = x * 2.03 + 17.1; y = y * 2.03 + 9.2; a *= 0.5; }
  return v;
}
const smooth = (e0: number, e1: number, x: number) => { const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t); };
/** Terrain height (above the terrain base plane) at terrain coordinates (x, z). */
export function toonTerrainHeight(x: number, z: number): number {
  const canyon = smooth(30, 46, Math.abs(x)) + smooth(90, 200, Math.abs(x)) * 0.9;
  let h = canyon * (20 + fbmJS(x * 0.01, z * 0.01) * 26);
  const k = h / 13;
  h = (Math.floor(k) + smooth(0.3, 0.7, fract(k))) * 13;
  h += fbmJS(x * 0.07, z * 0.07) * 2.2 * Math.min(canyon, 1);
  return h - 5;
}
export const TERRAIN_BASE_Y = -26;
