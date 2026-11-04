#!/usr/bin/env node
// Approves delivered production art for in-game use:  npm run art:approve -- falcon-x1 [more ids]
// Refuses unless each file exists and passes validation. Visual verification in game is still required
// before committing the change (see docs/PRODUCTION_ART_PIPELINE.md).
import { readFileSync, writeFileSync } from 'node:fs';
import { check, loadManifest, manifestPath } from './art-lib.mjs';

const ids = process.argv.slice(2).filter((a) => !a.startsWith('-'));
const revoke = process.argv.includes('--revoke');
if (ids.length === 0) {
  console.error('Usage: npm run art:approve -- <asset-id> [...]   (add --revoke to remove)');
  process.exit(2);
}
const { ART_MANIFEST, APPROVED_ART_IDS } = await loadManifest();
const approved = new Set(APPROVED_ART_IDS);
let failed = false;
for (const id of ids) {
  const a = ART_MANIFEST.find((x) => x.id === id);
  if (!a) { console.error(`✗ unknown asset id: ${id}`); failed = true; continue; }
  if (revoke) { approved.delete(id); console.log(`– revoked ${id}`); continue; }
  const r = check(a);
  if (r.state !== 'valid') {
    console.error(`✗ ${id}: ${r.state === 'missing' ? `file not found at apps/client/public${a.path}` : r.problems.join('; ')}`);
    failed = true;
    continue;
  }
  approved.add(id);
  console.log(`✓ ${id}: ${r.info.width}×${r.info.height} ${r.info.format}, alpha=${r.info.alpha}`);
}
if (failed) { console.error('Nothing changed.'); process.exit(1); }
const src = readFileSync(manifestPath, 'utf8');
const line = `export const APPROVED_ART_IDS: readonly string[] = [${[...approved].sort().map((x) => `'${x}'`).join(', ')}];`;
const next = src.replace(/export const APPROVED_ART_IDS: readonly string\[\] = \[[^\]]*\];/, line);
if (next === src && !src.includes(line)) { console.error('Could not update APPROVED_ART_IDS line.'); process.exit(1); }
writeFileSync(manifestPath, next);
console.log(`Updated APPROVED_ART_IDS (${approved.size}). Now verify in game (screenshots) before committing,`);
console.log('and update the expectation in packages/shared/test/artManifest.test.ts.');
