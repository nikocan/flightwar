import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { QUALITY_PROFILES, useSettings } from '../../state/settings';

/** Linear-space colour grade: saturation, contrast, warm highlights / cool shadows, vignette. */
const GradeShader = {
  uniforms: {
    tDiffuse: { value: null },
    uSaturation: { value: 1.12 },
    uContrast: { value: 1.06 },
    uVignette: { value: 0.32 },
  },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform float uSaturation; uniform float uContrast; uniform float uVignette;
    varying vec2 vUv;
    void main(){
      vec4 c = texture2D(tDiffuse, vUv);
      float l = dot(c.rgb, vec3(0.2126, 0.7152, 0.0722));
      c.rgb = mix(vec3(l), c.rgb, uSaturation);
      c.rgb = (c.rgb - 0.18) * uContrast + 0.18;
      c.rgb *= mix(vec3(0.94, 0.97, 1.06), vec3(1.05, 1.0, 0.94), smoothstep(0.05, 0.8, l));
      vec2 d = vUv - 0.5;
      c.rgb *= 1.0 - uVignette * smoothstep(0.25, 0.85, dot(d, d) * 2.2);
      gl_FragColor = vec4(max(c.rgb, 0.0), c.a);
    }`,
};

/**
 * Cinematic post-processing (bloom + grade + ACES output) with adaptive resolution.
 * Takes over rendering from R3F (positive useFrame priority). Disabled on the Low preset.
 */
export function PostFX() {
  const { gl, scene, camera, size, setDpr } = useThree();
  const quality = useSettings((s) => s.quality);
  const q = QUALITY_PROFILES[quality];
  const perf = useRef({ frames: 0, time: 0, dpr: q.dpr[1] });

  const composer = useMemo(() => {
    if (!q.bloom) return null;
    const target = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: q.antialias ? 4 : 0 });
    const c = new EffectComposer(gl, target);
    c.addPass(new RenderPass(scene, camera));
    const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), q.bloomStrength, 0.4, 0.98);
    c.addPass(bloom);
    c.addPass(new ShaderPass(GradeShader));
    c.addPass(new OutputPass());
    return c;
  }, [gl, scene, camera, q.bloom, q.bloomStrength, q.antialias]);

  useEffect(() => {
    gl.toneMapping = THREE.ACESFilmicToneMapping;
    gl.toneMappingExposure = 1.05;
  }, [gl]);

  useEffect(() => {
    if (!composer) return;
    composer.setPixelRatio(gl.getPixelRatio());
    composer.setSize(size.width, size.height);
    return undefined;
  }, [composer, size, gl]);

  useEffect(() => () => composer?.dispose(), [composer]);

  useFrame((_, dt) => {
    // Adaptive resolution: drop pixel ratio when below ~45 FPS, recover above ~58 FPS.
    const p = perf.current;
    p.frames++;
    p.time += dt;
    if (p.time > 2) {
      const fps = p.frames / p.time;
      const next = fps < 45 ? Math.max(q.dpr[0], p.dpr - 0.25) : fps > 58 ? Math.min(q.dpr[1], p.dpr + 0.25) : p.dpr;
      if (next !== p.dpr) {
        p.dpr = next;
        setDpr(next);
        composer?.setPixelRatio(next);
      }
      p.frames = 0;
      p.time = 0;
    }
    if (composer) composer.render(dt);
    else gl.render(scene, camera);
  }, 1);

  return null;
}
