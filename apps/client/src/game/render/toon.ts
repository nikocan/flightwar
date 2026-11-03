import * as THREE from 'three';

/** Cartoon design tokens (shared by 3D materials; CSS mirrors them as --c-* variables). */
export const PALETTE = {
  sky: '#67C9FF',
  ocean: '#38BDF8',
  navy: '#164B89',
  mint: '#72DDA5',
  pink: '#FFB7D8',
  purple: '#B49CFF',
  yellow: '#FFD76A',
  coral: '#FF7878',
  white: '#FFFFFF',
  // Derived shades used by models
  red: '#F2434F',
  blue: '#2F7BEA',
  deepPurple: '#6B3FD6',
  violet: '#8E5CF7',
  orange: '#FF8A3D',
  outline: '#1B2A55',
} as const;

let gradient: THREE.DataTexture | null = null;

/** 4-step soft toon ramp: deep shadow, shadow, mid, light. */
export function toonGradient(): THREE.DataTexture {
  if (gradient) return gradient;
  const data = new Uint8Array([90, 90, 90, 255, 150, 150, 150, 255, 210, 210, 210, 255, 255, 255, 255, 255]);
  gradient = new THREE.DataTexture(data, 4, 1, THREE.RGBAFormat);
  gradient.minFilter = THREE.NearestFilter;
  gradient.magFilter = THREE.NearestFilter;
  gradient.generateMipmaps = false;
  gradient.needsUpdate = true;
  return gradient;
}

/** Cel-shaded material with a soft rim highlight for the glossy cartoon look. */
export function toonMat(color: THREE.ColorRepresentation, opts: { emissive?: THREE.ColorRepresentation; emissiveIntensity?: number; rim?: number } = {}): THREE.MeshToonMaterial {
  const m = new THREE.MeshToonMaterial({
    color,
    gradientMap: toonGradient(),
    emissive: opts.emissive ?? '#000000',
    emissiveIntensity: opts.emissiveIntensity ?? 1,
  });
  const rim = opts.rim ?? 0.2;
  if (rim > 0) {
    m.onBeforeCompile = (shader) => {
      shader.uniforms.uRim = { value: rim };
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', '#include <common>\nuniform float uRim;')
        .replace(
          '#include <opaque_fragment>',
          `float rimF = pow(1.0 - clamp(dot(normalize(vViewPosition) * -1.0, normal), 0.0, 1.0), 5.0);
           outgoingLight += vec3(rimF * uRim);
           #include <opaque_fragment>`,
        );
    };
    m.customProgramCacheKey = () => `toon-rim-${rim}`;
  }
  return m;
}

/** Glossy cockpit / gem material (clear-coated). */
export function glossMat(color: THREE.ColorRepresentation, emissive: THREE.ColorRepresentation = '#000000', emissiveIntensity = 0.4): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({
    color,
    metalness: 0.1,
    roughness: 0.08,
    clearcoat: 1,
    clearcoatRoughness: 0.05,
    emissive,
    emissiveIntensity,
  });
}

/** Unlit glowing material (engines, reactor, lights) that feeds the bloom pass. */
export function glowMat(color: THREE.ColorRepresentation, intensity = 1.6): THREE.MeshBasicMaterial {
  const c = new THREE.Color(color).multiplyScalar(intensity);
  return new THREE.MeshBasicMaterial({ color: c, toneMapped: false });
}

const outlineMats = new Map<string, THREE.MeshBasicMaterial>();

/**
 * Inverted-hull outline: a slightly enlarged back-face copy of the mesh in a dark navy.
 * Gives the clean "illustrated" silhouette of animated games at one extra draw per mesh.
 */
export function addOutline(mesh: THREE.Mesh, thickness = 0.07, color: string = PALETTE.outline): THREE.Mesh {
  let mat = outlineMats.get(color + thickness);
  if (!mat) {
    mat = new THREE.MeshBasicMaterial({ color, side: THREE.BackSide });
    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uThick = { value: thickness };
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nuniform float uThick;')
        .replace('#include <begin_vertex>', 'vec3 transformed = position + normal * uThick;');
    };
    mat.customProgramCacheKey = () => `outline-${thickness}`;
    outlineMats.set(color + thickness, mat);
  }
  // Child of the mesh so it inherits every later transform change.
  const o = new THREE.Mesh(mesh.geometry, mat);
  o.name = 'outline';
  o.renderOrder = -1;
  mesh.add(o);
  return o;
}

/** Smooth rounded "pill" body built from a lathe profile (nose → -Z). */
export function roundedBody(length: number, radius: number, noseSharpness = 0.55, tailRadius = 0.55, segments = 40): THREE.BufferGeometry {
  const pts: THREE.Vector2[] = [];
  const n = 28;
  for (let i = 0; i <= n; i++) {
    const t = i / n; // 0 tail → 1 nose
    // Bulgy cartoon profile: fat middle, rounded tail, soft pointed nose.
    const nose = Math.pow(Math.sin(Math.min(1, (1 - t) / noseSharpness) * Math.PI * 0.5), 0.7);
    const tail = tailRadius + (1 - tailRadius) * Math.sin(Math.min(1, t / 0.25) * Math.PI * 0.5);
    const r = radius * Math.min(nose, tail);
    pts.push(new THREE.Vector2(Math.max(0.001, r), (t - 0.5) * length));
  }
  pts[0].x = 0.001;
  pts[n].x = 0.001;
  const g = new THREE.LatheGeometry(pts, segments);
  g.rotateX(-Math.PI / 2);
  g.computeVertexNormals();
  return g;
}

/** Thick, soft-edged wing/fin from a 2D outline (x, z), with generous rounded bevels. */
export function softPlate(points: [number, number][], thickness: number, bevel = 0.12): THREE.BufferGeometry {
  const shape = new THREE.Shape(points.map(([x, z]) => new THREE.Vector2(x, z)));
  const g = new THREE.ExtrudeGeometry(shape, {
    depth: thickness,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 5,
    curveSegments: 16,
  });
  g.rotateX(Math.PI / 2);
  g.translate(0, thickness / 2, 0);
  g.computeVertexNormals();
  return g;
}

/** Rounded wing outline helper: Catmull-Rom smoothed polygon for soft curved wings. */
export function smoothOutline(points: [number, number][], samples = 6): [number, number][] {
  const curve = new THREE.CatmullRomCurve3(points.map(([x, z]) => new THREE.Vector3(x, 0, z)), true, 'centripetal', 0.5);
  return curve.getPoints(points.length * samples).map((p) => [p.x, p.z] as [number, number]);
}
