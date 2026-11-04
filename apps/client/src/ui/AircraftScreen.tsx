import { useState } from 'react';
import { AIRCRAFT, AIRCRAFT_ORDER, SPECIALS, WEAPONS, artForGameplay, type AircraftDef, type AircraftId } from '@sfe/shared';
import { audio } from '../audio/AudioEngine';
import { artUrl } from '../game/assets/artSprites';
import { useT } from '../i18n';
import { useProfile } from '../state/profile';
import { JetSilhouette } from './art';
import { MenuTopBar } from './MainMenu';
import { TabBar } from './TabBar';

const STAT_MAX = { health: 300, speed: 150, firepower: 170, armor: 50 } as const;
const STAT_COLOR: Record<keyof typeof STAT_MAX, string> = {
  health: 'linear-gradient(90deg,#ff6fae,#ff3b6b)',
  speed: 'linear-gradient(90deg,#7fe8ff,#2fa8ff)',
  firepower: 'linear-gradient(90deg,#ffe07a,#ffa41b)',
  armor: 'linear-gradient(90deg,#c6a8ff,#8b5cf6)',
};
const RARITY_STARS: Record<AircraftDef['class'], number> = {
  starter: 5, assault: 4, stealth: 3, heavy: 4, speed: 3, tank: 4, elite: 3, legendary: 5,
};

/** Image for an aircraft card: approved production art, else the interim Falcon art, else a silhouette. */
function AircraftImage({ def, big = false }: { def: AircraftDef; big?: boolean }) {
  const artId = artForGameplay('aircraft', def.id)?.id;
  const prod = artId ? artUrl(artId) : undefined;
  const src = prod ?? (def.id === 'falconX1' ? '/game-assets/aircraft/falcon-x1.svg' : undefined);
  if (src) return <img src={src} alt={def.name} className={big ? 'big' : ''} />;
  return <JetSilhouette width={big ? 220 : 96} color={def.model.primary} accent={def.model.accent} glow={def.model.engine} />;
}

/** Hangar: 8 aircraft cards (sheet "Oynanabilir Uçaklar"), preview, stats and actions. */
export function AircraftScreen() {
  const t = useT();
  const owned = useProfile((s) => s.ownedAircraft);
  const selectedId = useProfile((s) => s.selectedAircraft);
  const selectAircraft = useProfile((s) => s.selectAircraft);
  const [sel, setSel] = useState<AircraftId>(selectedId);
  const def = AIRCRAFT[sel];
  const has = owned.includes(sel);
  const unlockText =
    def.unlock.type === 'default' ? t('aircraft.unlock.default') : t(`aircraft.unlock.${def.unlock.type}`, { n: def.unlock.value });

  return (
    <div className="screen c-screen c-sky" data-testid="aircraft">
      <MenuTopBar />
      <main className="c-hangar-screen">
        <section className="c-card c-ac-grid" aria-label={t('aircraft.title')}>
          <h3>{t('aircraft.title')} (8)</h3>
          <div className="c-ac-cards">
            {AIRCRAFT_ORDER.map((id) => {
              const a = AIRCRAFT[id];
              const own = owned.includes(id);
              return (
                <button
                  key={id}
                  type="button"
                  className={`c-ac-card ${sel === id ? 'active' : ''} ${own ? '' : 'locked'} r-${a.class}`}
                  onClick={() => { audio.uiClick(); setSel(id); }}
                  aria-pressed={sel === id}
                >
                  <AircraftImage def={a} />
                  <span className="c-ac-stars">{'★'.repeat(RARITY_STARS[a.class])}</span>
                  <b>{a.name}</b>
                  {!own && <i className="c-lock">🔒</i>}
                </button>
              );
            })}
          </div>
        </section>

        <section className="c-card c-ac-detail">
          <div className="c-ac-preview"><AircraftImage def={def} big /></div>
          <h2>{def.name} <span className="c-chip-sm">{t(`aircraft.class.${def.class}`)}</span></h2>
          {(Object.keys(STAT_MAX) as (keyof typeof STAT_MAX)[]).map((k) => (
            <div key={k} className="c-stat">
              <span>{t(`stat.${k}`)}</span>
              <div className="c-stat-bar"><i style={{ width: `${Math.min(100, (def.stats[k] / STAT_MAX[k]) * 100)}%`, background: STAT_COLOR[k] }} /></div>
              <b>{def.stats[k]}</b>
            </div>
          ))}
          <p className="c-muted">✸ {t(WEAPONS[def.primaryWeapon].nameKey)} · ◆ {t(SPECIALS[def.special].nameKey)}</p>
          {!has && <p className="c-muted">🔑 {unlockText}</p>}
          <div className="c-row">
            <button type="button" className={`c-btn ${has ? 'blue' : 'disabled'}`} disabled={!has || sel === selectedId} onClick={() => { audio.uiClick(); selectAircraft(sel); }}>
              {sel === selectedId ? t('hangar.selected') : has ? t('hangar.select') : t('hangar.locked')}
            </button>
            <button type="button" className="c-btn green disabled" disabled title={t('aircraft.hangarSoon')}>
              ⬆ {t('hangar.upgrade')} · {t('menu.soon')}
            </button>
          </div>
        </section>
      </main>
      <TabBar active="aircraft" />
    </div>
  );
}
