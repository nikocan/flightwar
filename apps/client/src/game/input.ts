import * as THREE from 'three';
import { ARENA, emptyInput, type InputState } from '@sfe/shared';
import { useSettings } from '../state/settings';

export type TouchButton = 'fire' | 'missile' | 'special' | 'dash' | 'lock';

/**
 * Collects keyboard, mouse and touch input into a single InputState per frame.
 * Touch controls write into the shared `touch` object from React components.
 */
export class InputManager {
  private keys = new Set<string>();
  private mouseNdc = new THREE.Vector2();
  private mouseActive = false;
  private mouseFire = false;
  private mouseMissile = false;
  private lastMouseMove = 0;
  readonly touch = { moveX: 0, moveY: 0, buttons: { fire: false, missile: false, special: false, dash: false, lock: false } as Record<TouchButton, boolean> };
  private readonly raycaster = new THREE.Raycaster();
  private readonly plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), ARENA.aimDistance);
  private readonly hit = new THREE.Vector3();
  private readonly state: InputState = emptyInput();
  private readonly aim = { x: 0, y: 0, z: 0 };
  onPause: (() => void) | null = null;

  constructor(private readonly element: HTMLElement) {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.onBlur);
    element.addEventListener('mousemove', this.onMouseMove);
    element.addEventListener('mousedown', this.onMouseDown);
    window.addEventListener('mouseup', this.onMouseUp);
    element.addEventListener('contextmenu', this.prevent);
  }

  private prevent = (e: Event) => e.preventDefault();

  private onKeyDown = (e: KeyboardEvent) => {
    if (e.code === 'Escape' || e.code === 'KeyP') {
      this.onPause?.();
      return;
    }
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.code)) e.preventDefault();
    this.keys.add(e.code);
  };

  private onKeyUp = (e: KeyboardEvent) => {
    this.keys.delete(e.code);
  };

  private onBlur = () => {
    this.keys.clear();
    this.mouseFire = false;
    this.mouseMissile = false;
  };

  private onMouseMove = (e: MouseEvent) => {
    const r = this.element.getBoundingClientRect();
    this.mouseNdc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    this.mouseActive = true;
    this.lastMouseMove = performance.now();
  };

  private onMouseDown = (e: MouseEvent) => {
    if (e.button === 0) this.mouseFire = true;
    if (e.button === 2) this.mouseMissile = true;
  };

  private onMouseUp = (e: MouseEvent) => {
    if (e.button === 0) this.mouseFire = false;
    if (e.button === 2) this.mouseMissile = false;
  };

  /** Releases all held inputs (used when pausing). */
  releaseAll(): void {
    this.onBlur();
    this.touch.moveX = 0;
    this.touch.moveY = 0;
    for (const k of Object.keys(this.touch.buttons) as TouchButton[]) this.touch.buttons[k] = false;
  }

  sample(camera: THREE.Camera, playerZ: number): InputState {
    const k = this.keys;
    const sens = useSettings.getState().sensitivity;
    let mx = (k.has('KeyD') || k.has('ArrowRight') ? 1 : 0) - (k.has('KeyA') || k.has('ArrowLeft') ? 1 : 0);
    let my = (k.has('KeyW') || k.has('ArrowUp') ? 1 : 0) - (k.has('KeyS') || k.has('ArrowDown') ? 1 : 0);
    mx += this.touch.moveX;
    my += this.touch.moveY;
    const s = this.state;
    s.moveX = THREE.MathUtils.clamp(mx * sens, -1, 1);
    s.moveY = THREE.MathUtils.clamp(my * sens, -1, 1);
    const b = this.touch.buttons;
    s.fire = k.has('Space') || k.has('KeyJ') || this.mouseFire || b.fire;
    s.missile = k.has('KeyF') || k.has('KeyK') || this.mouseMissile || b.missile;
    s.dash = k.has('ShiftLeft') || k.has('ShiftRight') || b.dash;
    s.special = k.has('KeyE') || k.has('KeyL') || b.special;
    s.lockToggle = k.has('KeyT') || k.has('Tab') || b.lock;

    // Mouse aim: project the cursor onto the virtual aim plane in front of the aircraft.
    if (this.mouseActive && performance.now() - this.lastMouseMove < 4000) {
      this.raycaster.setFromCamera(this.mouseNdc, camera);
      this.plane.constant = -(playerZ - ARENA.aimDistance);
      if (this.raycaster.ray.intersectPlane(this.plane, this.hit)) {
        this.aim.x = this.hit.x;
        this.aim.y = this.hit.y;
        this.aim.z = this.hit.z;
        s.aimPoint = this.aim;
      } else s.aimPoint = null;
    } else {
      s.aimPoint = null;
    }
    return s;
  }

  dispose(): void {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('blur', this.onBlur);
    this.element.removeEventListener('mousemove', this.onMouseMove);
    this.element.removeEventListener('mousedown', this.onMouseDown);
    window.removeEventListener('mouseup', this.onMouseUp);
    this.element.removeEventListener('contextmenu', this.prevent);
  }
}
