// ============================================================
//  js/ephemeris.js — Drik Ganita & Ephemeris Bridge Module
//  Provides modular access to the astronomical calculations
//  powered by Astronomy Engine (VSOP87 / Moshier-class precision)
// ============================================================

const EPHEMERIS_INFO = {
    engine: 'Drik Ganita (VSOP87 / Moshier Ephemeris)',
    version: '2.0.0',
    precisionArcsec: 0.001,
    defaultAyanamsa: 'LAHIRI'
};

function getEphemerisStatus() {
    return {
        ...EPHEMERIS_INFO,
        activeAyanamsa: (typeof getActiveAyanamsaId === 'function') ? getActiveAyanamsaId() : 'LAHIRI',
        astronomyLoaded: typeof Astronomy !== 'undefined'
    };
}

if (typeof window !== 'undefined') {
    window.EPHEMERIS_INFO = EPHEMERIS_INFO;
    window.getEphemerisStatus = getEphemerisStatus;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { EPHEMERIS_INFO, getEphemerisStatus };
}
