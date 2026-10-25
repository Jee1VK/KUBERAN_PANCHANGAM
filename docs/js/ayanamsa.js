// ============================================================
//  js/ayanamsa.js — Ayanamsa & Coordinate Calculation Engine
//  Supports Lahiri (Chitrapaksha), KP Newcomb, B.V. Raman,
//  and Pushya Paksha Ayanamsa systems.
// ============================================================

const AYANAMSA_SYSTEMS = {
    LAHIRI: {
        id: 'LAHIRI',
        name: 'Lahiri (Chitrapaksha)',
        nameKn: 'ಲಹಿರಿ (ಚಿತ್ರಪಕ್ಷ)',
        desc: 'Standard Rashtriya Panchang & South Indian Drik system',
        getBaseOffset: (year) => 23.85 + (year - 2000) * 0.01396,
        getPreciseOffsetJD: (jd) => {
            const T = (jd - 2451545.0) / 36525.0;
            return 23.853056 + T * (5028.796195 / 3600.0);
        }
    },
    KP: {
        id: 'KP',
        name: 'KP Newcomb (Krishnamurti)',
        nameKn: 'ಕೆ.ಪಿ. ನ್ಯೂಕಂಬ್ (ಕೃಷ್ಣಮೂರ್ತಿ ಪದ್ಧತಿ)',
        desc: 'Krishnamurti Paddhati system (~6 arcmin from Lahiri)',
        getBaseOffset: (year) => 23.78 + (year - 2000) * 0.01398,
        getPreciseOffsetJD: (jd) => {
            const year = 2000.0 + (jd - 2451545.0) / 365.25;
            return 23.78 + (year - 2000) * 0.01398;
        }
    },
    RAMAN: {
        id: 'RAMAN',
        name: 'B.V. Raman',
        nameKn: 'ಬಿ.ವಿ. ರಾಮನ್ ಪದ್ಧತಿ',
        desc: 'Traditional B.V. Raman almanac offset (~1.4° less than Lahiri)',
        getBaseOffset: (year) => 22.45 + (year - 2000) * 0.01395,
        getPreciseOffsetJD: (jd) => {
            const year = 2000.0 + (jd - 2451545.0) / 365.25;
            return 22.45 + (year - 2000) * 0.01395;
        }
    },
    PUSHYA: {
        id: 'PUSHYA',
        name: 'Pushya Paksha',
        nameKn: 'ಪುಷ್ಯ ಪಕ್ಷ ಅಯನಾಂಶ',
        desc: 'Classical Pushya-anchored sidereal zodiac (δ Cancri)',
        getBaseOffset: (year) => 22.75 + (year - 2000) * 0.01396,
        getPreciseOffsetJD: (jd) => {
            const year = 2000.0 + (jd - 2451545.0) / 365.25;
            return 22.75 + (year - 2000) * 0.01396;
        }
    }
};

function getSiderealLongitude(tropicalLong, year, systemId = 'LAHIRI') {
    const system = AYANAMSA_SYSTEMS[systemId] || AYANAMSA_SYSTEMS.LAHIRI;
    const ayanamsa = system.getBaseOffset(year);
    let sidereal = tropicalLong - ayanamsa;
    while (sidereal < 0) sidereal += 360;
    while (sidereal >= 360) sidereal -= 360;
    return { sidereal, ayanamsa };
}

function getActiveAyanamsaId() {
    try {
        if (typeof localStorage !== 'undefined') {
            const saved = localStorage.getItem('kuberan_ayanamsa_system');
            if (saved && AYANAMSA_SYSTEMS[saved]) return saved;
        }
    } catch (e) {}
    return 'LAHIRI';
}

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
    window.AYANAMSA_SYSTEMS = AYANAMSA_SYSTEMS;
    window.getSiderealLongitude = getSiderealLongitude;
    window.getActiveAyanamsaId = getActiveAyanamsaId;
    window.setActiveAyanamsaId = setActiveAyanamsaId;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        AYANAMSA_SYSTEMS,
        getSiderealLongitude,
        getActiveAyanamsaId,
        setActiveAyanamsaId
    };
}
