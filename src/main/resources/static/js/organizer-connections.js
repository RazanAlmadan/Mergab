
/* ==========================================
   MERGAB | ORGANIZER CONNECTIONS
   Interactive Routes + Real Backend
   ========================================== */

document.addEventListener("DOMContentLoaded", () => {
    "use strict";

    const session = MergabAuth.requireRole(["ORGANIZER"]);
    if (!session) return;

    const $ = id => document.getElementById(id);

    const API = "/api/v1/zone-connection";
    const MAP_IMAGE = "/img/map/expo-map-concept.jpg";
    const SVG_NS = "http://www.w3.org/2000/svg";

    const mapElement = $("connectionMap");
    const editor = $("connectionEditor");
    const form = $("connectionForm");
    const drawingTools = $("connectionDrawingTools");
    const tableBody = $("connectionsTableBody");

    let zones = [];
    let connections = [];
    let expoMap = null;

    let editingId = null;
    let originalFromId = null;
    let originalToId = null;

    let drawing = false;
    let pathFinished = false;
    let pathPoints = [];

    let pointerStart = null;
    let pointerMoved = false;

    // =====================================
    // ACCOUNT
    // =====================================

    $("organizerAccountLink").textContent =
        session.fullName || "حسابي";

    $("organizerLogoutButton").addEventListener(
        "click",
        () => MergabAuth.logout()
    );

    function setMapStatus(message) {
        $("connectionMapStatus").textContent = message;
    }

    function showMessage(message, type = "error") {
        const box = $("connectionFormMessage");
        box.textContent = message;
        box.className = `zones-form-message ${type}`;
        box.hidden = false;
    }

    function clearMessage() {
        $("connectionFormMessage").hidden = true;
        $("connectionFormMessage").textContent = "";
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
            throw new Error("انتهت صلاحية تسجيل الدخول.");
        }

        if (response.status === 403) {
            throw new Error("لا تملكين صلاحية تنفيذ العملية.");
        }

        if (!response.ok) {
            let message = `تعذرت العملية (${response.status}).`;

            try {
                const result = await response.json();
                message = result.message || message;
            } catch (_) {
                // Keep HTTP status when there is no JSON error
            }

            throw new Error(message);
        }

        const text = await response.text();

        if (!text) return null;

        try {
            return JSON.parse(text);
        } catch (_) {
            return null;
        }
    }

    // =====================================
    // COORDINATE HELPERS
    // =====================================

    function parsePoints(value, minimum = 2) {
        try {
            const data = typeof value === "string"
                ? JSON.parse(value)
                : value;

            if (!Array.isArray(data) || data.length < minimum) {
                return [];
            }

            const valid = data.every(point =>
                Array.isArray(point) &&
                point.length === 2 &&
                point.every(number =>
                    typeof number === "number" &&
                    Number.isFinite(number) &&
                    number >= 0 &&
                    number <= 100
                )
            );

            return valid ? data : [];

        } catch (_) {
            return [];
        }
    }

    function hasPosition(zone) {
        return (
            zone.mapX != null &&
            zone.mapY != null &&
            Number.isFinite(Number(zone.mapX)) &&
            Number.isFinite(Number(zone.mapY))
        );
    }

    function getZone(id) {
        return zones.find(zone =>
            String(zone.id) === String(id)
        );
    }

    function zoneName(id) {
        return getZone(id)?.name || "منطقة غير متاحة";
    }

    function connectionFromId(connection) {
        return connection.fromZone?.id ??
            connection.fromZoneId ??
            null;
    }

    function connectionToId(connection) {
        return connection.toZone?.id ??
            connection.toZoneId ??
            null;
    }

    function pathLength(points) {
        let length = 0;

        for (let i = 1; i < points.length; i++) {
            length += Math.hypot(
                points[i][0] - points[i - 1][0],
                points[i][1] - points[i - 1][1]
            );
        }

        return length;
    }

    // =====================================
    // SVG HELPERS
    // =====================================

    function svgElement(tag, attributes, parent) {
        const element =
            document.createElementNS(SVG_NS, tag);

        Object.entries(attributes).forEach(([key, value]) => {
            element.setAttribute(key, String(value));
        });

        parent.appendChild(element);
        return element;
    }



    function drawDirectionArrows(layer, routePath, color) {
        const length = routePath.getTotalLength();

        if (length < 2) return;

        // Show two arrows on long routes, one on short routes
        const positions = length >= 15
            ? [0.35, 0.70]
            : [0.50];

        positions.forEach(position => {
            const distance = length * position;

            const point = routePath.getPointAtLength(distance);
            const before = routePath.getPointAtLength(
                Math.max(0, distance - 0.5)
            );
            const after = routePath.getPointAtLength(
                Math.min(length, distance + 0.5)
            );

            const angle = Math.atan2(
                after.y - before.y,
                after.x - before.x
            );

            const size = Math.min(1.3, length / 5);

            const arrow = svgElement("polygon", {
                points: `0,0 -${size},${size * 0.46} -${size},-${size * 0.46}`,
                fill: color,
                stroke: "#FFFFFF",
                "stroke-width": 0.15,
                "stroke-linejoin": "round",
                "pointer-events": "none"
            }, layer);

            arrow.setAttribute(
                "transform",
                `translate(${point.x},${point.y}) rotate(${angle * 180 / Math.PI})`
            );
        });
    }


    function drawLine(layer, points, color, width, dashed = false) {
        if (points.length < 2) return;

        // Build a gently curved route that follows saved points.
        // Keep the first and last points in their exact positions.
        let d = `M ${points[0][0]} ${points[0][1]}`;

        if (points.length === 2) {
            d += ` L ${points[1][0]} ${points[1][1]}`;
        } else {
            const smoothness = 0.12;

            for (let i = 0; i < points.length - 1; i++) {
                const previous = points[Math.max(0, i - 1)];
                const current = points[i];
                const next = points[i + 1];
                const following = points[Math.min(points.length - 1, i + 2)];

                const cp1x = current[0] +
                    (next[0] - previous[0]) * smoothness;

                const cp1y = current[1] +
                    (next[1] - previous[1]) * smoothness;

                const cp2x = next[0] -
                    (following[0] - current[0]) * smoothness;

                const cp2y = next[1] -
                    (following[1] - current[1]) * smoothness;

                d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${next[0]} ${next[1]}`;
            }
        }

        // White border makes the route visible on the map
        svgElement("path", {
            d,
            fill: "none",
            stroke: "#FFFFFF",
            "stroke-opacity": 0.95,
            "stroke-width": width + 0.55,
            "stroke-linecap": "round",
            "stroke-linejoin": "round",
            "pointer-events": "none"
        }, layer);

        // Actual route color
        const routePath = svgElement("path", {
            d,
            fill: "none",
            stroke: color,
            "stroke-width": width,
            "stroke-linecap": "round",
            "stroke-linejoin": "round",
            ...(dashed ? {
                "stroke-dasharray": "1.5 0.8"
            } : {}),
            "pointer-events": "none"
        }, layer);
        drawDirectionArrows(layer, routePath, color);

        // Animated flow + a moving visitor dot on saved routes
        if (!dashed) {
            svgElement("path", {
                d,
                class: "mg-flow",
                fill: "none",
                stroke: "#FFF6DF",
                "stroke-width": 2,
                "stroke-dasharray": "2 12",
                "vector-effect": "non-scaling-stroke",
                "pointer-events": "none"
            }, layer);

            const svg = layer.ownerSVGElement;
            const ratio = svg?.clientWidth && svg?.clientHeight
                ? svg.clientWidth / svg.clientHeight : 1.5;

            const dot = svgElement("g", { class: "mg-dot" }, layer);

            svgElement("ellipse", {
                rx: 1.2 / ratio, ry: 1.2,
                fill: color, opacity: 0.4
            }, dot);

            svgElement("ellipse", {
                rx: 0.5 / ratio, ry: 0.5,
                fill: "#FFFFFF"
            }, dot);

            svgElement("animateMotion", {
                dur: "5s",
                repeatCount: "indefinite",
                path: d
            }, dot);
        }
    }


    function drawPoint(layer, x, y, color) {
        svgElement("circle", {
            cx: x,
            cy: y,
            r: 0.62,
            fill: color,
            stroke: "#FFFFFF",
            "stroke-width": 0.28,
            "pointer-events": "none"
        }, layer);
    }

    // Screen click → map percentage (works for flat and 3D views)
    function eventMapPoint(event, rect) {
        const point = expoMap?.toMapPoint?.(
            event.clientX,
            event.clientY
        );

        return point || [
            (event.clientX - rect.left) / rect.width * 100,
            (event.clientY - rect.top) / rect.height * 100
        ];
    }

    // =====================================
    // DRAW SAVED AND NEW ROUTES
    // =====================================

    function drawMapOverlay() {
        const svg = mapElement.querySelector(".mqm-isvg");
        if (!svg) return;

        svg.querySelector("#connectionOverlay")?.remove();

        const layer =
            document.createElementNS(SVG_NS, "g");

        layer.id = "connectionOverlay";
        layer.setAttribute("pointer-events", "none");

        svg.prepend(layer);

        // Existing zone boundaries - light reference areas
        zones.forEach(zone => {
            const boundary =
                parsePoints(zone.boundaryPoints, 3);

            if (boundary.length < 3) return;

            svgElement("polygon", {
                points: boundary
                    .map(point => point.join(","))
                    .join(" "),
                fill: "#247C59",
                "fill-opacity": 0.14,
                stroke: "#247C59",
                "stroke-opacity": 0.65,
                "stroke-width": 0.45,
                "stroke-linejoin": "round",
                "pointer-events": "none"
            }, layer);
        });

        // Saved routes from the database
        connections.forEach(connection => {
            if (
                drawing &&
                String(connection.id) === String(editingId)
            ) {
                return;
            }

            const points =
                parsePoints(connection.pathPoints);

            if (points.length < 2) return;

            drawLine(layer, points, "#B6863C", 0.75);
        });

        // Route currently being drawn or edited
        if (drawing && pathPoints.length > 0) {
            drawLine(
                layer,
                pathPoints,
                "#BD853A",
                0.85,
                !pathFinished
            );

            pathPoints.forEach(([x, y], index) => {
                const color =
                    index === 0
                        ? "#247C59"
                        : index === pathPoints.length - 1
                            ? "#B56A28"
                            : "#173F33";

                drawPoint(layer, x, y, color);
            });
        }

        updateDrawingStatus();
    }

    // =====================================
    // MAP
    // =====================================

    function renderMap() {
        if (expoMap) {
            expoMap.destroy();
            expoMap = null;
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

        expoMap = MirqabMap.create("#connectionMap", {
            mode: "image",
            lang: "ar",
            demo: false,
            controls: true,
            heat: false,
            start: null,
            matchBy: "id",
            imageFit: "contain",

            // Same night command-center look as the dashboard.
            // 3D stays off while drawing (toggle with the cube button).
            theme: "organizer",
            perspective: true,
            start3d: false,

            imageLayout: {
                src: MAP_IMAGE,
                zones: mapZones,
                edges: [],
                hub: null,
                metersPerUnit: 8
            },

            onSelect(info) {
                if (!drawing || info?.id == null) return;

                const selectedId = String(info.id);
                const fromSelect = $("fromZoneId");
                const toSelect = $("toZoneId");

                // Clicking zone labels can select the endpoints
                if (!fromSelect.value) {
                    fromSelect.value = selectedId;
                } else if (
                    !toSelect.value &&
                    selectedId !== fromSelect.value
                ) {
                    toSelect.value = selectedId;
                } else if (selectedId !== fromSelect.value) {
                    toSelect.value = selectedId;
                }

                updateDrawingStatus();
            }
        });

        // No known organizer location
        mapElement.querySelectorAll(
            ".mqm-ime, .mqm-ime-label"
        ).forEach(element => {
            element.style.display = "none";
        });

        drawMapOverlay();

        mapElement.querySelector(".mqm-img")
            ?.addEventListener(
                "load",
                drawMapOverlay,
                { once: true }
            );
    }

    // =====================================
    // ZONE SELECTIONS
    // =====================================

    function populateZoneSelects() {
        const availableZones =
            zones.filter(hasPosition);

        ["fromZoneId", "toZoneId"].forEach(id => {
            const select = $(id);
            const previousValue = select.value;

            select.replaceChildren();

            const placeholder =
                document.createElement("option");

            placeholder.value = "";
            placeholder.textContent =
                id === "fromZoneId"
                    ? "اختاري منطقة البداية"
                    : "اختاري منطقة النهاية";

            select.appendChild(placeholder);

            availableZones.forEach(zone => {
                const option =
                    document.createElement("option");

                option.value = String(zone.id);
                option.textContent = zone.name;

                select.appendChild(option);
            });

            if (
                availableZones.some(zone =>
                    String(zone.id) === previousValue
                )
            ) {
                select.value = previousValue;
            }
        });
    }

    function updateDrawingStatus() {
        if (!drawing) return;

        const fromId = $("fromZoneId").value;
        const toId = $("toZoneId").value;

        const label = $("pathSelectionStatus");
        const hint = $("pathDrawingStatus");

        label.classList.remove(
            "is-drawing",
            "is-complete"
        );

        if (!fromId || !toId) {
            label.textContent = "اختاري منطقة البداية والنهاية";

            hint.textContent =
                "يمكنك اختيار المناطق من القوائم أو الضغط على علاماتها بالخريطة.";

            return;
        }

        if (fromId === toId) {
            label.textContent =
                "منطقة البداية والنهاية يجب أن تختلفا";

            hint.textContent =
                "اختاري منطقتين مختلفتين.";

            return;
        }

        if (pathFinished) {
            label.textContent =
                `مسار مكتمل — ${pathPoints.length} نقاط`;

            label.classList.add("is-complete");

            hint.textContent =
                "يمكنك حفظ المسار أو التراجع لتعديل آخر نقطة.";

        } else {
            label.textContent =
                `جارٍ رسم المسار — ${pathPoints.length} نقاط`;

            label.classList.add("is-drawing");

            hint.textContent =
                "اضغطي على الممرات لرسم الطريق من منطقة البداية إلى منطقة النهاية. حددي نقطتين على الأقل.";
        }
    }

    $("fromZoneId").addEventListener(
        "change",
        updateDrawingStatus
    );

    $("toZoneId").addEventListener(
        "change",
        updateDrawingStatus
    );

    // =====================================
    // OPEN / CLOSE EDITOR
    // =====================================

    function openEditor(connection = null) {
        const availableZones =
            zones.filter(hasPosition);

        if (availableZones.length < 2) {
            window.alert(
                "لازم تضيفين منطقتين على الأقل مع تحديد مواقعهما بالخريطة قبل إنشاء مسار."
            );
            return;
        }

        form.reset();
        clearMessage();

        editingId = connection?.id ?? null;

        originalFromId = connection
            ? String(connectionFromId(connection))
            : null;

        originalToId = connection
            ? String(connectionToId(connection))
            : null;

        drawing = true;

        pathPoints = connection
            ? parsePoints(connection.pathPoints)
            : [];

        pathFinished = pathPoints.length >= 2;

        populateZoneSelects();

        $("connectionId").value = editingId ?? "";

        $("fromZoneId").value =
            connection ? originalFromId : "";

        $("toZoneId").value =
            connection ? originalToId : "";

        $("maxVisitorsPerMinute").value =
            connection?.maxVisitorsPerMinute ?? "";

        $("connectionPathPoints").value =
            pathFinished
                ? JSON.stringify(pathPoints)
                : "";

        $("connectionEditorTitle").textContent =
            connection
                ? "تعديل المسار"
                : "إضافة مسار جديد";

        editor.hidden = false;
        drawingTools.hidden = false;

        mapElement.classList.add("is-drawing");

        setMapStatus("وضع رسم المسار");

        drawMapOverlay();

        mapElement.scrollIntoView({
            behavior: "smooth",
            block: "center"
        });
    }

    function closeEditor() {
        editingId = null;
        originalFromId = null;
        originalToId = null;

        drawing = false;
        pathFinished = false;
        pathPoints = [];

        form.reset();
        clearMessage();

        editor.hidden = true;
        drawingTools.hidden = true;

        mapElement.classList.remove("is-drawing");

        setMapStatus("خريطة تفاعلية");
        drawMapOverlay();
    }

    $("addConnectionButton").addEventListener(
        "click",
        () => openEditor()
    );

    $("closeConnectionEditor").addEventListener(
        "click",
        closeEditor
    );

    $("cancelConnectionButton").addEventListener(
        "click",
        closeEditor
    );

    // =====================================
    // DISTINGUISH CLICK FROM DRAG
    // =====================================

    mapElement.addEventListener(
        "pointerdown",
        event => {
            pointerStart = {
                x: event.clientX,
                y: event.clientY
            };

            pointerMoved = false;
        },
        true
    );

    window.addEventListener("pointermove", event => {
        if (!pointerStart) return;

        const distance = Math.hypot(
            event.clientX - pointerStart.x,
            event.clientY - pointerStart.y
        );

        if (distance > 6) {
            pointerMoved = true;
        }
    });

    window.addEventListener("pointerup", () => {
        pointerStart = null;
    });

    window.addEventListener("pointercancel", () => {
        pointerStart = null;
        pointerMoved = true;
    });

    // =====================================
    // ADD POINTS TO PATH
    // =====================================

    mapElement.addEventListener("click", event => {
        const wasDragging = pointerMoved;
        pointerMoved = false;

        if (!drawing || pathFinished || wasDragging) {
            return;
        }

        if (event.target.closest(
            ".mqm-controls, .mqm-heat, " +
            ".mqm-legend, .mqm-marker"
        )) {
            return;
        }

        const image =
            event.target.closest(".mqm-img");

        if (!image) return;

        if (
            !$("fromZoneId").value ||
            !$("toZoneId").value
        ) {
            showMessage(
                "اختاري منطقة البداية والنهاية أولًا."
            );
            return;
        }

        if (
            $("fromZoneId").value ===
            $("toZoneId").value
        ) {
            showMessage(
                "لا يمكن ربط المنطقة بنفسها."
            );
            return;
        }

        const stage =
            mapElement.querySelector(".mqm-istage");

        if (!stage) return;

        const rect = stage.getBoundingClientRect();

        const [x, y] = eventMapPoint(event, rect);

        if (
            !Number.isFinite(x) ||
            !Number.isFinite(y) ||
            x < 0 || x > 100 ||
            y < 0 || y > 100
        ) {
            return;
        }

        pathPoints.push([
            Number(x.toFixed(2)),
            Number(y.toFixed(2))
        ]);

        clearMessage();
        drawMapOverlay();

        setMapStatus(
            `جارٍ رسم المسار — ${pathPoints.length} نقاط`
        );
    });

    // =====================================
    // FINISH PATH
    // =====================================

    $("finishPath").addEventListener("click", () => {
        if (
            !$("fromZoneId").value ||
            !$("toZoneId").value
        ) {
            showMessage(
                "اختاري منطقة البداية والنهاية أولًا."
            );
            return;
        }

        if (
            $("fromZoneId").value ===
            $("toZoneId").value
        ) {
            showMessage(
                "يجب اختيار منطقتين مختلفتين."
            );
            return;
        }

        if (
            pathPoints.length < 2 ||
            pathLength(pathPoints) < 0.2
        ) {
            showMessage(
                "حددي نقطتين مختلفتين على الأقل لرسم المسار."
            );
            return;
        }

        pathFinished = true;

        $("connectionPathPoints").value =
            JSON.stringify(pathPoints);

        clearMessage();

        setMapStatus("تم إنهاء رسم المسار");
        drawMapOverlay();
    });

    // =====================================
    // UNDO LAST POINT
    // =====================================

    $("undoPathPoint").addEventListener(
        "click",
        () => {
            if (!pathPoints.length) return;

            pathPoints.pop();
            pathFinished = false;

            $("connectionPathPoints").value = "";

            clearMessage();
            drawMapOverlay();

            setMapStatus("تم التراجع عن آخر نقطة");
        }
    );

    // =====================================
    // CLEAR PATH
    // =====================================

    $("clearPath").addEventListener(
        "click",
        () => {
            pathPoints = [];
            pathFinished = false;

            $("connectionPathPoints").value = "";

            clearMessage();
            drawMapOverlay();

            setMapStatus("تم مسح المسار");
        }
    );

    // =====================================
    // SAVE CONNECTION
    // =====================================

    form.addEventListener("submit", async event => {
        event.preventDefault();
        clearMessage();

        const fromId = $("fromZoneId").value;
        const toId = $("toZoneId").value;

        const capacity = Number(
            $("maxVisitorsPerMinute").value
        );

        if (!fromId || !toId) {
            showMessage(
                "اختاري منطقة البداية والنهاية."
            );
            return;
        }

        if (fromId === toId) {
            showMessage(
                "لا يمكن ربط المنطقة بنفسها."
            );
            return;
        }

        if (
            !Number.isInteger(capacity) ||
            capacity <= 0
        ) {
            showMessage(
                "سعة الممر يجب أن تكون عددًا صحيحًا أكبر من صفر."
            );
            return;
        }

        if (
            !pathFinished ||
            pathPoints.length < 2 ||
            pathLength(pathPoints) < 0.2
        ) {
            showMessage(
                "ارسمي المسار واضغطي إنهاء المسار قبل الحفظ."
            );
            return;
        }

        const payload = {
            maxVisitorsPerMinute: capacity,
            pathPoints: JSON.stringify(pathPoints)
        };

        const saveButton = $("saveConnectionButton");
        saveButton.disabled = true;

        try {
            if (editingId == null) {

                // Create a new connection
                await request(
                    `${API}/add/${fromId}/${toId}`,
                    {
                        method: "POST",
                        body: JSON.stringify(payload)
                    }
                );

            } else {

                // Changing connected zones uses a separate endpoint
                if (
                    fromId !== originalFromId ||
                    toId !== originalToId
                ) {
                    await request(
                        `${API}/change-zones/${editingId}/${fromId}/${toId}`,
                        {
                            method: "PUT"
                        }
                    );
                }

                // Update capacity and saved path geometry
                await request(
                    `${API}/update/${editingId}`,
                    {
                        method: "PUT",
                        body: JSON.stringify(payload)
                    }
                );
            }

            closeEditor();
            await loadData();

            setMapStatus(
                "تم حفظ المسار بنجاح"
            );

        } catch (error) {
            showMessage(error.message);

            console.error(
                "Save connection failed:",
                error
            );

        } finally {
            saveButton.disabled = false;
        }
    });

    // =====================================
    // TABLE BUTTONS
    // =====================================

    function actionButton(
        icon,
        label,
        onClick,
        danger = false
    ) {
        const button =
            document.createElement("button");

        button.type = "button";
        button.title = label;

        button.setAttribute(
            "aria-label",
            label
        );

        if (danger) {
            button.className = "delete-zone";
        }

        const symbol =
            document.createElement("span");

        symbol.className =
            "material-symbols-rounded";

        symbol.textContent = icon;
        button.appendChild(symbol);

        button.addEventListener(
            "click",
            onClick
        );

        return button;
    }

    // =====================================
    // CONNECTIONS TABLE
    // =====================================

    function renderTable() {
        tableBody.replaceChildren();

        $("connectionsCount").textContent =
            `${connections.length} مسار`;

        if (!connections.length) {
            const row =
                document.createElement("tr");

            const cell =
                document.createElement("td");

            cell.colSpan = 5;
            cell.textContent =
                "لا توجد مسارات محفوظة بعد.";

            cell.style.textAlign = "center";

            row.appendChild(cell);
            tableBody.appendChild(row);

            return;
        }

        connections.forEach(connection => {
            const row =
                document.createElement("tr");

            const fromId =
                connectionFromId(connection);

            const toId =
                connectionToId(connection);

            const points =
                parsePoints(connection.pathPoints);

            const values = [
                connection.fromZone?.name ||
                zoneName(fromId),

                connection.toZone?.name ||
                zoneName(toId),

                Number(connection.maxVisitorsPerMinute)
                    .toLocaleString("ar-SA"),

                points.length >= 2
                    ? "مسار مرسوم"
                    : "غير مرسوم"
            ];

            values.forEach(value => {
                const cell =
                    document.createElement("td");

                cell.textContent = value;
                row.appendChild(cell);
            });

            const actions =
                document.createElement("td");

            actions.appendChild(
                actionButton(
                    "edit",
                    "تعديل المسار",
                    () => openEditor(connection)
                )
            );

            actions.appendChild(
                actionButton(
                    "delete",
                    "حذف المسار",
                    () => deleteConnection(connection),
                    true
                )
            );

            row.appendChild(actions);
            tableBody.appendChild(row);
        });
    }

    // =====================================
    // DELETE CONNECTION
    // =====================================

    async function deleteConnection(connection) {
        const fromName =
            connection.fromZone?.name ||
            zoneName(connectionFromId(connection));

        const toName =
            connection.toZone?.name ||
            zoneName(connectionToId(connection));

        const confirmed = window.confirm(
            `هل تريدين حذف المسار بين "${fromName}" و"${toName}"؟`
        );

        if (!confirmed) return;

        try {
            await request(
                `${API}/delete/${connection.id}`,
                { method: "DELETE" }
            );

            closeEditor();
            await loadData();

            setMapStatus("تم حذف المسار");

        } catch (error) {
            window.alert(
                "تعذر حذف المسار.\n" +
                error.message
            );
        }
    }

    // =====================================
    // LOAD REAL BACKEND DATA
    // =====================================

    async function loadData() {
        const [zonesResult, connectionsResult] =
            await Promise.allSettled([
                request("/api/v1/zone/get"),
                request(`${API}/get`)
            ]);

        if (
            zonesResult.status === "fulfilled" &&
            Array.isArray(zonesResult.value)
        ) {
            zones = zonesResult.value;
        } else {
            zones = [];
            console.error(
                "Zones loading failed:",
                zonesResult.reason
            );
        }

        if (
            connectionsResult.status === "fulfilled" &&
            Array.isArray(connectionsResult.value)
        ) {
            connections = connectionsResult.value;
        } else {
            connections = [];
            console.error(
                "Connections loading failed:",
                connectionsResult.reason
            );
        }

        populateZoneSelects();
        renderMap();

        if (connectionsResult.status === "fulfilled") {
            renderTable();
        } else {
            tableBody.replaceChildren();

            const row =
                document.createElement("tr");

            const cell =
                document.createElement("td");

            cell.colSpan = 5;
            cell.textContent =
                "تعذر تحميل المسارات من قاعدة البيانات.";

            row.appendChild(cell);
            tableBody.appendChild(row);

            $("connectionsCount").textContent = "—";
        }

        if (zonesResult.status !== "fulfilled") {
            setMapStatus(
                "الخريطة متاحة، لكن تعذر تحميل المناطق"
            );
        } else if (
            connectionsResult.status !== "fulfilled"
        ) {
            setMapStatus(
                "الخريطة متاحة، لكن تعذر تحميل المسارات"
            );
        } else {
            setMapStatus("خريطة تفاعلية");
        }
    }

    // =====================================
    // START
    // =====================================

    // The map must appear even when the DB is empty
    renderMap();

    // Load real zones and connections independently
    loadData();
});
