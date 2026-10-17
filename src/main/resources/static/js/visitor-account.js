
/* ==========================================
   MERGAB | VISITOR ACCOUNT
   ========================================== */

document.addEventListener("DOMContentLoaded", () => {
    "use strict";

    // Authentication
    const session = MergabAuth.requireRole(["VISITOR"]);
    if (!session) return;

    const $ = id => document.getElementById(id);

    let qrObjectUrl = null;
    let profileLoaded = false;

    // ======================================
    // ACCOUNT TABS
    // ======================================

    document.querySelectorAll("[data-tab]").forEach(tab => {
        tab.addEventListener("click", () => {
            const selected = tab.dataset.tab;

            document.querySelectorAll("[data-tab]").forEach(button => {
                button.setAttribute(
                    "aria-selected",
                    String(button.dataset.tab === selected)
                );
            });

            document.querySelectorAll("[data-panel]").forEach(panel => {
                panel.hidden = panel.dataset.panel !== selected;
            });
        });
    });

    // ======================================
    // AUTHENTICATED API REQUESTS
    // ======================================

    async function request(path, options = {}) {
        const isQr = path === "/visitor/my-qr-code";

        const response = await fetch("/api/v1" + path, {
            ...options,
            headers: {
                Authorization: session.token,
                Accept: isQr ? "image/png" : "application/json",
                ...(options.body
                    ? { "Content-Type": "application/json" }
                    : {}),
                ...(options.headers || {})
            },
            cache: "no-store"
        });

        if (response.status === 401 || response.status === 403) {
            throw new Error(
                "انتهت صلاحية الدخول أو ليس لديك صلاحية."
            );
        }

        if (!response.ok) {
            throw new Error(
                "تعذر إكمال العملية. رمز الخطأ: " + response.status
            );
        }

        return response;
    }

    // ======================================
    // LOAD PROFILE
    // ======================================

    async function loadProfile() {
        try {
            const response = await request("/user/my-account");
            const user = await response.json();

            $("visitorGreeting").textContent =
                "أهلًا، " + (user.fullName || "زائر مِرقاب");

            $("visitorName").value = user.fullName || "";
            $("visitorEmail").value = user.email || "";

            $("visitorPhone").value =
                user.visitor?.phoneNumber || "";

            $("visitorGender").value =
                user.visitor?.gender || "MALE";

            $("showPrayerTimes").checked =
                user.visitor?.showPrayerTimes === true;

            profileLoaded = Boolean(user.visitor);

            if (!profileLoaded) {
                throw new Error(
                    "لم يتم العثور على بيانات الزائر."
                );
            }
        } catch (error) {
            $("visitorMessage").textContent = error.message;
            console.error("Visitor profile:", error);
        }
    }

    // ======================================
    // DIGITAL CARD / QR
    // ======================================

    async function loadQr() {
        try {
            const response = await request(
                "/visitor/my-qr-code"
            );

            const blob = await response.blob();

            if (!blob.size || !blob.type.includes("image/png")) {
                throw new Error("استجابة QR غير صالحة.");
            }

            qrObjectUrl = URL.createObjectURL(blob);

            $("visitorQr").src = qrObjectUrl;
            $("visitorQrLarge").src = qrObjectUrl;

            $("visitorQr").hidden = false;
            $("qrLoading").hidden = true;

            $("expandQr").disabled = false;

            $("downloadQr").href = qrObjectUrl;
            $("downloadQr").hidden = false;
        } catch (error) {
            $("visitorQr").hidden = true;
            $("qrLoading").hidden = false;
            $("qrLoading").textContent =
                "تعذر تحميل QR: " + error.message;

            console.error("Visitor QR:", error);
        }
    }

    // QR modal
    $("expandQr").addEventListener("click", () => {
        if (qrObjectUrl) {
            $("qrDialog").showModal();
        }
    });

    $("closeQr").addEventListener("click", () => {
        $("qrDialog").close();
    });

    // ======================================
    // UPDATE PROFILE
    // ======================================

    $("visitorInfoForm").addEventListener(
        "submit",
        async event => {
            event.preventDefault();

            if (!profileLoaded) return;

            const button = $("saveVisitor");
            button.disabled = true;

            $("visitorMessage").textContent = "جارٍ الحفظ...";

            try {
                await request("/visitor/update-my-info", {
                    method: "PUT",
                    body: JSON.stringify({
                        phoneNumber: $("visitorPhone").value.trim(),
                        gender: $("visitorGender").value,
                        showPrayerTimes: $("showPrayerTimes").checked
                    })
                });

                $("visitorMessage").textContent =
                    "تم حفظ التغييرات بنجاح.";
            } catch (error) {
                $("visitorMessage").textContent = error.message;
            } finally {
                button.disabled = false;
            }
        }
    );

    // ======================================
    // VISIT HISTORY
    // ======================================

    const escapeHtml = value =>
        String(value ?? "").replace(/[&<>"']/g, char => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        }[char]));

    function formatDate(value) {
        if (!value) return "—";

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {
            return "—";
        }

        return date.toLocaleString("ar-SA", {
            dateStyle: "medium",
            timeStyle: "short"
        });
    }

    async function loadHistory() {
        const container = $("myVisits");

        try {
            const response = await request(
                "/zone-visit/my-history"
            );

            const data = await response.json();

            const visits = Array.isArray(data)
                ? data
                : Array.isArray(data?.data)
                    ? data.data
                    : [];

            if (!visits.length) {
                container.textContent =
                    "ما عندك زيارات مسجلة حتى الآن.";
                return;
            }

            visits.sort(
                (a, b) =>
                    new Date(b.checkInTime) -
                    new Date(a.checkInTime)
            );

            container.innerHTML = visits.map(visit => `
                <article class="va-visit">
                    <strong>
                        ${escapeHtml(visit.zoneName || "منطقة")}
                    </strong>

                    <p>
                        الدخول: ${formatDate(visit.checkInTime)}
                    </p>

                    <p>
                        الخروج:
                        ${visit.checkOutTime
                ? formatDate(visit.checkOutTime)
                : "ما زال داخل المنطقة"}
                    </p>

                    <span class="va-status">
                        ${visit.checkOutTime
                ? "زيارة مكتملة"
                : "زيارة نشطة"}
                    </span>
                </article>
            `).join("");
        } catch (error) {
            console.error("Visit history:", error);

            container.textContent =
                "تعذر تحميل سجل الزيارات.";
        }
    }

    // ======================================
    // DELETE ACCOUNT
    // ======================================

    $("deleteMyAccount").addEventListener("click", async () => {
        const confirmed = confirm(
            "هل أنت متأكد من حذف حسابك وبياناتك وسجل زياراتك نهائيًا؟"
        );

        if (!confirmed) return;

        const button = $("deleteMyAccount");
        button.disabled = true;

        try {
            await request("/user/delete-my-account", {
                method: "DELETE"
            });

            MergabAuth.logout();
        } catch (error) {
            $("visitorMessage").textContent =
                "تعذر حذف الحساب: " + error.message;

            button.disabled = false;
        }
    });

    // ======================================
    // INITIALIZATION
    // ======================================

    loadProfile();
    loadQr();
    loadHistory();

    // Release QR image memory on exit
    window.addEventListener("beforeunload", () => {
        if (qrObjectUrl) {
            URL.revokeObjectURL(qrObjectUrl);
        }
    });
});
