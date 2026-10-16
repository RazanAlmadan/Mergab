
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


