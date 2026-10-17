/* =========================================================
   Mirqab Map — mirqab-map.js
   خريطة تفاعلية بـ HTML/CSS/JS فقط (بدون أي مكتبة، تشتغل بدون نت)
   وضعين:
     mode: '3d'     → مجسّم 3D يلف ويتحرك
     mode: 'image'  → صورة خريطة (أي صورة) وفوقها علامات المناطق

   الاستخدام:
     const map = MirqabMap.create('#mirqab-map', { apiUrl: '...', lang: 'ar' });

   التفاصيل كاملة في README.md
   ========================================================= */
(function (global) {
  'use strict';

  /* ---------- مستويات الازدحام ---------- */
  var LEVELS = [
    { key: 'critical', min: 0.9,  top: '#C0392B', side: '#8E2A20', ink: '#FFFFFF', text: { ar: 'مكتظ',  en: 'Critical' } },
    { key: 'high',     min: 0.75, top: '#E8964A', side: '#B5692B', ink: '#14211C', text: { ar: 'مزدحم', en: 'Busy' } },
    { key: 'medium',   min: 0.5,  top: '#F2D27A', side: '#BF9C45', ink: '#14211C', text: { ar: 'متوسط', en: 'Moderate' } },
    { key: 'low',      min: 0,    top: '#7FC49B', side: '#4F8F69', ink: '#14211C', text: { ar: 'هادئ',  en: 'Quiet' } }
  ];

  var TEXT = {
    ar: { you: 'أنت هنا', heat: 'عرض الازدحام', rotL: 'تدوير لليسار', rotR: 'تدوير لليمين', zoomIn: 'تكبير', zoomOut: 'تصغير', reset: 'إعادة ضبط العرض', north: 'ش', noImage: 'ما لقيت صورة الخريطة: ' },
    en: { you: 'You are here', heat: 'Crowd view', rotL: 'Rotate left', rotR: 'Rotate right', zoomIn: 'Zoom in', zoomOut: 'Zoom out', reset: 'Reset view', north: 'N', noImage: 'Map image not found: ' }
  };

  var WALK_M_PER_MIN = 70;     // سرعة المشي (متر/دقيقة)

  /* =========================================================
     تخطيط وضع 3D (الأرض 400×400 وحدة)
     - zones: المناطق. الربط مع الداتابيس يكون بالاسم (name.en أو name.ar أو aliases)
       type 'box' = مبنى (x,y = الزاوية العلوية، w عرض، d عمق، h ارتفاع)
       type 'dome' = ساحة بقبة (cx,cy مركز، r نصف قطر، h ارتفاع)
       door = نقطة الممر اللي يدخل منها المسار
     - nodes: نقاط الممرات
     - edges: الممرات. العنصر الثالث (اختياري) = المنطقة اللي يمر فيها الممر،
       فإذا كانت مزدحمة المسار الذكي يتجنبه
     ========================================================= */
  var DEFAULT_LAYOUT = {
    size: 400,
    metersPerUnit: 1.5,
    zones: [
      { key: 'northGate',      name: { ar: 'البوابة الشمالية', en: 'North Gate' },      type: 'box',  x: 165, y: 22,  w: 70, d: 36,  h: 14, color: '#E6EEE9', door: 'NG' },
      { key: 'mainPlaza',      name: { ar: 'الساحة الرئيسية',  en: 'Main Plaza' },      type: 'dome', cx: 200, cy: 200, r: 46, h: 44, color: '#E7C98A', door: 'C' },
      { key: 'innovationHub',  name: { ar: 'منطقة الابتكار',   en: 'Innovation Hub' },  type: 'box',  x: 295, y: 35,  w: 80, d: 105, h: 44, color: '#EDF1F5', door: 'D_IH' },
      { key: 'cultureZone',    name: { ar: 'المنطقة الثقافية', en: 'Culture Zone' },    type: 'box',  x: 25,  y: 270, w: 80, d: 105, h: 30, color: '#F3EBDC', door: 'D_CZ' },
      { key: 'foodCourt',      name: { ar: 'منطقة الطعام',     en: 'Food Court' },      type: 'box',  x: 25,  y: 40,  w: 80, d: 95,  h: 14, color: '#F5E6D6', door: 'D_FC' },
      { key: 'exhibitionHall', name: { ar: 'قاعة المعارض',     en: 'Exhibition Hall' }, type: 'box',  x: 295, y: 168, w: 80, d: 122, h: 34, color: '#F2ECE0', door: 'D_EH' },
      { key: 'familyZone',     name: { ar: 'المنطقة العائلية', en: 'Family Zone' },     type: 'box',  x: 25,  y: 160, w: 80, d: 85,  h: 20, color: '#E9F0E1', door: 'D_FZ' },
      { key: 'southGate',      name: { ar: 'البوابة الجنوبية', en: 'South Gate' },      type: 'box',  x: 165, y: 347, w: 70, d: 33,  h: 14, color: '#E6EEE9', door: 'SG' }
    ],
    nodes: {
      C: [200, 200],
      NW: [120, 120], N: [200, 120], NE: [280, 120], E: [280, 200],
      SE: [280, 280], S: [200, 280], SW: [120, 280], W: [120, 200],
      NG: [200, 58], SG: [200, 347],
      D_IH: [295, 120], D_EH: [295, 200], D_FC: [105, 120], D_FZ: [105, 200], D_CZ: [105, 280]
    },
    edges: [
      ['NW', 'N'], ['N', 'NE'], ['NE', 'E'], ['E', 'SE'], ['SE', 'S'], ['S', 'SW'], ['SW', 'W'], ['W', 'NW'],
      ['N', 'C', 'mainPlaza'], ['S', 'C', 'mainPlaza'], ['E', 'C', 'mainPlaza'], ['W', 'C', 'mainPlaza'],
      ['N', 'NG', 'northGate'], ['S', 'SG', 'southGate'],
      ['NE', 'D_IH', 'innovationHub'], ['E', 'D_EH', 'exhibitionHall'],
      ['NW', 'D_FC', 'foodCourt'], ['W', 'D_FZ', 'familyZone'], ['SW', 'D_CZ', 'cultureZone']
    ],
    areas: [
      { x: 127, y: 127, w: 146, d: 146, color: '#EFE6D3', radius: 6 },
      { x: 295, y: 305, w: 80,  d: 70,  color: '#C9DFB6', radius: 12 }
    ],
    trees: [
      [308, 318], [330, 318], [352, 318], [319, 340], [342, 340], [364, 340], [308, 362], [330, 362], [352, 362],
      [142, 142], [258, 142], [142, 258], [258, 258], [150, 90], [250, 90], [150, 320], [250, 320]
    ]
  };

  /* =========================================================
     تخطيط وضع الصورة
     - src: رابط الصورة
     - zones: لكل منطقة x و y = مكانها على الصورة بالنسبة المئوية (0 → 100)
       (شغّلي debug: true واضغطي على الصورة، يطبع لك الإحداثيات في الـ Console)
     - edges (اختياري): أي منطقة توصل لأي منطقة. لو ما حددتيها، كل منطقة
       تتوصل بأقرب منطقتين لها وبالـ hub
     - hub: المنطقة الوسطية اللي كل الطرق تمر فيها
     ========================================================= */
  var DEFAULT_IMAGE_LAYOUT = {
    src: 'sample-map.jpg',
    hub: 'mainPlaza',
    metersPerUnit: 8,
    zones: [
      { key: 'northGate',      name: { ar: 'البوابة الشمالية', en: 'North Gate' },      x: 41.6, y: 24.7 },
      { key: 'mainPlaza',      name: { ar: 'الساحة الرئيسية',  en: 'Main Plaza' },      x: 50.0, y: 40.5 },
      { key: 'innovationHub',  name: { ar: 'منطقة الابتكار',   en: 'Innovation Hub' },  x: 63.8, y: 18.6 },
      { key: 'cultureZone',    name: { ar: 'المنطقة الثقافية', en: 'Culture Zone' },    x: 34.8, y: 72.2 },
      { key: 'foodCourt',      name: { ar: 'منطقة الطعام',     en: 'Food Court' },      x: 23.6, y: 38.1 },
      { key: 'exhibitionHall', name: { ar: 'قاعة المعارض',     en: 'Exhibition Hall' }, x: 72.8, y: 40.2 },
      { key: 'familyZone',     name: { ar: 'المنطقة العائلية', en: 'Family Zone' },     x: 28.7, y: 54.0 },
      { key: 'southGate',      name: { ar: 'البوابة الجنوبية', en: 'South Gate' },      x: 60.1, y: 73.9 }
    ],
    edges: null
  };

  // بيانات تجريبية تُستخدم لو ما فيه apiUrl أو الـ API ما رد
  var DEMO_COUNTS = {
    northGate: [4000, 2600], mainPlaza: [10000, 9100], innovationHub: [8000, 6560], cultureZone: [6000, 2820],
    foodCourt: [7000, 2100], exhibitionHall: [12000, 7800], familyZone: [5000, 1250], southGate: [4000, 1400]
  };

  /* ---------- أدوات صغيرة ---------- */
  var SVGNS = 'http://www.w3.org/2000/svg';
  function px(n) { return n + 'px'; }
  function css(el, s) { if (s) { for (var k in s) { el.style[k] = s[k]; } } return el; }
  function div(cls, s, parent) {
    var d = document.createElement('div');
    if (cls) d.className = cls;
    css(d, s);
    if (parent) parent.appendChild(d);
    return d;
  }
  function rgb(hex) { var n = parseInt(hex.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  function shade(hex, f) { var c = rgb(hex); return 'rgb(' + c.map(function (v) { return Math.min(255, Math.round(v * f)); }).join(',') + ')'; }
  function alpha(hex, a) { return 'rgba(' + rgb(hex).join(',') + ',' + a + ')'; }
  function levelOf(r) { for (var i = 0; i < LEVELS.length; i++) { if (r >= LEVELS[i].min) return LEVELS[i]; } return LEVELS[LEVELS.length - 1]; }
  function getPath(obj, path) { return String(path).split('.').reduce(function (o, k) { return o == null ? undefined : o[k]; }, obj); }
  function pick(obj, f) {
    if (Array.isArray(f)) { for (var i = 0; i < f.length; i++) { var v = getPath(obj, f[i]); if (v != null) return v; } return undefined; }
    return getPath(obj, f);
  }
  function setPath(obj, path, val) {
    var parts = String(Array.isArray(path) ? path[0] : path).split('.'), cur = obj;
    for (var i = 0; i < parts.length - 1; i++) { cur = cur[parts[i]] = cur[parts[i]] || {}; }
    cur[parts[parts.length - 1]] = val;
  }
  function norm(s) { return String(s == null ? '' : s).trim().toLowerCase().replace(/\s+/g, ' '); }
  function dist(a, b) { var dx = b[0] - a[0], dy = b[1] - a[1]; return Math.sqrt(dx * dx + dy * dy); }

  // شريط مسطح بين نقطتين (ممر أو مسار) — وضع 3D
  function seg(parent, a, b, w, cls, z) {
    var len = dist(a, b), ang = Math.atan2(b[1] - a[1], b[0] - a[0]) * 180 / Math.PI;
    return div('mqm-p ' + cls, {
      left: px(a[0] - w / 2), top: px(a[1] - w / 2), width: px(len + w), height: px(w),
      borderRadius: px(w / 2), transformOrigin: px(w / 2) + ' 50%',
      transform: 'translateZ(' + z + 'px) rotate(' + ang + 'deg)'
    }, parent);
  }

  // Dijkstra عام: adj = { node: [{ to, e }] }، costFn(link, fromNode) = تكلفة الانتقال
  function dijkstra(adj, names, s, t, costFn) {
    var best = {}, prev = {}, done = {};
    best[s] = 0;
    while (true) {
      var u = null, min = Infinity;
      names.forEach(function (n) { if (!done[n] && best[n] != null && best[n] < min) { min = best[n]; u = n; } });
      if (u === null || u === t) break;
      done[u] = true;
      (adj[u] || []).forEach(function (a) {
        var nd = best[u] + costFn(a, u);
        if (best[a.to] == null || nd < best[a.to]) { best[a.to] = nd; prev[a.to] = { n: u, link: a }; }
      });
    }
    if (best[t] == null) return null;
    var nodes = [t], links = [], cur = t;
    while (cur !== s) { var p = prev[cur]; links.unshift({ link: p.link, from: p.n }); cur = p.n; nodes.unshift(cur); }
    return { nodes: nodes, links: links };
  }

  var ICONS = {
    rotL: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 12a8 8 0 1 0 2.4-5.7"/><path d="M4 4v4h4"/></svg>',
    rotR: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M20 12a8 8 0 1 1-2.4-5.7"/><path d="M20 4v4h-4"/></svg>',
    zoomIn: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
    zoomOut: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M5 12h14"/></svg>',
    target: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/></svg>',
    flag: '<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M5 21V4h9l.6 2H20v10h-6.4l-.6-2H7v7z"/></svg>',
    cube: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round" aria-hidden="true"><path d="M12 2.8 20 7v10l-8 4.2L4 17V7z"/><path d="M4 7l8 4.2L20 7M12 11.2v10"/></svg>',
    heat: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2.5"/><path d="M3 20c.6-3 3-5 6-5s5.4 2 6 5M14.5 15.5c2.6-.6 5.4.8 6.5 4.5"/></svg>'
  };

  /* =========================================================
     مسار متحرك (وضع الصورة) — يُستخدم لمسارات الخريطة كلها
     points: نقاط بالنسبة المئوية [[x,y], ...]
     ========================================================= */
  function svgNode(tag, attrs, parent) {
    var n = document.createElementNS(SVGNS, tag);
    for (var k in (attrs || {})) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }
  function svgRatio(svgEl) {
    var w = svgEl && svgEl.clientWidth, h = svgEl && svgEl.clientHeight;
    return w && h ? w / h : 1.5;
  }
  var routeSeq = 0;
  // يحذف أعلام الوجهة إذا انحذف المسار نفسه
  function watchOrphans(svgEl) {
    if (svgEl._mqmWatch || typeof MutationObserver === 'undefined') return;
    svgEl._mqmWatch = new MutationObserver(function () {
      var stageEl = svgEl.parentNode;
      if (!stageEl) return;
      stageEl.querySelectorAll('.mqm-dest-flag').forEach(function (f) {
        if (!svgEl.querySelector('[data-rt="' + f.getAttribute('data-for') + '"]')) f.remove();
      });
    });
    svgEl._mqmWatch.observe(svgEl, { childList: true, subtree: true });
  }

  /* ---------- دبابيس المرافق (مشتركة لكل الصفحات) ---------- */
  function ficon(path) {
    return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + path + '</svg>';
  }
  var FACILITY_LOOK = {
    PRAYER_ROOM: { color: '#0F614B', label: { ar: 'مصلى', en: 'Prayer room' }, icon: ficon('<path d="M12 3c-2 2.2-5 3.3-5 6.5h10C17 6.3 14 5.2 12 3z"/><path d="M5 9.5h14V21H5z"/><path d="M10 21v-4a2 2 0 0 1 4 0v4"/>') },
    RESTROOM: { color: '#247DB6', label: { ar: 'دورات مياه', en: 'Restroom' }, icon: '<i>WC</i>' },
    ENTRANCE: { color: '#B6863C', label: { ar: 'مدخل', en: 'Entrance' }, icon: ficon('<path d="M10 17l5-5-5-5"/><path d="M15 12H3"/><path d="M14 3h5a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-5"/>') },
    EXIT: { color: '#C0392B', label: { ar: 'مخرج', en: 'Exit' }, icon: ficon('<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/>') },
    DEFAULT: { color: '#0F614B', label: { ar: 'مرفق', en: 'Facility' }, icon: ficon('<circle cx="12" cy="12" r="3"/>') }
  };
  function facilityPins(stageEl, facilities) {
    if (!stageEl) return;
    stageEl.querySelectorAll('.mg-fpin').forEach(function (p) { p.remove(); });
    (facilities || []).forEach(function (f) {
      var x = Number(f.mapX), y = Number(f.mapY);
      if (f.mapX == null || f.mapY == null || !isFinite(x) || !isFinite(y)) return;
      var look = FACILITY_LOOK[f.type] || FACILITY_LOOK.DEFAULT;
      var pin = document.createElement('span');
      pin.className = 'mg-fpin';
      pin.style.left = x + '%';
      pin.style.top = y + '%';
      pin.style.setProperty('--fc', look.color);
      pin.title = f.name || look.label.ar;
      pin.innerHTML = '<b></b>' + look.icon;
      stageEl.appendChild(pin);
    });
  }

  function buildRoute(svgEl, points, opts) {
    opts = opts || {};
    if (!svgEl || !points || points.length < 2) return null;
    var ratio = opts.ratio || svgRatio(svgEl);
    var d = points.map(function (p, i) { return (i ? 'L' : 'M') + (+p[0]).toFixed(3) + ' ' + (+p[1]).toFixed(3); }).join(' ');
    var g = svgNode('g', { 'class': 'mqm-rt' + (opts.cls ? ' ' + opts.cls : ''), 'pointer-events': 'none' }, svgEl);
    var uid = 'mqmrt' + (++routeSeq);
    g.setAttribute('data-rt', uid);
    if (opts.id) g.setAttribute('id', opts.id);
    if (opts.color) g.style.setProperty('--rt', opts.color);
    var a0 = points[0], b0 = points[points.length - 1];
    // تدرج لوني من البداية للوجهة (أزرق ← أخضر ← ذهبي)
    var grad = svgNode('linearGradient', {
      id: uid + 'g', gradientUnits: 'userSpaceOnUse',
      x1: a0[0], y1: a0[1], x2: b0[0], y2: b0[1]
    }, svgNode('defs', {}, g));
    (opts.colors || ['#1A73E8', '#0F614B', '#C8892B']).forEach(function (c, i, all) {
      svgNode('stop', { offset: all.length > 1 ? i / (all.length - 1) : 0, 'stop-color': c }, grad);
    });
    ['mqm-rt-glow', 'mqm-rt-casing', 'mqm-rt-main', 'mqm-rt-flow'].forEach(function (cls) {
      var p = svgNode('path', { d: d, 'class': cls, 'vector-effect': 'non-scaling-stroke' }, g);
      if (cls === 'mqm-rt-main' && !opts.color) p.style.stroke = 'url(#' + uid + 'g)';
    });
    // أسهم بيضاء على طول المسار (بزاوية صحيحة رغم تمدد الصورة)
    var chev = svgNode('g', { 'class': 'mqm-rt-chev' }, g);
    var segs = [], total = 0;
    for (var si = 1; si < points.length; si++) {
      var sl = Math.hypot((points[si][0] - points[si - 1][0]) * ratio, points[si][1] - points[si - 1][1]);
      segs.push(sl); total += sl;
    }
    var step = Math.max(3.2, total / 14);
    for (var dd = step * 0.6; dd < total - step * 0.4; dd += step) {
      var acc = 0, k = 0;
      while (k < segs.length - 1 && acc + segs[k] < dd) { acc += segs[k]; k++; }
      var t = segs[k] ? (dd - acc) / segs[k] : 0;
      var pa = points[k], pb = points[k + 1];
      var cx = pa[0] + (pb[0] - pa[0]) * t, cy = pa[1] + (pb[1] - pa[1]) * t;
      var ang = Math.atan2(pb[1] - pa[1], (pb[0] - pa[0]) * ratio) * 180 / Math.PI;
      svgNode('path', {
        d: 'M-0.45 -0.55 L0.35 0 L-0.45 0.55',
        transform: 'translate(' + cx.toFixed(3) + ' ' + cy.toFixed(3) + ') scale(' + (1 / ratio).toFixed(4) + ' 1) rotate(' + ang.toFixed(1) + ')'
      }, chev);
    }
    // علم الوجهة (عنصر HTML داخل المسرح عشان يبقى واضح مع الإمالة)
    var stageEl = svgEl.parentNode;
    if (opts.destLabel && stageEl) {
      var flag = document.createElement('div');
      flag.className = 'mqm-dest-flag';
      flag.setAttribute('data-for', uid);
      flag.style.left = b0[0] + '%';
      flag.style.top = b0[1] + '%';
      flag.innerHTML = '<span class="mqm-dest-in">' + ICONS.flag + '<b></b></span>';
      flag.querySelector('b').textContent = opts.destLabel;
      stageEl.appendChild(flag);
      watchOrphans(svgEl);
    }
    // طول تقريبي بوحدات متساوية لضبط سرعة النقطة المضيئة
    var len = 0;
    for (var i = 1; i < points.length; i++) {
      len += Math.hypot((points[i][0] - points[i - 1][0]) * ratio, points[i][1] - points[i - 1][1]);
    }
    var dur = Math.max(1.6, Math.min(7, len / 22));
    var comet = svgNode('g', { 'class': 'mqm-rt-comet' }, g);
    svgNode('ellipse', { rx: 2.2 / ratio, ry: 2.2, 'class': 'mqm-rt-halo' }, comet);
    svgNode('ellipse', { rx: 0.85 / ratio, ry: 0.85, 'class': 'mqm-rt-head' }, comet);
    svgNode('animateMotion', { dur: dur.toFixed(2) + 's', repeatCount: 'indefinite', path: d }, comet);
    var a = points[0], b = points[points.length - 1];
    var end = svgNode('g', { 'class': 'mqm-rt-end' }, g);
    [0, 1, 2].forEach(function (k) {
      svgNode('ellipse', { cx: b[0], cy: b[1], rx: 1.6 / ratio, ry: 1.6, 'class': 'mqm-rt-ripple mqm-rt-r' + k }, end);
    });
    svgNode('ellipse', { cx: b[0], cy: b[1], rx: 0.9 / ratio, ry: 0.9, 'class': 'mqm-rt-dest' }, end);
    if (opts.startDot !== false) svgNode('ellipse', { cx: a[0], cy: a[1], rx: 0.7 / ratio, ry: 0.7, 'class': 'mqm-rt-start' }, g);
    return g;
  }

  /* =========================================================
     create
     ========================================================= */
  function create(target, options) {
    var root = typeof target === 'string' ? document.querySelector(target) : target;
    if (!root) throw new Error('MirqabMap: container not found: ' + target);

    options = options || {};
    var o = {
      mode: '3d',
      lang: 'ar',
      apiUrl: null,
      fetchOptions: {},
      refreshMs: 30000,
      matchBy: 'name',
      fields: {},
      zoneIds: {},
      start: 'southGate',
      heat: true,
      tilt: 55,
      rotation: -25,
      controls: true,
      demo: true,
      debug: false,
      imageFit: 'contain',
      perspective: false,     // وضع الصورة: إمالة ثلاثية الأبعاد (للعرض فقط)
      imageTilt: 48,
      imageRotation: -8,
      theme: null,            // 'visitor' أو 'organizer'
      onSelect: null,
      onUpdate: null,
      onError: null,
      layout: DEFAULT_LAYOUT,
      imageLayout: DEFAULT_IMAGE_LAYOUT
    };
    for (var k in options) { o[k] = options[k]; }
    o.fields = Object.assign({
      id: 'id',
      name: 'name',
      capacity: 'capacity',
      count: ['currentCount', 'currentVisitors', 'occupancy', 'initialVisitors']
    }, options.fields || {});

    var IMG = o.mode === 'image';
    var T = TEXT[o.lang] || TEXT.ar;
    var L = IMG ? o.imageLayout : o.layout;
    var MPU = L.metersPerUnit || (IMG ? 8 : 1.5);

    var zones = L.zones.map(function (z) {
      var c = Object.assign({}, z);
      if (o.zoneIds[z.key] != null) c.id = o.zoneIds[z.key];
      return c;
    });
    var byKey = {};
    zones.forEach(function (z) { byKey[z.key] = z; });

    var state = {
      rot: o.rotation, zoom: 1, fit: 1, pan: [0, 0], heat: o.heat, selected: null,
      data: {}, loaded: false, justDragged: false, timer: null,
      start: o.start, route: null, routeEls: [], imgRatio: 16 / 9,
      tilt3d: false, irot: o.imageRotation
    };
    var P3D = IMG && !!o.perspective;
    var refs = {};

    root.classList.add('mqm');
    root.classList.toggle('mqm-imode', IMG);
    if (o.theme) root.classList.add('mqm-theme-' + o.theme);
    root.setAttribute('dir', o.lang === 'ar' ? 'rtl' : 'ltr');
    root.innerHTML = '';

    /* =====================================================
       وضع 3D
       ===================================================== */
    var scene = null;

    function build3d() {
      scene = div('mqm-scene', { width: px(L.size), height: px(L.size) }, root);
      div('mqm-p mqm-ground', { left: '0', top: '0', width: px(L.size), height: px(L.size) }, scene);

      (L.areas || []).forEach(function (a) {
        div('mqm-p', {
          left: px(a.x), top: px(a.y), width: px(a.w), height: px(a.d),
          background: a.color, borderRadius: px(a.radius || 0), transform: 'translateZ(0.2px)'
        }, scene);
      });

      L.edges.forEach(function (e) { seg(scene, L.nodes[e[0]], L.nodes[e[1]], 14, 'mqm-walk', 0.4); });

      zones.forEach(function (z) {
        var r = refs[z.key] = { walls: [], discs: [] };
        var cx, cy, lz, gr;

        if (z.type === 'dome') {
          cx = z.cx; cy = z.cy; lz = z.h + 8; gr = z.r + 20;
          r.floor = div('mqm-p mqm-face mqm-plaza', {
            left: px(z.cx - z.r), top: px(z.cy - z.r), width: px(2 * z.r), height: px(2 * z.r),
            transform: 'translateZ(0.8px)'
          }, scene);
          r.floor.dataset.zone = z.key;
          var R = z.r * 0.82, n = 10;
          for (var i = 0; i <= n; i++) {
            var t = i / n, rad = Math.max(3, R * Math.sqrt(Math.max(0, 1 - t * t)));
            r.discs.push(div('mqm-p mqm-dome', {
              left: px(z.cx - rad), top: px(z.cy - rad), width: px(2 * rad), height: px(2 * rad),
              transform: 'translateZ(' + (1 + z.h * t) + 'px)'
            }, scene));
          }
        } else {
          cx = z.x + z.w / 2; cy = z.y + z.d / 2; lz = z.h + 6; gr = Math.max(z.w, z.d) / 2 + 22;
          r.top = div('mqm-p mqm-face mqm-top', {
            left: px(z.x), top: px(z.y), width: px(z.w), height: px(z.d),
            transform: 'translateZ(' + z.h + 'px)'
          }, scene);
          r.top.dataset.zone = z.key;
          // الجدران الأربعة: شمال، جنوب، غرب، شرق
          [
            { f: 0.82, c: '', s: { left: px(z.x), top: px(z.y), width: px(z.w), height: px(z.h), transformOrigin: '50% 0', transform: 'rotateX(90deg)' } },
            { f: 0.94, c: '', s: { left: px(z.x), top: px(z.y + z.d), width: px(z.w), height: px(z.h), transformOrigin: '50% 0', transform: 'rotateX(90deg)' } },
            { f: 0.76, c: ' mqm-wall-x', s: { left: px(z.x), top: px(z.y), width: px(z.h), height: px(z.d), transformOrigin: '0 50%', transform: 'rotateY(-90deg)' } },
            { f: 0.88, c: ' mqm-wall-x', s: { left: px(z.x + z.w), top: px(z.y), width: px(z.h), height: px(z.d), transformOrigin: '0 50%', transform: 'rotateY(-90deg)' } }
          ].forEach(function (w) {
            var el = div('mqm-p mqm-face mqm-wall' + w.c, w.s, scene);
            el._f = w.f;
            el.dataset.zone = z.key;
            r.walls.push(el);
          });
        }

        r.glow = div('mqm-p mqm-glow', {
          left: px(cx - gr), top: px(cy - gr), width: px(2 * gr), height: px(2 * gr),
          transform: 'translateZ(0.6px)', display: 'none'
        }, scene);

        r.label = makeLabel(z, 'mqm-label');
        r.label.style.left = px(cx);
        r.label.style.top = px(cy);
        r.label.style.setProperty('--z', lz + 'px');
        scene.appendChild(r.label);
      });

      (L.trees || []).forEach(function (t) {
        div('mqm-p', { left: px(t[0] - 1.5), top: px(t[1] - 1.5), width: '3px', height: '3px', background: '#7A5C3A', borderRadius: '50%', transform: 'translateZ(3px)' }, scene);
        [[7, 6], [5.5, 9], [3.5, 12]].forEach(function (c, i) {
          div('mqm-p', {
            left: px(t[0] - c[0]), top: px(t[1] - c[0]), width: px(2 * c[0]), height: px(2 * c[0]),
            borderRadius: '50%', background: i === 2 ? '#86BC6E' : '#5E9450', transform: 'translateZ(' + c[1] + 'px)'
          }, scene);
        });
      });

      state.meDot = div('mqm-p mqm-me', { width: '14px', height: '14px', transform: 'translateZ(2.5px)' }, scene);
      state.meLabel = div('mqm-billboard mqm-me-label', null, scene);
      state.meLabel.textContent = T.you;
      state.meLabel.style.setProperty('--z', '40px');   // مرفوع فوق أسماء المناطق عشان يبان دايم
    }

    function placeMe3d() {
      var z = byKey[state.start];
      if (!z) return;
      var d = L.nodes[z.door], p = d;
      // نحرك النقطة شوي على الممر عشان ما يغطيها جدار المبنى
      var e = L.edges.filter(function (ed) { return ed[0] === z.door || ed[1] === z.door; })[0];
      if (e) {
        var other = L.nodes[e[0] === z.door ? e[1] : e[0]], len = dist(d, other) || 1, step = Math.min(34, len / 2);
        p = [d[0] + (other[0] - d[0]) / len * step, d[1] + (other[1] - d[1]) / len * step];
      }
      css(state.meDot, { left: px(p[0] - 7), top: px(p[1] - 7) });
      css(state.meLabel, { left: px(p[0]), top: px(p[1]) });
    }

    function paint3d(z, r, lv, useHeat) {
      var base = useHeat ? lv.top : z.color;
      if (z.type === 'dome') {
        r.floor.style.backgroundColor = useHeat ? alpha(lv.top, 0.55) : '#F3EDE0';
        r.discs.forEach(function (d) {
          d.style.borderColor = useHeat ? lv.side : '#C8892B';
          d.style.backgroundColor = alpha(useHeat ? lv.top : '#E7C98A', 0.16);
        });
      } else {
        r.top.style.backgroundColor = base;
        r.walls.forEach(function (w) { w.style.backgroundColor = shade(base, w._f); });
      }
      var hot = useHeat && (lv.key === 'critical' || lv.key === 'high');
      r.glow.style.display = hot ? 'block' : 'none';
      if (hot) r.glow.style.background = 'radial-gradient(circle, ' + alpha(lv.top, 0.45) + ', ' + alpha(lv.top, 0) + ' 70%)';
      (r.top || r.floor).classList.toggle('mqm-selected', state.selected === z.key);
    }

    /* =====================================================
       وضع الصورة
       ===================================================== */
    var stage = null, img = null, svg = null, errBox = null;

    function buildImage() {
      stage = div('mqm-istage', null, root);
      img = document.createElement('img');
      img.className = 'mqm-img';
      img.alt = o.imageAlt || '';
      img.draggable = false;
      stage.appendChild(img);

      svg = document.createElementNS(SVGNS, 'svg');
      svg.setAttribute('class', 'mqm-isvg');
      svg.setAttribute('viewBox', '0 0 100 100');
      svg.setAttribute('preserveAspectRatio', 'none');
      svg.setAttribute('aria-hidden', 'true');
      stage.appendChild(svg);

      zones.forEach(function (z) {
        var r = refs[z.key] = {};
        r.ring = div('mqm-ring', { left: z.x + '%', top: z.y + '%' }, stage);
        r.label = makeLabel(z, 'mqm-marker');
        r.label.style.left = z.x + '%';
        r.label.style.top = z.y + '%';
        stage.appendChild(r.label);
      });

      state.meDot = div('mqm-ime', null, stage);
      state.meLabel = div('mqm-ime-label', null, stage);
      state.meLabel.textContent = T.you;

      img.addEventListener('load', function () {
        if (img.naturalWidth && img.naturalHeight) state.imgRatio = img.naturalWidth / img.naturalHeight;
        if (errBox) { errBox.remove(); errBox = null; }
        fit();
      });
      img.addEventListener('error', function () {
        if (!errBox) errBox = div('mqm-imgerr', null, root);
        errBox.textContent = T.noImage + (L.src || '');
      });
      img.src = L.src;
    }

    function placeMeImage() {
      var z = byKey[state.start];
      if (!z) return;
      css(state.meDot, { left: z.x + '%', top: z.y + '%' });
      css(state.meLabel, { left: z.x + '%', top: z.y + '%' });
    }

    function paintImage(z, r, lv, useHeat) {
      r.label.style.setProperty('--bg', useHeat ? lv.top : '#FFFFFF');
      r.label.style.setProperty('--ink', useHeat ? lv.ink : '#14211C');
      r.label.style.setProperty('--bd', useHeat ? lv.side : '#E2DCCF');
      r.label.style.setProperty('--lv', lv ? lv.top : '#9AA5A0');
      r.dot.style.background = useHeat ? lv.ink : (lv ? lv.top : '#9AA5A0');
      r.ring.style.display = useHeat && lv.key === 'critical' ? 'block' : 'none';
      if (lv) r.ring.style.setProperty('--c', alpha(lv.top, 0.55));
    }

    // روابط المناطق في وضع الصورة
    function imageEdges() {
      if (Array.isArray(L.edges)) return L.edges;
      var out = [], seen = {};
      function add(a, b) { var id = [a, b].sort().join('|'); if (a !== b && !seen[id]) { seen[id] = 1; out.push([a, b]); } }
      zones.forEach(function (z) {
        if (L.hub && byKey[L.hub]) add(z.key, L.hub);
        zones.filter(function (x) { return x.key !== z.key && x.key !== L.hub; })
          .sort(function (a, b) { return ipDist(z, a) - ipDist(z, b); })
          .slice(0, 2)
          .forEach(function (x) { add(z.key, x.key); });
      });
      return out;
    }
    function ipt(z) { return [z.x * state.imgRatio, z.y]; }
    function ipDist(a, b) { return dist(ipt(a), ipt(b)); }

    /* =====================================================
       مشترك
       ===================================================== */
    function makeLabel(z, cls) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = cls;
      b.dataset.zone = z.key;
      var r = refs[z.key];
      r.dot = document.createElement('span');
      r.dot.className = 'mqm-dot';
      r.dot.setAttribute('aria-hidden', 'true');
      r.text = document.createElement('span');
      r.pct = document.createElement('span');
      r.pct.setAttribute('dir', 'ltr');   // عشان تطلع 82% مو %82 في العربي
      b.appendChild(r.dot);
      b.appendChild(r.text);
      b.appendChild(r.pct);
      return b;
    }

    function placeMe() { if (IMG) placeMeImage(); else placeMe3d(); }

    /* ---------- أزرار التحكم ---------- */
    var heatBtn = null;
    if (o.controls) {
      var ctr = div('mqm-controls', null, root);
      var html = '';
      if (P3D) {
        html += '<button type="button" class="mqm-btn mqm-btn-3d" data-act="tilt" aria-pressed="false" aria-label="3D">' + ICONS.cube + '</button>';
      }
      if (!IMG || P3D) {
        html += '<button type="button" class="mqm-btn" data-act="rotL" aria-label="' + T.rotL + '">' + ICONS.rotL + '</button>' +
                '<button type="button" class="mqm-btn" data-act="rotR" aria-label="' + T.rotR + '">' + ICONS.rotR + '</button>';
      }
      html += '<button type="button" class="mqm-btn" data-act="zoomIn" aria-label="' + T.zoomIn + '">' + ICONS.zoomIn + '</button>' +
              '<button type="button" class="mqm-btn" data-act="zoomOut" aria-label="' + T.zoomOut + '">' + ICONS.zoomOut + '</button>';
      html += IMG
        ? '<button type="button" class="mqm-btn" data-act="reset" aria-label="' + T.reset + '">' + ICONS.target + '</button>'
        : '<button type="button" class="mqm-btn" data-act="reset" aria-label="' + T.reset + '">' +
            '<span class="mqm-compass" aria-hidden="true"><svg width="12" height="9" viewBox="0 0 14 10"><path d="M7 0l7 10H0z" fill="#C0392B"/></svg>' + T.north + '</span></button>';
      ctr.innerHTML = html;

      heatBtn = document.createElement('button');
      heatBtn.type = 'button';
      heatBtn.className = 'mqm-heat';
      heatBtn.dataset.act = 'heat';
      heatBtn.innerHTML = ICONS.heat + '<span>' + T.heat + '</span>';
      root.appendChild(heatBtn);

      var lg = div('mqm-legend', null, root);
      lg.innerHTML = LEVELS.slice().reverse().map(function (l) {
        return '<span><i style="background:' + l.top + '"></i>' + l.text[o.lang] + '</span>';
      }).join('');
    }

    var actions = {
      rotL: function () { rotate(-45); },
      rotR: function () { rotate(45); },
      zoomIn: function () { zoom(1.25); },
      zoomOut: function () { zoom(1 / 1.25); },
      reset: function () { resetView(); },
      heat: function () { setHeat(!state.heat); },
      tilt: function () { set3D(!state.tilt3d); }
    };

    /* ---------- العرض ---------- */
    function apply() {
      if (heatBtn) heatBtn.setAttribute('aria-pressed', String(state.heat));
      if (IMG) {
        var tl = state.tilt3d ? o.imageTilt : 0, rz = state.tilt3d ? state.irot : 0;
        root.style.setProperty('--mqm-inv', String(1 / state.zoom));
        root.style.setProperty('--mqm-rz', (-rz) + 'deg');
        root.style.setProperty('--mqm-sy', String(1 / Math.cos(tl * Math.PI / 180)));
        root.classList.toggle('mqm-3d', !!state.tilt3d);
        var b3 = root.querySelector('[data-act="tilt"]');
        if (b3) b3.setAttribute('aria-pressed', String(!!state.tilt3d));
        stage.style.transform = 'translate(-50%, -50%) translate(' + state.pan[0] + 'px, ' + state.pan[1] + 'px)' +
          (P3D ? ' perspective(1500px) rotateX(' + tl + 'deg) rotateZ(' + rz + 'deg)' : '') +
          ' scale(' + (state.zoom * (state.tilt3d ? (o.imageScale3d || 1.12) : 1)) + ')';
        return;
      }
      root.style.setProperty('--mqm-rot', state.rot + 'deg');
      root.style.setProperty('--mqm-tilt', o.tilt + 'deg');
      root.style.setProperty('--mqm-scale', String(state.fit * state.zoom));
    }
    function fit() {
      var w = root.clientWidth, h = root.clientHeight;
      if (!w || !h) return;
      if (IMG) {
        var r = state.imgRatio, cover = o.imageFit === 'cover';
        var useH = cover ? (w / h < r) : (w / h > r);
        var sw = useH ? h * r : w, sh = useH ? h : w / r;
        stage.style.width = px(sw);
        stage.style.height = px(sh);
      } else {
        state.fit = Math.max(0.3, Math.min(w / (L.size * 1.2), h / (L.size * 0.95)));
      }
      apply();
    }
    function rotate(deg) {
      if (IMG) {
        if (!P3D) return;
        if (!state.tilt3d) state.tilt3d = true;
        state.irot += deg / 1.5;
        apply();
        return;
      }
      state.rot += deg; apply();
    }
    function set3D(on) { if (!P3D) return; state.tilt3d = !!on; apply(); }

    // مصفوفة المسرح (نفس التحويل اللي في apply) — من بكسل الصورة إلى الشاشة
    function stageMatrix() {
      var w = stage.offsetWidth, h = stage.offsetHeight;
      var tl = state.tilt3d ? o.imageTilt : 0, rz = state.tilt3d ? state.irot : 0;
      var sc = state.zoom * (state.tilt3d ? (o.imageScale3d || 1.12) : 1);
      var rr = root.getBoundingClientRect();
      var m = new DOMMatrix()
        .translate(rr.left + root.clientLeft + stage.offsetLeft + w / 2, rr.top + root.clientTop + stage.offsetTop + h / 2)
        .translate(-w / 2, -h / 2)
        .translate(state.pan[0], state.pan[1]);
      if (P3D) {
        var persp = new DOMMatrix();
        persp.m34 = -1 / 1500;
        m = m.multiply(persp).rotateAxisAngle(1, 0, 0, tl).rotateAxisAngle(0, 0, 1, rz);
      }
      return m.scale(sc, sc, 1).translate(-w / 2, -h / 2);
    }

    // نسبة مئوية على الخريطة → نقطة على الشاشة
    function mapToScreen(x, y) {
      if (!IMG || !stage || typeof DOMMatrix === 'undefined') return null;
      var p = stageMatrix().transformPoint(new DOMPoint(x / 100 * stage.offsetWidth, y / 100 * stage.offsetHeight, 0, 1));
      return [p.x / p.w, p.y / p.w];
    }

    // يحرّك العرض بحيث تكون النقطة في وسط الخريطة
    function focusOn(x, y, opt) {
      if (!IMG || !stage) return;
      opt = opt || {};
      if (opt.zoom != null) state.zoom = Math.min(4, Math.max(1, opt.zoom));
      var sp = mapToScreen(x, y);
      if (!sp) return;
      var rr = root.getBoundingClientRect();
      var cx = rr.left + root.clientWidth / 2, cy = rr.top + root.clientHeight * (opt.yAt || 0.55);
      state.pan = [state.pan[0] + cx - sp[0], state.pan[1] + cy - sp[1]];
      apply();
    }

    // يحوّل نقطة على الشاشة إلى نسبة مئوية على الخريطة (يشتغل مع الإمالة 3D)
    function toMapPoint(clientX, clientY) {
      if (!IMG || !stage) return null;
      var w = stage.offsetWidth, h = stage.offsetHeight;
      if (!w || !h) return null;
      if (typeof DOMMatrix === 'undefined') {
        var b = stage.getBoundingClientRect();
        return [(clientX - b.left) / b.width * 100, (clientY - b.top) / b.height * 100];
      }
      var m = stageMatrix();
      var X = clientX, Y = clientY;
      var a1 = m.m11 - X * m.m14, b1 = m.m21 - X * m.m24, c1 = X * m.m44 - m.m41;
      var a2 = m.m12 - Y * m.m14, b2 = m.m22 - Y * m.m24, c2 = Y * m.m44 - m.m42;
      var det = a1 * b2 - a2 * b1;
      if (Math.abs(det) < 1e-9) return null;
      var u = (c1 * b2 - c2 * b1) / det, v = (a1 * c2 - a2 * c1) / det;
      return [u / w * 100, v / h * 100];
    }
    function zoom(f) {
      state.zoom = Math.min(IMG ? 4 : 2.5, Math.max(IMG ? 1 : 0.5, state.zoom * f));
      if (IMG && state.zoom === 1) state.pan = [0, 0];
      apply();
    }
    function resetView() { state.rot = o.rotation; state.irot = o.imageRotation; state.zoom = 1; state.pan = [0, 0]; apply(); }

    /* ---------- البيانات ---------- */
    function info(key) {
      var z = byKey[key];
      if (!z) return null;
      var d = state.data[key];
      var ratio = d && d.capacity ? d.count / d.capacity : null;
      var lv = ratio == null ? null : levelOf(ratio);
      return {
        key: key,
        id: d && d.dbId != null ? d.dbId : (z.id != null ? z.id : null),
        name: z.name[o.lang] || z.name.ar,
        dbName: d ? d.dbName : null,
        capacity: d ? d.capacity : null,
        count: d ? d.count : null,
        ratio: ratio,
        percent: ratio == null ? null : Math.round(ratio * 100),
        level: lv ? lv.key : null,
        levelText: lv ? lv.text[o.lang] : '',
        color: lv ? lv.top : null,
        waitMinutes: ratio == null ? null : Math.max(0, Math.round((ratio - 0.3) * 45))
      };
    }
    function getZones() { return zones.map(function (z) { return info(z.key); }); }

    function paint() {
      zones.forEach(function (z) {
        var r = refs[z.key], inf = info(z.key);
        var lv = inf.ratio == null ? null : levelOf(inf.ratio);
        var useHeat = !!(state.heat && lv);

        if (IMG) paintImage(z, r, lv, useHeat); else paint3d(z, r, lv, useHeat);

        if (!IMG) r.dot.style.background = lv ? lv.top : '#9AA5A0';
        var showPct = state.heat && inf.percent != null;
        r.text.textContent = inf.name + (showPct ? ' · ' : '');
        r.pct.textContent = showPct ? inf.percent + '%' : '';
        r.label.setAttribute('aria-label', inf.name + (inf.levelText ? ' — ' + inf.levelText : ''));

        var sel = state.selected === z.key;
        r.label.classList.toggle('mqm-active', sel);
        r.label.setAttribute('aria-pressed', String(sel));
      });
    }

    // يلقى المنطقة اللي تطابق عنصر جاي من الـ API
    function findZone(item) {
      if (o.matchBy === 'id') {
        var id = pick(item, o.fields.id);
        return zones.filter(function (z) { return z.id != null && String(z.id) === String(id); })[0];
      }
      var n = norm(pick(item, o.fields.name));
      if (!n) return null;
      return zones.filter(function (z) {
        return [z.key, z.name.ar, z.name.en].concat(z.aliases || []).some(function (a) { return norm(a) === n; });
      })[0];
    }

    function ingest(list) {
      if (list && !Array.isArray(list)) list = list.data || list.content || list.zones || [];
      var unmatched = [];
      (list || []).forEach(function (item) {
        var z = findZone(item);
        if (!z) { unmatched.push(pick(item, o.fields.name) || pick(item, o.fields.id)); return; }
        state.data[z.key] = {
          dbId: pick(item, o.fields.id),
          dbName: pick(item, o.fields.name),
          capacity: Number(pick(item, o.fields.capacity)) || 0,
          count: Number(pick(item, o.fields.count)) || 0
        };
      });
      if (unmatched.length) console.info('[MirqabMap] مناطق ما لها مكان في الخريطة (ضيفيها في layout أو aliases):', unmatched);
      state.loaded = true;
      paint();
      if (state.route) showRoute(state.route.to, state.route.opts);
      var all = getZones();
      if (o.onUpdate) o.onUpdate(all);
      root.dispatchEvent(new CustomEvent('mqm:update', { detail: all }));
      if (state.selected && o.onSelect) o.onSelect(info(state.selected));
    }

    function demoList() {
      return zones.map(function (z, i) {
        var c = DEMO_COUNTS[z.key] || [5000, 1000 + ((i * 1777) % 4000)];
        var item = {};
        setPath(item, o.fields.id, z.id != null ? z.id : i + 1);
        setPath(item, o.fields.name, z.name.en);
        setPath(item, o.fields.capacity, c[0]);
        setPath(item, o.fields.count, c[1]);
        return item;
      });
    }

    function load() {
      if (!o.apiUrl) {
        if (o.demo && !state.loaded) {
          var saved = o.matchBy; o.matchBy = 'name';
          ingest(demoList());
          o.matchBy = saved;
        }
        return Promise.resolve();
      }
      return fetch(o.apiUrl, o.fetchOptions)
        .then(function (res) { if (!res.ok) throw new Error('HTTP ' + res.status); return res.json(); })
        .then(ingest)
        .catch(function (err) {
          console.warn('[MirqabMap] تعذر جلب البيانات:', err);
          if (o.onError) o.onError(err);
          if (o.demo && !state.loaded) {
            var saved = o.matchBy; o.matchBy = 'name';
            ingest(demoList());
            o.matchBy = saved;
          }
        });
    }

    /* ---------- الاختيار ---------- */
    function resolve(k) {
      if (k == null) return null;
      if (byKey[k]) return k;
      var n = norm(k);
      var z = zones.filter(function (zz) {
        var d = state.data[zz.key];
        return (d && d.dbId != null && String(d.dbId) === String(k)) ||
               (zz.id != null && String(zz.id) === String(k)) ||
               norm(zz.name.ar) === n || norm(zz.name.en) === n ||
               (d && norm(d.dbName) === n);
      })[0];
      return z ? z.key : null;
    }
    function select(k) {
      var key = resolve(k);
      if (!key) return null;
      state.selected = key;
      paint();
      var inf = info(key);
      if (o.onSelect) o.onSelect(inf);
      root.dispatchEvent(new CustomEvent('mqm:select', { detail: inf }));
      return inf;
    }

    /* ---------- المسار الذكي (Dijkstra) ---------- */
    function crowdFactor(zoneKey) {
      var d = state.data[zoneKey];
      var r = d && d.capacity ? d.count / d.capacity : 0;
      return r >= 0.9 ? 4 : r >= 0.75 ? 2.5 : r >= 0.5 ? 1.3 : 1;
    }

    var graph = { adj: {}, names: [], len: null, zoneOf: null, point: null };
    function buildGraph() {
      graph.adj = {};
      function link(a, b, e) {
        (graph.adj[a] = graph.adj[a] || []).push({ to: b, e: e });
        (graph.adj[b] = graph.adj[b] || []).push({ to: a, e: e });
      }
      if (IMG) {
        graph.names = zones.map(function (z) { return z.key; });
        imageEdges().forEach(function (e) { if (byKey[e[0]] && byKey[e[1]]) link(e[0], e[1], e); });
        graph.len = function (e) { return ipDist(byKey[e[0]], byKey[e[1]]); };
        // في وضع الصورة: الدخول لمنطقة مزدحمة (مو الوجهة) يرفع التكلفة
        graph.zoneOf = function (a) { return a.to; };
        graph.point = function (n) { return [byKey[n].x, byKey[n].y]; };
      } else {
        graph.names = Object.keys(L.nodes);
        L.edges.forEach(function (e) { link(e[0], e[1], e); });
        graph.len = function (e) { return dist(L.nodes[e[0]], L.nodes[e[1]]); };
        graph.zoneOf = function (a) { return a.e[2]; };
        graph.point = function (n) { return L.nodes[n]; };
      }
    }
    function nodeOf(key) { return IMG ? key : byKey[key].door; }

    // نقاط المسار: تتبع رسمة الربط المحفوظة بين المنطقتين إذا موجودة
    function routePoints(nodes) {
      var paths = IMG && L.edgePaths;
      if (!paths) return nodes.map(graph.point);
      var out = [graph.point(nodes[0])];
      for (var i = 1; i < nodes.length; i++) {
        var fwd = paths[nodes[i - 1] + '|' + nodes[i]];
        var rev = paths[nodes[i] + '|' + nodes[i - 1]];
        var mid = fwd || (rev ? rev.slice().reverse() : null);
        if (mid) mid.forEach(function (pt) { out.push(pt); });
        out.push(graph.point(nodes[i]));
      }
      return out;
    }

    function getRoute(toK, opts) {
      opts = opts || {};
      var to = resolve(toK), from = resolve(opts.from != null ? opts.from : state.start);
      if (!to || !from) return null;
      if (!graph.len) buildGraph();
      var s = nodeOf(from), t = nodeOf(to);

      function crowdCost(a) {
        var zk = graph.zoneOf(a), l = graph.len(a.e);
        if (!zk || zk === from || zk === to) return l;
        return l * crowdFactor(zk);
      }
      function plainCost(a) { return graph.len(a.e); }

      var best = dijkstra(graph.adj, graph.names, s, t, crowdCost);
      var direct = dijkstra(graph.adj, graph.names, s, t, plainCost);
      if (!best) return null;

      function summary(p) {
        var len = 0, cost = 0, passes = [];
        p.links.forEach(function (x) {
          len += graph.len(x.link.e);
          cost += crowdCost(x.link);
          var zk = graph.zoneOf(x.link);
          if (zk && zk !== from && zk !== to && passes.indexOf(zk) < 0) passes.push(zk);
        });
        return {
          nodes: p.nodes,
          points: routePoints(p.nodes),
          meters: Math.round(len * MPU),
          minutes: Math.max(1, Math.round(cost * MPU / WALK_M_PER_MIN)),
          passes: passes.map(function (k) { return info(k).name; })
        };
      }
      var b = summary(best), d = summary(direct);
      var same = b.nodes.join() === d.nodes.join();
      return {
        from: info(from),
        to: info(to),
        best: b,
        direct: same ? null : d,
        avoided: same ? [] : d.passes.filter(function (n) { return b.passes.indexOf(n) < 0; }),
        savedMinutes: same ? 0 : Math.max(0, d.minutes - b.minutes)
      };
    }

    function clearRoute() {
      if (stage) {
        state.routeEls.forEach(function (el) {
          var id = el.getAttribute && el.getAttribute('data-rt');
          if (id) stage.querySelectorAll('.mqm-dest-flag[data-for="' + id + '"]').forEach(function (f) { f.remove(); });
        });
      }
      state.routeEls.forEach(function (el) { el.remove(); });
      state.routeEls = [];
      state.route = null;
    }

    function drawPath(points, kind, label) {
      if (IMG) {
        if (kind === 'best') {
          var g = buildRoute(svg, points, { ratio: state.imgRatio, destLabel: label });
          if (g) state.routeEls.push(g);
          return;
        }
        var d = points.map(function (p, i) { return (i ? 'L' : 'M') + p[0] + ' ' + p[1]; }).join(' ');
        state.routeEls.push(svgPath(d, 'mqm-ipath-alt'));
        return;
      }
      for (var i = 1; i < points.length; i++) {
        state.routeEls.push(kind === 'best'
          ? seg(scene, points[i - 1], points[i], 6, 'mqm-route', 2)
          : seg(scene, points[i - 1], points[i], 4, 'mqm-route-alt', 1.6));
      }
    }
    function svgPath(d, cls) {
      var p = document.createElementNS(SVGNS, 'path');
      p.setAttribute('d', d);
      p.setAttribute('class', cls);
      p.setAttribute('vector-effect', 'non-scaling-stroke');
      svg.appendChild(p);
      return p;
    }

    function showRoute(toK, opts) {
      opts = opts || {};
      var r = getRoute(toK, opts);
      clearRoute();
      if (!r) return null;
      var main = opts.use === 'direct' && r.direct ? r.direct : r.best;
      var other = main === r.best ? r.direct : r.best;
      if (other && opts.compare !== false) drawPath(other.points, 'alt');
      drawPath(main.points, 'best', opts.label ? r.to.name : null);
      r.shown = main;
      state.route = { to: toK, opts: opts };
      return r;
    }

    /* ---------- التفاعل ---------- */
    function onClick(e) {
      var act = e.target.closest('[data-act]');
      if (act && root.contains(act)) { actions[act.dataset.act](); return; }
      if (state.justDragged) return;
      var z = e.target.closest('[data-zone]');
      if (z && root.contains(z)) { select(z.dataset.zone); return; }
      // وضع المعايرة: اضغطي على الصورة ويطبع لك مكان النقطة بالنسبة المئوية
      if (IMG && o.debug && e.target === img) {
        var b = stage.getBoundingClientRect();
        var x = +((e.clientX - b.left) / b.width * 100).toFixed(1);
        var y = +((e.clientY - b.top) / b.height * 100).toFixed(1);
        console.log('[MirqabMap] x: ' + x + ', y: ' + y);
        var m = div('mqm-debug-dot', { left: x + '%', top: y + '%' }, stage);
        m.textContent = x + ', ' + y;
      }
    }

    function onDown(e) {
      if (e.button !== 0 || e.target.closest('.mqm-controls, .mqm-heat, .mqm-legend')) return;
      var x0 = e.clientX, y0 = e.clientY, r0 = state.rot, p0 = state.pan.slice(), moved = false;
      function move(ev) {
        var dx = ev.clientX - x0, dy = ev.clientY - y0;
        if (!moved && Math.abs(dx) + Math.abs(dy) > 5) { moved = true; root.classList.add('mqm-dragging'); }
        if (!moved) return;
        if (IMG) state.pan = [p0[0] + dx, p0[1] + dy];
        else state.rot = r0 + dx * 0.4;
        apply();
      }
      function up() {
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', up);
        window.removeEventListener('pointercancel', up);
        if (moved) {
          root.classList.remove('mqm-dragging');
          state.justDragged = true;
          setTimeout(function () { state.justDragged = false; }, 0);
        }
      }
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);
      window.addEventListener('pointercancel', up);
    }

    root.addEventListener('click', onClick);
    root.addEventListener('pointerdown', onDown);

    var ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(fit) : null;
    if (ro) ro.observe(root); else window.addEventListener('resize', fit);

    function setHeat(on) { state.heat = !!on; apply(); paint(); }
    function setStart(k) {
      var key = resolve(k);
      if (!key) return;
      state.start = key;
      placeMe();
      if (state.route) showRoute(state.route.to, state.route.opts);
    }

    function destroy() {
      if (state.timer) clearInterval(state.timer);
      if (ro) ro.disconnect(); else window.removeEventListener('resize', fit);
      root.removeEventListener('click', onClick);
      root.removeEventListener('pointerdown', onDown);
      root.innerHTML = '';
      root.classList.remove('mqm', 'mqm-imode', 'mqm-3d');
      if (o.theme) root.classList.remove('mqm-theme-' + o.theme);
    }

    /* ---------- التشغيل ---------- */
    if (IMG) buildImage(); else build3d();
    state.start = resolve(state.start) ||
        (zones.length ? zones[0].key : null);
    placeMe();
    buildGraph();
    fit();
    apply();
    paint();
    load();
    if (o.apiUrl && o.refreshMs) state.timer = setInterval(load, o.refreshMs);
    // دخول سلس للمنظور ثلاثي الأبعاد
    if (P3D && o.start3d !== false && root.clientWidth >= 640) {
      setTimeout(function () { if (root.isConnected) set3D(true); }, 450);
    }

    return {
      select: select,
      getZones: getZones,
      getZone: function (k) { var key = resolve(k); return key ? info(key) : null; },
      setOccupancy: ingest,
      refresh: load,
      getRoute: getRoute,
      showRoute: showRoute,
      clearRoute: clearRoute,
      setStart: setStart,
      setHeat: setHeat,
      rotate: rotate,
      zoom: zoom,
      resetView: resetView,
      set3D: set3D,
      is3D: function () { return !!state.tilt3d; },
      toMapPoint: toMapPoint,
      mapToScreen: mapToScreen,
      focusOn: focusOn,
      setFollow: function (on) { root.classList.toggle('mqm-follow', !!on); },
      destroy: destroy
    };
  }

  global.MirqabMap = {
    create: create,
    buildRoute: buildRoute,
    facilityPins: facilityPins,
    FACILITY_LOOK: FACILITY_LOOK,
    LEVELS: LEVELS,
    DEFAULT_LAYOUT: DEFAULT_LAYOUT,
    DEFAULT_IMAGE_LAYOUT: DEFAULT_IMAGE_LAYOUT
  };
})(window);
