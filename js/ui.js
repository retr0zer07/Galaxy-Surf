import * as THREE from 'three';

const $ = id => document.getElementById(id);

export class UI {
  constructor() {
    this.el = {
      labels: $('labels'), panel: $('panel'), panelTag: $('panel-tag'),
      panelTitle: $('panel-title'), panelSub: $('panel-sub'), panelBody: $('panel-body'),
      panelAction: $('panel-action'), panelClose: $('panel-close'),
      back: $('btn-back'), fade: $('fade'),
      navigator: $('navigator'), navToggle: $('nav-toggle'), navCurrent: $('nav-current'),
      navInput: $('nav-input'), navList: $('nav-list'), navChips: $('nav-chips'),
      navCount: $('nav-count'),
      loader: $('loader'), hint: $('hint'), reticle: $('reticle'),
      context: $('hud-context'), statScale: $('stat-scale'),
      statTarget: $('stat-target'), statDistance: $('stat-distance'),
      orbitsBtn: document.querySelector('[data-action="orbits"]'),
      labelsBtn: document.querySelector('[data-action="labels"]'),
      speed: $('speed'), speedValue: $('speed-value')
    };
    this.labels = [];
    this.showLabels = true;
    this._v = new THREE.Vector3();

    this.el.panelClose.onclick = () => this.hidePanel();
  }

  /* ---------------- Panel ---------------- */
  showPanel(info, onAction) {
    const e = this.el;
    e.panelTag.textContent = info.tag || 'OBJETO';
    e.panelTitle.textContent = info.name;
    e.panelSub.textContent = info.sub || '';

    let html = '';
    if (info.desc) html += `<p class="desc">${info.desc}</p>`;
    if (info.facts?.length) {
      html += '<div class="facts">' + info.facts
        .map(([k, v]) => `<div class="fact"><label>${k}</label><span>${v}</span></div>`)
        .join('') + '</div>';
    }
    if (info.moons?.length) {
      html += '<div class="moons"><h3>Satélites principales</h3>' + info.moons
        .map(m => `<div class="moon-row"><b>${m.name}</b><span>${m.note || (m.radiusKm + ' km')}</span></div>`)
        .join('') + '</div>';
    }
    e.panelBody.innerHTML = html;

    if (onAction) {
      e.panelAction.classList.remove('hidden');
      e.panelAction.textContent = info.actionLabel || 'Explorar';
      e.panelAction.onclick = onAction;
    } else {
      e.panelAction.classList.add('hidden');
      e.panelAction.onclick = null;
    }
    e.panel.classList.remove('hidden');
  }

  hidePanel() { this.el.panel.classList.add('hidden'); }

  /* ---------------- Navegador de destinos ---------------- */
  buildNavigator(categories, items, onSelect, onFilter) {
    this.navItems = items;
    this.filter = 'all';
    this.query = '';
    this.activeIndex = 0;
    this.onNavSelect = onSelect;
    this.onNavFilter = onFilter;

    const e = this.el;
    e.navChips.innerHTML = '';
    for (const cat of categories) {
      const chip = document.createElement('button');
      chip.className = 'nav-chip' + (cat.id === 'all' ? ' on' : '');
      chip.textContent = cat.name;
      chip.style.setProperty('--chip', cat.color);
      chip.onclick = () => {
        this.filter = cat.id;
        e.navChips.querySelectorAll('.nav-chip').forEach(c => c.classList.toggle('on', c === chip));
        this.renderNav();
        onFilter?.(cat.id);
      };
      e.navChips.appendChild(chip);
    }

    e.navInput.addEventListener('input', () => {
      this.query = e.navInput.value.trim().toLowerCase();
      this.activeIndex = 0;
      this.renderNav();
    });

    e.navInput.addEventListener('keydown', ev => {
      if (ev.key === 'ArrowDown' || ev.key === 'ArrowUp') {
        ev.preventDefault();
        this.moveNav(ev.key === 'ArrowDown' ? 1 : -1);
      } else if (ev.key === 'Enter') {
        ev.preventDefault();
        const it = this.visibleNav?.[this.activeIndex];
        if (it) { this.onNavSelect(it); this.toggleNav(false); }
      } else if (ev.key === 'Escape') {
        ev.preventDefault();
        this.toggleNav(false);
      }
    });

    e.navToggle.onclick = () => this.toggleNav();
    this.renderNav();
  }

  /** Normaliza para buscar sin acentos */
  static norm(s) {
    return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }

  renderNav() {
    const q = UI.norm(this.query);
    this.visibleNav = this.navItems.filter(it => {
      if (this.filter !== 'all' && it.category !== this.filter) return false;
      if (!q) return true;
      return UI.norm(it.name).includes(q) || UI.norm(it.tag).includes(q);
    });

    const list = this.el.navList;
    list.innerHTML = '';
    this.el.navCount.textContent = `${this.visibleNav.length}/${this.navItems.length}`;

    if (!this.visibleNav.length) {
      list.innerHTML = '<div class="nav-empty">Sin resultados</div>';
      return;
    }

    let lastGroup = null;
    this.visibleNav.forEach((it, i) => {
      if (it.groupName !== lastGroup && !q) {
        const h = document.createElement('div');
        h.className = 'nav-group';
        h.textContent = it.groupName;
        list.appendChild(h);
        lastGroup = it.groupName;
      }
      const b = document.createElement('button');
      b.className = 'nav-item' + (i === this.activeIndex ? ' active' : '') + (it.id === this.currentId ? ' current' : '');
      b.style.setProperty('--tone', it.color);
      b.innerHTML =
        `<i></i><span class="nav-name">${it.name}</span>` +
        (it.unlocked ? '<span class="nav-go">Explorar</span>' : '') +
        `<span class="nav-meta">${it.distance}</span>`;
      b.onclick = () => { this.onNavSelect(it); this.toggleNav(false); };
      b.onmouseenter = () => { this.activeIndex = i; this.markActive(); };
      list.appendChild(b);
    });
  }

  markActive() {
    const nodes = this.el.navList.querySelectorAll('.nav-item');
    nodes.forEach((n, i) => n.classList.toggle('active', i === this.activeIndex));
  }

  moveNav(dir) {
    if (!this.visibleNav?.length) return;
    this.activeIndex = (this.activeIndex + dir + this.visibleNav.length) % this.visibleNav.length;
    this.markActive();
    this.el.navList.querySelectorAll('.nav-item')[this.activeIndex]
      ?.scrollIntoView({ block: 'nearest' });
  }

  toggleNav(force) {
    const open = force ?? this.el.navigator.classList.contains('closed');
    this.el.navigator.classList.toggle('closed', !open);
    if (open) {
      this.el.navInput.focus();
      this.el.navInput.select();
    } else {
      this.el.navInput.blur();
    }
    return open;
  }

  get navOpen() { return !this.el.navigator.classList.contains('closed'); }

  setNavCurrent(id, label) {
    this.currentId = id;
    this.el.navCurrent.textContent = label || 'Destinos';
    this.el.navList.querySelectorAll('.nav-item').forEach((n, i) => {
      n.classList.toggle('current', this.visibleNav?.[i]?.id === id);
    });
  }

  /* ---------------- Etiquetas 3D ---------------- */
  clearLabels() {
    this.el.labels.innerHTML = '';
    this.labels = [];
  }

  addLabel(object3D, text, cls, opts = {}) {
    const div = document.createElement('div');
    div.className = 'label ' + cls;
    div.innerHTML = `<span class="dot">${opts.pulse ? '<span class="ring"></span>' : ''}</span>${text}`;
    if (opts.onClick) div.onclick = e => { e.stopPropagation(); opts.onClick(); };
    this.el.labels.appendChild(div);
    const entry = {
      object3D, div,
      minDist: opts.minDist ?? 0,
      maxDist: opts.maxDist ?? Infinity,
      offset: opts.offset ?? 0,
      priority: opts.priority ?? 0,
      width: opts.width ?? 130
    };
    this.labels.push(entry);
    return entry;
  }

  updateLabels(camera, width, height) {
    if (!this.showLabels) return;
    const v = this._v;
    const placed = [];

    // Se resuelven primero las prioritarias y las más cercanas a la cámara
    const queue = this.labels
      .map(l => {
        l.object3D.getWorldPosition(v);
        const dist = camera.position.distanceTo(v);
        v.project(camera);
        return { l, dist, x: (v.x * 0.5 + 0.5) * width, y: (-v.y * 0.5 + 0.5) * height, front: v.z < 1 };
      })
      .sort((a, b) => (b.l.priority - a.l.priority) || (a.dist - b.dist));

    for (const it of queue) {
      const l = it.l;
      const visible = it.front && it.dist > l.minDist && it.dist < l.maxDist;
      if (!visible) { l.div.style.display = 'none'; continue; }

      // Anti-solapamiento: las de menor prioridad ceden el sitio
      let blocked = false;
      if (l.priority < 2) {
        for (const p of placed) {
          if (Math.abs(p.x - it.x) < (p.w + l.width) * 0.42 && Math.abs(p.y - it.y) < 17) {
            blocked = true;
            break;
          }
        }
      }
      if (blocked) { l.div.style.display = 'none'; continue; }

      placed.push({ x: it.x, y: it.y, w: l.width });
      l.div.style.display = '';
      l.div.style.left = it.x + 'px';
      l.div.style.top = (it.y - l.offset) + 'px';
      l.div.style.opacity = Math.min(1, Math.max(0.25, 1 - it.dist / (l.maxDist * 0.95)));
    }
  }

  setLabelsVisible(v) {
    this.showLabels = v;
    this.el.labels.style.display = v ? '' : 'none';
    this.el.labelsBtn.classList.toggle('active', v);
  }

  /* ---------------- Varios ---------------- */
  setContext(text) { this.el.context.textContent = text; }
  setScale(text) { this.el.statScale.textContent = text; }
  setTarget(text) { this.el.statTarget.textContent = text || '—'; }
  setDistance(text) { this.el.statDistance.textContent = text || '—'; }

  setReticle(x, y, on) {
    this.el.reticle.classList.toggle('on', on);
    if (on) { this.el.reticle.style.left = x + 'px'; this.el.reticle.style.top = y + 'px'; }
  }

  fade(on) { this.el.fade.classList.toggle('on', on); }
  hideLoader() { this.el.loader.classList.add('done'); }
  hideHint() { this.el.hint.classList.add('hide'); }

  setMode(mode) {
    this.el.back.classList.toggle('hidden', mode === 'galaxy');
    this.el.orbitsBtn.classList.toggle('hidden', mode !== 'solar');
  }
}
