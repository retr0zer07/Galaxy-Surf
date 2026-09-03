import * as THREE from 'three';
import { makeRandom, gauss, lerp, clamp, starSprite, cloudSprite, flareSprite } from './utils.js';

/* ==================================================================
 *  Representación visual de los destinos en la vista galáctica.
 *  Los tamaños están exagerados: a escala real una nebulosa de 24 ly
 *  mediría 0.024 unidades y sería invisible.
 * ================================================================== */

const POINT_VERT = /* glsl */`
  attribute float aSize;
  attribute vec3  aColor;
  attribute float aSeed;
  uniform float uTime;
  uniform float uPixelRatio;
  varying vec3  vColor;
  varying float vTw;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    float tw = 0.72 + 0.28 * sin(uTime * 2.1 + aSeed * 62.83);
    gl_PointSize = clamp(aSize * 620.0 * uPixelRatio * tw / max(-mv.z, 0.02), 0.5, 90.0);
    vColor = aColor;
    vTw = tw;
    gl_Position = projectionMatrix * mv;
  }
`;

const POINT_FRAG = /* glsl */`
  varying vec3  vColor;
  varying float vTw;
  void main() {
    vec2 uv = gl_PointCoord - 0.5;
    float d = dot(uv, uv);
    if (d > 0.25) discard;
    float a = pow(1.0 - d * 4.0, 2.3);
    gl_FragColor = vec4(vColor * a * 1.35, a * vTw);
  }
`;

const LM_CLOUD_VERT = /* glsl */`
  attribute float aSize;
  attribute vec3  aColor;
  attribute float aOpacity;
  attribute float aRot;
  uniform float uPixelRatio;
  varying vec3  vColor;
  varying float vOpacity;
  varying float vRot;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = clamp(aSize * 620.0 * uPixelRatio / max(-mv.z, 0.02), 1.0, 2600.0);
    vColor = aColor; vOpacity = aOpacity; vRot = aRot;
    gl_Position = projectionMatrix * mv;
  }
`;

const LM_CLOUD_FRAG = /* glsl */`
  uniform sampler2D uMap;
  varying vec3  vColor;
  varying float vOpacity;
  varying float vRot;
  void main() {
    vec2 uv = gl_PointCoord - 0.5;
    float s = sin(vRot), c = cos(vRot);
    uv = vec2(uv.x * c - uv.y * s, uv.x * s + uv.y * c) + 0.5;
    gl_FragColor = vec4(vColor, texture2D(uMap, uv).a * vOpacity);
  }
`;

export class Landmarks {
  constructor(pois) {
    this.group = new THREE.Group();
    this.byId = new Map();
    this.time = 0;
    this.pointMaterials = [];

    this.starTex = starSprite();
    this.cloudTex = cloudSprite(256, 41);
    this.flareTex = flareSprite();

    for (const poi of pois) {
      if (poi.explorable) continue;      // estos tienen escena propia
      const g = this.#build(poi);
      g.position.set(poi.position.x, poi.position.y, poi.position.z);
      this.group.add(g);
      this.byId.set(poi.id, g);
    }
  }

  /* ---------------- materiales ---------------- */
  #pointMat() {
    const m = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uPixelRatio: { value: Math.min(devicePixelRatio, 2) }
      },
      vertexShader: POINT_VERT,
      fragmentShader: POINT_FRAG,
      transparent: true, depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    this.pointMaterials.push(m);
    return m;
  }

  #cloudMat(subtractive = false) {
    const m = new THREE.ShaderMaterial({
      uniforms: {
        uMap: { value: this.cloudTex },
        uPixelRatio: { value: Math.min(devicePixelRatio, 2) }
      },
      vertexShader: LM_CLOUD_VERT,
      fragmentShader: LM_CLOUD_FRAG,
      transparent: true, depthWrite: false,
      blending: subtractive ? THREE.CustomBlending : THREE.AdditiveBlending
    });
    if (subtractive) {
      m.blendEquation = THREE.AddEquation;
      m.blendSrc = THREE.ZeroFactor;
      m.blendDst = THREE.OneMinusSrcAlphaFactor;
    }
    return m;
  }

  /* ---------------- primitivas ---------------- */
  #points(list, material) {
    const n = list.length;
    const pos = new Float32Array(n * 3);
    const col = new Float32Array(n * 3);
    const siz = new Float32Array(n);
    const sed = new Float32Array(n);
    const c = new THREE.Color();
    list.forEach((p, i) => {
      const i3 = i * 3;
      pos[i3] = p.x; pos[i3 + 1] = p.y; pos[i3 + 2] = p.z;
      c.set(p.color);
      col[i3] = c.r; col[i3 + 1] = c.g; col[i3 + 2] = c.b;
      siz[i] = p.size;
      sed[i] = p.seed ?? Math.random();
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aColor', new THREE.BufferAttribute(col, 3));
    g.setAttribute('aSize', new THREE.BufferAttribute(siz, 1));
    g.setAttribute('aSeed', new THREE.BufferAttribute(sed, 1));
    const o = new THREE.Points(g, material);
    o.frustumCulled = false;
    return o;
  }

  #clouds(list, subtractive = false) {
    const n = list.length;
    const pos = new Float32Array(n * 3);
    const col = new Float32Array(n * 3);
    const siz = new Float32Array(n);
    const opa = new Float32Array(n);
    const rot = new Float32Array(n);
    const c = new THREE.Color();
    list.forEach((p, i) => {
      const i3 = i * 3;
      pos[i3] = p.x; pos[i3 + 1] = p.y; pos[i3 + 2] = p.z;
      c.set(p.color);
      col[i3] = c.r; col[i3 + 1] = c.g; col[i3 + 2] = c.b;
      siz[i] = p.size; opa[i] = p.opacity; rot[i] = p.rot ?? 0;
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aColor', new THREE.BufferAttribute(col, 3));
    g.setAttribute('aSize', new THREE.BufferAttribute(siz, 1));
    g.setAttribute('aOpacity', new THREE.BufferAttribute(opa, 1));
    g.setAttribute('aRot', new THREE.BufferAttribute(rot, 1));
    const o = new THREE.Points(g, this.#cloudMat(subtractive));
    o.frustumCulled = false;
    o.renderOrder = subtractive ? 3 : 2;
    return o;
  }

  #flare(size, color, opacity = 0.9) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({
      map: this.flareTex, color: new THREE.Color(color),
      transparent: true, opacity,
      blending: THREE.AdditiveBlending, depthWrite: false
    }));
    s.scale.setScalar(size);
    return s;
  }

  /* ---------------- constructor por forma ---------------- */
  #build(poi) {
    const g = new THREE.Group();
    const rnd = makeRandom(poi.id.length * 7919 + poi.ly | 0);
    const R = poi.size;
    const tint = poi.tint;
    const pick = () => tint[Math.floor(rnd() * tint.length)];

    const starsIn = (n, radius, conc, colors, sizeMin, sizeMax, flat = 1) => {
      const out = [];
      for (let i = 0; i < n; i++) {
        const r = Math.pow(rnd(), conc) * radius;
        const u = rnd() * 2 - 1, phi = rnd() * Math.PI * 2;
        const s = Math.sqrt(1 - u * u);
        out.push({
          x: r * s * Math.cos(phi),
          y: r * u * flat,
          z: r * s * Math.sin(phi),
          color: colors[Math.floor(rnd() * colors.length)],
          size: lerp(sizeMin, sizeMax, Math.pow(rnd(), 2.6)),
          seed: rnd()
        });
      }
      return out;
    };

    const cloudsIn = (n, radius, conc, colors, sMin, sMax, oMin, oMax, flat = 1) => {
      const out = [];
      for (let i = 0; i < n; i++) {
        const r = Math.pow(rnd(), conc) * radius;
        const u = rnd() * 2 - 1, phi = rnd() * Math.PI * 2;
        const s = Math.sqrt(1 - u * u);
        out.push({
          x: r * s * Math.cos(phi),
          y: r * u * flat,
          z: r * s * Math.sin(phi),
          color: colors[Math.floor(rnd() * colors.length)],
          size: lerp(sMin, sMax, rnd()),
          opacity: lerp(oMin, oMax, rnd()),
          rot: rnd() * Math.PI * 2
        });
      }
      return out;
    };

    switch (poi.shape) {
      /* --- estrellas y sistemas --- */
      case 'multi': {
        const n = poi.stars.length;
        poi.stars.forEach((hex, i) => {
          const f = this.#flare(R * (i === 0 ? 2.4 : 1.5), hex, 0.95);
          const a = (i / n) * Math.PI * 2;
          f.position.set(Math.cos(a) * R * 0.45 * (i ? 1 : 0), 0, Math.sin(a) * R * 0.45 * (i ? 1 : 0));
          g.add(f);
        });
        break;
      }
      case 'planet': {
        const host = this.#flare(R * 1.55, poi.star || '#ff7050', 0.9);
        host.position.set(-R * 0.72, 0, 0);
        g.add(host);

        const planet = new THREE.Sprite(new THREE.SpriteMaterial({
          map: this.starTex, color: new THREE.Color(tint[0]),
          transparent: true, opacity: 0.98,
          blending: THREE.NormalBlending, depthWrite: false
        }));
        planet.position.set(R * 0.54, 0, 0);
        planet.scale.setScalar(R * 1.5);
        g.add(planet);

        const orbit = new THREE.Mesh(
          new THREE.RingGeometry(R * 0.43, R * 0.45, 64),
          new THREE.MeshBasicMaterial({
            color: new THREE.Color(tint[1] || tint[0]), transparent: true,
            opacity: 0.3, side: THREE.DoubleSide, depthWrite: false
          })
        );
        orbit.rotation.x = Math.PI / 2;
        g.add(orbit);
        break;
      }
      case 'supergiant': {
        g.add(this.#flare(R * 3.4, poi.stars[0], 0.9));
        g.add(this.#flare(R * 1.5, '#ffd0a8', 0.75));
        g.add(this.#points(
          cloudsIn(60, R * 1.6, 0.7, ['#ff8a5a'], R * 0.3, R * 0.8, 0, 0).map(c => ({ ...c, size: R * 0.05 })),
          this.#pointMat()
        ));
        break;
      }

      /* --- nebulosas --- */
      case 'nebula': {
        g.add(this.#clouds(cloudsIn(140, R, 0.55, tint, R * 0.35, R * 0.95, 0.05, 0.16, 0.55)));
        g.add(this.#points(starsIn(280, R * 0.85, 0.7, ['#ffffff', '#cfe0ff', '#a8ccff'], R * 0.012, R * 0.05, 0.6), this.#pointMat()));
        g.add(this.#flare(R * 1.1, tint[0], 0.35));
        break;
      }
      case 'dark': {
        g.add(this.#clouds(cloudsIn(70, R * 1.15, 0.6, [tint[0]], R * 0.5, R * 1.1, 0.04, 0.1, 0.7)));
        g.add(this.#clouds(cloudsIn(60, R * 0.55, 0.5, ['#20140f'], R * 0.35, R * 0.8, 0.25, 0.5, 0.8), true));
        break;
      }
      case 'planetary': {
        const ring = [];
        for (let i = 0; i < 260; i++) {
          const a = rnd() * Math.PI * 2;
          const rr = R * (0.62 + gauss(rnd) * 0.13);
          ring.push({
            x: Math.cos(a) * rr, y: gauss(rnd) * R * 0.16, z: Math.sin(a) * rr,
            color: pick(), size: lerp(R * 0.25, R * 0.5, rnd()),
            opacity: 0.06 + rnd() * 0.12, rot: rnd() * Math.PI * 2
          });
        }
        g.add(this.#clouds(ring));
        g.add(this.#flare(R * 0.7, '#ffffff', 0.8));
        break;
      }

      /* --- cúmulos --- */
      case 'open':
      case 'double': {
        const centers = poi.shape === 'double'
          ? [[-R * 0.5, 0, 0], [R * 0.5, 0, 0]]
          : [[0, 0, 0]];
        centers.forEach((c, ci) => {
          const stars = starsIn(160, R * 0.75, 1.3,
            [tint[ci % tint.length], '#ffffff', '#dce8ff'], R * 0.02, R * 0.11);
          stars.forEach(s => { s.x += c[0]; s.y += c[1]; s.z += c[2]; });
          g.add(this.#points(stars, this.#pointMat()));
        });
        if (poi.veil) {
          g.add(this.#clouds(cloudsIn(50, R * 0.9, 0.6, [poi.veil], R * 0.5, R * 1.0, 0.03, 0.08)));
        }
        break;
      }
      case 'globular': {
        g.add(this.#points(starsIn(2600, R, 2.6, [tint[0], '#fff0d0', '#ffd9a0'], R * 0.012, R * 0.06), this.#pointMat()));
        g.add(this.#flare(R * 1.5, tint[0], 0.4));
        break;
      }

      /* --- remanentes --- */
      case 'snr': {
        const shell = [];
        for (let i = 0; i < 900; i++) {
          const rr = R * (0.72 + gauss(rnd) * 0.2);
          const u = rnd() * 2 - 1, phi = rnd() * Math.PI * 2;
          const s = Math.sqrt(1 - u * u);
          shell.push({
            x: rr * s * Math.cos(phi), y: rr * u, z: rr * s * Math.sin(phi),
            color: pick(), size: lerp(R * 0.02, R * 0.07, Math.pow(rnd(), 2)), seed: rnd()
          });
        }
        g.add(this.#points(shell, this.#pointMat()));
        g.add(this.#clouds(cloudsIn(60, R * 0.85, 0.5, tint, R * 0.4, R * 0.9, 0.03, 0.09)));
        if (poi.pulsar) {
          const p = this.#flare(R * 1.0, '#ffffff', 0.9);
          p.userData.pulsar = true;
          g.add(p);
        }
        break;
      }

      /* --- exóticos --- */
      case 'blackhole': {
        const disc = [];
        for (let i = 0; i < 700; i++) {
          const a = rnd() * Math.PI * 2;
          const rr = R * lerp(0.18, 0.75, Math.pow(rnd(), 0.6));
          const t = (rr / (R * 0.75));
          disc.push({
            x: Math.cos(a) * rr, y: gauss(rnd) * R * 0.03, z: Math.sin(a) * rr,
            color: t < 0.45 ? '#fff0d0' : tint[0],
            size: R * 0.03, seed: rnd()
          });
        }
        const d = this.#points(disc, this.#pointMat());
        d.userData.spin = 1.4;
        g.add(d);
        const comp = this.#flare(R * 1.6, tint[1] || '#dbe6ff', 0.85);
        comp.position.set(R * 1.25, 0, 0);
        g.add(comp);
        break;
      }
      case 'magnetar': {
        const core = this.#flare(R * 1.8, tint[0], 0.9);
        core.userData.pulsar = true;
        g.add(core);
        for (let i = 0; i < 2; i++) {
          const beam = this.#flare(R * 2.6, '#ffd0e0', 0.32);
          beam.position.set(0, (i ? 1 : -1) * R * 0.9, 0);
          g.add(beam);
        }
        break;
      }

      /* --- estructuras --- */
      case 'arm': {
        const pts = [];
        for (let i = 0; i < 1200; i++) {
          const t = rnd() * 2 - 1;
          pts.push({
            x: t * R, y: gauss(rnd) * R * 0.06, z: gauss(rnd) * R * 0.16,
            color: pick(), size: lerp(R * 0.004, R * 0.016, Math.pow(rnd(), 3)), seed: rnd()
          });
        }
        g.add(this.#points(pts, this.#pointMat()));
        break;
      }
      case 'bubble': {
        const shell = [];
        for (let i = 0; i < 700; i++) {
          const rr = R * (0.9 + gauss(rnd) * 0.12);
          const u = rnd() * 2 - 1, phi = rnd() * Math.PI * 2;
          const s = Math.sqrt(1 - u * u);
          shell.push({
            x: rr * s * Math.cos(phi), y: rr * u * 0.8, z: rr * s * Math.sin(phi),
            color: tint[0], size: R * 0.3,
            opacity: 0.012 + rnd() * 0.022, rot: rnd() * Math.PI * 2
          });
        }
        g.add(this.#clouds(shell));
        break;
      }
      case 'cloud': {
        const filaments = [];
        for (let f = 0; f < 9; f++) {
          const ox = gauss(rnd) * R * 0.6, oy = gauss(rnd) * R * 0.25, oz = gauss(rnd) * R * 0.6;
          const dx = gauss(rnd), dy = gauss(rnd) * 0.3, dz = gauss(rnd);
          for (let i = 0; i < 40; i++) {
            const t = (i / 40 - 0.5) * R * 1.3;
            filaments.push({
              x: ox + dx * t, y: oy + dy * t, z: oz + dz * t,
              color: tint[Math.floor(rnd() * tint.length)],
              size: R * lerp(0.18, 0.4, rnd()),
              opacity: 0.10 + rnd() * 0.2, rot: rnd() * Math.PI * 2
            });
          }
        }
        g.add(this.#clouds(filaments, true));
        g.add(this.#points(starsIn(120, R * 0.8, 1.2, ['#ffb98a', '#fff0d0'], R * 0.01, R * 0.04), this.#pointMat()));
        break;
      }
      case 'lobes': {
        for (const dir of [1, -1]) {
          const lobe = [];
          for (let i = 0; i < 420; i++) {
            const t = Math.pow(rnd(), 0.7);
            const rr = R * 0.42 * Math.sin(t * Math.PI * 0.92);
            const a = rnd() * Math.PI * 2;
            lobe.push({
              x: Math.cos(a) * rr * (0.75 + rnd() * 0.35),
              y: dir * t * R,
              z: Math.sin(a) * rr * (0.75 + rnd() * 0.35),
              color: tint[Math.floor(rnd() * tint.length)],
              size: R * lerp(0.06, 0.14, rnd()),
              opacity: 0.014 + rnd() * 0.024, rot: rnd() * Math.PI * 2
            });
          }
          g.add(this.#clouds(lobe));
        }
        break;
      }
      case 'galaxy': {
        const stars = [];
        for (let i = 0; i < 3200; i++) {
          const r = Math.pow(rnd(), 0.6) * R;
          const a = rnd() * Math.PI * 2 + r * 1.1;
          const bar = rnd() < 0.3 ? 1 : 0;
          stars.push({
            x: bar ? gauss(rnd) * R * 0.55 : Math.cos(a) * r * (0.7 + rnd() * 0.6),
            y: gauss(rnd) * R * 0.12,
            z: bar ? gauss(rnd) * R * 0.12 : Math.sin(a) * r * (0.7 + rnd() * 0.6),
            color: rnd() < 0.75 ? tint[0] : tint[1],
            size: lerp(R * 0.004, R * 0.02, Math.pow(rnd(), 3)), seed: rnd()
          });
        }
        g.add(this.#points(stars, this.#pointMat()));
        g.add(this.#clouds(cloudsIn(70, R * 0.9, 0.6, tint, R * 0.25, R * 0.6, 0.02, 0.05, 0.2)));
        break;
      }

      default: {
        g.add(this.#points(starsIn(300, R, 1.5, tint, R * 0.02, R * 0.08), this.#pointMat()));
      }
    }

    g.userData.poi = poi;
    return g;
  }

  update(dt) {
    this.time += dt;
    for (const m of this.pointMaterials) m.uniforms.uTime.value = this.time;

    for (const g of this.byId.values()) {
      for (const child of g.children) {
        if (child.userData.spin) child.rotation.y += dt * child.userData.spin;
        if (child.userData.pulsar) {
          const f = 0.55 + 0.45 * Math.abs(Math.sin(this.time * 6.0));
          child.material.opacity = f;
        }
      }
    }
  }

  dispose() {
    this.group.traverse(o => {
      o.geometry?.dispose();
      o.material?.dispose();
    });
  }
}
