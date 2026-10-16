/* Mergab — Visitor Interactive Map */

(() => {
    'use strict';

    const $ = id => document.getElementById(id);

    const escapeHtml = value =>
        String(value ?? '').replace(/[&<>"']/g, c => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        })[c]);

    const number = value =>
        Number(value || 0).toLocaleString('en-US');

    const i18n = {
        ar: {
            eyebrow: 'استكشف إكسبو بذكاء',
            title: 'الخريطة التفاعلية',
            subtitle: 'تعرّف على المناطق، شاهد الازدحام، وخطّط مسارك.',
            mapNav: 'الخريطة',
            planNav: 'خطط مسارك',
            crowdNav: 'الازدحام',
            suggestNav: 'اقتراحات',
            refreshNotice: 'تحديث تلقائي كل 30 ثانية',
            visitors: 'عدد الزوار المسجل',
            capacity: 'السعة',
            eventsToday: 'فعاليات اليوم',
            showRoute: 'اعرض المسار',
            planTitle: 'خطّط زيارتك',
            planDesc: 'اختر نقطة البداية والمناطق اللي ودّك تزورها. المسارات تقديرية وبحسب الاتصالات المسجلة.',
            chooseZones: 'المناطق اللي تبغى تزورها',
            startZone: 'نقطة البداية',
            avoidCrowd: 'فضّل المسارات الأقل ازدحامًا',
            planButton: 'أنشئ مساري',
            routeResult: 'المسار المقترح',
            crowdTitle: 'حالة الازدحام',
            sugTitle: 'اقتراحات لزيارتك',
            sugDesc: 'اقتراحات حسب إشغال المناطق والفعاليات المسجلة.',
            loading: 'جاري تحميل بيانات الخريطة...',
            loaded: 'الخريطة متصلة بالبيانات الحالية',
            empty: 'لا توجد مناطق مضافة حتى الآن.',
            notMapped: 'لم يحدد موقعها بعد',
            loadError: 'الخريطة غير متاحة مؤقتًا، يرجى المحاولة لاحقًا.',
            emptyRoute: 'اختاري منطقة واحدة على الأقل لإنشاء المسار.',
            disconnected: 'لا يوجد مسار مسجل يربط المناطق المختارة.',
            sameStart: 'أنتِ بالفعل عند المنطقة المختارة.',
            noZonesRoute: 'لا توجد مناطق بإحداثيات صالحة لتخطيط مسار.',
            routeHint: 'مدة المشي تقريبية، وليست ملاحة ميدانية دقيقة.',
            walk: 'المشي',
            minutes: 'دقيقة',
            showOnMap: 'عرض بالخريطة',
            high: 'مكتظ',
            busy: 'مزدحم',
            medium: 'متوسط',
            low: 'هادئ',
            missing: 'لا توجد مناطق متاحة حاليًا.',
            suggestionQuiet: 'منطقة أقل ازدحامًا',
            suggestionEvent: 'فعالية قادمة',
            suggestionsEmpty: 'لا توجد اقتراحات حاليًا.',
            noConnections: 'لا يوجد مسار متصل من نقطة البداية إلى هذه المنطقة.',
            noStart: 'اختاري نقطة بداية من القائمة.'
        },
        en: {
            eyebrow: 'Explore Expo smarter',
            title: 'Interactive map',
            subtitle: 'Explore zones, check crowds and plan your route.',
            mapNav: 'Map',
            planNav: 'Plan route',
            crowdNav: 'Crowds',
            suggestNav: 'Suggestions',
            refreshNotice: 'Updates automatically every 30 seconds',
            visitors: 'Recorded visitors',
            capacity: 'Capacity',
            eventsToday: 'Events today',
            showRoute: 'Show route',
            planTitle: 'Plan your visit',
            planDesc: 'Choose where to start and which zones to visit. Routes are estimates based on recorded connections.',
            chooseZones: 'Zones to visit',
            startZone: 'Starting zone',
            avoidCrowd: 'Prefer less-crowded routes',
            planButton: 'Build my route',
            routeResult: 'Suggested route',
            crowdTitle: 'Crowd levels',
            sugTitle: 'Suggestions for you',
            sugDesc: 'Based on recorded occupancy and events.',
            loading: 'Loading map data...',
            loaded: 'Map connected to current data',
            empty: 'No zones have been added yet.',
            notMapped: 'Location not set yet',
            loadError: 'The map is temporarily unavailable. Please try again later.',            emptyRoute: 'Choose at least one destination.',
            disconnected: 'No recorded route connects the selected zones.',
            sameStart: 'You are already at the selected zone.',
            noZonesRoute: 'No zones have valid map coordinates yet.',
            routeHint: 'Walking times are approximate, not turn-by-turn navigation.',
            walk: 'Walk',
            minutes: 'min',
            showOnMap: 'Show on map',
            high: 'Critical',
            busy: 'Busy',
            medium: 'Moderate',
            low: 'Quiet',
            missing: 'No zones are currently available.',
            suggestionQuiet: 'Less-crowded zone',
            suggestionEvent: 'Upcoming event',
            suggestionsEmpty: 'No suggestions yet.',
            noConnections: 'No connected route from the starting zone.',
            noStart: 'Choose a starting zone.'
        }
    };

    const lang = () =>
        window.Mergab?.getLanguage?.() === 'en' ? 'en' : 'ar';

    const t = key => i18n[lang()][key] || key;

    const zoneId = z => String(z?.id ?? '');

    const mappable = z =>
        z?.id != null &&
        z.mapX != null &&
        z.mapY != null &&
        Number.isFinite(Number(z.mapX)) &&
        Number.isFinite(Number(z.mapY)) &&
        Number(z.mapX) >= 0 &&
        Number(z.mapX) <= 100 &&
        Number(z.mapY) >= 0 &&
        Number(z.mapY) <= 100;

    const percent = z =>
        Math.round(
            (Number(z.initialVisitors) || 0) /
            (Number(z.capacity) || 1) * 100
        );

    const crowdType = z => {
        const p = percent(z);

        if (p >= 90) return 'critical';
        if (p >= 75) return 'high';
        if (p >= 50) return 'medium';

        return 'low';
    };

    const crowdName = z => ({
        critical: t('high'),
        high: t('busy'),
        medium: t('medium'),
        low: t('low')
    })[crowdType(z)];

    const crowdColor = z => ({
        critical: '#C0392B',
        high: '#E8964A',
        medium: '#F2D27A',
        low: '#7FC49B'
    })[crowdType(z)];

    let ZONES = [];
    let EVENTS = [];
    let ROUTE_NETWORK = {
        facilities: [],
        walkPaths: [],
        accessPaths: []
    };

    let ZONE_CONNECTIONS = [];
    let selectedId = null;
    let controller = null;
    let picked = new Set();
    let didOpenQuery = false;

    const byId = id =>
        ZONES.find(z => zoneId(z) === String(id));

    const usableZones = () => ZONES.filter(mappable);

    const currentMap = () => controller?.getMap() || null;

    const message = (id, content) => {
        $(id).innerHTML =
            `<p class="map-empty">${escapeHtml(content)}</p>`;
    };

    function today(value) {
        const date = new Date(value);

        return Number.isFinite(date.getTime()) &&
            date.toDateString() === new Date().toDateString();
    }

    function eventCount(zone) {
        return EVENTS.filter(event =>
            event.zone &&
            zoneId(event.zone) === zoneId(zone) &&
            today(event.startDateTime)
        ).length;
    }

    /* ---------------- Translation ---------------- */

    function translatePage() {
        document.querySelectorAll('[data-i]').forEach(element => {
            element.textContent = t(element.dataset.i);
        });
    }

    /* ---------------- Zone List ---------------- */

    function renderLayers() {
        if (!ZONES.length) {
            message('layers', t('empty'));
            return;
        }

        $('layers').innerHTML =
            `<h2>${escapeHtml(t('mapNav'))}</h2>` +

            ZONES.map(zone => {
                const canShow = mappable(zone);

                return `
                    <button
                        type="button"
                        data-zone="${escapeHtml(zone.id)}"
                        ${canShow ? '' : 'disabled'}
                        aria-pressed="${selectedId === zoneId(zone)}">

                        <span class="map-dot"
                              style="--c:${crowdColor(zone)}"></span>

                        <span class="map-layer-name">
                            ${escapeHtml(zone.name)}

                            ${canShow ? '' : `
                                <small class="map-layer-note">
                                    ${escapeHtml(t('notMapped'))}
                                </small>
                            `}
                        </span>
                    </button>
                `;
            }).join('');
    }

    /* ---------------- Crowd Levels ---------------- */

    function renderCrowd() {
        if (!ZONES.length) {
            message('crowd', t('missing'));
            return;
        }

        const sorted = ZONES.slice().sort(
            (a, b) => percent(b) - percent(a)
        );

        $('crowd').innerHTML = sorted.map(zone => `
            <button
                type="button"
                class="crowd-row"
                data-zone="${escapeHtml(zone.id)}"
                ${mappable(zone) ? '' : 'disabled'}>

                <span class="ic" style="background:#F0F5EF">
                    <span class="map-dot"
                          style="--c:${crowdColor(zone)}"></span>
                </span>

                <b>${escapeHtml(zone.name)}</b>

                <span class="meter">
                    <i style="
                        width:${Math.min(100, Math.max(0, percent(zone)))}%;
                        background:${crowdColor(zone)};
                    "></i>
                </span>

                <span class="pct" dir="ltr">
                    ${percent(zone)}%
                </span>
            </button>
        `).join('');
    }

    /* ---------------- Selected Zone ---------------- */

    function renderSelected() {
        const zone = selectedId ? byId(selectedId) : null;
        const card = $('selCard');

        if (!zone || !mappable(zone)) {
            card.hidden = true;
            selectedId = null;
            return;
        }

        card.hidden = false;

        $('sName').textContent = zone.name;

        $('sBadge').className =
            'map-badge ' + crowdType(zone);

        $('sBadge').textContent =
            crowdName(zone) + ' · ' + percent(zone) + '%';

        $('sCount').textContent = number(zone.initialVisitors);
        $('sCap').textContent = number(zone.capacity);
        $('sEvents').textContent = number(eventCount(zone));

        renderLayers();
    }

    /* ---------------- Route Pickers ---------------- */

    function renderPickers() {
        const valid = usableZones();
        const oldStart = $('startSel').value;

        const ids = new Set(valid.map(zoneId));

        picked = new Set(
            [...picked].filter(id => ids.has(id))
        );

        $('pickZones').innerHTML = valid.length
            ? valid.map(zone => `
                <button
                    type="button"
                    class="chip"
                    data-pick="${escapeHtml(zone.id)}"
                    aria-pressed="${picked.has(zoneId(zone))}">

                    ${escapeHtml(zone.name)}
                </button>
            `).join('')

            : `<p class="map-empty">
                   ${escapeHtml(t('noZonesRoute'))}
               </p>`;

        $('startSel').innerHTML = valid.map(zone => `
            <option value="${escapeHtml(zone.id)}">
                ${escapeHtml(zone.name)}
            </option>
        `).join('');

        if (ids.has(oldStart)) {
            $('startSel').value = oldStart;
        }

        if (currentMap() && $('startSel').value) {
            currentMap().setStart($('startSel').value);
        }
    }

    /* ---------------- Suggestions ---------------- */

    function renderSuggestions() {
        const suggestions = [];

        const quiet = usableZones()
            .slice()
            .sort((a, b) => percent(a) - percent(b))[0];

        if (quiet) {
            suggestions.push({
                zone: quiet,
                title: t('suggestionQuiet'),
                description:
                    quiet.name + ' · ' + crowdName(quiet)
            });
        }

        const now = Date.now();

        const upcoming = EVENTS
            .filter(event => {
                const date = new Date(event.startDateTime).getTime();

                return date >= now &&
                    date <= now + 4 * 60 * 60 * 1000;
            })
            .sort(
                (a, b) =>
                    new Date(a.startDateTime) -
                    new Date(b.startDateTime)
            )
            .find(event =>
                event.zone &&
                usableZones().some(zone =>
                    zoneId(zone) === zoneId(event.zone)
                )
            );

        if (upcoming) {
            suggestions.push({
                zone: byId(upcoming.zone.id),
                title: t('suggestionEvent'),
                description:
                    upcoming.name + ' · ' + upcoming.zone.name
            });
        }

        $('sugList').innerHTML = suggestions.length
            ? suggestions.map(item => `
                <button
                    type="button"
                    class="map-suggestion"
                    data-zone="${escapeHtml(item.zone.id)}">

                    <strong>${escapeHtml(item.title)}</strong>
                    <small>${escapeHtml(item.description)}</small>
                </button>
            `).join('')

            : `<p class="map-empty">
                   ${escapeHtml(t('suggestionsEmpty'))}
               </p>`;
    }

    /* ---------------- Route Drawing ---------------- */

    function drawRoute(targetId, startId) {
        const map = currentMap();
        if (!map) return null;

        clearFacilityWalkingRoute();

        const from = startId || $('startSel').value;
        if (!from) return null;

        if (
            myLocationPoint &&
            String(from) === $('startSel').value &&
            String(targetId) !== String(from)
        ) {
            return showInterZoneRoute(targetId);
        }

        activeZoneRouteId = null;
        $('map').querySelector('#visitorInterZoneRoute')?.remove();

        map.setStart(String(from));
        map.select(String(targetId));

        return map.showRoute(String(targetId), {
            from: String(from),
            compare: false
        });
    }

    function showRouteToSelected() {
        if (!selectedId) return;

        const route = drawRoute(selectedId);

        $('routeNote').hidden = false;

        $('routeNote').textContent = route
            ? `${t('walk')}: ${number(route.best.meters)} m · ${number(route.best.minutes)} ${t('minutes')}. ${t('routeHint')}`
            : t('noConnections');
    }

    /* ---------------- Route Planner ---------------- */

    function buildPlan(event) {
        event.preventDefault();

        const map = currentMap();
        const start = $('startSel').value;

        if (!map || !start) {
            message('planSteps', t('noStart'));
            return;
        }

        if (!picked.size) {
            message('planSteps', t('emptyRoute'));
            return;
        }

        let remaining = [...picked].filter(id => id !== start);
        let from = start;

        const steps = [];
        const avoidCrowd = $('avoidChk').checked;

        while (remaining.length) {
            const next = remaining
                .map(to => ({
                    to,
                    route: map.getRoute(to, { from })
                }))
                .filter(item => item.route)
                .sort((a, b) => {
                    const score = item => {
                        const route = avoidCrowd
                            ? item.route.best
                            : (item.route.direct || item.route.best);

                        return route.minutes;
                    };

                    return score(a) - score(b);
                })[0];

            if (!next) {
                message('planSteps', t('disconnected'));
                return;
            }

            steps.push({
                from,
                to: next.to,
                route: next.route
            });

            from = next.to;

            remaining = remaining.filter(
                id => id !== next.to
            );
        }

        if (!steps.length) {
            message('planSteps', t('sameStart'));
            return;
        }

        $('planSteps').innerHTML =
            steps.map(step => {
                const zone = byId(step.to);

                const route = avoidCrowd
                    ? step.route.best
                    : (step.route.direct || step.route.best);

                return `
                    <li class="map-route-step">
                        <strong>
                            ${escapeHtml(zone?.name || '')}
                        </strong>

                        · ${number(route.minutes)}
                        ${escapeHtml(t('minutes'))}

                        <button
                            type="button"
                            data-step-to="${escapeHtml(step.to)}"
                            data-step-from="${escapeHtml(step.from)}">

                            ${escapeHtml(t('showOnMap'))}
                        </button>
                    </li>
                `;
            }).join('');

        const note = document.createElement('p');
        note.className = 'map-empty';
        note.textContent = t('routeHint');

        document.querySelector('.map-plan-result > .map-empty')?.remove();
        $('planSteps').after(note);

        drawRoute(steps[0].to, steps[0].from);

        $('map').scrollIntoView({
            behavior: 'smooth',
            block: 'center'
        });
    }

    /* ---------------- Events API ---------------- */

    async function loadEvents() {
        try {
            const response = await fetch('/api/v1/expo-event/get', {
                headers: {
                    Accept: 'application/json'
                },
                cache: 'no-store'
            });

            if (!response.ok) {
                throw new Error('Events API ' + response.status);
            }

            const data = await response.json();

            EVENTS = Array.isArray(data)
                ? data
                : Array.isArray(data?.data)
                    ? data.data
                    : [];

        } catch (error) {
            console.error('Mergab events:', error);
        }

        renderSelected();
        renderSuggestions();
        maybeSelectQuery();
    }

    /* ---------------- Search from Homepage ---------------- */

    function maybeSelectQuery() {
        if (didOpenQuery || !currentMap() || !ZONES.length) {
            return;
        }

        const params = new URLSearchParams(
            window.location.search
        );

        const query =
            params.get('zone') || params.get('q');

        if (!query) {
            didOpenQuery = true;
            return;
        }

        const term = query.trim().toLowerCase();

        const matched = ZONES.find(zone =>
            mappable(zone) &&
            (
                String(zone.name).toLowerCase().includes(term) ||
                String(zone.id) === term
            )
        ) || (
            EVENTS.find(event =>
                String(event.name).toLowerCase().includes(term)
            ) || {}
        ).zone;

        if (matched && mappable(matched)) {
            currentMap().select(String(matched.id));

            $('map').scrollIntoView({
                behavior: 'smooth',
                block: 'center'
            });

            didOpenQuery = true;
        }
    }

    /* ---------------- Live Map Data ---------------- */

    function onData(zones, connections, mapInstance, network) {
        ZONES = zones;
        ZONE_CONNECTIONS = Array.isArray(connections)
            ? connections
            : [];

        ROUTE_NETWORK = network || {
            facilities: [],
            walkPaths: [],
            accessPaths: []
        };

        if (selectedId && !byId(selectedId)) {
            selectedId = null;
        }

        $('mapStatus').textContent = zones.length
            ? t('loaded')
            : t('empty');

        if (activeZoneRouteId && myLocationPoint) {
            showInterZoneRoute(activeZoneRouteId);
        }

        renderLayers();
        renderCrowd();
        renderPickers();
        drawMyLocation();
        renderFacilityTargets();

        if (activeFacilityId) {
            showFacilityWalkingRoute(activeFacilityId);
        }
        renderSelected();
        renderSuggestions();

        maybeSelectQuery();

        loadEvents();
    }

    /* ---------------- Click Events ---------------- */

    function mapFromGps(latitude, longitude) {
        const anchors = ROUTE_NETWORK.facilities.filter(f =>
            [f.latitude, f.longitude, f.mapX, f.mapY].every(v =>
                v != null && Number.isFinite(Number(v))
            )
        );

        if (anchors.length < 3) return null;

        const lat0 = Number(anchors[0].latitude);
        const lon0 = Number(anchors[0].longitude);

        const geo = (lat, lon) => [
            (Number(lon) - lon0) * 111320 *
            Math.cos(lat0 * Math.PI / 180),
            (Number(lat) - lat0) * 111320
        ];

        const pts = anchors.map(f => ({
            geo: geo(f.latitude, f.longitude),
            map: [Number(f.mapX), Number(f.mapY)]
        }));

        let triangle = null;
        let bestArea = 0;

        for (let i = 0; i < pts.length; i++) {
            for (let j = i + 1; j < pts.length; j++) {
                for (let k = j + 1; k < pts.length; k++) {
                    const a = pts[i].geo;
                    const b = pts[j].geo;
                    const c = pts[k].geo;

                    const area = Math.abs(
                        (b[0] - a[0]) * (c[1] - a[1]) -
                        (b[1] - a[1]) * (c[0] - a[0])
                    );

                    if (area > bestArea) {
                        bestArea = area;
                        triangle = [pts[i], pts[j], pts[k]];
                    }
                }
            }
        }

        if (!triangle || bestArea < 100) return null;

        const [a, b, c] = triangle;

        const project = p => {
            const dx = b.geo[0] - a.geo[0];
            const dy = b.geo[1] - a.geo[1];
            const ex = c.geo[0] - a.geo[0];
            const ey = c.geo[1] - a.geo[1];
            const px = p[0] - a.geo[0];
            const py = p[1] - a.geo[1];
            const den = dx * ey - dy * ex;

            const v = (px * ey - py * ex) / den;
            const w = (dx * py - dy * px) / den;

            return [
                a.map[0] * (1 - v - w) + b.map[0] * v + c.map[0] * w,
                a.map[1] * (1 - v - w) + b.map[1] * v + c.map[1] * w
            ];
        };

        if (pts.some(p =>
            Math.hypot(
                project(p.geo)[0] - p.map[0],
                project(p.geo)[1] - p.map[1]
            ) > 1.5
        )) return null;

        const point = project(geo(latitude, longitude));
        return point.every(Number.isFinite) ? point : null;
    }

    $('gpsMyLocation').addEventListener('click', () => {
        const status = $('myLocationStatus');

        if (!navigator.geolocation || !window.isSecureContext) {
            status.textContent =
                'GPS يحتاج HTTPS أو localhost. استخدمي التحديد اليدوي.';
            return;
        }

        status.textContent =
            'جارٍ محاولة تحديد الموقع... ويمكنك التحديد يدويًا.';

        navigator.geolocation.getCurrentPosition(position => {
            if (position.coords.accuracy > 50) {
                status.textContent =
                    'دقة GPS غير كافية. حددي مكانك يدويًا.';
                return;
            }

            const point = mapFromGps(
                position.coords.latitude,
                position.coords.longitude
            );

            if (!point) {
                status.textContent =
                    'لا تتوفر معايرة GPS موثوقة للخريطة. حددي مكانك يدويًا.';
                return;
            }

            const [x, y] = point;

            const zone = ZONES.find(z => {
                const polygon = window.MergabMap.parsePoints(
                    z.boundaryPoints, 3
                );

                return polygon.length >= 3 &&
                    pointInZone(x, y, polygon);
            });

            if (!zone) {
                status.textContent =
                    'الموقع خارج المناطق المعروفة. حددي مكانك يدويًا.';
                return;
            }

            myLocationPoint = [
                Number(x.toFixed(2)),
                Number(y.toFixed(2))
            ];

            choosingMyLocation = false;

            $('startSel').value = String(zone.id);
            currentMap()?.setStart(String(zone.id));
            currentMap()?.clearRoute();

            $('routeNote').hidden = true;
            clearFacilityWalkingRoute();

            activeZoneRouteId = null;
            $('map').querySelector('#visitorInterZoneRoute')?.remove();

            renderFacilityTargets();
            drawMyLocation();

            status.textContent =
                `موقع GPS تقريبي داخل ${zone.name}. يمكنك تعديله يدويًا.`;

        }, () => {
            status.textContent =
                'تعذر تحديد GPS أو انتهت المهلة. اختاري موقعك يدويًا.';
        }, {
            enableHighAccuracy: true,
            timeout: 7000,
            maximumAge: 15000
        });
    });


    function bindZoneClicks(container, attribute) {
        $(container).addEventListener('click', event => {
            const button = event.target.closest(
                `[${attribute}]`
            );

            if (!button || button.disabled) return;

            const map = currentMap();

            if (!map) return;

            map.select(button.getAttribute(attribute));

            $('map').scrollIntoView({
                behavior: 'smooth',
                block: 'center'
            });
        });
    }

    /* ---------------- Initialize Map ---------------- */

    if (!window.MergabMap || !window.MirqabMap) {
        $('mapStatus').textContent = t('loadError');
        return;
    }

    translatePage();

    message('planSteps', t('emptyRoute'));


    // =====================================
    // MANUAL VISITOR LOCATION
    // =====================================

    let choosingMyLocation = false;
    let myLocationPoint = null;
    let mapPointerStart = null;

    function pointInZone(x, y, polygon) {
        let inside = false;

        for (let i = 0, j = polygon.length - 1;
             i < polygon.length; j = i++) {

            const [xi, yi] = polygon[i];
            const [xj, yj] = polygon[j];

            const cross = (x - xi) * (yj - yi) -
                (y - yi) * (xj - xi);

            if (Math.abs(cross) < 0.000001 &&
                x >= Math.min(xi, xj) &&
                x <= Math.max(xi, xj) &&
                y >= Math.min(yi, yj) &&
                y <= Math.max(yi, yj)) {
                return true;
            }

            if ((yi > y) !== (yj > y) &&
                x < (xj - xi) * (y - yi) / (yj - yi) + xi) {
                inside = !inside;
            }
        }

        return inside;
    }

    function drawMyLocation() {
        const svg = $('map').querySelector('.mqm-isvg');
        if (!svg) return;

        svg.querySelector('#visitorLocationPin')?.remove();
        if (!myLocationPoint) return;

        const pin = document.createElementNS(
            'http://www.w3.org/2000/svg', 'circle'
        );

        pin.setAttribute('id', 'visitorLocationPin');
        pin.setAttribute('cx', myLocationPoint[0]);
        pin.setAttribute('cy', myLocationPoint[1]);
        pin.setAttribute('r', '1.3');
        pin.setAttribute('fill', '#2563EB');
        pin.setAttribute('stroke', '#FFFFFF');
        pin.setAttribute('stroke-width', '0.45');
        pin.setAttribute('pointer-events', 'none');

        svg.appendChild(pin);
    }

    $('pickMyLocation').addEventListener('click', () => {
        choosingMyLocation = true;

        $('myLocationStatus').textContent =
            'اضغطي على مكان وقوفك داخل حدود المنطقة.';

        $('map').scrollIntoView({
            behavior: 'smooth',
            block: 'center'
        });
    });

    $('map').addEventListener('pointerdown', event => {
        mapPointerStart = [event.clientX, event.clientY];
    }, true);

    $('map').addEventListener('click', event => {
        if (!choosingMyLocation) return;

        const dragged = mapPointerStart &&
            Math.hypot(
                event.clientX - mapPointerStart[0],
                event.clientY - mapPointerStart[1]
            ) > 6;

        mapPointerStart = null;
        if (dragged) return;

        if (!event.target.closest('.mqm-img')) return;

        const stage = $('map').querySelector('.mqm-istage');
        if (!stage) return;

        const rect = stage.getBoundingClientRect();
        if (!rect.width || !rect.height) return;

        const x = (event.clientX - rect.left) / rect.width * 100;
        const y = (event.clientY - rect.top) / rect.height * 100;

        if (x < 0 || x > 100 || y < 0 || y > 100) return;

        const zone = ZONES.find(item => {
            const polygon = window.MergabMap.parsePoints(
                item.boundaryPoints, 3
            );

            return polygon.length >= 3 &&
                pointInZone(x, y, polygon);
        });

        if (!zone) {
            $('myLocationStatus').textContent =
                'الموقع خارج حدود المناطق. اختاري نقطة داخل المنطقة.';
            return;
        }

        myLocationPoint = [
            Number(x.toFixed(2)),
            Number(y.toFixed(2))
        ];

        choosingMyLocation = false;

        $('startSel').value = String(zone.id);
        currentMap()?.setStart(String(zone.id));
        currentMap()?.clearRoute();
        $('routeNote').hidden = true;
        clearFacilityWalkingRoute();

        activeZoneRouteId = null;
        $('map').querySelector('#visitorInterZoneRoute')?.remove();

        renderFacilityTargets();
        drawMyLocation();

        $('myLocationStatus').textContent =
            `تم تحديد موقعك داخل منطقة ${zone.name}.`;
    }, true);


    function findFacilityWalkingRoute(start, zoneKey, facility) {
        const parse = value => window.MergabMap.parsePoints(value);

        const walks = ROUTE_NETWORK.walkPaths
            .filter(w =>
                String(w.zoneId) === String(zoneKey) &&
                w.active !== false
            )
            .flatMap(w => {
                const points = parse(w.pathPoints);

                return points.slice(1).map((p, i) => ({
                    a: points[i],
                    b: p,
                    direction: w.direction || 'BOTH',
                    cuts: [0, 1]
                }));
            });

        if (!walks.length) return null;

        const distance = (a, b) =>
            Math.hypot(a[0] - b[0], a[1] - b[1]);

        const pointOn = (s, t) => [
            s.a[0] + (s.b[0] - s.a[0]) * t,
            s.a[1] + (s.b[1] - s.a[1]) * t
        ];

        function nearest(point) {
            let best = null;

            walks.forEach(s => {
                const dx = s.b[0] - s.a[0];
                const dy = s.b[1] - s.a[1];
                const length2 = dx * dx + dy * dy;

                const t = length2
                    ? Math.max(0, Math.min(1,
                        ((point[0] - s.a[0]) * dx +
                            (point[1] - s.a[1]) * dy) / length2
                    ))
                    : 0;

                const p = pointOn(s, t);
                const d = distance(point, p);

                if (!best || d < best.d) {
                    best = { s, t, p, d };
                }
            });

            return best;
        }

        // Only allow a short estimated approach to the walkway.
        const origin = nearest(start);

        if (!origin || origin.d > 1.5) return null;

        origin.s.cuts.push(origin.t);

        // Connect intersecting walking segments.
        for (let i = 0; i < walks.length; i++) {
            for (let j = i + 1; j < walks.length; j++) {
                const a = walks[i];
                const b = walks[j];

                const rx = a.b[0] - a.a[0];
                const ry = a.b[1] - a.a[1];
                const sx = b.b[0] - b.a[0];
                const sy = b.b[1] - b.a[1];

                const den = rx * sy - ry * sx;

                if (Math.abs(den) < 1e-9) continue;

                const qx = b.a[0] - a.a[0];
                const qy = b.a[1] - a.a[1];

                const t = (qx * sy - qy * sx) / den;
                const u = (qx * ry - qy * rx) / den;

                if (
                    t >= -1e-8 && t <= 1 + 1e-8 &&
                    u >= -1e-8 && u <= 1 + 1e-8
                ) {
                    a.cuts.push(Math.max(0, Math.min(1, t)));
                    b.cuts.push(Math.max(0, Math.min(1, u)));
                }
            }
        }

        // Facility connections must allow entering the facility.
        const entries = ROUTE_NETWORK.accessPaths
            .filter(a =>
                String(a.facilityId) === String(facility.id) &&
                a.active !== false &&
                a.direction !== 'FROM_FACILITY'
            )
            .map(a => ({
                path: a,
                points: parse(a.pathPoints)
            }))
            .filter(a => a.points.length >= 2)
            .map(a => ({
                ...a,
                attach: nearest(a.points[0])
            }))
            .filter(a =>
                a.attach &&
                a.attach.d <= 0.5 &&
                distance(
                    a.points.at(-1),
                    [Number(facility.mapX), Number(facility.mapY)]
                ) <= 0.5
            );

        if (!entries.length) return null;

        entries.forEach(entry => {
            entry.attach.s.cuts.push(entry.attach.t);
        });

        const graph = new Map();

        const key = p =>
            p.map(n => n.toFixed(5)).join(',');

        const add = (a, b) => {
            const u = key(a);
            const v = key(b);

            if (u === v) return;

            if (!graph.has(u)) graph.set(u, []);

            graph.get(u).push({
                to: v,
                d: distance(a, b)
            });
        };

        // Walking paths, respecting movement directions.
        for (const s of walks) {
            const cuts = s.cuts.slice()
                .sort((a, b) => a - b)
                .filter((value, i, all) =>
                    i === 0 || value - all[i - 1] > 1e-9
                );

            for (let i = 1; i < cuts.length; i++) {
                const a = pointOn(s, cuts[i - 1]);
                const b = pointOn(s, cuts[i]);

                if (s.direction !== 'REVERSE') {
                    add(a, b);
                }

                if (s.direction !== 'FORWARD') {
                    add(b, a);
                }
            }
        }

        add(start, origin.p);

        // Connect walkways to the actual facility entrances.
        for (const entry of entries) {
            const points = entry.points;

            add(entry.attach.p, points[0]);

            for (let i = 1; i < points.length; i++) {
                add(points[i - 1], points[i]);
            }

            add(
                points.at(-1),
                [Number(facility.mapX), Number(facility.mapY)]
            );
        }

        // Dijkstra shortest-path search.
        const source = key(start);

        const destination = key([
            Number(facility.mapX),
            Number(facility.mapY)
        ]);

        const best = new Map([[source, 0]]);
        const previous = new Map();
        const visited = new Set();

        while (true) {
            let current = null;
            let cost = Infinity;

            for (const [node, value] of best) {
                if (!visited.has(node) && value < cost) {
                    current = node;
                    cost = value;
                }
            }

            if (!current || current === destination) break;

            visited.add(current);

            for (const edge of graph.get(current) || []) {
                const alt = cost + edge.d;

                if (alt < (best.get(edge.to) ?? Infinity)) {
                    best.set(edge.to, alt);
                    previous.set(edge.to, current);
                }
            }
        }

        if (!best.has(destination)) return null;

        const points = [];
        let cursor = destination;

        while (cursor) {
            points.unshift(cursor.split(',').map(Number));
            cursor = previous.get(cursor);
        }

        return {
            points,
            length: best.get(destination)
        };
    }


    let activeFacilityId = null;

    function clearFacilityWalkingRoute() {
        activeFacilityId = null;

        $('map')
            .querySelector('#visitorWalkingRoute')
            ?.remove();

        $('facilityRouteStatus').textContent = '';
    }

    function renderFacilityTargets() {
        const select = $('facilityDest');
        const previous = select.value;
        const zone = byId($('startSel').value);

        select.replaceChildren(
            new Option('اختاري المرفق', '')
        );

        if (!myLocationPoint || !zone) return;

        const boundary = window.MergabMap.parsePoints(
            zone.boundaryPoints, 3
        );

        if (boundary.length < 3) return;

        ROUTE_NETWORK.facilities.forEach(facility => {
            if (
                facility.mapX == null ||
                facility.mapY == null
            ) return;

            if (!pointInZone(
                Number(facility.mapX),
                Number(facility.mapY),
                boundary
            )) return;

            select.add(new Option(
                facility.name,
                String(facility.id)
            ));
        });

        if ([...select.options].some(o => o.value === previous)) {
            select.value = previous;
        }
    }

    function showFacilityWalkingRoute(facilityId) {
        $('map')
            .querySelector('#visitorWalkingRoute')
            ?.remove();

        const facility = ROUTE_NETWORK.facilities.find(
            f => String(f.id) === String(facilityId)
        );

        if (!facility || !myLocationPoint) {
            clearFacilityWalkingRoute();
            return;
        }

        const result = findFacilityWalkingRoute(
            myLocationPoint,
            $('startSel').value,
            facility
        );

        if (!result) {
            activeFacilityId = null;

            $('facilityRouteStatus').textContent =
                'لا يوجد مسار مشي متصل لهذا المرفق، أو أن نقطة البداية بعيدة عن الممر.';
            return;
        }

        const svg = $('map').querySelector('.mqm-isvg');
        if (!svg) return;

        currentMap()?.clearRoute();

        activeZoneRouteId = null;
        $('map').querySelector('#visitorInterZoneRoute')?.remove();

        const path = document.createElementNS(
            'http://www.w3.org/2000/svg',
            'polyline'
        );

        path.id = 'visitorWalkingRoute';

        path.setAttribute(
            'points',
            result.points.map(p => p.join(',')).join(' ')
        );

        path.setAttribute('fill', 'none');
        path.setAttribute('stroke', '#2563EB');
        path.setAttribute('stroke-width', '1.1');
        path.setAttribute('stroke-linecap', 'round');
        path.setAttribute('stroke-linejoin', 'round');
        path.setAttribute('vector-effect', 'non-scaling-stroke');
        path.setAttribute('pointer-events', 'none');

        svg.appendChild(path);

        activeFacilityId = facility.id;
        drawMyLocation();

        $('facilityRouteStatus').textContent =
            `تم رسم المسار إلى ${facility.name}. ` +
            'الانتقال القصير من موقعك إلى أقرب ممر تقديري.';
    }

    $('findFacilityRouteBtn').addEventListener('click', () => {
        if (!myLocationPoint) {
            $('facilityRouteStatus').textContent =
                'حددي مكان وقوفك أولًا على الخريطة.';
            return;
        }

        if (!$('facilityDest').value) {
            $('facilityRouteStatus').textContent =
                'اختاري المرفق المطلوب.';
            return;
        }

        showFacilityWalkingRoute($('facilityDest').value);
    });
    $('facilityDest').addEventListener('change', () => {
        clearFacilityWalkingRoute();
        activeZoneRouteId = null;
        $('map').querySelector('#visitorInterZoneRoute')?.remove();
    });


    let activeZoneRouteId = null;

    function findInterZoneRoute(start, startZoneId, targetZoneId) {
        const parse = value => window.MergabMap.parsePoints(value);
        const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
        const key = p => p.map(n => n.toFixed(5)).join(',');

        const walks = ROUTE_NETWORK.walkPaths
            .filter(w => w.active !== false)
            .flatMap(w => {
                const pts = parse(w.pathPoints);
                return pts.slice(1).map((b, i) => ({
                    a: pts[i], b, zone: String(w.zoneId),
                    dir: w.direction || 'BOTH', cuts: [0, 1]
                }));
            });

        const projection = (p, s) => {
            const dx = s.b[0] - s.a[0], dy = s.b[1] - s.a[1];
            const len = dx * dx + dy * dy;
            const t = len ? Math.max(0, Math.min(1,
                ((p[0] - s.a[0]) * dx + (p[1] - s.a[1]) * dy) / len
            )) : 0;

            const point = [s.a[0] + t * dx, s.a[1] + t * dy];
            return { s, t, point, d: dist(p, point) };
        };

        const nearest = (p, zone) => walks
            .filter(s => s.zone === String(zone))
            .map(s => projection(p, s))
            .sort((a, b) => a.d - b.d)[0];

        const origin = nearest(start, startZoneId);
        if (!origin || origin.d > 1.5) return null;
        origin.s.cuts.push(origin.t);

        // Intersections inside the same zone
        for (let i = 0; i < walks.length; i++) {
            for (let j = i + 1; j < walks.length; j++) {
                const a = walks[i], b = walks[j];
                if (a.zone !== b.zone) continue;

                const rx = a.b[0] - a.a[0], ry = a.b[1] - a.a[1];
                const sx = b.b[0] - b.a[0], sy = b.b[1] - b.a[1];
                const den = rx * sy - ry * sx;
                if (Math.abs(den) < 1e-9) continue;

                const qx = b.a[0] - a.a[0], qy = b.a[1] - a.a[1];
                const t = (qx * sy - qy * sx) / den;
                const u = (qx * ry - qy * rx) / den;

                if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
                    a.cuts.push(t);
                    b.cuts.push(u);
                }
            }
        }

        // Connect only saved inter-zone paths to nearby walkways
        const links = [];

        for (const c of ZONE_CONNECTIONS) {
            const from = String(c.fromZone?.id ?? c.fromZoneId ?? '');
            const to = String(c.toZone?.id ?? c.toZoneId ?? '');
            let pts = parse(c.pathPoints);

            if (!from || !to || pts.length < 2) continue;

            const fromZone = byId(from), toZone = byId(to);
            if (!fromZone || !toZone ||
                !mappable(fromZone) || !mappable(toZone)) continue;

            const f = [Number(fromZone.mapX), Number(fromZone.mapY)];
            const t = [Number(toZone.mapX), Number(toZone.mapY)];

            if (dist(pts[0], f) + dist(pts.at(-1), t) >
                dist(pts[0], t) + dist(pts.at(-1), f)) {
                pts = [...pts].reverse();
            }

            const a = nearest(pts[0], from);
            const b = nearest(pts.at(-1), to);

            if (!a || !b || a.d > 0.5 || b.d > 0.5) continue;

            a.s.cuts.push(a.t);
            b.s.cuts.push(b.t);
            links.push({ pts, a, b, to });
        }

        if (!links.length) return null;

        const graph = new Map();

        const add = (a, b) => {
            const u = key(a), v = key(b);
            if (u === v) return;

            if (!graph.has(u)) graph.set(u, []);
            graph.get(u).push({ to: v, weight: dist(a, b) });
        };

        for (const s of walks) {
            const cuts = [...new Set(
                s.cuts.map(t => t.toFixed(9))
            )].map(Number).sort((a, b) => a - b);

            for (let i = 1; i < cuts.length; i++) {
                const point = v => [
                    s.a[0] + (s.b[0] - s.a[0]) * v,
                    s.a[1] + (s.b[1] - s.a[1]) * v
                ];

                const a = point(cuts[i - 1]);
                const b = point(cuts[i]);

                if (s.dir !== 'REVERSE') add(a, b);
                if (s.dir !== 'FORWARD') add(b, a);
            }
        }

        add(start, origin.point);

        const goals = new Set();

        for (const c of links) {
            add(c.a.point, c.pts[0]);

            for (let i = 1; i < c.pts.length; i++) {
                add(c.pts[i - 1], c.pts[i]);
            }

            add(c.pts.at(-1), c.b.point);

            if (c.to === String(targetZoneId)) {
                goals.add(key(c.pts.at(-1)));
            }
        }

        if (!goals.size) return null;

        // Shortest route using Dijkstra
        const costs = new Map([[key(start), 0]]);
        const prev = new Map();
        const done = new Set();

        while (true) {
            let u = null, cheapest = Infinity;

            for (const [id, cost] of costs) {
                if (!done.has(id) && cost < cheapest) {
                    u = id;
                    cheapest = cost;
                }
            }

            if (!u) break;

            if (goals.has(u)) {
                const points = [];

                for (let cursor = u; cursor; cursor = prev.get(cursor)) {
                    points.unshift(cursor.split(',').map(Number));
                }

                return { points, length: cheapest };
            }

            done.add(u);

            for (const edge of graph.get(u) || []) {
                const next = cheapest + edge.weight;

                if (next < (costs.get(edge.to) ?? Infinity)) {
                    costs.set(edge.to, next);
                    prev.set(edge.to, u);
                }
            }
        }

        return null;
    }

    function showInterZoneRoute(targetId) {
        $('map').querySelector('#visitorInterZoneRoute')?.remove();

        if (!myLocationPoint) return null;

        const result = findInterZoneRoute(
            myLocationPoint,
            $('startSel').value,
            targetId
        );

        if (!result) {
            activeZoneRouteId = null;
            return null;
        }

        currentMap()?.clearRoute();

        const svg = $('map').querySelector('.mqm-isvg');
        if (!svg) return null;

        const line = document.createElementNS(
            'http://www.w3.org/2000/svg', 'polyline'
        );

        line.id = 'visitorInterZoneRoute';
        line.setAttribute(
            'points',
            result.points.map(p => p.join(',')).join(' ')
        );

        Object.entries({
            fill: 'none',
            stroke: '#2563EB',
            'stroke-width': '1.15',
            'stroke-linecap': 'round',
            'stroke-linejoin': 'round',
            'vector-effect': 'non-scaling-stroke',
            'pointer-events': 'none'
        }).forEach(([name, value]) => line.setAttribute(name, value));

        svg.appendChild(line);
        drawMyLocation();

        activeZoneRouteId = String(targetId);

        const meters = Math.round(result.length * 8);

        return {
            best: {
                meters,
                minutes: Math.max(1, Math.ceil(meters / 75))
            }
        };
    }


    bindZoneClicks('layers', 'data-zone');
    bindZoneClicks('crowd', 'data-zone');
    bindZoneClicks('sugList', 'data-zone');

    $('goBtn').addEventListener(
        'click',
        showRouteToSelected
    );

    $('pickZones').addEventListener('click', event => {
        const button = event.target.closest('[data-pick]');

        if (!button) return;

        const id = button.dataset.pick;

        if (picked.has(id)) {
            picked.delete(id);
        } else {
            picked.add(id);
        }

        button.setAttribute(
            'aria-pressed',
            String(picked.has(id))
        );
    });

    $('startSel').addEventListener('change', event => {
        myLocationPoint = null;
        choosingMyLocation = false;
        drawMyLocation();
        clearFacilityWalkingRoute();
        activeZoneRouteId = null;
        $('map').querySelector('#visitorInterZoneRoute')?.remove();
        renderFacilityTargets();

        currentMap()?.setStart(event.target.value);
        currentMap()?.clearRoute();
        $('routeNote').hidden = true;

        $('myLocationStatus').textContent =
            'تم تغيير منطقة البداية. يمكنك تحديد موقعك الدقيق على الخريطة.';
    });

    $('planForm').addEventListener('submit', buildPlan);

    $('planSteps').addEventListener('click', event => {
        const button = event.target.closest('[data-step-to]');

        if (!button) return;

        drawRoute(
            button.dataset.stepTo,
            button.dataset.stepFrom
        );

        $('map').scrollIntoView({
            behavior: 'smooth',
            block: 'center'
        });
    });

    /* ---------------- Backend Integration ---------------- */

    controller = window.MergabMap.mount('#map', {
        imageSrc: '/img/map/expo-map-concept.jpg',
        hideLocation: true,

        refreshMs: 30000,

        onSelect(info, zone) {
            selectedId = zone
                ? zoneId(zone)
                : info?.id == null
                    ? null
                    : String(info.id);

            $('routeNote').hidden = true;

            renderSelected();
        },

        onData,

        onError(error) {
            console.warn('Map sync failed:', error);

            $('mapStatus').textContent = t('loadError');
        }
    });

    /* ---------------- Language Change ---------------- */

    document.addEventListener(
        'mergab:languageChanged',
        () => {
            translatePage();
            renderLayers();
            renderSelected();
            renderSuggestions();
            renderPickers();
            renderCrowd();

            controller?.refresh();
        }
    );

})();