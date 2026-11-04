// Shared validation for the production art package (used by check-art.mjs and art-approve.mjs).
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

export const root = resolve(import.meta.dirname, '..');
export const publicDir = resolve(root, 'apps/client/public');
export const manifestPath = resolve(root, 'packages/shared/src/art/manifest.ts');
export const loadManifest = () => import(manifestPath);

/** Returns { format, width, height, alpha } or null. */
export function readImageInfo(buf) {
  // PNG
  if (buf.length > 26 && buf.readUInt32BE(0) === 0x89504e47) {
    const width = buf.readUInt32BE(16);
    const height = buf.readUInt32BE(20);
    const colorType = buf[25];
    const hasTrns = buf.includes(Buffer.from('tRNS'));
    return { format: 'png', width, height, alpha: colorType === 6 || colorType === 4 || (colorType === 3 && hasTrns) };
  }
  // WebP
  if (buf.length > 30 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') {
    const chunk = buf.toString('ascii', 12, 16);
    if (chunk === 'VP8X') {
      const alpha = (buf[20] & 0x10) !== 0;
      const width = 1 + buf.readUIntLE(24, 3);
      const height = 1 + buf.readUIntLE(27, 3);
      return { format: 'webp', width, height, alpha };
    }
    if (chunk === 'VP8L') {
      const b = buf.readUInt32LE(21);
      return { format: 'webp', width: 1 + (b & 0x3fff), height: 1 + ((b >> 14) & 0x3fff), alpha: ((b >> 28) & 1) === 1 };
    }
    if (chunk === 'VP8 ') {
      return { format: 'webp', width: buf.readUInt16LE(26) & 0x3fff, height: buf.readUInt16LE(28) & 0x3fff, alpha: false };
    }
  }
  return null;
}

export function check(a) {
  const file = resolve(publicDir, '.' + a.path);
  if (!existsSync(file)) return { state: 'missing' };
  const info = readImageInfo(readFileSync(file));
  if (!info) return { state: 'invalid', problems: ['not a readable PNG/WebP file'] };
  const problems = [];
  const specAspect = a.sourceWidth / a.sourceHeight;
  const aspect = info.width / info.height;
  if (Math.abs(aspect - specAspect) / specAspect > 0.01) problems.push(`aspect ${info.width}×${info.height} ≠ ${a.sourceWidth}×${a.sourceHeight}`);
  if (info.width < a.sourceWidth * 0.5) problems.push(`too small: ${info.width}px wide (min ${a.sourceWidth / 2}px)`);
  if (a.alpha && !info.alpha) problems.push('no alpha channel (background must be transparent)');
  if (a.frames) {
    const rows = Math.ceil(a.frames.count / a.frames.columns);
    if (info.width % a.frames.columns || info.height % rows) problems.push(`frame grid ${a.frames.columns}×${rows} does not divide ${info.width}×${info.height}`);
  }
  return { state: problems.length ? 'invalid' : 'valid', info, problems };
}

