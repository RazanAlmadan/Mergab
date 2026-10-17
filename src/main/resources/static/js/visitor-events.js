
/* ==========================================
   MERGAB | VISITOR EVENTS
   ========================================== */

document.addEventListener('DOMContentLoaded', () => {
    'use strict';

    const $ = id => document.getElementById(id);

    // Translations
    const words = {
        ar: {
            title: 'فعاليات إكسبو',
            description: 'اكتشف الفعاليات القادمة واختر وجهتك داخل المعرض.',
            search: 'ابحث عن فعالية أو منطقة...',
            zones: 'جميع المناطق',
            upcoming: 'القادمة',
            today: 'اليوم',
            tomorrow: 'بكرة',
            all: 'الكل',
            live: 'تقام الآن',
            upcomingBadge: 'قادمة',
            finished: 'انتهت',
            onMap: 'عرض على الخريطة',
            empty: 'ما فيه فعاليات مطابقة حاليًا.',
            error: 'تعذر تحميل الفعاليات.',
            loading: 'جاري تحميل الفعاليات...'
        },
        en: {
            title: 'Expo Events',
            description: 'Discover upcoming events and find your destination.',
            search: 'Search events or zones...',
            zones: 'All zones',
            upcoming: 'Upcoming',
            today: 'Today',
            tomorrow: 'Tomorrow',
            all: 'All',
            live: 'Happening now',
            upcomingBadge: 'Upcoming',
            finished: 'Finished',
            onMap: 'View on map',
            empty: 'No matching events.',
            error: 'Unable to load events.',
            loading: 'Loading events...'
        }
    };

    const language = () =>
        window.Mergab?.getLanguage?.() === 'en' ? 'en' : 'ar';

    const tr = key => words[language()][key];

    const escapeHtml = value =>
        String(value ?? '').replace(/[&<>"']/g, char => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        }[char]));



    // State
    const params = new URLSearchParams(window.location.search);

    let events = [];
    let zones = [];
    let loaded = false;
    let failed = false;

    let when = ['today', 'tomorrow', 'all', 'upcoming']
        .includes(params.get('when'))
        ? params.get('when')
        : 'upcoming';

    let zoneId = params.get('zone') || 'all';
    let search = params.get('q') || '';

    $('eventSearch').value = search;

    // Render page
    function render() {
        const now = new Date();

        const todayStart = new Date(now);
        todayStart.setHours(0, 0, 0, 0);

        const todayEnd = new Date(now);
        todayEnd.setHours(23, 59, 59, 999);

        const tomorrowStart = new Date(todayStart);
        tomorrowStart.setDate(tomorrowStart.getDate() + 1);

        const tomorrowEnd = new Date(todayEnd);
        tomorrowEnd.setDate(tomorrowEnd.getDate() + 1);

        // Headings and search
        $('eventsTitle').textContent = tr('title');
        $('eventsDescription').textContent = tr('description');
        $('eventSearch').placeholder = tr('search');

        // Time filters
        $('timeFilters')
            .querySelectorAll('[data-when]')
            .forEach(button => {
                button.textContent = tr(button.dataset.when);

                const active = button.dataset.when === when;

                button.classList.toggle('active', active);
                button.setAttribute(
                    'aria-pressed',
                    String(active)
                );
            });

        // Zone filter
        $('zoneFilter').innerHTML =
            `<option value="all">${escapeHtml(tr('zones'))}</option>` +
            zones.map(zone => `
                <option value="${escapeHtml(zone.id)}">
                    ${escapeHtml(zone.name)}
                </option>
            `).join('');

        $('zoneFilter').value = zones.some(
            zone => String(zone.id) === zoneId
        ) ? zoneId : 'all';

        const message = $('eventsMessage');

        // Loading or error
        if (!loaded) {
            message.hidden = false;
            message.textContent = failed
                ? tr('error')
                : tr('loading');
            return;
        }

        // Filter events
        const query = search.toLowerCase();

        const result = events.filter(event => {
            const start = new Date(event.startDateTime);
            const end = new Date(event.endDateTime);

            if (
                Number.isNaN(start.getTime()) ||
                Number.isNaN(end.getTime())
            ) {
                return false;
            }

            if (when === 'upcoming' && end < now) {
                return false;
            }

            if (
                when === 'today' &&
                !(start <= todayEnd && end >= todayStart)
            ) {
                return false;
            }

            if (
                when === 'tomorrow' &&
                !(start <= tomorrowEnd && end >= tomorrowStart)
            ) {
                return false;
            }

            if (
                zoneId !== 'all' &&
                String(event.zone?.id) !== zoneId
            ) {
                return false;
            }

            const text = `
                ${event.name || ''}
                ${event.zone?.name || ''}
            `.toLowerCase();

            return !query || text.includes(query);
        }).sort(
            (a, b) =>
                new Date(a.startDateTime) -
                new Date(b.startDateTime)
        );

        // Date formatting
        const locale = language() === 'ar'
            ? 'ar-SA'
            : 'en-GB';

        const dateFormatter = new Intl.DateTimeFormat(locale, {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });

        const timeFormatter = new Intl.DateTimeFormat(locale, {
            hour: 'numeric',
            minute: '2-digit'
        });

        // Render cards
        $('eventsGrid').innerHTML = result.map(event => {
            const start = new Date(event.startDateTime);
            const end = new Date(event.endDateTime);

            const badge =
                start <= now && end >= now
                    ? tr('live')
                    : end < now
                        ? tr('finished')
                        : tr('upcomingBadge');

            return `
                <article class="ve-card">

                <div class="ve-card-media"
                     style="${MergabEventImages.getStyle(event)}"></div>

                    <div class="ve-card-body">

                        <span class="ve-badge">
                            ${escapeHtml(badge)}
                        </span>

                        <h2>${escapeHtml(event.name)}</h2>

                        <div class="meta">
                            <span class="material-symbols-rounded">
                                calendar_month
                            </span>
                            <span>
                                ${escapeHtml(dateFormatter.format(start))}
                            </span>
                        </div>

                        <div class="meta">
                            <span class="material-symbols-rounded">
                                schedule
                            </span>
                            <span>
                                ${escapeHtml(timeFormatter.format(start))}
                                –
                                ${escapeHtml(timeFormatter.format(end))}
                            </span>
                        </div>

                        <div class="meta">
                            <span class="material-symbols-rounded">
                                location_on
                            </span>
                            <span>
                                ${escapeHtml(event.zone?.name || '—')}
                            </span>
                        </div>

                        <a
                            class="btn btn-primary"
                            href="/visitor/map?zone=${encodeURIComponent(event.zone?.id ?? '')}">
                            ${escapeHtml(tr('onMap'))}
                        </a>

                    </div>
                </article>
            `;
        }).join('');

        message.hidden = result.length > 0;
        message.textContent = tr('empty');
    }

    // Time filter listener
    $('timeFilters').addEventListener('click', event => {
        const button = event.target.closest('[data-when]');

        if (!button) return;

        when = button.dataset.when;
        render();
    });

    // Zone filter listener
    $('zoneFilter').addEventListener('change', event => {
        zoneId = event.target.value;
        render();
    });

    // Search listener
    $('eventSearch').addEventListener('input', event => {
        search = event.target.value.trim();
        render();
    });

    // Language switch listener
    document.addEventListener(
        'mergab:languageChanged',
        render
    );

    // API request helper
    async function getList(path) {
        const response = await fetch('/api/v1' + path, {
            headers: {
                Accept: 'application/json'
            },
            cache: 'no-store'
        });

        if (!response.ok) {
            throw new Error('API ' + response.status);
        }

        const data = await response.json();

        return Array.isArray(data)
            ? data
            : (data.data || []);
    }

    // Load events and zones
    Promise.all([
        getList('/zone/get'),
        getList('/expo-event/get')
    ]).then(([zoneData, eventData]) => {
        zones = zoneData;
        events = eventData;
        loaded = true;
        render();
    }).catch(error => {
        console.error('Visitor events:', error);
        failed = true;
        render();
    });

    render();
});
