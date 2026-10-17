
/* Mergab — Shared Event Images */

window.MergabEventImages = (() => {
    "use strict";

    const images = {
        technology:
            "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=900&q=80&fit=crop",

        culture:
            "https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?w=900&q=80&fit=crop",

        performance:
            "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=900&q=80&fit=crop",

        workshop:
            "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=900&q=80&fit=crop",

        family:
            "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=900&q=80&fit=crop",

        exhibition:
            "https://images.unsplash.com/photo-1531058020387-3be344556be6?w=900&q=80&fit=crop"
    };

    // Later: assign an exact image to each event name here.
    const eventImages = {
        // "اسم الفعالية": images.technology,
    };

    function getImage(event) {
        const name = String(event?.name || "").trim();
        const value = name.toLowerCase();

        if (eventImages[name]) {
            return eventImages[name];
        }

        if (/تقني|ابتكار|روبوت|ذكاء|technology|innovation|ai/i.test(value))
            return images.technology;

        if (/ثقاف|تراث|حضار|culture|heritage/i.test(value))
            return images.culture;

        if (/موسيق|مسرح|عرض حي|حفلة|concert|music|show/i.test(value))
            return images.performance;

        if (/ورشة|تدريب|تعليم|workshop|training/i.test(value))
            return images.workshop;

        if (/عائل|أطفال|طفل|family|kids|children/i.test(value))
            return images.family;

        if (/معرض|فنون|فني|exhibition|art/i.test(value))
            return images.exhibition;

        // Stable variation for events without matching keywords.
        const keys = Object.keys(images);
        let hash = 0;

        for (const char of name) {
            hash = (hash * 31 + char.codePointAt(0)) >>> 0;
        }

        return images[keys[hash % keys.length]];
    }

    function getStyle(event) {
        return `
            background-image:
                linear-gradient(
                    180deg,
                    rgba(10,44,36,.05),
                    rgba(10,44,36,.3)
                ),
            url('${getImage(event)}');
            background-color: #286451;
        `;
    }

    return { getImage, getStyle };
})();
