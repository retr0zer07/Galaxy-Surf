import * as THREE from 'three';
import { makeRandom, gauss, starSprite, cloudSprite, flareSprite } from './utils.js';

const MEMBERS = [
  {
    id: 'milkyway', name: 'Vía Láctea', type: 'GALAXIA ESPIRAL BARRADA · SBbc',
    position: [-72, 20, 0], radius: 28, color: '#d9e7ff', explorable: true,
    desc: 'Nuestra galaxia: un disco espiral barrado de gas, polvo y entre 100 y 400 mil millones de estrellas. El Sistema Solar ocupa una posición periférica en el espolón de Orión.',
    facts: [['Diámetro', '~ 100 000 ly'], ['Estrellas', '100-400 mil millones'], ['Masa', '~ 1.5×10¹² M☉'], ['Tipo', 'SBbc'], ['Centro', 'Sagitario A*'], ['Explorable', 'Sí']]
  },
  {
    id: 'andromeda', name: 'Andrómeda · M31', type: 'GALAXIA ESPIRAL · SA(s)b',
    position: [76, 18, -10], radius: 38, color: '#b9d2ff',
    desc: 'La galaxia grande más cercana. Se aproxima a la Vía Láctea a 110 km/s y ambas se fusionarán dentro de aproximadamente 4 500 millones de años, creando una galaxia elíptica.',
    facts: [['Distancia', '2.54 Mly'], ['Diámetro', '~ 220 000 ly'], ['Estrellas', '~ 1 billón'], ['Masa', '~ 1.5×10¹² M☉'], ['Velocidad radial', '−110 km/s'], ['Explorable', 'Próximamente']]
  },
  {
    id: 'triangulum', name: 'Triángulo · M33', type: 'GALAXIA ESPIRAL · SA(s)cd',
    position: [142, -52, -8], radius: 22, color: '#91c5ff',
    desc: 'La tercera galaxia espiral grande del Grupo Local. Carece de un bulbo central prominente y sus brazos contienen algunas de las regiones de formación estelar más luminosas cercanas.',
    facts: [['Distancia', '2.73 Mly'], ['Diámetro', '~ 60 000 ly'], ['Estrellas', '~ 40 mil millones'], ['Masa', '~ 5×10¹⁰ M☉'], ['Tipo', 'SA(s)cd'], ['Explorable', 'Próximamente']]
  },
  {
    id: 'lmc-local', name: 'Gran Nube de Magallanes', type: 'GALAXIA ENANA IRREGULAR · SBm',
    position: [-112, -66, 3], radius: 12, color: '#a8cdff',
    desc: 'La mayor galaxia satélite de la Vía Láctea. Su halo de materia oscura y su encuentro gravitatorio reciente han provocado intensa formación estelar en la Nebulosa de la Tarántula.',
    facts: [['Distancia', '163 000 ly'], ['Diámetro', '32 000 ly'], ['Masa', '~ 10¹¹ M☉'], ['Estrellas', '~ 30 mil millones'], ['Tipo', 'SBm'], ['Explorable', 'Próximamente']]
  },
  {
    id: 'smc-local', name: 'Pequeña Nube de Magallanes', type: 'GALAXIA ENANA IRREGULAR · Im',
    position: [-134, -92, 6], radius: 8.5, color: '#b9d9ff',
    desc: 'Compañera de la Gran Nube de Magallanes y satélite de la Vía Láctea. Un puente de gas neutro conecta ambas nubes, evidencia de su interacción gravitatoria.',
    facts: [['Distancia', '200 000 ly'], ['Diámetro', '19 000 ly'], ['Masa', '~ 7×10⁹ M☉'], ['Tipo', 'Im'], ['Puente de Magallanes', 'sí'], ['Explorable', 'Próximamente']]
  },
  {
    id: 'm32', name: 'M32', type: 'GALAXIA ENANA ELÍPTICA · cE2',
    position: [38, 48, -4], radius: 7.5, color: '#f2dfb6',
    desc: 'Una galaxia elíptica compacta que orbita Andrómeda. Su alta densidad estelar podría ser el núcleo despojado de una galaxia espiral mayor, arrancada por las mareas de M31.',
    facts: [['Distancia', '2.49 Mly'], ['Diámetro', '6 500 ly'], ['Estrellas', '~ 3 mil millones'], ['Tipo', 'cE2'], ['Anfitriona', 'Andrómeda'], ['Explorable', 'Próximamente']]
  },
  {
    id: 'ngc205', name: 'NGC 205 · M110', type: 'GALAXIA ENANA ELÍPTICA · dE5',
    position: [111, 58, -4], radius: 9, color: '#d8e3ff',
    desc: 'Otra galaxia satélite de Andrómeda. A diferencia de la mayoría de las elípticas enanas, conserva gas y polvo, y contiene una población de estrellas jóvenes.',
    facts: [['Distancia', '2.69 Mly'], ['Diámetro', '17 000 ly'], ['Masa', '~ 1.5×10⁹ M☉'], ['Tipo', 'dE5'], ['Anfitriona', 'Andrómeda'], ['Explorable', 'Próximamente']]
  }
];

export class LocalGroup {
  constructor() {
    this.group = new THREE.Group();
    this.bodies = [];
    this.cloudTex = cloudSprite(256, 122);
    this.flareTex = flareSprite();
    this.starTex = starSprite(64);
    this.time = 0;
    this.rnd = makeRandom(7331);

    for (const member of MEMBERS) this.#buildGalaxy(member);
    this.#buildFilament();
  }

  #buildGalaxy(data) {
    const group = new THREE.Group();
    group.position.fromArray(data.position);
    group.rotation.z = this.rnd() * Math.PI;

    const layer = (size, color, opacity, ratio) => {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({
        map: this.cloudTex, color, transparent: true, opacity,
        blending: THREE.AdditiveBlending, depthWrite: false
      }));
      s.scale.set(size, size * ratio, 1);
      group.add(s);
    };

    const ratio = data.type.includes('ESPIRAL') ? 0.38 : data.type.includes('IRREGULAR') ? 0.68 : 0.82;
    layer(data.radius * 2.6, data.color, 0.26, ratio);
    layer(data.radius * 1.05, '#fff1d0', 0.42, ratio * 0.9);

    if (data.type.includes('ESPIRAL')) {
      const count = 1300;
      const positions = new Float32Array(count * 3);
      const colors = new Float32Array(count * 3);
      const warm = new THREE.Color('#ffe1a6');
      const cool = new THREE.Color(data.color);
      const color = new THREE.Color();

      for (let i = 0; i < count; i++) {
        const arm = i % 2;
        const radius = Math.pow(this.rnd(), 0.55) * data.radius * 1.2;
        const angle = arm * Math.PI + radius * 0.19 + gauss(this.rnd) * 0.22;
        const i3 = i * 3;
        positions[i3] = Math.cos(angle) * radius;
        positions[i3 + 1] = Math.sin(angle) * radius * 0.48;
        positions[i3 + 2] = gauss(this.rnd) * data.radius * 0.04;
        color.copy(cool).lerp(warm, Math.pow(1 - radius / (data.radius * 1.2), 2));
        colors[i3] = color.r; colors[i3 + 1] = color.g; colors[i3 + 2] = color.b;
      }

      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      const arms = new THREE.Points(geometry, new THREE.PointsMaterial({
        map: this.starTex, size: 1.2, sizeAttenuation: true, vertexColors: true,
        transparent: true, opacity: 0.92, depthWrite: false, blending: THREE.AdditiveBlending
      }));
      group.add(arms);
    }

    const core = new THREE.Sprite(new THREE.SpriteMaterial({
      map: this.flareTex, color: '#fff5df', transparent: true, opacity: 0.65,
      blending: THREE.AdditiveBlending, depthWrite: false
    }));
    core.scale.setScalar(data.radius * 1.25);
    core.userData.data = data;
    group.add(core);

    this.group.add(group);
    this.bodies.push(core);
  }

  #buildFilament() {
    const positions = [];
    for (let i = 0; i < 1800; i++) {
      const t = this.rnd();
      positions.push(
        400 * t - 20,
        (this.rnd() - 0.5) * 110 * (0.3 + Math.sin(t * Math.PI)),
        -45 + (this.rnd() - 0.5) * 40
      );
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    const points = new THREE.Points(geometry, new THREE.PointsMaterial({
      map: this.starTex, size: 1.1, sizeAttenuation: true, color: 0x8c9dc7,
      transparent: true, opacity: 0.38, depthWrite: false, blending: THREE.AdditiveBlending
    }));
    this.group.add(points);
  }

  update(dt) {
    this.time += dt;
    this.group.rotation.y += dt * 0.0015;
    for (const core of this.bodies) {
      core.material.rotation += dt * 0.04;
    }
  }

  get pickables() { return this.bodies; }
}
