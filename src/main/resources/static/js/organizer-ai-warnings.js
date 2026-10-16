
/* ==========================================
   MERGAB | AI EARLY WARNINGS
   Organizer Dashboard
   ========================================== */

document.addEventListener("DOMContentLoaded", () => {
    "use strict";

    const session = MergabAuth.requireRole(["ORGANIZER"]);
    if (!session) return;

    const $ = id => document.getElementById(id);

    const simulationSelect = $("aiSimulationSelect");
    const refreshButton = $("refreshAiWarnings");
    const warningsList = $("aiWarningsList");

    let simulations = [];
    let requestVersion = 0;
    let loading = false;

    const numberFormat = new Intl.NumberFormat("ar-SA", {
        maximumFractionDigits: 1
    });

    function formatNumber(value) {
        if (value === null || value === undefined ||
            value === "" || !Number.isFinite(Number(value))) {
            return "—";
        }

        return numberFormat.format(Number(value));
    }

    function createElement(tag, className, text) {
        const element = document.createElement(tag);

        if (className) element.className = className;

        if (text !== undefined && text !== null) {
            element.textContent = String(text);
        }

        return element;
    }

    function showMessage(message) {
        const paragraph = createElement(
            "p",
            "organizer-empty",
            message
        );

        warningsList.replaceChildren(paragraph);
    }

    function resetSummary() {
        $("aiHighRiskCount").textContent = "—";
        $("aiMediumRiskCount").textContent = "—";
        $("aiLowRiskCount").textContent = "—";
        $("aiInsufficientCount").textContent = "—";

        $("aiPredictionHorizon").textContent =
            "التنبؤ: —";

        $("aiAnalyzedZones").textContent = "—";
    }

    function updateControls() {
        refreshButton.disabled =
            loading || !simulationSelect.value;

        simulationSelect.disabled = loading ||
            simulations.length === 0;
    }

    // ======================================
    // API
    // ======================================

    async function getJSON(url) {
        const response = await fetch(url, {
            method: "GET",
            cache: "no-store",
            headers: {
                Authorization:
                    MergabAuth.getAuthorizationHeader(),

                Accept: "application/json",

                "X-Requested-With": "XMLHttpRequest"
            }
        });

        if (response.status === 401) {
            MergabAuth.logout();
            throw new Error("انتهت صلاحية تسجيل الدخول.");
        }

        if (response.status === 403) {
            throw new Error(
                "ما عندك صلاحية لعرض الإنذارات الذكية."
            );
        }

        let data = null;

        try {
            data = await response.json();
        } catch {
            // Response may be empty or not JSON.
        }

        if (!response.ok) {
            throw new Error(
                data?.message ||
                data?.detail ||
                data?.error ||
                `فشل الطلب (HTTP ${response.status})`
            );
        }

        return data;
    }

    // ======================================
    // CONGESTION LEVELS
    // ======================================

    function getLevelInfo(warning) {
        const status = String(
            warning.status || ""
        ).toUpperCase();

        const level = String(
            warning.congestionLevel || ""
        ).toUpperCase();

        if (status === "INSUFFICIENT_DATA") {
            return {
                type: "insufficient",
                label: "بيانات غير كافية",
                rank: 4
            };
        }

        if (status === "LIMITED_DATA") {
            return {
                type: "limited",
                label: "بيانات محدودة",
                rank: 3
            };
        }

        if (status !== "PREDICTED") {
            return {
                type: "neutral",
                label: "حالة غير معروفة",
                rank: 4
            };
        }

        if (level === "HIGH") {
            return {
                type: "high",
                label: "ازدحام مرتفع",
                rank: 0
            };
        }

        if (level === "MEDIUM") {
            return {
                type: "medium",
                label: "ازدحام متوسط",
                rank: 1
            };
        }

        if (level === "LOW") {
            return {
                type: "low",
                label: "ازدحام منخفض",
                rank: 2
            };
        }

        return {
            type: "neutral",
            label: "غير محدد",
            rank: 4
        };
    }

    // ======================================
    // RENDER SUMMARY
    // ======================================

    function renderSummary(result) {
        const warnings = result.warnings || [];

        const counts = {
            high: 0,
            medium: 0,
            low: 0,
            insufficient: 0
        };

        for (const warning of warnings) {
            const type = getLevelInfo(warning).type;

            if (type === "high") counts.high++;

            else if (type === "medium") counts.medium++;

            else if (type === "low") counts.low++;

            else counts.insufficient++;
        }

        $("aiHighRiskCount").textContent =
            formatNumber(counts.high);

        $("aiMediumRiskCount").textContent =
            formatNumber(counts.medium);

        $("aiLowRiskCount").textContent =
            formatNumber(counts.low);

        $("aiInsufficientCount").textContent =
            formatNumber(counts.insufficient);

        $("aiPredictionHorizon").textContent = "رصد استباقي";

        $("aiAnalyzedZones").textContent =
            `${formatNumber(result.analyzedZones)} من
             ${formatNumber(result.totalZones)} منطقة`;
    }

    // ======================================
    // RENDER WARNING CARD
    // ======================================

    function buildMetric(label, value) {
        const metric = createElement(
            "div",
            "ai-warning-metric"
        );

        metric.appendChild(
            createElement("span", "", label)
        );

        metric.appendChild(
            createElement("strong", "", value)
        );

        return metric;
    }

    function buildWarningCard(warning) {
        const level = getLevelInfo(warning);

        const card = createElement(
            "article",
            `ai-warning-card ${level.type}`
        );

        const header = createElement(
            "div",
            "ai-warning-card-header"
        );

        const zoneName = createElement(
            "h4",
            "ai-warning-zone-name",
            warning.zoneName ||
            `منطقة #${warning.zoneId}`
        );

        const badge = createElement(
            "span",
            `ai-warning-badge ${level.type}`,
            level.label
        );

        header.append(zoneName, badge);

        const metrics = createElement(
            "div",
            "ai-warning-metrics"
        );

        metrics.appendChild(buildMetric(
            "آخر إشغال في المحاكاة:",
            formatNumber(warning.currentOccupancy)
        ));

        metrics.appendChild(buildMetric(
            "الإشغال المتوقع:",
            formatNumber(warning.predictedOccupancy)
        ));

        metrics.appendChild(buildMetric(
            "نسبة الإشغال المتوقعة:",
            warning.predictedOccupancyPercentage != null
                ? `${formatNumber(
                    warning.predictedOccupancyPercentage
                )}%`
                : "—"
        ));

        metrics.appendChild(buildMetric(
            "آخر طول للطابور:",
            formatNumber(warning.currentQueueLength)
        ));

        const recommendation = createElement(
            "p",
            "ai-warning-recommendation",
            warning.recommendation ||
            "لا توجد توصية متاحة لهذه المنطقة."
        );

        card.append(
            header,
            metrics,
            recommendation
        );

        return card;
    }

    // ======================================
    // RENDER WARNINGS
    // ======================================

    function renderWarnings(result) {
        if (!result || !Array.isArray(result.warnings)) {
            throw new Error(
                "استجابة الإنذارات الذكية غير مكتملة."
            );
        }

        renderSummary(result);

        const warnings = [...result.warnings].sort(
            (a, b) =>
                getLevelInfo(a).rank -
                getLevelInfo(b).rank
        );

        if (!warnings.length) {
            showMessage(
                "ما فيه مناطق متاحة للتحليل."
            );
            return;
        }

        const fragment = document.createDocumentFragment();

        for (const warning of warnings) {
            fragment.appendChild(
                buildWarningCard(warning)
            );
        }

        warningsList.replaceChildren(fragment);
    }

    // ======================================
    // LOAD SIMULATIONS
    // ======================================

    async function loadSimulations() {
        resetSummary();

        simulationSelect.replaceChildren(
            new Option("جاري تحميل المحاكاة...", "")
        );

        loading = true;
        updateControls();

        try {
            const response = await getJSON(
                "/api/v1/simulation/get-all"
            );

            if (!Array.isArray(response)) {
                throw new Error(
                    "استجابة المحاكاة غير صحيحة."
                );
            }

            simulations = response
                .filter(simulation =>
                    simulation.status === "COMPLETED"
                )
                .sort((a, b) =>
                    Number(b.id) - Number(a.id)
                );

            simulationSelect.replaceChildren();

            simulationSelect.add(new Option(
                simulations.length
                    ? "اختاري المحاكاة"
                    : "لا توجد محاكاة مكتملة",
                ""
            ));

            for (const simulation of simulations) {
                simulationSelect.add(new Option(
                    `محاكاة #${simulation.id} — ${
                        simulation.durationMinutes
                    } دقيقة`,
                    String(simulation.id)
                ));
            }

            if (!simulations.length) {
                showMessage(
                    "شغّلي محاكاة واحفظي نتائجها أولًا، " +
                    "ثم ارجعي لعرض التنبؤات."
                );
                return;
            }

            // Select latest completed simulation
            simulationSelect.value =
                String(simulations[0].id);

        } catch (error) {
            simulations = [];

            simulationSelect.replaceChildren(
                new Option("تعذر تحميل المحاكاة", "")
            );

            showMessage(error.message);
            return;

        } finally {
            loading = false;
            updateControls();
        }

        await loadWarnings();
    }

    // ======================================
    // LOAD AI EARLY WARNINGS
    // ======================================

    async function loadWarnings() {
        const simulationId = simulationSelect.value;

        const currentRequest = ++requestVersion;

        resetSummary();

        if (!simulationId) {
            showMessage(
                "اختاري محاكاة مكتملة لعرض الإنذارات."
            );
            return;
        }

        loading = true;
        updateControls();

        showMessage(
            "جاري تحليل مناطق المحاكاة بالذكاء الاصطناعي..."
        );

        try {
            const result = await getJSON(
                `/api/v1/ai/early-warnings/${
                    encodeURIComponent(simulationId)
                }`
            );

            // Ignore older requests
            if (currentRequest !== requestVersion) {
                return;
            }

            renderWarnings(result);

        } catch (error) {
            if (currentRequest !== requestVersion) {
                return;
            }

            resetSummary();

            showMessage(
                "تعذر تحميل الإنذارات الذكية. " +
                error.message
            );

        } finally {
            if (currentRequest === requestVersion) {
                loading = false;
                updateControls();
            }
        }
    }

    // ======================================
    // EVENTS
    // ======================================

    simulationSelect.addEventListener(
        "change",
        loadWarnings
    );

    refreshButton.addEventListener(
        "click",
        loadWarnings
    );

    // ======================================
    // START
    // ======================================

    loadSimulations();
});
