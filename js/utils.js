import * as THREE from 'three';

/* ------------------------------------------------------------------ *
 *  PRNG determinista (mulberry32) — la galaxia se ve igual cada vez
 * ------------------------------------------------------------------ */
export function makeRandom(seed = 20260902) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const lerp = (a, b, t) => a + (b - a) * t;
export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const smoothstep = t => t * t * (3 - 2 * t);
export const easeInOut = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/** Gaussiana aproximada en [-1,1] (suma de uniformes) */
export function gauss(rnd) {
  return (rnd() + rnd() + rnd() + rnd() + rnd() + rnd() - 3) / 3;
}

/* ------------------------------------------------------------------ *
 *  Ruido de valor + fBm (para texturas planetarias procedurales)
 * ------------------------------------------------------------------ */
function hash2(x, y, seed) {
  let h = x * 374761393 + y * 668265263 + seed * 1442695040;
  h = (h ^ (h >> 13)) * 1274126177;
  return ((h ^ (h >> 16)) >>> 0) / 4294967296;
}

function valueNoise(x, y, seed) {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;
  const u = smoothstep(xf), v = smoothstep(yf);
  const a = hash2(xi, yi, seed), b = hash2(xi + 1, yi, seed);
  const c = hash2(xi, yi + 1, seed), d = hash2(xi + 1, yi + 1, seed);
  return lerp(lerp(a, b, u), lerp(c, d, u), v);
}

export function fbm(x, y, seed, octaves = 5, lacunarity = 2.0, gain = 0.5) {
  let sum = 0, amp = 0.5, freq = 1, norm = 0;
  for (let i = 0; i < octaves; i++) {
    sum += amp * valueNoise(x * freq, y * freq, seed + i * 31);
    norm += amp;
    amp *= gain; freq *= lacunarity;
  }
  return sum / norm;
}

/* ------------------------------------------------------------------ *
 *  Texturas generadas en canvas (cero assets externos)
 * ------------------------------------------------------------------ */
function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return [c, c.getContext('2d')];
}

/** Punto estelar suave */
export function starSprite(size = 64) {
  const [c, ctx] = makeCanvas(size, size);
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0.00, 'rgba(255,255,255,1)');
  g.addColorStop(0.18, 'rgba(255,255,255,0.85)');
  g.addColorStop(0.42, 'rgba(255,255,255,0.28)');
  g.addColorStop(1.00, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Nube difusa e irregular para nebulosas y bandas de polvo */
export function cloudSprite(size = 256, seed = 7) {
  const [c, ctx] = makeCanvas(size, size);
  const img = ctx.createImageData(size, size);
  const half = size / 2;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (x - half) / half, dy = (y - half) / half;
      const d = Math.sqrt(dx * dx + dy * dy);
      const falloff = clamp(1 - d, 0, 1);
      const n = fbm(x / size * 5, y / size * 5, seed, 5);
      const a = Math.pow(falloff, 2.1) * (0.35 + n * 0.9);
      const i = (y * size + x) * 4;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = 255;
      img.data[i + 3] = clamp(a, 0, 1) * 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Destello con puntas de difracción para el Sol y estrellas destacadas */
export function flareSprite(size = 256) {
  const [c, ctx] = makeCanvas(size, size);
  const h = size / 2;
  const g = ctx.createRadialGradient(h, h, 0, h, h, h);
  g.addColorStop(0.0, 'rgba(255,255,255,1)');
  g.addColorStop(0.12, 'rgba(255,244,214,0.9)');
  g.addColorStop(0.30, 'rgba(255,190,110,0.35)');
  g.addColorStop(1.0, 'rgba(255,150,60,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, size, size);

  ctx.globalCompositeOperation = 'lighter';
  for (const rot of [0, Math.PI / 2, Math.PI / 4, -Math.PI / 4]) {
    ctx.save();
    ctx.translate(h, h); ctx.rotate(rot);
    const len = rot % (Math.PI / 2) === 0 ? h : h * 0.55;
    const lg = ctx.createLinearGradient(-len, 0, len, 0);
    lg.addColorStop(0.0, 'rgba(255,220,160,0)');
    lg.addColorStop(0.5, 'rgba(255,245,220,0.75)');
    lg.addColorStop(1.0, 'rgba(255,220,160,0)');
    ctx.fillStyle = lg;
    ctx.fillRect(-len, -1.4, len * 2, 2.8);
    ctx.restore();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/**
 * Textura equirectangular de planeta generada proceduralmente.
 * style: 'rocky' | 'gas' | 'ice' | 'earth' | 'lava' | 'sun'
 */
export function planetTexture(opts) {
  const {
    style = 'rocky', seed = 1, width = 1024, height = 512,
    palette = ['#6b5a4a', '#8d7a63', '#b5a189'],
    bands = 12, craters = 0, storm = null, polar = 0
  } = opts;

  const [c, ctx] = makeCanvas(width, height);
  const img = ctx.createImageData(width, height);
  const cols = palette.map(hex => new THREE.Color(hex));
  const tmp = new THREE.Color();

  for (let y = 0; y < height; y++) {
    const v = y / height;                 // 0 polo norte → 1 polo sur
    const lat = (v - 0.5) * 2;            // -1..1
    for (let x = 0; x < width; x++) {
      const u = x / width;
      let t;

      if (style === 'gas' || style === 'ice') {
        // Bandas latitudinales con turbulencia (flujo zonal)
        const turb = fbm(u * 8, v * 22, seed, 5) - 0.5;
        const band = Math.sin((v * bands + turb * 1.6) * Math.PI * 2) * 0.5 + 0.5;
        const detail = fbm(u * 26, v * 60, seed + 9, 4);
        t = clamp(band * 0.72 + detail * 0.28, 0, 1);
      } else if (style === 'sun') {
        const gran = fbm(u * 90, v * 45, seed, 5);
        const cell = fbm(u * 28, v * 14, seed + 4, 3);
        t = clamp(gran * 0.55 + cell * 0.45, 0, 1);
      } else {
        // Continentes / relieve: fBm esférico aproximado
        const wrap = Math.cos(u * Math.PI * 2), wrap2 = Math.sin(u * Math.PI * 2);
        const n1 = fbm((wrap + 1.5) * 3.2, (wrap2 + 1.5) * 3.2 + v * 4.4, seed, 6);
        const n2 = fbm(u * 14, v * 14, seed + 17, 5);
        t = clamp(n1 * 0.68 + n2 * 0.32, 0, 1);
      }

      // Casquetes polares
      if (polar > 0) {
        const p = clamp((Math.abs(lat) - (1 - polar)) / polar, 0, 1);
        t = lerp(t, 1, smoothstep(p) * 0.9);
      }

      // Selección de color dentro de la paleta
      const seg = t * (cols.length - 1);
      const i0 = clamp(Math.floor(seg), 0, cols.length - 2);
      tmp.copy(cols[i0]).lerp(cols[i0 + 1], seg - i0);

      // Sombreado por latitud (terminador suave, ayuda al volumen)
      const shade = 1 - Math.pow(Math.abs(lat), 3) * 0.22;
      const idx = (y * width + x) * 4;
      img.data[idx] = tmp.r * 255 * shade;
      img.data[idx + 1] = tmp.g * 255 * shade;
      img.data[idx + 2] = tmp.b * 255 * shade;
      img.data[idx + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);

  // Cráteres (mundos rocosos y lunas)
  if (craters > 0) {
    const rnd = makeRandom(seed * 977 + 13);
    for (let i = 0; i < craters; i++) {
      const cx = rnd() * width;
      const cy = height * 0.12 + rnd() * height * 0.76;
      const r = (2 + rnd() * 16) * (width / 1024);
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      g.addColorStop(0.0, 'rgba(0,0,0,0.30)');
      g.addColorStop(0.62, 'rgba(0,0,0,0.12)');
      g.addColorStop(0.80, 'rgba(255,255,255,0.16)');
      g.addColorStop(1.0, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
    }
  }

  // Gran mancha (Júpiter / Neptuno)
  if (storm) {
    ctx.save();
    ctx.translate(storm.x * width, storm.y * height);
    ctx.scale(storm.rx * width, storm.ry * height);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
    g.addColorStop(0.0, storm.color);
    g.addColorStop(0.55, storm.color.replace(/[\d.]+\)$/, '0.55)'));
    g.addColorStop(1.0, storm.color.replace(/[\d.]+\)$/, '0)'));
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(0, 0, 1, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.anisotropy = 8;
  return tex;
}

/** Textura de anillos: franjas radiales con huecos tipo Cassini */
export function ringTexture(seed = 3, width = 1024) {
  const [c, ctx] = makeCanvas(width, 8);
  const img = ctx.createImageData(width, 8);
  for (let x = 0; x < width; x++) {
    const u = x / width;
    const n = fbm(u * 120, 0.5, seed, 4);
    const fine = Math.sin(u * 260) * 0.5 + 0.5;
    let a = clamp(n * 0.75 + fine * 0.25, 0, 1);
    // División de Cassini y borde exterior
    if (u > 0.62 && u < 0.69) a *= 0.12;
    if (u > 0.94) a *= clamp((1 - u) / 0.06, 0, 1);
    if (u < 0.06) a *= clamp(u / 0.06, 0, 1);
    const lum = 150 + a * 105;
    for (let y = 0; y < 8; y++) {
      const i = (y * width + x) * 4;
      img.data[i] = lum; img.data[i + 1] = lum * 0.94; img.data[i + 2] = lum * 0.8;
      img.data[i + 3] = a * 235;
    }
  }
  ctx.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
