import { getMission } from '@sfe/shared';
import { getActiveController } from '../game/GameController';
import { useT } from '../i18n';
import { useApp } from '../state/app';
import { Btn, Stars } from './common';

const fmtTime = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

export function ResultScreen() {
  const t = useT();
  const outcome = useApp((s) => s.lastOutcome);
  const go = useApp((s) => s.go);
  if (!outcome) return null;
  const { victory, stats, grant } = outcome;
  const mission = getMission(outcome.missionId);

  return (
    <div className="overlay" data-testid="result-screen">
      <div className={`panel holo-edge dialog result ${victory ? 'victory' : 'defeat'}`}>
        <h1 data-testid="result-title">{victory ? t('result.victory') : t('result.defeat')}</h1>
        {mission && <div className="muted">{mission.id} · {t(mission.nameKey)}</div>}
        {victory ? (
          <div className="result-stars">
            <Stars count={grant.stars} big />
          </div>
        ) : (
          <p style={{ lineHeight: 1.5 }}>{t('result.defeatHint')}</p>
        )}
        {outcome.newBest && <div className="new-best">★ {t('result.newBest')} ★</div>}
        <div className="stat-grid">
          <div className="stat"><span className="hud-label">{t('result.score')}</span><b data-testid="result-score">{stats.score.toLocaleString('tr-TR')}</b></div>
          <div className="stat"><span className="hud-label">{t('result.kills')}</span><b>{stats.kills}</b></div>
          <div className="stat"><span className="hud-label">{t('result.accuracy')}</span><b>%{Math.round(stats.accuracy * 100)}</b></div>
          <div className="stat"><span className="hud-label">{t('result.maxCombo')}</span><b>x{stats.maxCombo}</b></div>
          <div className="stat"><span className="hud-label">{t('result.time')}</span><b>{fmtTime(stats.time)}</b></div>
        </div>
        <div className="section-title">{t('result.rewards')}</div>
        <div className="reward-row" style={{ justifyContent: 'center' }} data-testid="result-rewards">
          <span className="reward"><span className="coin" /> +{grant.coins}</span>
          <span className="reward">✦ +{grant.xp} {t('common.xp')}</span>
          {grant.crystals > 0 && <span className="reward"><span className="crystal" /> +{grant.crystals}</span>}
        </div>
        {outcome.levelAfter > outcome.levelBefore && <div className="level-up">⬆ {t('result.levelUp', { n: outcome.levelAfter })}</div>}
        <div className="result-actions">
          <Btn className={victory ? '' : 'btn-primary'} onClick={() => getActiveController()?.restart()} data-testid="retry">
            ↻ {t('result.retry')}
          </Btn>
          <Btn className={victory ? 'btn-gold' : ''} onClick={() => go({ id: 'missions' })} data-testid="to-missions">
            🗺 {t('result.missions')}
          </Btn>
          <Btn onClick={() => go({ id: 'menu' })} data-testid="to-menu">⌂ {t('result.menu')}</Btn>
        </div>
      </div>
    </div>
  );
}
