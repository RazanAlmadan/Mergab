
/* ========================================
   MERGAB | LOGIN PAGE
   ======================================== */

document.addEventListener("DOMContentLoaded", () => {
    "use strict";

    const form = document.getElementById("loginForm");
    const emailInput = document.getElementById("email");
    const passwordInput = document.getElementById("password");
    const loginButton = document.getElementById("loginButton");
    const errorBox = document.getElementById("loginError");
    const togglePassword = document.getElementById("togglePassword");
    const languageButton = document.getElementById("authLangSwitch");

    const translations = {
        ar: {
            pageTitle: "تسجيل الدخول | مِرقاب",
            eyebrow: "رحلتك داخل إكسبو تبدأ هنا",
            showcaseTitle: "استكشف إكسبو <span>بذكاء وسهولة.</span>",
            showcaseDescription:
                "خطط لزيارتك، اكتشف المناطق والفعاليات، وتنقل بثقة مع مِرقاب.",
            showcaseFooter: "مِرقاب — كل خطوة أذكى",
            backHome: "العودة للرئيسية",
            welcome: "أهلًا بعودتك",
            loginTitle: "تسجيل الدخول",
            loginDescription: "سجّل دخولك لمتابعة تجربتك مع مِرقاب.",
            emailLabel: "البريد الإلكتروني",
            passwordLabel: "كلمة المرور",
            loginButton: "تسجيل الدخول",
            noAccount: "ما عندك حساب؟",
            createAccount: "أنشئ حسابك الآن",
            footer: "© مِرقاب — تجربة إكسبو أذكى",
            requiredFields: "يرجى إدخال البريد الإلكتروني وكلمة المرور.",
            invalidEmail: "يرجى إدخال بريد إلكتروني صحيح.",
            invalidCredentials: "البريد الإلكتروني أو كلمة المرور غير صحيحة.",
            invalidRole: "صلاحية هذا الحساب غير معروفة.",
            serverError: "تعذر تسجيل الدخول. يرجى المحاولة مرة أخرى.",
            loggingIn: "جارٍ تسجيل الدخول...",
            showPassword: "إظهار كلمة المرور",
            hidePassword: "إخفاء كلمة المرور"
        },
        en: {
            pageTitle: "Sign In | Mergab",
            eyebrow: "Your Expo journey starts here",
            showcaseTitle: "Explore Expo <span>Smarter and Easier.</span>",
            showcaseDescription:
                "Plan your visit, discover zones and events, and navigate Expo confidently with Mergab.",
            showcaseFooter: "Mergab — Every Step Smarter",
            backHome: "Back to Home",
            welcome: "Welcome Back",
            loginTitle: "Sign In",
            loginDescription: "Sign in to continue your Mergab experience.",
            emailLabel: "Email Address",
            passwordLabel: "Password",
            loginButton: "Sign In",
            noAccount: "Don't have an account?",
            createAccount: "Create an Account",
            footer: "© Mergab — A Smarter Expo Experience",
            requiredFields: "Please enter your email and password.",
            invalidEmail: "Please enter a valid email address.",
            invalidCredentials: "Incorrect email or password.",
            invalidRole: "This account has an unknown role.",
            serverError: "Unable to sign in. Please try again.",
            loggingIn: "Signing in...",
            showPassword: "Show password",
            hidePassword: "Hide password"
        }
    };

    function getLanguage() {
        return window.Mergab?.getLanguage?.() ||
            localStorage.getItem("mergab.lang") ||
            "ar";
    }

    function translatePage() {
        const lang = getLanguage() === "en" ? "en" : "ar";
        const t = translations[lang];

        document.documentElement.lang = lang;
        document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
        document.title = t.pageTitle;

        document.querySelectorAll("[data-auth-t]").forEach(element => {
            const key = element.dataset.authT;

            if (!Object.prototype.hasOwnProperty.call(t, key)) {
                return;
            }

            if (key === "showcaseTitle") {
                // Fixed translation strings, not user input.
                element.innerHTML = t[key];
            } else {
                element.textContent = t[key];
            }
        });

        languageButton.textContent = lang === "ar" ? "EN" : "عربي";

        togglePassword.setAttribute(
            "aria-label",
            passwordInput.type === "password"
                ? t.showPassword
                : t.hidePassword
        );
    }

    function showError(message) {
        errorBox.textContent = message;
        errorBox.hidden = false;
    }

    function clearError() {
        errorBox.textContent = "";
        errorBox.hidden = true;
    }

    function setLoading(loading) {
        loginButton.disabled = loading;
        emailInput.disabled = loading;
        passwordInput.disabled = loading;

        const lang = getLanguage() === "en" ? "en" : "ar";
        const buttonText = loginButton.querySelector("[data-auth-t='loginButton']");

        buttonText.textContent = loading
            ? translations[lang].loggingIn
            : translations[lang].loginButton;
    }

    languageButton.addEventListener("click", () => {
        if (window.Mergab?.toggleLanguage) {
            window.Mergab.toggleLanguage();
        } else {
            const next = getLanguage() === "ar" ? "en" : "ar";
            localStorage.setItem("mergab.lang", next);
        }

        translatePage();
    });

    window.addEventListener("mergab:languageChanged", translatePage);

    togglePassword.addEventListener("click", () => {
        passwordInput.type =
            passwordInput.type === "password" ? "text" : "password";

        togglePassword.setAttribute(
            "aria-pressed",
            String(passwordInput.type === "text")
        );

        translatePage();
    });

    form.addEventListener("submit", async event => {
        event.preventDefault();
        clearError();

        const lang = getLanguage() === "en" ? "en" : "ar";
        const t = translations[lang];

        const email = emailInput.value.trim();
        const password = passwordInput.value;

        if (!email || !password) {
            showError(t.requiredFields);
            return;
        }

        if (!emailInput.validity.valid) {
            showError(t.invalidEmail);
            return;
        }

        setLoading(true);

        try {
            const session = await MergabAuth.login(email, password);

            const params = new URLSearchParams(window.location.search);
            const next = params.get("next");

            // Only allow internal relative destinations.
            const safeNext =
                next &&
                next.startsWith("/") &&
                !next.startsWith("//") &&
                !next.includes("\\") &&
                !next.includes("\r") &&
                !next.includes("\n");

            // Never bypass the role's protected area via ?next=.
            const allowedPrefix = {
                ADMIN: "/admin",
                ORGANIZER: "/organizer",
                VISITOR: "/"
            }[session.role];

            const destination =
                safeNext &&
                allowedPrefix &&
                (next === allowedPrefix ||
                    next.startsWith(allowedPrefix + "/"))
                    ? next
                    : MergabAuth.getHomePage(session.role);

            window.location.replace(destination);

        } catch (error) {
            const currentLang = getLanguage() === "en" ? "en" : "ar";
            const messages = translations[currentLang];

            if (error.message === "INVALID_CREDENTIALS") {
                showError(messages.invalidCredentials);
            } else if (error.message === "INVALID_ROLE") {
                showError(messages.invalidRole);
            } else {
                showError(messages.serverError);
                console.error("Login failed:", error);
            }

            setLoading(false);
        }
    });

    translatePage();
});
