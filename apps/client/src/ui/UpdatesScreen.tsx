import { useEffect } from 'react';
import { APP_VERSION, CHANGELOG, ROADMAP } from '../data/changelog';
import { useT } from '../i18n';
import { useApp } from '../state/app';
import { useProfile } from '../state/profile';
import { TopBar } from './common';

/** In-game changelog so players can follow every update from inside the game. */
export function UpdatesScreen() {
  const t = useT();
  const go = useApp((s) => s.go);
  const markSeen = useProfile((s) => s.markVersionSeen);
  useEffect(() => markSeen(APP_VERSION), [markSeen]);

  return (
    <div className="screen" data-testid="updates">
      <div className="bg-gradient" />
      <TopBar title={t('updates.title')} onBack={() => go({ id: 'menu' })} />
      <div className="page screen-scroll">
        <div className="updates">
          <p className="muted" style={{ margin: 0 }}>
            {t('updates.subtitle')} {t('updates.current')}: <b style={{ color: 'var(--blue-bright)' }}>v{APP_VERSION}</b>
          </p>
          {CHANGELOG.map((rel, i) => (
            <article key={rel.version} className="panel holo-edge release anim-up" style={{ animationDelay: `${i * 0.06}s` }}>
              <div className="release-head">
                <span className="badge badge-new">v{rel.version}</span>
                <h3>{rel.title}</h3>
                <span className="muted" style={{ marginLeft: 'auto', fontSize: 13 }}>
                  {new Date(rel.date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
                </span>
              </div>
              <ul>
                {rel.highlights.map((h) => (
                  <li key={h}>{h}</li>
                ))}
              </ul>
            </article>
          ))}
          <div className="section-title">{t('updates.roadmap')}</div>
          <div className="panel roadmap">
            {ROADMAP.map((r) => (
              <div key={r.phase} className={`road ${r.status}`}>
                <span className="dot">{r.status === 'done' ? '✓' : r.phase}</span>
                <span style={{ flex: 1 }}>
                  <b>Faz {r.phase}</b> — {r.title}
                </span>
                <span className={`badge ${r.status === 'done' ? 'badge-gold' : r.status === 'next' ? 'badge-new' : 'badge-soon'}`}>
                  {t(r.status === 'done' ? 'updates.done' : r.status === 'next' ? 'updates.inProgress' : 'updates.planned')}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
