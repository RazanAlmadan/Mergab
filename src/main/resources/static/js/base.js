
/* ===== Shared Navbar & Footer ===== */

document.addEventListener('DOMContentLoaded', () => {

    const menuButton = document.getElementById('navMenuToggle');
    const navigation = document.getElementById('mainNavigation');

    if (menuButton && navigation) {
        menuButton.addEventListener('click', () => {
            const isOpen = navigation.classList.toggle('is-open');

            menuButton.setAttribute('aria-expanded', String(isOpen));

            menuButton.querySelector('.material-symbols-rounded')
                .textContent = isOpen ? 'close' : 'menu';
        });

        navigation.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                navigation.classList.remove('is-open');
                menuButton.setAttribute('aria-expanded', 'false');
                menuButton.querySelector('.material-symbols-rounded')
                    .textContent = 'menu';
            });
        });
    }

    // Highlight current navigation link.
    const currentPath = window.location.pathname;

    document.querySelectorAll('.header-nav a').forEach(link => {
        const href = link.getAttribute('href');

        if (href === currentPath) {
            link.setAttribute('aria-current', 'page');
        }
    });

    // Account destination based on saved session.

    // Navbar authentication based on user role
    const accountLink = document.getElementById('accountLink');
    const profileLink = document.getElementById('navProfileLink');
    const profileName = document.getElementById('navProfileName');
    const logoutButton = document.getElementById('navLogoutButton');

    let currentSession = null;

    try {
        currentSession = JSON.parse(
            sessionStorage.getItem('mergab.session') || 'null'
        );
    } catch (error) {
        console.warn('Invalid session data');
    }

    const accountPaths = {
        ADMIN: '/account',
        ORGANIZER: '/account',
        VISITOR: '/visitor/account'
    };

    if (currentSession?.token && accountPaths[currentSession.role]) {

        // Hide login button
        if (accountLink) {
            accountLink.hidden = true;
        }

        // Show user profile
        if (profileLink && profileName) {
            profileLink.href = accountPaths[currentSession.role];
            profileName.textContent =
                currentSession.fullName || 'المستخدم';

            profileLink.hidden = false;
        }

        // Show logout button
        if (logoutButton) {
            logoutButton.hidden = false;

            logoutButton.addEventListener('click', () => {
                if (window.MergabAuth?.logout) {
                    window.MergabAuth.logout();
                } else {
                    sessionStorage.removeItem('mergab.session');
                    window.location.replace('/login');
                }
            });
        }

    } else {
        if (accountLink) accountLink.hidden = false;
        if (profileLink) profileLink.hidden = true;
        if (logoutButton) logoutButton.hidden = true;
    }


    // Dashboard link based on user role
    const dashboardLink = document.getElementById('dashboardNavLink');

    if (dashboardLink) {
        try {
            const session = JSON.parse(
                sessionStorage.getItem('mergab.session') || 'null'
            );

            const dashboardPaths = {
                ADMIN: '/admin',
                ORGANIZER: '/organizer/dashboard'
            };

            if (session?.token && dashboardPaths[session.role]) {
                dashboardLink.href = dashboardPaths[session.role];
                dashboardLink.hidden = false;
            } else {
                dashboardLink.hidden = true;
            }
        } catch (error) {
            dashboardLink.hidden = true;
        }
    }

});


/* ===== Shared Language Management ===== */

window.Mergab = window.Mergab || {};

Mergab.getLanguage = function () {
    return localStorage.getItem('mergab.lang') === 'en' ? 'en' : 'ar';
};

Mergab.setLanguage = function (language) {
    const lang = language === 'en' ? 'en' : 'ar';

    localStorage.setItem('mergab.lang', lang);

    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';

    document.dispatchEvent(
        new CustomEvent('mergab:languageChanged', {
            detail: { language: lang }
        })
    );
};

Mergab.toggleLanguage = function () {
    const next = Mergab.getLanguage() === 'ar' ? 'en' : 'ar';
    Mergab.setLanguage(next);
};



/* ===== Shared Layout Translations ===== */

Mergab.layoutTranslations = {
    ar: {
        navHome: 'الرئيسية',
        navMap: 'الخريطة',
        navEvents: 'الفعاليات',
        navFeatures: 'المميزات',
        login: 'تسجيل الدخول',
        account: 'حسابي',
        footerTag: 'استكشف بذكاء، واستمتع بكل لحظة.',
        dashboard: 'لوحة التحكم',
        welcome: 'أهلًا بك ',
        logout: 'تسجيل الخروج',
        navVisit: 'دليل الزيارة',

    },
    en: {
        navHome: 'Home',
        navMap: 'Map',
        navEvents: 'Events',
        navFeatures: 'Features',
        login: 'Log in',
        account: 'My account',
        footerTag: 'Explore smarter, enjoy every moment.',
        dashboard: 'Dashboard',
        welcome: 'Welcome ',
        logout: 'Log out',
        navVisit: 'Visit guide',
    }
};

Mergab.updateLayoutLanguage = function () {
    const lang = Mergab.getLanguage();
    const translations = Mergab.layoutTranslations[lang];

    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';

    document.querySelectorAll(
        '.site-header [data-t], .site-footer [data-t]'
    ).forEach(element => {
        const key = element.dataset.t;

        if (translations[key]) {
            element.textContent = translations[key];
        }
    });

    const languageButton = document.getElementById('langSwitch');

    if (languageButton) {
        languageButton.textContent =
            lang === 'ar' ? 'EN' : 'AR';
    }
};

document.addEventListener('mergab:languageChanged', () => {
    Mergab.updateLayoutLanguage();
});

document.addEventListener('DOMContentLoaded', () => {
    Mergab.updateLayoutLanguage();
});


/* ===== Shared Language Switch ===== */

document.addEventListener('DOMContentLoaded', () => {
    const languageButton = document.getElementById('langSwitch');

    if (languageButton) {
        languageButton.addEventListener('click', () => {
            Mergab.toggleLanguage();
        });
    }
});


/* ===== Visitor Prayer Notifications ===== */

document.addEventListener('DOMContentLoaded', () => {

    const getSession = () => {
        try {
            return JSON.parse(
                sessionStorage.getItem('mergab.session') || 'null'
            );
        } catch {
            return null;
        }
    };

    // Only visitors receive prayer notifications.
    if (getSession()?.role !== 'VISITOR') return;

    let checking = false;
    let notificationVisible = false;
    let lastShown = '';

    const prayerNames = {
        fajr: 'الفجر',
        dhuhr: 'الظهر',
        asr: 'العصر',
        maghrib: 'المغرب',
        isha: 'العشاء'
    };

    async function checkPrayerNotification() {

        const session = getSession();

        if (
            checking ||
            notificationVisible ||
            document.hidden ||
            session?.role !== 'VISITOR' ||
            !session.token
        ) return;

        checking = true;

        try {
            const response = await fetch('/api/v1/prayer/my-alert', {
                headers: {
                    Authorization: session.token,
                    Accept: 'application/json'
                },
                cache: 'no-store'
            });

            if (!response.ok) return;

            const alert = await response.json();

            // Backend checks showPrayerTimes and prayer time.
            if (alert.show !== true || !alert.prayer) return;

            const alertKey =
                new Date().toDateString() + ':' + alert.prayer;

            if (lastShown === alertKey) return;
            lastShown = alertKey;

            notificationVisible = true;

            const box = document.createElement('div');

            box.setAttribute('role', 'alert');
            box.dir = 'rtl';

            box.style.cssText = `
                position:fixed;
                bottom:24px;
                right:24px;
                z-index:99999;
                width:350px;
                max-width:calc(100vw - 48px);
                padding:22px;
                background:white;
                border:1px solid #dce8df;
                border-radius:18px;
                box-shadow:0 15px 45px rgba(0,0,0,.18);
                color:#123e30;
                font-family:inherit;
                line-height:1.8;
                box-sizing:border-box;
            `;

            const title = document.createElement('h3');
            title.textContent = 'تنبيه الصلاة';
            title.style.margin = '0 0 10px';

            const message = document.createElement('p');
            message.textContent =
                `باقي ${alert.minutesLeft} دقيقة على أذان ` +
                `${prayerNames[alert.prayer] || alert.prayer} ` +
                `(${alert.time})`;

            box.append(title, message);

            // Nearest prayer rooms provided by backend.
            function addPrayerRoom(label, room) {
                if (!room || room.zoneId == null) return;

                const link = document.createElement('a');

                link.href =
                    '/visitor/map?zone=' +
                    encodeURIComponent(room.zoneId);

                link.textContent =
                    `${label}: ${room.name} — ${room.zoneName} ← الخريطة`;

                link.style.cssText = `
                    display:block;
                    margin:10px 0;
                    color:#0e5946;
                    font-weight:600;
                `;

                box.appendChild(link);
            }

            addPrayerRoom('مصلى الرجال', alert.men);
            addPrayerRoom('مصلى النساء', alert.women);

            const close = document.createElement('button');

            close.type = 'button';
            close.textContent = 'فهمت';
            close.style.cssText = `
                margin-top:12px;
                padding:9px 22px;
                background:#0e5946;
                color:white;
                border:0;
                border-radius:10px;
                cursor:pointer;
                font:inherit;
            `;

            close.addEventListener('click', () => {
                box.remove();
                notificationVisible = false;
            });

            box.appendChild(close);
            document.body.appendChild(box);

            // Mark as seen after displaying the notification.
            const seenResponse = await fetch(
                '/api/v1/prayer/my-alert/seen/' +
                encodeURIComponent(alert.prayer),
                {
                    method: 'PUT',
                    headers: {
                        Authorization: session.token
                    }
                }
            );

            if (!seenResponse.ok) {
                console.warn(
                    'Unable to mark prayer notification as seen'
                );
            }

        } catch (error) {
            console.warn('Prayer notification:', error);
        } finally {
            checking = false;
        }
    }

    // Check when page opens.
    checkPrayerNotification();

    // Check every minute while the site is open.
    setInterval(checkPrayerNotification, 60000);

    // Check when visitor returns to the page.
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
            checkPrayerNotification();
        }
    });
});

/* ===== Actual QR-based occupancy ===== */

Mergab.withLiveOccupancy = async function (zones) {
    const results = await Promise.allSettled(
        zones.map(async zone => {
            const response = await fetch(
                `/api/v1/zone-visit/occupancy/${zone.id}`,
                {
                    headers: { Accept: 'application/json' },
                    cache: 'no-store'
                }
            );

            if (!response.ok) {
                throw new Error(`Occupancy ${response.status}`);
            }

            const count = await response.json();

            if (typeof count !== 'number' ||
                !Number.isFinite(count) || count < 0) {
                throw new Error('Invalid occupancy response');
            }

            return count;
        })
    );

    return zones.map((zone, index) => ({
        ...zone,
        currentCount: results[index].status === 'fulfilled'
            ? results[index].value
            : null
    }));
};

