import { Suspense, lazy, useEffect, useState } from 'react';
import { preloadAssets } from './game/assets/AssetLoader';
import { audio } from './audio/AudioEngine';
import { useT } from './i18n';
import { useApp } from './state/app';
import { ErrorBoundary } from './ui/ErrorBoundary';
import { MainMenu } from './ui/MainMenu';
import { MissionSelect } from './ui/MissionSelect';
import { SettingsScreen } from './ui/SettingsScreen';
import { UpdatesScreen } from './ui/UpdatesScreen';
import { ComingSoon } from './ui/ComingSoon';

// Heavier 3D screens are code-split so the menu appears quickly.
const GameView = lazy(() => import('./game/GameView').then((m) => ({ default: m.GameView })));
const AircraftScreen = lazy(() => import('./ui/AircraftScreen').then((m) => ({ default: m.AircraftScreen })));

function Loading() {
  const t = useT();
  return (
    <div className="screen" data-testid="loading">
      <div className="bg-gradient" />
      <div className="center-box">
        <div className="spinner" />
        <div className="muted">{t('app.loading')}</div>
      </div>
    </div>
  );
}

export function App() {
  const screen = useApp((s) => s.screen);
  const go = useApp((s) => s.go);
  const [assetsReady, setAssetsReady] = useState(false);

  // Production GLB/HDR assets (missing files fall back to procedural models).
  useEffect(() => {
    void preloadAssets().finally(() => setAssetsReady(true));
  }, []);

  // Browsers only allow audio after a user gesture.
  useEffect(() => {
    const unlock = () => {
      audio.unlock();
      if (useApp.getState().screen.id !== 'game') audio.setMusic('menu');
    };
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);

  if (!assetsReady) return <Loading />;

  let content;
  switch (screen.id) {
    case 'menu':
      content = <MainMenu />;
      break;
    case 'missions':
      content = <MissionSelect />;
      break;
    case 'game':
      content = <GameView key={screen.runId} missionId={screen.missionId} runId={screen.runId} />;
      break;
    case 'settings':
      content = <SettingsScreen />;
      break;
    case 'updates':
      content = <UpdatesScreen />;
      break;
    case 'aircraft':
      content = <AircraftScreen />;
      break;
    case 'soon':
      content = <ComingSoon titleKey={screen.titleKey} bodyKey={screen.bodyKey} phase={screen.phase} />;
      break;
  }

  return (
    <ErrorBoundary key={screen.id} onReset={() => go({ id: 'menu' })}>
      <Suspense fallback={<Loading />}>{content}</Suspense>
    </ErrorBoundary>
  );
}
