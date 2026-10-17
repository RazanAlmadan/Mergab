
/* =========================================
   MERGAB | ORGANIZER DASHBOARD
   Real Backend + Interactive Expo Map
   ========================================= */

document.addEventListener("DOMContentLoaded", () => {
    "use strict";

    const session = MergabAuth.requireRole(["ORGANIZER"]);
    if (!session) return;

    const $ = id => document.getElementById(id);


    // Account & logout
    $("organizerUserName").textContent =
        session.fullName || "حسابي";

    $("organizerWelcome").textContent =
        `مرحبًا، ${session.fullName || "منظّم مِرقاب"}`;

    $("organizerLogoutButton").addEventListener("click", () => {
        MergabAuth.logout();
    });

    async function getJSON(url, protectedApi = false) {
        const headers = {
            Accept: "application/json",
            "X-Requested-With": "XMLHttpRequest"
        };

        if (protectedApi) {
            headers.Authorization =
                MergabAuth.getAuthorizationHeader();
        }

        const response = await fetch(url, {
            headers,
            cache: "no-store"
        });

        if (response.status === 401 && protectedApi) {
            MergabAuth.logout();
            throw new Error("UNAUTHORIZED");
        }

        if (!response.ok) {
            throw new Error(`HTTP_${response.status}`);
        }

        return response.json();
    }

    function showEmpty(container, text) {
        const paragraph = document.createElement("p");
        paragraph.className = "organizer-empty";
        paragraph.textContent = text;
        container.replaceChildren(paragraph);
    }

    function occupancyColor(percent) {
        if (percent >= 90) return "#C0392B";
        if (percent >= 75) return "#E8964A";
        if (percent >= 50) return "#D9B452";
        return "#4F9A74";
    }

    // Display real occupancy statistics
    function renderOccupancy(zones, counts) {
        const container = $("zoneOccupancy");
        container.replaceChildren();

        if (!zones.length) {
            showEmpty(container, "لا توجد مناطق مضافة بعد.");
            return;
        }

        const ordered = [...zones].sort((a, b) => {
            const aCount = counts.get(String(a.id)) || 0;
            const bCount = counts.get(String(b.id)) || 0;

            return (bCount / (b.capacity || 1)) -
                (aCount / (a.capacity || 1));
        });

        ordered.forEach(zone => {
            const count = counts.get(String(zone.id)) || 0;
            const capacity = Number(zone.capacity) || 1;

            const percent = Math.round(
                (count / capacity) * 100
            );

            const row = document.createElement("div");
            row.style.padding = "9px 0";

            const heading = document.createElement("div");
            heading.style.display = "flex";
            heading.style.justifyContent = "space-between";
            heading.style.gap = "12px";
            heading.style.marginBottom = "9px";

            const name = document.createElement("strong");
            name.textContent = zone.name;
            name.style.fontSize = "12px";

            const percentage = document.createElement("span");
            percentage.textContent = `${percent}%`;
            percentage.style.fontSize = "12px";
            percentage.style.fontWeight = "700";
            percentage.style.color = occupancyColor(percent);

            heading.append(name, percentage);

            const track = document.createElement("div");
            track.style.height = "8px";
            track.style.background = "#EDF1ED";
            track.style.borderRadius = "20px";
            track.style.overflow = "hidden";

            const bar = document.createElement("div");
            bar.style.height = "100%";
            bar.style.width = `${Math.min(100, percent)}%`;
            bar.style.borderRadius = "20px";
            bar.style.background = occupancyColor(percent);

            track.appendChild(bar);
            row.append(heading, track);
            container.appendChild(row);
        });
    }



    // ======================================
    // SHARED LIVE MAP
    // ======================================

    function startSharedMap() {

        MergabMap.mount("#organizerExpoMap", {

            lang: "ar",

            refreshMs: 30000,

            hideLocation: true,

            autoOccupancy: false,

            controls: true,

            // Organizer look: night command-center theme + 3D
            theme: "organizer",
            perspective: true,

            onSelect() {
                window.location.href = "/organizer/zones";
            },

            onData(zones, connections, mapInstance) {

                $("totalZones").textContent =
                    zones.length.toLocaleString("ar-SA");

                // Preserve actual QR-based occupancy
                loadZoneData(zones, mapInstance)
                    .catch(error => {

                        console.error(
                            "Failed to load live occupancy:",
                            error
                        );

                        $("totalVisitors").textContent = "—";

                        showEmpty(
                            $("zoneOccupancy"),
                            "تعذر تحميل الإشغال الحالي."
                        );
                    });
            },

            onError(error) {
                console.error(
                    "Failed to refresh organizer map:",
                    error
                );
            }
        });
    }



    // Load actual active QR check-ins for every zone
    async function loadZoneData(zones, mapInstance) {
        const results = await Promise.allSettled(
            zones.map(zone =>
                getJSON(
                    `/api/v1/zone-visit/occupancy/${zone.id}`
                )
            )
        );

        const allAvailable = results.every(
            result => result.status === "fulfilled"
        );

        const counts = new Map();

        results.forEach((result, index) => {
            if (result.status === "fulfilled") {
                counts.set(
                    String(zones[index].id),
                    Number(result.value) || 0
                );
            }
        });


        // Update map from real active check-ins only
        if (allAvailable && mapInstance) {

            mapInstance.setOccupancy(
                zones.map(zone => ({
                    ...zone,
                    currentCount:
                        counts.get(String(zone.id)) ?? 0
                }))
            );
        }



        if (allAvailable) {
            const total = [...counts.values()].reduce(
                (sum, count) => sum + count, 0
            );

            $("totalVisitors").textContent =
                total.toLocaleString("ar-SA");

            renderOccupancy(zones, counts);
        } else {
            $("totalVisitors").textContent = "—";

            showEmpty(
                $("zoneOccupancy"),
                "تعذر تحميل بيانات الإشغال الحالية."
            );
        }
    }

    function renderEvents(events) {
        const container = $("upcomingEvents");
        container.replaceChildren();

        if (!events.length) {
            showEmpty(container, "لا توجد فعاليات قادمة.");
            return;
        }

        const sorted = [...events].sort((a, b) =>
            new Date(a.startDateTime) -
            new Date(b.startDateTime)
        );

        sorted.slice(0, 5).forEach(event => {
            const row = document.createElement("article");
            row.style.padding = "12px 0";
            row.style.borderBottom = "1px solid #EDF1ED";

            const name = document.createElement("strong");
            name.textContent = event.name;
            name.style.display = "block";
            name.style.fontSize = "13px";

            const details = document.createElement("small");
            details.style.display = "block";
            details.style.marginTop = "6px";
            details.style.color = "#6B7D72";

            const date = new Date(event.startDateTime);

            const formattedDate = Number.isNaN(date.getTime())
                ? "موعد غير متاح"
                : date.toLocaleString("ar-SA", {
                    dateStyle: "medium",
                    timeStyle: "short"
                });

            details.textContent =
                `${formattedDate} · ${event.zone?.name || "بدون منطقة"}`;

            row.append(name, details);
            container.appendChild(row);
        });
    }


    async function loadDashboard() {

        const [eventResult, simResult] =
            await Promise.allSettled([
                getJSON("/api/v1/expo-event/get-upcoming"),
                getJSON("/api/v1/simulation/get-all", true)
            ]);

        // Events
        if (eventResult.status === "fulfilled") {
            const events = eventResult.value;

            $("totalEvents").textContent =
                events.length.toLocaleString("ar-SA");

            renderEvents(events);
        } else {
            $("totalEvents").textContent = "—";

            showEmpty(
                $("upcomingEvents"),
                "تعذر تحميل الفعاليات."
            );
        }

        // Simulations
        if (simResult.status === "fulfilled") {
            $("totalSimulations").textContent =
                simResult.value.length.toLocaleString("ar-SA");
        } else {
            $("totalSimulations").textContent = "—";
        }
    }


    startSharedMap();

    loadDashboard().catch(error => {
        console.error("Organizer dashboard failed:", error);
    });
});
