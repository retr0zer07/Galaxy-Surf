import * as THREE from 'three';
import { makeRandom, gauss, cloudSprite, flareSprite, starSprite } from './utils.js';

export class OrionNebula {
  constructor() {
    this.group = new THREE.Group();
    this.features = [];
    this.time = 0;
    this.clouds = [];
    this.rnd = makeRandom(1304);
    this.cloudTex = cloudSprite(256, 81);
    this.flareTex = flareSprite();

    this.#buildBackground();
    this.#buildEmissionCloud();
    this.#buildPillars();
    this.#buildTrapezium();
    this.#buildFeatures();
  }

  #sprite(size, color, opacity, texture = this.cloudTex) {
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
      map: texture,
      color: new THREE.Color(color),
      transparent: true,
      opacity,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    }));
    sprite.scale.set(size, size, 1);
    return sprite;
  }

  #buildBackground() {
    const positions = [];
    for (let i = 0; i < 5000; i++) {
      const r = 450 + this.rnd() * 160;
      const u = this.rnd() * 2 - 1;
      const a = this.rnd() * Math.PI * 2;
      const s = Math.sqrt(1 - u * u);
      positions.push(r * s * Math.cos(a), r * u, r * s * Math.sin(a));
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    const stars = new THREE.Points(geometry, new THREE.PointsMaterial({
      map: starSprite(32), size: 1.25, sizeAttenuation: false,
      color: 0xaec9ff, transparent: true, opacity: 0.8,
      depthWrite: false, blending: THREE.AdditiveBlending
    }));
    this.group.add(stars);
  }

  #buildEmissionCloud() {
    const colors = ['#e64c7f', '#ff78ae', '#b56bff', '#507dff', '#ffb2c9'];
    for (let i = 0; i < 200; i++) {
      const r = Math.pow(this.rnd(), 0.58) * 30;
      const a = this.rnd() * Math.PI * 2;
      const cloud = this.#sprite(7 + this.rnd() * 16, colors[i % colors.length], 0.035 + this.rnd() * 0.10);
      cloud.position.set(Math.cos(a) * r, gauss(this.rnd) * 4.5, Math.sin(a) * r * 0.48);
      cloud.userData.drift = 0.03 + this.rnd() * 0.12;
      cloud.userData.phase = this.rnd() * Math.PI * 2;
      this.group.add(cloud);
      this.clouds.push(cloud);
    }

    const core = this.#sprite(37, '#ff70a2', 0.12);
    core.scale.y = 0.58;
    this.group.add(core);
  }

  #buildPillars() {
    const positions = [[-11, -7, 2, 17], [-3, -8, 1, 23], [6, -8, 3, 16]];
    for (const [x, y, z, height] of positions) {
      const pillar = new THREE.Group();
      pillar.position.set(x, y, z);
      pillar.rotation.z = (this.rnd() - 0.5) * 0.22;
      for (let i = 0; i < 26; i++) {
        const t = i / 25;
        const cloud = this.#sprite(4.5 + (1 - t) * 5, '#170d1c', 0.3 + this.rnd() * 0.25);
        cloud.position.set(gauss(this.rnd) * 1.2, t * height, gauss(this.rnd) * 1.3);
        pillar.add(cloud);
      }
      this.group.add(pillar);
    }
  }

  #buildTrapezium() {
    const stars = [
      { x: -1.9, y: 1.6, z: 0.8, color: '#b9d5ff', size: 5.4 },
      { x: 2.1, y: 0.7, z: -0.6, color: '#d9e8ff', size: 4.3 },
      { x: 0.5, y: -1.8, z: 1.4, color: '#8cb8ff', size: 3.7 },
      { x: -0.7, y: -0.4, z: -1.8, color: '#e8f1ff', size: 3.2 }
    ];
    for (const star of stars) {
      const sprite = this.#sprite(star.size * 0.62, star.color, 0.8, this.flareTex);
      sprite.position.set(star.x, star.y, star.z);
      sprite.userData.twinkle = this.rnd() * Math.PI * 2;
      this.group.add(sprite);
      this.clouds.push(sprite);
    }
    this.group.add(new THREE.PointLight(0x9fc4ff, 2.1, 80));
    this.group.add(new THREE.AmbientLight(0x5d426e, 0.35));
  }

  #buildFeatures() {
    const add = (id, position, info, color) => {
      const anchor = new THREE.Object3D();
      anchor.position.fromArray(position);
      anchor.userData.info = info;
      this.group.add(anchor);
      const flare = this.#sprite(2.4, color, 0.75, this.flareTex);
      anchor.add(flare);
      this.features.push(anchor);
    };

    add('trapezium', [0, 0, 0], {
      tag: 'CÚMULO ESTELAR', name: 'El Trapecio',
      sub: 'Corazón de la Nebulosa de Orión',
      desc: 'Cuatro estrellas jóvenes y masivas que bañan la nebulosa en radiación ultravioleta. Theta¹ Orionis C domina el grupo y ha excavado una cavidad en la nube de gas.',
      facts: [['Estrellas principales', '4'], ['Tipo dominante', 'O7 V'], ['Edad', '< 1 Ma'], ['Temperatura', '~ 39 000 K']]
    }, '#dceaff');

    add('pillars', [-3, 5, 1], {
      tag: 'COLUMNA MOLECULAR', name: 'Pilares de Orión',
      sub: 'Gas frío y polvo en colapso',
      desc: 'Columnas densas protegidas de la radiación por sus propias capas exteriores. En sus puntas se forman protoestrellas; sus chorros perforan el gas circundante.',
      facts: [['Longitud', '2-4 ly'], ['Temperatura', '10-30 K'], ['Densidad', '> 10⁵ part./cm³'], ['Destino', 'erosión por radiación']]
    }, '#ff9abd');

    add('proplyds', [10, 3, -1], {
      tag: 'DISCOS PROTOPLANETARIOS', name: 'Proplyds',
      sub: 'Sistemas solares en formación',
      desc: 'Más de 180 discos de gas y polvo observados alrededor de estrellas jóvenes. Son sistemas planetarios naciendo bajo la radiación intensa del Trapecio.',
      facts: [['Discos conocidos', '> 180'], ['Diámetro típico', '100-1 000 UA'], ['Edad', '< 1 Ma'], ['Instrumento', 'Hubble / JWST']]
    }, '#9fbaff');
  }

  get pickables() { return this.features; }

  update(dt, timeScale) {
    this.time += dt;
    for (const cloud of this.clouds) {
      if (cloud.userData.drift) cloud.material.rotation += dt * cloud.userData.drift;
      if (cloud.userData.twinkle !== undefined) {
        cloud.material.opacity = 0.72 + Math.sin(this.time * 2.2 + cloud.userData.twinkle) * 0.23;
      }
    }
    this.group.rotation.y += dt * 0.004 * (0.2 + timeScale * 0.02);
  }

  dispose() {
    this.group.traverse(object => {
      object.geometry?.dispose();
      object.material?.dispose();
    });
  }
}
