import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

import { Galaxy } from './galaxy.js';
import { Landmarks } from './landmarks.js';
import { SolarSystem } from './solar.js';
import { BlackHole } from './blackhole.js';
import { OrionNebula } from './orion.js';
import { LocalGroup } from './localgroup.js';
import { Discoveries } from './discoveries.js';
import { AlphaCentauri } from './alphacentauri.js';
import { UI } from './ui.js';
import { POIS, CATEGORIES, SUN } from './data.js';
import { easeInOut, clamp } from './utils.js';

/* ================================================================
 *  Renderer
 * ================================================================ */
const canvas = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.95;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const camera = new THREE.PerspectiveCamera(52, innerWidth / innerHeight, 0.05, 6000);

const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.rotateSpeed = 0.55;
controls.zoomSpeed = 0.9;
controls.panSpeed = 0.6;
controls.mouseButtons.RIGHT = THREE.MOUSE.PAN;
controls.touches.TWO = THREE.TOUCH.DOLLY_PAN;

// El botón derecho se reserva para desplazar la vista, no para el menú del navegador.
canvas.addEventListener('contextmenu', event => event.preventDefault());

const ui = new UI();
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

let galaxy = null;
let landmarks = null;
let solar = null;
let blackhole = null;
let orion = null;
let localGroup = null;
let discoveries = null;
let alphaCentauri = null;
let scene = null;
let composer, bloom, renderPass;

const state = {
  mode: 'galaxy',
  daysPerSecond: 20,
  flight: null,
  selected: null,
  followBody: null,
  transitioning: false,
  filter: 'all',
  isolation: 0
};

/* ================================================================
 *  Escenas
 * ================================================================ */
const galaxyScene = new THREE.Scene();
const solarScene = new THREE.Scene();
const bhScene = new THREE.Scene();
const orionScene = new THREE.Scene();
const localGroupScene = new THREE.Scene();
const alphaCentauriScene = new THREE.Scene();

function boot() {
  galaxy = new Galaxy();
  galaxyScene.add(galaxy.group);
  galaxyScene.fog = null;

  landmarks = new Landmarks(POIS);
  galaxy.group.add(landmarks.group);

  solar = new SolarSystem();
  solarScene.add(solar.group);

  blackhole = new BlackHole();
  bhScene.add(blackhole.group);

  orion = new OrionNebula();
  orionScene.add(orion.group);

  localGroup = new LocalGroup();
  localGroupScene.add(localGroup.group);

  alphaCentauri = new AlphaCentauri();
  alphaCentauriScene.add(alphaCentauri.group);

  discoveries = new Discoveries(POIS, CATEGORIES);

  scene = galaxyScene;

  renderPass = new RenderPass(scene, camera);
  bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.9, 0.7, 0.26);
  composer = new EffectComposer(renderer);
  composer.addPass(renderPass);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  setupGalaxyMode(true);
  buildNavigator();
  ui.el.speedValue.textContent = state.daysPerSecond + ' d/s';

  ui.hideLoader();
  setTimeout(() => ui.hideHint(), 7000);
  window.__gs = { galaxy, landmarks, solar, blackhole, orion, localGroup, alphaCentauri, discoveries, state, camera, controls, renderer, bloom };
  animate();
}

/* ================================================================
 *  Modo galaxia
 * ================================================================ */
function setupGalaxyMode(initial = false) {
  state.mode = 'galaxy';
  scene = galaxyScene;
  renderPass.scene = galaxyScene;
  bloom.strength = 0.72;
  bloom.threshold = 0.3;
  bloom.radius = 0.65;
  setResolutionScale(1);

  controls.minDistance = 0.5;
  controls.maxDistance = 400;
  controls.target.set(0, 0, 0);
  controls.enablePan = true;

  if (initial) {
    camera.position.set(0, 92, 128);
  }

  ui.setMode('galaxy');
  document.getElementById('btn-back').lastChild.textContent = ' Volver a la galaxia';
  ui.setContext('Vía Láctea · Galaxia espiral barrada SBbc');
  ui.setScale('100 000 ly');
  ui.setLabelsVisible(ui.showLabels);
  ui.clearLabels();
  ui.setNavCurrent(null);
  ui.setTarget(null);
  state.followBody = null;

  refreshGalaxyLabels();
}

/** Etiquetas de la galaxia: explorables siempre, el resto según el filtro */
function refreshGalaxyLabels() {
  if (state.mode !== 'galaxy') return;
  ui.clearLabels();

  for (const m of galaxy.markers) {
    const poi = m.userData.poi;
    const inFilter = state.filter === 'all' || poi.category === state.filter;
    if (!poi.explorable && !inFilter) continue;

    ui.addLabel(m, poi.name, poi.explorable ? 'poi' : 'locked', {
      pulse: poi.explorable,
      priority: poi.explorable ? 2 : (inFilter ? 1 : 0),
      width: poi.name.length * 7 + 26,
      onClick: () => selectPOI(poi)
    });
  }

  for (const background of galaxy.backgroundGalaxies) {
    const item = background.userData.galaxy;
    ui.addLabel(background, item.name, 'locked', {
      priority: -1,
      width: item.name.length * 7 + 26
    });
  }
}

/** Posición en coordenadas de mundo del marcador de un POI (la galaxia rota) */
function poiWorldPosition(poi) {
  const marker = galaxy.markers.find(m => m.userData.poi === poi);
  return marker.getWorldPosition(new THREE.Vector3());
}

function poiMarker(poi) {
  return galaxy.markers.find(m => m.userData.poi === poi);
}

function selectPOI(poi) {
  state.selected = poi;
  discoveries.record(poi.id, 'observed');
  applyIsolation();
  ui.setTarget(poi.name);
  ui.setNavCurrent(poi.id, poi.name);
  ui.showPanel({
    tag: poi.tag,
    name: poi.name,
    sub: poi.sub,
    desc: poi.desc + (poi.explorable ? '' : ' · Exploración detallada no disponible todavía.'),
    facts: poi.facts,
    actionLabel: poi.actionLabel || 'Explorar sistema'
  }, poi.explorable ? () => enterDestination(poi) : null);

  // Encuadre proporcional al tamaño real del objeto
  const dist = poi.explorable ? 11 : clamp(poi.size * 3.8, 0.9, 26);
  flyTo(poiWorldPosition(poi), dist, 1.6, poiMarker(poi));
}

/* ================================================================
 *  Modo sistema solar
 * ================================================================ */
function setupSolarMode() {
  state.mode = 'solar';
  scene = solarScene;
  renderPass.scene = solarScene;
  bloom.strength = 0.85;
  bloom.threshold = 0.62;
  bloom.radius = 0.6;
  setResolutionScale(1);

  controls.minDistance = 1.2;
  controls.maxDistance = 900;
  controls.target.set(0, 0, 0);
  controls.enablePan = true;

  ui.setMode('solar');
  ui.setContext('Sistema Solar · Brazo de Orión · 26 000 ly del centro');
  ui.setScale('~ 60 UA');
  ui.clearLabels();
  ui.setTarget('Sol');

  ui.addLabel(solar.sunMesh, 'Sol', 'planet active', {
    priority: 2,
    onClick: () => selectBody(solar.bodies[0])
  });
  for (const b of solar.bodies) {
    if (b.kind === 'planet') {
      ui.addLabel(b.obj, b.data.name, 'planet', {
        maxDist: 900,
        priority: 2,
        onClick: () => selectBody(b)
      });
    } else if (b.kind === 'moon') {
      ui.addLabel(b.obj, b.data.name, 'moon', {
        maxDist: 90,
        width: 90,
        onClick: () => selectBody(b)
      });
    }
  }
  ui.setLabelsVisible(ui.showLabels);
}

function selectBody(b) {
  state.selected = b;
  applyIsolation();
  ui.setTarget(b.data.name);

  if (b.kind === 'sun') {
    ui.showPanel({ tag: SUN.tag, name: SUN.name, sub: 'Centro del sistema · 1 UA de la Tierra', desc: SUN.desc, facts: SUN.facts });
  } else if (b.kind === 'planet') {
    ui.showPanel({
      tag: b.data.tag, name: b.data.name,
      sub: `${b.data.au} UA del Sol · ${b.data.moons.length} satélite(s) representado(s)`,
      desc: b.data.desc, facts: b.data.facts, moons: b.data.moons
    });
  } else {
    ui.showPanel({
      tag: 'SATÉLITE NATURAL', name: b.data.name,
      sub: `Luna de ${b.parent.name}`,
      desc: b.data.note ? `${b.data.note}. Radio de ${b.data.radiusKm} km; completa una órbita cada ${Math.abs(b.data.periodDays)} días.` : '',
      facts: [['Radio', b.data.radiusKm + ' km'], ['Periodo', Math.abs(b.data.periodDays) + ' d']]
    });
  }

  const target = new THREE.Vector3();
  b.obj.getWorldPosition(target);
  const r = b.data.visualR || 1;
  flyTo(target, Math.max(2.2, r * 4.2), 1.4, b.obj);
}

/* ================================================================
 *  Modo agujero negro
 * ================================================================ */
function setupBlackHoleMode() {
  state.mode = 'blackhole';
  scene = bhScene;
  renderPass.scene = bhScene;
  bloom.strength = 0.55;
  bloom.threshold = 0.75;
  bloom.radius = 0.5;
  // el trazado de geodésicas es caro: se renderiza a menor resolución
  setResolutionScale(0.72);

  controls.minDistance = 5;
  controls.maxDistance = 120;
  controls.target.set(0, 0, 0);
  controls.enablePan = false;

  ui.setMode('blackhole');
  ui.setContext('Sagitario A* · Centro galáctico · 4.3 millones de masas solares');
  ui.setScale('~ 60 r_s');
  ui.clearLabels();
  ui.setTarget('Sagitario A*');

  const a = blackhole.anchors;
  ui.addLabel(a.horizon, 'Horizonte de sucesos', 'poi', { pulse: true, priority: 2 });
  ui.addLabel(a.photon, 'Esfera de fotones', 'moon', { priority: 2 });
  ui.addLabel(a.disk, 'Disco de acreción', 'planet', { priority: 2 });
  ui.setLabelsVisible(ui.showLabels);
}

/* ================================================================
 *  Modo Nebulosa de Orión
 * ================================================================ */
function setupOrionMode() {
  state.mode = 'orion';
  scene = orionScene;
  renderPass.scene = orionScene;
  bloom.strength = 1.1;
  bloom.threshold = 0.38;
  bloom.radius = 0.7;
  setResolutionScale(1);

  controls.minDistance = 2;
  controls.maxDistance = 150;
  controls.target.set(0, 0, 0);
  controls.enablePan = true;

  ui.setMode('orion');
  ui.setContext('Nebulosa de Orión · M42 · Vivero estelar');
  ui.setScale('~ 24 años luz');
  ui.clearLabels();
  ui.setTarget('Nebulosa de Orión');

  for (const feature of orion.features) {
    const info = feature.userData.info;
    ui.addLabel(feature, info.name, 'poi', {
      pulse: info.name === 'El Trapecio',
      priority: 2,
      onClick: () => selectOrionFeature(feature)
    });
  }
  ui.setLabelsVisible(ui.showLabels);
}

function selectOrionFeature(feature) {
  const info = feature.userData.info;
  state.selected = { obj: feature, data: info };
  ui.setTarget(info.name);
  ui.showPanel(info);
  const target = feature.getWorldPosition(new THREE.Vector3());
  flyTo(target, 11, 1.3, feature);
}

/* ================================================================
 *  Modo Alfa Centauri
 * ================================================================ */
function setupAlphaCentauriMode() {
  state.mode = 'alphacentauri';
  scene = alphaCentauriScene;
  renderPass.scene = alphaCentauriScene;
  bloom.strength = 0.95;
  bloom.threshold = 0.45;
  bloom.radius = 0.65;
  setResolutionScale(1);

  controls.minDistance = 2;
  controls.maxDistance = 180;
  const enteringProxima = state.destination?.id === 'proximab';
  controls.target.set(enteringProxima ? 42 : 12, enteringProxima ? -13 : 0, enteringProxima ? -8 : 0);
  controls.enablePan = true;

  ui.setMode('alphacentauri');
  ui.setContext('Alfa Centauri · Sistema triple · 4.37 años luz');
  ui.setScale('~ 200 UA · escala visual');
  ui.clearLabels();
  ui.setTarget(enteringProxima ? 'Próxima Centauri b' : 'Alfa Centauri');

  for (const feature of alphaCentauri.features) {
    const info = feature.userData.info;
    ui.addLabel(feature, info.name, 'poi', {
      pulse: info.name === 'Próxima Centauri b',
      priority: info.name === 'Próxima Centauri b' ? 2 : 1,
      width: info.name.length * 7 + 26,
      onClick: () => selectAlphaFeature(feature)
    });
  }
  ui.setLabelsVisible(ui.showLabels);
}

function selectAlphaFeature(feature) {
  const info = feature.userData.info;
  state.selected = { obj: feature, data: info };
  ui.setTarget(info.name);
  ui.showPanel(info);
  flyTo(feature.getWorldPosition(new THREE.Vector3()), info.name === 'Próxima Centauri b' ? 7 : 11, 1.3, feature);
}

/* ================================================================
 *  Modo Grupo Local
 * ================================================================ */
function setupLocalGroupMode() {
  state.mode = 'localgroup';
  scene = localGroupScene;
  renderPass.scene = localGroupScene;
  bloom.strength = 0.78;
  bloom.threshold = 0.34;
  bloom.radius = 0.7;
  setResolutionScale(1);

  controls.minDistance = 30;
  controls.maxDistance = 1300;
  controls.target.set(190, 0, -25);
  controls.enablePan = true;

  ui.setMode('localgroup');
  document.getElementById('btn-back').lastChild.textContent = ' Explorar la Vía Láctea';
  ui.setContext('Grupo Local · ~ 60 galaxias ligadas gravitacionalmente');
  ui.setScale('~ 5 millones de años luz');
  ui.clearLabels();
  ui.setTarget('Grupo Local');

  for (const body of localGroup.bodies) {
    const data = body.userData.data;
    ui.addLabel(body, data.name, data.explorable ? 'poi' : 'locked', {
      pulse: data.explorable,
      priority: data.explorable ? 2 : 1,
      width: data.name.length * 7 + 26,
      onClick: () => selectLocalGalaxy(body)
    });
  }
  ui.setLabelsVisible(ui.showLabels);
}

function selectLocalGalaxy(body) {
  const data = body.userData.data;
  state.selected = { obj: body, data };
  ui.setTarget(data.name);
  ui.showPanel({
    tag: data.type, name: data.name,
    sub: data.explorable ? 'Nuestra galaxia · acceso disponible' : 'Grupo Local · exploración próximamente',
    desc: data.desc, facts: data.facts,
    actionLabel: 'Explorar Vía Láctea'
  }, data.explorable ? () => enterMilkyWay() : null);
  flyTo(body.getWorldPosition(new THREE.Vector3()), data.radius * 4.4, 1.5, body);
}

function enterLocalGroup() {
  if (state.transitioning) return;
  state.transitioning = true;
  ui.hidePanel();
  ui.fade(true);
  setTimeout(() => {
    setupLocalGroupMode();
    camera.position.set(0, 105, 350);
    controls.target.set(0, 0, 0);
    controls.update();
    ui.fade(false);
    state.transitioning = false;
  }, 550);
}

function enterMilkyWay() {
  if (state.mode !== 'localgroup') return;
  state.transitioning = true;
  ui.hidePanel();
  ui.fade(true);
  setTimeout(() => {
    setupGalaxyMode(true);
    controls.update();
    ui.fade(false);
    state.transitioning = false;
  }, 550);
}

/* ================================================================
 *  Transiciones entre escenas
 * ================================================================ */
const DESTINATIONS = {
  solar: {
    setup: setupSolarMode,
    enter: { pos: [0, 34, 96], fly: { dist: 118, dur: 2.2 } },
    back: { dist: 190, dir: [0, 120, 150] }
  },
  blackhole: {
    setup: setupBlackHoleMode,
    enter: { pos: [0, 4.5, 22], fly: { dist: 46, dur: 2.6 } },
    back: { dist: 190, dir: [0, 120, 150] }
  },
  orion: {
    setup: setupOrionMode,
    enter: { pos: [0, 12, 42], fly: { dist: 46, dur: 2.5 } },
    back: { dist: 190, dir: [0, 120, 150] }
  },
  alphacen: {
    setup: setupAlphaCentauriMode,
    enter: { pos: [9, 17, 72], fly: { dist: 72, dur: 2.3 } },
    back: { dist: 190, dir: [0, 120, 150] }
  }
};

function destinationKey(poi) {
  if (poi.id === 'sgra') return 'blackhole';
  if (poi.id === 'proximab') return 'alphacen';
  return poi.id;
}

function enterDestination(poi) {
  const key = destinationKey(poi);
  const dest = DESTINATIONS[key];
  if (!dest || state.transitioning) return;

  state.transitioning = true;
  state.destination = poi;
  document.getElementById('btn-local-group').classList.add('hidden');
  discoveries.record(poi.id, 'explored');
  ui.hidePanel();

  flyTo(poiWorldPosition(poi), 2.2, 1.5, null, () => {
    ui.fade(true);
    setTimeout(() => {
      dest.setup();
      camera.position.fromArray(dest.enter.pos);
      const entryTarget = key === 'alphacen' && poi.id === 'proximab'
        ? new THREE.Vector3(42, -13, -8)
        : new THREE.Vector3(0, 0, 0);
      controls.target.copy(entryTarget);
      controls.update();
      ui.fade(false);
      state.transitioning = false;
      flyTo(entryTarget, dest.enter.fly.dist, dest.enter.fly.dur);
    }, 600);
  });
}

function exitToGalaxy() {
  if (state.transitioning) return;
  const poi = state.destination || POIS.find(p => p.id === 'solar');
  const dest = DESTINATIONS[destinationKey(poi)];

  state.transitioning = true;
  ui.hidePanel();
  ui.fade(true);
  setTimeout(() => {
    setupGalaxyMode();
    const p = poiWorldPosition(poi);
    camera.position.set(p.x * 1.06 || 6, p.y + 3, p.z * 1.06 || 6);
    controls.target.copy(p);
    controls.update();
    ui.fade(false);
    state.transitioning = false;
    flyTo(new THREE.Vector3(0, 0, 0), dest.back.dist, 2.6, null, null,
      new THREE.Vector3().fromArray(dest.back.dir));
  }, 600);
}

/** Baja la resolución interna del composer sin tocar el tamaño del canvas */
function setResolutionScale(scale) {
  const pr = Math.min(devicePixelRatio, 2) * scale;
  composer.setPixelRatio(pr);
  composer.setSize(innerWidth, innerHeight);
}

/* ================================================================
 *  Vuelo de cámara
 * ================================================================ */
function flyTo(targetPoint, distance, duration = 1.4, follow = null, onDone = null, dirHint = null) {
  const dir = dirHint
    ? dirHint.clone().normalize()
    : camera.position.clone().sub(targetPoint).normalize();
  if (!isFinite(dir.x) || dir.lengthSq() < 1e-6) dir.set(0.4, 0.5, 0.8).normalize();

  state.flight = {
    t: 0, duration, dir, distance,
    fromPos: camera.position.clone(),
    fromTarget: controls.target.clone(),
    toTarget: targetPoint.clone(),
    follow, onDone
  };
  state.followBody = null;
  controls.enabled = false;
}

const _toPos = new THREE.Vector3();

function updateFlight(dt) {
  const f = state.flight;
  if (!f) return;
  f.t += dt;
  const k = easeInOut(clamp(f.t / f.duration, 0, 1));

  // Si seguimos un cuerpo en órbita, el destino se recalcula cada fotograma
  if (f.follow) f.follow.getWorldPosition(f.toTarget);

  _toPos.copy(f.toTarget).addScaledVector(f.dir, f.distance);
  camera.position.lerpVectors(f.fromPos, _toPos, k);
  controls.target.lerpVectors(f.fromTarget, f.toTarget, k);

  if (f.t >= f.duration) {
    state.flight = null;
    controls.enabled = true;
    state.followBody = f.follow;
    f.onDone?.();
  }
}

/* Mantiene el encuadre sobre un cuerpo en movimiento */
const _fw = new THREE.Vector3();
const _prev = new THREE.Vector3();
function updateFollow() {
  if (!state.followBody || state.flight) return;
  const target = state.followBody;
  _prev.copy(controls.target);
  target.getWorldPosition(_fw);
  const delta = _fw.clone().sub(_prev);
  controls.target.copy(_fw);
  camera.position.add(delta);
}

/* ================================================================
 *  Interacción
 * ================================================================ */
let downPos = null;

canvas.addEventListener('pointerdown', e => { downPos = { x: e.clientX, y: e.clientY }; });

function pickList() {
  if (state.mode === 'galaxy') return galaxy.markers;
  if (state.mode === 'solar') return solar.pickables;
  if (state.mode === 'orion') return orion.pickables;
  if (state.mode === 'alphacentauri') return alphaCentauri.pickables;
  if (state.mode === 'localgroup') return localGroup.pickables;
  return [];
}

canvas.addEventListener('pointerup', e => {
  if (!downPos) return;
  const moved = Math.hypot(e.clientX - downPos.x, e.clientY - downPos.y);
  downPos = null;
  if (moved > 6 || state.transitioning) return;

  pointer.x = (e.clientX / innerWidth) * 2 - 1;
  pointer.y = -(e.clientY / innerHeight) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);

  const hit = raycaster.intersectObjects(pickList(), false)[0];
  if (!hit) return;

  if (state.mode === 'galaxy') {
    selectPOI(hit.object.userData.poi);
  } else if (state.mode === 'solar') {
    const b = solar.bodies.find(x => x.obj === hit.object);
    if (b) selectBody(b);
  } else if (state.mode === 'orion') {
    selectOrionFeature(hit.object);
  } else if (state.mode === 'alphacentauri') {
    selectAlphaFeature(hit.object);
  } else if (state.mode === 'localgroup') {
    selectLocalGalaxy(hit.object);
  }
});

canvas.addEventListener('pointermove', e => {
  if (state.transitioning) { ui.setReticle(0, 0, false); return; }
  pointer.x = (e.clientX / innerWidth) * 2 - 1;
  pointer.y = -(e.clientY / innerHeight) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const hit = raycaster.intersectObjects(pickList(), false)[0];
  ui.setReticle(e.clientX, e.clientY, !!hit);
  canvas.style.cursor = hit ? 'pointer' : '';
});

document.getElementById('btn-back').onclick = () => {
  if (state.mode === 'localgroup') enterMilkyWay();
  else exitToGalaxy();
};
document.getElementById('btn-local-group').onclick = enterLocalGroup;

/* Herramientas de vista */
document.querySelectorAll('#view-tools button').forEach(btn => {
  btn.onclick = () => {
    const a = btn.dataset.action;
    if (a === 'top') {
      const d = camera.position.distanceTo(controls.target);
      flyTo(controls.target.clone(), d, 1.2, state.followBody, null, new THREE.Vector3(0, 1, 0.001));
    } else if (a === 'edge') {
      const d = camera.position.distanceTo(controls.target);
      flyTo(controls.target.clone(), d, 1.2, state.followBody, null, new THREE.Vector3(0.02, 0.06, 1));
    } else if (a === 'labels') {
      ui.setLabelsVisible(!ui.showLabels);
    } else if (a === 'orbits') {
      const on = !btn.classList.contains('active');
      btn.classList.toggle('active', on);
      solar.setOrbitsVisible(on);
    }
  };
});

/* Velocidad temporal */
ui.el.speed.addEventListener('input', e => {
  state.daysPerSecond = Number(e.target.value);
  ui.el.speedValue.textContent = state.daysPerSecond === 0
    ? 'PAUSA'
    : state.daysPerSecond + ' d/s';
});

const focusSlider = document.getElementById('focus');
const focusValue = document.getElementById('focus-value');

function applyIsolation() {
  if (!solar) return;
  if (state.mode === 'solar') {
    solar.setFocus(state.selected?.obj, state.isolation);
  } else if (state.mode === 'galaxy') {
    galaxy.setFocus(state.selected, state.isolation);
    landmarks.setFocus(state.selected, state.isolation);
  }
}

focusSlider.addEventListener('input', e => {
  state.isolation = Number(e.target.value) / 100;
  focusValue.textContent = Math.round(state.isolation * 100) + '%';
  applyIsolation();
});

/* Navegador de destinos */
const CATEGORY_NAME = Object.fromEntries(CATEGORIES.map(c => [c.id, c.name]));

function formatLy(ly) {
  if (ly === 0) return '0 ly';
  if (ly < 1000) return ly.toLocaleString('es-ES', { maximumFractionDigits: 1 }) + ' ly';
  if (ly < 1e6) return Math.round(ly / 1000).toLocaleString('es-ES') + ' kly';
  return (ly / 1e6).toFixed(1) + ' Mly';
}

function buildNavigator() {
  const order = ['sistema', 'nebulosa', 'cumulo', 'remanente', 'exotico', 'estructura'];
  const items = POIS
    .map(p => ({
      id: p.id, name: p.name, tag: p.tag, category: p.category,
      groupName: CATEGORY_NAME[p.category],
      color: p.color, unlocked: p.explorable,
      distance: formatLy(p.ly), poi: p
    }))
    .sort((a, b) =>
      (b.unlocked - a.unlocked) ||
      (order.indexOf(a.category) - order.indexOf(b.category)) ||
      (a.poi.ly - b.poi.ly)
    );

  ui.buildNavigator(CATEGORIES, items, item => {
    if (state.mode !== 'galaxy') {
      exitToGalaxy();
      setTimeout(() => selectPOI(item.poi), 900);
    } else {
      selectPOI(item.poi);
    }
  }, filter => {
    state.filter = filter;
    galaxy.setFilter(filter);
    refreshGalaxyLabels();
  });

  state.navOrder = items.map(i => i.poi);
}

/** Salta al destino anterior o siguiente de la lista */
function stepDestination(dir) {
  if (state.mode !== 'galaxy' || !state.navOrder) return;
  const list = state.navOrder;
  const i = list.indexOf(state.selected);
  selectPOI(list[(i + dir + list.length) % list.length]);
}

/* Resize */
addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  setResolutionScale(state.mode === 'blackhole' ? 0.72 : 1);
  bloom.setSize(innerWidth, innerHeight);
});

/* Atajos */
addEventListener('keydown', e => {
  const typing = e.target === ui.el.navInput;

  if ((e.key === 'k' || e.key === 'K') && (e.ctrlKey || e.metaKey)) {
    e.preventDefault();
    ui.toggleNav();
    return;
  }
  if (typing) return;

  if (e.key === '/' || e.key === 'k' || e.key === 'K') {
    e.preventDefault();
    ui.toggleNav(true);
  } else if (e.key === 'Escape') {
    if (ui.navOpen) ui.toggleNav(false);
    else {
      ui.hidePanel();
      if (state.mode !== 'galaxy') exitToGalaxy();
    }
  } else if (e.key === 'l' || e.key === 'L') {
    ui.setLabelsVisible(!ui.showLabels);
  } else if (e.key === '[') {
    stepDestination(-1);
  } else if (e.key === ']') {
    stepDestination(1);
  }
});

/* ================================================================
 *  Bucle principal
 * ================================================================ */
const clock = new THREE.Clock();

function formatDistance() {
  const d = camera.position.distanceTo(controls.target);
  if (state.mode === 'galaxy') {
    return (d * 1000).toLocaleString('es-ES', { maximumFractionDigits: 0 }) + ' ly';
  }
  if (state.mode === 'blackhole') {
    return d.toFixed(1) + ' rₛ';
  }
  if (state.mode === 'orion') {
    return d.toFixed(d < 10 ? 1 : 0) + ' ly';
  }
  if (state.mode === 'localgroup') {
    const mly = d * 0.00686;
    return mly.toFixed(mly < 1 ? 2 : 1) + ' Mly';
  }
  const au = d > 14 ? Math.pow((d - 14) / 26, 1 / 0.62) : d / 14 * 0.1;
  return au.toFixed(au < 10 ? 2 : 1) + ' UA';
}

let statTick = 0;

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);

  updateFlight(dt);
  updateFollow();
  controls.update();

  if (state.mode === 'galaxy') {
    galaxy.update(dt, state.daysPerSecond, camera);
    landmarks.update(dt);
  } else if (state.mode === 'solar') {
    solar.update(dt, state.daysPerSecond);
  } else if (state.mode === 'orion') {
    orion.update(dt, state.daysPerSecond);
  } else if (state.mode === 'alphacentauri') {
    alphaCentauri.update(dt, state.daysPerSecond);
  } else if (state.mode === 'localgroup') {
    localGroup.update(dt);
  } else {
    blackhole.update(dt, camera, state.daysPerSecond);
  }

  ui.updateLabels(camera, innerWidth, innerHeight);

  statTick += dt;
  if (statTick > 0.12) {
    statTick = 0;
    ui.setDistance(formatDistance());
  }

  composer.render();
}

/* Arranque diferido para que se pinte el loader */
setTimeout(boot, 60);
