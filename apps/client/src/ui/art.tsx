/** Original vector art used by the menu (icons, avatar, chest, logo wings, jet silhouettes). */
import type { CSSProperties } from 'react';

type IconName =
  | 'home' | 'target' | 'plane' | 'rocket' | 'upgrade' | 'box' | 'trophy' | 'bars' | 'calendar'
  | 'play' | 'globe' | 'users' | 'swords' | 'cart' | 'gift' | 'ticket' | 'mail' | 'gear' | 'friends' | 'plus' | 'check' | 'news';

const P: Record<IconName, string> = {
  home: 'M3 11 12 3l9 8v10h-6v-6H9v6H3z',
  target: 'M12 2a10 10 0 1 0 10 10h-2a8 8 0 1 1-8-8zm0 4a6 6 0 1 0 6 6h-2a4 4 0 1 1-4-4zm0 4a2 2 0 1 0 2 2zM15 3l2 4 4 1-5 5-1-1 4-4-3-1-1-3z',
  plane: 'M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5z',
  rocket: 'M14 3c4 0 7 3 7 7l-7 7-4-4zM9 14l1 1-5 5-1-1zM6 10l3-1 6 6-1 3z',
  upgrade: 'M12 2 4 10h5v4h6v-4h5zM9 16h6v2H9zm0 4h6v2H9z',
  box: 'M3 7l9-4 9 4v3H3zm1 4h16v10H4zm6 2v2h4v-2z',
  trophy: 'M7 3h10v2h4v3a5 5 0 0 1-5 5 5 5 0 0 1-3 2v3h3v3H8v-3h3v-3a5 5 0 0 1-3-2 5 5 0 0 1-5-5V5h4zM5 7v1a3 3 0 0 0 2 3V7zm12 0v4a3 3 0 0 0 2-3V7z',
  bars: 'M4 14h4v7H4zm6-6h4v13h-4zm6-5h4v18h-4z',
  calendar: 'M7 2h2v2h6V2h2v2h3v17H4V4h3zM6 9v10h12V9zm5 2 1.2 2.4 2.6.4-1.9 1.8.5 2.6-2.4-1.3-2.3 1.3.4-2.6-1.9-1.8 2.6-.4z',
  play: 'M7 4v16l13-8z',
  globe: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm6.9 9h-3a15 15 0 0 0-1.3-6 8 8 0 0 1 4.3 6zM12 4c.9 1.2 1.7 3.6 1.9 7h-3.8c.2-3.4 1-5.8 1.9-7zM9.4 5a15 15 0 0 0-1.3 6h-3a8 8 0 0 1 4.3-6zM5.1 13h3a15 15 0 0 0 1.3 6 8 8 0 0 1-4.3-6zM12 20c-.9-1.2-1.7-3.6-1.9-7h3.8c-.2 3.4-1 5.8-1.9 7zm2.6-1a15 15 0 0 0 1.3-6h3a8 8 0 0 1-4.3 6z',
  users: 'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm8 0a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM1 20c0-4 4-7 8-7s8 3 8 7zm16.5-6.5c3 .3 5.5 2.6 5.5 6.5h-4.5c0-2.6-.4-4.8-1-6.5z',
  swords: 'M3 3h4l9 9-2 2-9-9zm18 0v4l-9 9-2-2 9-9zM4 17l3 3-2 2-3-3zm16 0 2 2-2 2-3-3zM6 14l4 4-2 2-4-4zm12 0 2 2-4 4-2-2z',
  cart: 'M2 3h3l3 11h10l3-8H7M9 19a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zm8 0a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3z',
  gift: 'M3 9h18v4H3zm1 5h7v8H4zm9 0h7v8h-7zM12 8C10 4 6 3 6 6s4 2 6 2zm0 0c2-4 6-5 6-2s-4 2-6 2z',
  ticket: 'M12 2l2.9 6.3 6.9.7-5.2 4.6 1.5 6.8L12 17l-6.1 3.4 1.5-6.8L2.2 9l6.9-.7z',
  mail: 'M2 5h20v14H2zm2 2v.5l8 5.5 8-5.5V7l-8 5.5z',
  gear: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zm9 5.5v-3l-2.4-.6a7 7 0 0 0-.8-1.9l1.3-2.1-2.1-2.1-2.1 1.3a7 7 0 0 0-1.9-.8L12.5 2h-3l-.6 2.4a7 7 0 0 0-1.9.8L4.9 3.9 2.8 6l1.3 2.1a7 7 0 0 0-.8 1.9L1 10.5v3l2.4.6c.2.7.5 1.3.8 1.9l-1.3 2.1L5 20.2l2.1-1.3c.6.3 1.2.6 1.9.8l.6 2.3h3l.6-2.4c.7-.2 1.3-.5 1.9-.8l2.1 1.3 2.1-2.1-1.3-2.1c.3-.6.6-1.2.8-1.9z',
  friends: 'M8 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm8 0a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM0 21c0-4 3.5-7 8-7 1.6 0 3 .4 4 1-1.3 1.3-2 3.3-2 6zm12 0c0-4 1.8-7 4-7s8 2 8 7z',
  plus: 'M10 3h4v7h7v4h-7v7h-4v-7H3v-4h7z',
  check: 'M4 12l5 5L20 6l-2-2-9 9-3-3z',
  news: 'M3 4h15v14a2 2 0 0 0 2 2H5a2 2 0 0 1-2-2zm17 4h2v10a2 2 0 0 1-4 0V8zM6 7v4h9V7zm0 6v2h9v-2zm0 3v1h6v-1z',
};

export function Icon({ name, size = 24, style, className }: { name: IconName; size?: number; style?: CSSProperties; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" style={style} className={className} aria-hidden>
      <path d={P[name]} fillRule="evenodd" />
    </svg>
  );
}

export type { IconName };

/** Helmeted pilot portrait. */
export function PilotAvatar({ size = 84 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden>
      <defs>
        <radialGradient id="pa-bg" cx="50%" cy="35%" r="70%"><stop offset="0" stopColor="#3a7bd5" /><stop offset="1" stopColor="#0b1530" /></radialGradient>
        <linearGradient id="pa-helm" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#5d6b80" /><stop offset="1" stopColor="#1d2533" /></linearGradient>
        <linearGradient id="pa-visor" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#7fe8ff" /><stop offset=".5" stopColor="#2563eb" /><stop offset="1" stopColor="#9b5cff" /></linearGradient>
      </defs>
      <rect width="100" height="100" rx="18" fill="url(#pa-bg)" />
      <path d="M14 100c2-18 16-28 36-28s34 10 36 28z" fill="#2c3a2e" />
      <path d="M34 78h32l-4 14H38z" fill="#55663f" />
      <ellipse cx="50" cy="44" rx="27" ry="29" fill="url(#pa-helm)" />
      <path d="M26 40c4-18 44-18 48 0l-2 10H28z" fill="#3b4658" />
      <path d="M27 42h46c0 9-6 15-23 15S27 51 27 42z" fill="url(#pa-visor)" />
      <path d="M33 45c5-3 12-3 15 0" stroke="#fff" strokeOpacity=".7" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <path d="M36 60c4 8 24 8 28 0v10H36z" fill="#1d2533" />
      <rect x="44" y="18" width="12" height="8" rx="2" fill="#ffd23f" />
    </svg>
  );
}

/** Gold rank emblem. */
export function RankBadge({ size = 64 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden>
      <defs>
        <linearGradient id="rb-g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fff2a8" /><stop offset=".5" stopColor="#ffc93c" /><stop offset="1" stopColor="#b8750a" /></linearGradient>
        <linearGradient id="rb-b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#3a6ff2" /><stop offset="1" stopColor="#0e2a7a" /></linearGradient>
      </defs>
      <path d="M2 26l14 4-4 8 12-2 8 12 8-12 12 2-4-8 14-4-18-6-12-16-12 16z" fill="url(#rb-g)" opacity=".85" />
      <path d="M32 12l12 8v14l-12 10-12-10V20z" fill="url(#rb-b)" stroke="url(#rb-g)" strokeWidth="3" />
      <path d="M32 19l2.6 5.4 5.9.8-4.3 4.1 1 5.8-5.2-2.8-5.2 2.8 1-5.8-4.3-4.1 5.9-.8z" fill="url(#rb-g)" />
    </svg>
  );
}

/** Daily reward chest (fixed, visible contents — not a random loot box). */
export function Chest({ size = 150 }: { size?: number }) {
  return (
    <svg width={size} height={size * 0.8} viewBox="0 0 150 120" aria-hidden>
      <defs>
        <linearGradient id="ch-wood" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#a8622a" /><stop offset="1" stopColor="#5a2f12" /></linearGradient>
        <linearGradient id="ch-gold" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fff2a8" /><stop offset=".5" stopColor="#ffc93c" /><stop offset="1" stopColor="#b8750a" /></linearGradient>
        <radialGradient id="ch-glow" cx="50%" cy="40%" r="60%"><stop offset="0" stopColor="#ff9cf5" stopOpacity=".95" /><stop offset="1" stopColor="#9b5cff" stopOpacity="0" /></radialGradient>
        <linearGradient id="ch-gem" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#ffd6ff" /><stop offset=".5" stopColor="#d24dff" /><stop offset="1" stopColor="#6a1fb5" /></linearGradient>
      </defs>
      <ellipse cx="75" cy="44" rx="70" ry="40" fill="url(#ch-glow)" />
      <path d="M20 22c0-14 110-14 110 0v14H20z" fill="url(#ch-wood)" stroke="url(#ch-gold)" strokeWidth="4" transform="rotate(-14 20 36)" />
      {[[52, 46], [70, 38], [88, 44], [62, 54], [80, 52], [100, 50], [44, 56]].map(([x, y], i) => (
        <path key={i} d={`M${x} ${y - 9}l8 9-8 10-8-10z`} fill="url(#ch-gem)" stroke="#fff" strokeOpacity=".5" />
      ))}
      <rect x="18" y="56" width="114" height="56" rx="6" fill="url(#ch-wood)" stroke="url(#ch-gold)" strokeWidth="5" />
      <rect x="18" y="56" width="114" height="10" fill="url(#ch-gold)" />
      <rect x="40" y="56" width="10" height="56" fill="url(#ch-gold)" />
      <rect x="100" y="56" width="10" height="56" fill="url(#ch-gold)" />
      <rect x="64" y="70" width="22" height="24" rx="4" fill="url(#ch-gold)" stroke="#6b3d0a" strokeWidth="2" />
      <circle cx="75" cy="80" r="3.5" fill="#3a1d05" />
    </svg>
  );
}

/** Stylised logo wings (mirrored with CSS for the right side). */
export function LogoWing({ flip = false }: { flip?: boolean }) {
  return (
    <svg className="logo-wing" viewBox="0 0 120 60" style={flip ? { transform: 'scaleX(-1)' } : undefined} aria-hidden>
      <defs>
        <linearGradient id="lw" x1="1" y1="0" x2="0" y2="0"><stop offset="0" stopColor="#e9f3ff" /><stop offset=".6" stopColor="#7fb3ff" /><stop offset="1" stopColor="#2f6fff" stopOpacity="0" /></linearGradient>
      </defs>
      {[0, 1, 2, 3].map((i) => (
        <path key={i} d={`M120 ${14 + i * 9} L${20 + i * 12} ${8 + i * 11} L${34 + i * 12} ${16 + i * 11} L120 ${22 + i * 9}z`} fill="url(#lw)" opacity={1 - i * 0.15} />
      ))}
    </svg>
  );
}

/** Side-view jet used on mode cards. */
export function JetSilhouette({ color = '#dfe8f5', accent = '#ff3b4d', glow = '#59c8ff', width = 170, flip = false }: { color?: string; accent?: string; glow?: string; width?: number; flip?: boolean }) {
  return (
    <svg width={width} height={width * 0.38} viewBox="0 0 200 76" style={flip ? { transform: 'scaleX(-1)' } : undefined} aria-hidden>
      <defs>
        <linearGradient id={`js-${color}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ffffff" /><stop offset="1" stopColor={color} /></linearGradient>
        <linearGradient id={`jg-${glow}`} x1="1" y1="0" x2="0" y2="0"><stop offset="0" stopColor={glow} /><stop offset="1" stopColor={glow} stopOpacity="0" /></linearGradient>
      </defs>
      <path d="M0 40h46v8H0z" fill={`url(#jg-${glow})`} />
      <path d="M44 34l30-6 70-2 40 10 16 4-16 4-40 4-70 2-30-4z" fill={`url(#js-${color})`} />
      <path d="M80 30l-30-26h14l46 24z" fill="#3a4a66" />
      <path d="M86 46l-26 26h16l40-24z" fill="#4a5a78" />
      <path d="M44 34l10-16h10l6 12z" fill="#3a4a66" />
      <path d="M150 30c10-2 20 2 24 6-10 0-18-2-24-6z" fill="#0b1d3a" />
      <path d="M90 38h60" stroke={accent} strokeWidth="3" />
      <circle cx="46" cy="40" r="5" fill={glow} />
    </svg>
  );
}
