
/* Mergab — Public Homepage */
(() => {
    'use strict';

    const dict = {
        ar: {
            navHome: 'الرئيسية',
            navMap: 'الخريطة',
            navEvents: 'الفعاليات',
            navFeatures: 'المميزات',
            login: 'تسجيل الدخول',
            account: 'حسابي',
            eyebrow: 'تجربتك الذكية في إكسبو',
            heroTitle: 'استكشف إكسبو<br>على راحتك',
            heroLead: 'اعرف وين الزحمة، اكتشف الفعاليات، واختر طريقك بكل سهولة.',
            searchLabel: 'ابحث عن منطقة أو فعالية',
            searchPlaceholder: 'وين ودك تروح؟',
            search: 'استكشف',
            shortcutMap: 'الخريطة التفاعلية',
            shortcutEvents: 'فعاليات اليوم',
            shortcutPlan: 'خطط مسارك',
            discover: 'اكتشف مِرقاب',
            featuresTitle: 'كل اللي تحتاجه لزيارة أذكى',
            featuresDesc: 'معلومات تساعدك تستمتع بوقتك وتتجنب الزحام.',
            f1Title: 'خريطة تفاعلية',
            f1Desc: 'تعرّف على مناطق إكسبو ومواقعها.',
            f2Title: 'حالة الازدحام',
            f2Desc: 'شوف مستوى الإشغال قبل ما تتوجه لأي منطقة.',
            f3Title: 'تخطيط المسار',
            f3Desc: 'رتّب زيارتك واختر مسارًا يتجنب الزحام.',
            f4Title: 'الفعاليات',
            f4Desc: 'اكتشف الفعاليات ومواعيدها ومواقعها.',
            exploreZones: 'جولة في إكسبو',
            zonesTitle: 'استكشف المناطق',
            zonesDesc: 'تعرّف على المناطق ونسب الإشغال المسجلة.',
            allZones: 'كل المناطق',
            whatsOn: 'وش يصير في إكسبو؟',
            eventsTitle: 'الفعاليات القادمة',
            allEvents: 'كل الفعاليات',
            filterAll: 'الكل',
            filterToday: 'اليوم',
            filterTomorrow: 'بكرة',
            filterQuiet: 'الأقل ازدحامًا',
            ctaKicker: 'اكتشف طريقك داخل إكسبو',
            ctaTitle: 'وجهتك أقرب مع مِرقاب',
            ctaDesc: 'استكشف المناطق على الخريطة التفاعلية، وتعرّف على الازدحام واختر المسار الأنسب لوجهتك.',
            ctaButton: 'افتح خريطة إكسبو',
            footerTag: 'استكشف بذكاء، واستمتع بكل لحظة.',
            loading: 'جاري تحميل البيانات...',
            emptyZones: 'ما فيه مناطق متاحة حاليًا.',
            emptyEvents: 'ما فيه فعاليات مطابقة حاليًا.',
            loadError: 'تعذر تحميل البيانات حاليًا. حاول مرة ثانية.',
            capacity: 'السعة',
            crowdLow: 'خفيف',
            crowdMedium: 'متوسط',
            crowdHigh: 'مرتفع',
            crowdCritical: 'مزدحم جدًا',
            crowdUnknown: 'غير متوفر',
            onMap: 'على الخريطة'
        },
        en: {
            navHome: 'Home',
            navMap: 'Map',
            navEvents: 'Events',
            navFeatures: 'Features',
            login: 'Log in',
            account: 'My account',
            eyebrow: 'Your smart Expo companion',
            heroTitle: 'Explore Expo<br>your way',
            heroLead: 'Check crowd levels, discover events and find your way with ease.',
            searchLabel: 'Search zones or events',
            searchPlaceholder: 'Where would you like to go?',
            search: 'Explore',
            shortcutMap: 'Interactive map',
            shortcutEvents: 'Today’s events',
            shortcutPlan: 'Plan your route',
            discover: 'Discover Mergab',
            featuresTitle: 'Everything for a smarter visit',
            featuresDesc: 'Helpful information to enjoy your time and avoid crowds.',
            f1Title: 'Interactive map',
            f1Desc: 'Explore Expo zones and their locations.',
            f2Title: 'Crowd levels',
            f2Desc: 'Check zone occupancy before you go.',
            f3Title: 'Route planning',
            f3Desc: 'Plan your visit and avoid busy areas.',
            f4Title: 'Events',
            f4Desc: 'Discover events, times and locations.',
            exploreZones: 'Around Expo',
            zonesTitle: 'Explore zones',
            zonesDesc: 'Discover zones and recorded occupancy levels.',
            allZones: 'All zones',
            whatsOn: 'What’s on?',
            eventsTitle: 'Upcoming events',
            allEvents: 'All events',
            filterAll: 'All',
            filterToday: 'Today',
            filterTomorrow: 'Tomorrow',
            filterQuiet: 'Less crowded',
            ctaKicker: 'Find your way around Expo',
            ctaTitle: 'Navigate Expo with Mergab',
            ctaDesc: 'Explore zones on the interactive map, check crowd levels and choose the best route to your destination.',
            ctaButton: 'Open Expo Map',
            footerTag: 'Explore smarter, enjoy every moment.',
            loading: 'Loading data...',
            emptyZones: 'No zones available right now.',
            emptyEvents: 'No matching events right now.',
            loadError: 'Unable to load data right now. Please try again.',
            capacity: 'Capacity',
            crowdLow: 'Low',
            crowdMedium: 'Moderate',
            crowdHigh: 'High',
            crowdCritical: 'Very busy',
            crowdUnknown: 'Unavailable',
            onMap: 'View on map'
        }
    };

    let lang = Mergab.getLanguage();
    let zones = [];
    let events = [];
    let filter = 'all';
    let zonesLoaded = false;
    let eventsLoaded = false;

    const $ = id => document.getElementById(id);
    const tr = key => dict[lang][key] || key;

    function escapeHtml(value) {
        return String(value ?? '').replace(/[&<>"']/g, char => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        }[char]));
    }

    function parseDate(value) {
        return value ? new Date(value) : new Date(NaN);
    }

    function validDate(value) {
        return !Number.isNaN(value.getTime());
    }

    function formatDate(value) {
        const d = parseDate(value);
        if (!validDate(d)) return '—';

        return new Intl.DateTimeFormat(
            lang === 'ar' ? 'ar-SA' : 'en-GB',
            { day: 'numeric', month: 'short' }
        ).format(d);
    }

    function formatTime(value) {
        const d = parseDate(value);
        if (!validDate(d)) return '—';

        return new Intl.DateTimeFormat(
            lang === 'ar' ? 'ar-SA' : 'en-GB',
            { hour: 'numeric', minute: '2-digit' }
        ).format(d);
    }

    function formatNumber(value) {
        return new Intl.NumberFormat(
            lang === 'ar' ? 'ar-SA' : 'en-US'
        ).format(value);
    }

    function zoneName(zone) {
        if (!zone) return '—';

        if (lang === 'ar') {
            return zone.nameAr || zone.arabicName || zone.name || '—';
        }

        return zone.nameEn || zone.englishName || zone.name || '—';
    }

    function occupancyRatio(zone) {
        if (zone?.currentCount == null) return null;

        const capacity = Number(zone.capacity);
        const count = Number(zone.currentCount);

        if (capacity <= 0 || !Number.isFinite(count)) {
            return null;
        }

        return Math.max(0, count / capacity);
    }

    function crowdLevel(zone) {
        const ratio = occupancyRatio(zone);

        if (ratio === null) {
            return {
                label: tr('crowdUnknown'),
                color: '#81918a',
                background: '#edf0ed'
            };
        }

        if (ratio < 0.4) {
            return {
                label: tr('crowdLow'),
                color: '#23834f',
                background: '#e2f5e9'
            };
        }

        if (ratio < 0.7) {
            return {
                label: tr('crowdMedium'),
                color: '#a17a18',
                background: '#fbf3d9'
            };
        }

        if (ratio < 0.9) {
            return {
                label: tr('crowdHigh'),
                color: '#bd641e',
                background: '#fff0e1'
            };
        }

        return {
            label: tr('crowdCritical'),
            color: '#b63b32',
            background: '#fae8e6'
        };
    }

    function crowdTag(zone) {
        const level = crowdLevel(zone);
        const ratio = occupancyRatio(zone);

        const percentage = ratio === null
            ? ''
            : ` · ${formatNumber(Math.round(ratio * 100))}%`;

        return `
      <span class="occupancy"
            style="background:${level.background};color:${level.color}">
        <i style="background:${level.color}"></i>
        ${escapeHtml(level.label)}${percentage}
      </span>
    `;
    }

    function zoneImage(zone) {
        const slug = String(zone?.name || '')
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '');

        return `
      background-image:
        linear-gradient(0deg,rgba(10,44,36,.25),rgba(10,44,36,.05)),
        url('/img/zones/${encodeURIComponent(slug)}.jpg');
      background-color:#286451;
    `;
    }

    function renderZones() {
        const target = $('zonesGrid');

        if (!zones.length) {
            target.innerHTML = `
        <p class="empty-state">${tr('emptyZones')}</p>
      `;
            return;
        }

        target.innerHTML = zones.slice(0, 8).map(zone => `
      <a class="zone-card"
         href="/visitor/map?zone=${encodeURIComponent(zone.name || '')}">
        <div class="zone-art" style="${zoneImage(zone)}"></div>
        <div class="zone-body">
          <h3>${escapeHtml(zoneName(zone))}</h3>
          ${crowdTag(zone)}
          <span class="capacity">
            ${tr('capacity')}:
            ${Number.isFinite(Number(zone.capacity))
            ? formatNumber(zone.capacity)
            : '—'}
          </span>
        </div>
      </a>
    `).join('');
    }

    function sameDay(a, b) {
        return validDate(a) &&
            validDate(b) &&
            a.getFullYear() === b.getFullYear() &&
            a.getMonth() === b.getMonth() &&
            a.getDate() === b.getDate();
    }

    function renderEvents() {
        const now = new Date();
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);

        const filtered = events
            .filter(event => {
                const start = parseDate(event.startDateTime);
                const end = parseDate(event.endDateTime);

                return validDate(end)
                    ? end >= now
                    : validDate(start) && start >= now;
            })
            .filter(event => {
                const start = parseDate(event.startDateTime);

                if (filter === 'today') {
                    return sameDay(start, now);
                }

                if (filter === 'tomorrow') {
                    return sameDay(start, tomorrow);
                }

                if (filter === 'quiet') {
                    const zone = zones.find(z => z.id === event.zone?.id);
                    const ratio = occupancyRatio(zone);

                    return ratio !== null && ratio < 0.75;
                }

                return true;
            })
            .sort((a, b) =>
                parseDate(a.startDateTime) - parseDate(b.startDateTime)
            )
            .slice(0, 6);

        const target = $('eventsGrid');

        if (!filtered.length) {
            target.innerHTML = `
        <p class="empty-state">${tr('emptyEvents')}</p>
      `;
            return;
        }

        target.innerHTML = filtered.map(event => {
            const zone =
                zones.find(z => z.id === event.zone?.id) ||
                event.zone ||
                {};

            return `
        <article class="event-card">
          <div class="event-art" style="${zoneImage(zone)}"></div>

          <div class="event-body">
            <h3>${escapeHtml(event.name)}</h3>

            <p>
              <span class="material-symbols-rounded">schedule</span>
              ${formatDate(event.startDateTime)}
              · ${formatTime(event.startDateTime)}
              – ${formatTime(event.endDateTime)}
            </p>

            <p>
              <span class="material-symbols-rounded">location_on</span>
              ${escapeHtml(zoneName(zone))}
            </p>

            <div class="event-foot">
              ${zone.capacity ? crowdTag(zone) : '<span></span>'}

              <a href="/visitor/map?zone=${encodeURIComponent(zone.name || '')}">
                ${tr('onMap')}
              </a>
            </div>
          </div>
        </article>
      `;
        }).join('');
    }

    function updateLanguage() {
        document.documentElement.lang = lang;
        document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';

        document.title = lang === 'ar'
            ? 'مِرقاب | استكشف إكسبو بذكاء'
            : 'Mergab | Explore Expo smarter';

        document.querySelectorAll('main [data-t]').forEach(element => {
            const value = tr(element.dataset.t);

            if (element.dataset.t === 'heroTitle') {
                element.innerHTML = value;
            } else {
                element.textContent = value;
            }
        });

        document.querySelectorAll('[data-placeholder]').forEach(element => {
            element.placeholder = tr(element.dataset.placeholder);
        });



        if (zonesLoaded) renderZones();
        if (eventsLoaded) renderEvents();


    }

    // Actual backend requests — no mock fallback.
    async function getData(path) {
        const session = JSON.parse(
            sessionStorage.getItem('mergab.session') || 'null'
        );

        const headers = {
            Accept: 'application/json'
        };

        if (session?.token) {
            headers.Authorization = session.token;
        }

        const response = await fetch(path, {
            method: 'GET',
            headers,
            credentials: 'same-origin'
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${path}`);
        }

        const data = await response.json();

        if (Array.isArray(data)) return data;
        if (Array.isArray(data.content)) return data.content;
        if (Array.isArray(data.data)) return data.data;

        throw new Error(`Unexpected API response: ${path}`);
    }

    async function loadData() {
        const results = await Promise.allSettled([
            getData('/api/v1/zone/get'),
            getData('/api/v1/expo-event/get')
        ]);

        if (results[0].status === 'fulfilled') {
            zones = await Mergab.withLiveOccupancy(results[0].value);
            zonesLoaded = true;
            renderZones();
        } else {
            $('zonesGrid').innerHTML = `
        <p class="error-state" role="alert">${tr('loadError')}</p>
      `;
            console.error('Zones API:', results[0].reason);
        }

        if (results[1].status === 'fulfilled') {
            events = results[1].value;
            eventsLoaded = true;
            renderEvents();
        } else {
            $('eventsGrid').innerHTML = `
        <p class="error-state" role="alert">${tr('loadError')}</p>
      `;
            console.error('Events API:', results[1].reason);
        }
    }



    document.addEventListener('mergab:languageChanged', event => {
        lang = event.detail.language;
        updateLanguage();
    });

    // Search
    $('heroSearch').addEventListener('submit', (e) => {
        e.preventDefault();

        const query = $('searchText').value.trim();
        const homeSearch = $('homeMapSearch');

        if (homeSearch) {
            homeSearch.value = query;

            homeSearch.dispatchEvent(
                new Event('input', { bubbles: true })
            );

            $('homeMap').scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });

            homeSearch.focus({
                preventScroll: true
            });
        }
    });

    // Event filters
    $('eventFilters').addEventListener('click', event => {
        const button = event.target.closest('[data-filter]');
        if (!button) return;

        filter = button.dataset.filter;

        document
            .querySelectorAll('#eventFilters [data-filter]')
            .forEach(item => {
                item.setAttribute(
                    'aria-pressed',
                    String(item === button)
                );
            });

        if (eventsLoaded) renderEvents();
    });


    updateLanguage();
    loadData();

    // Refresh real backend data every 30 seconds.
    setInterval(() => {
        if (!document.hidden) {
            loadData();
        }
    }, 30000);
})();
