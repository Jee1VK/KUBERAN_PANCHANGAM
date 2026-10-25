// ============================================================
//  js/app.js — Kuberan Panchangam Modular App Registry & Lifecycle
//  Coordinates ayanamsa.js, cities.js, familyStore.js,
//  muhurthaEngine.js, ephemeris.js, and exportUtils.js
// ============================================================

const KUBERAN_APP_MODULES = {
    version: '2.0.0',
    modules: [
        'ephemeris.js',
        'ayanamsa.js',
        'cities.js',
        'familyStore.js',
        'muhurthaEngine.js',
        'exportUtils.js'
    ],
    isReady() {
        return (
            typeof AYANAMSA_SYSTEMS !== 'undefined' &&
            typeof CITIES_DATABASE !== 'undefined' &&
            typeof getFamilyProfiles === 'undefined' === false &&
            typeof calculateTarabala === 'function' &&
            typeof shareToWhatsApp === 'function'
        );
    }
};

if (typeof window !== 'undefined') {
    window.KUBERAN_APP_MODULES = KUBERAN_APP_MODULES;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { KUBERAN_APP_MODULES };
}
