import * as THREE from 'three';
import {
  ENEMIES,
  FixedStepLoop,
  GameWorld,
  POWERUPS,
  TIMED_EFFECTS,
  WEAPONS,
  getMission,
  type GameEvent,
  type MissionDef,
} from '@sfe/shared';
import { audio } from '../audio/AudioEngine';
import { t } from '../i18n';
import { useApp } from '../state/app';
import { useHud, type HudEffect } from '../state/hud';
import { useProfile } from '../state/profile';
import { QUALITY_PROFILES, useSettings } from '../state/settings';
import { InputManager } from './input';
import { getTexture } from './assets/AssetLoader';
import { EnemyRenderer } from './render/EnemyRenderer';
import { Environment, THEMES } from './render/Environment';
import { FxRenderer } from './render/FxRenderer';
import { Particles } from './render/Particles';
import { PlayerRenderer } from './render/PlayerRenderer';
import { PowerUpRenderer } from './render/PowerUpRenderer';
import { ProjectileRenderer } from './render/ProjectileRenderer';

const FLIGHT_SPEED = 70;
const HUD_INTERVAL = 1 / 12;

let active: GameController | null = null;
/** The running mission controller (used by HUD buttons and touch controls). */
export const getActiveController = () => active;

/**
 * Glue between the deterministic simulation and the presentation layer:
 * runs the fixed-step loop, feeds input, turns simulation events into VFX / audio / HUD,
 * drives the cinematic camera and reports the result when the mission ends.
 */
export class GameController {
  world!: GameWorld;
  readonly mission: MissionDef;
  readonly input: InputManager;
  paused = false;
  private ended = false;
  private readonly loop = new FixedStepLoop();
  private readonly env: Environment;
  private readonly particles: Particles;
  private readonly projectiles: ProjectileRenderer;
  private readonly enemies: EnemyRenderer;
  private readonly powerUps: PowerUpRenderer;
  private readonly fx: FxRenderer;
  private player!: PlayerRenderer;
  private time = 0;
  private shake = 0;
  private hudTimer = 0;
  private fpsFrames = 0;
  private fpsTime = 0;
  private fps = 0;
  private alpha = 0;
  private readonly camPos = new THREE.Vector3(0, 6, 16);
  private readonly camLook = new THREE.Vector3(0, 1, -25);
  private readonly tmp = new THREE.Vector3();

  constructor(
    private readonly scene: THREE.Scene,
    private readonly camera: THREE.PerspectiveCamera,
    renderer: THREE.WebGLRenderer,
    canvas: HTMLElement,
    missionId: string,
  ) {
    const mission = getMission(missionId);
    if (!mission) throw new Error(`Unknown mission ${missionId}`);
    this.mission = mission;
    const q = QUALITY_PROFILES[useSettings.getState().quality];
    this.env = new Environment(scene, q, THEMES[mission.theme] ?? THEMES.skyAcademy);
    this.env.bakeEnvironment(renderer, getTexture('hdri.sunset'));
    this.particles = new Particles(scene, q.particles);
    this.projectiles = new ProjectileRenderer(scene, 900, WEAPONS.machineGun.color);
    this.enemies = new EnemyRenderer(scene);
    this.powerUps = new PowerUpRenderer(scene);
    this.fx = new FxRenderer(scene);
    this.enemies.warm(ENEMIES.scoutDrone, 10);
    this.enemies.warm(ENEMIES.fighterJet, 5);
    this.enemies.warm(ENEMIES.heavyBomber, 1);
    this.input = new InputManager(canvas);
    this.input.onPause = () => this.togglePause();
    this.createWorld();
    active = this;
    audio.startEngine();
    audio.setMusic('battle');
    window.addEventListener('visibilitychange', this.onVisibility);
    if (import.meta.env.DEV || new URLSearchParams(window.location.search).has('debug')) {
      (window as unknown as { __SFE__?: unknown }).__SFE__ = {
        controller: this,
        forceVictory: () => this.world.debugForceVictory(),
        skipToWave: (i: number) => this.world.debugSkipToWave(i),
        state: () => ({ status: this.world.status, stats: { ...this.world.stats }, player: { ...this.world.player }, wave: this.world.waveIndex, enemies: this.world.enemies.length }),
      };
    }
  }

  private onVisibility = () => {
    if (document.hidden && !this.paused && !this.ended) this.togglePause();
  };

  private createWorld(): void {
    const s = useSettings.getState();
    const profile = useProfile.getState();
    this.world = new GameWorld(this.mission, {
      aircraftId: 'falconX1',
      weaponLevel: profile.weaponLevels.machineGun ?? 1,
      difficulty: s.difficulty,
      aimAssist: s.aimAssist,
      autoFire: s.autoFire,
      seed: (Date.now() & 0xffffff) | 1,
    });
    this.player?.dispose();
    this.player = new PlayerRenderer(this.scene, this.world.aircraft, QUALITY_PROFILES[s.quality].glowSprites);
    this.ended = false;
    this.loop.reset();
    useHud.getState().reset();
    useHud.getState().showBanner(t('hud.missionStart'), 'info');
    this.pushHud();
  }

  restart(): void {
    this.particles.clear();
    this.enemies.clear();
    this.powerUps.clear();
    this.fx.clear();
    this.paused = false;
    this.input.releaseAll();
    this.createWorld();
    audio.startEngine();
    audio.setMusic('battle');
  }

  togglePause(force?: boolean): void {
    if (this.ended) return;
    this.paused = force ?? !this.paused;
    this.input.releaseAll();
    useHud.getState().setPaused(this.paused);
    if (this.paused) audio.stopEngine();
    else {
      audio.startEngine();
      this.loop.reset();
    }
  }

  frame(rawDt: number): void {
    const dt = Math.min(rawDt, 0.1);
    this.fpsFrames++;
    this.fpsTime += rawDt;
    if (this.fpsTime >= 0.5) {
      this.fps = Math.round(this.fpsFrames / this.fpsTime);
      this.fpsFrames = 0;
      this.fpsTime = 0;
    }
    if (this.paused) return;
    this.time += dt;
    const w = this.world;

    // Live settings that may change from the pause menu.
    const s = useSettings.getState();
    w.autoFire = s.autoFire;
    w.aimAssist = s.aimAssist;

    const input = this.input.sample(this.camera, w.player.z);
    this.alpha = this.loop.advance(dt, (step) => w.step(step, input));
    this.handleEvents(w.drainEvents());

    const p = w.player;
    const boosting = p.effects.speedBoost > 0 || p.dashTimer > 0;
    this.env.update(dt, FLIGHT_SPEED * (boosting ? 1.5 : 1), this.time);
    this.player.update(p, this.alpha, dt, this.time, this.particles, boosting);
    this.enemies.update(w.enemies, this.alpha, this.time, dt);
    this.projectiles.update(w.projectiles, this.alpha, this.camera);
    this.powerUps.update(w.powerUps, this.alpha, this.time);
    this.emitMissileTrails();
    this.updateCamera(dt, boosting);
    this.particles.update(dt, this.camera);

    const locked = p.lockTargetId >= 0 ? w.findEnemy(p.lockTargetId) : undefined;
    this.fx.setCrosshair(p.x, p.y, p.z, p.aimX, p.aimY, p.aimZ, p.alive && !this.ended);
    this.fx.setLock(locked ? { x: locked.x, y: locked.y, z: locked.z, radius: locked.def.radius } : null, this.time);
    this.fx.update(dt, this.time);
    audio.setEngine(Math.min(1, Math.hypot(p.vx, p.vy) / 20 + (boosting ? 0.5 : 0)));

    this.hudTimer -= dt;
    if (this.hudTimer <= 0) {
      this.hudTimer = HUD_INTERVAL;
      this.pushHud();
    }

    if (w.status !== 'running' && !this.ended) this.finish();
  }

  private emitMissileTrails(): void {
    for (const pr of this.world.projectiles) {
      if (pr.active && pr.kind === 'missile') {
        this.particles.emit(pr.x, pr.y, pr.z, 0, 0, 0, '#ffb347', 0.9, 0.35, 2.5, 1);
      }
    }
  }

  private updateCamera(dt: number, boosting: boolean): void {
    const p = this.world.player;
    const px = p.prevX + (p.x - p.prevX) * this.alpha;
    const py = p.prevY + (p.y - p.prevY) * this.alpha;
    this.tmp.set(px * 0.62, py * 0.55 + 5.4, 14.5);
    this.camPos.x = THREE.MathUtils.damp(this.camPos.x, this.tmp.x, 6, dt);
    this.camPos.y = THREE.MathUtils.damp(this.camPos.y, this.tmp.y, 6, dt);
    this.camPos.z = THREE.MathUtils.damp(this.camPos.z, this.tmp.z + (boosting ? 1.5 : 0), 4, dt);
    this.camLook.x = THREE.MathUtils.damp(this.camLook.x, px * 0.8, 7, dt);
    this.camLook.y = THREE.MathUtils.damp(this.camLook.y, py * 0.7 + 0.8, 7, dt);
    this.camLook.z = -26;

    this.shake = Math.max(0, this.shake - dt * 1.8);
    const amount = useSettings.getState().cameraShake ? this.shake * this.shake : 0;
    this.camera.position.set(
      this.camPos.x + (Math.random() - 0.5) * amount * 1.6,
      this.camPos.y + (Math.random() - 0.5) * amount * 1.6,
      this.camPos.z,
    );
    this.camera.lookAt(this.camLook);
    // Flat 2.5D cards look crooked if the whole view rolls; keep the horizon level for them.
    this.camera.rotateZ(-p.bank * (this.player.model.billboard ? 0.015 : 0.06));
    const fov = boosting ? 72 : 62;
    this.camera.fov = THREE.MathUtils.damp(this.camera.fov, fov, 4, dt);
    this.camera.updateProjectionMatrix();
  }

  private addShake(v: number): void {
    this.shake = Math.min(1.2, this.shake + v);
  }

  private handleEvents(events: GameEvent[]): void {
    const hud = useHud.getState();
    for (const ev of events) {
      switch (ev.type) {
        case 'shot':
          audio.shot(WEAPONS[ev.weapon].sound);
          this.particles.emit(ev.x, ev.y, ev.z - 0.6, 0, 0, -20, WEAPONS[ev.weapon].color, 1.4, 0.06, 0, 0);
          break;
        case 'missileLaunch':
          audio.missile();
          this.particles.emit(ev.x, ev.y, ev.z, 0, 0, 10, '#ffffff', 2, 0.25, 4, 2);
          break;
        case 'enemyShot':
          audio.enemyShot(ev.heavy);
          this.particles.emit(ev.x, ev.y, ev.z, 0, 0, 0, ev.heavy ? '#ff7a1a' : '#ff3b8d', ev.heavy ? 4 : 2.4, 0.15, 0, 0);
          break;
        case 'hit':
          audio.hit(ev.crit);
          this.particles.hitSpark(ev.x, ev.y, ev.z, ev.crit, '#7fe8ff', ev.impactScale);
          break;
        case 'explosion': {
          audio.explosion(ev.size);
          const boss = ev.size >= 5;
          this.particles.explosion(ev.x, ev.y, ev.z, ev.size, ev.color, boss ? 2.5 : 1);
          if (boss) {
            for (let i = 0; i < 6; i++) {
              this.particles.explosion(ev.x + (Math.random() - 0.5) * 10, ev.y + (Math.random() - 0.5) * 6, ev.z + (Math.random() - 0.5) * 6, 2.5, ev.color);
            }
          }
          this.addShake(boss ? 1.1 : ev.enemyId === -1 ? 0.9 : Math.min(0.35, ev.size * 0.08));
          break;
        }
        case 'playerHit':
          audio.playerHit(ev.shieldOnly);
          this.addShake(ev.shieldOnly ? 0.2 : 0.55);
          if (!ev.shieldOnly) hud.flashDamage();
          break;
        case 'pickup': {
          const def = POWERUPS[ev.powerUp];
          audio.pickup();
          this.particles.burst(ev.x, ev.y, ev.z, def.color, 16, 14);
          hud.pushToast(t(def.nameKey), def.color, def.icon);
          break;
        }
        case 'dash':
          audio.dash();
          break;
        case 'special':
          audio.special();
          hud.pushToast(t(`special.${ev.special}`), '#ff8cf0', '◆');
          break;
        case 'lightning':
          audio.lightning();
          this.fx.lightning(ev.from, ev.points);
          break;
        case 'waveStart':
          hud.showBanner(ev.bannerKey ? t(ev.bannerKey) : t('hud.wave', { n: ev.wave, total: ev.total }), ev.boss ? 'boss' : 'info');
          if (ev.boss) {
            audio.bossRoar();
            audio.setMusic('boss');
          }
          break;
        case 'bossWarning':
          audio.warning();
          hud.showBanner(t('hud.bossWarning'), 'warning');
          this.fx.showGap(ev.gapX, ev.gapY, ev.time + 4.2);
          break;
        case 'bossPhase':
          audio.bossRoar();
          this.addShake(0.5);
          hud.showBanner(t('hud.bossPhase', { n: ev.phase }), 'boss');
          break;
        case 'lock':
          audio.lock(ev.targetId >= 0);
          hud.pushToast(ev.targetId >= 0 ? t('hud.locked') : t('hud.unlocked'), ev.targetId >= 0 ? '#ff5070' : '#9fb3c8', '◎');
          break;
        case 'combo':
          hud.pushToast(t('hud.combo', { n: ev.multiplier }), '#ffd23f', '✦');
          break;
        case 'bossSpawn':
        case 'victory':
        case 'defeat':
          break;
      }
    }
  }

  private pushHud(): void {
    const w = this.world;
    const p = w.player;
    const effects: HudEffect[] = [];
    for (const id of TIMED_EFFECTS) {
      if (p.effects[id] > 0) effects.push({ id, remaining: p.effects[id], duration: POWERUPS[id].duration });
    }
    const boss = w.boss;
    useHud.getState().update({
      hp: p.hp,
      maxHp: p.maxHp,
      shield: p.shield,
      shieldMax: p.shieldMax,
      energy: p.energy,
      maxEnergy: p.maxEnergy,
      score: w.stats.score,
      coins: w.stats.coins,
      combo: w.stats.comboMultiplier,
      wave: Math.max(0, Math.min(w.totalWaves, w.waveIndex + 1)),
      totalWaves: w.totalWaves,
      progress: w.progress,
      missiles: p.missiles,
      specialReady: 1 - p.specialCooldown / w.aircraft.stats.specialCooldown,
      specialActive: p.specialActive > 0,
      dashReady: 1 - p.dashCooldown / 1.6,
      locked: p.lockTargetId >= 0,
      effects,
      boss: boss ? { hp: boss.hp, maxHp: boss.maxHp, phase: boss.bossPhase } : null,
      fps: this.fps,
      shotsFired: w.stats.shotsFired,
      kills: w.stats.kills,
    });
  }

  /** Records the result once and shows the result screen. */
  private finish(): void {
    this.ended = true;
    const w = this.world;
    const victory = w.status === 'victory';
    const st = w.stats;
    const outcome = useProfile.getState().recordMission(
      this.mission.id,
      {
        victory,
        healthRatio: w.player.hp / w.player.maxHp,
        enemiesSpawned: st.enemiesSpawned,
        enemiesDestroyed: st.enemiesDestroyed,
        score: st.score,
        coinsCollected: st.coins,
        xpCollected: st.xp,
        kills: st.kills,
        accuracy: st.shotsFired > 0 ? Math.min(1, st.shotsHit / st.shotsFired) : 0,
        maxCombo: st.maxComboMultiplier,
        time: st.time,
      },
      useSettings.getState().difficulty,
    );
    audio.stopEngine();
    audio.setMusic('none');
    if (victory) audio.victory();
    else audio.defeat();
    this.pushHud();
    useApp.getState().setOutcome(outcome);
    useHud.getState().setEnded(true);
    this.fx.clear();
  }

  dispose(): void {
    window.removeEventListener('visibilitychange', this.onVisibility);
    if (active === this) active = null;
    this.input.dispose();
    this.env.dispose();
    this.particles.dispose();
    this.projectiles.dispose();
    this.enemies.dispose();
    this.powerUps.dispose();
    this.fx.dispose();
    this.player.dispose();
    audio.stopEngine();
    this.scene.fog = null;
  }
}
