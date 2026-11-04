import { audio } from '../audio/AudioEngine';
import { useT } from '../i18n';
import { useApp, type Screen } from '../state/app';
import { Icon, type IconName } from './art';

type TabId = 'home' | 'aircraft' | 'chapters' | 'upgrades' | 'tasks' | 'events' | 'rewards' | 'ranking' | 'multiplayer' | 'shop';

interface Tab {
  id: TabId;
  label: string;
  icon: IconName;
  to: Screen;
  soon?: boolean;
  gold?: boolean;
}

const soon = (titleKey: string, bodyKey: string, phase: number): Screen => ({ id: 'soon', titleKey, bodyKey, phase });

/** Bottom navigation exactly as on the approved sheet. Unfinished sections are labelled, never fake. */
export function TabBar({ active }: { active: TabId }) {
  const t = useT();
  const go = useApp((s) => s.go);
  const tabs: Tab[] = [
    { id: 'home', label: t('tab.home'), icon: 'home', to: { id: 'menu' } },
    { id: 'aircraft', label: t('tab.aircraft'), icon: 'plane', to: { id: 'aircraft' } },
    { id: 'chapters', label: t('tab.chapters'), icon: 'target', to: { id: 'missions' } },
    { id: 'upgrades', label: t('tab.upgrades'), icon: 'upgrade', to: soon('menu.upgrades', 'soon.upgrades', 4), soon: true },
    { id: 'tasks', label: t('tab.tasks'), icon: 'check', to: soon('tile.daily', 'soon.rewards', 3), soon: true },
    { id: 'events', label: t('tab.events'), icon: 'calendar', to: soon('menu.events', 'soon.events', 3), soon: true },
    { id: 'rewards', label: t('tab.rewards'), icon: 'gift', to: soon('menu.rewards', 'soon.rewards', 3), soon: true },
    { id: 'ranking', label: t('tab.ranking'), icon: 'bars', to: soon('menu.leaderboards', 'soon.leaderboards', 5), soon: true },
    { id: 'multiplayer', label: t('tab.multiplayer'), icon: 'users', to: soon('menu.multiplayer', 'soon.multiplayer', 5), soon: true },
    { id: 'shop', label: t('tab.shop'), icon: 'cart', to: soon('tile.shop', 'soon.shop', 4), soon: true, gold: true },
  ];
  return (
    <nav className="c-tabbar" aria-label={t('tab.nav')}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          className={`c-tab ${tab.id === active ? 'active' : ''} ${tab.gold ? 'gold' : ''}`}
          data-testid={`tab-${tab.id}`}
          aria-current={tab.id === active ? 'page' : undefined}
          onClick={() => {
            audio.uiClick();
            go(tab.to);
          }}
        >
          <Icon name={tab.icon} size={22} />
          <span>{tab.label}</span>
          {tab.soon && <i className="c-tab-soon">{t('menu.soon')}</i>}
        </button>
      ))}
    </nav>
  );
}

export type { TabId };
