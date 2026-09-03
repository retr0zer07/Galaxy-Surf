const STORAGE_KEY = 'galaxy-surf-discoveries-v1';

export class Discoveries {
  constructor(pois, categories) {
    this.pois = pois;
    this.categories = categories.filter(category => category.id !== 'all');
    this.byId = new Map(pois.map(poi => [poi.id, poi]));
    this.data = this.#load();

    this.button = document.getElementById('btn-discoveries');
    this.panel = document.getElementById('discoveries');
    this.summary = document.getElementById('discovery-summary');
    this.progress = document.getElementById('discovery-progress');
    this.recent = document.getElementById('discovery-recent');
    this.badge = document.getElementById('discovery-badge');

    this.button.onclick = () => this.toggle();
    document.getElementById('discoveries-close').onclick = () => this.toggle(false);
    document.getElementById('discoveries-reset').onclick = () => this.reset();
    this.render();
  }

  #load() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      return saved && typeof saved === 'object' ? saved : {};
    } catch {
      return {};
    }
  }

  #save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
  }

  record(id, level = 'observed') {
    const poi = this.byId.get(id);
    if (!poi) return;
    const previous = this.data[id] || {};
    const rank = { observed: 1, explored: 2 };
    const upgraded = (rank[level] || 1) > (rank[previous.level] || 0);

    this.data[id] = {
      id,
      level: upgraded ? level : previous.level || level,
      firstSeen: previous.firstSeen || Date.now(),
      lastSeen: Date.now()
    };
    this.#save();
    this.render();
  }

  count() {
    return Object.keys(this.data).length;
  }

  toggle(force) {
    const open = force ?? this.panel.classList.contains('hidden');
    this.panel.classList.toggle('hidden', !open);
    if (open) this.render();
  }

  reset() {
    this.data = {};
    this.#save();
    this.render();
  }

  render() {
    const observed = this.count();
    const explored = Object.values(this.data).filter(entry => entry.level === 'explored').length;
    this.badge.textContent = observed;
    this.badge.classList.toggle('hidden', observed === 0);
    this.summary.textContent = `${observed} de ${this.pois.length} destinos registrados · ${explored} explorados`;

    this.progress.innerHTML = '';
    for (const category of this.categories) {
      const items = this.pois.filter(poi => poi.category === category.id);
      const found = items.filter(poi => this.data[poi.id]).length;
      if (!items.length) continue;

      const row = document.createElement('div');
      row.className = 'discovery-row';
      row.innerHTML = `<div><span style="--category:${category.color}">${category.name}</span><b>${found}/${items.length}</b></div>`;
      const track = document.createElement('i');
      const fill = document.createElement('em');
      fill.style.width = `${(found / items.length) * 100}%`;
      fill.style.background = category.color;
      track.appendChild(fill);
      row.appendChild(track);
      this.progress.appendChild(row);
    }

    this.recent.innerHTML = '';
    const recent = Object.values(this.data)
      .sort((a, b) => b.lastSeen - a.lastSeen)
      .slice(0, 7);

    if (!recent.length) {
      this.recent.innerHTML = '<p class="discovery-empty">Aún no hay observaciones registradas.</p>';
      return;
    }

    for (const entry of recent) {
      const poi = this.byId.get(entry.id);
      if (!poi) continue;
      const item = document.createElement('div');
      item.className = 'discovery-item';
      item.innerHTML = `<i style="--tone:${poi.color}"></i><span>${poi.name}</span><b>${entry.level === 'explored' ? 'EXPLORADO' : 'OBSERVADO'}</b>`;
      this.recent.appendChild(item);
    }
  }
}
