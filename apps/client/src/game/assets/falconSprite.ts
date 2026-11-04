import * as THREE from 'three';
import type { AircraftModel } from '../render/aircraftModel';
import { addCardExhaust } from './cardExhaust';

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
  const tail = (u: number) => new THREE.Vector3((u - 0.5) * WIDTH, -HEIGHT * 0.44, 0).applyAxisAngle(new THREE.Vector3(1, 0, 0), TILT);
  const exhaust = addCardExhaust(group, [0.41, 0.5, 0.59].map(tail), TILT);
  const { flames, glows, engines } = exhaust;

  return {
    group,
    engines,
    flames,
    glows,
    billboard: true,
    dispose: () => {
      for (const d of [geometry, material, texture]) d.dispose();
      exhaust.dispose();
    },
  };
}
