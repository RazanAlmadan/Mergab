
/* Mergab homepage interactive map — homepage only */
(() => {
    'use strict';

    const $ = id => document.getElementById(id);

    const safe = v => String(v ?? '').replace(
        /[&<>"']/g,
        ch => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        }[ch])
    );

    const ar = () => document.documentElement.lang !== 'en';
    const tr = (a, e) => ar() ? a : e;
    const id = v => String(v?.id ?? v ?? '');

    const valid = p =>
        p?.mapX != null &&
        p?.mapY != null &&
        Number.isFinite(+p.mapX) &&
        Number.isFinite(+p.mapY) &&
        +p.mapX >= 0 &&
        +p.mapX <= 100 &&
        +p.mapY >= 0 &&
        +p.mapY <= 100;

    const kind = {
        RESTROOM: ['wc', 'دورة مياه', 'Restroom'],
        PRAYER_ROOM: ['mosque', 'مصلى', 'Prayer room'],
        ENTRANCE: ['login', 'مدخل', 'Entrance'],
        EXIT: ['logout', 'مخرج', 'Exit']
    };

    const typeName = f =>
        kind[f.type]?.[ar() ? 1 : 2] ||
        f.type ||
        tr('مرفق', 'Facility');

    let zones = [];
    let connections = [];
    let facilities = [];
    let events = [];
    let selected = null;
    let mapControl = null;

    const zoneById = zoneId =>
        zones.find(z => id(z) === String(zoneId));

    const status = msg => {
        $('homeMapStatus').textContent = msg;
    };

    const routeStatus = msg => {
        $('homeMapRouteStatus').textContent = msg;
    };

    async function list(path) {
        const response = await fetch('/api/v1' + path, {
            credentials: 'same-origin',
            cache: 'no-store',
            headers: {
                Accept: 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(path + ' HTTP ' + response.status);
        }

        const data = await response.json();

        return Array.isArray(data)
            ? data
            : Array.isArray(data?.data)
                ? data.data
                : Array.isArray(data?.content)
                    ? data.content
                    : [];
    }

    function selectZone(zoneId, fromMap = false) {
        const z = zoneById(zoneId);

        if (!z || !valid(z)) return;

        selected = id(z);

        if (!fromMap) {
            mapControl?.getMap()?.select(selected);
        }

        const count = z.currentCount;

        const available =
            count != null &&
            Number(z.capacity) > 0;

        const percent = available
            ? Math.round(Number(count) / Number(z.capacity) * 100)
            : null;

        $('homeMapSelected').textContent = available
            ? `${z.name} — ${tr('الإشغال الحالي', 'Live occupancy')}: ` +
            `${percent}% (${count}/${z.capacity})`
            : `${z.name} — ${tr(
                'بيانات الازدحام غير متاحة مؤقتًا',
                'Live occupancy unavailable'
            )}`;

        $('homeMapDestination').value = selected;
    }

    function fillSelectors() {
        const all = zones.filter(valid);
        const start = $('homeMapStart');
        const dest = $('homeMapDestination');

        const prevStart = start.value;
        const prevDest = dest.value;

        const options = all.map(z => `
      <option value="${safe(z.id)}">
        ${safe(z.name)}
      </option>
    `).join('');

        start.innerHTML = options;
        dest.innerHTML = options;

        if (all.some(z => id(z) === prevStart)) {
            start.value = prevStart;
        }

        if (all.some(z => id(z) === prevDest)) {
            dest.value = prevDest;
        }

        if (selected && all.some(z => id(z) === selected)) {
            dest.value = selected;
        }

        if (start.value) {
            mapControl?.getMap()?.setStart(start.value);
        }
    }

    async function loadFacilities() {
        const responses = await Promise.allSettled(
            zones.map(z =>
                list(
                    '/facility/get-by-zone/' +
                    encodeURIComponent(z.id)
                )
            )
        );

        facilities = responses.flatMap((response, i) =>
            response.status === 'fulfilled'
                ? response.value.map(f => ({
                    ...f,
                    zoneId: zones[i].id
                }))
                : []
        );

        renderFacilities();
    }

    function renderFacilities() {
        const stage = $('homeExpoMap')
            ?.querySelector('.mqm-istage');

        if (!stage) return;

        stage.querySelector('.home-facility-layer')?.remove();

        if (!$('homeMapFacilitiesToggle').checked) return;

        const layer = document.createElement('div');
        layer.className = 'home-facility-layer';

        facilities.filter(valid).forEach(f => {
            const btn = document.createElement('button');

            btn.type = 'button';
            btn.className = 'home-facility-dot';

            btn.style.left = +f.mapX + '%';
            btn.style.top = +f.mapY + '%';

            btn.title =
                (f.name || typeName(f)) + ' — ' + typeName(f);

            btn.setAttribute('aria-label', btn.title);

            const icon = document.createElement('span');
            icon.className = 'material-symbols-rounded';

            icon.textContent =
                kind[f.type]?.[0] || 'location_on';

            btn.appendChild(icon);

            btn.addEventListener('click', e => {
                e.stopPropagation();

                selectZone(f.zoneId);

                routeStatus(
                    `${f.name || typeName(f)} — ${tr(
                        'الموقع داخل المنطقة محدد؛ المسار المعروض يصل للمنطقة فقط، وليس لباب المرفق.',
                        'Located inside the zone; directions reach the zone, not the facility entrance.'
                    )}`
                );
            });

            layer.appendChild(btn);
        });

        stage.appendChild(layer);
    }

    function search() {
        const query = $('homeMapSearch')
            .value.trim().toLocaleLowerCase();

        const results = $('homeMapResults');

        if (!query) {
            results.replaceChildren();
            return;
        }

        const matches = [
            ...zones
                .filter(z =>
                    String(z.name || '')
                        .toLocaleLowerCase()
                        .includes(query)
                )
                .map(z => ({
                    type: 'zone',
                    zoneId: id(z),
                    name: z.name,
                    tag: tr('منطقة', 'Zone')
                })),

            ...facilities
                .filter(f =>
                    String(f.name || '')
                        .toLocaleLowerCase()
                        .includes(query) ||
                    typeName(f)
                        .toLocaleLowerCase()
                        .includes(query)
                )
                .map(f => ({
                    type: 'facility',
                    zoneId: id(f.zoneId),
                    name: f.name || typeName(f),
                    tag: typeName(f)
                })),

            ...events
                .filter(e =>
                    String(e.name || '')
                        .toLocaleLowerCase()
                        .includes(query) &&
                    e.zone?.id != null
                )
                .map(e => ({
                    type: 'event',
                    zoneId: id(e.zone),
                    name: e.name,
                    tag: tr('فعالية', 'Event')
                }))
        ].slice(0, 12);

        results.innerHTML = matches.length
            ? matches.map(m => `
          <button
            type="button"
            class="home-map-result"
            data-home-zone="${safe(m.zoneId)}">
              ${safe(m.name)}
              <small>${safe(m.tag)}</small>
          </button>
        `).join('')
            : `<span class="home-map-status">
           ${tr(
                'لا توجد نتيجة مطابقة',
                'No matching results'
            )}
         </span>`;
    }

    function showRoute(e) {
        e.preventDefault();

        const instance = mapControl?.getMap();

        const from = $('homeMapStart').value;
        const to = $('homeMapDestination').value;

        if (!instance || !from || !to) {
            routeStatus(
                tr(
                    'انتظري تحميل المناطق',
                    'Wait for zones to load'
                )
            );
            return;
        }

        if (from === to) {
            routeStatus(
                tr(
                    'أنتِ عند الوجهة المختارة',
                    'You are already at the destination'
                )
            );
            return;
        }

        // Use existing map engine and stored connections.
        instance.setStart(from);

        const result = instance.showRoute(to, {
            from,
            compare: false
        });

        if (!result?.best) {
            routeStatus(
                tr(
                    'ما فيه مسار متصل بين المنطقتين',
                    'No connected route found'
                )
            );
            return;
        }

        routeStatus(
            `${tr('المسار التقريبي', 'Estimated route')}: ` +
            `${Math.round(result.best.meters)} m · ` +
            `${Math.round(result.best.minutes)} ` +
            `${tr('دقيقة', 'min')}. ` +
            tr(
                'مبني على اتصالات المناطق؛ لا يمثل ملاحة دقيقة داخل المرافق.',
                'Based on zone connections, not indoor facility navigation.'
            )
        );
    }

    async function onMapData(data, saved, instance) {
        zones = data;
        connections = saved;

        fillSelectors();

        if (selected && zoneById(selected)) {
            selectZone(selected);
        }

        status(
            tr(
                'الخريطة متصلة ببيانات المناطق والمسارات المسجّلة',
                'Map connected to recorded zones and connections'
            )
        );

        renderFacilities();

        const results = await Promise.allSettled([
            list('/expo-event/get'),
            loadFacilities()
        ]);

        events = results[0].status === 'fulfilled'
            ? results[0].value
            : [];

        search();
    }

    if (!window.MergabMap || !window.MirqabMap) {
        status(
            tr(
                'تعذر تحميل محرك الخريطة',
                'Map library could not load'
            )
        );
        return;
    }

    $('homeMapPlanner').addEventListener(
        'submit',
        showRoute
    );

    $('homeMapStart').addEventListener('change', e => {
        mapControl?.getMap()?.setStart(e.target.value);
    });

    $('homeMapFacilitiesToggle').addEventListener(
        'change',
        renderFacilities
    );

    $('homeMapSearch').addEventListener(
        'input',
        search
    );

    $('homeMapResults').addEventListener('click', e => {
        const button = e.target.closest('[data-home-zone]');

        if (!button) return;

        selectZone(button.dataset.homeZone);
        $('homeMapResults').replaceChildren();
    });

    mapControl = window.MergabMap.mount('#homeExpoMap', {
        imageSrc: '/img/map/expo-map-concept.jpg',
        refreshMs: 30000,
        hideLocation: true,

        onSelect(info, zone) {
            if (zone) {
                selectZone(zone.id, true);
            }
        },

        onData: onMapData,

        onError(error) {
            console.error('Homepage map:', error);

            status(
                tr(
                    'تعذر تحديث الخريطة',
                    'Could not refresh map'
                )
            );
        }
    });

    document.addEventListener(
        'mergab:languageChanged',
        () => {
            search();

            if (selected) {
                selectZone(selected);
            }
        }
    );
})();
