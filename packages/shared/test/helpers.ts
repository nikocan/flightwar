import { emptyInput, type InputState } from '../src/sim/types';
import type { MissionDef } from '../src/config/missions';
import { GameWorld } from '../src/sim/world';
import { SIM_DT } from '../src/config/balance';

export const input = (patch: Partial<InputState> = {}): InputState => ({ ...emptyInput(), ...patch });

/** A tiny mission used by unit tests: one wave of scouts directly in front of the player. */
export const testMission = (overrides: Partial<MissionDef> = {}): MissionDef => ({
  id: 'test-1',
  chapter: 1,
  index: 1,
  nameKey: 'x',
  briefingKey: 'x',
  objectiveKey: 'x',
  theme: 'skyAcademy',
  kind: 'standard',
  stars: { healthFor2: 0.4, healthFor3: 0.65, killRatioFor3: 0.8 },
  rewards: { coins: 100, xp: 50, firstClearCrystals: 5, coinsPerStar: 10 },
  waves: [{ maxDuration: 60, groups: [{ enemy: 'scoutDrone', count: 3, formation: 'line', x: 0, y: 0, spacing: 3, delay: 0, interval: 0 }] }],
  ...overrides,
});

/** Runs the world for `seconds` of simulated time with a constant or scripted input. */
export function run(world: GameWorld, seconds: number, inp: InputState | ((w: GameWorld) => InputState)): void {
  const steps = Math.round(seconds / SIM_DT);
  for (let i = 0; i < steps && world.status === 'running'; i++) {
    world.step(SIM_DT, typeof inp === 'function' ? inp(world) : inp);
  }
}

/** Simple autopilot: lines up with the nearest enemy and lets aim assist + auto-fire work. */
export const autopilot = (w: GameWorld): InputState => {
  const p = w.player;
  let target = undefined as undefined | { x: number; y: number; z: number };
  let best = Infinity;
  for (const e of w.enemies) {
    if (!e.alive || e.z > p.z - 5) continue;
    const d = Math.abs(e.z);
    if (d < best) { best = d; target = e; }
  }
  const pu = w.powerUps[0];
  const goal = pu && pu.z > -40 ? pu : target;
  const mx = goal ? Math.max(-1, Math.min(1, (goal.x - p.x) * 0.5)) : -p.x * 0.2;
  const my = goal ? Math.max(-1, Math.min(1, (goal.y - p.y) * 0.5)) : -p.y * 0.2;
  return input({ moveX: mx, moveY: my, fire: true, missile: !!target && best < 90 });
};

/** A mission that never progresses (its only spawn is far in the future) — for isolated unit tests. */
export const idleMission = (): MissionDef =>
  testMission({ waves: [{ maxDuration: 9999, groups: [{ enemy: 'scoutDrone', count: 1, formation: 'single', x: 0, y: 0, spacing: 0, delay: 9999, interval: 0 }] }] });
