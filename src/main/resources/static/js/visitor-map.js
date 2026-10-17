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
            noStart: 'اختاري نقطة بداية من القائمة.',
            calmest: 'الأهدأ',
            fastest: 'الأسرع',
            bestRoute: 'المسار الأمثل',
            recommended: 'موصى به',
            sameRoute: 'الأسرع هو الأهدأ أيضًا',
            avoids: 'يتجنب',
            headTo: 'اتجه نحو',
            yourDest: 'وجهتك',
            startNav: 'ابدأ الملاحة',
            stopNav: 'إنهاء',
            arrived: 'وصلت إلى',
            remaining: 'متبقي',
            meters: 'م',
            whereTo: 'إلى أين تريد الذهاب؟',
            whereToSub: 'اختر وجهتك ونرسم لك أذكى مسار، ونبعدك عن الزحام لحظة بلحظة.',
            myLocation: 'موقعي الحالي',
            pickExact: 'حدد مكاني على الخريطة',
            zonesLbl: 'المناطق',
            nearestLbl: 'الأقرب إليّ',
            go: 'اذهب',
            startFromPanel: 'نقطة البداية هي «موقعي الحالي» بجانب الخريطة.',
            needLocation: 'حدد مكانك على الخريطة أولًا عشان نحسب أقرب مرفق.',
            noNearby: 'ما فيه مرفق متصل بممرات منطقتك من هذا النوع.',
            noFacilities: 'ما فيه مرافق مضافة حاليًا.',
            youAreHereZone: 'أنت هنا'
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
            noStart: 'Choose a starting zone.',
            calmest: 'Calmest',
            fastest: 'Fastest',
            bestRoute: 'Best route',
            recommended: 'Recommended',
            sameRoute: 'Fastest is also the calmest',
            avoids: 'Avoids',
            headTo: 'Head to',
            yourDest: 'Destination',
            startNav: 'Start navigation',
            stopNav: 'End',
            arrived: 'You arrived at',
            remaining: 'left',
            meters: 'm',
            whereTo: 'Where do you want to go?',
            whereToSub: 'Pick a destination and we draw the smartest route away from the crowds.',
            myLocation: 'My location',
            pickExact: 'Pin me on the map',
            zonesLbl: 'Zones',
            nearestLbl: 'Nearest to me',
            go: 'Go',
            startFromPanel: 'Your starting point is “My location” next to the map.',
            needLocation: 'Pin your exact spot on the map first to find the nearest facility.',
            noNearby: 'No facility of this type is connected to your zone walkways.',
            noFacilities: 'No facilities have been added yet.',
            youAreHereZone: 'You are here'
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

    const percent = z => {
        if (z?.currentCount == null ||
            Number(z.capacity) <= 0) {
            return null;
        }

        return Math.round(
            Number(z.currentCount) / Number(z.capacity) * 100
        );
    };

    const crowdType = z => {
        const p = percent(z);
        if (p === null) return 'unknown';

        if (p >= 90) return 'critical';
        if (p >= 75) return 'high';
        if (p >= 50) return 'medium';

        return 'low';
    };

    const crowdName = z => ({
        unknown: lang() === 'ar' ? 'غير متوفر' : 'Unavailable',
        critical: t('high'),
        high: t('busy'),
        medium: t('medium'),
        low: t('low')
    })[crowdType(z)];

    const crowdColor = z => ({
        unknown: '#94A3B8',
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

        const start = $('startSel')?.value;

        $('layers').innerHTML = ZONES.map(zone => {
            const canShow = mappable(zone);
            const here = String(zone.id) === String(start);

            return `
                <button
                    type="button"
                    class="vm-dest ${here ? 'is-here' : ''}"
                    data-zone="${escapeHtml(zone.id)}"
                    ${canShow ? '' : 'disabled'}
                    aria-pressed="${selectedId === zoneId(zone)}"
                    title="${escapeHtml(canShow ? crowdName(zone) : t('notMapped'))}">

                    <span class="material-symbols-rounded" aria-hidden="true">
                        ${here ? 'my_location' : 'location_on'}
                    </span>

                    <span class="vm-dest-name">${escapeHtml(zone.name)}</span>

                    <i class="vm-dot" style="--c:${crowdColor(zone)}"></i>
                </button>
            `;
        }).join('');
    }

    /* ---------------- Nearest facility chips ---------------- */

    function renderQuickChips() {
        const box = $('vmQuick');
        const looks = window.MirqabMap?.FACILITY_LOOK || {};
        const types = [...new Set(
            ROUTE_NETWORK.facilities
                .filter(f => f.mapX != null && f.mapY != null)
                .map(f => f.type || 'DEFAULT')
        )];

        if (!types.length) {
            box.innerHTML = `<p class="map-empty">${escapeHtml(t('noFacilities'))}</p>`;
            return;
        }

        box.innerHTML = types.map(type => {
            const look = looks[type] || looks.DEFAULT || { color: '#0F614B', label: { ar: type, en: type }, icon: '' };

            return `
                <button type="button" class="vm-qchip" data-ftype="${escapeHtml(type)}"
                        style="--c:${look.color}">
                    <span class="vm-qchip-ic">${look.icon}</span>
                    ${escapeHtml(look.label?.[lang()] || look.label?.ar || type)}
                </button>`;
        }).join('');
    }

    $('vmQuick').addEventListener('click', event => {
        const chip = event.target.closest('[data-ftype]');
        if (!chip) return;

        $('vmQuick').querySelectorAll('.vm-qchip')
            .forEach(item => item.classList.toggle('is-on', item === chip));

        if (!myLocationPoint) {
            $('facilityRouteStatus').textContent = t('needLocation');
            $('pickMyLocation').classList.add('is-pulse');
            setTimeout(() => $('pickMyLocation').classList.remove('is-pulse'), 2400);
            return;
        }

        const zoneKey = $('startSel').value;
        let best = null;

        ROUTE_NETWORK.facilities
            .filter(f => (f.type || 'DEFAULT') === chip.dataset.ftype)
            .forEach(facility => {
                const result = findFacilityWalkingRoute(myLocationPoint, zoneKey, facility);

                if (result && (!best || result.length < best.result.length)) {
                    best = { facility, result };
                }
            });

        if (!best) {
            $('facilityRouteStatus').textContent = t('noNearby');
            return;
        }

        if ([...$('facilityDest').options].some(o => o.value === String(best.facility.id))) {
            $('facilityDest').value = String(best.facility.id);
        }

        showFacilityWalkingRoute(best.facility.id);
    });

    /* ---------------- Crowd Levels ---------------- */

    function renderCrowd() {
        if (!ZONES.length) {
            message('crowd', t('missing'));
            return;
        }

        const sorted = ZONES.slice().sort(
            (a, b) => (percent(b) ?? -1) - (percent(a) ?? -1)
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
                   ${percent(zone) == null ? '—' : percent(zone) + '%'}
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
            crowdName(zone) + ' · ' +
            (percent(zone) == null ? '—' : percent(zone) + '%');

        $('sCount').textContent =
            zone.currentCount == null ? '—' : number(zone.currentCount);
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
            .filter(z => percent(z) !== null)
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

        const route = map.showRoute(String(targetId), {
            from: String(from),
            compare: true,
            use: routeChoice
        });

        if (route?.shown) {
            setNavRoute(route.shown.points, route.to?.name);
        }

        return route;
    }

    /* ---------------- Route Options (fastest / calmest) ---------------- */

    let routeChoice = 'best';

    function crowdLevelOf(zoneKey) {
        const info = currentMap()?.getZone(zoneKey);
        return info?.level || 'unknown';
    }

    function routeCard(kind, route, title, icon, recommended) {
        const busy = route.passes?.length
            ? route.passes.join('، ')
            : '';

        return `
            <button type="button"
                    class="route-opt ${routeChoice === kind ? 'is-on' : ''}"
                    data-route-kind="${kind}">
                ${recommended ? `<span class="route-opt-badge">${escapeHtml(t('recommended'))}</span>` : ''}
                <span class="route-opt-title">
                    <span class="material-symbols-rounded" aria-hidden="true">${icon}</span>
                    ${escapeHtml(title)}
                </span>
                <b class="route-opt-eta">${number(route.minutes)} <small>${escapeHtml(t('minutes'))}</small></b>
                <small class="route-opt-meta">${number(route.meters)} ${escapeHtml(t('meters'))}${busy ? ' · ' + escapeHtml(busy) : ''}</small>
            </button>`;
    }

    function renderRoutePanel(route) {
        const note = $('routeNote');
        note.hidden = false;

        if (!route) {
            note.textContent = t('noConnections');
            return;
        }

        // Routes from the visitor's exact location (walkway graph)
        if (!route.from) {
            note.innerHTML = `
                <div class="route-opts">
                    ${routeCard('best', route.best, t('bestRoute'), 'route', true)}
                </div>
                ${navButtonHtml()}`;
            return;
        }

        const best = route.best;
        const direct = route.direct;
        const steps = (route.shown || best).nodes || [];

        const cards = direct
            ? routeCard('best', best, t('calmest'), 'spa', true) +
              routeCard('direct', direct, t('fastest'), 'bolt', false)
            : routeCard('best', best, t('bestRoute'), 'verified', true) +
              `<p class="route-opt-same">
                   <span class="material-symbols-rounded" aria-hidden="true">check_circle</span>
                   ${escapeHtml(t('sameRoute'))}
               </p>`;

        const stepItems = steps.slice(1).map((key, index, all) => {
            const info = currentMap()?.getZone(key);
            const last = index === all.length - 1;
            const level = crowdLevelOf(key);

            return `
                <li class="route-step ${last ? 'is-last' : ''} lvl-${level}"
                    style="animation-delay:${index * 80}ms">
                    ${escapeHtml(last ? t('yourDest') : t('headTo'))}
                    <b>${escapeHtml(info?.name || '')}</b>
                    ${info?.levelText ? `<small>${escapeHtml(info.levelText)}${info.percent != null ? ' · ' + info.percent + '%' : ''}</small>` : ''}
                </li>`;
        }).join('');

        note.innerHTML = `
            <div class="route-opts">${cards}</div>
            ${route.avoided?.length && routeChoice === 'best'
                ? `<p class="route-avoid">${escapeHtml(t('avoids'))}: ${escapeHtml(route.avoided.join('، '))}</p>`
                : ''}
            <ol class="route-steps">${stepItems}</ol>
            ${navButtonHtml()}
            <p class="route-hint">${escapeHtml(t('routeHint'))}</p>`;
    }

    function navButtonHtml() {
        return `
            <button type="button" class="btn-go" data-nav="start">
                <span class="material-symbols-rounded" aria-hidden="true">navigation</span>
                ${escapeHtml(t('startNav'))}
            </button>`;
    }

    $('routeNote').addEventListener('click', event => {
        if (event.target.closest('[data-nav="start"]')) {
            startNavigation();
            $('map').scrollIntoView({ behavior: 'smooth', block: 'center' });
            return;
        }

        const card = event.target.closest('[data-route-kind]');
        if (!card || !selectedId) return;

        routeChoice = card.dataset.routeKind;
        showRouteToSelected();
    });

    /* ---------------- Navigation Mode ---------------- */

    let navRoute = null;
    let navTimer = null;

    function setNavRoute(points, name) {
        navRoute = points && points.length > 1
            ? { points, name: name || '' }
            : null;

        renderNavButton();
    }

    function renderNavButton() {
        const host = $('map');
        let bar = host.querySelector('.mg-navbar');

        const hasRoute = navRoute &&
            host.querySelector('.mqm-rt');

        if (!hasRoute) {
            bar?.remove();
            return;
        }

        if (!bar) {
            bar = document.createElement('div');
            bar.className = 'mg-navbar';
            host.appendChild(bar);
        }

        bar.innerHTML = `
            <button type="button" class="mg-navbtn" data-nav="start">
                <span class="material-symbols-rounded" aria-hidden="true">navigation</span>
                ${escapeHtml(t('startNav'))}
            </button>`;
    }

    function pointAt(points, lengths, distance) {
        let i = 1;
        while (i < lengths.length - 1 && lengths[i] < distance) i++;

        const segment = lengths[i] - lengths[i - 1] || 1;
        const k = Math.max(0, Math.min(1, (distance - lengths[i - 1]) / segment));
        const a = points[i - 1];
        const b = points[i];

        return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];
    }

    function stopNavigation(arrived) {
        if (navTimer) cancelAnimationFrame(navTimer);
        navTimer = null;

        const host = $('map');
        host.querySelector('.mg-navhud')?.remove();
        host.querySelector('#visitorNavWalker')?.remove();

        const map = currentMap();
        map?.setFollow?.(false);

        if (arrived && navRoute) {
            const toast = document.createElement('div');
            toast.className = 'mg-navtoast';
            toast.innerHTML = `<span class="material-symbols-rounded" aria-hidden="true">celebration</span>`;
            toast.append(` ${t('arrived')} ${navRoute.name}`);
            host.appendChild(toast);
            setTimeout(() => toast.remove(), 3200);
        }

        setTimeout(() => map?.resetView?.(), arrived ? 900 : 0);
        renderNavButton();
    }

    function startNavigation() {
        const map = currentMap();
        if (!navRoute || !map) return;

        const points = navRoute.points;
        const host = $('map');
        const svg = host.querySelector('.mqm-isvg');
        const ratio = svg?.clientWidth && svg?.clientHeight
            ? svg.clientWidth / svg.clientHeight : 1.5;

        // Cumulative lengths (aspect-corrected)
        const lengths = [0];
        for (let i = 1; i < points.length; i++) {
            lengths.push(lengths[i - 1] + Math.hypot(
                (points[i][0] - points[i - 1][0]) * ratio,
                points[i][1] - points[i - 1][1]
            ));
        }

        const total = lengths.at(-1);
        const duration = Math.max(6000, Math.min(18000, total * 220));
        const totalMinutes = Math.max(1, Math.round(total * 8 / 75));

        host.querySelector('.mg-navbar')?.remove();

        const hud = document.createElement('div');
        hud.className = 'mg-navhud';
        hud.innerHTML = `
            <span class="mg-navhud-ic material-symbols-rounded" aria-hidden="true">navigation</span>
            <div><b></b><small></small></div>
            <button type="button" data-nav="stop" aria-label="${escapeHtml(t('stopNav'))}">
                <span class="material-symbols-rounded" aria-hidden="true">close</span>
            </button>
            <i class="mg-navhud-bar"><i></i></i>`;
        host.appendChild(hud);

        hud.querySelector('b').textContent = `${t('headTo')} ${navRoute.name}`;

        map.set3D?.(true);
        map.setFollow?.(true);

        const started = performance.now();
        let lastFocus = 0;

        function frame(now) {
            const progress = Math.min(1, (now - started) / duration);
            const point = pointAt(points, lengths, progress * total);

            host.querySelector('#visitorNavWalker')?.remove();
            window.MergabMap.drawLocationPin(host, point, 'visitorNavWalker');

            if (now - lastFocus > 380) {
                lastFocus = now;
                map.focusOn?.(point[0], point[1], { zoom: 2.1 });
            }

            hud.querySelector('small').textContent =
                `${number(Math.max(1, Math.round(totalMinutes * (1 - progress))))} ${t('minutes')} ${t('remaining')}`;
            hud.querySelector('.mg-navhud-bar > i').style.width =
                (progress * 100).toFixed(1) + '%';

            if (progress >= 1) {
                stopNavigation(true);
                return;
            }

            navTimer = requestAnimationFrame(frame);
        }

        navTimer = requestAnimationFrame(frame);
    }

    $('map').addEventListener('click', event => {
        const action = event.target.closest('[data-nav]');
        if (!action) return;

        event.stopPropagation();

        if (action.dataset.nav === 'start') startNavigation();
        else stopNavigation(false);
    });

    function showRouteToSelected() {
        if (!selectedId) return;

        const route = drawRoute(selectedId);

        renderRoutePanel(route);
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
        renderQuickChips();

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
            renderLayers();
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

        window.MergabMap.drawLocationPin(
            $('map'),
            myLocationPoint,
            'visitorLocationPin'
        );
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

        // Works for both flat and tilted (3D) map views
        const mapPoint = currentMap()?.toMapPoint?.(
            event.clientX,
            event.clientY
        );

        const rect = stage.getBoundingClientRect();
        if (!mapPoint && (!rect.width || !rect.height)) return;

        const x = mapPoint
            ? mapPoint[0]
            : (event.clientX - rect.left) / rect.width * 100;
        const y = mapPoint
            ? mapPoint[1]
            : (event.clientY - rect.top) / rect.height * 100;

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
            renderLayers();
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

        window.MergabMap.drawRouteLine($('map'), result.points, {
            id: 'visitorWalkingRoute',
            startDot: false,
            destLabel: facility.name
        });

        setNavRoute(result.points, facility.name);

        const meters = Math.round(result.length * 8);
        renderRoutePanel({
            best: {
                meters,
                minutes: Math.max(1, Math.ceil(meters / 75)),
                passes: [facility.name]
            }
        });

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

        window.MergabMap.drawRouteLine($('map'), result.points, {
            id: 'visitorInterZoneRoute',
            startDot: false
        });

        setNavRoute(result.points, byId(targetId)?.name);
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


    // Destination grid: pick a zone → draw the route right away
    $('layers').addEventListener('click', event => {
        const button = event.target.closest('[data-zone]');
        if (!button || button.disabled) return;

        const map = currentMap();
        if (!map) return;

        const id = button.dataset.zone;
        map.select(id);
        selectedId = id;

        if (id === $('startSel').value && !myLocationPoint) {
            $('routeNote').hidden = true;
            return;
        }

        routeChoice = 'best';
        showRouteToSelected();
        renderLayers();
    });
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
        renderLayers();
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

        // Visitor look: daylight theme + tilted 3D view
        theme: 'visitor',
        perspective: true,

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