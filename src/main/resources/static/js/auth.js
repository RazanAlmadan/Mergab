
/* Mergab | Shared Authentication */

(function () {
    "use strict";

    const SESSION_KEY = "mergab.session";

    const ROLE_HOME = {
        ADMIN: "/admin",
        ORGANIZER: "/organizer/dashboard",
        VISITOR: "/"
    };

    function getSession() {
        try {
            return JSON.parse(sessionStorage.getItem(SESSION_KEY));
        } catch {
            return null;
        }
    }

    function saveSession(session) {
        sessionStorage.setItem(
            SESSION_KEY,
            JSON.stringify(session)
        );
    }

    function clearSession() {
        sessionStorage.removeItem(SESSION_KEY);
    }

    function getHomePage(role) {
        return ROLE_HOME[role] || "/";
    }

    function getAuthorizationHeader() {
        return getSession()?.token || null;
    }

    async function login(email, password) {
        const credentials = `${email.trim()}:${password}`;

        // Encode credentials correctly, including Unicode.
        const bytes = new TextEncoder().encode(credentials);
        const token = "Basic " + btoa(
            Array.from(bytes, byte =>
                String.fromCharCode(byte)
            ).join("")
        );

        const response = await fetch(
            "/api/v1/user/my-account",
            {
                method: "GET",
                headers: {
                    Authorization: token,
                    Accept: "application/json",
                    "X-Requested-With": "XMLHttpRequest"
                },

                cache: "no-store"
            }
        );

        if (response.status === 401) {
            throw new Error("INVALID_CREDENTIALS");
        }

        if (!response.ok) {
            throw new Error(`LOGIN_FAILED_${response.status}`);
        }

        const user = await response.json();

        if (!ROLE_HOME[user.role]) {
            throw new Error("INVALID_ROLE");
        }

        const session = {
            id: user.id,
            fullName: user.fullName,
            email: user.email,
            role: user.role,
            token: token,
            showPrayerTimes: Boolean(
                user.visitor?.showPrayerTimes
            )
        };

        saveSession(session);

        return session;
    }

    function logout() {
        clearSession();
        window.location.replace("/login");
    }

    function requireRole(allowedRoles) {
        const session = getSession();

        if (!session?.token) {
            const next = window.location.pathname +
                window.location.search;

            window.location.replace(
                "/login?next=" + encodeURIComponent(next)
            );

            return null;
        }

        if (
            allowedRoles &&
            !allowedRoles.includes(session.role)
        ) {
            window.location.replace("/forbidden");
            return null;
        }

        return session;
    }

    window.MergabAuth = {
        login,
        logout,
        getSession,
        saveSession,
        clearSession,
        getHomePage,
        getAuthorizationHeader,
        requireRole
    };
})();
