// Shared look: studio environment light + bloom + a real tilt-shift lens + vignette/grain, with an FPS guard.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const vert = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;

// Separable 13-tap gaussian whose radius grows away from a sharp horizontal band.
const TiltShift = {
  uniforms: { tDiffuse: { value: null }, uDir: { value: new THREE.Vector2(1, 0) }, uFocus: { value: 0.5 }, uBand: { value: 0.12 }, uAmount: { value: 0 } },
  vertexShader: vert,
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform vec2 uDir; uniform float uFocus, uBand, uAmount; varying vec2 vUv;
    void main(){
      float k = smoothstep(uBand, uBand + 0.32, abs(vUv.y - uFocus)) * uAmount;
      if (k < 0.01) { gl_FragColor = texture2D(tDiffuse, vUv); return; }
      vec4 sum = vec4(0.0); float wsum = 0.0;
      for (int i = -6; i <= 6; i++) {
        float f = float(i); float w = exp(-f * f / 18.0);
        sum += texture2D(tDiffuse, vUv + uDir * f * k) * w; wsum += w;
      }
      gl_FragColor = sum / wsum;
    }`,
};

// Replaces NaN/Inf pixels (from any shader, on any GPU) before bloom can blur them into black squares.
const Sanitize = {
  uniforms: { tDiffuse: { value: null } },
  vertexShader: vert,
  fragmentShader: `
    uniform sampler2D tDiffuse; varying vec2 vUv;
    void main(){
      vec4 c = texture2D(tDiffuse, vUv);
      if (any(isnan(c)) || any(isinf(c))) c = vec4(0.5, 0.5, 0.5, 1.0);
      gl_FragColor = vec4(clamp(c.rgb, 0.0, 16.0), clamp(c.a, 0.0, 1.0));
    }`,
};

const Finish = {
  uniforms: { tDiffuse: { value: null }, uTime: { value: 0 }, uVignette: { value: 0.35 }, uGrain: { value: 0.035 }, uAberration: { value: 0 }, uTint: { value: new THREE.Color(1, 1, 1) } },
  vertexShader: vert,
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform float uTime, uVignette, uGrain, uAberration; uniform vec3 uTint; varying vec2 vUv;
    float rand(vec2 c){ return fract(sin(dot(c, vec2(12.9898, 78.233))) * 43758.5453); }
    void main(){
      vec2 d = vUv - 0.5;
      vec4 c = texture2D(tDiffuse, vUv);
      if (uAberration > 0.0) { c.r = texture2D(tDiffuse, vUv + d * uAberration).r; c.b = texture2D(tDiffuse, vUv - d * uAberration).b; }
      c.rgb *= uTint;
      c.rgb *= 1.0 - uVignette * smoothstep(0.15, 0.85, length(d) * 1.35);
      c.rgb += (rand(vUv * 913.0) - 0.5) * uGrain;
      gl_FragColor = c;
    }`,
};

export function createFX(renderer, scene, camera, o = {}) {
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = o.exposure ?? 1;
  if (o.env !== false) {
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environmentIntensity = o.envIntensity ?? 0.6;
  }
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  composer.addPass(new ShaderPass(Sanitize));
  const extra = (o.passes || []).map((p) => (composer.addPass(p), p));
  const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), o.bloom ?? 0.5, o.bloomRadius ?? 0.55, o.bloomThreshold ?? 0.9);
  composer.addPass(bloom);
  const tsH = new ShaderPass(TiltShift), tsV = new ShaderPass(TiltShift);
  tsV.uniforms.uDir.value.set(0, 1);
  for (const p of [tsH, tsV]) { p.uniforms.uFocus.value = o.focus ?? 0.5; p.uniforms.uBand.value = o.band ?? 0.12; composer.addPass(p); }
  const finish = new ShaderPass(Finish);
  finish.uniforms.uVignette.value = o.vignette ?? 0.35;
  finish.uniforms.uGrain.value = o.grain ?? 0.035;
  composer.addPass(finish);
  composer.addPass(new OutputPass());

  let w = 1, h = 1, tilt = o.tilt ?? 2.2, tiltOn = true, maxPR = o.maxPR ?? 1.75, pr = 1;
  const applyTilt = () => {
    const on = tiltOn && tilt > 0;
    tsH.enabled = tsV.enabled = on;
    tsH.uniforms.uAmount.value = tilt / w * pr;
    tsV.uniforms.uAmount.value = tilt / h * pr;
  };
  const setSize = (W, H) => {
    w = Math.max(1, W); h = Math.max(1, H);
    pr = Math.min(devicePixelRatio || 1, maxPR);
    renderer.setPixelRatio(pr);
    renderer.setSize(w, h, false);
    composer.setPixelRatio(pr);
    composer.setSize(w, h);
    bloom.resolution.set(w, h);
    applyTilt();
    extra.forEach((p) => p.setSize?.(w * pr, h * pr));
  };

  // Frame-time guard: drop resolution, then extras, if the machine can't keep up.
  let acc = 0, frames = 0, level = 0;
  const guard = (dt) => {
    acc += dt; frames++;
    if (acc < 2) return;
    const avg = acc / frames; acc = 0; frames = 0;
    if (avg > 1 / 38 && level < 3) {
      level++;
      if (level === 1) { maxPR = 1.25; setSize(w, h); }
      if (level === 2) { extra.forEach((p) => (p.enabled = false)); renderer.shadowMap.enabled && (renderer.shadowMap.autoUpdate = true); }
      if (level === 3) { maxPR = 1; bloom.enabled = false; setSize(w, h); }
    }
  };

  return {
    composer, bloom, finish, tsH, tsV,
    setSize,
    setTilt(on) { tiltOn = on; applyTilt(); },
    setTiltAmount(a) { tilt = a; applyTilt(); },
    setFocus(f) { tsH.uniforms.uFocus.value = tsV.uniforms.uFocus.value = f; },
    render(dt, t) { finish.uniforms.uTime.value = t; composer.render(dt); guard(dt); },
  };
}
