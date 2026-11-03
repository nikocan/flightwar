import { useEffect, useState } from 'react';
import { MISSIONS, xpForLevel } from '@sfe/shared';
import { audio } from '../audio/AudioEngine';
import { APP_VERSION } from '../data/changelog';
import { useT } from '../i18n';
import { useApp, type Screen } from '../state/app';
import { DAILY_REWARD, useProfile } from '../state/profile';
import { Chest, Icon, JetSilhouette, LogoWing, PilotAvatar, RankBadge, type IconName } from './art';
import { MenuBackdrop } from './MenuBackdrop';

const STAGE_W = 1600;
const STAGE_H = 900;

/** Scales the fixed 1600x900 menu stage to fit any landscape screen. */
function useStageScale() {
  const get = () => Math.min(window.innerWidth / STAGE_W, window.innerHeight / STAGE_H);
  const [s, setS] = useState(get);
  useEffect(() => {
    const on = () => setS(get());
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  return s;
}

const fmt = (n: number) => n.toLocaleString('tr-TR');

/** Time left until the end of the current month (season length = 1 month). */
function useSeasonCountdown() {
  const calc = () => {
    const now = new Date();
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const ms = Math.max(0, end.getTime() - now.getTime());
    const d = Math.floor(ms / 86400000);
    const h = Math.floor((ms % 86400000) / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    return `${d}g ${h}s ${m}d`;
  };
  const [v, setV] = useState(calc);
  useEffect(() => {
    const id = setInterval(() => setV(calc()), 30000);
    return () => clearInterval(id);
  }, []);
  return v;
}

function click(fn: () => void) {
  return () => {
    audio.uiClick();
    fn();
  };
}

export function MainMenu() {
  const t = useT();
  const go = useApp((s) => s.go);
  const startMission = useApp((s) => s.startMission);
  const { pilotName, level, xp, coins, crystals, lastSeenVersion, missions } = useProfile();
  const canClaim = useProfile((s) => s.canClaimDaily());
  const claimDaily = useProfile((s) => s.claimDaily);
  const [claimed, setClaimed] = useState<string | null>(null);
  const season = useSeasonCountdown();
  const hasNews = lastSeenVersion !== APP_VERSION;
  const need = xpForLevel(level);
  const scale = useStageScale();

  const soon = (titleKey: string, bodyKey: string, phase: number): Screen => ({ id: 'soon', titleKey, bodyKey, phase });
  const nextMission = Object.keys(MISSIONS).find((id) => !missions[id]?.completed) ?? '1-1';

  const side: { key: string; icon: IconName; to: Screen; alert?: boolean }[] = [
    { key: 'menu.home', icon: 'home', to: { id: 'menu' } },
    { key: 'menu.missions', icon: 'target', to: { id: 'missions' }, alert: !missions['1-1']?.completed },
    { key: 'menu.hangar', icon: 'plane', to: { id: 'aircraft' } },
    { key: 'menu.weapons', icon: 'rocket', to: soon('menu.weapons', 'soon.weapons', 4) },
    { key: 'menu.upgrades', icon: 'upgrade', to: soon('menu.upgrades', 'soon.upgrades', 4) },
    { key: 'menu.inventory', icon: 'box', to: soon('menu.inventory', 'soon.inventory', 4) },
    { key: 'menu.achievements', icon: 'trophy', to: soon('menu.achievements', 'soon.rewards', 3) },
    { key: 'menu.leaderboards', icon: 'bars', to: soon('menu.leaderboards', 'soon.leaderboards', 5) },
    { key: 'menu.events', icon: 'calendar', to: soon('menu.events', 'soon.events', 3) },
  ];

  const modes: { key: string; sub: string; icon: IconName; to: () => void; tone: string; jets: number; soon?: boolean; trophy?: boolean }[] = [
    { key: 'mode.single', sub: 'mode.single.sub', icon: 'play', to: () => go({ id: 'missions' }), tone: 'blue', jets: 1 },
    { key: 'mode.multi', sub: 'mode.multi.sub', icon: 'globe', to: () => go(soon('menu.multiplayer', 'soon.multiplayer', 5)), tone: 'blue', jets: 2, soon: true },
    { key: 'mode.team', sub: 'mode.team.sub', icon: 'users', to: () => go(soon('mode.team', 'soon.multiplayer', 5)), tone: 'navy', jets: 0, soon: true },
    { key: 'mode.arena', sub: 'mode.arena.sub', icon: 'swords', to: () => go(soon('mode.arena', 'soon.multiplayer', 5)), tone: 'navy', jets: 0, soon: true, trophy: true },
  ];

  const tiles: { key: string; icon: IconName; to: Screen; tone?: string }[] = [
    { key: 'tile.daily', icon: 'calendar', to: soon('tile.daily', 'soon.rewards', 3) },
    { key: 'tile.pass', icon: 'ticket', to: soon('tile.pass', 'soon.pass', 3) },
    { key: 'tile.bonus', icon: 'gift', to: { id: 'updates' } },
    { key: 'tile.shop', icon: 'cart', to: soon('tile.shop', 'soon.shop', 4), tone: 'purple' },
  ];

  return (
    <div className="screen sf-menu" data-testid="main-menu">
      <MenuBackdrop />
      <div className="sf-rotate">📱↻ {t('menu.rotate')}</div>
      <div className="sf-stage" style={{ transform: `translate(-50%, -50%) scale(${scale})` }}>

      {/* ── Top bar ── */}
      <header className="sf-top">
        <div className="sf-profile" data-testid="profile">
          <div className="sf-avatar">
            <PilotAvatar size={78} />
            <span className="sf-lvl">{level}</span>
          </div>
          <div className="sf-pinfo">
            <div className="sf-pname">
              {pilotName} <span className="sf-flag" aria-label="Türkiye" />
            </div>
            <div className="sf-plevel">{t('menu.level')} {level}</div>
            <div className="sf-xpbar"><i style={{ width: `${Math.min(100, (xp / need) * 100)}%` }} /></div>
            <div className="sf-xptext">XP {fmt(xp)} / {fmt(need)}</div>
          </div>
          <RankBadge size={58} />
        </div>

        <div className="sf-logo" aria-label="Sky Force Evolution">
          <LogoWing />
          <div className="sf-logo-plate">
            <span className="sf-logo-1">SKY FORCE</span>
            <span className="sf-logo-2">EVOLUTION</span>
          </div>
          <LogoWing flip />
        </div>

        <div className="sf-res">
          <div className="sf-cur" data-testid="coins">
            <span className="sf-coin">₿</span>
            <b>{fmt(coins)}</b>
            <button type="button" className="sf-plus" aria-label={t('tile.shop')} onClick={click(() => go(soon('tile.shop', 'soon.shop', 4)))}><Icon name="plus" size={16} /></button>
          </div>
          <div className="sf-cur" data-testid="crystals">
            <span className="crystal" />
            <b>{fmt(crystals)}</b>
            <button type="button" className="sf-plus" aria-label={t('tile.shop')} onClick={click(() => go(soon('tile.shop', 'soon.shop', 4)))}><Icon name="plus" size={16} /></button>
          </div>
          <div className="sf-icons">
            <button type="button" aria-label={t('menu.friends')} onClick={click(() => go(soon('menu.friends', 'soon.friends', 5)))}><Icon name="friends" size={26} /></button>
            <button type="button" aria-label={t('menu.updates')} data-testid="menu-updates" onClick={click(() => go({ id: 'updates' }))}>
              <Icon name="mail" size={26} />
              {hasNews && <span className="sf-alert">!</span>}
            </button>
            <button type="button" aria-label={t('menu.settings')} data-testid="menu-settings" onClick={click(() => go({ id: 'settings', from: 'menu' }))}><Icon name="gear" size={26} /></button>
          </div>
        </div>
      </header>

      {/* ── Left column ── */}
      <aside className="sf-left">
        <div className="sf-season">
          <div className="sf-season-art"><Icon name="ticket" size={34} /></div>
          <div>
            <div className="sf-season-k">{t('season.label', { n: 1 })}</div>
            <div className="sf-season-n">{t('chapter.1')}</div>
            <div className="sf-season-t">⏱ {season}</div>
          </div>
        </div>
        <nav className="sf-nav">
          {side.map((s, i) => (
            <button
              key={s.key}
              type="button"
              className={`sf-nav-item ${i === 0 ? 'active' : ''}`}
              data-testid={`nav-${s.key.split('.')[1]}`}
              onMouseEnter={() => audio.uiHover()}
              onClick={click(() => go(s.to))}
            >
              <Icon name={s.icon} size={26} />
              <span>{t(s.key)}</span>
              {s.alert && <span className="sf-alert">!</span>}
            </button>
          ))}
        </nav>
      </aside>

      {/* ── Right column: game modes ── */}
      <section className="sf-modes">
        {modes.map((m) => (
          <button
            key={m.key}
            type="button"
            className={`sf-mode ${m.tone}`}
            data-testid={`mode-${m.key.split('.')[1]}`}
            onMouseEnter={() => audio.uiHover()}
            onClick={click(m.to)}
          >
            <Icon name={m.icon} size={m.jets ? 36 : 40} className="sf-mode-ico" />
            <span className="sf-mode-txt">
              <b>{t(m.key)}</b>
              <small>{t(m.sub)}</small>
            </span>
            {m.jets > 0 && (
              <span className="sf-mode-art">
                <JetSilhouette width={150} />
                {m.jets > 1 && <JetSilhouette width={120} flip accent="#ff3b4d" />}
              </span>
            )}
            {m.trophy && <span className="sf-trophy">🏆</span>}
            {m.soon && <span className="sf-soon">{t('menu.soon')}</span>}
          </button>
        ))}
      </section>

      {/* ── Bottom-left: daily reward ── */}
      <button
        type="button"
        className={`sf-daily ${canClaim ? 'ready' : ''}`}
        data-testid="daily-reward"
        onClick={click(() => {
          const g = claimDaily();
          setClaimed(g ? t('daily.claimed', { c: g.coins, k: g.crystals }) : t('daily.tomorrow'));
          if (g) audio.pickup();
          setTimeout(() => setClaimed(null), 2600);
        })}
      >
        <Chest size={150} />
        <span className="sf-daily-txt">
          <b>{t('daily.title')}</b>
          <small>{canClaim ? t('daily.free') : t('daily.tomorrow')}</small>
          <em>+{DAILY_REWARD.coins} ₿ · +{DAILY_REWARD.crystals} ◆</em>
        </span>
        {canClaim && <span className="sf-alert">!</span>}
      </button>
      {claimed && <div className="sf-claim-toast">{claimed}</div>}

      {/* ── Bottom-center: play + tiles ── */}
      <div className="sf-center">
        <button
          type="button"
          className="sf-play"
          data-testid="play"
          onMouseEnter={() => audio.uiHover()}
          onClick={click(() => startMission(nextMission))}
        >
          <Icon name="play" size={44} />
          <span>{t('menu.startGame')}</span>
        </button>
        <div className="sf-tiles">
          {tiles.map((x) => (
            <button key={x.key} type="button" className={`sf-tile ${x.tone ?? ''}`} onMouseEnter={() => audio.uiHover()} onClick={click(() => go(x.to))}>
              <Icon name={x.icon} size={40} />
              <span>{t(x.key)}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Bottom-right: featured aircraft ── */}
      <button type="button" className="sf-feature" data-testid="feature-aircraft" onMouseEnter={() => audio.uiHover()} onClick={click(() => go({ id: 'aircraft' }))}>
        <span className="sf-feature-tag">{t('feature.newAircraft')}</span>
        <span className="sf-feature-art"><JetSilhouette width={190} color="#c8d2e6" accent="#ff7a3d" glow="#ff7a3d" /></span>
        <span className="sf-feature-name">Titan Destroyer</span>
        <span className="sf-feature-stars">★★★★★</span>
        <span className="sf-feature-arrow">›</span>
      </button>
      </div>
    </div>
  );
}
