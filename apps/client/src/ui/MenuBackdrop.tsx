import { useEffect, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { AIRCRAFT, ENEMIES } from '@sfe/shared';
import { Environment, THEMES } from '../game/render/Environment';
import type { AircraftModel } from '../game/render/aircraftModel';
import { createAircraftModel, createEnemyModel } from '../game/assets/modelAdapter';
import type { EnemyModel } from '../game/render/enemyModels';
import { Particles } from '../game/render/Particles';
import { glowTexture, planetTexture } from '../game/render/textures';
import { QUALITY_PROFILES, useSettings } from '../state/settings';
import { getTexture } from '../game/assets/AssetLoader';
import { PostFX } from '../game/render/PostFX';

const SPEED = 32;
const BOSS_POS = new THREE.Vector3(0, 17, -80);

interface Bolt { mesh: THREE.Mesh; vel: THREE.Vector3; life: number }
interface Escort { model: EnemyModel; phase: number; radius: number; height: number; speed: number }
interface Fall { group: THREE.Group; mat: THREE.ShaderMaterial }

function makeWaterfall(height: number, width: number): Fall {
  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: { uTime: { value: 0 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `
      uniform float uTime; varying vec2 vUv;
      float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233))) * 43758.5453); }
      void main(){
        float col = floor(vUv.x * 28.0);
        float streak = h(vec2(col, 1.0));
        float flow = fract(vUv.y * 3.0 + uTime * (1.2 + streak) + streak * 4.0);
        float v = smoothstep(0.0, 0.6, flow) * (0.55 + 0.45 * streak);
        float edge = smoothstep(0.0, 0.15, vUv.x) * smoothstep(1.0, 0.85, vUv.x);
        vec3 c = mix(vec3(0.45,0.65,0.95), vec3(0.95,0.97,1.0), v);
        float top = smoothstep(1.0, 0.92, vUv.y);
        gl_FragColor = vec4(c, (0.35 + 0.5 * v) * edge * top);
      }`,
  });
  const group = new THREE.Group();
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(width, height, 1, 1), mat);
  plane.position.y = height / 2;
  group.add(plane);
  const mist = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: '#dfe9ff', transparent: true, opacity: 0.55, depthWrite: false }));
  mist.scale.set(width * 3, width * 1.6, 1);
  group.add(mist);
  return { group, mat };
}

/** Cinematic main-menu scene: hero jet attacking a mothership above the academy canyon at dusk. */
function MenuScene() {
  const { scene, camera, gl } = useThree();
  const quality = useSettings((s) => s.quality);
  const ref = useRef<{
    env: Environment; hero: AircraftModel; boss: EnemyModel; escorts: Escort[]; particles: Particles;
    bolts: Bolt[]; falls: Fall[]; extras: THREE.Object3D[]; t: number; fireT: number; boomT: number; tmp: THREE.Vector3;
    dispose: () => void;
  } | null>(null);

  useEffect(() => {
    const q = { ...QUALITY_PROFILES[quality], clouds: Math.min(QUALITY_PROFILES[quality].clouds, 45) };
    const env = new Environment(scene, q, THEMES.waterfallCanyon);
    env.bakeEnvironment(gl, getTexture('hdri.sunset'));
    const hero = createAircraftModel(AIRCRAFT.falconX1);
    hero.group.scale.setScalar(1.15);
    scene.add(hero.group);

    const boss = createEnemyModel(ENEMIES.academyGuardian);
    boss.group.scale.setScalar(1.9);
    boss.group.position.copy(BOSS_POS);
    scene.add(boss.group);

    const escorts: Escort[] = [];
    for (let i = 0; i < 7; i++) {
      const m = createEnemyModel({ ...ENEMIES.fighterJet, color: '#ff3b4d' });
      m.group.scale.setScalar(1.3);
      scene.add(m.group);
      escorts.push({ model: m, phase: (i / 7) * Math.PI * 2, radius: 26 + (i % 3) * 8, height: 14 + (i % 4) * 4, speed: 0.25 + (i % 2) * 0.1 });
    }

    const particles = new Particles(scene, 900);

    const boltGeo = new THREE.CapsuleGeometry(0.22, 3.2, 4, 8);
    boltGeo.rotateX(Math.PI / 2);
    const blueMat = new THREE.MeshBasicMaterial({ color: '#7fdcff', blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, toneMapped: false });
    const redMat = new THREE.MeshBasicMaterial({ color: '#ff4060', blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, toneMapped: false });
    const bolts: Bolt[] = [];
    for (let i = 0; i < 60; i++) {
      const mesh = new THREE.Mesh(boltGeo, i < 44 ? blueMat : redMat);
      mesh.visible = false;
      scene.add(mesh);
      bolts.push({ mesh, vel: new THREE.Vector3(), life: 0 });
    }

    const falls: Fall[] = [];
    const fallSpots: [number, number, number, number][] = [[-62, -27, -75, 40], [-80, -27, -150, 52], [66, -27, -110, 44], [84, -27, -190, 56]];
    for (const [x, y, z, h] of fallSpots) {
      const f = makeWaterfall(h, 6);
      f.group.position.set(x, y, z);
      f.group.rotation.y = x < 0 ? 0.35 : -0.35;
      scene.add(f.group);
      falls.push(f);
    }

    const planetMat = new THREE.SpriteMaterial({ map: planetTexture(), fog: false, depthWrite: false, transparent: true });
    const planet = new THREE.Sprite(planetMat);
    planet.position.set(230, 230, -700);
    planet.scale.setScalar(260);
    scene.add(planet);

    ref.current = {
      env, hero, boss, escorts, particles, bolts, falls, extras: [planet], t: 0, fireT: 0, boomT: 1, tmp: new THREE.Vector3(),
      dispose: () => {
        env.dispose();
        for (const o of [hero.group, boss.group, ...escorts.map((e) => e.model.group), ...bolts.map((b) => b.mesh), ...falls.map((f) => f.group), planet]) o.removeFromParent();
        hero.dispose();
        boss.dispose();
        escorts.forEach((e) => e.model.dispose());
        particles.dispose();
        boltGeo.dispose();
        blueMat.dispose();
        redMat.dispose();
        falls.forEach((f) => { f.mat.dispose(); f.group.traverse((o) => (o as THREE.Mesh).geometry?.dispose()); });
        planetMat.dispose();
      },
    };
    return () => {
      ref.current?.dispose();
      scene.fog = null;
      ref.current = null;
    };
  }, [scene, quality, gl]);

  useFrame((_, rawDt) => {
    const r = ref.current;
    if (!r) return;
    const dt = Math.min(rawDt, 0.1);
    r.t += dt;
    const t = r.t;
    r.env.update(dt, SPEED, t);

    // Hero jet
    const h = r.hero.group;
    h.position.set(Math.sin(t * 0.4) * 0.8, 1.6 + Math.sin(t * 0.7) * 0.3, 0);
    h.rotation.set(0.04 + Math.sin(t * 0.7) * 0.03, 0, -Math.cos(t * 0.4) * 0.12);
    for (const f of r.hero.flames) f.scale.set(1.1, 1.1, 1.3 + Math.random() * 0.4);
    for (const e of r.hero.engines) {
      r.tmp.copy(e);
      h.localToWorld(r.tmp);
      r.particles.emit(r.tmp.x, r.tmp.y, r.tmp.z, (Math.random() - 0.5), (Math.random() - 0.5), 26, '#2a7fc8', 0.7, 0.3, -1, 0.3);
    }

    // Mothership
    const b = r.boss.group;
    b.position.set(BOSS_POS.x + Math.sin(t * 0.3) * 2, BOSS_POS.y + Math.sin(t * 0.5) * 1.2, BOSS_POS.z);
    b.rotation.set(0.25, 0, Math.sin(t * 0.3) * 0.04);
    for (const s of r.boss.spinners) s.obj.rotation[s.axis] += s.speed * dt;
    r.boss.update?.(dt);
    r.hero.update?.(dt);
    for (const p of r.boss.pulse) p.scale.setScalar(1 + Math.sin(t * 4) * 0.06);

    // Escort fighters circling the mothership
    for (const e of r.escorts) {
      const a = e.phase + t * e.speed;
      const g = e.model.group;
      g.position.set(Math.cos(a) * e.radius, e.height + Math.sin(a * 2) * 3, BOSS_POS.z + 30 + Math.sin(a) * 18);
      g.rotation.set(0.2, 0, -Math.cos(a) * 0.5);
      for (const s of e.model.spinners) s.obj.rotation[s.axis] += s.speed * dt;
    }

    // Laser streams
    r.fireT -= dt;
    if (r.fireT <= 0) {
      r.fireT = 0.07;
      const blue = r.bolts.find((x) => x.life <= 0 && x.mesh.material !== r.bolts[59].mesh.material);
      if (blue) {
        const side = Math.random() < 0.5 ? -1 : 1;
        blue.mesh.position.set(h.position.x + side * (0.4 + Math.random() * 2.2), h.position.y + 0.2, -3);
        const target = r.tmp.set(b.position.x + (Math.random() - 0.5) * 10, b.position.y - 2 + (Math.random() - 0.5) * 6, b.position.z);
        blue.vel.copy(target).sub(blue.mesh.position).normalize().multiplyScalar(110);
        blue.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), r.tmp.copy(blue.vel).normalize());
        blue.life = 1;
        blue.mesh.visible = true;
      }
      if (Math.random() < 0.35) {
        const red = r.bolts.find((x) => x.life <= 0 && x.mesh.material === r.bolts[59].mesh.material);
        const src = r.escorts[Math.floor(Math.random() * r.escorts.length)].model.group.position;
        if (red) {
          red.mesh.position.copy(src);
          red.vel.set((Math.random() - 0.5) * 30, -10 - Math.random() * 10, 60);
          red.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), r.tmp.copy(red.vel).normalize());
          red.life = 1.6;
          red.mesh.visible = true;
        }
      }
    }
    for (const bolt of r.bolts) {
      if (bolt.life <= 0) continue;
      bolt.life -= dt;
      bolt.mesh.position.addScaledVector(bolt.vel, dt);
      if (bolt.life <= 0 || bolt.mesh.position.z < BOSS_POS.z + 4) {
        bolt.life = 0;
        bolt.mesh.visible = false;
        if (bolt.mesh.position.z < BOSS_POS.z + 6) r.particles.hitSpark(bolt.mesh.position.x, bolt.mesh.position.y, bolt.mesh.position.z, Math.random() < 0.2, '#7fe8ff', 2);
      }
    }

    // Stylised explosions around the battle
    r.boomT -= dt;
    if (r.boomT <= 0) {
      r.boomT = 0.8 + Math.random() * 1.2;
      const e = r.escorts[Math.floor(Math.random() * r.escorts.length)].model.group.position;
      r.particles.explosion(e.x + (Math.random() - 0.5) * 8, e.y - 4, e.z + 6, 2.2, '#ff7a3d');
    }

    for (const f of r.falls) {
      f.mat.uniforms.uTime.value = t;
      f.group.position.z += SPEED * dt;
      if (f.group.position.z > 40) f.group.position.z -= 320;
    }

    camera.position.set(Math.sin(t * 0.15) * 1.2, 2.6 + Math.sin(t * 0.2) * 0.25, 13);
    camera.lookAt(0, 3.5, -40);
    r.particles.update(dt, camera);
  });
  return null;
}

export function MenuBackdrop() {
  const quality = useSettings((s) => s.quality);
  const q = QUALITY_PROFILES[quality];
  return (
    <div className="canvas-layer" aria-hidden>
      <Canvas dpr={q.dpr} gl={{ antialias: q.antialias, powerPreference: 'high-performance' }} camera={{ fov: 60, near: 0.1, far: 2000, position: [0, 3, 11] }}>
        <MenuScene />
        <PostFX />
      </Canvas>
      <div className="menu-vignette" />
    </div>
  );
}
