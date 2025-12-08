const i18n = require('i18n');
const path = require('path');

// Configure i18n
i18n.configure({
    locales: ['en', 'hi'],
    directory: path.join(__dirname, '../locales'),
    defaultLocale: 'en',
    autoReload: false,
    updateFiles: false,
    objectNotation: true,
    api: {
        __: 't',
        __n: 'tn'
    }
});

// Initialize i18n
i18n.init();

/**
 * Get translation function for a specific locale
 * @param {string} locale - Locale code (e.g., 'en', 'hi')
 * @returns {Function} Translation function
 */
function getTranslator(locale = 'en') {
    // Validate locale, fallback to 'en' if invalid
    const validLocales = ['en', 'hi'];
    const validLocale = validLocales.includes(locale) ? locale : 'en';

    return (key, replacements = {}) => {
        i18n.setLocale(validLocale);
        return i18n.__(key, replacements);
    };
}

/**
 * Get locale from request (checks query param, then Accept-Language header)
 * @param {Object} request - Fastify request object
 * @returns {string} Locale code
 */
function getLocaleFromRequest(request) {
    // Check query parameter first
    if (request.query && request.query.locale) {
        return request.query.locale;
    }

    // Check Accept-Language header
    if (request.headers && request.headers['accept-language']) {
        const acceptLanguage = request.headers['accept-language'];
        // Simple parsing: check if 'hi' is in the header
        if (acceptLanguage.includes('hi')) {
            return 'hi';
        }
        // Default to 'en' if 'en' is present or no specific match
        if (acceptLanguage.includes('en')) {
            return 'en';
        }
    }

    // Default to English
    return 'en';
}

module.exports = {
    getTranslator,
    getLocaleFromRequest,
    i18n
};

