import { AIRCRAFT, type AircraftDef, type AircraftId } from '../config/aircraft';
import { AIM_ASSIST, ARENA, COMBO_RULES, DIFFICULTY, PLAYER_RULES, type Difficulty, type DifficultyModifiers } from '../config/balance';
import { BOSS_RULES, ENEMIES, type EnemyAttack, type EnemyDef, type EnemyId } from '../config/enemies';
import type { MissionDef, SpawnGroup } from '../config/missions';
import { POWERUP_IDS, POWERUP_RULES, POWERUPS, type PowerUpId } from '../config/powerups';
import { WEAPONS, resolveWeaponStats, type ResolvedWeaponStats } from '../config/weapons';
import { approach, clamp, degToRad, normalizeInto, vec3, type Vec3 } from '../math';
import { Rng } from '../rng';
import { segmentSphereHit, spheresOverlap } from './collision';
import { absorbWithShield, computeDamage } from './damage';
import { SpatialHash } from './spatialHash';
import {
  TIMED_EFFECTS,
  emptyInput,
  type Enemy,
  type GameEvent,
  type InputState,
  type PlayerState,
  type PowerUp,
  type Projectile,
  type ProjectileKind,
  type WorldStats,
  type WorldStatus,
} from './types';

export interface WorldOptions {
  aircraftId?: AircraftId;
  weaponLevel?: number;
  difficulty?: Difficulty;
  aimAssist?: boolean;
  autoFire?: boolean;
  seed?: number;
  projectileCapacity?: number;
}

interface PendingSpawn {
  at: number;
  enemy: EnemyId;
  x: number;
  y: number;
  zOffset: number;
}

const PLAYER_HITBOX = 0.95;
const MUZZLE_Z = -2.6;
const INTERMISSION = 2.2;
const VICTORY_DELAY = 2.5;
const DEFEAT_DELAY = 1.8;

/**
 * Authoritative single-mission simulation. Pure TypeScript with no rendering or DOM
 * dependencies so it can run in the browser, in tests and on the multiplayer server.
 */
export class GameWorld {
  readonly mission: MissionDef;
  readonly aircraft: AircraftDef;
  readonly weapon: ResolvedWeaponStats;
  readonly missileWeapon: ResolvedWeaponStats;
  readonly difficulty: DifficultyModifiers;
  readonly rng: Rng;
  readonly player: PlayerState;
  readonly enemies: Enemy[] = [];
  readonly projectiles: Projectile[];
  readonly powerUps: PowerUp[] = [];
  readonly stats: WorldStats;

  status: WorldStatus = 'running';
  aimAssist: boolean;
  autoFire: boolean;

  /** Index of the current wave (-1 = before the first wave). */
  waveIndex = -1;
  wavesCompleted = 0;
  bossId = -1;

  private events: GameEvent[] = [];
  private pending: PendingSpawn[] = [];
  private waveTime = 0;
  private intermission = INTERMISSION;
  private endTimer = -1;
  private nextId = 1;
  private poolCursor = 0;
  private prevInput: InputState = emptyInput();
  private readonly hash = new SpatialHash(12, 4096);
  private readonly queryOut: number[] = [];
  private readonly tmp: Vec3 = vec3();
  private readonly tmp2: Vec3 = vec3();

  constructor(mission: MissionDef, opts: WorldOptions = {}) {
    this.mission = mission;
    this.aircraft = AIRCRAFT[opts.aircraftId ?? 'falconX1'];
    this.weapon = resolveWeaponStats(WEAPONS[this.aircraft.primaryWeapon], opts.weaponLevel ?? 1);
    this.missileWeapon = resolveWeaponStats(WEAPONS.homingMissiles, 1);
    this.difficulty = DIFFICULTY[opts.difficulty ?? 'normal'];
    this.rng = new Rng(opts.seed ?? 1337);
    this.aimAssist = opts.aimAssist ?? true;
    this.autoFire = opts.autoFire ?? false;

    const s = this.aircraft.stats;
    this.player = {
      alive: true,
      x: 0, y: 0, z: 0, prevX: 0, prevY: 0, prevZ: 0, vx: 0, vy: 0,
      hp: s.health, maxHp: s.health,
      shield: 0, shieldMax: 0,
      energy: s.energy, maxEnergy: s.energy,
      invulnerable: 1.5,
      dashTimer: 0, dashCooldown: 0, dashDirX: 1, dashDirY: 0,
      fireCooldown: 0, shotCounter: 0,
      missiles: PLAYER_RULES.startingMissiles, missileCooldown: 0,
      specialCooldown: 0, specialActive: 0,
      effects: { shield: 0, doubleDamage: 0, tripleFire: 0, speedBoost: 0, coinMultiplier: 0, invincibility: 0 },
      lockTargetId: -1,
      bank: 0, pitch: 0,
      aimX: 0, aimY: 0, aimZ: -ARENA.aimDistance,
    };

    const cap = opts.projectileCapacity ?? 900;
    this.projectiles = new Array(cap);
    for (let i = 0; i < cap; i++) {
      this.projectiles[i] = {
        active: false, owner: 'player', kind: 'player', weapon: null,
        x: 0, y: 0, z: 0, prevX: 0, prevY: 0, prevZ: 0, vx: 0, vy: 0, vz: 0,
        speed: 0, damage: 0, radius: 0, life: 0, pierce: 0, lastHitId: -1, targetId: -1, turnRate: 0, impactScale: 1,
      };
    }

    this.stats = {
      time: 0, score: 0, kills: 0, enemiesSpawned: 0, enemiesDestroyed: 0, escaped: 0,
      shotsFired: 0, shotsHit: 0, damageTaken: 0, coins: 0, xp: 0,
      combo: 0, comboMultiplier: 1, comboTimer: 0, maxComboMultiplier: 1, powerUpsCollected: 0,
    };
  }

  // ───────────────────────────────────────── public API ──

  /** Returns and clears the events produced since the last call. */
  drainEvents(): GameEvent[] {
    const out = this.events;
    this.events = [];
    return out;
  }

  get totalWaves(): number {
    return this.mission.waves.length;
  }

  get progress(): number {
    return this.wavesCompleted / this.totalWaves;
  }

  get boss(): Enemy | undefined {
    if (this.bossId < 0) return undefined;
    return this.enemies.find((e) => e.id === this.bossId);
  }

  get activeProjectileCount(): number {
    let n = 0;
    for (const p of this.projectiles) if (p.active) n++;
    return n;
  }

  findEnemy(id: number): Enemy | undefined {
    for (const e of this.enemies) if (e.id === id && e.alive) return e;
    return undefined;
  }

  /** Advances the simulation by one fixed step. */
  step(dt: number, input: InputState): void {
    if (this.status !== 'running') return;
    this.stats.time += dt;

    this.storePrevious();
    this.updateMission(dt);
    if (this.player.alive) this.updatePlayer(dt, input);
    this.updateEnemies(dt);
    this.updateProjectiles(dt);
    this.updatePowerUps(dt);
    this.resolveCollisions();
    this.cleanup();
    this.updateCombo(dt);
    this.updateEnd(dt);

    this.prevInput.dash = input.dash;
    this.prevInput.special = input.special;
    this.prevInput.lockToggle = input.lockToggle;
  }

  /** Development / automated-test helper: completes the mission immediately. */
  debugForceVictory(): void {
    if (this.status !== 'running') return;
    for (const e of this.enemies) {
      if (e.alive) this.killEnemy(e);
    }
    this.pending.length = 0;
    this.wavesCompleted = this.totalWaves;
    this.waveIndex = this.totalWaves;
    this.status = 'victory';
    this.events.push({ type: 'victory' });
  }

  /** Development / automated-test helper: jumps straight to wave `index` (0-based). */
  debugSkipToWave(index: number): void {
    if (this.status !== 'running') return;
    this.enemies.length = 0;
    this.pending.length = 0;
    this.wavesCompleted = Math.max(0, Math.min(this.totalWaves - 1, index));
    this.waveIndex = -1;
    this.intermission = 0.3;
  }

  // ───────────────────────────────────────── mission director ──

  private updateMission(dt: number): void {
    if (this.endTimer >= 0) return;
    if (this.waveIndex >= this.totalWaves) return;

    if (this.waveIndex < 0 || this.waveFinished()) {
      if (this.waveIndex >= 0 && this.intermission <= 0) {
        // Just finished the current wave.
        this.wavesCompleted = this.waveIndex + 1;
        this.intermission = INTERMISSION;
        if (this.wavesCompleted >= this.totalWaves) {
          this.waveIndex = this.totalWaves;
          this.endTimer = VICTORY_DELAY;
          this.player.invulnerable = Math.max(this.player.invulnerable, VICTORY_DELAY + 1);
          return;
        }
      }
      this.intermission -= dt;
      if (this.intermission <= 0) this.startWave(this.wavesCompleted);
      return;
    }

    this.waveTime += dt;
    for (let i = this.pending.length - 1; i >= 0; i--) {
      const p = this.pending[i];
      if (p.at <= this.waveTime) {
        this.spawnEnemy(ENEMIES[p.enemy], p.x, p.y, ARENA.spawnZ - p.zOffset, true);
        this.pending.splice(i, 1);
      }
    }
  }

  private waveFinished(): boolean {
    if (this.waveIndex < 0) return true;
    if (this.pending.length > 0) return false;
    const wave = this.mission.waves[this.waveIndex];
    if (wave.boss) return !this.enemies.some((e) => e.alive);
    if (this.waveTime >= wave.maxDuration) return true;
    return !this.enemies.some((e) => e.alive && e.state !== 'retreat');
  }

  private startWave(index: number): void {
    const wave = this.mission.waves[index];
    this.waveIndex = index;
    this.waveTime = 0;
    this.intermission = 0;
    this.pending.length = 0;
    for (const g of wave.groups) this.queueGroup(g);
    this.events.push({ type: 'waveStart', wave: index + 1, total: this.totalWaves, bannerKey: wave.bannerKey, boss: !!wave.boss });
  }

  private queueGroup(g: SpawnGroup): void {
    const n = g.count;
    for (let i = 0; i < n; i++) {
      const c = i - (n - 1) / 2;
      let x = g.x;
      let y = g.y;
      let z = 0;
      switch (g.formation) {
        case 'line':
          x += c * g.spacing;
          break;
        case 'v':
          x += c * g.spacing;
          y += Math.abs(c) * 0.6;
          z = Math.abs(c) * g.spacing * 0.9;
          break;
        case 'column':
          z = i * g.spacing;
          break;
        case 'circle': {
          const a = (i / n) * Math.PI * 2;
          x += Math.cos(a) * g.spacing;
          y += Math.sin(a) * g.spacing * 0.55;
          break;
        }
        case 'scatter':
          x += this.rng.range(-g.spacing, g.spacing);
          y += this.rng.range(-g.spacing * 0.35, g.spacing * 0.35);
          break;
        case 'single':
          break;
      }
      this.pending.push({
        at: g.delay + i * g.interval,
        enemy: g.enemy,
        x: clamp(x, ARENA.minX - 3, ARENA.maxX + 3),
        y: clamp(y, ARENA.minY + 1, ARENA.maxY + 2),
        zOffset: z,
      });
    }
  }

  spawnEnemy(def: EnemyDef, x: number, y: number, z: number, counted: boolean): Enemy {
    const hp = def.health * this.difficulty.enemyHealth;
    const e: Enemy = {
      id: this.nextId++, def, alive: true,
      x, y, z, prevX: x, prevY: y, prevZ: z, vx: 0, vy: 0, vz: def.speed,
      hp, maxHp: hp, age: 0, state: 'enter', stateTime: 0,
      homeX: x, homeY: y,
      engageZ: def.behavior === 'hover' ? this.rng.range(-80, -68) : def.behavior === 'boss' ? BOSS_RULES.holdZ : this.rng.range(-64, -46),
      phase: this.rng.range(0, Math.PI * 2),
      fireTimer: 0, dodgeTimer: 0, dodgeVx: 0, dodgeCheck: 0, hitFlash: 0,
      bossPhase: 1, telegraph: 0, heavyTimer: BOSS_RULES.heavyAttackInterval, reinforceTimer: BOSS_RULES.reinforcementInterval,
      wallGapX: 0, wallGapY: 0,
      counted,
    };
    if (def.attack) e.fireTimer = def.attack.interval * this.rng.range(0.25, 0.7);
    this.enemies.push(e);
    if (counted) this.stats.enemiesSpawned++;
    if (def.behavior === 'boss') {
      this.bossId = e.id;
      this.events.push({ type: 'bossSpawn', enemyId: e.id });
    }
    return e;
  }

  // ───────────────────────────────────────── player ──

  private storePrevious(): void {
    const p = this.player;
    p.prevX = p.x; p.prevY = p.y; p.prevZ = p.z;
    for (const e of this.enemies) { e.prevX = e.x; e.prevY = e.y; e.prevZ = e.z; }
    for (const pr of this.projectiles) if (pr.active) { pr.prevX = pr.x; pr.prevY = pr.y; pr.prevZ = pr.z; }
    for (const u of this.powerUps) { u.prevX = u.x; u.prevY = u.y; u.prevZ = u.z; }
  }

  private updatePlayer(dt: number, input: InputState): void {
    const p = this.player;
    const st = this.aircraft.stats;

    // Timers
    p.invulnerable = Math.max(0, p.invulnerable - dt);
    p.dashCooldown = Math.max(0, p.dashCooldown - dt);
    p.fireCooldown -= dt;
    p.missileCooldown = Math.max(0, p.missileCooldown - dt);
    p.specialCooldown = Math.max(0, p.specialCooldown - dt);
    p.specialActive = Math.max(0, p.specialActive - dt);
    p.energy = Math.min(p.maxEnergy, p.energy + PLAYER_RULES.energyRegenPerSec * dt);
    for (const id of TIMED_EFFECTS) {
      if (p.effects[id] > 0) {
        p.effects[id] = Math.max(0, p.effects[id] - dt);
        if (id === 'shield' && p.effects[id] === 0) { p.shield = 0; p.shieldMax = 0; }
      }
    }
    if (p.shield <= 0 && p.effects.shield > 0) { p.effects.shield = 0; p.shieldMax = 0; }

    // Movement
    const mx = clamp(input.moveX, -1, 1);
    const my = clamp(input.moveY, -1, 1);
    const speedMul = p.effects.speedBoost > 0 ? POWERUPS.speedBoost.amount : 1;
    const maxSpeed = PLAYER_RULES.baseSpeed * (st.speed / 100) * speedMul;
    const agility = PLAYER_RULES.baseAgility * (st.agility / 100);

    if (input.dash && !this.prevInput.dash && p.dashCooldown <= 0 && p.energy >= PLAYER_RULES.dashEnergyCost) {
      const len = Math.hypot(mx, my);
      p.dashDirX = len > 0.1 ? mx / len : p.vx >= 0 ? 1 : -1;
      p.dashDirY = len > 0.1 ? my / len : 0;
      p.dashTimer = PLAYER_RULES.dashDuration;
      p.dashCooldown = PLAYER_RULES.dashCooldown;
      p.energy -= PLAYER_RULES.dashEnergyCost;
      p.invulnerable = Math.max(p.invulnerable, PLAYER_RULES.dashInvulnerability);
      this.events.push({ type: 'dash' });
    }

    if (p.dashTimer > 0) {
      p.dashTimer -= dt;
      p.vx = p.dashDirX * PLAYER_RULES.dashImpulse;
      p.vy = p.dashDirY * PLAYER_RULES.dashImpulse;
    } else {
      p.vx = approach(p.vx, mx * maxSpeed, agility, dt);
      p.vy = approach(p.vy, my * maxSpeed, agility, dt);
    }
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    if (p.x < ARENA.minX) { p.x = ARENA.minX; p.vx = Math.max(0, p.vx); }
    if (p.x > ARENA.maxX) { p.x = ARENA.maxX; p.vx = Math.min(0, p.vx); }
    if (p.y < ARENA.minY) { p.y = ARENA.minY; p.vy = Math.max(0, p.vy); }
    if (p.y > ARENA.maxY) { p.y = ARENA.maxY; p.vy = Math.min(0, p.vy); }
    p.bank = clamp(-p.vx / (PLAYER_RULES.baseSpeed * 1.1), -1, 1);
    p.pitch = clamp(p.vy / (PLAYER_RULES.baseSpeed * 1.1), -1, 1);

    // Target lock (edge-triggered toggle)
    if (p.lockTargetId >= 0 && !this.findEnemy(p.lockTargetId)) p.lockTargetId = -1;
    if (input.lockToggle && !this.prevInput.lockToggle) {
      if (p.lockTargetId >= 0) p.lockTargetId = -1;
      else p.lockTargetId = this.pickTarget(input.aimPoint, 30)?.id ?? -1;
      this.events.push({ type: 'lock', targetId: p.lockTargetId });
    }

    // Special ability
    if (input.special && !this.prevInput.special && p.specialCooldown <= 0) this.activateSpecial();

    // Aim
    this.computeAimDir(this.tmp, p.x, p.y, p.z + MUZZLE_Z, this.weapon.projectileSpeed, input.aimPoint);
    p.aimX = p.x + this.tmp.x * ARENA.aimDistance;
    p.aimY = p.y + this.tmp.y * ARENA.aimDistance;
    p.aimZ = p.z + this.tmp.z * ARENA.aimDistance;

    // Primary fire
    const wantsFire = input.fire || (this.autoFire && this.hasTargetAhead());
    if (wantsFire && p.fireCooldown <= 0 && p.energy >= this.weapon.energyCost) {
      this.firePrimary(input.aimPoint);
      const rate = p.specialActive > 0 ? 2.2 : 1;
      p.fireCooldown += this.weapon.cooldown / rate;
      if (p.fireCooldown < 0) p.fireCooldown = 0;
    } else if (p.fireCooldown < 0) {
      p.fireCooldown = 0;
    }

    // Missiles
    if (input.missile && p.missileCooldown <= 0 && p.missiles > 0) {
      this.fireMissile();
      p.missiles--;
      p.missileCooldown = PLAYER_RULES.missileCooldown;
    }
  }

  private activateSpecial(): void {
    const p = this.player;
    const special = this.aircraft.special;
    if (special !== 'rapidFire') return; // Other specials arrive with the hangar (Phase 4).
    p.specialActive = 5;
    p.specialCooldown = this.aircraft.stats.specialCooldown;
    this.events.push({ type: 'special', special });
  }

  private hasTargetAhead(): boolean {
    const p = this.player;
    for (const e of this.enemies) {
      if (!e.alive || e.z > p.z - 10 || e.z < -150) continue;
      if (Math.abs(e.x - p.x) < 14 && Math.abs(e.y - p.y) < 10) return true;
    }
    return false;
  }

  /** Enemy closest (in angle) to the aim ray within `maxDeg`, falling back to the nearest one ahead. */
  private pickTarget(aimPoint: Vec3 | null, maxDeg: number): Enemy | undefined {
    const p = this.player;
    const dir = this.tmp2;
    if (aimPoint) normalizeInto(dir, aimPoint.x - p.x, aimPoint.y - p.y, aimPoint.z - p.z);
    else { dir.x = 0; dir.y = 0; dir.z = -1; }
    const cosMax = Math.cos(degToRad(maxDeg));
    let best: Enemy | undefined;
    let bestCos = cosMax;
    let nearest: Enemy | undefined;
    let nearestDist = Infinity;
    for (const e of this.enemies) {
      if (!e.alive || e.z > p.z - 6) continue;
      const dx = e.x - p.x, dy = e.y - p.y, dz = e.z - p.z;
      const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
      const c = (dx * dir.x + dy * dir.y + dz * dir.z) / len;
      if (c > bestCos) { bestCos = c; best = e; }
      if (len < nearestDist && e.z > -160) { nearestDist = len; nearest = e; }
    }
    return best ?? nearest;
  }

  /** Aim direction honoring target lock and (optional) aim assistance. */
  private computeAimDir(out: Vec3, fx: number, fy: number, fz: number, speed: number, aimPoint: Vec3 | null): Vec3 {
    const p = this.player;
    const locked = p.lockTargetId >= 0 ? this.findEnemy(p.lockTargetId) : undefined;
    if (locked) {
      const dist = Math.hypot(locked.x - fx, locked.y - fy, locked.z - fz);
      const t = dist / speed;
      return normalizeInto(out, locked.x + locked.vx * t - fx, locked.y + locked.vy * t - fy, locked.z + locked.vz * t - fz);
    }
    if (aimPoint) normalizeInto(out, aimPoint.x - fx, aimPoint.y - fy, aimPoint.z - fz);
    else { out.x = 0; out.y = 0; out.z = -1; }

    const coneDeg = this.aimAssist ? AIM_ASSIST.assistedConeDeg : AIM_ASSIST.coneDeg * 0.5;
    const cosMax = Math.cos(degToRad(coneDeg));
    let best: Enemy | undefined;
    let bestCos = cosMax;
    for (const e of this.enemies) {
      if (!e.alive || e.z > fz - 8 || e.z < -175) continue;
      const dx = e.x - fx, dy = e.y - fy, dz = e.z - fz;
      const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
      const c = (dx * out.x + dy * out.y + dz * out.z) / len;
      if (c > bestCos) { bestCos = c; best = e; }
    }
    if (best) {
      const dist = Math.hypot(best.x - fx, best.y - fy, best.z - fz);
      const t = dist / speed;
      const tx = best.x + best.vx * t - fx, ty = best.y + best.vy * t - fy, tz = best.z + best.vz * t - fz;
      const len = Math.sqrt(tx * tx + ty * ty + tz * tz);
      const k = this.aimAssist ? AIM_ASSIST.strength : 0.5;
      normalizeInto(out, out.x + (tx / len - out.x) * k, out.y + (ty / len - out.y) * k, out.z + (tz / len - out.z) * k);
    }
    return out;
  }

  private firePrimary(aimPoint: Vec3 | null): void {
    const p = this.player;
    const w = this.weapon;
    const triple = p.effects.tripleFire > 0 ? POWERUPS.tripleFire.amount : 0;
    const rapid = p.specialActive > 0 ? 1 : 0;
    const count = w.projectiles + triple + rapid;
    const spread = degToRad(w.spreadDeg + triple * 6);
    const dmgMul = p.effects.doubleDamage > 0 ? POWERUPS.doubleDamage.amount : 1;
    const baseZ = p.z + MUZZLE_Z;
    p.shotCounter++;

    for (let i = 0; i < count; i++) {
      const c = count > 1 ? i / (count - 1) - 0.5 : 0;
      let ox = c * w.barrelSpacing * Math.min(count, 3);
      if (count === 1) ox = (p.shotCounter % 2 === 0 ? -0.5 : 0.5) * w.barrelSpacing;
      const sx = p.x + ox;
      const sy = p.y - 0.1;
      const dir = this.computeAimDir(this.tmp, sx, sy, baseZ, w.projectileSpeed, aimPoint);
      const yaw = c * spread;
      const cos = Math.cos(yaw), sin = Math.sin(yaw);
      const dx = dir.x * cos + dir.z * sin;
      const dz = -dir.x * sin + dir.z * cos;
      this.spawnProjectile('player', 'player', sx, sy, baseZ, dx, dir.y, dz, w.projectileSpeed, w.damage * dmgMul, w.projectileRadius, w.lifetime, w.pierce, w.impactScale);
    }
    for (let i = 0; i < w.sideGuns; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      const off = 2.4 + Math.floor(i / 2) * 0.8;
      this.spawnProjectile('player', 'playerSide', p.x + side * off, p.y - 0.25, baseZ + 1.5, 0, 0, -1, w.projectileSpeed, w.damage * 0.6 * dmgMul, w.projectileRadius * 0.8, w.lifetime, 0, w.impactScale);
    }
    if (w.secondaryEvery > 0 && p.shotCounter % w.secondaryEvery === 0) {
      const dir = this.computeAimDir(this.tmp, p.x, p.y, baseZ, w.projectileSpeed * 0.8, aimPoint);
      this.spawnProjectile('player', 'playerSecondary', p.x, p.y, baseZ, dir.x, dir.y, dir.z, w.projectileSpeed * 0.8, w.damage * 2.5 * dmgMul, 1.1, w.lifetime * 1.2, 3, w.impactScale * 1.5);
    }
    this.stats.shotsFired += count + w.sideGuns + (w.secondaryEvery > 0 && p.shotCounter % w.secondaryEvery === 0 ? 1 : 0);
    this.events.push({ type: 'shot', weapon: w.id, x: p.x, y: p.y, z: baseZ, evolved: w.evolved });
  }

  private fireMissile(): void {
    const p = this.player;
    const side = p.missiles % 2 === 0 ? -1 : 1;
    const target = p.lockTargetId >= 0 ? this.findEnemy(p.lockTargetId) : this.pickTarget(null, 40);
    const mw = this.missileWeapon;
    const pr = this.spawnProjectile('player', 'missile', p.x + side * 1.6, p.y - 0.4, p.z - 1, side * 0.35, 0.1, -1, mw.projectileSpeed * 0.6, mw.damage, mw.projectileRadius, 4, 0, 1.6);
    if (pr) {
      pr.targetId = target?.id ?? -1;
      pr.turnRate = 4.2;
      pr.weapon = 'homingMissiles';
    }
    this.events.push({ type: 'missileLaunch', x: p.x + side * 1.6, y: p.y, z: p.z });
  }

  // ───────────────────────────────────────── projectiles ──

  private spawnProjectile(
    owner: 'player' | 'enemy', kind: ProjectileKind,
    x: number, y: number, z: number, dx: number, dy: number, dz: number,
    speed: number, damage: number, radius: number, life: number, pierce: number, impactScale: number,
  ): Projectile | undefined {
    // Object pool: round-robin search for a free slot, never allocate during play.
    let pr: Projectile | undefined;
    const n = this.projectiles.length;
    for (let k = 0; k < n; k++) {
      const idx = (this.poolCursor + k) % n;
      if (!this.projectiles[idx].active) { pr = this.projectiles[idx]; this.poolCursor = (idx + 1) % n; break; }
    }
    if (!pr) return undefined; // Pool exhausted: drop the shot rather than allocate.
    const len = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
    pr.active = true;
    pr.owner = owner;
    pr.kind = kind;
    pr.weapon = owner === 'player' ? this.weapon.id : null;
    pr.x = pr.prevX = x; pr.y = pr.prevY = y; pr.z = pr.prevZ = z;
    pr.vx = (dx / len) * speed; pr.vy = (dy / len) * speed; pr.vz = (dz / len) * speed;
    pr.speed = speed;
    pr.damage = damage;
    pr.radius = radius;
    pr.life = life;
    pr.pierce = pierce;
    pr.lastHitId = -1;
    pr.targetId = -1;
    pr.turnRate = 0;
    pr.impactScale = impactScale;
    return pr;
  }

  private updateProjectiles(dt: number): void {
    for (const pr of this.projectiles) {
      if (!pr.active) continue;
      pr.life -= dt;
      if (pr.life <= 0) { pr.active = false; continue; }

      if (pr.kind === 'missile') {
        let target = pr.targetId >= 0 ? this.findEnemy(pr.targetId) : undefined;
        if (!target) {
          target = this.nearestEnemyTo(pr.x, pr.y, pr.z);
          pr.targetId = target?.id ?? -1;
        }
        pr.speed = Math.min(this.missileWeapon.projectileSpeed * 1.4, pr.speed + 60 * dt);
        if (target) {
          const d = normalizeInto(this.tmp, target.x - pr.x, target.y - pr.y, target.z - pr.z);
          const cur = normalizeInto(this.tmp2, pr.vx, pr.vy, pr.vz);
          const k = Math.min(1, pr.turnRate * dt);
          normalizeInto(cur, cur.x + (d.x - cur.x) * k, cur.y + (d.y - cur.y) * k, cur.z + (d.z - cur.z) * k);
          pr.vx = cur.x * pr.speed; pr.vy = cur.y * pr.speed; pr.vz = cur.z * pr.speed;
        } else {
          const cur = normalizeInto(this.tmp2, pr.vx, pr.vy, pr.vz);
          pr.vx = cur.x * pr.speed; pr.vy = cur.y * pr.speed; pr.vz = cur.z * pr.speed;
        }
      }

      pr.x += pr.vx * dt;
      pr.y += pr.vy * dt;
      pr.z += pr.vz * dt;
      if (
        pr.z < ARENA.cullMinZ || pr.z > ARENA.cullMaxZ ||
        Math.abs(pr.x) > ARENA.cullHalfWidth || Math.abs(pr.y) > ARENA.cullHalfHeight
      ) pr.active = false;
    }
  }

  private nearestEnemyTo(x: number, y: number, z: number): Enemy | undefined {
    let best: Enemy | undefined;
    let bestD = Infinity;
    for (const e of this.enemies) {
      if (!e.alive || e.z > z + 5) continue;
      const d = (e.x - x) ** 2 + (e.y - y) ** 2 + (e.z - z) ** 2;
      if (d < bestD) { bestD = d; best = e; }
    }
    return best;
  }

  // ───────────────────────────────────────── enemies ──

  private updateEnemies(dt: number): void {
    const p = this.player;
    for (const e of this.enemies) {
      if (!e.alive) continue;
      e.age += dt;
      e.stateTime += dt;
      e.hitFlash = Math.max(0, e.hitFlash - dt);
      const def = e.def;

      switch (def.behavior) {
        case 'swarm': {
          // Coordinated approach: drift towards the pilot's lane while weaving.
          if (e.z > -75 && e.z < -8) e.homeX += clamp(p.x - e.homeX, -1, 1) * 2.2 * dt;
          e.z += def.speed * dt;
          e.x = e.homeX + Math.sin(e.age * 1.7 + e.phase) * 2.6;
          e.y = e.homeY + Math.cos(e.age * 1.3 + e.phase) * 1.1;
          break;
        }
        case 'strafe': {
          if (e.state === 'enter') {
            e.z += def.speed * dt;
            if (e.z >= e.engageZ) { e.state = 'engage'; e.stateTime = 0; }
          } else if (e.state === 'engage') {
            e.z = approach(e.z, e.engageZ + Math.sin(e.stateTime * 1.1 + e.phase) * 3, 3, dt);
            this.updateDodge(e, dt);
            const tx = clamp(e.homeX + Math.sin(e.stateTime * 0.75 + e.phase) * 7, ARENA.minX - 1, ARENA.maxX + 1);
            e.x = approach(e.x, tx, 2, dt) + e.dodgeVx * dt;
            e.y = approach(e.y, e.homeY + Math.sin(e.stateTime * 0.9 + e.phase) * 1.6, 2, dt);
            this.tryEnemyFire(e, def.attack, dt);
            if (e.stateTime >= def.engageTime) { e.state = 'retreat'; e.stateTime = 0; }
          } else {
            e.z -= def.speed * 0.9 * dt;
            e.y += 5 * dt;
          }
          break;
        }
        case 'hover': {
          if (e.state === 'enter') {
            e.z += def.speed * dt;
            if (e.z >= e.engageZ) { e.state = 'engage'; e.stateTime = 0; }
          } else if (e.state === 'engage') {
            e.x = approach(e.x, e.homeX + Math.sin(e.stateTime * 0.45 + e.phase) * 8, 1.5, dt);
            e.y = approach(e.y, e.homeY + Math.sin(e.stateTime * 0.6) * 1.2, 1.5, dt);
            this.tryEnemyFire(e, def.attack, dt);
            if (e.stateTime >= def.engageTime) { e.state = 'retreat'; e.stateTime = 0; }
          } else {
            e.z -= def.speed * dt;
            e.y += 3 * dt;
          }
          break;
        }
        case 'boss':
          this.updateBoss(e, dt);
          break;
      }

      e.vx = (e.x - e.prevX) / dt;
      e.vy = (e.y - e.prevY) / dt;
      e.vz = (e.z - e.prevZ) / dt;
    }
  }

  /** Fighters occasionally side-step player projectiles heading their way. */
  private updateDodge(e: Enemy, dt: number): void {
    if (e.dodgeTimer > 0) {
      e.dodgeTimer -= dt;
      if (e.dodgeTimer <= 0) e.dodgeVx = 0;
      return;
    }
    e.dodgeCheck -= dt;
    if (e.dodgeCheck > 0 || e.def.dodgeSkill <= 0) return;
    e.dodgeCheck = 0.3;
    for (const pr of this.projectiles) {
      if (!pr.active || pr.owner !== 'player') continue;
      const dz = e.z - pr.z;
      if (dz > 0 || dz < -35) continue;
      if (Math.abs(pr.x - e.x) < 2.6 && Math.abs(pr.y - e.y) < 2.6) {
        if (this.rng.chance(e.def.dodgeSkill)) {
          e.dodgeVx = (pr.x > e.x ? -1 : 1) * 16;
          e.dodgeTimer = 0.35;
        }
        return;
      }
    }
  }

  private tryEnemyFire(e: Enemy, attack: EnemyAttack | null, dt: number, rateBoost = 1): void {
    if (!attack || !this.player.alive || this.endTimer >= 0) return;
    if (e.z < -125 || e.z > -12) return;
    e.fireTimer -= dt;
    if (e.fireTimer > 0) return;
    e.fireTimer = (attack.interval / (this.difficulty.enemyFireRate * rateBoost)) * this.rng.range(0.85, 1.15);
    this.fireEnemyVolley(e, attack, attack.count, attack.spreadDeg);
  }

  private fireEnemyVolley(e: Enemy, attack: EnemyAttack, count: number, spreadDeg: number): void {
    const p = this.player;
    const sz = e.z + e.def.radius * 0.7;
    const dir = attack.aimed ? normalizeInto(this.tmp, p.x - e.x, p.y - e.y, p.z - sz) : normalizeInto(this.tmp, 0, 0, 1);
    const speed = attack.speed * this.difficulty.enemyProjectileSpeed;
    const damage = attack.damage * this.difficulty.enemyDamage;
    const spread = degToRad(spreadDeg);
    const heavy = attack.radius >= 0.75;
    for (let i = 0; i < count; i++) {
      const c = count > 1 ? i / (count - 1) - 0.5 : 0;
      const yaw = c * spread;
      const cos = Math.cos(yaw), sin = Math.sin(yaw);
      const dx = dir.x * cos + dir.z * sin;
      const dz = -dir.x * sin + dir.z * cos;
      this.spawnProjectile('enemy', heavy ? 'enemyHeavy' : 'enemy', e.x, e.y, sz, dx, dir.y, dz, speed, damage, attack.radius, 220 / speed, 0, 1);
    }
    this.events.push({ type: 'enemyShot', x: e.x, y: e.y, z: sz, heavy });
  }

  private updateBoss(e: Enemy, dt: number): void {
    const def = e.def;
    if (e.state === 'enter') {
      e.z += def.speed * dt;
      e.x = approach(e.x, 0, 1, dt);
      if (e.z >= e.engageZ) { e.z = e.engageZ; e.state = 'engage'; e.stateTime = 0; }
      return;
    }
    e.x = Math.sin(e.stateTime * BOSS_RULES.sweepSpeed) * 9;
    e.y = e.homeY + Math.sin(e.stateTime * 0.4) * 2;
    e.z = e.engageZ + Math.sin(e.stateTime * 0.3) * 4;

    // Phase changes
    const ratio = e.hp / e.maxHp;
    const th = BOSS_RULES.phaseThresholds;
    let phase = 1;
    for (let i = 0; i < th.length; i++) if (ratio <= th[i]) phase = i + 1;
    if (phase !== e.bossPhase) {
      e.bossPhase = phase;
      this.events.push({ type: 'bossPhase', phase });
    }

    // Standard aimed volleys get faster and wider each phase.
    if (def.attack && e.telegraph <= 0) {
      const boosted = { ...def.attack, count: def.attack.count + (phase - 1) * 2, spreadDeg: def.attack.spreadDeg + (phase - 1) * 12 };
      this.tryEnemyFire(e, boosted, dt, 1 + (phase - 1) * 0.25);
    }

    // Heavy "energy wall" attack from phase 2: telegraphed, with a clearly marked safe gap.
    if (phase >= 2 && this.player.alive) {
      if (e.telegraph > 0) {
        e.telegraph -= dt;
        if (e.telegraph <= 0) this.fireWall(e);
      } else {
        e.heavyTimer -= dt;
        if (e.heavyTimer <= 0) {
          e.heavyTimer = BOSS_RULES.heavyAttackInterval / (phase >= 3 ? 1.35 : 1);
          e.telegraph = BOSS_RULES.telegraphTime;
          e.wallGapX = clamp(this.player.x + this.rng.range(-9, 9), ARENA.minX + 3, ARENA.maxX - 3);
          e.wallGapY = clamp(this.player.y + this.rng.range(-4, 4), ARENA.minY + 2, ARENA.maxY - 2);
          this.events.push({ type: 'bossWarning', gapX: e.wallGapX, gapY: e.wallGapY, time: BOSS_RULES.telegraphTime });
        }
      }
      // Reinforcements
      e.reinforceTimer -= dt;
      if (e.reinforceTimer <= 0) {
        e.reinforceTimer = BOSS_RULES.reinforcementInterval;
        for (let i = 0; i < 3; i++) {
          this.spawnEnemy(ENEMIES.scoutDrone, (i - 1) * 6, this.rng.range(0, 5), e.z - 20 - i * 4, false);
        }
      }
    }
  }

  private fireWall(e: Enemy): void {
    const R = BOSS_RULES;
    const speed = R.wallSpeed * this.difficulty.enemyProjectileSpeed;
    const damage = R.wallDamage * this.difficulty.enemyDamage;
    const z = e.z + 8;
    for (let x = ARENA.minX - 1; x <= ARENA.maxX + 1; x += R.wallSpacingX) {
      for (let y = ARENA.minY; y <= ARENA.maxY + 0.5; y += R.wallSpacingY) {
        const dx = x - e.wallGapX;
        const dy = y - e.wallGapY;
        if (dx * dx + dy * dy < R.wallGapRadius * R.wallGapRadius) continue;
        this.spawnProjectile('enemy', 'enemyWall', x, y, z, 0, 0, 1, speed, damage, 0.6, 260 / speed, 0, 1);
      }
    }
    this.events.push({ type: 'enemyShot', x: e.x, y: e.y, z, heavy: true });
  }

  // ───────────────────────────────────────── power-ups ──

  private dropPowerUp(x: number, y: number, z: number): void {
    let total = 0;
    for (const id of POWERUP_IDS) total += POWERUPS[id].weight;
    let r = this.rng.next() * total;
    let type: PowerUpId = 'health';
    for (const id of POWERUP_IDS) {
      r -= POWERUPS[id].weight;
      if (r <= 0) { type = id; break; }
    }
    this.spawnPowerUp(type, x, y, z);
  }

  spawnPowerUp(type: PowerUpId, x: number, y: number, z: number): PowerUp {
    const u: PowerUp = {
      id: this.nextId++, type, alive: true,
      x: clamp(x, ARENA.minX, ARENA.maxX), y: clamp(y, ARENA.minY, ARENA.maxY), z,
      prevX: x, prevY: y, prevZ: z, age: 0,
    };
    this.powerUps.push(u);
    return u;
  }

  private updatePowerUps(dt: number): void {
    const p = this.player;
    for (const u of this.powerUps) {
      if (!u.alive) continue;
      u.age += dt;
      const dx = p.x - u.x, dy = p.y - u.y, dz = p.z - u.z;
      const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (p.alive && d < PLAYER_RULES.magnetRadius && d > 0.001) {
        const s = Math.min(d, POWERUP_RULES.magnetSpeed * dt) / d;
        u.x += dx * s; u.y += dy * s; u.z += dz * s;
      } else {
        u.z += POWERUP_RULES.driftSpeed * dt;
      }
      if (u.age > POWERUP_RULES.lifetime || u.z > ARENA.despawnZ) u.alive = false;
    }
  }

  applyPowerUp(type: PowerUpId): void {
    const p = this.player;
    const def = POWERUPS[type];
    switch (type) {
      case 'health':
        p.hp = Math.min(p.maxHp, p.hp + p.maxHp * def.amount);
        break;
      case 'shield':
        p.shieldMax = Math.max(p.shieldMax, p.maxHp * def.amount);
        p.shield = p.shieldMax;
        p.effects.shield = def.duration;
        break;
      case 'homingMissiles':
        p.missiles = Math.min(PLAYER_RULES.maxMissiles, p.missiles + def.amount);
        break;
      case 'energy':
        p.energy = p.maxEnergy;
        break;
      case 'specialCharge':
        p.specialCooldown = 0;
        break;
      case 'lightning':
        this.chainLightning(def.amount);
        break;
      case 'doubleDamage':
      case 'tripleFire':
      case 'speedBoost':
      case 'coinMultiplier':
      case 'invincibility':
        p.effects[type] = def.duration;
        break;
    }
  }

  private chainLightning(damage: number): void {
    const p = this.player;
    const targets = this.enemies
      .filter((e) => e.alive && e.z < p.z - 4 && e.z > -150)
      .sort((a, b) => (a.x - p.x) ** 2 + (a.z - p.z) ** 2 - ((b.x - p.x) ** 2 + (b.z - p.z) ** 2))
      .slice(0, 4);
    const points: Vec3[] = [];
    for (const e of targets) {
      points.push(vec3(e.x, e.y, e.z));
      this.damageEnemy(e, damage, false, 1.4);
    }
    this.events.push({ type: 'lightning', from: vec3(p.x, p.y, p.z), points });
  }

  // ───────────────────────────────────────── collisions ──

  private resolveCollisions(): void {
    const p = this.player;
    const enemies = this.enemies;

    // Broad phase: enemies into the spatial hash.
    this.hash.clear();
    let maxR = 0;
    for (let i = 0; i < enemies.length; i++) {
      const e = enemies[i];
      if (!e.alive) continue;
      this.hash.insert(i, e.x, e.z, e.def.radius);
      if (e.def.radius > maxR) maxR = e.def.radius;
    }

    for (const pr of this.projectiles) {
      if (!pr.active) continue;
      if (pr.owner === 'player') {
        const pad = pr.radius + maxR;
        const cands = this.hash.query(
          Math.min(pr.prevX, pr.x) - pad, Math.min(pr.prevZ, pr.z) - pad,
          Math.max(pr.prevX, pr.x) + pad, Math.max(pr.prevZ, pr.z) + pad,
          this.queryOut,
        );
        let bestT = 2;
        let bestE: Enemy | undefined;
        for (const idx of cands) {
          const e = enemies[idx];
          if (!e.alive || e.id === pr.lastHitId) continue;
          const t = segmentSphereHit(pr.prevX, pr.prevY, pr.prevZ, pr.x, pr.y, pr.z, pr.radius, e.x, e.y, e.z, e.def.radius);
          if (t >= 0 && t < bestT) { bestT = t; bestE = e; }
        }
        if (bestE) {
          this.stats.shotsHit++;
          this.damageEnemy(bestE, pr.damage, true, pr.impactScale);
          if (pr.pierce > 0) { pr.pierce--; pr.lastHitId = bestE.id; }
          else pr.active = false;
        }
      } else if (p.alive) {
        const t = segmentSphereHit(pr.prevX, pr.prevY, pr.prevZ, pr.x, pr.y, pr.z, pr.radius, p.x, p.y, p.z, PLAYER_HITBOX);
        if (t >= 0) {
          pr.active = false;
          this.damagePlayer(pr.damage);
        }
      }
    }

    if (!p.alive) return;

    // Rams
    for (const e of enemies) {
      if (!e.alive || e.def.behavior === 'boss') continue;
      if (spheresOverlap(p.x, p.y, p.z, PLAYER_RULES.radius, e.x, e.y, e.z, e.def.radius * 0.8)) {
        this.damagePlayer(PLAYER_RULES.ramDamageToPlayer);
        this.damageEnemy(e, PLAYER_RULES.ramDamageToEnemy, false, 1.2);
      }
    }

    // Pickups
    for (const u of this.powerUps) {
      if (!u.alive) continue;
      if (spheresOverlap(p.x, p.y, p.z, PLAYER_RULES.pickupRadius, u.x, u.y, u.z, POWERUP_RULES.radius)) {
        u.alive = false;
        this.stats.powerUpsCollected++;
        this.applyPowerUp(u.type);
        this.events.push({ type: 'pickup', powerUp: u.type, x: u.x, y: u.y, z: u.z });
      }
    }
  }

  private damageEnemy(e: Enemy, baseDamage: number, canCrit: boolean, impactScale: number): void {
    const st = this.aircraft.stats;
    const res = computeDamage(
      {
        baseDamage,
        firepower: st.firepower,
        critChance: canCrit ? st.critChance : 0,
        critMultiplier: st.critDamage,
        targetArmor: e.def.armor,
      },
      this.rng,
    );
    // Boss is shielded while flying in.
    if (e.def.behavior === 'boss' && e.state === 'enter') res.amount *= 0.2;
    e.hp -= res.amount;
    e.hitFlash = 0.12;
    this.events.push({ type: 'hit', x: e.x, y: e.y, z: e.z + e.def.radius * 0.5, crit: res.crit, damage: res.amount, enemyId: e.id, impactScale });
    if (e.hp <= 0) this.killEnemy(e);
  }

  private killEnemy(e: Enemy): void {
    if (!e.alive) return;
    e.alive = false;
    e.hp = 0;
    const s = this.stats;
    s.kills++;
    if (e.counted) s.enemiesDestroyed++;
    s.combo++;
    s.comboTimer = COMBO_RULES.window;
    const newMult = Math.min(COMBO_RULES.maxMultiplier, 1 + Math.floor(s.combo / COMBO_RULES.step));
    if (newMult > s.comboMultiplier) this.events.push({ type: 'combo', multiplier: newMult });
    s.comboMultiplier = newMult;
    s.maxComboMultiplier = Math.max(s.maxComboMultiplier, newMult);
    s.score += Math.round(e.def.score * s.comboMultiplier);
    const coinMul = this.player.effects.coinMultiplier > 0 ? POWERUPS.coinMultiplier.amount : 1;
    s.coins += e.def.coins * coinMul;
    s.xp += e.def.xp;
    if (this.player.lockTargetId === e.id) this.player.lockTargetId = -1;

    const size = e.def.behavior === 'boss' ? 5 : e.def.radius;
    this.events.push({ type: 'explosion', x: e.x, y: e.y, z: e.z, size, color: e.def.color, enemyId: e.id });

    if (e.def.behavior === 'boss') {
      for (let i = 0; i < 3; i++) this.dropPowerUp(e.x + (i - 1) * 3, e.y, e.z + 4);
    } else if (this.rng.chance(e.def.dropChance)) {
      this.dropPowerUp(e.x, e.y, e.z);
    }
  }

  private damagePlayer(amount: number): void {
    const p = this.player;
    if (!p.alive || p.invulnerable > 0 || p.effects.invincibility > 0 || this.endTimer >= 0) return;
    const st = this.aircraft.stats;
    const dmg = computeDamage(
      { baseDamage: amount, firepower: 100, critChance: 0, critMultiplier: 1, targetArmor: st.armor, multiplier: this.difficulty.playerDamageTaken },
      this.rng,
    ).amount;
    const res = absorbWithShield(dmg, p.shield);
    p.shield = res.shieldLeft;
    p.hp -= res.toHealth;
    this.stats.damageTaken += res.toHealth;
    p.invulnerable = PLAYER_RULES.hitInvulnerability;
    this.events.push({ type: 'playerHit', damage: res.toHealth, shieldOnly: res.toHealth === 0 });
    if (p.hp <= 0) {
      p.hp = 0;
      p.alive = false;
      this.endTimer = DEFEAT_DELAY;
      this.events.push({ type: 'explosion', x: p.x, y: p.y, z: p.z, size: 3, color: '#59c8ff', enemyId: -1 });
    }
  }

  // ───────────────────────────────────────── housekeeping ──

  private cleanup(): void {
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      if (e.alive) {
        if (e.z > ARENA.despawnZ) {
          e.alive = false;
          this.stats.escaped++;
        } else if (e.state === 'retreat' && e.z < ARENA.spawnZ - 15) {
          e.alive = false;
          this.stats.escaped++;
        }
      }
      if (!e.alive) {
        if (e.id === this.player.lockTargetId) this.player.lockTargetId = -1;
        this.enemies[i] = this.enemies[this.enemies.length - 1];
        this.enemies.pop();
      }
    }
    for (let i = this.powerUps.length - 1; i >= 0; i--) {
      if (!this.powerUps[i].alive) {
        this.powerUps[i] = this.powerUps[this.powerUps.length - 1];
        this.powerUps.pop();
      }
    }
  }

  private updateCombo(dt: number): void {
    const s = this.stats;
    if (s.comboTimer > 0) {
      s.comboTimer -= dt;
      if (s.comboTimer <= 0) { s.combo = 0; s.comboMultiplier = 1; }
    }
  }

  private updateEnd(dt: number): void {
    if (this.endTimer < 0) return;
    this.endTimer -= dt;
    if (this.endTimer > 0) return;
    if (this.player.alive) {
      this.status = 'victory';
      this.events.push({ type: 'victory' });
    } else {
      this.status = 'defeat';
      this.events.push({ type: 'defeat' });
    }
  }
}
