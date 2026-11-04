import * as THREE from 'three';
import type { AircraftModel } from '../render/aircraftModel';
import { glowTexture } from '../render/textures';

/** Card size and tilt. ~20° back-tilt ≈ perpendicular to the chase camera ray, so the art is not squashed. */
const WIDTH = 4.4;
const HEIGHT = 5.2;
const TILT = -0.35;

/**
 * Current Falcon X1 2.5D artwork (SVG from PR #1), placed as a camera-facing card.
 * This is the interim art until the approved production sprite (falcon-x1.webp) is delivered.
 * Movement, collisions, firing and camera are unchanged.
 */
export function createFalconSpriteModel(): AircraftModel {
  const group = new THREE.Group();
  const geometry = new THREE.PlaneGeometry(WIDTH, HEIGHT);
  geometry.rotateX(TILT);
  const texture = new THREE.TextureLoader().load('/game-assets/aircraft/falcon-x1.svg');
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: false,
    toneMapped: false,
    alphaTest: 0.025,
  });
  const aircraft = new THREE.Mesh(geometry, material);
  aircraft.renderOrder = 5;
  group.add(aircraft);

  // Three blue engine flames at the tail (sheet "Arka Görünüm": three glowing engines).
  const cardDown = new THREE.Vector3(0, -1, 0).applyAxisAngle(new THREE.Vector3(1, 0, 0), TILT);
  const tail = (u: number) => new THREE.Vector3((u - 0.5) * WIDTH, -HEIGHT * 0.44, 0).applyAxisAngle(new THREE.Vector3(1, 0, 0), TILT);
  const flameGeo = new THREE.ConeGeometry(0.2, 1.6, 14, 1, true);
  flameGeo.rotateX(-Math.PI / 2); // tip along +Z (PlayerRenderer stretches flames on local Z)
  flameGeo.translate(0, 0, 0.8);
  const coreGeo = new THREE.ConeGeometry(0.09, 1.0, 10, 1, true);
  coreGeo.rotateX(-Math.PI / 2);
  coreGeo.translate(0, 0, 0.5);
  const flameMat = new THREE.MeshBasicMaterial({ color: '#3fb8ff', transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
  const coreMat = new THREE.MeshBasicMaterial({ color: '#e8fbff', transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
  const glowMat = new THREE.SpriteMaterial({ map: glowTexture(), color: '#49c6ff', blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.85, toneMapped: false });
  const flames: THREE.Mesh[] = [];
  const glows: THREE.Sprite[] = [];
  const engines: THREE.Vector3[] = [];
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), cardDown);
  for (const u of [0.41, 0.5, 0.59]) {
    const at = tail(u);
    const holder = new THREE.Group();
    holder.position.copy(at);
    holder.quaternion.copy(q);
    const flame = new THREE.Mesh(flameGeo, flameMat);
    flame.renderOrder = 4;
    flame.add(new THREE.Mesh(coreGeo, coreMat));
    holder.add(flame);
    group.add(holder);
    flames.push(flame);
    const glow = new THREE.Sprite(glowMat);
    glow.position.copy(at).addScaledVector(cardDown, 0.1);
    glow.scale.setScalar(1.1);
    glow.renderOrder = 6;
    group.add(glow);
    glows.push(glow);
    engines.push(at.clone().addScaledVector(cardDown, 0.6));
  }

  return {
    group,
    engines,
    flames,
    glows,
    billboard: true,
    dispose: () => {
      for (const d of [geometry, material, texture, flameGeo, coreGeo, flameMat, coreMat, glowMat]) d.dispose();
    },
  };
}
