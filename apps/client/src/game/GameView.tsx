import { Suspense, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { getMission } from '@sfe/shared';
import { audio } from '../audio/AudioEngine';
import { useT } from '../i18n';
import { useApp } from '../state/app';
import { useHud } from '../state/hud';
import { QUALITY_PROFILES, useSettings } from '../state/settings';
import { Hud } from '../ui/Hud';
import { PauseMenu } from '../ui/PauseMenu';
import { ResultScreen } from '../ui/ResultScreen';
import { TouchControls, isTouchDevice } from '../ui/TouchControls';
import { GameScene } from './GameScene';
import { PostFX } from './render/PostFX';

export function GameView({ missionId, runId }: { missionId: string; runId: number }) {
  const t = useT();
  const quality = useSettings((s) => s.quality);
  const paused = useHud((s) => s.paused);
  const ended = useHud((s) => s.ended);
  const q = QUALITY_PROFILES[quality];
  const mission = getMission(missionId);

  useEffect(() => {
    audio.unlock();
    return () => {
      audio.setMusic('menu');
      useHud.getState().reset();
      useApp.getState().setOutcome(null);
    };
  }, []);

  if (!mission) return null;

  return (
    <div className="screen" data-testid="game">
      <div className="canvas-layer">
        {/* Remount the canvas when quality changes (antialias / DPR are creation-time options). */}
        <Canvas
          key={quality}
          dpr={q.dpr}
          gl={{ antialias: q.antialias, powerPreference: 'high-performance', stencil: false }}
          camera={{ fov: 62, near: 0.1, far: 2000, position: [0, 6, 16] }}
          data-testid="game-canvas"
        >
          <Suspense fallback={null}>
            <GameScene missionId={missionId} runId={runId} />
            <PostFX />
          </Suspense>
        </Canvas>
      </div>
      {!ended && <Hud objective={t(mission.objectiveKey)} />}
      {!ended && !paused && isTouchDevice() && <TouchControls />}
      {paused && !ended && <PauseMenu />}
      {ended && <ResultScreen />}
    </div>
  );
}
