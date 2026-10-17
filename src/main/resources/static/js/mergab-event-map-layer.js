/* MERGAB — event pins on visitor map + timed event gathering in simulation.
 * Visual overlay only: no real visitor trajectories are asserted.
 */
document.addEventListener('DOMContentLoaded', () => {
  'use strict';
  const mapHost = document.getElementById('simulationMap') || document.getElementById('map');
  if (!mapHost) return;
  const simulation = mapHost.id === 'simulationMap';
  const ns = 'http://www.w3.org/2000/svg';
  let events = [];
  let frame = null;
  let playing = false;
  let svg = null;
  let root = null;
  let walkers = [];
  let last = 0;
  let renderQueued = false;

  function el(tag, attributes = {}) {
    const node = document.createElementNS(ns, tag);
    for (const [k, v] of Object.entries(attributes)) node.setAttribute(k, v);
    return node;
  }
  const valid = e => e && e.mapX != null && e.mapY != null &&
    Number.isFinite(Number(e.mapX)) && Number.isFinite(Number(e.mapY)) &&
    Number(e.mapX) >= 0 && Number(e.mapX) <= 100 && Number(e.mapY) >= 0 && Number(e.mapY) <= 100;

  function when(value) {
    if (!value) return NaN;
    // Backend LocalDateTime is venue-local; browser dates are venue-local in the Expo UI.
    const date = new Date(String(value).replace(' ', 'T'));
    return date.getTime();
  }
  function minuteState(event) {
    if (!simulation || !frame?.simulation?.startDateTime || frame.minute == null) return 0;
    const base = when(frame.simulation.startDateTime);
    const now = base + Number(frame.minute) * 60000;
    const start = when(event.startDateTime);
    const end = when(event.endDateTime);
    if (![base, now, start, end].every(Number.isFinite)) return 0;
    if (now >= start && now <= end) return 1;
    if (now < start && start - now <= 10 * 60000) return .3;
    if (now > end && now - end <= 5 * 60000) return .17;
    return 0;
  }
  function occupancy(e) {
    const row = frame?.rows?.find(r => String(r.zone?.id) === String(e.zone?.id));
    return Math.max(0, Number(row?.occupancy) || 0);
  }
  function tooltip(event) {
    let popup = mapHost.querySelector('.mergab-event-popup');
    if (!popup) {
      popup = document.createElement('div');
      popup.className = 'mergab-event-popup';
      popup.innerHTML = '<strong></strong><small></small><button type="button" aria-label="إغلاق">×</button>';
      popup.querySelector('button').addEventListener('click', () => popup.hidden = true);
      mapHost.appendChild(popup);
    }
    popup.querySelector('strong').textContent = event.name || 'فعالية';
    popup.querySelector('small').textContent = `${event.zone?.name || ''} · ${String(event.startDateTime || '').replace('T', ' ').slice(0,16)}`;
    popup.hidden = false;
    return popup;
  }
  function spawn(group, x, y, count, state, event) {
    const size = Math.min(18, count);
    for (let i = 0; i < size; i++) {
      const angle = i * 2.39996;
      const radius = Math.sqrt((i + .5) / size) * 3.6;
      const px = x + Math.cos(angle) * radius;
      const py = y + Math.sin(angle) * radius;
      const person = el('g', {class:'mergab-event-person', transform:`translate(${px} ${py})`});
      person.appendChild(el('circle', {cy:'-.34', r:'.21'}));
      person.appendChild(el('path', {d:'M0,-.1 L0,.66 M-.3,.16 L.3,.16 M0,.66 L-.24,1 M0,.66 L.24,1'}));
      group.appendChild(person);
      walkers.push({person, px, py, x, y, angle, radius, speed:.00035 + i%5*.0001, phase:i*.71, event});
    }
  }
  function render() {
    renderQueued = false;
    const currentSvg = mapHost.querySelector('.mqm-isvg');
    if (!currentSvg) return;
    // Do not rebuild per animation frame; preserve the map's own transforms.
    if (svg !== currentSvg) { svg = currentSvg; root = null; }
    if (!root || !root.isConnected) {
      root = el('g', {id:'mergabEventMapLayer'});
      svg.appendChild(root);
    }
    root.replaceChildren();
    walkers = [];
    for (const event of events.filter(valid)) {
      const x = Number(event.mapX), y = Number(event.mapY);
      const strength = simulation ? minuteState(event) : 1;
      if (simulation && !strength) continue;
      const layer = el('g', {class:'mergab-event-marker', transform:`translate(${x} ${y})`});
      const halo = el('circle', {r: simulation ? '5' : '3.2', class:'mergab-event-halo'});
      layer.appendChild(halo);
      layer.appendChild(el('circle', {r:'1.2', class:'mergab-event-core'}));
      const symbol = el('text', {x:'0', y:'.55', 'text-anchor':'middle', class:'mergab-event-star'});
      symbol.textContent = '★';
      layer.appendChild(symbol);
      const label = el('text', {x:'0', y:'-4.2', 'text-anchor':'middle', class:'mergab-event-label'});
      label.textContent = (event.name || 'فعالية').slice(0, 28);
      layer.appendChild(label);
      if (!simulation) {
        layer.classList.add('mergab-event-clickable');
        layer.setAttribute('role', 'button');
        layer.setAttribute('tabindex', '0');
        layer.addEventListener('click', e => {e.stopPropagation(); tooltip(event);});
        layer.addEventListener('keydown', e => {if(e.key === 'Enter' || e.key === ' ') {e.preventDefault(); tooltip(event);}});
      }
      root.appendChild(layer);
      if (simulation) {
        const count = Math.min(18, Math.round(Math.sqrt(Math.max(0,Math.min(occupancy(event), Number(event.expectedDemand)||occupancy(event)))) * .48 * strength));
        spawn(root, x, y, count, strength, event);
      }
    }
  }
  function queueRender() {
    if (renderQueued) return;
    renderQueued = true;
    requestAnimationFrame(render);
  }
  async function load() {
    try {
      const response = await fetch('/api/v1/expo-event/get', {headers:{Accept:'application/json'}, cache:'no-store'});
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const result = await response.json();
      events = Array.isArray(result) ? result : (Array.isArray(result?.data) ? result.data : []);
      queueRender();
    } catch (error) {
      console.warn('Mergab event map layer could not load events', error);
    }
  }
  if (simulation) {
    document.addEventListener('mergab:simulation-frame', e => {frame = e.detail; queueRender();});
    document.addEventListener('mergab:simulation-playback', e => {playing = Boolean(e.detail?.playing);});
  }
  let pollFrame = 0;
  function tick(time) {
    const delta = Math.min(50, time - (last || time)); last = time;
    const newSvg = mapHost.querySelector('.mqm-isvg');
    if (newSvg && (!root?.isConnected || svg !== newSvg)) queueRender();
    if (simulation && playing && root?.isConnected) {
      pollFrame += delta;
      if (pollFrame > 30) {
        pollFrame = 0;
        for (const w of walkers) {
          w.phase += w.speed * delta;
          const offset = Math.sin(w.phase) * .2;
          w.person.setAttribute('transform', `translate(${w.px + Math.cos(w.angle)*offset} ${w.py + Math.sin(w.angle)*offset})`);
        }
      }
    }
    requestAnimationFrame(tick);
  }
  load();
  if (!simulation) setInterval(load, 60000);
  requestAnimationFrame(tick);
});
