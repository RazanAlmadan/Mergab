
/* Mergab | Visitor Visit Guide */

document.addEventListener("DOMContentLoaded", async () => {
    "use strict";

    const $ = id => document.getElementById(id);

    const text = {
        ar: {
            kicker: "دليلك داخل إكسبو",
            title: "خلّ زيارتك أسهل مع مِرقاب",
            subtitle: "تعرّف على حالة المناطق والمرافق وأوقات الصلاة قبل ما تتحرك.",
            openMap: "افتح الخريطة التفاعلية",
            overview: "نظرة سريعة على المعرض",
            zones: "المناطق المسجلة",
            facilities: "المرافق المتاحة",
            occupancy: "إجمالي نسبة الإشغال المسجلة",
            facilityTitle: "وين تلقى المرافق؟",
            facilitySubtitle: "اختر المنطقة أو نوع المرفق للوصول إليه على الخريطة.",
            prayerTitle: "أوقات الصلاة اليوم",
            prayerZones: "المناطق التي تحتوي على مصليات",
            search: "ابحث عن مرفق...",
            allZones: "كل المناطق",
            allTypes: "كل المرافق",
            allGenders: "الجميع",
            RESTROOM: "دورات المياه",
            PRAYER_ROOM: "مصلى",
            EXIT: "مخرج",
            ENTRANCE: "مدخل",
            MALE: "رجال",
            FEMALE: "نساء",
            BOTH: "للجميع",
            fajr: "الفجر",
            dhuhr: "الظهر",
            asr: "العصر",
            maghrib: "المغرب",
            isha: "العشاء",
            route: "اعرض على الخريطة",
            empty: "ما فيه مرافق مطابقة.",
            loading: "جاري تحميل المرافق...",
            error: "تعذر تحميل المرافق.",
            prayerLoading: "جاري تحميل أوقات الصلاة...",
            prayerError: "أوقات الصلاة غير متاحة حاليًا من المصدر المباشر."
        },
        en: {
            kicker: "Your Expo Guide",
            title: "Make your visit easier with Mergab",
            subtitle: "Explore zones, facilities and prayer times.",
            openMap: "Open interactive map",
            overview: "Expo overview",
            zones: "Recorded zones",
            facilities: "Available facilities",
            occupancy: "Recorded overall occupancy",
            facilityTitle: "Find facilities",
            facilitySubtitle: "Choose a zone or facility type to find it on the map.",
            prayerTitle: "Today's prayer times",
            prayerZones: "Zones with prayer rooms",
            search: "Search facilities...",
            allZones: "All zones",
            allTypes: "All facilities",
            allGenders: "All",
            RESTROOM: "Restroom",
            PRAYER_ROOM: "Prayer room",
            EXIT: "Exit",
            ENTRANCE: "Entrance",
            MALE: "Men",
            FEMALE: "Women",
            BOTH: "Everyone",
            fajr: "Fajr",
            dhuhr: "Dhuhr",
            asr: "Asr",
            maghrib: "Maghrib",
            isha: "Isha",
            route: "View on map",
            empty: "No matching facilities.",
            loading: "Loading facilities...",
            error: "Unable to load facilities.",
            prayerLoading: "Loading prayer times...",
            prayerError: "Live prayer times are currently unavailable."
        }
    };

    const lang = () => Mergab.getLanguage();
    const tr = key => text[lang()]?.[key] || key;

    const esc = value =>
        String(value ?? "").replace(/[&<>"']/g, c => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        }[c]));

    let zones = [];
    let facilities = [];
    let prayerData = null;
    let facilitiesReady = false;
    let facilityFailed = false;

    const typeFilter = $("typeFilter");
    const zoneFilter = $("zoneFilter");
    const genderFilter = $("genderFilter");
    const searchInput = $("facilitySearch");
    const shortcuts = $("facilityShortcuts");

    // API
    async function getData(path) {
        const response = await fetch("/api/v1" + path, {
            headers: { Accept: "application/json" },
            cache: "no-store"
        });

        if (!response.ok) {
            throw new Error("API " + response.status);
        }

        return response.json();
    }

    function list(value) {
        if (Array.isArray(value)) return value;
        if (Array.isArray(value?.data)) return value.data;
        if (Array.isArray(value?.content)) return value.content;
        return [];
    }

    // Translation
    function translate() {
        document.querySelectorAll("[data-v]").forEach(element => {
            element.textContent = tr(element.dataset.v);
        });

        searchInput.placeholder = tr("search");

        const currentZone = zoneFilter.value || "all";

        zoneFilter.innerHTML =
            `<option value="all">${esc(tr("allZones"))}</option>` +
            zones.map(zone => `
                <option value="${esc(zone.id)}">
                    ${esc(zone.name)}
                </option>
            `).join("");

        zoneFilter.value = zones.some(
            zone => String(zone.id) === currentZone
        ) ? currentZone : "all";

        const typeLabels = {
            all: "allTypes",
            RESTROOM: "RESTROOM",
            PRAYER_ROOM: "PRAYER_ROOM",
            EXIT: "EXIT",
            ENTRANCE: "ENTRANCE"
        };

        for (const option of typeFilter.options) {
            option.textContent = tr(
                typeLabels[option.value] || option.value
            );
        }

        for (const option of genderFilter.options) {
            option.textContent = tr(
                option.value === "all"
                    ? "allGenders"
                    : option.value
            );
        }
    }

    // Facility shortcuts
    function syncShortcuts() {
        shortcuts.querySelectorAll("button[data-type]")
            .forEach(button => {
                button.setAttribute(
                    "aria-pressed",
                    String(button.dataset.type === typeFilter.value)
                );
            });
    }

    shortcuts.addEventListener("click", event => {
        const button = event.target.closest("button[data-type]");
        if (!button) return;

        typeFilter.value = button.dataset.type;

        typeFilter.dispatchEvent(
            new Event("change", { bubbles: true })
        );
    });

    typeFilter.addEventListener("change", syncShortcuts);
    syncShortcuts();

    // Render facilities
    function renderFacilities() {
        translate();

        $("zonesCount").textContent = zones.length;
        $("facilityCount").textContent = facilities.length;

        const availableZones = zones.filter(
            zone =>
                zone.currentCount != null &&
                Number(zone.capacity) > 0
        );

        const capacity = availableZones.reduce(
            (sum, zone) => sum + Number(zone.capacity),
            0
        );

        const visitors = availableZones.reduce(
            (sum, zone) => sum + Number(zone.currentCount),
            0
        );

        $("occupancyCount").textContent =
            availableZones.length === zones.length && capacity > 0
                ? Math.round(visitors / capacity * 100) + "%"
                : "—";

        if (!facilitiesReady) {
            $("facilityGrid").innerHTML = "";
            $("facilityMessage").hidden = false;
            $("facilityMessage").textContent =
                tr(facilityFailed ? "error" : "loading");
            return;
        }

        const query = searchInput.value.trim().toLowerCase();

        const result = facilities.filter(facility => {
            if (
                zoneFilter.value !== "all" &&
                String(facility.zoneId) !== zoneFilter.value
            ) {
                return false;
            }

            if (
                typeFilter.value !== "all" &&
                facility.type !== typeFilter.value
            ) {
                return false;
            }

            if (
                genderFilter.value !== "all" &&
                facility.gender !== genderFilter.value
            ) {
                return false;
            }

            const searchText = (
                (facility.name || "") + " " +
                (facility.zoneName || "")
            ).toLowerCase();

            return !query || searchText.includes(query);
        });

        $("facilityGrid").innerHTML = result.map(facility => `
            <article class="vg-card vg-facility">
                <span class="vg-tag">
                    ${esc(tr(facility.type))}
                </span>

                <h3>${esc(facility.name)}</h3>

                <div class="vg-info">
                    <span class="material-symbols-rounded">
                        location_on
                    </span>
                    <span>${esc(facility.zoneName)}</span>
                </div>

                <div class="vg-info">
                    <span class="material-symbols-rounded">
                        groups
                    </span>
                    <span>${esc(tr(facility.gender || "BOTH"))}</span>
                </div>

                <a class="vg-btn"
                   href="/visitor/map?zone=${encodeURIComponent(facility.zoneId)}">
                    <span class="material-symbols-rounded">
                        map
                    </span>
                    ${esc(tr("route"))}
                </a>
            </article>
        `).join("");

        $("facilityMessage").hidden = result.length > 0;
        $("facilityMessage").textContent = tr("empty");
    }

    // Render prayer times
    function renderPrayers() {
        $("prayerGrid").innerHTML = "";
        $("prayerZones").innerHTML = "";

        if (!prayerData || prayerData.source !== "live") {
            $("prayerMessage").textContent = tr("prayerError");
            return;
        }

        const names = [
            "fajr",
            "dhuhr",
            "asr",
            "maghrib",
            "isha"
        ];

        $("prayerGrid").innerHTML = names.map(key => `
            <div class="vg-card vg-prayer">
                <span>${esc(tr(key))}</span>
                <strong dir="ltr">
                    ${esc(prayerData.prayers?.[key] || "—")}
                </strong>
            </div>
        `).join("");

        $("prayerMessage").textContent = "";

        const prayerZones = list(prayerData.prayerZones);

        if (prayerZones.length) {
            $("prayerZones").innerHTML = `
                <h3 class="vg-prayer-zone-title">
                    ${esc(tr("prayerZones"))}
                </h3>

                <div class="vg-toolbar">
                    ${prayerZones.map(zone => `
                        <a class="vg-btn"
                           href="/visitor/map?zone=${encodeURIComponent(zone.id)}">
                            ${esc(zone.name)}
                        </a>
                    `).join("")}
                </div>
            `;
        }
    }

    // Events
    searchInput.addEventListener("input", renderFacilities);
    zoneFilter.addEventListener("change", renderFacilities);
    typeFilter.addEventListener("change", renderFacilities);
    genderFilter.addEventListener("change", renderFacilities);

    document.addEventListener("mergab:languageChanged", () => {
        renderFacilities();
        renderPrayers();
    });

    translate();

    // Load zones and their live occupancy
    try {
        const savedZones = list(await getData("/zone/get"));

        zones = await Mergab.withLiveOccupancy(savedZones);

        const responses = await Promise.allSettled(
            zones.map(async zone => {
                const data = await getData(
                    `/facility/get-by-zone/${zone.id}`
                );

                return list(data).map(facility => ({
                    ...facility,
                    zoneId: zone.id,
                    zoneName: zone.name
                }));
            })
        );

        facilities = responses
            .filter(response => response.status === "fulfilled")
            .flatMap(response => response.value);

        facilityFailed = responses.some(
            response => response.status === "rejected"
        );

        facilitiesReady =
            !facilityFailed || facilities.length > 0;

    } catch (error) {
        console.error("Visit facilities:", error);
        facilityFailed = true;
    }

    renderFacilities();

    // Load prayer times
    try {
        prayerData = await getData("/prayer/today");
    } catch (error) {
        console.warn("Prayer times:", error);
    }

    renderPrayers();
});
