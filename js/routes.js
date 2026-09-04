const ROUTES = [
  {
    id: 'neighborhood',
    title: 'Vecindario cósmico',
    sub: 'De nuestro hogar al sistema estelar más cercano',
    stops: ['solar', 'alphacen', 'orion'],
    note: 'Una ruta desde la escala planetaria hasta un vivero estelar cercano.'
  },
  {
    id: 'stellar-life',
    title: 'Nacimiento y muerte estelar',
    sub: 'Gas, cúmulos y explosiones',
    stops: ['solar', 'orion', 'pleiades', 'crab', 'betelgeuse'],
    note: 'El ciclo de las estrellas: nacer en una nube, brillar en grupo y terminar como supernova.'
  },
  {
    id: 'road-to-core',
    title: 'Camino al corazón',
    sub: 'Un viaje hacia Sagitario A*',
    stops: ['solar', 'eagle', 'cygx1', 'sgra'],
    note: 'Desde el Brazo de Orión hasta el agujero negro supermasivo central.'
  }
];

function distance(a, b) {
  const ar = a.l * Math.PI / 180, ab = a.b * Math.PI / 180;
  const br = b.l * Math.PI / 180, bb = b.b * Math.PI / 180;
  const ax = a.ly * Math.cos(ab) * Math.cos(ar);
  const ay = a.ly * Math.sin(ab);
  const az = a.ly * Math.cos(ab) * Math.sin(ar);
  const bx = b.ly * Math.cos(bb) * Math.cos(br);
  const by = b.ly * Math.sin(bb);
  const bz = b.ly * Math.cos(bb) * Math.sin(br);
  return Math.hypot(ax - bx, ay - by, az - bz);
}

function formatRouteDistance(ly) {
  if (ly < 1000) return `${ly.toLocaleString('es-ES', { maximumFractionDigits: 1 })} ly`;
  if (ly < 1e6) return `${(ly / 1000).toLocaleString('es-ES', { maximumFractionDigits: 1 })} kly`;
  return `${(ly / 1e6).toLocaleString('es-ES', { maximumFractionDigits: 2 })} Mly`;
}

export class Routes {
  constructor(pois, onNavigate) {
    this.pois = new Map(pois.map(poi => [poi.id, poi]));
    this.onNavigate = onNavigate;
    this.active = null;
    this.index = 0;
    this.button = document.getElementById('btn-routes');
    this.panel = document.getElementById('routes');
    this.list = document.getElementById('routes-list');
    this.detail = document.getElementById('route-detail');
    this.stage = document.getElementById('route-stage');
    this.stageBody = document.getElementById('route-stage-body');
    this.continueButton = document.getElementById('route-continue');
    this.button.onclick = () => this.toggle();
    document.getElementById('routes-close').onclick = () => this.toggle(false);
    document.getElementById('route-stage-observe').onclick = () => this.observe();
    document.getElementById('route-stage-close').onclick = () => this.observe();
    this.continueButton.onclick = () => this.next();
    this.renderList();
  }

  toggle(force) {
    const open = force ?? this.panel.classList.contains('hidden');
    this.panel.classList.toggle('hidden', !open);
  }

  renderList() {
    this.list.innerHTML = '';
    for (const route of ROUTES) {
      const button = document.createElement('button');
      button.className = 'route-card';
      button.innerHTML = `<span>${route.stops.length} etapas</span><b>${route.title}</b><small>${route.sub}</small>`;
      button.onclick = () => this.open(route);
      this.list.appendChild(button);
    }
  }

  open(route) {
    this.active = route;
    this.index = 0;
    this.toggle(false);
    this.showStage();
  }

  showStage() {
    const route = this.active;
    if (!route) return;
    const stops = route.stops.map(id => this.pois.get(id));
    const poi = stops[this.index];
    const leg = this.index ? distance(stops[this.index - 1], poi) : 0;
    const fromSun = poi.ly;

    this.stageBody.innerHTML = `<span>RUTA · ${route.title.toUpperCase()}</span>
      <div class="route-stage-count">ETAPA ${this.index + 1} / ${stops.length}</div>
      <h2>${poi.name}</h2>
      <p>${poi.desc}</p>
      <div class="route-stage-data">
        <div><label>Desde el Sol</label><b>${formatRouteDistance(fromSun)}</b></div>
        <div><label>${this.index ? `Desde ${stops[this.index - 1].name}` : 'Inicio de ruta'}</label><b>${this.index ? formatRouteDistance(leg) : '0 ly'}</b></div>
      </div>`;
    document.getElementById('route-stage-observe').textContent = `Ver ${poi.name}`;
    this.stage.classList.remove('hidden');
    this.continueButton.classList.add('hidden');
  }

  observe() {
    if (!this.active) return;
    const poi = this.pois.get(this.active.stops[this.index]);
    this.stage.classList.add('hidden');
    this.onNavigate(poi);
    this.continueButton.textContent = this.index === this.active.stops.length - 1
      ? 'Finalizar ruta'
      : `Continuar · etapa ${this.index + 2}/${this.active.stops.length}`;
    this.continueButton.classList.remove('hidden');
  }

  next() {
    if (!this.active) return;
    if (this.index === this.active.stops.length - 1) {
      this.active = null;
      this.continueButton.classList.add('hidden');
      return;
    }
    this.index += 1;
    this.showStage();
  }

  go(index) {
    this.index = index;
    const poi = this.pois.get(this.active.stops[index]);
    this.onNavigate(poi);
  }
}
