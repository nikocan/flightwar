import { POWERUPS, xpForLevel } from '@sfe/shared';
import { getActiveController } from '../game/GameController';
import { useT } from '../i18n';
import { useHud } from '../state/hud';
import { useProfile } from '../state/profile';
import { useSettings } from '../state/settings';
import { Radar } from './Radar';
import { isTouchDevice } from './TouchControls';

const pct = (v: number, max: number) => `${Math.max(0, Math.min(100, (v / Math.max(1e-6, max)) * 100))}%`;

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
  const wave = useHud((s) => s.wave);
  const total = useHud((s) => s.totalWaves);
  const progress = useHud((s) => s.progress);
  const low = hp / maxHp < 0.3;
  return (
    <div className="hud-tl">
      <div className="panel hud-card hud-row">
        <div className="avatar" style={{ width: 36, height: 36, fontSize: 13 }}>{level}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 800, fontSize: 13 }}>{name} · {t('menu.level')} {level}</div>
          <div className="xpbar" style={{ width: '100%' }}><i style={{ width: pct(xp, xpForLevel(level)) }} /></div>
        </div>
      </div>
      <div className="panel hud-card" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div className="hud-row" style={{ justifyContent: 'space-between' }}>
          <span className="hud-label">{t('hud.health')}</span>
          <span style={{ fontSize: 12, fontWeight: 800 }} data-testid="hud-hp">{Math.ceil(hp)}/{maxHp}</span>
        </div>
        <div className={`bar hp ${low ? 'low' : ''}`}><i style={{ width: pct(hp, maxHp) }} /></div>
        {shieldMax > 0 && (
          <>
            <span className="hud-label">{t('hud.shield')}</span>
            <div className="bar shield"><i style={{ width: pct(shield, shieldMax) }} /></div>
          </>
        )}
        <span className="hud-label">{t('hud.energy')}</span>
        <div className="bar energy" style={{ height: 6 }}><i style={{ width: pct(energy, maxEnergy) }} /></div>
        <div className="hud-row" style={{ justifyContent: 'space-between', marginTop: 2 }}>
          <span className="hud-label">{t('hud.wave', { n: wave, total })}</span>
          <span style={{ fontSize: 11 }} className="muted">{Math.round(progress * 100)}%</span>
        </div>
        <div className="bar progress" style={{ height: 6 }}><i style={{ width: pct(progress, 1) }} /></div>
      </div>
    </div>
  );
}

function TopCenter({ objective }: { objective: string }) {
  const t = useT();
  const boss = useHud((s) => s.boss);
  return (
    <div className="hud-tc">
      {boss ? (
        <div className="panel hud-card" style={{ width: '100%' }} data-testid="boss-bar">
          <div className="hud-row" style={{ justifyContent: 'space-between' }}>
            <span className="boss-name">{t('enemy.academyGuardian').toLocaleUpperCase('tr-TR')}</span>
            <span className="muted" style={{ fontSize: 11 }}>{['I', 'II', 'III'][boss.phase - 1]}</span>
          </div>
          <div className="bar boss" style={{ marginTop: 4 }}><i style={{ width: pct(boss.hp, boss.maxHp) }} /></div>
        </div>
      ) : (
        <div className="panel objective">🎯 {objective}</div>
      )}
    </div>
  );
}

function TopRight() {
  const t = useT();
  const score = useHud((s) => s.score);
  const combo = useHud((s) => s.combo);
  const coins = useHud((s) => s.coins);
  return (
    <div className="hud-tr">
      <div className="hud-row">
        <div className="panel hud-card hud-row" style={{ gap: 6 }}>
          <span className="coin" />
          <b data-testid="hud-coins">{Math.floor(coins)}</b>
        </div>
        <button
          type="button"
          className="btn pause-btn interactive"
          aria-label={t('hud.pause')}
          data-testid="pause-button"
          onClick={() => getActiveController()?.togglePause(true)}
        >
          ❚❚
        </button>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div className="hud-label">{t('hud.score')}</div>
        <div className="score" data-testid="hud-score">{score.toLocaleString('tr-TR')}</div>
        {combo > 1 && <div className="combo" key={combo}>{t('hud.combo', { n: combo })}</div>}
      </div>
      <Radar />
    </div>
  );
}

function BottomCenter() {
  const t = useT();
  const effects = useHud((s) => s.effects);
  const missiles = useHud((s) => s.missiles);
  const special = useHud((s) => s.specialReady);
  const specialActive = useHud((s) => s.specialActive);
  const dash = useHud((s) => s.dashReady);
  const locked = useHud((s) => s.locked);
  return (
    <div className="hud-bc">
      <div className="effects">
        {effects.map((e) => {
          const def = POWERUPS[e.id];
          const deg = (e.remaining / e.duration) * 360;
          return (
            <div key={e.id} className="effect" style={{ borderColor: def.color, color: def.color }}>
              <span className="ring" style={{ background: `conic-gradient(${def.color} ${deg}deg, rgba(255,255,255,0.1) 0)` }} />
              {t(def.nameKey)} {Math.ceil(e.remaining)}s
            </div>
          );
        })}
      </div>
      <div className="ability-row">
        <div className="panel ability">
          <span className="key">F</span>
          <span className="ico">➶</span>
          <span className="lbl">{t('hud.missiles')} ×{missiles}</span>
        </div>
        <div className={`panel ability ${specialActive ? 'active' : special >= 1 ? 'ready' : ''}`}>
          <span className="key">E</span>
          <span className="ico">◆</span>
          <span className="lbl">{special >= 1 && !specialActive ? t('hud.ready') : t('hud.special')}</span>
          {special < 1 && <span className="cd" style={{ height: `${(1 - special) * 100}%` }} />}
        </div>
        <div className={`panel ability ${dash >= 1 ? 'ready' : ''}`}>
          <span className="key">⇧</span>
          <span className="ico">»</span>
          <span className="lbl">{t('hud.dash')}</span>
          {dash < 1 && <span className="cd" style={{ height: `${(1 - dash) * 100}%` }} />}
        </div>
        <div className={`panel ability ${locked ? 'active' : ''}`}>
          <span className="key">T</span>
          <span className="ico">◎</span>
          <span className="lbl">{t('hud.lock')}</span>
        </div>
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
        <div key={banner.id} className={`banner ${banner.tone}`} data-testid="banner">
          {banner.text}
        </div>
      )}
      <div className="toasts">
        {toasts.map((x) => (
          <div key={x.id} className="toast" style={{ borderColor: x.color, color: x.color }}>
            {x.icon && <span>{x.icon}</span>}
            {x.text}
          </div>
        ))}
      </div>
    </>
  );
}

export function Hud({ objective }: { objective: string }) {
  const t = useT();
  const showFps = useSettings((s) => s.showFps);
  const fps = useHud((s) => s.fps);
  const touch = isTouchDevice();
  return (
    <div className={`hud ${touch ? 'touch' : ''}`} data-testid="hud">
      <Overlays />
      <TopLeft />
      <TopCenter objective={objective} />
      <TopRight />
      <BottomCenter />
      {!touch && <div className="controls-hint">{t('hud.controls')}</div>}
      {showFps && <div className="fps" data-testid="fps">{fps} FPS</div>}
    </div>
  );
}
