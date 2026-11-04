import { describe, expect, it } from 'vitest';
import { ART_CHAPTER_THEMES, ART_MANIFEST, PICKUP_ART_MAP, POWERUPS_WITHOUT_SHEET_ICON, artForGameplay } from '../src/art/manifest';
import { AIRCRAFT_ORDER } from '../src/config/aircraft';
import { CHAPTERS, MISSIONS } from '../src/config/missions';
import { POWERUP_IDS } from '../src/config/powerups';

describe('production art manifest', () => {
  it('has unique ids and paths under the production folder', () => {
    const ids = new Set(ART_MANIFEST.map((a) => a.id));
    const paths = new Set(ART_MANIFEST.map((a) => a.path));
    expect(ids.size).toBe(ART_MANIFEST.length);
    expect(paths.size).toBe(ART_MANIFEST.length);
    for (const a of ART_MANIFEST) {
      expect(a.path).toMatch(/^\/game-assets\/production\/.+\.(webp|png)$/);
      expect(a.sourceWidth).toBeGreaterThan(0);
      expect(a.sourceHeight).toBeGreaterThan(0);
      expect(a.reference.length).toBeGreaterThan(5);
    }
  });

  it('covers all 8 player aircraft', () => {
    for (const id of AIRCRAFT_ORDER) expect(artForGameplay('aircraft', id), id).toBeDefined();
    expect(ART_MANIFEST.filter((a) => a.category === 'aircraft' && !a.id.endsWith('-bank'))).toHaveLength(8);
  });

  it('covers 6 enemy types including every enemy used by missions', () => {
    expect(ART_MANIFEST.filter((a) => a.category === 'enemy')).toHaveLength(6);
    const used = new Set(Object.values(MISSIONS).flatMap((m) => m.waves.flatMap((w) => w.groups.map((g) => g.enemy))));
    used.delete('academyGuardian');
    for (const id of used) expect(artForGameplay('enemy', id), id).toBeDefined();
  });

  it('has 3 boss phases', () => {
    const phases = ART_MANIFEST.filter((a) => a.id.startsWith('shadow-commander-phase-'));
    expect(phases.map((p) => p.id)).toEqual(['shadow-commander-phase-1', 'shadow-commander-phase-2', 'shadow-commander-phase-3']);
  });

  it('has 5 environment layers for each of the 10 chapters', () => {
    expect([...ART_CHAPTER_THEMES]).toEqual(CHAPTERS.map((c) => c.theme));
    expect(ART_MANIFEST.filter((a) => a.category === 'environment')).toHaveLength(50);
  });

  it('maps pickups to real power-ups and lists the unmapped ones', () => {
    for (const p of Object.values(PICKUP_ART_MAP)) if (p) expect(POWERUP_IDS).toContain(p);
    const mapped = new Set(Object.values(PICKUP_ART_MAP).filter(Boolean));
    const unmapped = POWERUP_IDS.filter((p) => !mapped.has(p));
    expect(unmapped.sort()).toEqual([...POWERUPS_WITHOUT_SHEET_ICON].sort());
  });

  it('flipbook atlases have consistent frame grids', () => {
    for (const a of ART_MANIFEST.filter((x) => x.frames)) {
      const f = a.frames!;
      const rows = Math.ceil(f.count / f.columns);
      expect(f.columns).toBeGreaterThan(0);
      expect(a.sourceWidth % f.columns, a.id).toBe(0);
      expect(a.sourceHeight % rows, a.id).toBe(0);
    }
  });

  it('nothing is approved before the production package has been delivered and verified', () => {
    expect(ART_MANIFEST.filter((a) => a.status === 'approved')).toEqual([]);
  });
});
