import { useState } from 'react';
import { CHAPTERS, MISSIONS, MISSIONS_PER_CHAPTER, missionKindFor, type Difficulty } from '@sfe/shared';
import { useApp } from '../state/app';
import { useProfile } from '../state/profile';
import { useSettings } from '../state/settings';
import { useT } from '../i18n';
import { Btn, Stars, TopBar } from './common';

export function MissionSelect() {
  const t = useT();
  const go = useApp((s) => s.go);
  const startMission = useApp((s) => s.startMission);
  const progress = useProfile((s) => s.missions);
  const difficulty = useSettings((s) => s.difficulty);
  const setSettings = useSettings((s) => s.set);
  const [chapter, setChapter] = useState(1);
  const [selected, setSelected] = useState('1-1');
  const mission = MISSIONS[selected];
  const chapterDef = CHAPTERS[chapter - 1];
  const chapterOpen = chapterDef.availableInPhase <= 1;

  return (
    <div className="screen" data-testid="mission-select">
      <div className="bg-gradient" />
      <TopBar title={t('missions.title')} onBack={() => go({ id: 'menu' })} />
      <div className="page screen-scroll">
        <div className="chapters">
          {CHAPTERS.map((c) => (
            <Btn key={c.id} className={`chapter-tab ${c.id === chapter ? 'active' : ''}`} onClick={() => setChapter(c.id)}>
              <small>{t('missions.chapter', { n: c.id })}</small>
              <span>
                {c.availableInPhase > 1 && '🔒 '}
                {t(c.nameKey)}
              </span>
            </Btn>
          ))}
        </div>
        <div className="missions-layout">
          <div className="panel mission-map">
            {Array.from({ length: MISSIONS_PER_CHAPTER }, (_, i) => {
              const id = `${chapter}-${i + 1}`;
              const def = MISSIONS[id];
              const kind = missionKindFor(i + 1);
              const prog = progress[id];
              return (
                <Btn
                  key={id}
                  className={`mission-node ${kind} ${selected === id ? 'selected' : ''}`}
                  disabled={!def}
                  onClick={() => setSelected(id)}
                  data-testid={`mission-${id}`}
                  title={def ? t(def.nameKey) : t('missions.missionLocked')}
                >
                  {kind !== 'standard' && <span className={`tag badge ${kind === 'boss' ? 'badge-new' : 'badge-gold'}`}>{kind === 'boss' ? t('missions.boss') : '★'}</span>}
                  {def ? `${chapter}-${i + 1}` : '🔒'}
                  <Stars count={prog?.stars ?? 0} />
                </Btn>
              );
            })}
            {!chapterOpen && (
              <div className="muted" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: 12 }}>
                {t('missions.locked')}
              </div>
            )}
            {chapterOpen && (
              <div className="muted" style={{ gridColumn: '1 / -1', textAlign: 'center', fontSize: 13 }}>
                {t('soon.phase', { phase: 3 })} — 1-2 … 1-10
              </div>
            )}
          </div>

          {mission && (
            <div className="panel holo-edge mission-detail anim-up" key={mission.id}>
              <span className="badge badge-gold" style={{ alignSelf: 'flex-start' }}>
                {t('missions.chapter', { n: mission.chapter })} · {t(CHAPTERS[mission.chapter - 1].nameKey)}
              </span>
              <h2>
                {mission.id} · {t(mission.nameKey)}
              </h2>
              <div className="section-title" style={{ margin: '6px 0 0' }}>{t('missions.briefing')}</div>
              <p style={{ margin: 0, lineHeight: 1.5 }}>{t(mission.briefingKey)}</p>
              <div className="section-title" style={{ margin: '6px 0 0' }}>{t('missions.objective')}</div>
              <p style={{ margin: 0 }}>🎯 {t(mission.objectiveKey)}</p>
              <div className="star-rules">
                <div><Stars count={1} max={1} /> {t('result.star1')}</div>
                <div><Stars count={1} max={1} /> {t('result.star2', { n: Math.round(mission.stars.healthFor2 * 100) })}</div>
                <div><Stars count={1} max={1} /> {t('result.star3', { h: Math.round(mission.stars.healthFor3 * 100), k: Math.round(mission.stars.killRatioFor3 * 100) })}</div>
              </div>
              <div className="section-title" style={{ margin: '6px 0 0' }}>{t('missions.rewards')}</div>
              <div className="reward-row">
                <span className="reward"><span className="coin" /> {mission.rewards.coins}+</span>
                <span className="reward">✦ {mission.rewards.xp} {t('common.xp')}</span>
                {!progress[mission.id]?.completed && (
                  <span className="reward"><span className="crystal" /> {mission.rewards.firstClearCrystals}</span>
                )}
              </div>
              {progress[mission.id]?.bestScore ? (
                <div className="muted">
                  {t('missions.best')}: <b style={{ color: 'var(--text)' }}>{progress[mission.id].bestScore.toLocaleString('tr-TR')}</b>
                </div>
              ) : null}
              <div className="section-title" style={{ margin: '6px 0 0' }}>{t('missions.difficulty')}</div>
              <div className="seg">
                {(['easy', 'normal', 'hard'] as Difficulty[]).map((d) => (
                  <Btn key={d} className={difficulty === d ? 'on' : ''} onClick={() => setSettings({ difficulty: d })}>
                    {t(`difficulty.${d}`)}
                  </Btn>
                ))}
              </div>
              <Btn className="btn-primary btn-lg start-btn" onClick={() => startMission(mission.id)} data-testid="start-mission">
                ▶ {t('common.start')}
              </Btn>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
