import type { ReactNode } from 'react';
import { xpForLevel } from '@sfe/shared';
import { audio } from '../audio/AudioEngine';
import { useT } from '../i18n';
import { useProfile } from '../state/profile';

export function Stars({ count, max = 3, big = false }: { count: number; max?: number; big?: boolean }) {
  return (
    <div className="stars" aria-label={`${count}/${max}`}>
      {Array.from({ length: max }, (_, i) => (
        <span key={i} className={`star ${i < count ? 'on' : ''} ${big ? 'big' : ''}`} style={big ? { animationDelay: `${0.25 + i * 0.25}s` } : undefined} />
      ))}
    </div>
  );
}

export function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      className={`toggle ${on ? 'on' : ''}`}
      onClick={() => {
        audio.uiClick();
        onChange(!on);
      }}
    />
  );
}

/** Button that plays UI sounds. */
export function Btn(props: React.ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode }) {
  const { onClick, onMouseEnter, className = '', ...rest } = props;
  return (
    <button
      type="button"
      {...rest}
      className={`btn ${className}`}
      onMouseEnter={(e) => {
        audio.uiHover();
        onMouseEnter?.(e);
      }}
      onClick={(e) => {
        audio.uiClick();
        onClick?.(e);
      }}
    />
  );
}

export function Currency() {
  const coins = useProfile((s) => s.coins);
  const crystals = useProfile((s) => s.crystals);
  const t = useT();
  return (
    <div className="currency">
      <div className="pill panel" title={t('common.coins')} data-testid="coins">
        <span className="coin" /> {coins.toLocaleString('tr-TR')}
      </div>
      <div className="pill panel" title={t('common.crystals')} data-testid="crystals">
        <span className="crystal" /> {crystals.toLocaleString('tr-TR')}
      </div>
    </div>
  );
}

export function ProfileChip() {
  const t = useT();
  const { pilotName, level, xp } = useProfile();
  const need = xpForLevel(level);
  return (
    <div className="profile-chip panel holo-edge" data-testid="profile">
      <div className="avatar">{level}</div>
      <div>
        <div style={{ fontWeight: 800 }}>{pilotName}</div>
        <div className="muted" style={{ fontSize: 12 }}>
          {t('menu.level')} {level} · {xp}/{need} {t('common.xp')}
        </div>
        <div className="xpbar">
          <i style={{ width: `${Math.min(100, (xp / need) * 100)}%` }} />
        </div>
      </div>
    </div>
  );
}

export function TopBar({ title, onBack }: { title?: string; onBack?: () => void }) {
  const t = useT();
  return (
    <div className="topbar">
      {onBack ? (
        <div className="page-head">
          <Btn className="btn-icon" onClick={onBack} aria-label={t('common.back')}>
            ←
          </Btn>
          {title && <h1 className="page-title">{title}</h1>}
        </div>
      ) : (
        <ProfileChip />
      )}
      <Currency />
    </div>
  );
}
