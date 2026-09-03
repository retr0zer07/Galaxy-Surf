import * as THREE from 'three';
import { makeRandom, gauss } from './utils.js';

/* ==================================================================
 *  Sagitario A*
 *  Trazado de geodésicas en una métrica de Schwarzschild.
 *  Unidades: radio de Schwarzschild = 1 (M = 0.5, c = 1).
 * ================================================================== */

const VERT = /* glsl */`
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const FRAG = /* glsl */`
  precision highp float;

  varying vec2 vUv;

  uniform vec3      uCamPos;
  uniform mat4      uCamWorld;
  uniform float     uTanHalfFov;
  uniform float     uAspect;
  uniform float     uTime;
  uniform float     uDiskIn;
  uniform float     uDiskOut;
  uniform sampler2D uSky;

  #define PI 3.14159265359
  #define STEPS 320
  #define HORIZON 1.0

  /* ---------- ruido ---------- */
  float hash(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }

  float vnoise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash(i), b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0)), d = hash(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }

  float fbm(vec2 p) {
    float s = 0.0, a = 0.5;
    for (int i = 0; i < 5; i++) {
      s += a * vnoise(p);
      p *= 2.03;
      a *= 0.5;
    }
    return s;
  }

  /* ---------- fondo estelar ---------- */
  float hash13(vec3 p) {
    p = fract(p * 0.1031);
    p += dot(p, p.yzx + 33.33);
    return fract((p.x + p.y) * p.z);
  }

  // Estrellas procedurales: se mantienen puntuales por muy magnificadas
  // que las deje la lente gravitacional
  vec3 starField(vec3 d) {
    vec3 col = vec3(0.0);
    float k = 90.0;
    for (int L = 0; L < 3; L++) {
      vec3 p = d * k;
      vec3 ip = floor(p);
      vec3 fp = fract(p) - 0.5;
      float h = hash13(ip);
      if (h > 0.90) {
        vec3 off = vec3(hash13(ip + 1.7), hash13(ip + 5.3), hash13(ip + 9.1)) - 0.5;
        float dist = length(fp - off * 0.72);
        float lum = pow(fract(h * 91.7), 3.2);
        float b = smoothstep(0.16, 0.0, dist) * (0.15 + lum);
        vec3 tint = mix(vec3(0.72, 0.82, 1.05), vec3(1.05, 0.88, 0.70), fract(h * 57.3));
        col += tint * b * 1.5;
      }
      k *= 2.35;
    }
    return col;
  }

  vec3 sky(vec3 d) {
    vec2 uv = vec2(atan(d.z, d.x) / (2.0 * PI) + 0.5,
                   acos(clamp(d.y, -1.0, 1.0)) / PI);
    return texture2D(uSky, uv).rgb + starField(d);
  }

  /* ---------- disco de acreción ---------- */
  vec4 disk(vec3 p, vec3 rd) {
    float r = length(p.xz);
    float t = (r - uDiskIn) / (uDiskOut - uDiskIn);
    if (t < 0.0 || t > 1.0) return vec4(0.0);

    float phi = atan(p.z, p.x);
    // rotación kepleriana: el gas interior gira mucho más rápido
    float omega = 5.5 / pow(r, 1.5);
    float a = phi + omega * uTime;

    // el brazo espiral se enrolla con el radio
    vec2 q = vec2(a * 1.6 + log(r) * 2.4, log(r) * 3.4);
    float n1 = fbm(q * vec2(1.0, 1.0));
    float n2 = fbm(q * vec2(3.4, 2.2) + 11.0);
    float filaments = mix(n1, n2, 0.45);

    float dens = pow(1.0 - t, 1.35) * (0.30 + 1.25 * filaments);
    dens *= smoothstep(0.0, 0.10, t) * smoothstep(1.0, 0.68, t);

    // temperatura del disco delgado: T ~ r^-3/4
    float T = pow(uDiskIn / r, 0.75);
    vec3 col = mix(vec3(1.00, 0.30, 0.06), vec3(1.00, 0.72, 0.30), smoothstep(0.20, 0.62, T));
    col = mix(col, vec3(1.00, 0.95, 0.78), smoothstep(0.62, 0.88, T));
    col = mix(col, vec3(0.78, 0.90, 1.30), smoothstep(0.88, 1.00, T));

    // beaming relativista: el lado que se acerca se vuelve mucho más brillante
    float beta = 0.72 / sqrt(r);
    vec3 vel = normalize(cross(vec3(0.0, 1.0, 0.0), p)) * beta;
    float doppler = 1.0 / max(1.0 - dot(vel, -rd), 0.16);
    col *= min(pow(doppler, 3.0), 7.0);

    // corrimiento al rojo gravitacional
    float g = sqrt(max(1.0 - HORIZON / r, 0.02));
    col *= g;
    col = mix(col * vec3(1.25, 0.72, 0.45), col, g);

    return vec4(col * dens * 0.88, clamp(dens * 1.15, 0.0, 1.0));
  }

  void main() {
    vec2 ndc = vUv * 2.0 - 1.0;
    vec3 rd = normalize(vec3(ndc.x * uAspect * uTanHalfFov, ndc.y * uTanHalfFov, -1.0));
    rd = normalize((uCamWorld * vec4(rd, 0.0)).xyz);

    vec3 pos = uCamPos;
    vec3 dir = rd;

    // momento angular específico del fotón: constante del movimiento
    float h2 = dot(cross(pos, dir), cross(pos, dir));

    vec3  color = vec3(0.0);
    float trans = 1.0;
    bool  captured = false;

    for (int i = 0; i < STEPS; i++) {
      float r2 = dot(pos, pos);
      float r = sqrt(r2);

      if (r < HORIZON) { captured = true; break; }
      if (r > 260.0 && dot(pos, dir) > 0.0) break;
      if (trans < 0.01) break;

      float dt = clamp(0.055 * r, 0.012, 2.2);

      // deflexión de Schwarzschild sobre el fotón
      vec3 acc = -1.5 * h2 * pos / (r2 * r2 * r);
      vec3 npos = pos + dir * dt + 0.5 * acc * dt * dt;
      vec3 ndir = normalize(dir + acc * dt);

      // cruce del plano ecuatorial: aquí vive el disco
      if (pos.y * npos.y < 0.0) {
        float f = pos.y / (pos.y - npos.y);
        vec3 hit = mix(pos, npos, f);
        vec4 d = disk(hit, normalize(mix(dir, ndir, f)));
        color += d.rgb * trans;
        trans *= 1.0 - d.a * 0.82;
      }

      pos = npos;
      dir = ndir;
    }

    if (!captured) color += sky(dir) * trans;

    gl_FragColor = vec4(color, 1.0);
  }
`;

export class BlackHole {
  constructor() {
    this.group = new THREE.Group();
    this.time = 0;

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uCamPos: { value: new THREE.Vector3() },
        uCamWorld: { value: new THREE.Matrix4() },
        uTanHalfFov: { value: 0.5 },
        uAspect: { value: 1 },
        uTime: { value: 0 },
        uDiskIn: { value: 3.0 },
        uDiskOut: { value: 15.0 },
        uSky: { value: this.#skyTexture() }
      },
      vertexShader: VERT,
      fragmentShader: FRAG,
      depthTest: false,
      depthWrite: false
    });

    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.material);
    quad.frustumCulled = false;
    quad.renderOrder = -10;
    this.group.add(quad);

    // Anclas invisibles para las etiquetas del HUD
    this.anchors = {};
    for (const [id, p] of Object.entries({
      horizon: [0, 0, 0],
      photon: [0, 2.0, 0],
      disk: [12.5, 0, 0]
    })) {
      const a = new THREE.Object3D();
      a.position.fromArray(p);
      this.group.add(a);
      this.anchors[id] = a;
    }
  }

  /* Cielo equirectangular: solo la nebulosidad difusa de fondo.
     Las estrellas puntuales las genera el shader para no pixelarse. */
  #skyTexture() {
    const w = 2048, h = 1024;
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const ctx = c.getContext('2d');
    const rnd = makeRandom(777);

    ctx.fillStyle = '#01020a';
    ctx.fillRect(0, 0, w, h);

    // Banda de la Vía Láctea, inclinada sobre el ecuador
    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.rotate(-0.32);
    ctx.translate(-w / 2, -h / 2);
    const band = ctx.createLinearGradient(0, h * 0.36, 0, h * 0.64);
    band.addColorStop(0.0, 'rgba(30,44,92,0)');
    band.addColorStop(0.35, 'rgba(74,86,140,0.30)');
    band.addColorStop(0.5, 'rgba(186,178,168,0.42)');
    band.addColorStop(0.65, 'rgba(74,86,140,0.30)');
    band.addColorStop(1.0, 'rgba(30,44,92,0)');
    ctx.fillStyle = band;
    ctx.fillRect(0, h * 0.36, w, h * 0.28);

    const core = ctx.createRadialGradient(w * 0.34, h * 0.5, 0, w * 0.34, h * 0.5, h * 0.34);
    core.addColorStop(0.0, 'rgba(255,222,170,0.5)');
    core.addColorStop(1.0, 'rgba(255,190,130,0)');
    ctx.fillStyle = core;
    ctx.fillRect(0, 0, w, h);

    ctx.globalCompositeOperation = 'destination-out';
    for (let i = 0; i < 420; i++) {
      const x = rnd() * w;
      const y = h * 0.5 + gauss(rnd) * h * 0.05;
      ctx.fillStyle = `rgba(0,0,0,${0.2 + rnd() * 0.5})`;
      ctx.beginPath();
      ctx.ellipse(x, y, 24 + rnd() * 150, 3 + rnd() * 16, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.restore();

    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = THREE.RepeatWrapping;
    return t;
  }

  update(dt, camera, timeScale) {
    this.time += dt * (0.25 + timeScale * 0.035);
    const u = this.material.uniforms;
    u.uTime.value = this.time;
    u.uCamPos.value.copy(camera.position);
    u.uCamWorld.value.copy(camera.matrixWorld);
    u.uTanHalfFov.value = Math.tan((camera.fov * Math.PI) / 360);
    u.uAspect.value = camera.aspect;
  }

  dispose() {
    this.material.uniforms.uSky.value.dispose();
    this.material.dispose();
    this.group.traverse(o => o.geometry?.dispose());
  }
}
