import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

import { Galaxy } from './galaxy.js';
import { SolarSystem } from './solar.js';
import { BlackHole } from './blackhole.js';
import { UI } from './ui.js';
import { POIS, SUN } from './data.js';
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

const ui = new UI();
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

let galaxy = null;
let solar = null;
let blackhole = null;
let scene = null;
let composer, bloom, renderPass;

const state = {
  mode: 'galaxy',
  daysPerSecond: 20,
  flight: null,
  selected: null,
  followBody: null,
  transitioning: false
};

/* ================================================================
 *  Escenas
 * ================================================================ */
const galaxyScene = new THREE.Scene();
const solarScene = new THREE.Scene();
const bhScene = new THREE.Scene();

function boot() {
  galaxy = new Galaxy();
  galaxyScene.add(galaxy.group);
  galaxyScene.fog = null;

  solar = new SolarSystem();
  solarScene.add(solar.group);

  blackhole = new BlackHole();
  bhScene.add(blackhole.group);

  scene = galaxyScene;

  renderPass = new RenderPass(scene, camera);
  bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.9, 0.7, 0.26);
  composer = new EffectComposer(renderer);
  composer.addPass(renderPass);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  setupGalaxyMode(true);
  buildDock();
  ui.el.speedValue.textContent = state.daysPerSecond + ' d/s';

  ui.hideLoader();
  setTimeout(() => ui.hideHint(), 7000);
  window.__gs = { galaxy, solar, blackhole, state, camera, controls, renderer, bloom };
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

  controls.minDistance = 6;
  controls.maxDistance = 400;
  controls.target.set(0, 0, 0);
  controls.enablePan = false;

  if (initial) {
    camera.position.set(0, 92, 128);
  }

  ui.setMode('galaxy');
  ui.setContext('Vía Láctea · Galaxia espiral barrada SBbc');
  ui.setScale('100 000 ly');
  ui.setLabelsVisible(ui.showLabels);
  ui.clearLabels();
  ui.setDockCurrent(null);
  ui.setTarget(null);
  state.followBody = null;

  for (const m of galaxy.markers) {
    const poi = m.userData.poi;
    ui.addLabel(m, poi.name, poi.explorable ? 'poi' : 'locked', {
      pulse: poi.explorable,
      offset: 0,
      onClick: () => selectPOI(poi)
    });
  }
}

/** Posición en coordenadas de mundo del marcador de un POI (la galaxia rota) */
function poiWorldPosition(poi) {
  const marker = galaxy.markers.find(m => m.userData.poi === poi);
  return marker.getWorldPosition(new THREE.Vector3());
}

function selectPOI(poi) {
  state.selected = poi;
  ui.setTarget(poi.name);
  ui.showPanel({
    tag: poi.tag,
    name: poi.name,
    sub: poi.sub,
    desc: poi.desc + (poi.explorable ? '' : ' · Exploración detallada no disponible todavía.'),
    facts: poi.facts,
    actionLabel: poi.actionLabel || 'Explorar sistema'
  }, poi.explorable ? () => enterDestination(poi) : null);

  flyTo(poiWorldPosition(poi), poi.explorable ? 11 : 16, 1.5);
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
    onClick: () => selectBody(solar.bodies[0])
  });
  for (const b of solar.bodies) {
    if (b.kind === 'planet') {
      ui.addLabel(b.obj, b.data.name, 'planet', {
        maxDist: 900,
        onClick: () => selectBody(b)
      });
    } else if (b.kind === 'moon') {
      ui.addLabel(b.obj, b.data.name, 'moon', {
        maxDist: 90,
        onClick: () => selectBody(b)
      });
    }
  }
  ui.setLabelsVisible(ui.showLabels);
}

function selectBody(b) {
  state.selected = b;
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
  flyTo(target, Math.max(2.2, r * 4.2), 1.4, b);
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
  ui.addLabel(a.horizon, 'Horizonte de sucesos', 'poi', { pulse: true });
  ui.addLabel(a.photon, 'Esfera de fotones', 'moon');
  ui.addLabel(a.disk, 'Disco de acreción', 'planet');
  ui.setLabelsVisible(ui.showLabels);
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
  }
};

function destinationKey(poi) {
  return poi.id === 'sgra' ? 'blackhole' : poi.id;
}

function enterDestination(poi) {
  const key = destinationKey(poi);
  const dest = DESTINATIONS[key];
  if (!dest || state.transitioning) return;

  state.transitioning = true;
  state.destination = poi;
  ui.hidePanel();

  flyTo(poiWorldPosition(poi), 2.2, 1.5, null, () => {
    ui.fade(true);
    setTimeout(() => {
      dest.setup();
      camera.position.fromArray(dest.enter.pos);
      controls.target.set(0, 0, 0);
      controls.update();
      ui.fade(false);
      state.transitioning = false;
      flyTo(new THREE.Vector3(0, 0, 0), dest.enter.fly.dist, dest.enter.fly.dur);
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
  if (f.follow) f.follow.obj.getWorldPosition(f.toTarget);

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
  const b = state.followBody;
  _prev.copy(controls.target);
  b.obj.getWorldPosition(_fw);
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

document.getElementById('btn-back').onclick = exitToGalaxy;

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

/* Dock */
function buildDock() {
  const items = POIS.map(p => ({
    id: p.id, name: p.name, unlocked: p.explorable, locked: false, poi: p
  }));
  ui.buildDock(items, item => {
    if (state.mode !== 'galaxy') {
      exitToGalaxy();
      setTimeout(() => selectPOI(item.poi), 900);
    } else {
      selectPOI(item.poi);
    }
    ui.setDockCurrent(item.id);
  });
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
  if (e.key === 'Escape') {
    ui.hidePanel();
    if (state.mode !== 'galaxy') exitToGalaxy();
  }
  if (e.key === 'l' || e.key === 'L') ui.setLabelsVisible(!ui.showLabels);
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
    galaxy.update(dt, state.daysPerSecond);
  } else if (state.mode === 'solar') {
    solar.update(dt, state.daysPerSecond);
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
