import { useEffect, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { AIRCRAFT, AIRCRAFT_ORDER, SPECIALS, WEAPONS, type AircraftDef, type AircraftId } from '@sfe/shared';
import { buildAircraft, type AircraftModel } from '../game/render/aircraftModel';
import { useT } from '../i18n';
import { useApp } from '../state/app';
import { useProfile } from '../state/profile';
import { Btn, TopBar } from './common';

function Preview({ def }: { def: AircraftDef }) {
  const { scene } = useThree();
  const ref = useRef<AircraftModel | null>(null);
  useEffect(() => {
    const m = buildAircraft(def.model);
    scene.add(m.group);
    ref.current = m;
    return () => {
      m.group.removeFromParent();
      m.dispose();
      ref.current = null;
    };
  }, [def, scene]);
  useFrame((state) => {
    const m = ref.current;
    if (!m) return;
    const t = state.clock.elapsedTime;
    m.group.rotation.set(0.25, t * 0.5, Math.sin(t) * 0.08);
    m.group.position.y = Math.sin(t * 1.2) * 0.15;
    for (const f of m.flames) f.scale.set(1, 1, 0.9 + Math.random() * 0.3);
  });
  return (
    <>
      <hemisphereLight args={['#cfe9ff', '#1a2040', 1.2]} />
      <directionalLight position={[5, 8, 6]} intensity={2.4} />
      <directionalLight position={[-6, 2, -6]} intensity={1.2} color="#9b5cff" />
      <mesh position={[0, -2.2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[3.2, 3.5, 64]} />
        <meshBasicMaterial color="#2fb8ff" transparent opacity={0.6} toneMapped={false} side={THREE.DoubleSide} />
      </mesh>
    </>
  );
}

const STAT_MAX = { health: 300, armor: 50, speed: 150, agility: 150, firepower: 170, critDamage: 2.5, energy: 200, specialCooldown: 25 };

/** Aircraft collection gallery with live 3D previews (selection & upgrades arrive with the hangar in Phase 4). */
export function AircraftScreen() {
  const t = useT();
  const go = useApp((s) => s.go);
  const owned = useProfile((s) => s.ownedAircraft);
  const [sel, setSel] = useState<AircraftId>('falconX1');
  const def = AIRCRAFT[sel];
  const unlockText = (d: AircraftDef) =>
    d.unlock.type === 'default' ? t('aircraft.unlock.default') : t(`aircraft.unlock.${d.unlock.type}`, { n: d.unlock.value });

  return (
    <div className="screen" data-testid="aircraft">
      <div className="bg-gradient" />
      <TopBar title={t('aircraft.title')} onBack={() => go({ id: 'menu' })} />
      <div className="page screen-scroll">
        <div className="aircraft-layout">
          <div className="panel aircraft-list">
            {AIRCRAFT_ORDER.map((id) => {
              const a = AIRCRAFT[id];
              const has = owned.includes(id);
              return (
                <Btn key={id} className={`aircraft-item ${sel === id ? 'active' : ''} ${a.class === 'legendary' ? 'legendary' : ''}`} onClick={() => setSel(id)}>
                  <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                    <span>{a.name}</span>
                    <small className="muted">{t(`aircraft.class.${a.class}`)}</small>
                  </span>
                  {has ? <span className="badge badge-gold">{t('aircraft.selected')}</span> : <span>🔒</span>}
                </Btn>
              );
            })}
          </div>
          <div className="panel holo-edge aircraft-view">
            <div className="aircraft-canvas">
              <Canvas dpr={[1, 2]} camera={{ position: [0, 3.2, 10], fov: 40 }}>
                <Preview def={def} />
              </Canvas>
            </div>
            <div className="aircraft-info">
              <h2>
                {def.name} <span className="badge badge-soon">{t(`aircraft.class.${def.class}`)}</span>
              </h2>
              {(Object.keys(STAT_MAX) as (keyof typeof STAT_MAX)[]).map((k) => {
                const v = def.stats[k];
                return (
                  <div key={k} className="stat-bar">
                    <span className="muted">{t(`stat.${k}`)}</span>
                    <div className="bar"><i style={{ width: `${Math.min(100, (v / STAT_MAX[k]) * 100)}%` }} /></div>
                    <b>{k === 'critDamage' ? `x${v}` : k === 'specialCooldown' ? `${v}s` : v}</b>
                  </div>
                );
              })}
              <div style={{ gridColumn: '1 / -1', marginTop: 8, lineHeight: 1.5 }}>
                <div>✸ <b>{t(WEAPONS[def.primaryWeapon].nameKey)}</b></div>
                <div>◆ <b>{t(SPECIALS[def.special].nameKey)}</b> — <span className="muted">{t(SPECIALS[def.special].descriptionKey)}</span></div>
                <div className="muted">🔑 {unlockText(def)}</div>
                <div className="muted" style={{ marginTop: 6, fontSize: 13 }}>ℹ {t('aircraft.hangarSoon')}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
