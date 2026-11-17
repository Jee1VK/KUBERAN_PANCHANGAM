/**
 * @fileoverview js/ayanamsa.js — True Chitrapaksha (Lahiri) & Multi-System Ayanamsa Engine
 *
 * Implements the Indian Astronomical Ephemeris (Rashtriya Panchang) standard
 * True Chitrapaksha (Lahiri) Ayanamsa alongside KP Newcomb, B.V. Raman, and
 * Pushya Paksha systems.
 *
 * Mathematical Formulation (IAU 2006 General Precession + Nutation):
 * ------------------------------------------------------------------
 * Let T = (JD - 2451545.0) / 36525.0 be Julian centuries from J2000.0.
 * The general precession in longitude (arcseconds) per IAU 2006 (Capitaine et al.):
 *   psi_A(T) = 5028.796195" * T + 1.1054348" * T^2
 *              + 0.00007964" * T^3 - 0.000023857" * T^4
 *
 * True Chitrapaksha Ayanamsa cancels the nutation in longitude (Delta_psi)
 * present in apparent tropical longitudes:
 *   Ayanamsa_True(JD) = 23.857092° + psi_A(T) / 3600 + Delta_psi(JD)
 * where 23°51'25.532" (23.857092°) is the J2000.0 Chitrapaksha epoch offset
 * anchoring Spica (Alpha Virginis / Chitra) at 180°00'00" sidereal longitude.
 */

const CHITRAPAKSHA_J2000_DEG = 23.857092; // 23° 51' 25.532"

/**
 * Compute the IAU 2006 general precession in longitude (in degrees) for Julian Day `jd`.
 * @param {number} jd - Julian Ephemeris Day (JDE / JD_UT).
 * @returns {number} Precession offset from J2000.0 in degrees.
 */
function computeIAU2006PrecessionDeg(jd) {
    const T = (jd - 2451545.0) / 36525.0;
    const psiArcsec = 5028.796195 * T
        + 1.1054348 * T * T
        + 0.00007964 * T * T * T
        - 0.000023857 * T * T * T * T;
    return psiArcsec / 3600.0;
}

/**
 * Compute True Chitrapaksha (Lahiri) Ayanamsa at Julian Day `jd`, including
 * nutation in longitude when `Astronomy` is available or `nutationDeg` is supplied.
 * @param {number} jd - Julian Day.
 * @param {number} [nutationDeg] - Optional explicit nutation in longitude (degrees).
 * @returns {number} True Chitrapaksha Ayanamsa in degrees.
 */
function getTrueChitrapakshaAyanamsaJD(jd, nutationDeg) {
    let dpsiDeg = 0;
    if (typeof nutationDeg === 'number' && !isNaN(nutationDeg)) {
        dpsiDeg = nutationDeg;
    } else if (typeof Astronomy !== 'undefined' && typeof Astronomy.e_tilt === 'function') {
        const t = new Astronomy.AstroTime(jd - 2451545.0);
        dpsiDeg = Astronomy.e_tilt(t).dpsi / 3600.0;
    }
    return CHITRAPAKSHA_J2000_DEG + computeIAU2006PrecessionDeg(jd) + dpsiDeg;
}

const AYANAMSA_SYSTEMS = {
    LAHIRI: {
        id: 'LAHIRI',
        name: 'Lahiri (Chitrapaksha)',
        nameKn: 'ಲಹಿರಿ (ಚಿತ್ರಪಕ್ಷ)',
        desc: 'Standard Rashtriya Panchang & South Indian True Chitrapaksha Drik system',
        getBaseOffset: (year) => 23.85 + (year - 2000) * 0.01396,
        getPreciseOffsetJD: (jd, nutationDeg) => getTrueChitrapakshaAyanamsaJD(jd, nutationDeg)
    },
    KP: {
        id: 'KP',
        name: 'KP Newcomb (Krishnamurti)',
        nameKn: 'ಕೆ.ಪಿ. ನ್ಯೂಕಂಬ್ (ಕೃಷ್ಣಮೂರ್ತಿ ಪದ್ಧತಿ)',
        desc: 'Krishnamurti Paddhati system (~6 arcmin from Lahiri)',
        getBaseOffset: (year) => 23.78 + (year - 2000) * 0.01398,
        getPreciseOffsetJD: (jd, nutationDeg) => getTrueChitrapakshaAyanamsaJD(jd, nutationDeg) - 0.07
    },
    RAMAN: {
        id: 'RAMAN',
        name: 'B.V. Raman',
        nameKn: 'ಬಿ.ವಿ. ರಾಮನ್ ಪದ್ಧತಿ',
        desc: 'Traditional B.V. Raman almanac offset (~1.4° less than Lahiri)',
        getBaseOffset: (year) => 22.45 + (year - 2000) * 0.01395,
        getPreciseOffsetJD: (jd, nutationDeg) => getTrueChitrapakshaAyanamsaJD(jd, nutationDeg) - 1.40
    },
    PUSHYA: {
        id: 'PUSHYA',
        name: 'Pushya Paksha',
        nameKn: 'ಪುಷ್ಯ ಪಕ್ಷ ಅಯನಾಂಶ',
        desc: 'Classical Pushya-anchored sidereal zodiac (δ Cancri)',
        getBaseOffset: (year) => 22.75 + (year - 2000) * 0.01396,
        getPreciseOffsetJD: (jd, nutationDeg) => getTrueChitrapakshaAyanamsaJD(jd, nutationDeg) - 1.10
    }
};

/**
 * Convert tropical ecliptic longitude to sidereal longitude using calendar year offset.
 * @param {number} tropicalLong - Apparent tropical longitude in degrees [0, 360).
 * @param {number} year - Gregorian year (e.g., 2026).
 * @param {string} [systemId='LAHIRI'] - Ayanamsa system ID.
 * @returns {{ sidereal: number, ayanamsa: number }}
 */
function getSiderealLongitude(tropicalLong, year, systemId = 'LAHIRI') {
    const system = AYANAMSA_SYSTEMS[systemId] || AYANAMSA_SYSTEMS.LAHIRI;
    const ayanamsa = system.getBaseOffset(year);
    let sidereal = (tropicalLong - ayanamsa) % 360;
    if (sidereal < 0) sidereal += 360;
    return { sidereal, ayanamsa };
}

/**
 * Convert tropical ecliptic longitude to sidereal longitude at an exact Julian Day
 * using the IAU 2006 precession + nutation True Ayanamsa model.
 * @param {number} tropicalLong - Apparent tropical longitude in degrees [0, 360).
 * @param {number} jd - Julian Day.
 * @param {string} [systemId='LAHIRI'] - Ayanamsa system ID.
 * @param {number} [nutationDeg] - Optional nutation in longitude (degrees).
 * @returns {{ sidereal: number, ayanamsa: number }}
 */
function getSiderealLongitudeJD(tropicalLong, jd, systemId = 'LAHIRI', nutationDeg) {
    const system = AYANAMSA_SYSTEMS[systemId] || AYANAMSA_SYSTEMS.LAHIRI;
    const ayanamsa = system.getPreciseOffsetJD(jd, nutationDeg);
    let sidereal = ((tropicalLong - ayanamsa) % 360 + 360) % 360;
    return { sidereal, ayanamsa };
}

/**
 * Retrieve the currently active Ayanamsa system ID from localStorage (defaults to 'LAHIRI').
 * @returns {string} Active Ayanamsa system ID.
 */
function getActiveAyanamsaId() {
    try {
        if (typeof localStorage !== 'undefined') {
            const saved = localStorage.getItem('kuberan_ayanamsa_system');
            if (saved && AYANAMSA_SYSTEMS[saved]) return saved;
        }
    } catch (e) {}
    return 'LAHIRI';
}

/**
 * Persist the selected Ayanamsa system ID in localStorage.
 * @param {string} systemId - System identifier ('LAHIRI', 'KP', 'RAMAN', 'PUSHYA').
 * @returns {string} Validated system ID.
 */
function setActiveAyanamsaId(systemId) {
    const validId = AYANAMSA_SYSTEMS[systemId] ? systemId : 'LAHIRI';
    try {
        if (typeof localStorage !== 'undefined') {
            localStorage.setItem('kuberan_ayanamsa_system', validId);
        }
    } catch (e) {}
    return validId;
}

if (typeof window !== 'undefined') {
    window.CHITRAPAKSHA_J2000_DEG = CHITRAPAKSHA_J2000_DEG;
    window.computeIAU2006PrecessionDeg = computeIAU2006PrecessionDeg;
    window.getTrueChitrapakshaAyanamsaJD = getTrueChitrapakshaAyanamsaJD;
    window.AYANAMSA_SYSTEMS = AYANAMSA_SYSTEMS;
    window.getSiderealLongitude = getSiderealLongitude;
    window.getSiderealLongitudeJD = getSiderealLongitudeJD;
    window.getActiveAyanamsaId = getActiveAyanamsaId;
    window.setActiveAyanamsaId = setActiveAyanamsaId;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        CHITRAPAKSHA_J2000_DEG,
        computeIAU2006PrecessionDeg,
        getTrueChitrapakshaAyanamsaJD,
        AYANAMSA_SYSTEMS,
        getSiderealLongitude,
        getSiderealLongitudeJD,
        getActiveAyanamsaId,
        setActiveAyanamsaId
    };
}
