
document.addEventListener("DOMContentLoaded", () => {
    "use strict";

    const $ = id => document.getElementById(id);

    const loginForm = $("loginForm");
    const loginHeading = document.querySelector(".auth-heading");
    const registerPrompt = document.querySelector(".auth-register-prompt");

    const recovery = $("passwordRecovery");
    const forgotForm = $("forgotPasswordForm");
    const resetForm = $("resetPasswordForm");
    const emailInput = $("recoveryEmail");
    const codeInput = $("recoveryCode");
    const passwordInput = $("recoveryNewPassword");

    const notice = $("recoveryNotice");
    const errorBox = $("recoveryError");
    const successBox = $("resetSuccess");

    const translations = {
        ar: {
            forgotLink: "نسيت كلمة المرور؟",
            title: "استعادة كلمة المرور",
            intro: "أدخلي بريدك الإلكتروني لإرسال رمز التحقق.",
            email: "البريد الإلكتروني",
            send: "إرسال رمز التحقق",
            code: "رمز التحقق",
            newPassword: "كلمة المرور الجديدة",
            reset: "تغيير كلمة المرور",
            back: "العودة لتسجيل الدخول",
            invalidEmail: "أدخلي بريدًا إلكترونيًا صحيحًا.",
            invalidCode: "رمز التحقق يجب أن يكون 6 أرقام.",
            invalidPassword: "كلمة المرور يجب ألا تقل عن 6 أحرف.",
            sent: "إذا كان البريد مسجلًا، فقد أُرسل رمز التحقق. افحصي بريدك وأدخلي الرمز خلال 10 دقائق.",
            changed: "تم تغيير كلمة المرور بنجاح. سجّلي دخولك بالكلمة الجديدة.",
            wrongCode: "الرمز غير صحيح أو منتهي الصلاحية. تأكدي منه أو اطلبي رمزًا جديدًا.",
            failed: "تعذر إكمال الطلب. حاولي مرة أخرى."
        },
        en: {
            forgotLink: "Forgot password?",
            title: "Reset Password",
            intro: "Enter your email to receive a verification code.",
            email: "Email Address",
            send: "Send Verification Code",
            code: "Verification Code",
            newPassword: "New Password",
            reset: "Change Password",
            back: "Back to Sign In",
            invalidEmail: "Enter a valid email address.",
            invalidCode: "The code must contain 6 digits.",
            invalidPassword: "Password must have at least 6 characters.",
            sent: "If this email is registered, a code has been sent. Check your inbox and enter it within 10 minutes.",
            changed: "Password changed successfully. Sign in with your new password.",
            wrongCode: "Invalid or expired code. Check it or request a new one.",
            failed: "Unable to complete the request. Please try again."
        }
    };

    function t() {
        const language = window.Mergab?.getLanguage?.() ||
            localStorage.getItem("mergab.lang") || "ar";

        return translations[language === "en" ? "en" : "ar"];
    }

    function translate() {
        const strings = t();

        document.querySelectorAll("[data-reset-t]").forEach(element => {
            element.textContent = strings[element.dataset.resetT];
        });
    }

    window.addEventListener("mergab:languageChanged", translate);

    function message(text, isError = false) {
        notice.hidden = isError || !text;
        errorBox.hidden = !isError || !text;

        notice.textContent = isError ? "" : text;
        errorBox.textContent = isError ? text : "";
    }

    function showLogin() {
        recovery.hidden = true;
        loginForm.hidden = false;
        loginHeading.hidden = false;
        registerPrompt.hidden = false;
    }

    $("forgotPasswordLink").addEventListener("click", () => {
        loginForm.hidden = true;
        loginHeading.hidden = true;
        registerPrompt.hidden = true;
        successBox.hidden = true;

        recovery.hidden = false;
        forgotForm.hidden = false;
        resetForm.hidden = true;

        emailInput.value = $("email").value.trim();
        codeInput.value = "";
        passwordInput.value = "";

        message("");
        emailInput.focus();
    });

    $("backToLogin").addEventListener("click", showLogin);

    forgotForm.addEventListener("submit", async event => {
        event.preventDefault();

        const email = emailInput.value.trim();

        if (!emailInput.validity.valid || !email) {
            message(t().invalidEmail, true);
            return;
        }

        const button = $("sendCodeButton");
        button.disabled = true;
        message("");

        try {
            const response = await fetch("/api/v1/auth/forgot-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email })
            });

            if (!response.ok) throw new Error("SEND_FAILED");

            forgotForm.hidden = true;
            resetForm.hidden = false;
            message(t().sent);
            codeInput.focus();

        } catch (error) {
            message(t().failed, true);
        } finally {
            button.disabled = false;
        }
    });

    resetForm.addEventListener("submit", async event => {
        event.preventDefault();

        const code = codeInput.value.trim();
        const newPassword = passwordInput.value;

        if (!/^[0-9]{6}$/.test(code)) {
            message(t().invalidCode, true);
            return;
        }

        if (newPassword.length < 6) {
            message(t().invalidPassword, true);
            return;
        }

        const button = $("resetPasswordButton");
        button.disabled = true;
        message("");

        try {
            const response = await fetch("/api/v1/auth/reset-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email: emailInput.value.trim(),
                    code,
                    newPassword
                })
            });

            if (!response.ok) {
                throw new Error(response.status < 500
                    ? "INVALID_CODE" : "SERVER_ERROR");
            }

            $("email").value = emailInput.value.trim();
            $("password").value = "";

            showLogin();
            successBox.textContent = t().changed;
            successBox.hidden = false;

        } catch (error) {
            message(
                error.message === "INVALID_CODE"
                    ? t().wrongCode
                    : t().failed,
                true
            );
        } finally {
            button.disabled = false;
        }
    });

    translate();
});
