import { useRef, useState, type PointerEvent as RPointerEvent } from 'react';
import { getActiveController } from '../game/GameController';
import type { TouchButton } from '../game/input';
import { useT } from '../i18n';
import { useSettings } from '../state/settings';
import { audio } from '../audio/AudioEngine';

export const isTouchDevice = () =>
  typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);

function Joystick() {
  const base = useRef<HTMLDivElement>(null);
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const pointer = useRef<number | null>(null);

  const update = (e: RPointerEvent) => {
    const el = base.current;
    const c = getActiveController();
    if (!el || !c) return;
    const r = el.getBoundingClientRect();
    const max = r.width / 2;
    let dx = e.clientX - (r.left + max);
    let dy = e.clientY - (r.top + max);
    const len = Math.hypot(dx, dy);
    if (len > max) {
      dx = (dx / len) * max;
      dy = (dy / len) * max;
    }
    setKnob({ x: dx, y: dy });
    // Small dead zone + slight curve for precise control.
    const nx = dx / max;
    const ny = -dy / max;
    const dead = (v: number) => (Math.abs(v) < 0.08 ? 0 : Math.sign(v) * Math.min(1, Math.abs(v) * 1.15));
    c.input.touch.moveX = dead(nx);
    c.input.touch.moveY = dead(ny);
  };

  const end = () => {
    pointer.current = null;
    setKnob({ x: 0, y: 0 });
    const c = getActiveController();
    if (c) {
      c.input.touch.moveX = 0;
      c.input.touch.moveY = 0;
    }
  };

  return (
    <div
      ref={base}
      className="joystick"
      data-testid="joystick"
      onPointerDown={(e) => {
        audio.unlock();
        pointer.current = e.pointerId;
        e.currentTarget.setPointerCapture(e.pointerId);
        update(e);
      }}
      onPointerMove={(e) => pointer.current === e.pointerId && update(e)}
      onPointerUp={end}
      onPointerCancel={end}
    >
      <div className="knob" style={{ transform: `translate(${knob.x}px, ${knob.y}px)` }} />
    </div>
  );
}

function TButton({ id, label, icon }: { id: TouchButton; label: string; icon?: string }) {
  const [pressed, setPressed] = useState(false);
  const set = (v: boolean) => {
    setPressed(v);
    const c = getActiveController();
    if (c) c.input.touch.buttons[id] = v;
  };
  return (
    <button
      type="button"
      className={`tbtn ${id} ${pressed ? 'pressed' : ''}`}
      data-testid={`touch-${id}`}
      onPointerDown={(e) => {
        audio.unlock();
        e.currentTarget.setPointerCapture(e.pointerId);
        set(true);
      }}
      onPointerUp={() => set(false)}
      onPointerCancel={() => set(false)}
      onContextMenu={(e) => e.preventDefault()}
    >
      <span>
        {icon && <span style={{ display: 'block', fontSize: 18 }}>{icon}</span>}
        {label}
      </span>
    </button>
  );
}

/** Mobile controls: virtual joystick (bottom-left) and action buttons (bottom-right). */
export function TouchControls() {
  const t = useT();
  const left = useSettings((s) => s.leftHanded);
  const scale = useSettings((s) => s.buttonScale);
  return (
    <div className={`touch-layer ${left ? 'left' : ''}`}>
      <div style={{ position: 'absolute', inset: 0, transform: `scale(${scale})`, transformOrigin: 'bottom left', pointerEvents: 'none' }}>
        <Joystick />
      </div>
      <div className="touch-buttons" style={{ transform: `${left ? 'scaleX(-1) ' : ''}scale(${scale})`, transformOrigin: left ? 'bottom left' : 'bottom right' }}>
        <TButton id="fire" label={t('hud.fire')} />
        <TButton id="missile" label={t('hud.missile')} icon="➶" />
        <TButton id="special" label={t('hud.special')} icon="◆" />
        <TButton id="dash" label={t('hud.dash')} icon="»" />
        <TButton id="lock" label={t('hud.lock')} icon="◎" />
      </div>
    </div>
  );
}
