import * as THREE from 'three';
import { SUN, PLANETS, ASTEROID_BELT, KUIPER_BELT } from './data.js';
import { makeRandom, gauss, fbm, planetTexture, ringTexture, flareSprite, cloudSprite, starSprite } from './utils.js';

const DEG = Math.PI / 180;

/** Resuelve la ecuación de Kepler M = E - e·sen E */
function eccentricAnomaly(M, e) {
  let E = M;
  for (let i = 0; i < 5; i++) {
    E -= (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
  }
  return E;
}

export class SolarSystem {
  constructor() {
    this.group = new THREE.Group();
    this.orbitGroup = new THREE.Group();
    this.group.add(this.orbitGroup);

    this.rnd = makeRandom(4321);
    this.bodies = [];      // objetos seleccionables / etiquetables
    this.planets = [];
    this.days = 0;
    this.visualSpinDays = 0;

    this.flareTex = flareSprite();
    this.cloudTex = cloudSprite(256, 23);

    this.#buildStarfield();
    this.#buildSun();
    this.#buildPlanets();
    this.#buildBelt(ASTEROID_BELT, 0.055, '#8b7f70', 'belt');
    this.#buildBelt(KUIPER_BELT, 0.09, '#6f7f96', 'kuiper');
  }

  #cloudLayerTexture(seed) {
    const width = 1024, height = 512;
    const canvas = document.createElement('canvas');
    canvas.width = width; canvas.height = height;
    const ctx = canvas.getContext('2d');
    const img = ctx.createImageData(width, height);

    for (let y = 0; y < height; y++) {
      const lat = Math.abs(y / height * 2 - 1);
      for (let x = 0; x < width; x++) {
        const n = fbm(x / width * 6.5, y / height * 6.5, seed, 6);
        const wisps = fbm(x / width * 23, y / height * 12, seed + 41, 3);
        const density = n * 0.7 + wisps * 0.3 - 0.64 - lat * 0.12;
        const alpha = Math.max(0, Math.min(1, density * 3.5));
        const i = (y * width + x) * 4;
        img.data[i] = 236; img.data[i + 1] = 246; img.data[i + 2] = 255;
        img.data[i + 3] = alpha * 180;
      }
    }
    ctx.putImageData(img, 0, 0);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = THREE.RepeatWrapping;
    return texture;
  }

  #moonGeometry(radius, seed) {
    const geometry = new THREE.SphereGeometry(radius, 48, 32);
    const position = geometry.attributes.position;
    const vertex = new THREE.Vector3();

    for (let i = 0; i < position.count; i++) {
      vertex.fromBufferAttribute(position, i).normalize();
      const longitude = Math.atan2(vertex.z, vertex.x) / (Math.PI * 2) + 0.5;
      const latitude = Math.asin(vertex.y) / Math.PI + 0.5;
      const relief = fbm(longitude * 9, latitude * 9, seed, 4) - 0.5;
      vertex.multiplyScalar(radius * (1 + relief * 0.045));
      position.setXYZ(i, vertex.x, vertex.y, vertex.z);
    }
    position.needsUpdate = true;
    geometry.computeVertexNormals();
    return geometry;
  }

  /* ---------------- Fondo de estrellas lejanas ---------------- */
  #buildStarfield() {
    const rnd = this.rnd;
    const N = 9000;
    const pos = new Float32Array(N * 3);
    const col = new Float32Array(N * 3);
    const c = new THREE.Color();
    for (let i = 0; i < N; i++) {
      const r = 1400 + rnd() * 300;
      const u = rnd() * 2 - 1, phi = rnd() * Math.PI * 2;
      const s = Math.sqrt(1 - u * u);
      const i3 = i * 3;
      pos[i3] = r * s * Math.cos(phi);
      pos[i3 + 1] = r * u;
      pos[i3 + 2] = r * s * Math.sin(phi);
      c.setHSL(0.55 + rnd() * 0.12, 0.35, 0.55 + rnd() * 0.4);
      col[i3] = c.r; col[i3 + 1] = c.g; col[i3 + 2] = c.b;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const m = new THREE.PointsMaterial({
      size: 1.6, sizeAttenuation: false, vertexColors: true,
      map: starSprite(32), transparent: true, depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    const p = new THREE.Points(g, m);
    p.frustumCulled = false;
    this.group.add(p);

    // Banda difusa de la Vía Láctea vista desde dentro
    const band = new THREE.Mesh(
      new THREE.SphereGeometry(1300, 48, 32),
      new THREE.MeshBasicMaterial({
        map: this.#milkyWayBand(), side: THREE.BackSide,
        transparent: true, opacity: 0.2, depthWrite: false,
        blending: THREE.AdditiveBlending
      })
    );
    band.rotation.z = 62 * DEG;
    this.group.add(band);
  }

  #milkyWayBand() {
    const c = document.createElement('canvas');
    c.width = 1024; c.height = 512;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, 1024, 512);
    const g = ctx.createLinearGradient(0, 130, 0, 382);
    g.addColorStop(0.0, 'rgba(60,80,140,0)');
    g.addColorStop(0.3, 'rgba(110,120,170,0.22)');
    g.addColorStop(0.5, 'rgba(200,192,182,0.5)');
    g.addColorStop(0.7, 'rgba(110,120,170,0.22)');
    g.addColorStop(1.0, 'rgba(60,80,140,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 130, 1024, 252);
    // núcleo galáctico
    const cg = ctx.createRadialGradient(300, 256, 0, 300, 256, 190);
    cg.addColorStop(0, 'rgba(255,225,180,0.55)');
    cg.addColorStop(1, 'rgba(255,200,140,0)');
    ctx.fillStyle = cg; ctx.fillRect(110, 66, 380, 380);
    // carriles de polvo
    ctx.globalCompositeOperation = 'destination-out';
    const rnd = makeRandom(99);
    for (let i = 0; i < 220; i++) {
      const x = rnd() * 1024, y = 236 + gauss(rnd) * 26;
      const w = 20 + rnd() * 120, h = 3 + rnd() * 14;
      ctx.fillStyle = `rgba(0,0,0,${0.15 + rnd() * 0.4})`;
      ctx.beginPath(); ctx.ellipse(x, y, w, h, 0, 0, Math.PI * 2); ctx.fill();
    }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }

  /* ---------------- Sol ---------------- */
  #buildSun() {
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(SUN.visualR, 64, 48),
      new THREE.MeshBasicMaterial({
        map: planetTexture({
          style: 'sun', seed: 5, width: 1024, height: 512,
          palette: ['#d4560f', '#ff9a30', '#ffc45c', '#fff0b8', '#fffdf0']
        })
      })
    );
    mesh.userData.body = { data: SUN, kind: 'sun' };
    this.group.add(mesh);
    this.sunMesh = mesh;

    const glow = (size, color, opacity, tex) => {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({
        map: tex, color, transparent: true, opacity,
        blending: THREE.AdditiveBlending, depthWrite: false
      }));
      s.scale.set(size, size, 1);
      this.group.add(s);
      return s;
    };
    this.corona = glow(SUN.visualR * 5.4, 0xff9a3c, 0.5, this.cloudTex);
    glow(SUN.visualR * 3.1, 0xffc46a, 0.6, this.cloudTex);
    this.sunFlare = glow(SUN.visualR * 5, 0xffd9a0, 0.22, this.flareTex);

    const light = new THREE.PointLight(0xfff2dd, 2.6, 0, 0);
    this.group.add(light);
    this.group.add(new THREE.AmbientLight(0x2a3550, 0.35));

    this.bodies.push({ obj: mesh, data: SUN, kind: 'sun' });
  }

  /* ---------------- Planetas ---------------- */
  #buildPlanets() {
    const rnd = this.rnd;

    for (const p of PLANETS) {
      // Plano orbital: inclinación + nodo ascendente
      const plane = new THREE.Group();
      plane.rotation.y = rnd() * Math.PI * 2;
      plane.rotation.x = p.inc * DEG;
      this.group.add(plane);

      // --- trazado de la órbita ---
      const pts = [];
      const b = p.visualD * Math.sqrt(1 - p.ecc * p.ecc);
      for (let i = 0; i <= 256; i++) {
        const E = (i / 256) * Math.PI * 2;
        pts.push(new THREE.Vector3(
          p.visualD * (Math.cos(E) - p.ecc), 0, b * Math.sin(E)
        ));
      }
      const orbit = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(pts),
        new THREE.LineBasicMaterial({
          color: new THREE.Color(p.color), transparent: true, opacity: 0.22
        })
      );
      const orbitHolder = new THREE.Group();
      orbitHolder.rotation.copy(plane.rotation);
      orbitHolder.add(orbit);
      this.orbitGroup.add(orbitHolder);

      // --- cuerpo ---
      const holder = new THREE.Group();     // posición orbital
      plane.add(holder);

      const spin = new THREE.Group();       // eje + rotación propia
      spin.rotation.z = p.tilt * DEG;
      holder.add(spin);

      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(p.visualR, 64, 48),
        new THREE.MeshStandardMaterial({
          map: planetTexture({
            style: p.style, seed: p.radiusKm, palette: p.palette,
            bands: p.bands || 10, craters: p.craters || 0,
            storm: p.storm || null, polar: p.polar || 0
          }),
          roughness: p.style === 'gas' || p.style === 'ice' ? 0.95 : 1.0,
          metalness: 0.0
        })
      );
      mesh.userData.body = { data: p, kind: 'planet' };
      spin.add(mesh);

      let cloudLayer = null;
      if (p.clouds) {
        cloudLayer = new THREE.Mesh(
          new THREE.SphereGeometry(p.visualR * 1.012, 64, 48),
          new THREE.MeshBasicMaterial({
            map: this.#cloudLayerTexture(p.radiusKm), transparent: true,
            opacity: 0.76, depthWrite: false
          })
        );
        spin.add(cloudLayer);
      }

      // Atmósfera (halo de dispersión)
      if (p.atmosphere) {
        const atm = new THREE.Mesh(
          new THREE.SphereGeometry(p.visualR * 1.045, 48, 32),
          new THREE.MeshBasicMaterial({
            color: new THREE.Color(p.atmosphere), transparent: true,
            opacity: 0.18, side: THREE.BackSide, blending: THREE.AdditiveBlending,
            depthWrite: false
          })
        );
        spin.add(atm);
      }

      // Anillos
      if (p.rings) {
        const ring = new THREE.Mesh(
          new THREE.RingGeometry(p.visualR * p.rings.inner, p.visualR * p.rings.outer, 160, 1),
          new THREE.MeshBasicMaterial({
            map: ringTexture(p.radiusKm), side: THREE.DoubleSide,
            transparent: true, opacity: p.rings.faint ? 0.28 : 0.85,
            depthWrite: false
          })
        );
        // Reorienta las UV para que la textura sea radial
        const g = ring.geometry;
        const pos = g.attributes.position;
        const uv = g.attributes.uv;
        const v = new THREE.Vector3();
        const rIn = p.visualR * p.rings.inner, rOut = p.visualR * p.rings.outer;
        for (let i = 0; i < pos.count; i++) {
          v.fromBufferAttribute(pos, i);
          uv.setXY(i, (v.length() - rIn) / (rOut - rIn), 0.5);
        }
        ring.rotation.x = Math.PI / 2;
        spin.add(ring);
      }

      // Lunas
      const moons = [];
      for (const m of p.moons) {
        const mPlane = new THREE.Group();
        mPlane.rotation.y = rnd() * Math.PI * 2;
        mPlane.rotation.x = (rnd() * 14 - 7) * DEG;
        holder.add(mPlane);

        const mMesh = new THREE.Mesh(
          this.#moonGeometry(m.visualR, m.radiusKm * 7),
          new THREE.MeshStandardMaterial({
            map: planetTexture({
              style: 'rocky', seed: m.radiusKm * 7, width: m.name === 'Luna' ? 1024 : 384, height: m.name === 'Luna' ? 512 : 192,
              palette: [
                new THREE.Color(m.color).multiplyScalar(0.45).getStyle(),
                m.color,
                new THREE.Color(m.color).lerp(new THREE.Color('#ffffff'), 0.3).getStyle()
              ],
              craters: m.craters || 0
            }),
            roughness: 0.98,
            bumpScale: m.name === 'Luna' ? 0.1 : 0.04
          })
        );
        mMesh.userData.body = { data: m, kind: 'moon', parent: p };
        mPlane.add(mMesh);

        const mOrbit = new THREE.Line(
          new THREE.BufferGeometry().setFromPoints(
            Array.from({ length: 97 }, (_, i) => {
              const a = (i / 96) * Math.PI * 2;
              return new THREE.Vector3(Math.cos(a) * m.visualD, 0, Math.sin(a) * m.visualD);
            })
          ),
          new THREE.LineBasicMaterial({ color: 0x8899aa, transparent: true, opacity: 0.16 })
        );
        mPlane.add(mOrbit);
        this.moonOrbits = this.moonOrbits || [];
        this.moonOrbits.push(mOrbit);

        moons.push({ data: m, mesh: mMesh, phase: rnd() * Math.PI * 2 });
        this.bodies.push({ obj: mMesh, data: m, kind: 'moon', parent: p });
      }

      const entry = {
        data: p, plane, holder, spin, mesh, moons, cloudLayer,
        phase: rnd() * Math.PI * 2, b
      };
      this.planets.push(entry);
      this.bodies.push({ obj: mesh, data: p, kind: 'planet', entry });
    }
  }

  /* ---------------- Cinturones ---------------- */
  #buildBelt(belt, thickness, hex, name) {
    const rnd = this.rnd;
    const N = belt.count;
    const pos = new Float32Array(N * 3);
    const col = new Float32Array(N * 3);
    const c = new THREE.Color();
    const base = new THREE.Color(hex);

    for (let i = 0; i < N; i++) {
      const t = Math.pow(rnd(), 0.7);
      const r = belt.inner + (belt.outer - belt.inner) * t;
      const a = rnd() * Math.PI * 2;
      const i3 = i * 3;
      pos[i3] = Math.cos(a) * r;
      pos[i3 + 1] = gauss(rnd) * thickness * r * 0.35;
      pos[i3 + 2] = Math.sin(a) * r;
      c.copy(base).multiplyScalar(0.55 + rnd() * 0.8);
      col[i3] = c.r; col[i3 + 1] = c.g; col[i3 + 2] = c.b;
    }

    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const p = new THREE.Points(g, new THREE.PointsMaterial({
      size: name === 'belt' ? 0.36 : 0.5,
      vertexColors: true, transparent: true, opacity: 0.85,
      map: starSprite(32), depthWrite: false, blending: THREE.AdditiveBlending
    }));
    p.frustumCulled = false;
    p.name = name;
    this.group.add(p);
    this[name] = p;
  }

  /* ---------------- Animación ---------------- */
  update(dt, daysPerSecond) {
    this.days += dt * daysPerSecond;
    this.visualSpinDays += dt * Math.min(daysPerSecond, 0.35);

    this.sunMesh.rotation.y += dt * 0.02;
    const pulse = 1 + Math.sin(this.days * 0.05) * 0.03;
    this.corona.scale.set(SUN.visualR * 5.4 * pulse, SUN.visualR * 5.4 * pulse, 1);
    this.sunFlare.material.rotation += dt * 0.03;

    for (const pl of this.planets) {
      const p = pl.data;
      const M = pl.phase + (this.days / p.periodDays) * Math.PI * 2;
      const E = eccentricAnomaly(M % (Math.PI * 2), p.ecc);
      pl.holder.position.set(
        p.visualD * (Math.cos(E) - p.ecc), 0, pl.b * Math.sin(E)
      );
      pl.spin.rotation.y = (this.visualSpinDays / p.rotationDays) * Math.PI * 2;
      if (pl.cloudLayer) pl.cloudLayer.rotation.y = this.visualSpinDays * Math.PI * 2 * 0.82;

      for (const mo of pl.moons) {
        const a = mo.phase + (this.days / mo.data.periodDays) * Math.PI * 2;
        mo.mesh.position.set(
          Math.cos(a) * mo.data.visualD, 0, Math.sin(a) * mo.data.visualD
        );
        mo.mesh.rotation.y = -a + Math.PI / 2;
      }
    }

    if (this.belt) this.belt.rotation.y += dt * daysPerSecond * 0.00016;
    if (this.kuiper) this.kuiper.rotation.y += dt * daysPerSecond * 0.00002;
  }

  setOrbitsVisible(v) {
    this.orbitGroup.visible = v;
    for (const o of this.moonOrbits || []) o.visible = v;
  }

  setFocus(selected, isolation) {
    const dim = 1 - isolation * 0.88;
    const keepRoot = selected?.parent === this.group ? null : selected?.parent || null;

    this.group.traverse(object => {
      const material = object.material;
      if (!material) return;
      const materials = Array.isArray(material) ? material : [material];
      const keep = object === selected || (keepRoot && object.parent === keepRoot);

      for (const entry of materials) {
        if (entry.userData.baseOpacity === undefined) {
          entry.userData.baseOpacity = entry.opacity;
          entry.userData.baseTransparent = entry.transparent;
        }
        entry.transparent = entry.userData.baseTransparent || isolation > 0;
        entry.opacity = entry.userData.baseOpacity * (keep ? 1 : dim);
      }
    });
  }

  /** Meshes candidatos para el raycaster */
  get pickables() {
    return this.bodies.map(b => b.obj);
  }

  dispose() {
    this.group.traverse(o => {
      o.geometry?.dispose();
      if (o.material) {
        o.material.map?.dispose();
        o.material.dispose();
      }
    });
  }
}
