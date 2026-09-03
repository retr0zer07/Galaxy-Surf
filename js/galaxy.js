import * as THREE from 'three';
import { GALAXY, POIS, armAngle } from './data.js';
import { makeRandom, gauss, clamp, lerp, starSprite, cloudSprite, flareSprite } from './utils.js';

/* ------------------------------------------------------------------ *
 *  Shaders
 * ------------------------------------------------------------------ */
const STAR_VERT = /* glsl */`
  attribute float aSize;
  attribute vec3  aColor;
  attribute float aSeed;
  uniform float uTime;
  uniform float uPixelRatio;
  uniform float uScale;
  varying vec3  vColor;
  varying float vTwinkle;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    float tw = 0.78 + 0.22 * sin(uTime * 1.7 + aSeed * 62.83);
    float dist = max(-mv.z, 0.05);
    // Atenuación suave: mantiene las estrellas lejanas como puntos nítidos
    gl_PointSize = clamp(aSize * uScale * uPixelRatio * tw / pow(dist, 0.72), 0.55, 40.0);
    vColor = aColor;
    vTwinkle = tw;
    gl_Position = projectionMatrix * mv;
  }
`;

const STAR_FRAG = /* glsl */`
  varying vec3  vColor;
  varying float vTwinkle;
  void main() {
    vec2 uv = gl_PointCoord - 0.5;
    float d = dot(uv, uv);
    if (d > 0.25) discard;
    float a = pow(1.0 - d * 4.0, 2.6);
    gl_FragColor = vec4(vColor * a * 0.95, a * vTwinkle);
  }
`;

const CLOUD_VERT = /* glsl */`
  attribute float aSize;
  attribute vec3  aColor;
  attribute float aOpacity;
  attribute float aRot;
  uniform float uPixelRatio;
  uniform float uScale;
  varying vec3  vColor;
  varying float vOpacity;
  varying float vRot;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    float dist = max(-mv.z, 0.05);
    gl_PointSize = clamp(aSize * uScale * uPixelRatio / dist, 1.0, 1600.0);
    vColor = aColor;
    vOpacity = aOpacity;
    vRot = aRot;
    gl_Position = projectionMatrix * mv;
  }
`;

const CLOUD_FRAG = /* glsl */`
  uniform sampler2D uMap;
  varying vec3  vColor;
  varying float vOpacity;
  varying float vRot;
  void main() {
    vec2 uv = gl_PointCoord - 0.5;
    float s = sin(vRot), c = cos(vRot);
    uv = vec2(uv.x * c - uv.y * s, uv.x * s + uv.y * c) + 0.5;
    vec4 tex = texture2D(uMap, uv);
    gl_FragColor = vec4(vColor, tex.a * vOpacity);
  }
`;

/* Paleta estelar por clase espectral */
const STAR_COLORS = {
  young: ['#cfe4ff', '#a9ccff', '#8fbcff', '#dfeaff', '#ffffff'],
  mid:   ['#fff4e2', '#ffe9c9', '#ffdcae', '#f7f2ea'],
  old:   ['#ffc98a', '#ff9f63', '#ffb27a', '#ffd7a6'],
  hot:   ['#9ec3ff', '#7fb0ff', '#b9d6ff']
};
const pick = (arr, rnd) => arr[Math.floor(rnd() * arr.length)];

/* ------------------------------------------------------------------ *
 *  Vía Láctea procedural
 * ------------------------------------------------------------------ */
export class Galaxy {
  constructor() {
    this.group = new THREE.Group();
    this.markers = [];
    this.rnd = makeRandom(20260902);
    this.starTex = starSprite();
    this.cloudTex = cloudSprite(256, 11);
    this.flareTex = flareSprite();
    this.materials = [];
    this.time = 0;

    this.#buildDisk();
    this.#buildBulge();
    this.#buildHalo();
    this.#buildDust();
    this.#buildNebulae();
    this.#buildCore();
    this.#buildMarkers();
  }

  /* --------- material helpers --------- */
  #starMaterial(scale = 46) {
    const m = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uPixelRatio: { value: Math.min(devicePixelRatio, 2) },
        uScale: { value: scale }
      },
      vertexShader: STAR_VERT,
      fragmentShader: STAR_FRAG,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    this.materials.push(m);
    return m;
  }

  #cloudMaterial(blending, scale = 260) {
    const m = new THREE.ShaderMaterial({
      uniforms: {
        uMap: { value: this.cloudTex },
        uPixelRatio: { value: Math.min(devicePixelRatio, 2) },
        uScale: { value: scale }
      },
      vertexShader: CLOUD_VERT,
      fragmentShader: CLOUD_FRAG,
      transparent: true,
      depthWrite: false,
      blending
    });
    // El polvo debe absorber luz, no añadirla: dst *= (1 - alpha)
    if (blending === THREE.CustomBlending) {
      m.blendEquation = THREE.AddEquation;
      m.blendSrc = THREE.ZeroFactor;
      m.blendDst = THREE.OneMinusSrcAlphaFactor;
    }
    return m;
  }

  #points(arrays, material, renderOrder = 0) {
    const g = new THREE.BufferGeometry();
    for (const [name, data, size] of arrays) {
      g.setAttribute(name, new THREE.BufferAttribute(data, size));
    }
    g.computeBoundingSphere();
    const p = new THREE.Points(g, material);
    p.frustumCulled = false;
    p.renderOrder = renderOrder;
    this.group.add(p);
    return p;
  }

  /* --------------------------------------------------------------
   *  Disco: brazos espirales + población de campo + cúmulos jóvenes
   * -------------------------------------------------------------- */
  #buildDisk() {
    const rnd = this.rnd;
    const N = GALAXY.diskStars;
    const pos = new Float32Array(N * 3);
    const col = new Float32Array(N * 3);
    const siz = new Float32Array(N);
    const sed = new Float32Array(N);
    const c = new THREE.Color();

    // Cúmulos de formación estelar repartidos sobre los brazos
    const clusters = [];
    for (let i = 0; i < 190; i++) {
      const arm = i % GALAXY.armCount;
      const r = lerp(GALAXY.coreRadius, GALAXY.radius * 0.96, Math.pow(rnd(), 0.75));
      const a = armAngle(r, arm) + gauss(rnd) * 0.06;
      clusters.push({
        x: Math.cos(a) * r, z: Math.sin(a) * r,
        y: gauss(rnd) * 0.35,
        rad: 0.5 + rnd() * 1.7,
        hot: rnd() < 0.55
      });
    }

    for (let i = 0; i < N; i++) {
      let x, y, z, tightness, hot = false;

      const roll = rnd();
      if (roll < 0.10) {
        // --- estrellas nacidas en cúmulos ---
        const cl = clusters[Math.floor(rnd() * clusters.length)];
        x = cl.x + gauss(rnd) * cl.rad;
        z = cl.z + gauss(rnd) * cl.rad;
        y = cl.y + gauss(rnd) * cl.rad * 0.35;
        tightness = 0.94;
        hot = cl.hot;
      } else {
        // --- perfil radial exponencial truncado ---
        let r = -11.5 * Math.log(1 - rnd() * 0.9995);
        r = clamp(r, GALAXY.coreRadius * 0.42, GALAXY.radius);

        const arm = Math.floor(rnd() * GALAXY.armCount);
        // dispersión angular: brazos nítidos fuera, difusos en el interior
        const spread = 0.27 + 1.3 / r;
        const off = gauss(rnd);
        const field = roll > 0.78;          // 22 % población de campo (inter-brazo)
        const a = field
          ? rnd() * Math.PI * 2
          : armAngle(r, arm) + off * spread;

        // ligera deriva: el borde exterior se abre (flare del disco)
        const rr = r * (1 + gauss(rnd) * 0.035);
        x = Math.cos(a) * rr;
        z = Math.sin(a) * rr;

        const thick = 0.30 + 0.55 * Math.exp(-r / 16) + r * 0.011;
        y = gauss(rnd) * thick * (field ? 1.7 : 1.0);

        tightness = field ? 0 : clamp(1 - Math.abs(off), 0, 1);
      }

      const r2 = Math.hypot(x, z);

      // Color: núcleo del brazo → azul joven; campo y centro → amarillo/naranja
      let hex;
      if (hot || tightness > 0.86) hex = pick(STAR_COLORS.hot, rnd);
      else if (tightness > 0.45) hex = pick(STAR_COLORS.young, rnd);
      else if (r2 < GALAXY.coreRadius * 1.6) hex = pick(STAR_COLORS.old, rnd);
      else hex = pick(rnd() < 0.6 ? STAR_COLORS.mid : STAR_COLORS.old, rnd);
      c.set(hex);

      // Gradiente de metalicidad: solo el interior se vuelve rojizo
      const warm = Math.pow(clamp(1 - r2 / (GALAXY.radius * 0.45), 0, 1), 1.6) * 0.30;
      c.r = clamp(c.r + warm * 0.5, 0, 1);
      c.b = clamp(c.b - warm * 0.55, 0, 1);

      const i3 = i * 3;
      pos[i3] = x; pos[i3 + 1] = y; pos[i3 + 2] = z;
      col[i3] = c.r; col[i3 + 1] = c.g; col[i3 + 2] = c.b;

      // Distribución de luminosidad: muchas débiles, pocas muy brillantes
      const lum = Math.pow(rnd(), 3.4);
      siz[i] = 0.45 + lum * 2.4 * (tightness > 0 ? 1 : 0.6) + (hot ? 0.8 : 0);
      sed[i] = rnd();
    }

    this.disk = this.#points([
      ['position', pos, 3], ['aColor', col, 3], ['aSize', siz, 1], ['aSeed', sed, 1]
    ], this.#starMaterial());
  }

  /* --------------------------------------------------------------
   *  Bulbo elipsoidal + barra estelar central
   * -------------------------------------------------------------- */
  #buildBulge() {
    const rnd = this.rnd;
    const N = GALAXY.bulgeStars;
    const pos = new Float32Array(N * 3);
    const col = new Float32Array(N * 3);
    const siz = new Float32Array(N);
    const sed = new Float32Array(N);
    const c = new THREE.Color();
    const barAngle = 0.48;                    // la barra está inclinada ~27°
    const cosB = Math.cos(barAngle), sinB = Math.sin(barAngle);

    for (let i = 0; i < N; i++) {
      const inBar = rnd() < 0.42;
      let x, y, z;

      if (inBar) {
        // Elipsoide alargado (barra)
        const t = gauss(rnd);
        const bx = t * GALAXY.barLength * 0.5;
        const bz = gauss(rnd) * 1.9;
        y = gauss(rnd) * 1.1;
        x = bx * cosB - bz * sinB;
        z = bx * sinB + bz * cosB;
      } else {
        // Esferoide achatado con densidad ~ r^-2
        const r = Math.pow(rnd(), 2.1) * GALAXY.coreRadius;
        const u = rnd() * 2 - 1;
        const phi = rnd() * Math.PI * 2;
        const s = Math.sqrt(1 - u * u);
        x = r * s * Math.cos(phi);
        z = r * s * Math.sin(phi);
        y = r * u * 0.52;
      }

      c.set(pick(rnd() < 0.72 ? STAR_COLORS.old : STAR_COLORS.mid, rnd));
      const d = Math.hypot(x, y, z);
      const glow = clamp(1 - d / GALAXY.coreRadius, 0, 1);
      c.r = clamp(c.r * 0.85 + glow * 0.15, 0, 1);
      c.g = clamp(c.g * 0.78 + glow * 0.06, 0, 1);
      c.b = clamp(c.b * 0.7, 0, 1);

      const i3 = i * 3;
      pos[i3] = x; pos[i3 + 1] = y; pos[i3 + 2] = z;
      col[i3] = c.r; col[i3 + 1] = c.g; col[i3 + 2] = c.b;
      siz[i] = 0.38 + Math.pow(rnd(), 3.2) * 1.5;
      sed[i] = rnd();
    }

    this.bulge = this.#points([
      ['position', pos, 3], ['aColor', col, 3], ['aSize', siz, 1], ['aSeed', sed, 1]
    ], this.#starMaterial());
  }

  /* --------------------------------------------------------------
   *  Halo esférico + cúmulos globulares
   * -------------------------------------------------------------- */
  #buildHalo() {
    const rnd = this.rnd;
    const globulars = [];
    for (let i = 0; i < 46; i++) {
      const r = GALAXY.radius * (0.25 + Math.pow(rnd(), 0.6) * 1.05);
      const u = rnd() * 2 - 1, phi = rnd() * Math.PI * 2;
      const s = Math.sqrt(1 - u * u);
      globulars.push({
        x: r * s * Math.cos(phi), y: r * u * 0.85, z: r * s * Math.sin(phi),
        rad: 0.35 + rnd() * 0.8
      });
    }

    const N = GALAXY.haloStars;
    const pos = new Float32Array(N * 3);
    const col = new Float32Array(N * 3);
    const siz = new Float32Array(N);
    const sed = new Float32Array(N);
    const c = new THREE.Color();

    for (let i = 0; i < N; i++) {
      let x, y, z;
      if (rnd() < 0.45) {
        const g = globulars[Math.floor(rnd() * globulars.length)];
        const rr = Math.pow(rnd(), 2.4) * g.rad;
        const u = rnd() * 2 - 1, phi = rnd() * Math.PI * 2;
        const s = Math.sqrt(1 - u * u);
        x = g.x + rr * s * Math.cos(phi);
        y = g.y + rr * u;
        z = g.z + rr * s * Math.sin(phi);
      } else {
        const r = GALAXY.radius * (0.2 + Math.pow(rnd(), 0.5) * 1.2);
        const u = rnd() * 2 - 1, phi = rnd() * Math.PI * 2;
        const s = Math.sqrt(1 - u * u);
        x = r * s * Math.cos(phi);
        y = r * u * 0.8;
        z = r * s * Math.sin(phi);
      }

      c.set(pick(STAR_COLORS.old, rnd)).multiplyScalar(0.5);
      const i3 = i * 3;
      pos[i3] = x; pos[i3 + 1] = y; pos[i3 + 2] = z;
      col[i3] = c.r; col[i3 + 1] = c.g; col[i3 + 2] = c.b;
      siz[i] = 0.3 + Math.pow(rnd(), 5) * 1.4;
      sed[i] = rnd();
    }

    this.halo = this.#points([
      ['position', pos, 3], ['aColor', col, 3], ['aSize', siz, 1], ['aSeed', sed, 1]
    ], this.#starMaterial());
  }

  /* --------------------------------------------------------------
   *  Carriles de polvo: siguen el borde interior de cada brazo
   * -------------------------------------------------------------- */
  #buildDust() {
    const rnd = this.rnd;
    const N = GALAXY.dustClouds;
    const pos = new Float32Array(N * 3);
    const col = new Float32Array(N * 3);
    const siz = new Float32Array(N);
    const opa = new Float32Array(N);
    const rot = new Float32Array(N);
    const c = new THREE.Color();

    for (let i = 0; i < N; i++) {
      const arm = i % GALAXY.armCount;
      const r = lerp(GALAXY.coreRadius * 0.8, GALAXY.radius * 0.94, Math.pow(rnd(), 0.62));
      // desplazamiento hacia el borde interior del brazo (donde se comprime el gas)
      const a = armAngle(r, arm) - 0.075 + gauss(rnd) * 0.075;
      const i3 = i * 3;
      pos[i3] = Math.cos(a) * r;
      pos[i3 + 1] = gauss(rnd) * 0.42;
      pos[i3 + 2] = Math.sin(a) * r;

      c.setHSL(0.07, 0.4, 0.05);
      col[i3] = c.r; col[i3 + 1] = c.g; col[i3 + 2] = c.b;

      siz[i] = (4 + rnd() * 9) * (0.45 + r / GALAXY.radius);
      opa[i] = 0.22 + rnd() * 0.4;
      rot[i] = rnd() * Math.PI * 2;
    }

    this.dust = this.#points([
      ['position', pos, 3], ['aColor', col, 3], ['aSize', siz, 1],
      ['aOpacity', opa, 1], ['aRot', rot, 1]
    ], this.#cloudMaterial(THREE.CustomBlending, 300), 2);
  }

  /* --------------------------------------------------------------
   *  Nebulosas de emisión sobre los brazos
   * -------------------------------------------------------------- */
  #buildNebulae() {
    const rnd = this.rnd;
    const N = GALAXY.nebulae;
    const pos = new Float32Array(N * 3);
    const col = new Float32Array(N * 3);
    const siz = new Float32Array(N);
    const opa = new Float32Array(N);
    const rot = new Float32Array(N);
    const c = new THREE.Color();
    const hues = [0.92, 0.58, 0.75, 0.05, 0.48];

    for (let i = 0; i < N; i++) {
      const arm = Math.floor(rnd() * GALAXY.armCount);
      const r = lerp(GALAXY.coreRadius, GALAXY.radius * 0.92, Math.pow(rnd(), 0.7));
      const a = armAngle(r, arm) + gauss(rnd) * 0.09;
      const i3 = i * 3;
      pos[i3] = Math.cos(a) * r;
      pos[i3 + 1] = gauss(rnd) * 0.4;
      pos[i3 + 2] = Math.sin(a) * r;

      c.setHSL(hues[Math.floor(rnd() * hues.length)] + gauss(rnd) * 0.03, 0.85, 0.55);
      col[i3] = c.r; col[i3 + 1] = c.g; col[i3 + 2] = c.b;

      siz[i] = 2 + rnd() * 6;
      opa[i] = 0.14 + rnd() * 0.3;
      rot[i] = rnd() * Math.PI * 2;
    }

    this.nebulae = this.#points([
      ['position', pos, 3], ['aColor', col, 3], ['aSize', siz, 1],
      ['aOpacity', opa, 1], ['aRot', rot, 1]
    ], this.#cloudMaterial(THREE.AdditiveBlending, 300), 1);
  }

  /* --------------------------------------------------------------
   *  Resplandor del núcleo galáctico
   * -------------------------------------------------------------- */
  #buildCore() {
    const mk = (size, color, opacity, tex) => {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({
        map: tex, color, transparent: true, opacity,
        blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false
      }));
      s.scale.set(size, size, 1);
      s.renderOrder = 3;
      this.group.add(s);
      return s;
    };
    this.coreSize = 13;
    this.coreGlow = mk(this.coreSize, 0xffc477, 0.3, this.cloudTex);
    mk(7, 0xfff0d0, 0.22, this.cloudTex);
    this.coreFlare = mk(5.5, 0xffffff, 0.2, this.flareTex);
  }

  /* --------------------------------------------------------------
   *  Marcadores de puntos de interés
   * -------------------------------------------------------------- */
  #buildMarkers() {
    for (const poi of POIS) {
      const mat = new THREE.SpriteMaterial({
        map: this.flareTex,
        color: new THREE.Color(poi.color),
        transparent: true,
        opacity: poi.explorable ? 0.95 : 0.6,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        depthTest: false
      });
      const sprite = new THREE.Sprite(mat);
      sprite.position.set(poi.position.x, poi.position.y, poi.position.z);
      sprite.scale.setScalar(poi.explorable ? 3.2 : 2.2);
      sprite.renderOrder = 5;
      sprite.userData.poi = poi;
      this.group.add(sprite);
      this.markers.push(sprite);
    }
  }

  /* --------------------------------------------------------------
   *  Animación
   * -------------------------------------------------------------- */
  update(dt, timeScale) {
    this.time += dt;
    for (const m of this.materials) m.uniforms.uTime.value = this.time;

    // Rotación galáctica (un giro completo ≈ 225 Ma, aquí acelerado)
    this.group.rotation.y -= dt * 0.0042 * (0.4 + timeScale * 0.05);

    const pulse = 1 + Math.sin(this.time * 0.9) * 0.05;
    this.coreGlow.scale.set(this.coreSize * pulse, this.coreSize * pulse, 1);
    this.coreFlare.material.rotation += dt * 0.05;

    for (const m of this.markers) {
      const poi = m.userData.poi;
      const base = poi.explorable ? 3.2 : 2.2;
      const s = base * (1 + Math.sin(this.time * 2.2 + poi.position.x) * 0.09);
      m.scale.setScalar(s);
    }
  }

  /** Actualiza uPixelRatio tras un resize */
  setPixelRatio(pr) {
    const apply = obj => {
      if (obj.material?.uniforms?.uPixelRatio) obj.material.uniforms.uPixelRatio.value = pr;
    };
    this.group.traverse(apply);
  }

  dispose() {
    this.group.traverse(o => {
      o.geometry?.dispose();
      o.material?.dispose();
    });
  }
}
