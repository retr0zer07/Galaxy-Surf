import * as THREE from 'three';

const $ = id => document.getElementById(id);

export class UI {
  constructor() {
    this.el = {
      labels: $('labels'), panel: $('panel'), panelTag: $('panel-tag'),
      panelTitle: $('panel-title'), panelSub: $('panel-sub'), panelBody: $('panel-body'),
      panelAction: $('panel-action'), panelClose: $('panel-close'),
      dock: $('dock-items'), back: $('btn-back'), fade: $('fade'),
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

  /* ---------------- Dock ---------------- */
  buildDock(items, onSelect) {
    this.el.dock.innerHTML = '';
    this.dockItems = new Map();
    for (const it of items) {
      const b = document.createElement('button');
      b.className = 'dock-item' + (it.locked ? ' locked' : it.unlocked ? ' unlocked' : '');
      b.innerHTML = `<i></i>${it.name}`;
      if (!it.locked) b.onclick = () => onSelect(it);
      this.el.dock.appendChild(b);
      this.dockItems.set(it.id, b);
    }
  }

  setDockCurrent(id) {
    if (!this.dockItems) return;
    for (const [key, el] of this.dockItems) el.classList.toggle('current', key === id);
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
    const entry = { object3D, div, minDist: opts.minDist ?? 0, maxDist: opts.maxDist ?? Infinity, offset: opts.offset ?? 0 };
    this.labels.push(entry);
    return entry;
  }

  updateLabels(camera, width, height) {
    if (!this.showLabels) return;
    const v = this._v;
    for (const l of this.labels) {
      l.object3D.getWorldPosition(v);
      const dist = camera.position.distanceTo(v);
      v.project(camera);
      const visible = v.z < 1 && dist > l.minDist && dist < l.maxDist;
      if (!visible) { l.div.style.display = 'none'; continue; }
      l.div.style.display = '';
      l.div.style.left = ((v.x * 0.5 + 0.5) * width) + 'px';
      l.div.style.top = ((-v.y * 0.5 + 0.5) * height - l.offset) + 'px';
      l.div.style.opacity = Math.min(1, Math.max(0.25, 1 - dist / (l.maxDist * 0.95)));
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
