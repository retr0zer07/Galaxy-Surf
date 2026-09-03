import * as THREE from 'three';
import { makeRandom, planetTexture, flareSprite, starSprite } from './utils.js';

export class AlphaCentauri {
  constructor() {
    this.group = new THREE.Group();
    this.features = [];
    this.time = 0;
    this.flareTex = flareSprite();
    this.rnd = makeRandom(615);

    this.#buildStarfield();
    this.#buildBinary();
    this.#buildProxima();
  }

  #buildStarfield() {
    const positions = [];
    for (let i = 0; i < 6500; i++) {
      const r = 420 + this.rnd() * 140;
      const u = this.rnd() * 2 - 1;
      const a = this.rnd() * Math.PI * 2;
      const s = Math.sqrt(1 - u * u);
      positions.push(r * s * Math.cos(a), r * u, r * s * Math.sin(a));
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    this.group.add(new THREE.Points(geometry, new THREE.PointsMaterial({
      map: starSprite(32), size: 1.2, sizeAttenuation: false, color: 0xb7ceff,
      transparent: true, opacity: 0.82, depthWrite: false, blending: THREE.AdditiveBlending
    })));
  }

  #star(radius, color, flareSize) {
    const group = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.SphereGeometry(radius, 48, 32),
      new THREE.MeshBasicMaterial({ color })
    );
    group.add(body);
    const flare = new THREE.Sprite(new THREE.SpriteMaterial({
      map: this.flareTex, color, transparent: true, opacity: 0.78,
      blending: THREE.AdditiveBlending, depthWrite: false
    }));
    flare.scale.setScalar(flareSize);
    group.add(flare);
    return { group, body, flare };
  }

  #orbit(radius, color, opacity = 0.2) {
    const points = [];
    for (let i = 0; i <= 128; i++) {
      const a = i / 128 * Math.PI * 2;
      points.push(new THREE.Vector3(Math.cos(a) * radius, 0, Math.sin(a) * radius));
    }
    return new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(points),
      new THREE.LineBasicMaterial({ color, transparent: true, opacity })
    );
  }

  #feature(object, info) {
    object.userData.info = info;
    this.features.push(object);
  }

  #buildBinary() {
    this.binary = new THREE.Group();
    this.group.add(this.binary);
    this.binary.add(this.#orbit(13.5, 0xffd9a0));

    const alphaA = this.#star(2.9, 0xffe5b0, 11);
    const alphaB = this.#star(2.35, 0xffbd72, 8.5);
    this.binary.add(alphaA.group, alphaB.group);
    this.alphaA = alphaA.group;
    this.alphaB = alphaB.group;

    this.#feature(alphaA.body, {
      tag: 'ALFA CENTAURI A · G2V', name: 'Rigil Kentaurus',
      sub: 'Estrella primaria del par Alfa Centauri A/B',
      desc: 'La estrella más parecida al Sol de las cercanías. Es ligeramente más masiva y luminosa, y junto con Alfa Centauri B completa una órbita mutua muy excéntrica cada 79,9 años.',
      facts: [['Masa', '1.10 M☉'], ['Radio', '1.22 R☉'], ['Temperatura', '5 790 K'], ['Luminosidad', '1.52 L☉'], ['Tipo', 'G2V']]
    });
    this.#feature(alphaB.body, {
      tag: 'ALFA CENTAURI B · K1V', name: 'Toliman',
      sub: 'Estrella secundaria del par Alfa Centauri A/B',
      desc: 'Una estrella naranja algo más pequeña y fría que el Sol. A pesar de estar separada de Alfa A por una distancia comparable a Saturno-Sol en el máximo acercamiento, el sistema puede conservar regiones planetarias estables.',
      facts: [['Masa', '0.91 M☉'], ['Radio', '0.86 R☉'], ['Temperatura', '5 260 K'], ['Luminosidad', '0.50 L☉'], ['Tipo', 'K1V']]
    });
  }

  #buildProxima() {
    this.proximaSystem = new THREE.Group();
    this.proximaSystem.position.set(42, -13, -8);
    this.group.add(this.proximaSystem);

    const star = this.#star(2.2, 0xff6048, 10);
    this.proximaSystem.add(star.group);
    this.proximaStar = star.group;

    const habitable = new THREE.Mesh(
      new THREE.RingGeometry(7.2, 8.7, 96),
      new THREE.MeshBasicMaterial({
        color: 0x61cfa5, transparent: true, opacity: 0.13,
        side: THREE.DoubleSide, depthWrite: false
      })
    );
    habitable.rotation.x = Math.PI / 2;
    this.proximaSystem.add(habitable);

    this.proximaSystem.add(this.#orbit(7.9, 0x73e0ba, 0.5));
    const planetPivot = new THREE.Group();
    this.proximaSystem.add(planetPivot);
    this.proximaPlanetPivot = planetPivot;

    const planet = new THREE.Mesh(
      new THREE.SphereGeometry(1.15, 48, 32),
      new THREE.MeshStandardMaterial({
        map: planetTexture({
          style: 'earth', seed: 424, width: 1024, height: 512,
          palette: ['#0a1d38', '#174874', '#27759b', '#487a4a', '#908158']
        }),
        roughness: 0.9, metalness: 0
      })
    );
    planet.position.x = 7.9;
    planetPivot.add(planet);
    this.proximaPlanet = planet;

    const atmosphere = new THREE.Mesh(
      new THREE.SphereGeometry(1.21, 32, 24),
      new THREE.MeshBasicMaterial({ color: 0x4da7ff, transparent: true, opacity: 0.2, side: THREE.BackSide, blending: THREE.AdditiveBlending, depthWrite: false })
    );
    planet.add(atmosphere);

    this.#feature(star.body, {
      tag: 'PRÓXIMA CENTAURI · M5.5Ve', name: 'Próxima Centauri',
      sub: 'La estrella más cercana al Sol · 4.24 ly',
      desc: 'Una enana roja ultrafría y activa. Sus fulguraciones pueden multiplicar temporalmente su brillo, bañando a Próxima b con radiación ultravioleta y rayos X.',
      facts: [['Masa', '0.12 M☉'], ['Radio', '0.15 R☉'], ['Temperatura', '3 042 K'], ['Luminosidad', '0.0017 L☉'], ['Fulguraciones', 'frecuentes']]
    });
    this.#feature(planet, {
      tag: 'EXOPLANETA ROCOSO', name: 'Próxima Centauri b',
      sub: 'Zona habitable conservadora de Próxima Centauri',
      desc: 'Un mundo de masa mínima cercana a la Tierra. Su corta órbita lo deja sincronizado por marea: un hemisferio mira siempre a la estrella y el otro permanece en noche perpetua.',
      facts: [['Masa mínima', '1.07 M⊕'], ['Periodo', '11.186 días'], ['Distancia', '0.0485 UA'], ['Insolación', '0.65 S⊕'], ['Rotación', 'probable acople mareal']]
    });
  }

  update(dt, daysPerSecond) {
    this.time += dt;
    const years = this.time * Math.min(daysPerSecond, 30) * 0.02;
    const binaryPhase = years / 79.9 * Math.PI * 2;
    this.alphaA.position.set(Math.cos(binaryPhase) * 5.8, 0, Math.sin(binaryPhase) * 5.8);
    this.alphaB.position.set(-Math.cos(binaryPhase) * 7.7, 0, -Math.sin(binaryPhase) * 7.7);
    this.alphaA.rotation.y += dt * 0.14;
    this.alphaB.rotation.y += dt * 0.11;

    const planetPhase = this.time * Math.min(daysPerSecond, 30) * 0.18;
    this.proximaPlanetPivot.rotation.y = planetPhase;
    this.proximaPlanet.rotation.y += dt * 0.25;

    const flare = 0.72 + Math.max(0, Math.sin(this.time * 0.43) - 0.84) * 2.5;
    this.proximaStar.children[1].material.opacity = Math.min(flare, 1);
    this.proximaStar.children[1].scale.setScalar(10 * (0.85 + flare * 0.28));
  }

  get pickables() { return this.features; }
}
