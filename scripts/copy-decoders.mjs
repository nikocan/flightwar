// Copies the GLTF decoders shipped with three.js into the client's public folder so
// Draco- and KTX2-compressed assets load without any CDN.
import { cpSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
// three's package exports hide package.json, so resolve the main entry and walk up.
const threeRoot = resolve(dirname(require.resolve('three')), '..');
const out = resolve(import.meta.dirname, '../apps/client/public/decoders');
mkdirSync(out, { recursive: true });
cpSync(resolve(threeRoot, 'examples/jsm/libs/draco/gltf'), resolve(out, 'draco'), { recursive: true });
cpSync(resolve(threeRoot, 'examples/jsm/libs/basis'), resolve(out, 'basis'), { recursive: true });
console.log('[decoders] copied to', out);
