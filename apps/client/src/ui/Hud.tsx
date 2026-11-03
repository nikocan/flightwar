import { POWERUPS, xpForLevel } from '@sfe/shared';
import { getActiveController } from '../game/GameController';
import { useT } from '../i18n';
import { useHud } from '../state/hud';
import { useProfile } from '../state/profile';
import { useSettings } from '../state/settings';
import { Icon } from './art';
import { PilotAvatar } from './art';
import { Radar } from './Radar';
import { isTouchDevice } from './TouchControls';

const pct = (v: number, max: number) => `${Math.max(0, Math.min(100, (v / Math.max(1e-6, max)) * 100))}%`;
const fmt = (n: number) => Math.floor(n).toLocaleString('tr-TR');

/** Three hearts that empty from right to left (half-heart precision). */
function Hearts({ ratio }: { ratio: number }) {
  const halves = Math.ceil(Math.max(0, Math.min(1, ratio)) * 6);
  return (
    <div className="ch-hearts" aria-label={`%${Math.round(ratio * 100)}`}>
      {[0, 1, 2].map((i) => {
        const fill = Math.max(0, Math.min(2, halves - i * 2));
        return <span key={i} className={`ch-heart ${fill === 2 ? 'full' : fill === 1 ? 'half' : 'empty'}`} />;
      })}
    </div>
  );
}

/** Segmented glossy bar (energy / shield). */
function SegBar({ ratio, kind, icon }: { ratio: number; kind: 'energy' | 'shield'; icon: string }) {
  const segs = 6;
  const lit = Math.round(Math.max(0, Math.min(1, ratio)) * segs);
  return (
    <div className={`ch-seg ${kind}`}>
      <span className="ch-seg-ico">{icon}</span>
      <div className="ch-seg-track">
        {Array.from({ length: segs }, (_, i) => <i key={i} className={i < lit ? 'on' : ''} />)}
      </div>
    </div>
  );
}

function TopLeft() {
  const t = useT();
  const level = useProfile((s) => s.level);
  const xp = useProfile((s) => s.xp);
  const name = useProfile((s) => s.pilotName);
  const hp = useHud((s) => s.hp);
  const maxHp = useHud((s) => s.maxHp);
  const shield = useHud((s) => s.shield);
  const shieldMax = useHud((s) => s.shieldMax);
  const energy = useHud((s) => s.energy);
  const maxEnergy = useHud((s) => s.maxEnergy);
  return (
    <div className="ch-tl">
      <div className="ch-panel ch-profile">
        <div className="ch-avatar"><PilotAvatar size={54} /></div>
        <div className="ch-pinfo">
          <div className="ch-name">{name} <span className="ch-flag" /></div>
          <div className="ch-level">{t('menu.level')} {level}</div>
          <div className="ch-xp"><i style={{ width: pct(xp, xpForLevel(level)) }} /></div>
        </div>
      </div>
      <Hearts ratio={hp / maxHp} />
      <SegBar kind="energy" icon="⚡" ratio={energy / maxEnergy} />
      {shieldMax > 0 && <SegBar kind="shield" icon="🛡" ratio={shield / shieldMax} />}
    </div>
  );
}

function TopCenter({ objective, missionName }: { objective: string; missionName: string }) {
  const t = useT();
  const boss = useHud((s) => s.boss);
  const wave = useHud((s) => s.wave);
  const total = useHud((s) => s.totalWaves);
  if (boss) {
    const ratio = boss.hp / boss.maxHp;
    return (
      <div className="ch-tc" data-testid="boss-bar">
        <div className="ch-panel ch-boss">
          <span className="ch-skull">☠</span>
          <div className="ch-boss-body">
            <div className="ch-boss-name">BOSS – {t('enemy.academyGuardian')}</div>
            <div className="ch-boss-track"><i style={{ width: pct(boss.hp, boss.maxHp) }} /></div>
          </div>
          <span className="ch-boss-pct">%{Math.ceil(ratio * 100)}</span>
        </div>
      </div>
    );
  }
  return (
    <div className="ch-tc">
      <div className="ch-panel ch-mission">
        <div className="ch-mission-name">⚡ {missionName}</div>
        <div className="ch-mission-obj">🎯 {objective} · {t('hud.wave', { n: wave, total })}</div>
      </div>
    </div>
  );
}

function TopRight() {
  const t = useT();
  const runCoins = useHud((s) => s.coins);
  const coins = useProfile((s) => s.coins);
  const crystals = useProfile((s) => s.crystals);
  const score = useHud((s) => s.score);
  const combo = useHud((s) => s.combo);
  return (
    <div className="ch-tr">
      <div className="ch-row">
        <div className="ch-pill" data-testid="hud-coins"><span className="ch-coin">$</span>{fmt(coins + runCoins)}</div>
        <div className="ch-pill"><span className="ch-gem" />{fmt(crystals)}</div>
        <button type="button" className="ch-round interactive" aria-label={t('hud.pause')} data-testid="pause-button" onClick={() => getActiveController()?.togglePause(true)}>
          <span className="ch-pause" />
        </button>
      </div>
      <div className="ch-score">
        <span>{t('hud.score')}</span> <b data-testid="hud-score">{fmt(score)}</b>
        {combo > 1 && <em key={combo}>{t('hud.combo', { n: combo })}</em>}
      </div>
      <Radar />
    </div>
  );
}

function BottomCenter({ touch }: { touch: boolean }) {
  const t = useT();
  const hp = useHud((s) => s.hp);
  const maxHp = useHud((s) => s.maxHp);
  const effects = useHud((s) => s.effects);
  const missiles = useHud((s) => s.missiles);
  const special = useHud((s) => s.specialReady);
  const specialActive = useHud((s) => s.specialActive);
  const dash = useHud((s) => s.dashReady);
  const locked = useHud((s) => s.locked);
  const shield = useHud((s) => s.shieldMax > 0);
  const low = hp / maxHp < 0.3;
  return (
    <div className="ch-bc">
      <div className="effects">
        {effects.map((e) => {
          const def = POWERUPS[e.id];
          const deg = (e.remaining / e.duration) * 360;
          return (
            <div key={e.id} className="ch-effect" style={{ borderColor: def.color }}>
              <span className="ring" style={{ background: `conic-gradient(${def.color} ${deg}deg, rgba(255,255,255,0.25) 0)` }} />
              {t(def.nameKey)} {Math.ceil(e.remaining)}s
            </div>
          );
        })}
      </div>
      {!touch && (
        <div className="ch-slots">
          <div className={`ch-slot shield ${shield ? 'on' : ''}`}><span>🛡</span></div>
          <div className="ch-slot missile"><span>🚀</span><b>{missiles}</b><small>F</small></div>
          <div className={`ch-slot special ${specialActive ? 'on' : special >= 1 ? 'ready' : ''}`}>
            <span>💎</span>
            {special < 1 && <i style={{ height: `${(1 - special) * 100}%` }} />}
            <small>E</small>
          </div>
          <div className={`ch-slot dash ${dash >= 1 ? 'ready' : ''}`}>
            <span>»</span>
            {dash < 1 && <i style={{ height: `${(1 - dash) * 100}%` }} />}
            <small>⇧</small>
          </div>
          <div className={`ch-slot lock ${locked ? 'on' : ''}`}><Icon name="target" size={26} /><small>T</small></div>
        </div>
      )}
      <div className={`ch-health ${low ? 'low' : ''}`}>
        <span className="ch-plus">✚</span>
        <div className="ch-health-track"><i style={{ width: pct(hp, maxHp) }} /></div>
        <b data-testid="hud-hp">{fmt(hp)} / {fmt(maxHp)}</b>
      </div>
    </div>
  );
}

function Overlays() {
  const toasts = useHud((s) => s.toasts);
  const banner = useHud((s) => s.banner);
  const flash = useHud((s) => s.damageFlash);
  const hp = useHud((s) => s.hp);
  const maxHp = useHud((s) => s.maxHp);
  return (
    <>
      {flash > 0 && <div key={flash} className="damage-vignette on" />}
      {hp > 0 && hp / maxHp < 0.25 && <div className="low-hp-vignette" />}
      {banner && (
        <div key={banner.id} className={`ch-banner ${banner.tone}`} data-testid="banner">
          {banner.text}
        </div>
      )}
      <div className="toasts">
        {toasts.map((x) => (
          <div key={x.id} className="ch-toast" style={{ background: x.color }}>
            {x.icon && <span>{x.icon}</span>}
            {x.text}
          </div>
        ))}
      </div>
    </>
  );
}

export function Hud({ objective, missionName }: { objective: string; missionName: string }) {
  const t = useT();
  const showFps = useSettings((s) => s.showFps);
  const fps = useHud((s) => s.fps);
  const touch = isTouchDevice();
  return (
    <div className={`hud ch-hud ${touch ? 'touch' : ''}`} data-testid="hud">
      <Overlays />
      <TopLeft />
      <TopCenter objective={objective} missionName={missionName} />
      <TopRight />
      <BottomCenter touch={touch} />
      {!touch && <div className="controls-hint">{t('hud.controls')}</div>}
      {showFps && <div className="fps" data-testid="fps">{fps} FPS</div>}
    </div>
  );
}
