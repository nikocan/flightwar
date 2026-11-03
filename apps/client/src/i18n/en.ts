import type { TranslationKey } from './tr';

/**
 * English — prepared for localization. Missing keys fall back to Turkish automatically,
 * so new strings can ship in Turkish first and be translated later.
 */
export const en: Partial<Record<TranslationKey, string>> = {
  'app.tagline': 'The sky is yours to command, pilot!',
  'app.loading': 'Preparing the hangar…',
  'menu.play': 'Play',
  'menu.multiplayer': 'Multiplayer',
  'menu.aircraft': 'Aircraft',
  'menu.weapons': 'Weapons',
  'menu.upgrades': 'Upgrades',
  'menu.missions': 'Missions',
  'menu.rewards': 'Rewards',
  'menu.leaderboards': 'Leaderboards',
  'menu.settings': 'Settings',
  'menu.updates': 'Updates',
  'menu.new': 'NEW',
  'menu.soon': 'Soon',
  'common.back': 'Back',
  'common.start': 'Start',
  'common.coins': 'Coins',
  'common.crystals': 'Crystals',
  'pause.title': 'Paused',
  'pause.resume': 'Resume',
  'pause.restart': 'Restart',
  'pause.quit': 'Quit mission',
  'result.victory': 'MISSION COMPLETE',
  'result.defeat': 'AIRCRAFT DOWN',
  'result.retry': 'Retry',
  'result.menu': 'Main menu',
  'settings.title': 'Settings',
  'settings.language': 'Language',
  'updates.title': 'Updates',
  'mission.1-1.name': 'Academy Flight',
  'chapter.1': 'Sky Academy',
};
