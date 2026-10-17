
/* ==========================================
   MERGAB | SHARED MAP DATA
   Zones, Boundaries, Routes & Directions
   ========================================== */

(function (global) {
    "use strict";

    const SVG_NS = "http://www.w3.org/2000/svg";

    const MAP_IMAGE =
        "/img/map/expo-map-concept.jpg";

    // ======================================
    // FETCH DATABASE DATA
    // ======================================

    async function getList(path) {

        const response = await fetch("/api/v1" + path, {
            headers: {
                Accept: "application/json"
            },
            credentials: "same-origin",
            cache: "no-store"
        });

        if (!response.ok) {
            throw new Error(
                `Map API ${response.status}: ${path}`
            );
        }

        const data = await response.json();

        if (Array.isArray(data)) return data;

        if (Array.isArray(data?.data)) {
            return data.data;
        }

        if (Array.isArray(data?.content)) {
            return data.content;
        }

        throw new Error(
            "Invalid map response: " + path
        );
    }

    // ======================================
    // MAP COORDINATES
    // ======================================

    function validPosition(zone) {

        const x = Number(zone?.mapX);
        const y = Number(zone?.mapY);

        return (
            zone?.id != null &&
            zone.mapX != null &&
            zone.mapY != null &&
            Number.isFinite(x) &&
            Number.isFinite(y) &&
            x >= 0 &&
            x <= 100 &&
            y >= 0 &&
            y <= 100
        );
    }

    function toMarkers(zones) {

        return zones
            .filter(validPosition)
            .sort((a, b) =>
                Number(a.id) - Number(b.id)
            )
            .map(zone => ({
                key: String(zone.id),
                id: zone.id,

                name: {
                    ar: String(zone.name || ""),
                    en: String(zone.name || "")
                },

                x: Number(zone.mapX),
                y: Number(zone.mapY)
            }));
    }

    function zoneId(value) {
        return value?.id ?? value ?? null;
    }

    // Map-engine graph connections
    function toEdges(connections, markers) {

        const ids = new Set(
            markers.map(marker => marker.key)
        );

        const seen = new Set();
        const edges = [];

        for (const connection of connections) {

            const from = zoneId(
                connection?.fromZone ??
                connection?.fromZoneId
            );

            const to = zoneId(
                connection?.toZone ??
                connection?.toZoneId
            );

            if (from == null || to == null) {
                continue;
            }

            const a = String(from);
            const b = String(to);

            if (
                a === b ||
                !ids.has(a) ||
                !ids.has(b)
            ) {
                continue;
            }

            const key = [a, b]
                .sort()
                .join(":");

            if (seen.has(key)) continue;

            seen.add(key);
            edges.push([a, b]);
        }

        return edges;
    }

    // Saved drawings between zones, keyed "from|to"
    // so visitor routes follow the real drawn paths.
    function toEdgePaths(connections, markers) {
        const ids = new Set(markers.map(marker => marker.key));
        const byKey = new Map(markers.map(m => [m.key, m]));
        const out = {};

        for (const connection of connections) {
            const from = String(zoneId(connection?.fromZone ?? connection?.fromZoneId));
            const to = String(zoneId(connection?.toZone ?? connection?.toZoneId));

            if (!ids.has(from) || !ids.has(to) || from === to) continue;

            let points = parsePoints(connection.pathPoints, 2);
            if (!points.length) continue;

            const a = byKey.get(from);
            const b = byKey.get(to);
            const d = (p, m) => (p[0] - m.x) ** 2 + (p[1] - m.y) ** 2;

            if (d(points[0], b) + d(points.at(-1), a) <
                d(points[0], a) + d(points.at(-1), b)) {
                points = [...points].reverse();
            }

            if (!out[`${from}|${to}`]) out[`${from}|${to}`] = points;
        }

        return out;
    }

    // ======================================
    // SAVED POINTS
    // ======================================

    function parsePoints(value, minimum = 2) {

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
                point.every(number =>
                    typeof number === "number" &&
                    Number.isFinite(number) &&
                    number >= 0 &&
                    number <= 100
                )
            );

            return valid ? points : [];

        } catch {
            return [];
        }
    }

    // ======================================
    // SVG HELPERS
    // ======================================

    function svgElement(parent, tag, attributes) {

        const element =
            document.createElementNS(
                SVG_NS,
                tag
            );

        Object.entries(attributes).forEach(
            ([key, value]) => {
                element.setAttribute(
                    key,
                    String(value)
                );
            }
        );

        parent.appendChild(element);

        return element;
    }

    // ======================================
    // VISUAL HELPERS (redesign)
    // ======================================

    const LEVEL_COLORS = {
        critical: "#E5484D",
        high: "#F0803C",
        medium: "#F2C94C",
        low: "#3FB27F"
    };

    function svgRatioOf(svg) {
        const w = svg?.clientWidth;
        const h = svg?.clientHeight;
        return w && h ? w / h : 1.5;
    }

    function pathFrom(points) {
        return points
            .map((p, i) => `${i ? "L" : "M"}${p[0]} ${p[1]}`)
            .join(" ");
    }

    function lengthOf(points, ratio) {
        let total = 0;

        for (let i = 1; i < points.length; i++) {
            total += Math.hypot(
                (points[i][0] - points[i - 1][0]) * ratio,
                points[i][1] - points[i - 1][1]
            );
        }

        return total;
    }

    // Small glowing dots that travel along a saved path
    function movingDots(layer, d, count, duration, ratio, color) {
        for (let i = 0; i < count; i++) {
            const dot = svgElement(layer, "g", {
                class: "mg-dot"
            });

            svgElement(dot, "ellipse", {
                rx: 1.25 / ratio,
                ry: 1.25,
                fill: color,
                opacity: 0.35
            });

            svgElement(dot, "ellipse", {
                rx: 0.5 / ratio,
                ry: 0.5,
                class: "mg-dot-head"
            });

            const motion = svgElement(dot, "animateMotion", {
                dur: duration.toFixed(2) + "s",
                repeatCount: "indefinite",
                path: d,
                begin: (-(duration / count) * i).toFixed(2) + "s"
            });

            motion.setAttribute("rotate", "auto");
        }
    }

    function levelFromRatio(ratio) {
        if (ratio == null || !Number.isFinite(ratio)) return null;
        if (ratio >= 0.9) return "critical";
        if (ratio >= 0.75) return "high";
        if (ratio >= 0.5) return "medium";
        return "low";
    }

    // Colour zone boundaries + heat glow from live occupancy
    function paintCrowd(target, infos) {
        const root = typeof target === "string"
            ? document.querySelector(target) : target;

        const layer = root?.querySelector("[data-mergab-saved-geometry]");
        if (!layer || !Array.isArray(infos)) return;

        const byId = new Map(
            infos
                .filter(info => info && info.id != null)
                .map(info => [String(info.id), info])
        );

        layer.querySelectorAll("[data-zone-id]").forEach(node => {
            const info = byId.get(node.dataset.zoneId);
            const level = levelFromRatio(info?.ratio);
            const color = level ? LEVEL_COLORS[level] : "#247C59";

            if (node.classList.contains("mg-heat")) {
                node.setAttribute("fill", level
                    ? `url(#${node.dataset.gradPrefix}-${level})`
                    : "none");

                const scale = 0.7 + Math.min(1.1, info?.ratio || 0) * 0.6;
                node.setAttribute("rx", (node.dataset.baseRx * scale).toFixed(3));
                node.setAttribute("ry", (node.dataset.baseRy * scale).toFixed(3));
                return;
            }

            if (node.classList.contains("mg-gdot")) {
                node.setAttribute("fill", color);
                return;
            }

            node.setAttribute("stroke", color);

            if (node.classList.contains("mg-zone")) {
                node.setAttribute("fill", color);
                node.classList.toggle("mg-zone-crit", level === "critical");
            }
        });
    }

    function distanceSquared(point, zone) {

        return (
            (point[0] - Number(zone.mapX)) ** 2 +
            (point[1] - Number(zone.mapY)) ** 2
        );
    }

    // Keep arrows pointing from fromZone to toZone
    // even if the saved drawing was reversed.

    function orientPoints(
        points,
        connection,
        zoneById
    ) {

        const fromId = zoneId(
            connection.fromZone ??
            connection.fromZoneId
        );

        const toId = zoneId(
            connection.toZone ??
            connection.toZoneId
        );

        const from = zoneById.get(
            String(fromId)
        );

        const to = zoneById.get(
            String(toId)
        );

        if (
            !from ||
            !to ||
            !validPosition(from) ||
            !validPosition(to)
        ) {
            return points;
        }

        const first = points[0];
        const last = points[points.length - 1];

        const forward =
            distanceSquared(first, from) +
            distanceSquared(last, to);

        const backward =
            distanceSquared(first, to) +
            distanceSquared(last, from);

        return backward < forward
            ? [...points].reverse()
            : points;
    }

    // ======================================
    // SHARED SAVED-GEOMETRY OVERLAY
    // ======================================

    function drawSavedGeometry(
        target,
        zones = [],
        connections = []
    ) {

        const root =
            typeof target === "string"
                ? document.querySelector(target)
                : target;

        const svg = root?.querySelector(
            ".mqm-isvg"
        );

        if (!svg) return false;

        // Remove previously drawn saved geometry.
        svg.querySelector(
            "[data-mergab-saved-geometry]"
        )?.remove();

        const layer = svgElement(
            svg,
            "g",
            {
                "data-mergab-saved-geometry": "true",
                "pointer-events": "none"
            }
        );

        // Keep saved geometry beneath interactive routes.
        svg.prepend(layer);

        // ==================================
        // ZONE BOUNDARIES
        // ==================================

        const ratio = svgRatioOf(svg);
        const gradPrefix = "mgHeat" + Math.random().toString(36).slice(2, 8);
        const defs = svgElement(layer, "defs", {});

        Object.entries(LEVEL_COLORS).forEach(([level, color]) => {
            const gradient = svgElement(defs, "radialGradient", {
                id: `${gradPrefix}-${level}`
            });

            svgElement(gradient, "stop", { offset: "0", "stop-color": color, "stop-opacity": 0.75 });
            svgElement(gradient, "stop", { offset: "0.55", "stop-color": color, "stop-opacity": 0.28 });
            svgElement(gradient, "stop", { offset: "1", "stop-color": color, "stop-opacity": 0 });
        });

        for (const zone of zones) {

            const points = parsePoints(
                zone.boundaryPoints,
                3
            );

            if (!points.length) continue;

            const polygonPoints = points
                .map(point => point.join(","))
                .join(" ");

            // Crowd heat glow at the zone centre
            if (validPosition(zone)) {
                const xs = points.map(p => p[0]);
                const ys = points.map(p => p[1]);
                const rx = Math.max(3, (Math.max(...xs) - Math.min(...xs)) / 2);
                const ry = Math.max(3, (Math.max(...ys) - Math.min(...ys)) / 2);

                const heat = svgElement(layer, "ellipse", {
                    class: "mg-heat",
                    cx: zone.mapX,
                    cy: zone.mapY,
                    rx,
                    ry,
                    fill: "none",
                    "data-zone-id": zone.id,
                    "data-grad-prefix": gradPrefix
                });

                heat.dataset.baseRx = rx;
                heat.dataset.baseRy = ry;
            }

            const groundDot = validPosition(zone) ? zone : null;

            svgElement(layer, "polygon", {
                class: "mg-zone",
                "data-zone-id": zone.id,
                points: polygonPoints,

                fill: "#247C59",
                "fill-opacity": 0.16,

                stroke: "#247C59",
                "stroke-opacity": 0.55,
                "stroke-width": 3,
                "stroke-linejoin": "round",
                "vector-effect": "non-scaling-stroke"
            });

            svgElement(layer, "polygon", {
                class: "mg-zone-edge",
                "data-zone-id": zone.id,
                points: polygonPoints,
                stroke: "#247C59",
                "stroke-width": 0.35,
                "stroke-linejoin": "round"
            });

            // Small pulsing dot where the zone label stands
            if (groundDot) {
                svgElement(layer, "ellipse", {
                    class: "mg-gdot",
                    "data-zone-id": zone.id,
                    cx: zone.mapX,
                    cy: zone.mapY,
                    rx: 0.75 / ratio,
                    ry: 0.75,
                    fill: "#3FB27F"
                });
            }
        }

        // ==================================
        // SAVED ROUTES
        // ==================================

        const zoneById = new Map(
            zones.map(zone => [
                String(zone.id),
                zone
            ])
        );

        for (const connection of connections) {

            const rawPoints = parsePoints(
                connection.pathPoints,
                2
            );

            // Do not invent a route when no
            // drawing was saved in the database.
            if (!rawPoints.length) continue;

            const points = orientPoints(
                rawPoints,
                connection,
                zoneById
            );

            const pathData = pathFrom(points);

            // Soft glow + white outline
            svgElement(layer, "path", {
                d: pathData,
                class: "mg-line mg-conn-casing",
                stroke: "#FFFFFF",
                "stroke-opacity": 0.95,
                "stroke-width": 1.35
            });

            // Gold route
            const routePath = svgElement(
                layer,
                "path",
                {
                    d: pathData,
                    class: "mg-line mg-conn",
                    stroke: "#B6863C",
                    "stroke-width": 0.75
                }
            );

            // Animated flow (from → to, as saved)
            svgElement(layer, "path", {
                d: pathData,
                class: "mg-flow",
                stroke: "#FFF6DF",
                "stroke-width": 2,
                "stroke-dasharray": "2 12",
                "vector-effect": "non-scaling-stroke"
            });

            // Visitors moving along the connection
            const travel = lengthOf(points, ratio);

            if (travel > 4) {
                movingDots(
                    layer,
                    pathData,
                    travel > 25 ? 3 : 2,
                    Math.max(3, Math.min(12, travel / 4.5)),
                    ratio,
                    "#E2B865"
                );
            }

            // ==============================
            // DIRECTION ARROWS
            // ==============================

            const length =
                routePath.getTotalLength();

            if (
                !Number.isFinite(length) ||
                length < 2
            ) {
                continue;
            }

            const positions =
                length >= 15
                    ? [0.35, 0.70]
                    : [0.50];

            for (const position of positions) {

                const distance =
                    length * position;

                const center =
                    routePath.getPointAtLength(
                        distance
                    );

                const before =
                    routePath.getPointAtLength(
                        Math.max(
                            0,
                            distance - 0.5
                        )
                    );

                const after =
                    routePath.getPointAtLength(
                        Math.min(
                            length,
                            distance + 0.5
                        )
                    );

                const angle =
                    Math.atan2(
                        after.y - before.y,
                        after.x - before.x
                    ) * 180 / Math.PI;

                const arrow = svgElement(
                    layer,
                    "polygon",
                    {
                        points:
                            "0,0 -1.25,0.56 -1.25,-0.56",

                        fill: "#B6863C",
                        stroke: "#FFFFFF",
                        "stroke-width": 0.16,

                        "stroke-linejoin": "round"
                    }
                );

                arrow.setAttribute(
                    "transform",
                    `translate(${center.x},${center.y}) rotate(${angle})`
                );
            }
        }

        return true;
    }


    // ======================================
    // ACTIVE WALKWAYS + FACILITY ACCESS
    // ======================================

    async function loadActiveNetwork(zones) {
        const facilities = await getList("/facility/get");

        const walkGroups = await Promise.all(
            zones.filter(zone => zone.id != null).map(async zone => {
                try {
                    const paths = await getList(
                        `/zone-walk-path/get-active-by-zone/${zone.id}`
                    );

                    return paths.map(path => ({
                        ...path,
                        zoneId: zone.id
                    }));
                } catch (error) {
                    console.warn("Zone walk paths:", zone.id, error);
                    return [];
                }
            })
        );

        const accessGroups = await Promise.all(
            facilities.filter(f => f.id != null).map(async facility => {
                try {
                    const paths = await getList(
                        `/facility-access-path/get-active-by-facility/${facility.id}`
                    );
                    return paths.map(path => ({
                        ...path,
                        facilityId: facility.id
                    }));
                } catch (error) {
                    console.warn("Facility access paths:", facility.id, error);
                    return [];
                }
            })
        );

        return {
            facilities,
            walkPaths: walkGroups.flat(),
            accessPaths: accessGroups.flat()
        };
    }

    function drawActiveNetwork(target, network) {
        const root = typeof target === "string"
            ? document.querySelector(target) : target;

        const svg = root?.querySelector(".mqm-isvg");
        if (!svg) return;

        svg.querySelector("#mergabActiveNetwork")?.remove();

        const layer = svgElement(svg, "g", {
            id: "mergabActiveNetwork",
            "pointer-events": "none"
        });

        const ratio = svgRatioOf(svg);

        function drawRoute(value, color, direction, title, kind) {
            const points = parsePoints(value);
            if (points.length < 2) return;

            const d = pathFrom(points);

            svgElement(layer, "path", {
                d,
                class: `mg-line mg-${kind}-casing`,
                stroke: "#FFFFFF",
                "stroke-opacity": 0.85,
                "stroke-width": 1.05
            });

            const line = svgElement(layer, "path", {
                d,
                class: "mg-line",
                stroke: color,
                "stroke-width": 0.6,
                "pointer-events": "none"
            });

            svgElement(line, "title", {}).textContent = title;

            // Flowing dashes show walking direction
            const flow = svgElement(layer, "path", {
                d: direction === "REVERSE" || direction === "FROM_FACILITY"
                    ? pathFrom([...points].reverse())
                    : d,
                class: "mg-flow",
                stroke: "#FFFFFF",
                "stroke-width": 1.6,
                "stroke-dasharray": kind === "access" ? "1.5 7" : "2 12",
                "stroke-opacity": 0.9,
                "vector-effect": "non-scaling-stroke"
            });

            if (direction === "BOTH") {
                flow.style.animationDuration = "2.6s";
            }

            if (kind === "walk" && lengthOf(points, ratio) > 8) {
                movingDots(layer, d, 1, Math.max(4, lengthOf(points, ratio) / 3), ratio, color);
            }

            let longest = null;
            let maxLength = 0;

            for (let i = 1; i < points.length; i++) {
                const a = points[i - 1];
                const b = points[i];

                const length = Math.hypot(
                    b[0] - a[0],
                    b[1] - a[1]
                );

                if (length > maxLength) {
                    longest = [a, b];
                    maxLength = length;
                }
            }

            if (!longest || maxLength < 1.5) return;

            const [a, b] = longest;

            const baseAngle = Math.atan2(
                b[1] - a[1],
                b[0] - a[0]
            ) * 180 / Math.PI;

            function arrow(at, reverse = false) {
                const x = a[0] + (b[0] - a[0]) * at;
                const y = a[1] + (b[1] - a[1]) * at;

                svgElement(layer, "polygon", {
                    points: "0,0 -1.15,0.5 -1.15,-0.5",
                    transform:
                        `translate(${x},${y}) rotate(${baseAngle + (reverse ? 180 : 0)})`,
                    fill: color,
                    stroke: "white",
                    "stroke-width": 0.12
                });
            }

            if (
                direction === "REVERSE" ||
                direction === "FROM_FACILITY"
            ) {
                arrow(0.5, true);
            } else if (direction === "BOTH") {
                arrow(0.32);
                arrow(0.68, true);
            } else {
                arrow(0.5);
            }
        }

        // Blue: internal walking paths
        for (const path of network.walkPaths) {
            drawRoute(
                path.pathPoints,
                "#247DB6",
                path.direction,
                path.name || "ممر داخلي",
                "walk"
            );
        }

        // Orange: facility access connections
        for (const path of network.accessPaths) {
            drawRoute(
                path.pathPoints,
                "#D28B24",
                path.direction,
                "وصلة مرفق",
                "access"
            );
        }
        const stage = root.querySelector(".mqm-istage");

        // Homepage already renders its own facility icons
        if (root.id === "homeExpoMap" || !stage) return;

        // Facility pins (type-aware icons, shared with organizer pages)
        global.MirqabMap?.facilityPins?.(stage, network.facilities);
    }

    // Animated route line used by visitor routes (same look as engine routes)
    function drawRouteLine(target, points, options = {}) {
        const root = typeof target === "string"
            ? document.querySelector(target) : target;

        const svg = root?.querySelector(".mqm-isvg");

        if (!svg || !global.MirqabMap?.buildRoute) return null;

        return global.MirqabMap.buildRoute(svg, points, options);
    }

    // Pulsing "you are here" pin
    function drawLocationPin(target, point, id) {
        const root = typeof target === "string"
            ? document.querySelector(target) : target;

        const svg = root?.querySelector(".mqm-isvg");
        if (!svg || !point) return null;

        const ratio = svgRatioOf(svg);

        const group = svgElement(svg, "g", {
            id,
            "pointer-events": "none"
        });

        svgElement(group, "ellipse", {
            class: "mg-me-pulse",
            cx: point[0], cy: point[1],
            rx: 1.4 / ratio, ry: 1.4
        });

        svgElement(group, "ellipse", {
            class: "mg-me-dot",
            cx: point[0], cy: point[1],
            rx: 1.05 / ratio, ry: 1.05
        });

        // "You are here" badge (HTML so it stays readable in 3D)
        const stage = svg.parentNode;
        stage.querySelectorAll(`.mg-me-badge[data-for="${id}"]`)
            .forEach(badge => badge.remove());

        const badge = document.createElement("div");
        badge.className = "mg-me-badge";
        badge.dataset.for = id;
        badge.style.left = point[0] + "%";
        badge.style.top = point[1] + "%";
        badge.innerHTML = "<span></span>";
        badge.firstChild.textContent =
            document.documentElement.lang === "en" ? "You are here" : "أنت هنا";
        stage.appendChild(badge);

        // Remove the badge when the pin is removed
        if (!svg._mgMeWatch && typeof MutationObserver !== "undefined") {
            svg._mgMeWatch = new MutationObserver(() => {
                stage.querySelectorAll(".mg-me-badge").forEach(item => {
                    if (!svg.querySelector("#" + CSS.escape(item.dataset.for))) {
                        item.remove();
                    }
                });
            });
            svg._mgMeWatch.observe(svg, { childList: true });
        }

        return group;
    }

    // ======================================
    // SHARED LIVE MAP
    // ======================================

    function mount(target, options = {}) {

        const element =
            typeof target === "string"
                ? document.querySelector(target)
                : target;

        if (!element) {
            throw new Error(
                "Map container not found"
            );
        }

        if (!global.MirqabMap) {
            throw new Error(
                "Load mirqab-map.js first"
            );
        }

        const imageSrc =
            options.imageSrc || MAP_IMAGE;

        const refreshMs =
            options.refreshMs === undefined
                ? 30000
                : options.refreshMs;

        let instance = null;
        let layoutSignature = null;
        let selectedKey = null;

        let stopped = false;
        let busy = false;

        // Recolour zones whenever the engine receives new occupancy
        element.addEventListener("mqm:update", event => {
            paintCrowd(element, event.detail);
        });

        let savedConnections = [];
        let savedNetwork = {
            facilities: [],
            walkPaths: [],
            accessPaths: []
        };

        function showMessage(message) {

            element.replaceChildren();

            const image =
                document.createElement("img");

            image.src = imageSrc;
            image.alt = "خريطة إكسبو";

            image.style.cssText =
                "display:block;width:100%;" +
                "max-height:450px;" +
                "object-fit:contain;";

            const paragraph =
                document.createElement("p");

            paragraph.style.cssText =
                "padding:15px;" +
                "text-align:center;" +
                "color:#43564d;";

            paragraph.textContent = message;

            element.append(
                image,
                paragraph
            );
        }

        // ==================================
        // LOAD LATEST DATABASE STATE
        // ==================================

        async function refresh() {

            if (stopped || busy) return;

            busy = true;

            try {

                const savedZones = await getList("/zone/get");

                const zones = options.autoOccupancy === false
                    ? savedZones
                    : await global.Mergab.withLiveOccupancy(savedZones);

                try {

                    savedConnections =
                        await getList(
                            "/zone-connection/get"
                        );

                } catch (error) {

                    console.warn(
                        "Unable to refresh zone connections:",
                        error
                    );
                }

                try {
                    savedNetwork = await loadActiveNetwork(zones);
                } catch (error) {
                    console.warn(
                        "Unable to refresh active network:",
                        error
                    );
                }

                if (stopped) return;

                const markers = toMarkers(zones);

                const edges = toEdges(
                    savedConnections,
                    markers
                );

                const currentLang =
                    options.lang ||
                    (
                        document.documentElement.lang === "en"
                            ? "en"
                            : "ar"
                    );

                const edgePaths = toEdgePaths(
                    savedConnections,
                    markers
                );

                const signature =
                    JSON.stringify({
                        markers,
                        edges,
                        edgePaths,
                        currentLang
                    });

                // Rebuild only when the zone layout
                // or connection graph changes.

                if (signature !== layoutSignature) {

                    if (instance) {
                        instance.destroy();
                    }

                    instance = null;
                    layoutSignature = signature;

                    if (!markers.length) {

                        showMessage(
                            options.emptyMessage ||
                            "لا توجد مناطق محددة على الخريطة حاليًا."
                        );

                    } else {

                        const start = markers.some(
                            marker =>
                                marker.key === selectedKey
                        )
                            ? selectedKey
                            : markers[0].key;

                        instance =
                            global.MirqabMap.create(
                                element,
                                {
                                    mode: "image",

                                    lang: currentLang,

                                    demo: false,

                                    matchBy: "id",

                                    imageFit: "contain",

                                    perspective:
                                        !!options.perspective,

                                    theme:
                                        options.theme || null,

                                    controls:
                                        options.controls !== false,

                                    start,

                                    imageLayout: {
                                        src: imageSrc,
                                        zones: markers,
                                        edges,
                                        edgePaths,
                                        hub: null,
                                        metersPerUnit: 8
                                    },

                                    onSelect(info) {

                                        selectedKey =
                                            info.key;

                                        if (
                                            typeof options.onSelect ===
                                            "function"
                                        ) {

                                            options.onSelect(
                                                info,
                                                zones.find(zone =>
                                                    String(zone.id) ===
                                                    String(info.id)
                                                )
                                            );
                                        }
                                    }
                                }
                            );
                    }
                }

                // Saved geometry gets redrawn on
                // every refresh, including updates
                // that don't change zone positions.

                if (instance) {
                    if (
                        options.autoOccupancy !== false &&
                        zones.every(zone => zone.currentCount !== null)
                    ) {
                        instance.setOccupancy(zones);
                    }


                    drawSavedGeometry(
                        element,
                        zones,
                        savedConnections
                    );
                    drawActiveNetwork(element, savedNetwork);
                    paintCrowd(element, instance.getZones());

                    if (options.hideLocation) {

                        element.querySelectorAll(
                            ".mqm-ime, .mqm-ime-label"
                        ).forEach(marker => {
                            marker.style.display =
                                "none";
                        });
                    }
                }

                if (
                    typeof options.onData ===
                    "function"
                ) {

                    options.onData(
                        zones,
                        savedConnections,
                        instance,
                        savedNetwork
                    );
                }

            } catch (error) {

                console.error(
                    "Mergab map:",
                    error
                );

                if (
                    !instance &&
                    layoutSignature == null
                ) {

                    showMessage(
                        options.errorMessage ||
                        "الخريطة غير متاحة مؤقتًا."
                    );
                }

                if (
                    typeof options.onError ===
                    "function"
                ) {

                    options.onError(error);
                }

            } finally {

                busy = false;
            }
        }

        // ==================================
        // AUTO REFRESH
        // ==================================

        const timer = refreshMs > 0
            ? setInterval(
                refresh,
                refreshMs
            )
            : null;

        refresh();

        return {
            refresh,

            getMap: () => instance,

            destroy() {

                stopped = true;

                if (timer) {
                    clearInterval(timer);
                }

                if (instance) {
                    instance.destroy();
                }

                instance = null;
            }
        };
    }

    // ======================================
    // PUBLIC SHARED API
    // ======================================

    global.MergabMap = {
        mount,
        getList,
        toMarkers,
        toEdges,
        parsePoints,
        drawSavedGeometry,
        drawRouteLine,
        drawLocationPin,
        paintCrowd
    };

})(window);
