
/* ==========================================
   MERGAB | ORGANIZER SIMULATIONS
   Real Backend + Map Playback
   ========================================== */

document.addEventListener("DOMContentLoaded", () => {
    "use strict";

    const session = MergabAuth.requireRole(["ORGANIZER"]);
    if (!session) return;

    const $ = id => document.getElementById(id);

    const SIM_API = "/api/v1/simulation";
    const SNAP_API = "/api/v1/simulation-snapshot";
    const NS = "http://www.w3.org/2000/svg";

    let simulations = [];
    let attendances = [];
    let zones = [];
    let connections = [];

    let map = null;
    let selectedSimulation = null;
    let snapshots = [];
    let minuteValues = [];
    let currentIndex = 0;
    let playbackTimer = null;
    let editingId = null;
    let busy = false;
    let selectionRequest = 0;

    const mapEl = $("simulationMap");
    const form = $("simulationForm");
    const editor = $("simulationEditor");
    const saveButton = $("saveSimulationButton");
    const tableBody = $("simulationsTableBody");
    const snapshotsBody = $("simulationSnapshotsBody");

    // =====================================
    // ACCOUNT
    // =====================================

    $("organizerAccountLink").textContent =
        session.fullName || "حسابي";

    $("organizerLogoutButton").addEventListener(
        "click",
        () => MergabAuth.logout()
    );

    // =====================================
    // MESSAGES
    // =====================================

    const pageNotice = document.createElement("div");
    pageNotice.className = "zones-form-message";
    pageNotice.hidden = true;

    document.querySelector(".zones-page-heading")
        .after(pageNotice);

    function notice(message, type = "error") {
        pageNotice.textContent = message;
        pageNotice.className = `zones-form-message ${type}`;
        pageNotice.hidden = false;
    }

    function formMessage(message) {
        const box = $("simulationFormMessage");
        box.textContent = message;
        box.className = "zones-form-message error";
        box.hidden = false;
    }

    function setStatus(message) {
        $("simulationMapStatus").textContent = message;
    }

    function formatNumber(value) {
        const number = Number(value);
        return Number.isFinite(number)
            ? number.toLocaleString("ar-SA")
            : "—";
    }

    function formatDate(value) {
        if (!value) return "—";

        const date = new Date(
            String(value).replace(" ", "T")
        );

        return Number.isNaN(date.getTime())
            ? "—"
            : date.toLocaleString("ar-SA", {
                dateStyle: "medium",
                timeStyle: "short"
            });
    }

    // =====================================
    // API
    // =====================================

    async function request(url, options = {}) {
        const response = await fetch(url, {
            ...options,
            cache: "no-store",
            headers: {
                Authorization:
                    MergabAuth.getAuthorizationHeader(),

                Accept: "application/json",

                "X-Requested-With": "XMLHttpRequest",

                ...(options.body
                    ? { "Content-Type": "application/json" }
                    : {}),

                ...options.headers
            }
        });

        if (response.status === 401) {
            MergabAuth.logout();
            throw new Error(
                "انتهت صلاحية تسجيل الدخول."
            );
        }

        if (response.status === 403) {
            throw new Error(
                "ما عندك صلاحية لتنفيذ العملية."
            );
        }

        const text = await response.text();

        let data = null;

        if (text) {
            try {
                data = JSON.parse(text);
            } catch (_) {}
        }

        if (!response.ok) {
            throw new Error(
                data?.message ||
                `فشل الطلب (HTTP ${response.status}).`
            );
        }

        return data;
    }

    // =====================================
    // MAP HELPERS
    // =====================================

    function parsePoints(value, minimum) {
        try {
            const points =
                typeof value === "string"
                    ? JSON.parse(value)
                    : value;

            if (
                !Array.isArray(points) ||
                points.length < minimum
            ) {
                return [];
            }

            const valid = points.every(point =>
                Array.isArray(point) &&
                point.length === 2 &&
                point.every(n =>
                    typeof n === "number" &&
                    Number.isFinite(n) &&
                    n >= 0 &&
                    n <= 100
                )
            );

            return valid ? points : [];

        } catch (_) {
            return [];
        }
    }

    function hasPosition(zone) {
        return zone.mapX != null &&
            zone.mapY != null &&
            Number.isFinite(Number(zone.mapX)) &&
            Number.isFinite(Number(zone.mapY));
    }

    function svgElement(parent, tag, attributes, text) {
        const element =
            document.createElementNS(NS, tag);

        Object.entries(attributes).forEach(
            ([key, value]) => {
                element.setAttribute(
                    key,
                    String(value)
                );
            }
        );

        if (text != null) {
            element.textContent = String(text);
        }

        parent.appendChild(element);
        return element;
    }

    // Smooth route following saved path points
    function routePath(points) {
        let d = `M ${points[0][0]} ${points[0][1]}`;

        if (points.length === 2) {
            return d +
                ` L ${points[1][0]} ${points[1][1]}`;
        }

        const smoothness = 0.12;

        for (let i = 0; i < points.length - 1; i++) {
            const previous =
                points[Math.max(0, i - 1)];

            const current = points[i];
            const next = points[i + 1];

            const following =
                points[Math.min(points.length - 1, i + 2)];

            const cp1x = current[0] +
                (next[0] - previous[0]) * smoothness;

            const cp1y = current[1] +
                (next[1] - previous[1]) * smoothness;

            const cp2x = next[0] -
                (following[0] - current[0]) * smoothness;

            const cp2y = next[1] -
                (following[1] - current[1]) * smoothness;

            d +=
                ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ` +
                `${next[0]} ${next[1]}`;
        }

        return d;
    }

    // Occupancy colors based on actual snapshot data
    function levelColor(occupancy, capacity) {
        if (!(capacity > 0)) {
            return "#247C59";
        }

        const percentage =
            occupancy / capacity * 100;

        if (percentage >= 90) return "#C0392B";
        if (percentage >= 75) return "#E8964A";
        if (percentage >= 50) return "#D9B452";

        return "#4F9A74";
    }

    function snapshotsAtCurrentMinute() {
        if (!minuteValues.length) return [];

        const minute = minuteValues[currentIndex];

        return snapshots.filter(snapshot =>
            Number(snapshot.minute) === minute
        );
    }

    // =====================================
    // MAP OVERLAY
    // =====================================

    function drawMapOverlay(rows = []) {
        const svg =
            mapEl.querySelector(".mqm-isvg");

        if (!svg) return;

        svg.querySelector("#simulationOverlay")?.remove();

        const layer = svgElement(
            svg,
            "g",
            {
                id: "simulationOverlay",
                "pointer-events": "none"
            }
        );

        const byZone = new Map(
            rows
                .filter(row => row.zone?.id != null)
                .map(row => [
                    String(row.zone.id),
                    row
                ])
        );

        // Fallback only: new shared renderer draws boundaries and paths.
        if (!window.MergabMap?.drawSavedGeometry) {
        // Saved zone boundaries
        zones.forEach(zone => {
            const boundary =
                parsePoints(zone.boundaryPoints, 3);

            if (boundary.length < 3) return;

            const snapshot =
                byZone.get(String(zone.id));

            const color = snapshot
                ? levelColor(
                    Number(snapshot.occupancy),
                    Number(zone.capacity)
                )
                : "#247C59";

            svgElement(layer, "polygon", {
                points: boundary
                    .map(point => point.join(","))
                    .join(" "),

                fill: color,

                "fill-opacity":
                    snapshot ? 0.20 : 0.08,

                stroke: color,
                "stroke-width": 1.05,
                "stroke-linejoin": "round"
            });
        });

        // Saved paths and direction arrows
        connections.forEach(connection => {
            const points =
                parsePoints(connection.pathPoints, 2);

            if (points.length < 2) return;

            const d = routePath(points);

            // White outline
            svgElement(layer, "path", {
                d,
                fill: "none",
                stroke: "#FFFFFF",
                "stroke-width": 1.6,
                "stroke-linecap": "round",
                "stroke-linejoin": "round"
            });

            // Route
            const route = svgElement(
                layer,
                "path",
                {
                    d,
                    fill: "none",
                    stroke: "#89d8c9",
                    "stroke-width": 0.95,
                    "stroke-linecap": "round",
                    "stroke-linejoin": "round"
                }
            );

            const length = route.getTotalLength();

            if (!(length > 0)) return;

            const positions = length >= 15
                ? [0.35, 0.70]
                : [0.5];

            positions.forEach(position => {
                const distance = length * position;

                const point =
                    route.getPointAtLength(distance);

                const before =
                    route.getPointAtLength(
                        Math.max(0, distance - 0.5)
                    );

                const after =
                    route.getPointAtLength(
                        Math.min(length, distance + 0.5)
                    );

                const angle =
                    Math.atan2(
                        after.y - before.y,
                        after.x - before.x
                    ) * 180 / Math.PI;

                const size =
                    Math.min(1.0, length / 6);

                svgElement(layer, "polygon", {
                    points:
                        `0,0 -${size},${size * 0.46} ` +
                        `-${size},-${size * 0.46}`,

                    fill: "#247C59",
                    stroke: "#FFFFFF",
                    "stroke-width": 0.15,

                    transform:
                        `translate(${point.x},${point.y}) ` +
                        `rotate(${angle})`
                });
            });
        });

        }

        // Queue markers: only actual saved queue values
        rows.forEach(snapshot => {
            const queue =
                Number(snapshot.queueLength);

            const zone = zones.find(z =>
                String(z.id) ===
                String(snapshot.zone?.id)
            );

            if (
                !zone ||
                !hasPosition(zone) ||
                !Number.isFinite(queue) ||
                queue <= 0
            ) {
                return;
            }

            const x = Math.min(
                96,
                Number(zone.mapX) + 5
            );

            const y = Math.min(
                96,
                Number(zone.mapY) + 5
            );

            svgElement(layer, "circle", {
                cx: x,
                cy: y,
                r: 2.5,
                fill: "#9E3C29",
                stroke: "#FFFFFF",
                "stroke-width": 0.4
            });

            svgElement(
                layer,
                "text",
                {
                    x,
                    y: y + 0.68,
                    "text-anchor": "middle",
                    fill: "#FFFFFF",
                    "font-size": 1.7,
                    "font-weight": "bold"
                },
                queue
            );
        });
    }

    // =====================================
    // CREATE INTERACTIVE MAP
    // =====================================

    function renderMap() {
        if (map) {
            map.destroy();
            map = null;
        }

        const mapZones = zones
            .filter(hasPosition)
            .map(zone => ({
                key: `zone-${zone.id}`,
                id: zone.id,

                name: {
                    ar: zone.name,
                    en: zone.name
                },

                x: Number(zone.mapX),
                y: Number(zone.mapY)
            }));

        map = MirqabMap.create("#simulationMap", {
            mode: "image",
            lang: "ar",

            demo: false,
            heat: true,
            controls: true,

            // Same 3D engine and cinematic organizer theme as the new shared map.
            theme: "organizer",
            perspective: true,

            matchBy: "id",

            fields: {
                count: "simulationOccupancy"
            },

            imageFit: "contain",

            imageLayout: {
                src: "/img/map/expo-map-concept.jpg",
                zones: mapZones,
                hub: null,
                edges: [],
                metersPerUnit: 8
            }
        });

        // Organizer position is unknown
        mapEl.querySelectorAll(
            ".mqm-ime, .mqm-ime-label"
        ).forEach(element => {
            element.style.display = "none";
        });

        // The visitor/organizer maps now share the same saved-zone and
        // connection geometry renderer. Snapshot overlays stay separate.
        const redrawMapLayers = () => {
            window.MergabMap?.drawSavedGeometry?.(
                mapEl, zones, connections
            );
            drawMapOverlay(snapshotsAtCurrentMinute());
            if (map?.getZones) {
                window.MergabMap?.paintCrowd?.(
                    mapEl, map.getZones()
                );
            }
        };

        redrawMapLayers();
        mapEl.querySelector(".mqm-img")
            ?.addEventListener("load", redrawMapLayers, { once: true });

        updateMinute();
    }

    // =====================================
    // TABLE HELPERS
    // =====================================

    function tableMessage(body, columns, message) {
        body.replaceChildren();

        const row = document.createElement("tr");
        const cell = document.createElement("td");

        cell.colSpan = columns;
        cell.textContent = message;
        cell.style.textAlign = "center";

        row.appendChild(cell);
        body.appendChild(row);
    }

    function cell(row, value) {
        const td = document.createElement("td");
        td.textContent = String(value ?? "—");

        row.appendChild(td);
        return td;
    }

    function actionButton(
        iconName,
        label,
        handler,
        danger = false
    ) {
        const button = document.createElement("button");

        button.type = "button";
        button.title = label;
        button.setAttribute("aria-label", label);

        if (danger) {
            button.className = "delete-zone";
        }

        const icon = document.createElement("span");
        icon.className = "material-symbols-rounded";
        icon.textContent = iconName;

        button.appendChild(icon);
        button.addEventListener("click", handler);

        return button;
    }

    // =====================================
    // TIMELINE / MINUTE RESULTS
    // =====================================

    function updateMinute() {
        const ready = minuteValues.length > 0;

        const slider = $("simulationTimeline");

        const minute = ready
            ? minuteValues[currentIndex]
            : null;

        slider.disabled = !ready;
        slider.min = "0";
        slider.max = String(
            ready ? minuteValues.length - 1 : 0
        );

        slider.value = String(
            ready ? currentIndex : 0
        );

        $("simulationMinuteLabel").textContent =
            `الدقيقة ${minute ?? 0}`;

        $("simulationEndMinute").textContent =
            ready
                ? `الدقيقة ${minuteValues[minuteValues.length - 1]}`
                : "—";

        $("playSimulationButton").disabled = !ready;
        $("resetSimulationButton").disabled = !ready;

        $("pauseSimulationButton").disabled =
            !ready || playbackTimer == null;

        $("simulationPlaybackHint").textContent =
            ready
                ? `إعادة عرض ${minuteValues.length} نقطة زمنية محفوظة من نتائج المحاكاة.`
                : "شغّلي محاكاة أو اختاري نتائج محفوظة.";

        if (!ready) {
            $("simulationTopZone").textContent = "—";
            $("simulationTopPercent").textContent = "—";
            $("simulationHighRiskZones").textContent = "—";
            $("simulationTotalOccupancy").textContent = "—";
            $("simulationTotalQueue").textContent = "—";
            $("simulationQueuedZones").textContent = "—";

            tableMessage(
                snapshotsBody,
                4,
                "لا توجد نتائج محفوظة لهذه المحاكاة."
            );

            drawMapOverlay([]);

            document.dispatchEvent(new CustomEvent(
                "mergab:simulation-frame",
                {
                    detail: {
                        zones,
                        rows: [],
                        connections,
                        minute: null,
                        simulation: selectedSimulation
                    }
                }
            ));

            return;
        }

        const rows = snapshotsAtCurrentMinute();


        // Live insights from actual simulation snapshots
        const zoneInsights = rows.map(snapshot => {
            const zone = zones.find(z =>
                String(z.id) === String(snapshot.zone?.id)
            );

            const capacity = Number(
                zone?.capacity ?? snapshot.zone?.capacity
            );

            const occupancy = Number(snapshot.occupancy) || 0;

            return {
                name: zone?.name || snapshot.zone?.name || "غير معروفة",
                occupancy,
                percent: capacity > 0
                    ? (occupancy / capacity) * 100
                    : 0,
                validCapacity: capacity > 0
            };
        });

        const topZone = [...zoneInsights]
            .filter(zone => zone.validCapacity)
            .sort((a, b) => b.percent - a.percent)[0];

        const highRiskCount = zoneInsights.filter(zone =>
            zone.validCapacity && zone.percent >= 75
        ).length;

        $("simulationTopZone").textContent =
            topZone?.name || "—";

        $("simulationTopPercent").textContent =
            topZone
                ? `${Math.round(topZone.percent)}%`
                : "—";

        $("simulationHighRiskZones").textContent =
            String(highRiskCount);

        const occupancyTotal = rows.reduce(
            (sum, row) =>
                sum + Number(row.occupancy),
            0
        );

        const queueTotal = rows.reduce(
            (sum, row) =>
                sum + Number(row.queueLength),
            0
        );

        const queuedZones = rows.filter(
            row => Number(row.queueLength) > 0
        ).length;

        $("simulationTotalOccupancy").textContent =
            formatNumber(occupancyTotal);

        $("simulationTotalQueue").textContent =
            formatNumber(queueTotal);

        $("simulationQueuedZones").textContent =
            formatNumber(queuedZones);

        snapshotsBody.replaceChildren();

        const sorted = [...rows].sort(
            (a, b) =>
                String(a.zone?.name || "")
                    .localeCompare(
                        String(b.zone?.name || ""),
                        "ar"
                    )
        );

        sorted.forEach(snapshot => {
            const zone = zones.find(z =>
                String(z.id) ===
                String(snapshot.zone?.id)
            );

            const capacity = Number(
                zone?.capacity ??
                snapshot.zone?.capacity
            );

            const occupancy =
                Number(snapshot.occupancy);

            const percent = capacity > 0
                ? Math.round(
                occupancy / capacity * 100
            ) + "%"
                : "—";

            const row = document.createElement("tr");

            cell(
                row,
                zone?.name ||
                snapshot.zone?.name ||
                "منطقة غير معروفة"
            );

            cell(row, formatNumber(occupancy));
            cell(row, percent);

            cell(
                row,
                formatNumber(snapshot.queueLength)
            );

            snapshotsBody.appendChild(row);
        });

        if (!rows.length) {
            tableMessage(
                snapshotsBody,
                4,
                "لا توجد نتائج لهذه الدقيقة."
            );
        }

        // Only show map percentages when each
        // positioned zone has a real snapshot.
        const mappedZones =
            zones.filter(hasPosition);

        const byId = new Map(
            rows
                .filter(row => row.zone?.id != null)
                .map(row => [
                    String(row.zone.id),
                    row
                ])
        );

        if (
            map &&
            mappedZones.every(zone =>
                byId.has(String(zone.id))
            )
        ) {
            map.setOccupancy(
                mappedZones.map(zone => ({
                    id: zone.id,
                    name: zone.name,
                    capacity: zone.capacity,

                    simulationOccupancy:
                        Number(
                            byId.get(String(zone.id))
                                .occupancy
                        )
                }))
            );

            map.setHeat(true);
            window.MergabMap?.paintCrowd?.(mapEl, map.getZones());

        } else if (map) {
            map.setHeat(false);
        }

        drawMapOverlay(rows);

        document.dispatchEvent(new CustomEvent(
            "mergab:simulation-frame",
            {
                detail: {
                    zones,
                    rows,
                    connections,
                    minute,
                    simulation: selectedSimulation
                }
            }
        ));

        setStatus(`نتائج الدقيقة ${minute}`);
    }

    // =====================================
    // PLAYBACK CONTROLS
    // =====================================

    function stopPlayback() {
        if (playbackTimer !== null) {
            clearInterval(playbackTimer);
            playbackTimer = null;

            $("pauseSimulationButton").disabled = true;

            document.dispatchEvent(new CustomEvent(
                "mergab:simulation-playback",
                { detail: { playing: false } }
            ));
        }
    }

    function showMinuteIndex(index) {
        if (!minuteValues.length) return;

        currentIndex = Math.max(
            0,
            Math.min(
                minuteValues.length - 1,
                index
            )
        );

        updateMinute();
    }

    function play() {
        if (
            playbackTimer !== null ||
            !minuteValues.length
        ) {
            return;
        }

        if (
            currentIndex >=
            minuteValues.length - 1
        ) {
            showMinuteIndex(0);
        }

        const speed = Number(
            $("simulationPlaybackSpeed").value
        ) || 1;

        playbackTimer = setInterval(() => {
            if (
                currentIndex >=
                minuteValues.length - 1
            ) {
                stopPlayback();
                return;
            }

            showMinuteIndex(currentIndex + 1);

        }, 1000 / speed);

        $("pauseSimulationButton").disabled = false;

        document.dispatchEvent(new CustomEvent(
            "mergab:simulation-playback",
            { detail: { playing: true } }
        ));
    }

    $("playSimulationButton")
        .addEventListener("click", play);

    $("pauseSimulationButton")
        .addEventListener("click", stopPlayback);

    $("resetSimulationButton").addEventListener(
        "click",
        () => {
            stopPlayback();
            showMinuteIndex(0);
        }
    );

    $("simulationPlaybackSpeed").addEventListener(
        "change",
        () => {
            if (playbackTimer !== null) {
                stopPlayback();
                play();
            }
        }
    );

    $("simulationTimeline").addEventListener(
        "input",
        event => {
            stopPlayback();

            showMinuteIndex(
                Number(event.target.value)
            );
        }
    );

    window.addEventListener(
        "pagehide",
        stopPlayback
    );

    // =====================================
    // VIEW SAVED RESULTS
    // =====================================

    function clearView() {
        stopPlayback();
        selectionRequest++;

        selectedSimulation = null;
        snapshots = [];
        minuteValues = [];
        currentIndex = 0;

        $("selectedSimulationLabel").textContent =
            "لم يتم اختيار محاكاة";

        updateMinute();

        setStatus("بانتظار اختيار محاكاة");
    }

    async function viewSimulation(simulation) {
        stopPlayback();

        const thisRequest = ++selectionRequest;

        selectedSimulation = simulation;
        snapshots = [];
        minuteValues = [];
        currentIndex = 0;

        $("selectedSimulationLabel").textContent =
            `محاكاة #${simulation.id}`;

        setStatus("جارٍ تحميل نتائج المحاكاة...");

        updateMinute();

        try {
            const result = await request(
                `${SNAP_API}/get-by-simulation/${simulation.id}`
            );

            if (thisRequest !== selectionRequest) {
                return;
            }

            if (!Array.isArray(result)) {
                throw new Error(
                    "استجابة النتائج غير صحيحة."
                );
            }

            snapshots = result.filter(snapshot =>
                Number.isInteger(snapshot.minute) &&
                Number.isFinite(
                    Number(snapshot.occupancy)
                ) &&
                Number.isFinite(
                    Number(snapshot.queueLength)
                ) &&
                snapshot.zone?.id != null
            );

            minuteValues = [
                ...new Set(
                    snapshots.map(snapshot =>
                        Number(snapshot.minute)
                    )
                )
            ].sort((a, b) => a - b);

            updateMinute();

            if (!minuteValues.length) {
                setStatus(
                    "هذه المحاكاة لا تحتوي على نتائج محفوظة"
                );
            }

        } catch (error) {
            if (thisRequest !== selectionRequest) {
                return;
            }

            notice(
                "تعذر تحميل نتائج المحاكاة: " +
                error.message
            );

            setStatus("تعذر تحميل النتائج");
        }
    }

    // =====================================
    // SIMULATIONS TABLE
    // =====================================

    function statusDetails(status) {
        const statuses = {
            PENDING: ["بانتظار التشغيل", "pending"],
            RUNNING: ["قيد الحساب", "running"],
            COMPLETED: ["مكتملة", "completed"],
            FAILED: ["فشلت", "failed"]
        };

        return statuses[status] ||
            [status || "غير معروفة", "pending"];
    }

    function renderSimulations() {
        tableBody.replaceChildren();

        $("simulationsCount").textContent =
            `${simulations.length} محاكاة`;

        $("totalSimulationsCount").textContent =
            formatNumber(simulations.length);

        $("completedSimulationsCount").textContent =
            formatNumber(
                simulations.filter(sim =>
                    sim.status === "COMPLETED"
                ).length
            );

        $("pendingSimulationsCount").textContent =
            formatNumber(
                simulations.filter(sim =>
                    sim.status === "PENDING"
                ).length
            );

        if (!simulations.length) {
            tableMessage(
                tableBody,
                6,
                "ما فيه محاكاة محفوظة بعد."
            );
            return;
        }

        const sorted = [...simulations].sort(
            (a, b) => Number(b.id) - Number(a.id)
        );

        sorted.forEach(simulation => {
            const row = document.createElement("tr");

            cell(
                row,
                `محاكاة #${simulation.id}`
            );

            cell(
                row,
                `${formatNumber(simulation.durationMinutes)} دقيقة`
            );

            cell(
                row,
                simulation.randomSeed ?? "—"
            );

            const statusCell =
                document.createElement("td");

            const [label, className] =
                statusDetails(simulation.status);

            const badge =
                document.createElement("span");

            badge.className =
                `simulation-status ${className}`;

            badge.textContent = label;

            statusCell.appendChild(badge);
            row.appendChild(statusCell);

            cell(
                row,
                formatDate(simulation.startDateTime)
            );

            const actions =
                document.createElement("td");

            actions.appendChild(
                actionButton(
                    "visibility",
                    "عرض النتائج",
                    () => viewSimulation(simulation)
                )
            );

            if (simulation.status === "PENDING") {
                actions.appendChild(
                    actionButton(
                        "play_circle",
                        "تشغيل المحاكاة",
                        () => runSimulation(simulation)
                    )
                );

                actions.appendChild(
                    actionButton(
                        "edit",
                        "تعديل المحاكاة",
                        () => openEditor(simulation)
                    )
                );
            }

            if (simulation.status !== "RUNNING") {
                actions.appendChild(
                    actionButton(
                        "delete",
                        "حذف المحاكاة",
                        () => deleteSimulation(simulation),
                        true
                    )
                );
            }

            row.appendChild(actions);
            tableBody.appendChild(row);
        });
    }

    async function loadSimulations() {
        const data = await request(
            `${SIM_API}/get-all`
        );

        if (!Array.isArray(data)) {
            throw new Error(
                "استجابة المحاكاة غير صحيحة."
            );
        }

        simulations = data;
        renderSimulations();

        if (selectedSimulation) {
            selectedSimulation =
                simulations.find(sim =>
                    sim.id === selectedSimulation.id
                ) || selectedSimulation;
        }
    }

    // =====================================
    // HISTORICAL ATTENDANCE SELECT
    // =====================================

    function populateAttendance() {
        const select = $("simulationAttendance");

        select.replaceChildren();

        const first =
            document.createElement("option");

        first.value = "";

        first.textContent = attendances.length
            ? "اختاري سجل الحضور"
            : "لا توجد سجلات حضور";

        select.appendChild(first);

        attendances.forEach(item => {
            const option =
                document.createElement("option");

            option.value = String(item.id);

            option.textContent =
                `${item.expoName} — ${item.attendanceDate} ` +
                `(${formatNumber(item.totalAttendance)} زائر)`;

            select.appendChild(option);
        });
    }

    // =====================================
    // ADD / EDIT SIMULATION
    // =====================================

    function openEditor(simulation = null) {
        if (busy) return;

        if (!simulation && !attendances.length) {
            notice(
                "ما فيه سجلات حضور تاريخي. " +
                "أضيفي سجل حضور أولًا قبل إنشاء محاكاة."
            );
            return;
        }

        if (
            simulation &&
            simulation.status !== "PENDING"
        ) {
            notice(
                "التعديل متاح للمحاكاة التي لم تُشغّل فقط."
            );
            return;
        }

        form.reset();

        $("simulationFormMessage").hidden = true;

        editingId = simulation?.id ?? null;

        $("simulationId").value =
            editingId ?? "";

        $("simulationEditorTitle").textContent =
            simulation
                ? "تعديل محاكاة"
                : "إنشاء محاكاة جديدة";

        $("simulationDuration").value =
            simulation?.durationMinutes ?? 30;

        $("simulationSeed").value =
            simulation?.randomSeed ?? "";

        populateAttendance();

        const attendance =
            $("simulationAttendance");

        if (simulation) {
            // HistoricalAttendance is @JsonIgnore
            // and cannot be changed by updateSimulation.
            attendance.replaceChildren();

            const option =
                document.createElement("option");

            option.value = "";

            option.textContent =
                "سجل الحضور مرتبط بالمحاكاة ولا يمكن تغييره هنا";

            attendance.appendChild(option);

            attendance.disabled = true;
            attendance.required = false;

        } else {
            attendance.disabled = false;
            attendance.required = true;
        }

        editor.hidden = false;

        editor.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });
    }

    function closeEditor() {
        if (busy) return;

        editor.hidden = true;
        form.reset();

        editingId = null;

        $("simulationAttendance").disabled = false;
        $("simulationAttendance").required = true;
    }

    $("addSimulationButton").addEventListener(
        "click",
        () => openEditor()
    );

    $("closeSimulationEditor").addEventListener(
        "click",
        closeEditor
    );

    $("cancelSimulationButton").addEventListener(
        "click",
        closeEditor
    );

    // =====================================
    // SAVE SIMULATION
    // =====================================

    form.addEventListener("submit", async event => {
        event.preventDefault();

        if (busy) return;

        $("simulationFormMessage").hidden = true;

        const durationMinutes =
            Number($("simulationDuration").value);

        const randomSeed =
            Number($("simulationSeed").value);

        const historicalId =
            $("simulationAttendance").value;

        if (
            !Number.isInteger(durationMinutes) ||
            durationMinutes < 1 ||
            durationMinutes > 600
        ) {
            formMessage(
                "المدة لازم تكون من 1 إلى 600 دقيقة."
            );
            return;
        }

        if (
            $("simulationSeed").value.trim() === "" ||
            !Number.isSafeInteger(randomSeed)
        ) {
            formMessage(
                "أدخلي Random Seed كعدد صحيح."
            );
            return;
        }

        if (
            editingId == null &&
            !historicalId
        ) {
            formMessage(
                "اختاري سجل حضور تاريخي."
            );
            return;
        }

        busy = true;
        saveButton.disabled = true;

        try {
            const url = editingId == null
                ? `${SIM_API}/add/${historicalId}`
                : `${SIM_API}/update/${editingId}`;

            await request(url, {
                method:
                    editingId == null ? "POST" : "PUT",

                body: JSON.stringify({
                    durationMinutes,
                    randomSeed
                })
            });

            editor.hidden = true;
            editingId = null;

            await loadSimulations();

            notice(
                "تم حفظ المحاكاة بنجاح.",
                "success"
            );

        } catch (error) {
            formMessage(error.message);

        } finally {
            busy = false;
            saveButton.disabled = false;
        }
    });

    // =====================================
    // RUN REAL BACKEND SIMULATION
    // =====================================

    async function runSimulation(simulation) {
        if (
            busy ||
            simulation.status !== "PENDING"
        ) {
            return;
        }

        const confirmed = window.confirm(
            `تشغيل المحاكاة #${simulation.id}؟ ` +
            "سيتم حساب النتائج وحفظها في قاعدة البيانات."
        );

        if (!confirmed) return;

        busy = true;
        stopPlayback();

        notice(
            `جارٍ حساب المحاكاة #${simulation.id} في الباك إند...`,
            "success"
        );

        setStatus("جارٍ تنفيذ المحاكاة...");

        try {
            const result = await request(
                `${SIM_API}/run/${simulation.id}`,
                {
                    method: "POST"
                }
            );

            if (!Array.isArray(result)) {
                throw new Error(
                    "لم يرجع المحرك قائمة النتائج المتوقعة."
                );
            }

            await loadSimulations();

            const updated =
                simulations.find(sim =>
                    sim.id === simulation.id
                ) || simulation;

            await viewSimulation(updated);

            notice(
                "اكتمل تشغيل المحاكاة. " +
                "تقدرين تستعرضين النتائج بشريط الزمن.",
                "success"
            );

        } catch (error) {
            notice(
                "تعذر تشغيل المحاكاة: " +
                error.message
            );

            try {
                await loadSimulations();
            } catch (_) {}

            setStatus("تعذر تشغيل المحاكاة");

        } finally {
            busy = false;
        }
    }

    // =====================================
    // DELETE SIMULATION
    // =====================================

    async function deleteSimulation(simulation) {
        if (busy) return;

        const confirmed = window.confirm(
            `حذف المحاكاة #${simulation.id} ونتائجها المحفوظة؟`
        );

        if (!confirmed) return;

        busy = true;

        try {
            await request(
                `${SIM_API}/delete/${simulation.id}`,
                {
                    method: "DELETE"
                }
            );

            if (
                selectedSimulation?.id ===
                simulation.id
            ) {
                clearView();
            }

            await loadSimulations();

            notice(
                "تم حذف المحاكاة بنجاح.",
                "success"
            );

        } catch (error) {
            notice(
                "تعذر حذف المحاكاة: " +
                error.message
            );

        } finally {
            busy = false;
        }
    }

    // =====================================
    // LOAD ZONES, ROUTES AND ATTENDANCE
    // =====================================

    async function loadReferenceData() {
        const results = await Promise.allSettled([
            request("/api/v1/zone/get"),
            request("/api/v1/zone-connection/get"),
            request("/api/v1/attendance/get-all")
        ]);

        const [
            zoneResult,
            connectionResult,
            attendanceResult
        ] = results;

        zones =
            zoneResult.status === "fulfilled" &&
            Array.isArray(zoneResult.value)
                ? zoneResult.value
                : [];

        connections =
            connectionResult.status === "fulfilled" &&
            Array.isArray(connectionResult.value)
                ? connectionResult.value
                : [];

        attendances =
            attendanceResult.status === "fulfilled" &&
            Array.isArray(attendanceResult.value)
                ? attendanceResult.value
                : [];

        if (zoneResult.status === "rejected") {
            console.error(
                "Zones loading failed:",
                zoneResult.reason
            );
        }

        if (connectionResult.status === "rejected") {
            console.error(
                "Connections loading failed:",
                connectionResult.reason
            );
        }

        if (attendanceResult.status === "rejected") {
            console.error(
                "Attendance loading failed:",
                attendanceResult.reason
            );
        }

        populateAttendance();
        renderMap();

        if (
            zoneResult.status === "rejected" ||
            connectionResult.status === "rejected"
        ) {
            notice(
                "الخريطة ظاهرة، لكن بعض بيانات المناطق " +
                "أو المسارات ما تحمّلت."
            );
        }
    }

    // =====================================
    // INITIALIZE
    // =====================================

    // Map must appear even when there are
    // no simulations or zones in the database.
    renderMap();

    Promise.allSettled([
        loadReferenceData(),
        loadSimulations()
    ]).then(results => {
        if (results[1].status === "rejected") {
            console.error(
                "Simulation list failed:",
                results[1].reason
            );

            $("totalSimulationsCount").textContent = "—";
            $("completedSimulationsCount").textContent = "—";
            $("pendingSimulationsCount").textContent = "—";
            $("simulationsCount").textContent = "—";

            tableMessage(
                tableBody,
                6,
                "تعذر تحميل المحاكاة من الباك إند."
            );

            notice(
                "تعذر تحميل قائمة المحاكاة: " +
                results[1].reason.message
            );
        }
    });
});
