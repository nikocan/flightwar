import { useState } from 'react';
import { AIRCRAFT, MISSIONS, xpForLevel } from '@sfe/shared';
import { audio } from '../audio/AudioEngine';
import { APP_VERSION } from '../data/changelog';
import { artUrl } from '../game/assets/artSprites';
import { useT } from '../i18n';
import { useApp } from '../state/app';
import { DAILY_REWARD, useProfile } from '../state/profile';
import { Chest, Icon, PilotAvatar } from './art';
import { MenuBackdrop } from './MenuBackdrop';
import { TabBar } from './TabBar';

const fmt = (n: number) => n.toLocaleString('tr-TR');

/** Shared top bar for menu screens: logo, pilot, currencies, updates and settings. */
export function MenuTopBar() {
  const t = useT();
  const go = useApp((s) => s.go);
  const { pilotName, level, xp, coins, crystals, lastSeenVersion } = useProfile();
  const need = xpForLevel(level);
  return (
    <header className="c-topbar">
      <div className="c-logo" aria-label="Sky Force Evolution">
        <span className="c-logo-1">SKY FORCE</span>
        <span className="c-logo-2">EVOLUTION</span>
      </div>
      <div className="c-pilot" data-testid="profile">
        <div className="c-pilot-avatar"><PilotAvatar size={44} /></div>
        <div className="c-pilot-info">
          <b>{pilotName}</b>
          <span>{t('menu.level')} {level}</span>
          <div className="c-xp"><i style={{ width: `${Math.min(100, (xp / need) * 100)}%` }} /><em>XP {fmt(xp)} / {fmt(need)}</em></div>
        </div>
      </div>
      <div className="c-top-right">
        <div className="c-pill" data-testid="coins"><span className="ch-coin">$</span>{fmt(coins)}</div>
        <div className="c-pill" data-testid="crystals"><span className="ch-gem" />{fmt(crystals)}</div>
        <button type="button" className="c-round" aria-label={t('menu.updates')} data-testid="menu-updates" onClick={() => { audio.uiClick(); go({ id: 'updates' }); }}>
          <Icon name="mail" size={22} />
          {lastSeenVersion !== APP_VERSION && <span className="c-badge">!</span>}
        </button>
        <button type="button" className="c-round" aria-label={t('menu.settings')} data-testid="menu-settings" onClick={() => { audio.uiClick(); go({ id: 'settings', from: 'menu' }); }}>
          <Icon name="gear" size={22} />
        </button>
      </div>
    </header>
  );
}

function StatRow({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  return (
    <div className="c-stat">
      <span>{label}</span>
      <div className="c-stat-bar"><i style={{ width: `${Math.min(100, (value / max) * 100)}%`, background: color }} /></div>
    </div>
  );
}

export function MainMenu() {
  const t = useT();
  const go = useApp((s) => s.go);
  const startMission = useApp((s) => s.startMission);
  const missions = useProfile((s) => s.missions);
  const selected = useProfile((s) => s.selectedAircraft);
  const canClaim = useProfile((s) => s.canClaimDaily());
  const claimDaily = useProfile((s) => s.claimDaily);
  const [toast, setToast] = useState<string | null>(null);
  const ac = AIRCRAFT[selected];
  const nextMission = Object.keys(MISSIONS).find((id) => !missions[id]?.completed) ?? '1-1';
  const nextDef = MISSIONS[nextMission];
  const aircraftImg = artUrl('falcon-x1') ?? '/game-assets/aircraft/falcon-x1.svg';

  return (
    <div className="screen c-screen" data-testid="main-menu">
      <MenuBackdrop />
      <MenuTopBar />

      <main className="c-menu-body">
        <section className="c-card c-daily" aria-label={t('daily.title')}>
          <h3>{t('daily.title')}</h3>
          <div className="c-daily-chest"><Chest size={118} /></div>
          <p>+{DAILY_REWARD.coins} <span className="ch-coin sm">$</span> · +{DAILY_REWARD.crystals} <span className="ch-gem sm" /></p>
          <button
            type="button"
            className={`c-btn ${canClaim ? 'green' : 'disabled'}`}
            data-testid="daily-reward"
            onClick={() => {
              audio.uiClick();
              const g = claimDaily();
              setToast(g ? t('daily.claimed', { c: g.coins, k: g.crystals }) : t('daily.tomorrow'));
              if (g) audio.pickup();
              setTimeout(() => setToast(null), 2600);
            }}
          >
            {canClaim ? t('daily.claim') : t('daily.tomorrow')}
          </button>
          {canClaim && <span className="c-badge corner">!</span>}
        </section>

        <div className="c-menu-center">
          <div className="c-next">
            <span>{t('missions.chapter', { n: nextDef?.chapter ?? 1 })} · {nextDef ? t(nextDef.nameKey) : ''}</span>
          </div>
          <button
            type="button"
            className="c-play"
            data-testid="play"
            onMouseEnter={() => audio.uiHover()}
            onClick={() => { audio.uiClick(); startMission(nextMission); }}
          >
            <Icon name="play" size={36} />
            <span>{t('menu.playShort')}</span>
          </button>
          <button type="button" className="c-link" data-testid="nav-missions" onClick={() => { audio.uiClick(); go({ id: 'missions' }); }}>
            🗺 {t('menu.chapterMap')}
          </button>
        </div>

        <section className="c-card c-hangar" aria-label={t('menu.hangar')}>
          <header>
            <h3>{t('menu.hangar')}</h3>
            <button type="button" className="c-round sm" aria-label={t('menu.hangar')} data-testid="nav-hangar" onClick={() => { audio.uiClick(); go({ id: 'aircraft' }); }}>
              <Icon name="play" size={16} />
            </button>
          </header>
          <div className="c-hangar-body">
            <div className="c-hangar-art"><img src={aircraftImg} alt={ac.name} /></div>
            <div className="c-hangar-info">
              <b>{ac.name}</b>
              <span className="c-stars">★★★★★</span>
              <StatRow label={t('stat.health')} value={ac.stats.health} max={300} color="linear-gradient(90deg,#ff6fae,#ff3b6b)" />
              <StatRow label={t('stat.speed')} value={ac.stats.speed} max={150} color="linear-gradient(90deg,#7fe8ff,#2fa8ff)" />
              <StatRow label={t('stat.firepower')} value={ac.stats.firepower} max={170} color="linear-gradient(90deg,#ffe07a,#ffa41b)" />
              <StatRow label={t('stat.armor')} value={ac.stats.armor} max={50} color="linear-gradient(90deg,#c6a8ff,#8b5cf6)" />
            </div>
          </div>
        </section>
      </main>

      {toast && <div className="c-toast">{toast}</div>}
      <TabBar active="home" />
    </div>
  );
}
