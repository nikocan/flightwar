import { useT } from '../i18n';
import { useApp } from '../state/app';
import { Btn, TopBar } from './common';

export function ComingSoon({ titleKey, bodyKey, phase }: { titleKey: string; bodyKey: string; phase: number }) {
  const t = useT();
  const go = useApp((s) => s.go);
  return (
    <div className="screen" data-testid="coming-soon">
      <div className="bg-gradient" />
      <TopBar title={t(titleKey)} onBack={() => go({ id: 'menu' })} />
      <div className="panel holo-edge center-box anim-up">
        <div style={{ fontSize: 46 }}>🛠</div>
        <h2 style={{ fontFamily: 'var(--font-display)' }}>{t('soon.title')}</h2>
        <p style={{ lineHeight: 1.6 }}>{t(bodyKey)}</p>
        <p className="muted">{t('soon.phase', { phase })}</p>
        <p className="muted" style={{ fontSize: 13 }}>{t('soon.body')}</p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 10, flexWrap: 'wrap' }}>
          <Btn onClick={() => go({ id: 'updates' })}>📰 {t('menu.updates')}</Btn>
          <Btn className="btn-primary" onClick={() => go({ id: 'missions' })}>▶ {t('menu.play')}</Btn>
        </div>
      </div>
    </div>
  );
}
