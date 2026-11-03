import { useState } from 'react';
import { getActiveController } from '../game/GameController';
import { useT } from '../i18n';
import { useApp } from '../state/app';
import { Btn } from './common';
import { SettingsPanel } from './SettingsScreen';

export function PauseMenu() {
  const t = useT();
  const go = useApp((s) => s.go);
  const [settings, setSettings] = useState(false);

  if (settings) {
    return (
      <div className="overlay screen-scroll" style={{ alignItems: 'start', overflowY: 'auto' }}>
        <div style={{ width: '100%' }}>
          <div className="page-head" style={{ justifyContent: 'center', margin: '8px 0 12px' }}>
            <Btn className="btn-icon" onClick={() => setSettings(false)} aria-label={t('common.back')}>←</Btn>
            <h2 className="page-title">{t('pause.settings')}</h2>
          </div>
          <SettingsPanel inGame />
        </div>
      </div>
    );
  }

  return (
    <div className="overlay" data-testid="pause-menu">
      <div className="panel holo-edge dialog">
        <h2>{t('pause.title')}</h2>
        <Btn className="btn-primary" onClick={() => getActiveController()?.togglePause(false)} data-testid="resume">
          ▶ {t('pause.resume')}
        </Btn>
        <Btn onClick={() => getActiveController()?.restart()} data-testid="restart">↻ {t('pause.restart')}</Btn>
        <Btn onClick={() => setSettings(true)}>⚙ {t('pause.settings')}</Btn>
        <Btn className="btn-danger" onClick={() => go({ id: 'missions' })} data-testid="quit">✕ {t('pause.quit')}</Btn>
        <p className="muted" style={{ fontSize: 12, textAlign: 'center', marginBottom: 0 }}>{t('hud.controls')}</p>
      </div>
    </div>
  );
}
