import type { Difficulty } from '@sfe/shared';
import { LOCALES, useT } from '../i18n';
import { useApp } from '../state/app';
import { useProfile } from '../state/profile';
import { useSettings, type Quality } from '../state/settings';
import { Btn, Toggle, TopBar } from './common';

function Range({ value, onChange, min = 0, max = 1, step = 0.05, label }: { value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number; label: string }) {
  return (
    <input type="range" aria-label={label} min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} />
  );
}

/** Settings content, reused by the menu screen and the in-game pause overlay. */
export function SettingsPanel({ inGame = false }: { inGame?: boolean }) {
  const t = useT();
  const s = useSettings();
  const reset = useProfile((p) => p.reset);
  const qualities: Quality[] = ['low', 'medium', 'high', 'ultra'];
  return (
    <div className="settings">
      <div className="panel setting-group">
        <div className="section-title" style={{ marginTop: 0 }}>{t('settings.graphics')}</div>
        <div className="setting" style={{ flexWrap: 'wrap' }}>
          <span>{t('settings.quality')}{inGame && <span className="hint">↻</span>}</span>
          <div className="seg" style={{ minWidth: 260 }}>
            {qualities.map((q) => (
              <Btn key={q} className={s.quality === q ? 'on' : ''} onClick={() => s.set({ quality: q })} data-testid={`quality-${q}`}>
                {t(`settings.quality.${q}`)}
              </Btn>
            ))}
          </div>
        </div>
        <div className="setting">
          <span>{t('settings.cameraShake')}</span>
          <Toggle label={t('settings.cameraShake')} on={s.cameraShake} onChange={(v) => s.set({ cameraShake: v })} />
        </div>
        <div className="setting">
          <span>{t('settings.showFps')}</span>
          <Toggle label={t('settings.showFps')} on={s.showFps} onChange={(v) => s.set({ showFps: v })} />
        </div>
      </div>

      <div className="panel setting-group">
        <div className="section-title" style={{ marginTop: 0 }}>{t('settings.audio')}</div>
        <div className="setting"><span>{t('settings.music')}</span><Range label={t('settings.music')} value={s.musicVolume} onChange={(v) => s.set({ musicVolume: v })} /></div>
        <div className="setting"><span>{t('settings.sfx')}</span><Range label={t('settings.sfx')} value={s.sfxVolume} onChange={(v) => s.set({ sfxVolume: v })} /></div>
        <div className="setting"><span>{t('settings.ui')}</span><Range label={t('settings.ui')} value={s.uiVolume} onChange={(v) => s.set({ uiVolume: v })} /></div>
      </div>

      <div className="panel setting-group">
        <div className="section-title" style={{ marginTop: 0 }}>{t('settings.gameplay')}</div>
        {!inGame && (
          <div className="setting" style={{ flexWrap: 'wrap' }}>
            <span>{t('settings.difficulty')}</span>
            <div className="seg" style={{ minWidth: 240 }}>
              {(['easy', 'normal', 'hard'] as Difficulty[]).map((d) => (
                <Btn key={d} className={s.difficulty === d ? 'on' : ''} onClick={() => s.set({ difficulty: d })}>
                  {t(`difficulty.${d}`)}
                </Btn>
              ))}
            </div>
          </div>
        )}
        <div className="setting">
          <span>{t('settings.autoFire')}<span className="hint">{t('settings.autoFire.hint')}</span></span>
          <Toggle label={t('settings.autoFire')} on={s.autoFire} onChange={(v) => s.set({ autoFire: v })} />
        </div>
        <div className="setting">
          <span>{t('settings.aimAssist')}<span className="hint">{t('settings.aimAssist.hint')}</span></span>
          <Toggle label={t('settings.aimAssist')} on={s.aimAssist} onChange={(v) => s.set({ aimAssist: v })} />
        </div>
        <div className="setting">
          <span>{t('settings.sensitivity')} ({s.sensitivity.toFixed(2)})</span>
          <Range label={t('settings.sensitivity')} min={0.5} max={1.5} value={s.sensitivity} onChange={(v) => s.set({ sensitivity: v })} />
        </div>
      </div>

      <div className="panel setting-group">
        <div className="section-title" style={{ marginTop: 0 }}>{t('settings.controls')}</div>
        <div className="setting">
          <span>{t('settings.leftHanded')}</span>
          <Toggle label={t('settings.leftHanded')} on={s.leftHanded} onChange={(v) => s.set({ leftHanded: v })} />
        </div>
        <div className="setting">
          <span>{t('settings.buttonScale')} ({Math.round(s.buttonScale * 100)}%)</span>
          <Range label={t('settings.buttonScale')} min={0.8} max={1.3} value={s.buttonScale} onChange={(v) => s.set({ buttonScale: v })} />
        </div>
      </div>

      {!inGame && (
        <div className="panel setting-group">
          <div className="setting" style={{ flexWrap: 'wrap' }}>
            <span>{t('settings.language')}</span>
            <div className="seg" style={{ minWidth: 240 }}>
              {LOCALES.map((l) => (
                <Btn key={l.id} className={s.locale === l.id ? 'on' : ''} onClick={() => s.set({ locale: l.id })}>
                  {l.label}
                </Btn>
              ))}
            </div>
          </div>
          <div className="setting">
            <span />
            <Btn
              className="btn-danger"
              onClick={() => {
                if (window.confirm(t('settings.resetConfirm'))) reset();
              }}
            >
              {t('settings.reset')}
            </Btn>
          </div>
        </div>
      )}
    </div>
  );
}

export function SettingsScreen() {
  const t = useT();
  const go = useApp((s) => s.go);
  const artLink = (
    <div className="settings" style={{ paddingTop: 0 }}>
      <Btn onClick={() => go({ id: 'artStatus' })} data-testid="art-status-link">🎨 Grafik Paketi Durumu</Btn>
    </div>
  );
  return (
    <div className="screen" data-testid="settings">
      <div className="bg-gradient" />
      <TopBar title={t('settings.title')} onBack={() => go({ id: 'menu' })} />
      <div className="page screen-scroll">
        <SettingsPanel />
        {artLink}
      </div>
    </div>
  );
}
