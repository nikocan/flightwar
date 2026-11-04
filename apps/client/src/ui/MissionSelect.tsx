import { useState } from 'react';
import { CHAPTERS, MISSIONS, MISSIONS_PER_CHAPTER, missionKindFor, type Difficulty } from '@sfe/shared';
import { audio } from '../audio/AudioEngine';
import { useT } from '../i18n';
import { useApp } from '../state/app';
import { useProfile } from '../state/profile';
import { useSettings } from '../state/settings';
import { Stars } from './common';
import { MenuTopBar } from './MainMenu';
import { TabBar } from './TabBar';

/** Node positions (percent) for the 10-mission path: a gentle zig-zag like the sheet's "Bölüm Haritası". */
const NODE_POS: [number, number][] = [
  [8, 72], [20, 40], [32, 70], [44, 36], [55, 66], [64, 30], [74, 62], [83, 28], [91, 58], [92, 18],
];

export function MissionSelect() {
  const t = useT();
  const startMission = useApp((s) => s.startMission);
  const progress = useProfile((s) => s.missions);
  const difficulty = useSettings((s) => s.difficulty);
  const setSettings = useSettings((s) => s.set);
  const [chapter, setChapter] = useState(1);
  const [selected, setSelected] = useState('1-1');
  const mission = MISSIONS[selected];
  const chapterOpen = CHAPTERS[chapter - 1].availableInPhase <= 1;
  const click = (fn: () => void) => () => { audio.uiClick(); fn(); };

  const path = NODE_POS.map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${x} ${y}`).join(' ');

  return (
    <div className="screen c-screen c-sky" data-testid="mission-select">
      <MenuTopBar />
      <div className="c-chapters" role="tablist">
        {CHAPTERS.map((c) => (
          <button key={c.id} type="button" role="tab" aria-selected={c.id === chapter} className={`c-chip ${c.id === chapter ? 'active' : ''} ${c.availableInPhase > 1 ? 'locked' : ''}`} onClick={click(() => setChapter(c.id))}>
            <b>{c.id}</b> {t(c.nameKey)} {c.availableInPhase > 1 && '🔒'}
          </button>
        ))}
      </div>

      <main className="c-missions">
        <section className={`c-card c-map theme-${CHAPTERS[chapter - 1].theme}`}>
          <h3>{t('missions.chapter', { n: chapter })} — {t(CHAPTERS[chapter - 1].nameKey)}</h3>
          <div className="c-map-area">
            <svg className="c-map-path" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
              <path d={path} />
            </svg>
            {NODE_POS.map(([x, y], i) => {
              const id = `${chapter}-${i + 1}`;
              const def = MISSIONS[id];
              const kind = missionKindFor(i + 1);
              const prog = progress[id];
              return (
                <button
                  key={id}
                  type="button"
                  className={`c-node ${kind} ${selected === id ? 'selected' : ''} ${def ? '' : 'locked'}`}
                  style={{ left: `${x}%`, top: `${y}%` }}
                  disabled={!def}
                  data-testid={`mission-${id}`}
                  onClick={click(() => setSelected(id))}
                  aria-label={def ? `${id} ${t(def.nameKey)}` : `${id} ${t('missions.missionLocked')}`}
                >
                  <span className="c-node-num">{def ? i + 1 : '🔒'}</span>
                  {kind === 'boss' && <span className="c-node-tag">{t('missions.bossNode')}</span>}
                  {def && <Stars count={prog?.stars ?? 0} />}
                </button>
              );
            })}
          </div>
          <p className="c-map-note">
            {chapterOpen ? `${t('soon.phase', { phase: 3 })} — ${chapter}-2 … ${chapter}-${MISSIONS_PER_CHAPTER}` : t('missions.locked')}
          </p>
        </section>

        {mission && (
          <section className="c-card c-mission-sheet" key={mission.id}>
            <h2>{mission.id} · {t(mission.nameKey)}</h2>
            <div className="c-sheet-scroll">
              <p>{t(mission.briefingKey)}</p>
              <p className="c-objective">🎯 {t(mission.objectiveKey)}</p>
              <div className="c-star-rules">
                <span><Stars count={1} max={1} /> {t('result.star1')}</span>
                <span><Stars count={1} max={1} /> {t('result.star2', { n: Math.round(mission.stars.healthFor2 * 100) })}</span>
                <span><Stars count={1} max={1} /> {t('result.star3', { h: Math.round(mission.stars.healthFor3 * 100), k: Math.round(mission.stars.killRatioFor3 * 100) })}</span>
              </div>
              <div className="c-rewards">
                <span><span className="ch-coin sm">$</span> {mission.rewards.coins}+</span>
                <span>✦ {mission.rewards.xp} {t('common.xp')}</span>
                {!progress[mission.id]?.completed && <span><span className="ch-gem sm" /> {mission.rewards.firstClearCrystals}</span>}
              </div>
              {progress[mission.id]?.bestScore ? <p className="c-muted">{t('missions.best')}: <b>{progress[mission.id].bestScore.toLocaleString('tr-TR')}</b></p> : null}
            </div>
            <div className="c-seg" role="radiogroup" aria-label={t('missions.difficulty')}>
              {(['easy', 'normal', 'hard'] as Difficulty[]).map((d) => (
                <button key={d} type="button" role="radio" aria-checked={difficulty === d} className={difficulty === d ? 'on' : ''} onClick={click(() => setSettings({ difficulty: d }))}>
                  {t(`difficulty.${d}`)}
                </button>
              ))}
            </div>
            <button type="button" className="c-btn gold big" data-testid="start-mission" onClick={click(() => startMission(mission.id))}>
              ▶ {t('missions.start')}
            </button>
          </section>
        )}
      </main>
      <TabBar active="chapters" />
    </div>
  );
}
