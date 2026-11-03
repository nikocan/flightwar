import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import type * as THREE from 'three';
import { GameController } from './GameController';

/** Bridges React Three Fiber's render loop with the imperative GameController. */
export function GameScene({ missionId, runId }: { missionId: string; runId: number }) {
  const { scene, camera, gl } = useThree();
  const ref = useRef<GameController | null>(null);

  useEffect(() => {
    const c = new GameController(scene, camera as THREE.PerspectiveCamera, gl, gl.domElement, missionId);
    ref.current = c;
    return () => {
      c.dispose();
      ref.current = null;
    };
  }, [scene, camera, gl, missionId, runId]);

  useFrame((_, dt) => ref.current?.frame(dt));
  return null;
}
