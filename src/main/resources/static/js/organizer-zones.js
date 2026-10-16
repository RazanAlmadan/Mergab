
/* ==========================================
   MERGAB | ORGANIZER ZONES
   Polygon Boundaries + Interactive Map
   ========================================== */

document.addEventListener("DOMContentLoaded", () => {
    "use strict";

    const session = MergabAuth.requireRole(["ORGANIZER"]);
    if (!session) return;

    const $ = id => document.getElementById(id);

    const API = "/api/v1/zone";
    const MAP_IMAGE = "/img/map/expo-map-concept.jpg";
    const SVG_NS = "http://www.w3.org/2000/svg";

    const mapElement = $("zonePlacementMap");
    const form = $("zoneForm");
    const editor = $("zoneEditor");
    const tableBody = $("zonesTableBody");
    const drawingTools = $("zoneDrawingTools");

    let zones = [];
    let map = null;

    let editingId = null;
    let drawing = false;
    let boundaryPoints = [];
    let boundaryFinished = false;

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

    function setMapStatus(text) {
        $("zonesMapStatus").textContent = text;
    }

    function showMessage(text, type = "error") {
        const box = $("zoneFormMessage");

        box.textContent = text;
        box.className = `zones-form-message ${type}`;
        box.hidden = false;
    }

    function clearMessage() {
        const box = $("zoneFormMessage");
        box.hidden = true;
        box.textContent = "";
    }

    // =====================================
    // BACKEND API
    // =====================================

    async function api(path, options = {}) {
        const response = await fetch(API + path, {
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
            throw new Error(
                "لا تملكين صلاحية تنفيذ هذه العملية."
            );
        }

        if (!response.ok) {
            let errorMessage =
                `تعذرت العملية (${response.status}).`;

            try {
                const data = await response.json();

                errorMessage =
                    data.message || errorMessage;
            } catch (_) {}

            throw new Error(errorMessage);
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
    // BOUNDARY HELPERS
    // =====================================

    function parseBoundary(value) {
        try {
            const parsed =
                typeof value === "string"
                    ? JSON.parse(value)
                    : value;

            if (
                !Array.isArray(parsed) ||
                parsed.length < 3
            ) {
                return [];
            }

            const points = parsed.map(point => {
                if (
                    !Array.isArray(point) ||
                    point.length !== 2
                ) {
                    return null;
                }

                return point.map(Number);
            });

            const valid = points.every(point =>
                point !== null &&
                point.every(number =>
                    Number.isFinite(number) &&
                    number >= 0 &&
                    number <= 100
                )
            );

            return valid ? points : [];

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

    // Calculate polygon area
    function polygonArea(points) {
        if (points.length < 3) return 0;

        let sum = 0;

        points.forEach((point, index) => {
            const next =
                points[(index + 1) % points.length];

            sum +=
                point[0] * next[1] -
                next[0] * point[1];
        });

        return Math.abs(sum / 2);
    }

    // Calculate polygon center for the zone label
    function polygonCenter(points) {
        let twiceArea = 0;
        let centerX = 0;
        let centerY = 0;

        points.forEach((point, index) => {
            const next =
                points[(index + 1) % points.length];

            const cross =
                point[0] * next[1] -
                next[0] * point[1];

            twiceArea += cross;

            centerX +=
                (point[0] + next[0]) * cross;

            centerY +=
                (point[1] + next[1]) * cross;
        });

        if (Math.abs(twiceArea) < 0.000001) {
            return points[0];
        }

        return [
            centerX / (3 * twiceArea),
            centerY / (3 * twiceArea)
        ];
    }

    function createSVGElement(tag, attributes, parent) {
        const element =
            document.createElementNS(SVG_NS, tag);

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

    // =====================================
    // DRAW BOUNDARIES ON MAP
    // =====================================

    function drawBoundaries() {
        const svg =
            mapElement.querySelector(".mqm-isvg");

        if (!svg) return;

        svg.querySelector("#zoneBoundaryLayer")
            ?.remove();

        const layer =
            document.createElementNS(SVG_NS, "g");

        layer.id = "zoneBoundaryLayer";

        layer.setAttribute(
            "pointer-events",
            "none"
        );

        svg.insertBefore(layer, svg.firstChild);

        function drawPolygon(
            points,
            color,
            opacity
        ) {
            createSVGElement(
                "polygon",
                {
                    points: points
                        .map(point => point.join(","))
                        .join(" "),

                    fill: color,
                    "fill-opacity": opacity,

                    stroke: color,
                    "stroke-width": 1.2,
                    "stroke-linejoin": "round",

                    "vector-effect":
                        "non-scaling-stroke",

                    "pointer-events": "none"
                },
                layer
            );
        }

        // Existing saved boundaries
        zones.forEach(zone => {
            if (
                drawing &&
                String(zone.id) === String(editingId)
            ) {
                return;
            }

            const points =
                parseBoundary(zone.boundaryPoints);

            if (points.length >= 3) {
                drawPolygon(
                    points,
                    "#247C59",
                    0.40
                );
            }
        });

        // Currently edited boundary
        if (drawing && boundaryPoints.length > 0) {

            if (boundaryPoints.length >= 3) {
                drawPolygon(
                    boundaryPoints,
                    "#C7A76B",
                    boundaryFinished ? 0.27 : 0.12
                );
            }

            if (
                !boundaryFinished &&
                boundaryPoints.length >= 2
            ) {
                createSVGElement(
                    "polyline",
                    {
                        points: boundaryPoints
                            .map(point => point.join(","))
                            .join(" "),

                        fill: "none",

                        stroke: "#0E3D32",
                        "stroke-width": 0.6,

                        "vector-effect":
                            "non-scaling-stroke",

                        "pointer-events": "none"
                    },
                    layer
                );
            }

            // Boundary corners
            boundaryPoints.forEach(([x, y]) => {
                createSVGElement(
                    "circle",
                    {
                        cx: x,
                        cy: y,
                        r: 0.62,

                        fill: "#0E3D32",
                        stroke: "#FFFFFF",
                        "stroke-width": 0.25,

                        "pointer-events": "none"
                    },
                    layer
                );
            });
        }

        if (drawing) {
            $("boundaryDrawingStatus").textContent =
                boundaryFinished
                    ? `تم تحديد الحدود (${boundaryPoints.length} زوايا). يمكنك حفظ المنطقة.`
                    : `عدد الزوايا: ${boundaryPoints.length} — اختاري ثلاث زوايا على الأقل.`;
        }
    }

    // =====================================
    // INTERACTIVE MAP
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

        map = MirqabMap.create(
            "#zonePlacementMap",
            {
                mode: "image",
                lang: "ar",

                demo: false,
                controls: true,
                heat: false,

                start: null,
                matchBy: "id",

                imageFit: "contain",

                imageLayout: {
                    src: MAP_IMAGE,
                    zones: mapZones,
                    edges: [],
                    hub: null,
                    metersPerUnit: 8
                },

                onSelect(info) {
                    if (drawing || selectedFacilityZone) return;

                    const zone = zones.find(item =>
                        String(item.id) ===
                        String(info.id)
                    );

                    if (zone) {
                        openEditor(zone);
                    }
                }
            }
        );

        // Hide visitor location
        mapElement.querySelectorAll(
            ".mqm-ime, .mqm-ime-label"
        ).forEach(element => {
            element.style.display = "none";
        });

        drawBoundaries();
        if (selectedFacilityZone) renderNetworkOnMap();

        // Redraw after map image loads
        mapElement.querySelector(".mqm-img")
            ?.addEventListener(
                "load",
                () => {
                    drawBoundaries();
                    if (selectedFacilityZone) renderNetworkOnMap();
                },//check
                { once: true }
            );
    }

    // =====================================
    // ADD / EDIT ZONE
    // =====================================

    function openEditor(zone = null) {
        if (selectedFacilityZone) closeFacilityManager();
        editingId = zone?.id ?? null;

        drawing = true;

        boundaryPoints =
            parseBoundary(zone?.boundaryPoints);

        boundaryFinished =
            boundaryPoints.length >= 3;

        form.reset();

        $("zoneId").value = editingId ?? "";

        $("zoneName").value =
            zone?.name ?? "";

        $("zoneCapacity").value =
            zone?.capacity ?? "";

        $("zoneInitialVisitors").value =
            zone?.initialVisitors ?? 0;

        $("zoneIndoor").checked =
            zone?.indoor === true;

        $("zonePrayerArea").checked =
            zone?.hasPrayerArea === true;

        $("zoneMapX").value =
            zone?.mapX ?? "";

        $("zoneMapY").value =
            zone?.mapY ?? "";

        $("zoneBoundaryPoints").value =
            boundaryFinished
                ? JSON.stringify(boundaryPoints)
                : "";

        $("zoneEditorTitle").textContent =
            zone
                ? "تعديل المنطقة"
                : "إضافة منطقة جديدة";

        $("zoneLocationHint").textContent =
            "ارسمي حدود المنطقة ثم اضغطي إنهاء تحديد الحدود.";

        clearMessage();

        editor.hidden = false;
        drawingTools.hidden = false;

        mapElement.classList.add("is-placing");

        setMapStatus(
            "حددي حدود المنطقة على الخريطة"
        );

        drawBoundaries();

        mapElement.scrollIntoView({
            behavior: "smooth",
            block: "center"
        });
    }

    function closeEditor() {
        drawing = false;
        editingId = null;

        boundaryPoints = [];
        boundaryFinished = false;

        editor.hidden = true;
        drawingTools.hidden = true;

        form.reset();

        mapElement.classList.remove(
            "is-placing"
        );

        setMapStatus("خريطة تفاعلية");

        drawBoundaries();
    }

    $("addZoneButton").addEventListener(
        "click",
        () => openEditor()
    );

    $("cancelZoneButton").addEventListener(
        "click",
        closeEditor
    );

    $("closeZoneEditor").addEventListener(
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

    mapElement.addEventListener(
        "pointermove",
        event => {
            if (!pointerStart) return;

            const distance = Math.hypot(
                event.clientX - pointerStart.x,
                event.clientY - pointerStart.y
            );

            if (distance > 6) {
                pointerMoved = true;
            }
        },
        true
    );

    // =====================================
    // ADD CORNERS BY CLICKING MAP
    // =====================================

    mapElement.addEventListener(
        "click",
        event => {
            const wasDragging = pointerMoved;

            pointerStart = null;
            pointerMoved = false;

            if (routeDrawMode) {
                routeMapClick(event, wasDragging);
                return;
            }

            // Facility location selection
            if (facilityPicking) {

                if (wasDragging || !selectedFacilityZone) return;

                const image = event.target.closest(".mqm-img");
                if (!image) return;

                const stage =
                    mapElement.querySelector(".mqm-istage");

                if (!stage) return;

                const rect = stage.getBoundingClientRect();

                const x = (event.clientX - rect.left)
                    / rect.width * 100;

                const y = (event.clientY - rect.top)
                    / rect.height * 100;

                const polygon = parseBoundary(
                    selectedFacilityZone.boundaryPoints
                );

                if (!pointInsideZone(x, y, polygon)) {
                    alert("اختاري موقعًا داخل حدود المنطقة المحددة.");
                    return;
                }

                $("facilityMapX").value = x.toFixed(2);
                $("facilityMapY").value = y.toFixed(2);

                facilityPicking = false;

                mapElement.classList.remove("is-placing");

                setMapStatus("تم تحديد موقع المرفق");

                $("facilityLocationHint").textContent =
                    "تم تحديد الموقع بنجاح.";

                // Show selected facility location
                const svg =
                    mapElement.querySelector(".mqm-isvg");

                if (svg) {

                    svg.querySelector("#facilityPreviewPin")?.remove();

                    createSVGElement("circle", {
                        id: "facilityPreviewPin",
                        cx: x,
                        cy: y,
                        r: 1.1,
                        fill: "#0F6B50",
                        stroke: "#FFFFFF",
                        "stroke-width": 0.4
                    }, svg);
                }

                $("facilityForm").scrollIntoView({
                    behavior: "smooth",
                    block: "center"
                });

                return;
            }


            if (
                !drawing ||
                boundaryFinished ||
                wasDragging
            ) {
                return;
            }

            // Ignore map controls and existing markers
            if (event.target.closest(
                ".mqm-controls, .mqm-heat, " +
                ".mqm-legend, .mqm-marker"
            )) {
                return;
            }

            // Only allow clicking actual map image
            const image =
                event.target.closest(".mqm-img");

            if (!image) return;

            const stage =
                mapElement.querySelector(".mqm-istage");

            if (!stage) return;

            const rect =
                stage.getBoundingClientRect();

            const x =
                (event.clientX - rect.left) /
                rect.width * 100;

            const y =
                (event.clientY - rect.top) /
                rect.height * 100;

            if (
                !Number.isFinite(x) ||
                !Number.isFinite(y) ||
                x < 0 || x > 100 ||
                y < 0 || y > 100
            ) {
                return;
            }

            boundaryPoints.push([
                Number(x.toFixed(2)),
                Number(y.toFixed(2))
            ]);

            drawBoundaries();

            setMapStatus(
                `جارٍ رسم الحدود — ${boundaryPoints.length} زوايا`
            );
        }
    );

    // =====================================
    // FINISH BOUNDARY
    // =====================================

    $("finishBoundary").addEventListener(
        "click",
        () => {
            if (
                boundaryPoints.length < 3 ||
                polygonArea(boundaryPoints) < 0.1
            ) {
                showMessage(
                    "حددي ثلاث زوايا مختلفة على الأقل لتكوين منطقة."
                );
                return;
            }

            boundaryFinished = true;

            $("zoneBoundaryPoints").value =
                JSON.stringify(boundaryPoints);

            // Zone label position
            const [centerX, centerY] =
                polygonCenter(boundaryPoints);

            $("zoneMapX").value =
                Number(centerX.toFixed(2));

            $("zoneMapY").value =
                Number(centerY.toFixed(2));

            $("zoneLocationHint").textContent =
                "تم تحديد حدود المنطقة وموقع اسمها.";

            clearMessage();

            setMapStatus(
                "تم إنهاء تحديد الحدود"
            );

            drawBoundaries();
        }
    );

    // =====================================
    // UNDO LAST POINT
    // =====================================

    $("undoBoundaryPoint").addEventListener(
        "click",
        () => {
            if (!boundaryPoints.length) return;

            boundaryPoints.pop();

            boundaryFinished = false;

            $("zoneBoundaryPoints").value = "";
            $("zoneMapX").value = "";
            $("zoneMapY").value = "";

            drawBoundaries();

            setMapStatus(
                "تم التراجع عن آخر زاوية"
            );
        }
    );

    // =====================================
    // CLEAR BOUNDARY
    // =====================================

    $("clearBoundary").addEventListener(
        "click",
        () => {
            boundaryPoints = [];
            boundaryFinished = false;

            $("zoneBoundaryPoints").value = "";
            $("zoneMapX").value = "";
            $("zoneMapY").value = "";

            clearMessage();
            drawBoundaries();

            setMapStatus(
                "تم مسح الحدود. ابدئي بتحديد الزوايا."
            );
        }
    );

    // =====================================
    // SAVE ZONE
    // =====================================

    form.addEventListener(
        "submit",
        async event => {
            event.preventDefault();

            clearMessage();

            const name =
                $("zoneName").value.trim();

            const capacity =
                Number($("zoneCapacity").value);

            const initialVisitors =
                Number($("zoneInitialVisitors").value);

            if (
                !name ||
                name.length > 50
            ) {
                showMessage(
                    "اسم المنطقة مطلوب وبحد أقصى 50 حرفًا."
                );
                return;
            }

            if (
                !Number.isInteger(capacity) ||
                capacity <= 0
            ) {
                showMessage(
                    "السعة يجب أن تكون عددًا صحيحًا أكبر من صفر."
                );
                return;
            }

            if (
                !Number.isInteger(initialVisitors) ||
                initialVisitors < 0 ||
                initialVisitors > capacity
            ) {
                showMessage(
                    "عدد الزوار الأولي يجب ألا يتجاوز سعة المنطقة."
                );
                return;
            }

            if (
                !boundaryFinished ||
                boundaryPoints.length < 3 ||
                polygonArea(boundaryPoints) < 0.1
            ) {
                showMessage(
                    "ارسمي حدود المنطقة واضغطي إنهاء تحديد الحدود قبل الحفظ."
                );
                return;
            }

            const payload = {
                name,
                capacity,
                initialVisitors,

                indoor:
                $("zoneIndoor").checked,

                hasPrayerArea:
                $("zonePrayerArea").checked,

                mapX:
                    Number($("zoneMapX").value),

                mapY:
                    Number($("zoneMapY").value),

                boundaryPoints:
                    JSON.stringify(boundaryPoints)
            };

            const button =
                $("saveZoneButton");

            button.disabled = true;

            try {
                const path =
                    editingId == null
                        ? "/add"
                        : `/update/${editingId}`;

                const method =
                    editingId == null
                        ? "POST"
                        : "PUT";

                await api(path, {
                    method,
                    body: JSON.stringify(payload)
                });

                closeEditor();

                await loadZones();

                setMapStatus(
                    "تم حفظ المنطقة وحدودها بنجاح"
                );

            } catch (error) {
                showMessage(
                    error.message ||
                    "تعذر حفظ المنطقة."
                );

                console.error(
                    "Save zone failed:",
                    error
                );

            } finally {
                button.disabled = false;
            }
        }
    );


    // =====================================
    // FACILITIES MANAGEMENT
    // =====================================

    let selectedFacilityZone = null;

    async function openFacilityManager(zone) {

        closeEditor();
        resetWalkEditor();
        resetAccessEditor();
        $("networkMessage").hidden = true;

        selectedFacilityZone = zone;

        $("facilityManager").hidden = false;
        $("facilityForm").hidden = true;

        $("facilityZoneId").value = zone.id;

        $("facilityZoneName").textContent =
            `المرافق التابعة لمنطقة ${zone.name}`;

        $("facilityManager").scrollIntoView({
            behavior: "smooth",
            block: "start"
        });

        await loadFacilities(zone.id);
        await refreshNetwork();
    }

    function closeFacilityManager() {


        selectedFacilityZone = null;

        $("facilityManager").hidden = true;
        $("facilityForm").hidden = true;
        $("facilityForm").reset();
        mapElement.querySelector("#facilitiesLayer")?.remove();

        facilityPicking = false;
        mapElement.classList.remove("is-placing");
        mapElement.querySelector("#facilityPreviewPin")?.remove();
        setMapStatus("خريطة تفاعلية");

        mapElement.querySelector("#networkRouteLayer")?.remove();
        stopRouteDrawing();
        editingWalkId = null;
        editingAccessId = null;

        $("accessFacilitySelect").disabled = false;
        $("accessWalkSelect").disabled = false;
        zoneWalkPaths = [];
        facilityAccessPaths = [];
        facilityCache = [];


    }

    $("closeFacilityManager").addEventListener(
        "click",
        closeFacilityManager
    );

    // =====================================
    // LOAD FACILITIES FROM BACKEND
    // =====================================

    async function loadFacilities(zoneId) {

        const body = $("facilitiesTableBody");

        body.replaceChildren();

        const showRow = message => {
            body.replaceChildren();

            const row = document.createElement("tr");
            const cell = document.createElement("td");

            cell.colSpan = 5;
            cell.textContent = message;
            cell.style.textAlign = "center";

            row.appendChild(cell);
            body.appendChild(row);
        };

        showRow("جارٍ تحميل المرافق...");

        try {
            const response = await fetch(
                `/api/v1/facility/get-by-zone/${zoneId}`,
                {
                    cache: "no-store",
                    headers: {
                        Authorization:
                            MergabAuth.getAuthorizationHeader(),
                        Accept: "application/json"
                    }
                }
            );

            if (!response.ok) {
                throw new Error(
                    `تعذر تحميل المرافق (${response.status})`
                );
            }

            const facilities = await response.json();

            if (!Array.isArray(facilities)) {
                throw new Error("بيانات المرافق غير صحيحة");
            }

            if (selectedFacilityZone?.id !== zoneId) return;
            drawFacilityPins(facilities);

            facilityCache = facilities;
            updateNetworkSelects();

            if (!facilities.length) {
                showRow("لا توجد مرافق مسجلة في هذه المنطقة.");
                return;
            }

            body.replaceChildren();

            const types = {
                RESTROOM: "دورات مياه",
                PRAYER_ROOM: "مصلى",
                EXIT: "مخرج",
                ENTRANCE: "مدخل"
            };

            const genders = {
                MALE: "رجال",
                FEMALE: "نساء",
                BOTH: "الجميع"
            };

            facilities.forEach(facility => {

                const row = document.createElement("tr");

                const location =
                    facility.mapX != null &&
                    facility.mapY != null
                        ? "محدد على الخريطة"
                        : "غير محدد";

                const values = [
                    facility.name,
                    types[facility.type] || facility.type,
                    genders[facility.gender] || facility.gender,
                    location
                ];

                values.forEach(value => {
                    const cell = document.createElement("td");
                    cell.textContent = value ?? "—";
                    row.appendChild(cell);
                });


                const actions = document.createElement("td");

                actions.appendChild(
                    createTableButton(
                        "edit",
                        "تعديل المرفق",
                        () => editFacility(facility)
                    )
                );

                const deleteButton = createTableButton(
                    "delete",
                    "حذف المرفق",
                    () => deleteFacility(facility),
                    true
                );

                deleteButton.classList.add("delete-facility");
                actions.appendChild(deleteButton);

                row.appendChild(actions);


                body.appendChild(row);
            });



        } catch (error) {
            console.error("Load facilities failed:", error);
            showRow(error.message);
        }


    }


    // =====================================
    // ADD FACILITY + LOCATION PICKER
    // =====================================

    let facilityPicking = false;

    $("addFacilityButton").addEventListener("click", () => {

        if (!selectedFacilityZone) return;
        stopRouteDrawing();

        $("facilityForm").reset();
        $("facilityId").value = "";
        $("facilityZoneId").value = selectedFacilityZone.id;

        $("facilityFormTitle").textContent = "إضافة مرفق جديد";
        $("facilityFormMessage").hidden = true;
        $("facilityForm").hidden = false;

        facilityPicking = false;

        $("facilityLocationHint").textContent =
            "اضغطي تحديد الموقع ثم اختاري نقطة داخل المنطقة.";

        $("facilityForm").scrollIntoView({
            behavior: "smooth",
            block: "center"
        });
    });

    $("cancelFacilityButton").addEventListener("click", () => {
        facilityPicking = false;
        $("facilityForm").hidden = true;
        $("facilityForm").reset();

        mapElement.classList.remove("is-placing");
        setMapStatus("خريطة تفاعلية");

        mapElement.querySelector("#facilityPreviewPin")?.remove();
    });

    $("pickFacilityLocation").addEventListener("click", () => {

        if (!selectedFacilityZone) return;
        stopRouteDrawing();

        const boundary = parseBoundary(
            selectedFacilityZone.boundaryPoints
        );

        if (boundary.length < 3) {
            alert("يجب تحديد حدود المنطقة أولًا.");
            return;
        }

        facilityPicking = true;

        mapElement.classList.add("is-placing");

        setMapStatus("اختاري موقع المرفق داخل المنطقة");

        mapElement.scrollIntoView({
            behavior: "smooth",
            block: "center"
        });
    });

    // Check if point is inside zone boundaries
    function pointInsideZone(x, y, polygon) {

        let inside = false;

        for (let i = 0, j = polygon.length - 1;
             i < polygon.length; j = i++) {

            const [xi, yi] = polygon[i];
            const [xj, yj] = polygon[j];

            const cross =
                (x - xi) * (yj - yi) -
                (y - yi) * (xj - xi);

            if (
                Math.abs(cross) < 0.000001 &&
                x >= Math.min(xi, xj) - 0.000001 &&
                x <= Math.max(xi, xj) + 0.000001 &&
                y >= Math.min(yi, yj) - 0.000001 &&
                y <= Math.max(yi, yj) + 0.000001
            ) {
                return true;
            }

            if (
                (yi > y) !== (yj > y) &&
                x < (xj - xi) * (y - yi) / (yj - yi) + xi
            ) {
                inside = !inside;
            }
        }

        return inside;
    }


    // =====================================
    // SAVE FACILITY
    // =====================================

    $("facilityForm").addEventListener("submit", async event => {
        event.preventDefault();

        if (!selectedFacilityZone) return;

        const messageBox = $("facilityFormMessage");
        const button = $("saveFacilityButton");

        messageBox.hidden = true;

        const name = $("facilityName").value.trim();
        const type = $("facilityType").value;
        const gender = $("facilityGender").value;

        const xValue = $("facilityMapX").value;
        const yValue = $("facilityMapY").value;

        if (xValue === "" || yValue === "") {
            messageBox.textContent = "حددي موقع المرفق على الخريطة أولًا.";
            messageBox.className = "zones-form-message error";
            messageBox.hidden = false;
            return;
        }

        if (type === "EXIT" && gender !== "BOTH") {
            messageBox.textContent = "المخرج يجب أن يكون متاحًا للجميع.";
            messageBox.className = "zones-form-message error";
            messageBox.hidden = false;
            return;
        }

        const latitudeValue = $("facilityLatitude").value;
        const longitudeValue = $("facilityLongitude").value;

        const payload = {
            name,
            type,
            gender,
            mapX: Number(xValue),
            mapY: Number(yValue),
            latitude: latitudeValue === ""
                ? null : Number(latitudeValue),
            longitude: longitudeValue === ""
                ? null : Number(longitudeValue)
        };

        const facilityId = $("facilityId").value;

        const isEditing = facilityId !== "";

        const url = isEditing
            ? `/api/v1/facility/update/${facilityId}`
            : `/api/v1/facility/add/${selectedFacilityZone.id}`;

        button.disabled = true;

        try {
            const response = await fetch(url, {
                method: isEditing ? "PUT" : "POST",
                cache: "no-store",
                headers: {
                    Authorization:
                        MergabAuth.getAuthorizationHeader(),
                    "Content-Type": "application/json",
                    Accept: "application/json"
                },
                body: JSON.stringify(payload)
            });

            if (response.status === 401) {
                MergabAuth.logout();
                return;
            }

            if (!response.ok) {
                const data = await response.json().catch(() => ({}));
                throw new Error(
                    data.message || `تعذر حفظ المرفق (${response.status})`
                );
            }

            facilityPicking = false;

            $("facilityForm").reset();
            $("facilityForm").hidden = true;

            mapElement.classList.remove("is-placing");
            mapElement.querySelector("#facilityPreviewPin")?.remove();

            setMapStatus("تم حفظ المرفق بنجاح");

            await loadFacilities(selectedFacilityZone.id);
            await refreshNetwork();

        } catch (error) {
            messageBox.textContent = error.message;
            messageBox.className = "zones-form-message error";
            messageBox.hidden = false;

            console.error("Save facility failed:", error);

        } finally {
            button.disabled = false;
        }
    });


// =====================================
// EDIT FACILITY
// =====================================

    function editFacility(facility) {

        if (!selectedFacilityZone) return;
        stopRouteDrawing();

        facilityPicking = false;
        mapElement.classList.remove("is-placing");
        mapElement.querySelector("#facilityPreviewPin")?.remove();

        $("facilityForm").reset();

        $("facilityId").value = facility.id;
        $("facilityZoneId").value = selectedFacilityZone.id;

        $("facilityName").value = facility.name ?? "";
        $("facilityType").value = facility.type ?? "";
        $("facilityGender").value = facility.gender ?? "BOTH";

        $("facilityMapX").value = facility.mapX ?? "";
        $("facilityMapY").value = facility.mapY ?? "";

        $("facilityLatitude").value = facility.latitude ?? "";
        $("facilityLongitude").value = facility.longitude ?? "";

        $("facilityFormTitle").textContent = "تعديل المرفق";
        $("facilityFormMessage").hidden = true;
        $("facilityForm").hidden = false;

        $("facilityLocationHint").textContent =
            "يمكنك تغيير موقع المرفق إذا لم تكن له وصلات وصول مرتبطة.";

        $("facilityForm").scrollIntoView({
            behavior: "smooth",
            block: "center"
        });
    }

// =====================================
// DELETE FACILITY
// =====================================

    async function deleteFacility(facility) {

        if (!selectedFacilityZone) return;

        const zoneId = selectedFacilityZone.id;

        if (!confirm(`هل تريدين حذف مرفق "${facility.name}"؟`)) {
            return;
        }

        try {
            const response = await fetch(
                `/api/v1/facility/delete/${facility.id}`,
                {
                    method: "DELETE",
                    headers: {
                        Authorization:
                            MergabAuth.getAuthorizationHeader(),
                        Accept: "application/json"
                    }
                }
            );

            if (response.status === 401) {
                MergabAuth.logout();
                return;
            }

            if (!response.ok) {
                const data = await response.json().catch(() => ({}));
                throw new Error(data.message || "تعذر حذف المرفق");
            }

            if (selectedFacilityZone?.id === zoneId) {
                await loadFacilities(zoneId);
            }

            setMapStatus("تم حذف المرفق بنجاح");

            await refreshNetwork();
        } catch (error) {
            alert(error.message);
            console.error("Delete facility failed:", error);
        }
    }

// =====================================
// DRAW SAVED FACILITIES ON MAP
// =====================================

    function drawFacilityPins(facilities) {

        const svg = mapElement.querySelector(".mqm-isvg");
        if (!svg) return;

        svg.querySelector("#facilitiesLayer")?.remove();

        const layer = createSVGElement("g", {
            id: "facilitiesLayer",
            "pointer-events": "none"
        }, svg);

        facilities.forEach(facility => {

            if (facility.mapX == null || facility.mapY == null) {
                return;
            }

            const x = Number(facility.mapX);
            const y = Number(facility.mapY);

            if (!Number.isFinite(x) || !Number.isFinite(y)) {
                return;
            }

            const pin = createSVGElement("circle", {
                cx: x,
                cy: y,
                r: 1.1,
                fill: "#0F6B50",
                stroke: "#FFFFFF",
                "stroke-width": 0.4
            }, layer);

            createSVGElement("title", {}, pin).textContent =
                facility.name;
        });
    }


    // =====================================
    // WALKWAYS & FACILITY ACCESS
    // =====================================

    let facilityCache = [];
    let zoneWalkPaths = [];
    let facilityAccessPaths = [];

    let routeDrawMode = null;
    let routeDraft = [];

    let editingWalkId = null;
    let editingAccessId = null;

    // =====================================
    // BUILD MANAGEMENT UI
    // =====================================

    const networkPanel = document.createElement("section");
    networkPanel.className = "mergab-network";

    networkPanel.innerHTML = `
        <div class="organizer-panel-heading">
            <div>
                <h2>الممرات ووصلات المرافق</h2>
                <p>إدارة شبكة المشي والوصول للمرافق داخل المنطقة</p>
            </div>
        </div>

        <div class="mergab-network-columns">

            <div class="mergab-network-card">

                <h3>
                    <span class="material-symbols-rounded">route</span>
                    الممرات الداخلية
                </h3>

                <div class="zones-field">
                    <label for="walkRouteName">اسم الممر</label>
                    <input id="walkRouteName"
                           maxlength="100"
                           placeholder="مثال: الممر الرئيسي">
                </div>

                <div class="zones-field">
                    <label for="walkRouteDirection">اتجاه الحركة</label>

                    <select id="walkRouteDirection">
                        <option value="BOTH">اتجاهان</option>
                        <option value="FORWARD">من البداية للنهاية</option>
                        <option value="REVERSE">من النهاية للبداية</option>
                    </select>
                </div>

                <label class="mergab-check">
                    <input type="checkbox" id="walkRouteActive" checked>
                    ممر نشط
                </label>

                <div class="mergab-network-actions">

                    <button type="button"
                            id="startWalkDrawing"
                            class="zones-secondary-btn">
                        رسم الممر
                    </button>

                    <button type="button"
                            id="undoRoutePoint"
                            class="zones-secondary-btn">
                        تراجع
                    </button>

                    <button type="button"
                            id="saveWalkRoute"
                            class="zones-primary-btn">
                        حفظ الممر
                    </button>

                    <button type="button"
                            id="cancelWalkRoute"
                            class="zones-secondary-btn">
                        جديد
                    </button>

                </div>

                <small id="walkDrawingHint">
                    اضغطي رسم الممر، ثم حددي نقاطه على الخريطة.
                </small>

                <div id="walkRoutesList"
                     class="mergab-route-list"></div>
            </div>

            <div class="mergab-network-card">

                <h3>
                    <span class="material-symbols-rounded">alt_route</span>
                    وصلات المرافق
                </h3>

                <div class="zones-field">
                    <label for="accessFacilitySelect">المرفق</label>

                    <select id="accessFacilitySelect">
                        <option value="">اختاري المرفق</option>
                    </select>
                </div>

                <div class="zones-field">
                    <label for="accessWalkSelect">الممر المرتبط</label>

                    <select id="accessWalkSelect">
                        <option value="">اختاري الممر</option>
                    </select>
                </div>

                <div class="zones-field">
                    <label for="accessRouteDirection">اتجاه الوصول</label>

                    <select id="accessRouteDirection">
                        <option value="BOTH">اتجاهان</option>
                        <option value="TO_FACILITY">نحو المرفق</option>
                        <option value="FROM_FACILITY">من المرفق</option>
                    </select>
                </div>

                <label class="mergab-check">
                    <input type="checkbox" id="accessRouteActive" checked>
                    وصلة نشطة
                </label>

                <div class="mergab-network-actions">

                    <button type="button"
                            id="startAccessDrawing"
                            class="zones-secondary-btn">
                        رسم الوصلة
                    </button>

                    <button type="button"
                            id="saveAccessRoute"
                            class="zones-primary-btn">
                        حفظ الوصلة
                    </button>

                    <button type="button"
                            id="cancelAccessRoute"
                            class="zones-secondary-btn">
                        جديد
                    </button>

                </div>

                <small id="accessDrawingHint">
                    ابدئي بنقطة على الممر، ثم حددي نقاط الوصول.
                    نهاية الوصلة تُربط بموقع المرفق تلقائيًا.
                </small>

                <div id="accessRoutesList"
                     class="mergab-route-list"></div>
            </div>

        </div>

        <div id="networkMessage"
             class="zones-form-message"
             role="status"
             hidden></div>
    `;

    $("facilityManager").appendChild(networkPanel);

    // =====================================
    // API & MESSAGES
    // =====================================

    function networkNotice(message, error = false) {
        const box = $("networkMessage");

        box.textContent = message;
        box.className =
            `zones-form-message ${error ? "error" : "success"}`;
        box.hidden = false;
    }

    async function networkApi(url, options = {}) {
        const response = await fetch(`/api/v1/${url}`, {
            ...options,
            cache: "no-store",
            headers: {
                Authorization:
                    MergabAuth.getAuthorizationHeader(),
                Accept: "application/json",
                ...(options.body
                    ? {"Content-Type": "application/json"}
                    : {}),
                ...options.headers
            }
        });

        if (response.status === 401) {
            MergabAuth.logout();
            throw new Error("انتهت جلسة الدخول");
        }

        if (!response.ok) {
            const data = await response.json().catch(() => ({}));

            throw new Error(
                data.message || `فشلت العملية (${response.status})`
            );
        }

        const text = await response.text();

        try {
            return text ? JSON.parse(text) : null;
        } catch {
            return null;
        }
    }

    // =====================================
    // POINTS & SELECTS
    // =====================================

    function parseRoutePoints(value) {
        try {
            const points =
                typeof value === "string"
                    ? JSON.parse(value)
                    : value;

            if (!Array.isArray(points)) return [];

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

    function putOptions(select, values, placeholder) {
        const previous = select.value;

        select.replaceChildren(
            new Option(placeholder, "")
        );

        values.forEach(item => {
            select.add(new Option(item.name, String(item.id)));
        });

        if ([...select.options].some(
            option => option.value === previous
        )) {
            select.value = previous;
        }
    }

    function updateNetworkSelects() {
        putOptions(
            $("accessFacilitySelect"),
            facilityCache,
            "اختاري المرفق"
        );

        putOptions(
            $("accessWalkSelect"),
            zoneWalkPaths,
            "اختاري الممر"
        );
    }

    // =====================================
    // DRAW PATHS ON MAP
    // =====================================

    function routePolyline(points, layer, stroke, dash = "") {
        if (points.length < 2) return null;

        return createSVGElement("polyline", {
            points: points.map(point => point.join(",")).join(" "),
            fill: "none",
            stroke,
            "stroke-width": 0.75,
            "stroke-linecap": "round",
            "stroke-linejoin": "round",
            "vector-effect": "non-scaling-stroke",
            "stroke-dasharray": dash,
            "pointer-events": "none"
        }, layer);
    }

    function renderNetworkOnMap() {
        const svg = mapElement.querySelector(".mqm-isvg");

        if (!svg) return;

        svg.querySelector("#networkRouteLayer")?.remove();
        svg.querySelector("#networkDraftLayer")?.remove();

        if (!selectedFacilityZone) return;

        const layer = createSVGElement("g", {
            id: "networkRouteLayer",
            "pointer-events": "none"
        }, svg);

        zoneWalkPaths.forEach(path => {
            const line = routePolyline(
                parseRoutePoints(path.pathPoints),
                layer,
                path.active ? "#1976a4" : "#9da8ae",
                path.active ? "" : "1.1,0.8"
            );

            if (line) {
                createSVGElement("title", {}, line).textContent =
                    path.name;
            }
        });

        facilityAccessPaths.forEach(path => {
            routePolyline(
                parseRoutePoints(path.pathPoints),
                layer,
                path.active ? "#c68b27" : "#a9a9a9",
                "0.9,0.6"
            );
        });

        renderRouteDraft();
    }

    function renderRouteDraft() {
        const svg = mapElement.querySelector(".mqm-isvg");

        if (!svg) return;

        svg.querySelector("#networkDraftLayer")?.remove();

        if (!routeDraft.length) return;

        const layer = createSVGElement("g", {
            id: "networkDraftLayer",
            "pointer-events": "none"
        }, svg);

        const color =
            routeDrawMode === "access" ? "#b56b12" : "#0e6348";

        routePolyline(routeDraft, layer, color);

        routeDraft.forEach(([x, y]) => {
            createSVGElement("circle", {
                cx: x,
                cy: y,
                r: 0.7,
                fill: color,
                stroke: "white",
                "stroke-width": 0.2,
                "pointer-events": "none"
            }, layer);
        });
    }

    // =====================================
    // ROUTE LISTS
    // =====================================

    function addRouteListItem(
        parent, label, active, onEdit, onToggle, onDelete
    ) {
        const row = document.createElement("div");
        row.className = "mergab-route-item";

        const name = document.createElement("span");

        name.textContent =
            `${label} · ${active ? "نشط" : "متوقف"}`;

        row.appendChild(name);

        for (const [icon, title, onClick] of [
            ["edit", "تعديل", onEdit],
            [
                "power_settings_new",
                active ? "تعطيل" : "تفعيل",
                onToggle
            ],
            ["delete", "حذف", onDelete]
        ]) {
            row.appendChild(
                createTableButton(
                    icon,
                    title,
                    onClick,
                    title === "حذف"
                )
            );
        }

        parent.appendChild(row);
    }

    function displayNetworkLists() {
        const walks = $("walkRoutesList");
        const access = $("accessRoutesList");

        walks.replaceChildren();
        access.replaceChildren();

        zoneWalkPaths.forEach(path => {
            addRouteListItem(
                walks,
                path.name,
                path.active,
                () => editWalkRoute(path),

                async () => {
                    try {
                        await networkApi(
                            `zone-walk-path/update/${path.id}`,
                            {
                                method: "PUT",
                                body: JSON.stringify({
                                    name: path.name,
                                    pathPoints: path.pathPoints,
                                    direction: path.direction,
                                    active: !path.active
                                })
                            }
                        );

                        await refreshNetwork();

                    } catch (error) {
                        networkNotice(error.message, true);
                    }
                },

                async () => {
                    if (!confirm(`حذف الممر «${path.name}»؟`)) {
                        return;
                    }

                    try {
                        await networkApi(
                            `zone-walk-path/delete/${path.id}`,
                            {method: "DELETE"}
                        );

                        await refreshNetwork();

                    } catch (error) {
                        networkNotice(error.message, true);
                    }
                }
            );
        });

        facilityAccessPaths.forEach(path => {
            addRouteListItem(
                access,
                `وصلة ${path.facilityName} #${path.id}`,
                path.active,

                () => editAccessRoute(path),

                async () => {
                    try {
                        await networkApi(
                            `facility-access-path/change-status/${path.id}?active=${!path.active}`,
                            {method: "PUT"}
                        );

                        await refreshNetwork();

                    } catch (error) {
                        networkNotice(error.message, true);
                    }
                },

                async () => {
                    if (!confirm(
                        `حذف وصلة المرفق «${path.facilityName}»؟`
                    )) {
                        return;
                    }

                    try {
                        await networkApi(
                            `facility-access-path/delete/${path.id}`,
                            {method: "DELETE"}
                        );

                        await refreshNetwork();

                    } catch (error) {
                        networkNotice(error.message, true);
                    }
                }
            );
        });

        if (!zoneWalkPaths.length) {
            walks.textContent = "لا توجد ممرات بعد.";
        }

        if (!facilityAccessPaths.length) {
            access.textContent = "لا توجد وصلات بعد.";
        }
    }

    // =====================================
    // REFRESH DATA
    // =====================================

    async function refreshNetwork() {
        const zoneId = selectedFacilityZone?.id;

        if (zoneId == null) return;

        try {
            const walks = await networkApi(
                `zone-walk-path/get-by-zone/${zoneId}`
            );

            const groups = await Promise.all(
                facilityCache.map(async facility => {
                    const data = await networkApi(
                        `facility-access-path/get-by-facility/${facility.id}`
                    );

                    return (
                        Array.isArray(data) ? data : []
                    ).map(path => ({
                        ...path,
                        facilityId: facility.id,
                        facilityName: facility.name
                    }));
                })
            );

            if (
                String(selectedFacilityZone?.id) !== String(zoneId)
            ) {
                return;
            }

            zoneWalkPaths = Array.isArray(walks) ? walks : [];
            facilityAccessPaths = groups.flat();

            updateNetworkSelects();
            displayNetworkLists();
            renderNetworkOnMap();

        } catch (error) {
            networkNotice(error.message, true);
        }
    }

    // =====================================
    // DRAWING CONTROLS
    // =====================================

    function stopRouteDrawing() {
        routeDrawMode = null;
        routeDraft = [];

        mapElement.classList.remove("is-placing");

        mapElement.querySelector("#networkDraftLayer")?.remove();

        setMapStatus("خريطة تفاعلية");
    }

    function editWalkRoute(path) {
        stopRouteDrawing();

        editingWalkId = path.id;
        routeDraft = parseRoutePoints(path.pathPoints);

        $("walkRouteName").value = path.name;
        $("walkRouteDirection").value = path.direction;
        $("walkRouteActive").checked = !!path.active;

        $("walkDrawingHint").textContent =
            "عدّلي البيانات أو اضغطي رسم الممر لإعادة رسمه.";

        renderRouteDraft();
    }

    function nearestPointToWalkway(point, points) {
        let nearest = null;
        let distance = Infinity;

        for (let i = 1; i < points.length; i++) {
            const a = points[i - 1];
            const b = points[i];

            const dx = b[0] - a[0];
            const dy = b[1] - a[1];

            const lengthSquared = dx * dx + dy * dy;

            const t = lengthSquared
                ? Math.max(
                    0,
                    Math.min(
                        1,
                        (
                            (point[0] - a[0]) * dx +
                            (point[1] - a[1]) * dy
                        ) / lengthSquared
                    )
                )
                : 0;

            const projected = [
                a[0] + t * dx,
                a[1] + t * dy
            ];

            const d = Math.hypot(
                projected[0] - point[0],
                projected[1] - point[1]
            );

            if (d < distance) {
                distance = d;
                nearest = projected;
            }
        }

        return {nearest, distance};
    }

    function editAccessRoute(path) {
        stopRouteDrawing();

        editingAccessId = path.id;
        routeDraft = parseRoutePoints(path.pathPoints);

        $("accessFacilitySelect").value =
            String(path.facilityId);

        const start = routeDraft[0];

        let nearestWalkId = "";
        let nearestDistance = Infinity;

        if (start) {
            zoneWalkPaths.forEach(walk => {
                const result = nearestPointToWalkway(
                    start,
                    parseRoutePoints(walk.pathPoints)
                );

                if (result.distance < nearestDistance) {
                    nearestDistance = result.distance;
                    nearestWalkId = String(walk.id);
                }
            });
        }

        $("accessWalkSelect").value =
            nearestDistance <= 0.5 ? nearestWalkId : "";

        $("accessFacilitySelect").disabled = true;
        $("accessWalkSelect").disabled = true;

        $("accessRouteDirection").value = path.direction;
        $("accessRouteActive").checked = !!path.active;

        $("accessDrawingHint").textContent =
            "يمكنك تعديل اتجاه الوصلة وحالتها أو إعادة رسمها.";

        renderRouteDraft();
    }

    function resetWalkEditor() {
        stopRouteDrawing();

        editingWalkId = null;

        $("walkRouteName").value = "";
        $("walkRouteDirection").value = "BOTH";
        $("walkRouteActive").checked = true;

        $("walkDrawingHint").textContent =
            "اختاري رسم الممر وحددي نقاطه على الخريطة.";
    }

    function resetAccessEditor() {
        stopRouteDrawing();

        editingAccessId = null;

        $("accessFacilitySelect").disabled = false;
        $("accessWalkSelect").disabled = false;

        $("accessFacilitySelect").value = "";
        $("accessWalkSelect").value = "";

        $("accessRouteDirection").value = "BOTH";
        $("accessRouteActive").checked = true;

        $("accessDrawingHint").textContent =
            "ابدئي بنقطة على الممر ثم ارسمي الوصلة.";
    }

    $("cancelWalkRoute").addEventListener(
        "click",
        resetWalkEditor
    );

    $("cancelAccessRoute").addEventListener(
        "click",
        resetAccessEditor
    );

    $("undoRoutePoint").addEventListener("click", () => {
        if (!routeDrawMode) return;

        routeDraft.pop();
        renderRouteDraft();
    });

    $("startWalkDrawing").addEventListener("click", () => {
        if (!selectedFacilityZone) return;

        if (editingAccessId != null) {
            resetAccessEditor();
        }

        facilityPicking = false;

        mapElement.querySelector("#facilityPreviewPin")?.remove();

        routeDrawMode = "walk";
        routeDraft = [];

        mapElement.classList.add("is-placing");

        setMapStatus(
            "حددي نقاط الممر بالترتيب ثم اضغطي حفظ الممر"
        );

        mapElement.scrollIntoView({
            behavior: "smooth",
            block: "center"
        });

        renderRouteDraft();
    });

    $("startAccessDrawing").addEventListener("click", () => {
        if (!selectedFacilityZone) return;

        if (!$("accessFacilitySelect").value) {
            networkNotice("اختاري المرفق أولًا", true);
            return;
        }

        if (
            editingAccessId == null &&
            !$("accessWalkSelect").value
        ) {
            networkNotice("اختاري الممر أولًا", true);
            return;
        }

        if (editingWalkId != null) {
            resetWalkEditor();
        }

        facilityPicking = false;

        mapElement.querySelector("#facilityPreviewPin")?.remove();

        routeDrawMode = "access";
        routeDraft = [];

        mapElement.classList.add("is-placing");

        setMapStatus(
            "ابدئي من الممر، ثم ارسمي نقاط الوصلة"
        );

        mapElement.scrollIntoView({
            behavior: "smooth",
            block: "center"
        });

        renderRouteDraft();
    });

    // =====================================
    // DRAW ON MAP
    // =====================================

    function routeMapClick(event, wasDragging) {
        if (
            wasDragging ||
            !event.target.closest(".mqm-img")
        ) {
            return;
        }

        const stage =
            mapElement.querySelector(".mqm-istage");

        if (!stage || !selectedFacilityZone) return;

        const rect = stage.getBoundingClientRect();

        const x =
            (event.clientX - rect.left) / rect.width * 100;

        const y =
            (event.clientY - rect.top) / rect.height * 100;

        const polygon = parseBoundary(
            selectedFacilityZone.boundaryPoints
        );

        if (
            !Number.isFinite(x) ||
            !Number.isFinite(y) ||
            !pointInsideZone(x, y, polygon)
        ) {
            networkNotice(
                "النقطة لازم تكون داخل حدود المنطقة",
                true
            );
            return;
        }

        let point = [
            Number(x.toFixed(2)),
            Number(y.toFixed(2))
        ];

        if (
            routeDrawMode === "access" &&
            routeDraft.length === 0
        ) {
            const selected = zoneWalkPaths.find(path =>
                String(path.id) ===
                $("accessWalkSelect").value
            );

            if (selected) {
                const result = nearestPointToWalkway(
                    point,
                    parseRoutePoints(selected.pathPoints)
                );

                if (
                    result.distance > 0.5 ||
                    !result.nearest
                ) {
                    networkNotice(
                        "ابدئي أول نقطة فوق الممر المرتبط",
                        true
                    );
                    return;
                }

                point = result.nearest.map(number =>
                    Number(number.toFixed(4))
                );

            } else if (editingAccessId == null) {
                networkNotice(
                    "اختاري الممر الصحيح",
                    true
                );
                return;
            }
        }

        routeDraft.push(point);

        renderRouteDraft();

        setMapStatus(
            `تم تحديد ${routeDraft.length} نقطة للمسار`
        );
    }

    // =====================================
    // SAVE WALKWAY
    // =====================================

    $("saveWalkRoute").addEventListener("click", async () => {
        const zoneId = selectedFacilityZone?.id;

        if (zoneId == null) return;

        const name = $("walkRouteName").value.trim();

        if (!name || routeDraft.length < 2) {
            networkNotice(
                "اكتبي اسم الممر وحددي نقطتين على الأقل",
                true
            );
            return;
        }

        const payload = {
            name,
            pathPoints: JSON.stringify(routeDraft),
            direction: $("walkRouteDirection").value,
            active: $("walkRouteActive").checked
        };

        const button = $("saveWalkRoute");
        button.disabled = true;

        try {
            await networkApi(
                editingWalkId == null
                    ? `zone-walk-path/add/${zoneId}`
                    : `zone-walk-path/update/${editingWalkId}`,
                {
                    method:
                        editingWalkId == null ? "POST" : "PUT",
                    body: JSON.stringify(payload)
                }
            );

            resetWalkEditor();

            await refreshNetwork();

            networkNotice("تم حفظ الممر الداخلي");

        } catch (error) {
            networkNotice(error.message, true);

        } finally {
            button.disabled = false;
        }
    });

    // =====================================
    // SAVE FACILITY ACCESS PATH
    // =====================================

    $("saveAccessRoute").addEventListener(
        "click",
        async () => {
            const zoneId = selectedFacilityZone?.id;

            if (zoneId == null) return;

            const facilityId =
                $("accessFacilitySelect").value;

            const walkId =
                $("accessWalkSelect").value;

            const facility = facilityCache.find(item =>
                String(item.id) === facilityId
            );

            if (
                !facility ||
                (editingAccessId == null && !walkId)
            ) {
                networkNotice(
                    "اختاري المرفق والممر",
                    true
                );
                return;
            }

            if (
                facility.mapX == null ||
                facility.mapY == null ||
                routeDraft.length < 1
            ) {
                networkNotice(
                    "اختاري نقطة بداية الوصلة على الممر",
                    true
                );
                return;
            }

            const points = [...routeDraft];

            const end = [
                Number(facility.mapX),
                Number(facility.mapY)
            ];

            const last = points.at(-1);

            if (
                Math.hypot(
                    last[0] - end[0],
                    last[1] - end[1]
                ) > 0.00001
            ) {
                points.push(end);
            }

            if (points.length < 2) {
                networkNotice(
                    "الوصلة تحتاج طولًا فعليًا",
                    true
                );
                return;
            }

            const payload = {
                pathPoints: JSON.stringify(points),
                direction: $("accessRouteDirection").value,
                active: $("accessRouteActive").checked
            };

            const button = $("saveAccessRoute");
            button.disabled = true;

            try {
                await networkApi(
                    editingAccessId == null
                        ? `facility-access-path/add/${facilityId}/${walkId}`
                        : `facility-access-path/update/${editingAccessId}`,
                    {
                        method:
                            editingAccessId == null ? "POST" : "PUT",
                        body: JSON.stringify(payload)
                    }
                );

                resetAccessEditor();

                await refreshNetwork();

                networkNotice("تم حفظ وصلة المرفق");

            } catch (error) {
                networkNotice(error.message, true);

            } finally {
                button.disabled = false;
            }
        }
    );

    // =====================================
    // TABLE BUTTON
    // =====================================

    function createTableButton(
        icon,
        title,
        onClick,
        danger = false
    ) {
        const button =
            document.createElement("button");

        button.type = "button";
        button.title = title;
        button.setAttribute(
            "aria-label",
            title
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
    // RENDER ZONES TABLE
    // =====================================

    function renderTable() {
        tableBody.replaceChildren();

        $("zonesCount").textContent =
            `${zones.length} منطقة`;

        if (!zones.length) {
            const row =
                document.createElement("tr");

            const cell =
                document.createElement("td");

            cell.colSpan = 5;

            cell.textContent =
                "لا توجد مناطق بعد. ابدئي بإضافة أول منطقة.";

            cell.style.textAlign = "center";

            row.appendChild(cell);
            tableBody.appendChild(row);

            return;
        }

        zones.forEach(zone => {
            const row =
                document.createElement("tr");

            const boundary =
                parseBoundary(zone.boundaryPoints);

            const locationText =
                boundary.length >= 3
                    ? "حدود محددة"
                    : hasPosition(zone)
                        ? "نقطة فقط"
                        : "غير محدد";

            const values = [
                zone.name,

                Number(zone.capacity)
                    .toLocaleString("ar-SA"),

                Number(zone.initialVisitors)
                    .toLocaleString("ar-SA"),

                locationText
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
                createTableButton(
                    "home_repair_service",
                    "إدارة مرافق المنطقة",
                    () => openFacilityManager(zone)
                )
            );


            actions.appendChild(
                createTableButton(
                    "edit",
                    "تعديل المنطقة",
                    () => openEditor(zone)
                )
            );

            actions.appendChild(
                createTableButton(
                    "delete",
                    "حذف المنطقة",
                    () => deleteZone(zone),
                    true
                )
            );

            row.appendChild(actions);
            tableBody.appendChild(row);
        });
    }

    // =====================================
    // DELETE ZONE
    // =====================================

    async function deleteZone(zone) {
        const confirmed = window.confirm(
            `هل تريدين حذف منطقة "${zone.name}"؟`
        );

        if (!confirmed) return;

        try {
            await api(`/delete/${zone.id}`, {
                method: "DELETE"
            });

            closeEditor();
            await loadZones();

            setMapStatus(
                "تم حذف المنطقة بنجاح"
            );

        } catch (error) {
            window.alert(
                "تعذر حذف المنطقة. " +
                "قد تكون مرتبطة بمسارات أو زيارات.\n\n" +
                error.message
            );
        }
    }

    // =====================================
    // LOAD ZONES
    // =====================================

    async function loadZones() {
        try {
            const data = await api("/get");

            if (!Array.isArray(data)) {
                throw new Error(
                    "بيانات المناطق غير صحيحة."
                );
            }

            zones = data;

            renderTable();
            renderMap();

        } catch (error) {
            console.error(
                "Load zones failed:",
                error
            );

            setMapStatus(
                "تعذر تحميل المناطق"
            );

            tableBody.replaceChildren();

            const row =
                document.createElement("tr");

            const cell =
                document.createElement("td");

            cell.colSpan = 5;

            cell.textContent =
                "تعذر تحميل المناطق. يرجى تحديث الصفحة.";

            row.appendChild(cell);
            tableBody.appendChild(row);
        }
    }

    // =====================================
    // START
    // =====================================

// Show the map immediately, even when no zones exist
    renderMap();

// Load saved zones separately
    loadZones();
});