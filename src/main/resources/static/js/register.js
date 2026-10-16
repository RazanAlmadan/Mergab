
/* ========================================
   MERGAB | VISITOR REGISTRATION
   ======================================== */

document.addEventListener("DOMContentLoaded", () => {
    "use strict";

    const form = document.getElementById("registerForm");
    const fullNameInput = document.getElementById("fullName");
    const emailInput = document.getElementById("email");
    const phoneInput = document.getElementById("phoneNumber");
    const passwordInput = document.getElementById("password");
    const prayerInput = document.getElementById("showPrayerTimes");
    const privacyInput = document.getElementById("privacyAcknowledged");

    const registerButton = document.getElementById("registerButton");
    const errorBox = document.getElementById("registerError");
    const languageButton = document.getElementById("registerLangSwitch");
    const togglePassword = document.getElementById("registerTogglePassword");

    const translations = {
        ar: {
            pageTitle: "إنشاء حساب | مِرقاب",
            eyebrow: "أهلًا بك في مِرقاب",
            showcaseTitle: "إكسبو أقرب لك <span>من أول خطوة.</span>",
            showcaseDescription:
                "أنشئ حسابك واكتشف المناطق والفعاليات، وتابع رحلتك داخل إكسبو بسهولة وذكاء.",
            highlightMap: "استكشف المناطق",
            highlightRoute: "تنقّل بذكاء",
            highlightEvents: "اكتشف الفعاليات",
            brandFooter: "مِرقاب — كل خطوة أذكى",
            backHome: "العودة للرئيسية",
            welcome: "انضم إلى مِرقاب",
            registerTitle: "أنشئ حسابك",
            registerDescription:
                "بيانات بسيطة، وتبدأ تجربتك الذكية داخل إكسبو.",
            fullNameLabel: "الاسم الكامل",
            emailLabel: "البريد الإلكتروني",
            phoneLabel: "رقم الجوال",
            phoneHelp: "يبدأ بـ 05 ويتكوّن من 10 أرقام",
            genderLabel: "الجنس",
            male: "ذكر",
            female: "أنثى",
            passwordLabel: "كلمة المرور",
            passwordHelp: "6 أحرف على الأقل",
            prayerTitle: "إظهار أوقات الصلاة",
            prayerDescription: "اعرض أوقات الصلاة أثناء زيارتك لإكسبو.",
            registerButton: "إنشاء الحساب",
            haveAccount: "عندك حساب بالفعل؟",
            loginLink: "تسجيل الدخول",
            footer: "© مِرقاب — تجربة إكسبو أذكى",
            requiredFields: "يرجى تعبئة جميع الحقول المطلوبة.",
            invalidName: "الاسم الكامل يجب أن يكون بين 3 و50 حرفًا.",
            invalidEmail: "يرجى إدخال بريد إلكتروني صحيح.",
            invalidPhone: "رقم الجوال يجب أن يبدأ بـ 05 ويتكوّن من 10 أرقام.",
            invalidGender: "يرجى اختيار الجنس.",
            invalidPassword: "كلمة المرور يجب أن تتكوّن من 6 أحرف على الأقل.",
            emailExists: "البريد الإلكتروني مسجّل بالفعل.",
            phoneExists: "رقم الجوال مسجّل بالفعل.",
            serverError: "تعذر إنشاء الحساب. يرجى المحاولة مرة أخرى.",
            registering: "جارٍ إنشاء الحساب...",
            showPassword: "إظهار كلمة المرور",
            hidePassword: "إخفاء كلمة المرور",
            privacyNoticeText: "اطلعت وفهمت كيفية معالجة بياناتي حسب",
            privacyNoticeLink: "سياسة الخصوصية",
            privacyRequired: "يرجى الاطلاع على سياسة الخصوصية وتأكيد الإقرار.",
        },
        en: {
            pageTitle: "Create Account | Mergab",
            eyebrow: "Welcome to Mergab",
            showcaseTitle: "Expo is Closer <span>From Your First Step.</span>",
            showcaseDescription:
                "Create an account, discover zones and events, and enjoy a smarter Expo experience.",
            highlightMap: "Explore Zones",
            highlightRoute: "Navigate Smarter",
            highlightEvents: "Discover Events",
            brandFooter: "Mergab — Every Step Smarter",
            backHome: "Back to Home",
            welcome: "Join Mergab",
            registerTitle: "Create Your Account",
            registerDescription:
                "A few details are all you need to start exploring Expo.",
            fullNameLabel: "Full Name",
            emailLabel: "Email Address",
            phoneLabel: "Phone Number",
            phoneHelp: "Must start with 05 and contain 10 digits",
            genderLabel: "Gender",
            male: "Male",
            female: "Female",
            passwordLabel: "Password",
            passwordHelp: "At least 6 characters",
            prayerTitle: "Show Prayer Times",
            prayerDescription: "Display prayer times during your Expo visit.",
            registerButton: "Create Account",
            haveAccount: "Already have an account?",
            loginLink: "Sign In",
            footer: "© Mergab — A Smarter Expo Experience",
            requiredFields: "Please complete all required fields.",
            invalidName: "Full name must contain 3 to 50 characters.",
            invalidEmail: "Please enter a valid email address.",
            invalidPhone: "Phone number must start with 05 and contain 10 digits.",
            invalidGender: "Please select a gender.",
            invalidPassword: "Password must contain at least 6 characters.",
            emailExists: "This email address is already registered.",
            phoneExists: "This phone number is already registered.",
            serverError: "Unable to create your account. Please try again.",
            registering: "Creating your account...",
            showPassword: "Show password",
            hidePassword: "Hide password",
            privacyNoticeText: "I have read and understood how my data is processed under the",
            privacyNoticeLink: "Privacy Policy",
            privacyRequired: "Please read and acknowledge the Privacy Policy.",
        }
    };

    function getLanguage() {
        return window.Mergab?.getLanguage?.() ||
            localStorage.getItem("mergab.lang") ||
            "ar";
    }

    function getText() {
        return translations[getLanguage() === "en" ? "en" : "ar"];
    }

    function translatePage() {
        const lang = getLanguage() === "en" ? "en" : "ar";
        const t = translations[lang];

        document.documentElement.lang = lang;
        document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
        document.title = t.pageTitle;

        document.querySelectorAll("[data-reg-t]").forEach(element => {
            const key = element.dataset.regT;

            if (!(key in t)) return;

            if (key === "showcaseTitle") {
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
        errorBox.scrollIntoView({
            behavior: "smooth",
            block: "nearest"
        });
    }

    function clearError() {
        errorBox.textContent = "";
        errorBox.hidden = true;
    }

    function setLoading(loading) {
        registerButton.disabled = loading;

        const buttonText = registerButton.querySelector(
            "[data-reg-t='registerButton']"
        );

        buttonText.textContent = loading
            ? getText().registering
            : getText().registerButton;
    }

    function validateForm() {
        const t = getText();
        const fullName = fullNameInput.value.trim();
        const email = emailInput.value.trim();
        const phoneNumber = phoneInput.value.trim();
        const password = passwordInput.value;
        const gender = form.querySelector(
            'input[name="gender"]:checked'
        )?.value;

        if (!fullName || !email || !phoneNumber || !password) {
            return t.requiredFields;
        }

        if (fullName.length < 3 || fullName.length > 50) {
            return t.invalidName;
        }

        if (!emailInput.validity.valid) {
            return t.invalidEmail;
        }

        if (!/^05\d{8}$/.test(phoneNumber)) {
            return t.invalidPhone;
        }

        if (!gender) {
            return t.invalidGender;
        }

        if (password.length < 6) {
            return t.invalidPassword;
        }
        if (!privacyInput.checked) {
            return t.privacyRequired;
        }

        return null;
    }

    function getServerError(message) {
        const t = getText();
        const normalized = String(message || "").toLowerCase();

        if (normalized.includes("email already exists")) {
            return t.emailExists;
        }

        if (normalized.includes("phone number already exists")) {
            return t.phoneExists;
        }

        return t.serverError;
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

    window.addEventListener(
        "mergab:languageChanged",
        translatePage
    );

    togglePassword.addEventListener("click", () => {
        const isVisible = passwordInput.type === "text";

        passwordInput.type = isVisible ? "password" : "text";

        const icon = togglePassword.querySelector(
            ".material-symbols-rounded"
        );

        icon.textContent = isVisible
            ? "visibility"
            : "visibility_off";

        translatePage();
    });

    form.addEventListener("submit", async event => {
        event.preventDefault();
        clearError();

        const validationError = validateForm();

        if (validationError) {
            showError(validationError);
            return;
        }

        const payload = {
            fullName: fullNameInput.value.trim(),
            email: emailInput.value.trim(),
            password: passwordInput.value,
            phoneNumber: phoneInput.value.trim(),
            gender: form.querySelector(
                'input[name="gender"]:checked'
            ).value,
            showPrayerTimes: prayerInput.checked,
            privacyAcknowledged: privacyInput.checked
        };

        setLoading(true);

        try {
            const response = await fetch(
                "/api/v1/visitor/register",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Accept: "application/json"
                    },
                    body: JSON.stringify(payload)
                }
            );

            if (!response.ok) {
                const errorBody = await response.json().catch(
                    () => ({})
                );

                const message =
                    errorBody.message ||
                    errorBody.error ||
                    "";

                throw new Error(message);
            }

            // Register endpoint returns a success message,
            // not an authentication token.
            const session = await MergabAuth.login(
                payload.email,
                payload.password
            );

            window.location.replace(
                MergabAuth.getHomePage(session.role)
            );

        } catch (error) {
            console.error("Registration failed:", error);
            showError(getServerError(error.message));
            setLoading(false);
        }
    });

    translatePage();
});
