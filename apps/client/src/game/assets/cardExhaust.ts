import * as THREE from 'three';
import { glowTexture } from '../render/textures';

/**
 * Blue engine flames for a flat 2.5D aircraft card (sheet "Arka Görünüm": glowing engines).
 * Flames point along the card's "down" direction; PlayerRenderer stretches them on local Z.
 */
export function addCardExhaust(
  group: THREE.Group,
  points: THREE.Vector3[],
  tilt: number,
  color = '#3fb8ff',
): { flames: THREE.Mesh[]; glows: THREE.Sprite[]; engines: THREE.Vector3[]; dispose: () => void } {
  const cardDown = new THREE.Vector3(0, -1, 0).applyAxisAngle(new THREE.Vector3(1, 0, 0), tilt);
  const flameGeo = new THREE.ConeGeometry(0.2, 1.6, 14, 1, true);
  flameGeo.rotateX(-Math.PI / 2);
  flameGeo.translate(0, 0, 0.8);
  const coreGeo = new THREE.ConeGeometry(0.09, 1.0, 10, 1, true);
  coreGeo.rotateX(-Math.PI / 2);
  coreGeo.translate(0, 0, 0.5);
  const flameMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
  const coreMat = new THREE.MeshBasicMaterial({ color: '#e8fbff', transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
  const glowMat = new THREE.SpriteMaterial({ map: glowTexture(), color, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.85, toneMapped: false });
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), cardDown);
  const flames: THREE.Mesh[] = [];
  const glows: THREE.Sprite[] = [];
  const engines: THREE.Vector3[] = [];
  for (const at of points) {
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
  return { flames, glows, engines, dispose: () => [flameGeo, coreGeo, flameMat, coreMat, glowMat].forEach((d) => d.dispose()) };
}
