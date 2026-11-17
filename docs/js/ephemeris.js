/**
 * @fileoverview js/ephemeris.js — High-Precision Drik Ganita Ephemeris, Continuous Root-Finding,
 * Timezone/Coordinate Hardening & In-Memory Memoization Engine
 *
 * Mathematical Formulations:
 * --------------------------
 * 1. Continuous Root-Finding for Tithi / Nakshatra / Yoga / Karana Transitions:
 *    Let E(t) = (lambda_Moon(t) - lambda_Sun(t)) mod 360° be the lunar-solar synodic
 *    elongation at Julian Day t. Each Tithi spans Delta_theta = 12°.
 *    To locate the exact transition time t_k where E(t_k) = 12° * k:
 *    - Step 1 (Bracketing): Advance from t_0 in steps h = 0.04 days (~57.6 min) until
 *      the wrapped signed angular residual
 *          r(t) = ((E(t) - theta_target + 540°) mod 360°) - 180°
 *      crosses zero (r(t_lo) < 0 <= r(t_hi)).
 *    - Step 2 (Binary Search / Bisection): Perform 26 iterations of bisection on [t_lo, t_hi],
 *      narrowing the interval to 0.04 / 2^26 ≈ 5.96e-10 days (~0.05 milliseconds).
 *
 * 2. Kshaya Tithi & Adhika (Vriddhi) Tithi Detection:
 *    Let t_rise,0 and t_rise,1 be consecutive local sunrises for a given geographic location:
 *    - Adhika (Vriddhi) Tithi: A single Tithi whose start and end bracket TWO consecutive
 *      sunrises (t_start <= t_rise,0 and t_end >= t_rise,1).
 *    - Kshaya (Lupta) Tithi: When the sunrise Tithi T_1 ends at t_end,1 < t_rise,1 AND
 *      the subsequent Tithi T_2 = (T_1 mod 30) + 1 ALSO ends at t_end,2 < t_rise,1,
 *      then T_2 begins and ends strictly between two consecutive sunrises without
 *      touching either sunrise.
 *
 * 3. Coordinate Validation & Dynamic IANA Timezone Resolution:
 *    - Validates lat in [-90, +90] and lon in [-180, +180], falling back to Bengaluru
 *      (12.9716° N, 77.5946° E) when inputs are NaN, null, or out of bounds.
 *    - Resolves the IANA timezone dynamically from (lat, lon) via offline city proximity
 *      and geographic bounding boxes, and computes exact historical/DST UTC offsets via
 *      `Intl.DateTimeFormat`.
 *
 * 4. In-Memory Calculation Caching Layer:
 *    - Memoizes expensive astronomical computations keyed by `(JulianDay, Latitude, Longitude)`
 *      and active Ayanamsa ID to eliminate duplicate computations across UI tab switches.
 */

const EPHEMERIS_INFO = {
    engine: 'Drik Ganita (Swiss Ephemeris / VSOP87 / Moshier Analytical Series)',
    version: '2.1.0',
    precisionArcsec: 0.001,
    boundaryPrecisionMs: 0.1,
    defaultAyanamsa: 'LAHIRI'
};

/**
 * Fallback coordinate set (Bengaluru, Karnataka, India).
 * @constant {{ lat: number, lon: number, tz: string, name: string }}
 */
const DEFAULT_COORDINATES = Object.freeze({
    lat: 12.9716,
    lon: 77.5946,
    tz: 'Asia/Kolkata',
    name: 'Bengaluru, Karnataka'
});

/**
 * Validate geographic coordinates within [-90, +90] latitude and [-180, +180] longitude.
 * Falls back to Bengaluru (12.9716° N, 77.5946° E) if invalid or out of range.
 *
 * @param {number|string|null|undefined} lat - Latitude in decimal degrees.
 * @param {number|string|null|undefined} lon - Longitude in decimal degrees.
 * @returns {{ lat: number, lon: number, valid: boolean, fallbackUsed: boolean }}
 */
function validateCoordinates(lat, lon) {
    const numLat = typeof lat === 'number' ? lat : parseFloat(String(lat));
    const numLon = typeof lon === 'number' ? lon : parseFloat(String(lon));

    const isLatValid = Number.isFinite(numLat) && numLat >= -90.0 && numLat <= 90.0;
    const isLonValid = Number.isFinite(numLon) && numLon >= -180.0 && numLon <= 180.0;

    if (isLatValid && isLonValid) {
        return { lat: numLat, lon: numLon, valid: true, fallbackUsed: false };
    }
    return {
        lat: DEFAULT_COORDINATES.lat,
        lon: DEFAULT_COORDINATES.lon,
        valid: false,
        fallbackUsed: true
    };
}

/**
 * Verify whether a string is a valid IANA timezone identifier supported by `Intl.DateTimeFormat`.
 * @param {string} tz - Candidate timezone identifier.
 * @returns {boolean}
 */
function isValidIANATimezone(tz) {
    if (!tz || typeof tz !== 'string') return false;
    try {
        Intl.DateTimeFormat(undefined, { timeZone: tz.trim() });
        return true;
    } catch (e) {
        return false;
    }
}

/**
 * Dynamically resolve an IANA timezone identifier from (latitude, longitude) coordinates.
 * Checks explicit valid IANA strings first, then nearest city in `CITIES_DATABASE`,
 * then geographic bounding boxes for South Asia and global regions.
 *
 * @param {number} lat - Latitude in decimal degrees.
 * @param {number} lon - Longitude in decimal degrees.
 * @param {string} [explicitTz] - Optional user-supplied IANA timezone string.
 * @returns {string} Resolved IANA timezone name (e.g., 'Asia/Kolkata', 'America/New_York').
 */
function resolveTimezoneFromCoords(lat, lon, explicitTz) {
    if (explicitTz && typeof explicitTz === 'string') {
        const trimmed = explicitTz.trim();
        if (isValidIANATimezone(trimmed)) {
            return trimmed;
        }
    }

    const { lat: vLat, lon: vLon } = validateCoordinates(lat, lon);

    // 1. Check proximity against CITIES_DATABASE if loaded
    const cities = (typeof CITIES_DATABASE !== 'undefined' && Array.isArray(CITIES_DATABASE))
        ? CITIES_DATABASE
        : [];
    let bestCity = null;
    let bestDistSq = Infinity;
    for (let i = 0; i < cities.length; i++) {
        const c = cities[i];
        if (c && c.tzName) {
            const dLat = vLat - c.lat;
            const dLon = vLon - c.lon;
            const distSq = dLat * dLat + dLon * dLon;
            if (distSq < bestDistSq) {
                bestDistSq = distSq;
                bestCity = c;
            }
        }
    }
    if (bestCity && bestDistSq <= 9.0 && isValidIANATimezone(bestCity.tzName)) {
        return bestCity.tzName;
    }

    // 2. Geographic bounding regions
    // India & surrounding South Asia
    if (vLat >= 6.0 && vLat <= 37.5 && vLon >= 68.0 && vLon <= 97.5) {
        if (vLat >= 26.3 && vLat <= 30.5 && vLon >= 80.0 && vLon <= 88.2 && vLat > 27.2) {
            return 'Asia/Kathmandu';
        }
        if (vLat >= 5.8 && vLat <= 9.9 && vLon >= 79.5 && vLon <= 82.0) {
            return 'Asia/Colombo';
        }
        if (vLat >= 20.5 && vLat <= 26.7 && vLon >= 88.0 && vLon <= 92.7) {
            return 'Asia/Dhaka';
        }
        return 'Asia/Kolkata';
    }
    // UAE / Gulf
    if (vLat >= 22.0 && vLat <= 26.5 && vLon >= 51.0 && vLon <= 56.5) return 'Asia/Dubai';
    // Singapore / Malaysia
    if (vLat >= 1.0 && vLat <= 7.0 && vLon >= 100.0 && vLon <= 104.5) return 'Asia/Singapore';
    // Japan
    if (vLat >= 30.0 && vLat <= 45.6 && vLon >= 129.0 && vLon <= 146.0) return 'Asia/Tokyo';
    // United Kingdom & Ireland
    if (vLat >= 49.8 && vLat <= 60.9 && vLon >= -10.5 && vLon <= 1.8) return 'Europe/London';
    // Central / Western Europe
    if (vLat >= 36.0 && vLat <= 55.0 && vLon > 1.8 && vLon <= 25.0) return 'Europe/Berlin';
    // North America (USA & Canada)
    if (vLat >= 24.0 && vLat <= 60.0 && vLon >= -130.0 && vLon <= -60.0) {
        if (vLon >= -85.0) return 'America/New_York';
        if (vLon >= -102.0) return 'America/Chicago';
        if (vLon >= -115.0) return 'America/Denver';
        return 'America/Los_Angeles';
    }
    // Australia
    if (vLat >= -44.0 && vLat <= -10.0 && vLon >= 113.0 && vLon <= 154.0) {
        if (vLon < 129.0) return 'Australia/Perth';
        if (vLon < 141.0) return 'Australia/Adelaide';
        return 'Australia/Sydney';
    }

    // 3. Longitude-based solar timezone fallback (Etc/GMT)
    const approxHours = Math.round(vLon / 15.0);
    if (approxHours === 0) return 'UTC';
    const etcZone = `Etc/GMT${approxHours > 0 ? '-' + approxHours : '+' + Math.abs(approxHours)}`;
    if (isValidIANATimezone(etcZone)) return etcZone;

    return DEFAULT_COORDINATES.tz;
}

const _dynamicTzOffsetCache = new Map();

/**
 * Compute the exact UTC offset in fractional hours for an IANA timezone at a given
 * Gregorian date (handling DST transitions and half/quarter-hour offsets).
 *
 * @param {string|number} tzNameOrOffset - IANA timezone name or numeric offset in hours.
 * @param {number} [targetYear] - Year.
 * @param {number} [targetMonth] - Month (1–12).
 * @param {number} [targetDay] - Day of month (1–31).
 * @param {number} [lat] - Optional latitude for coordinate fallback resolution.
 * @param {number} [lon] - Optional longitude for coordinate fallback resolution.
 * @returns {number} UTC offset in fractional hours (e.g., 5.5 for Asia/Kolkata, -5 or -4 for America/New_York).
 */
function getDynamicTzOffsetHours(tzNameOrOffset, targetYear, targetMonth, targetDay, lat, lon) {
    if (typeof tzNameOrOffset === 'number' && Number.isFinite(tzNameOrOffset)) {
        return tzNameOrOffset;
    }
    const resolvedTz = resolveTimezoneFromCoords(
        lat !== undefined ? lat : DEFAULT_COORDINATES.lat,
        lon !== undefined ? lon : DEFAULT_COORDINATES.lon,
        typeof tzNameOrOffset === 'string' ? tzNameOrOffset : undefined
    );

    const cacheKey = `${resolvedTz}-${targetYear || 0}-${targetMonth || 0}-${targetDay || 0}`;
    if (_dynamicTzOffsetCache.has(cacheKey)) {
        return _dynamicTzOffsetCache.get(cacheKey);
    }

    try {
        const refDate = (targetYear && targetMonth && targetDay)
            ? new Date(Date.UTC(targetYear, targetMonth - 1, targetDay, 12, 0, 0))
            : new Date();
        const utcStr = refDate.toLocaleString('en-US', { timeZone: 'UTC' });
        const localStr = refDate.toLocaleString('en-US', { timeZone: resolvedTz });
        const offsetHours = (new Date(localStr) - new Date(utcStr)) / 3600000;
        if (Number.isFinite(offsetHours)) {
            _dynamicTzOffsetCache.set(cacheKey, offsetHours);
            return offsetHours;
        }
    } catch (e) {}

    // Fallback: estimate from longitude if available
    if (Number.isFinite(lon)) {
        return Math.round((lon / 15.0) * 2) / 2;
    }
    return 5.5;
}

/**
 * Continuous root-finding via bracketed binary search over Julian Ephemeris Day (JDE).
 * Finds the exact transition moment when `angleFn(jd)` crosses a multiple of `unitDeg`.
 *
 * @param {number} jdStart - Starting Julian Day.
 * @param {function(number): number} angleFn - Function returning angle in [0, 360) at JD.
 * @param {number} unitDeg - Angular step size in degrees (e.g., 12 for Tithi, 360/27 for Nakshatra, 6 for Karana).
 * @param {number} [direction=1] - +1 to find next boundary (end time), -1 to find previous boundary (start time).
 * @param {number} [iterations=26] - Number of binary search iterations (26 iterations -> ~0.05 ms precision).
 * @returns {number} Exact Julian Day of the transition.
 */
function findExactBoundaryJD(jdStart, angleFn, unitDeg, direction = 1, iterations = 26) {
    const cur = angleFn(jdStart);
    const target = direction >= 0
        ? ((Math.floor(cur / unitDeg) + 1) * unitDeg) % 360
        : ((Math.floor(cur / unitDeg) * unitDeg) % 360 + 360) % 360;

    const maxSpan = (unitDeg <= 6) ? 0.8 : (unitDeg <= 12 ? 1.4 : 1.6);
    const step = 0.04;

    let lo = jdStart;
    let hi = jdStart;

    if (direction >= 0) {
        hi = lo + step;
        while (hi - jdStart < maxSpan) {
            const diffLo = ((angleFn(lo) - target + 540) % 360) - 180;
            const diffHi = ((angleFn(hi) - target + 540) % 360) - 180;
            if (diffLo < 0 && diffHi >= 0) break;
            lo = hi;
            hi = lo + step;
        }
    } else {
        lo = hi - step;
        while (jdStart - lo < maxSpan) {
            const diffLo = ((angleFn(lo) - target + 540) % 360) - 180;
            const diffHi = ((angleFn(hi) - target + 540) % 360) - 180;
            if (diffLo <= 0 && diffHi > 0) break;
            hi = lo;
            lo = hi - step;
        }
    }

    for (let i = 0; i < iterations; i++) {
        const mid = 0.5 * (lo + hi);
        const diff = ((angleFn(mid) - target + 540) % 360) - 180;
        if (diff >= 0) {
            hi = mid;
        } else {
            lo = mid;
        }
    }
    return 0.5 * (lo + hi);
}

/**
 * Analyze Tithi transitions across consecutive local sunrises `[riseJD, nextRiseJD)`
 * to detect **Adhika (Vriddhi) Tithi** and **Kshaya (Lupta) Tithi**.
 *
 * @param {number} riseJD - Today's local sunrise Julian Day.
 * @param {number} nextRiseJD - Tomorrow's local sunrise Julian Day.
 * @param {function(number): number} elongationFn - Function returning (Moon - Sun) mod 360° at JD.
 * @param {string[]} [tithiEnList] - English Tithi names (1..15).
 * @param {string[]} [tithiKnList] - Kannada Tithi names (1..15).
 * @returns {{
 *   sunriseTithiNo: number,
 *   startJD: number,
 *   endJD: number,
 *   isAdhika: boolean,
 *   isKshaya: boolean,
 *   kshayaTithi: null | { no: number, name: string, nameKn: string, paksha: string, pakshaKn: string, startJD: number, endJD: number }
 * }}
 */
function detectKshayaAndAdhikaTithi(riseJD, nextRiseJD, elongationFn, tithiEnList, tithiKnList) {
    const e0 = elongationFn(riseJD);
    const tithiNo = Math.floor(e0 / 12) + 1;
    const startJD = findExactBoundaryJD(riseJD, elongationFn, 12, -1);
    const endJD = findExactBoundaryJD(riseJD, elongationFn, 12, 1);

    // Adhika (Vriddhi) Tithi: starts at or before today's sunrise AND ends at or after tomorrow's sunrise
    const isAdhika = (startJD <= riseJD && endJD >= nextRiseJD);

    // Kshaya (Lupta) Tithi: sunrise Tithi ends before nextRiseJD, AND the subsequent Tithi ALSO ends before nextRiseJD
    let isKshaya = false;
    let kshayaTithi = null;

    if (endJD < nextRiseJD) {
        const secondEndJD = findExactBoundaryJD(endJD + 0.005, elongationFn, 12, 1);
        if (secondEndJD < nextRiseJD) {
            isKshaya = true;
            const kNo = (tithiNo % 30) + 1;
            const paksha = kNo <= 15 ? 'Shukla' : 'Krishna';
            const pakshaKn = kNo <= 15 ? 'ಶುಕ್ಲ ಪಕ್ಷ' : 'ಕೃಷ್ಣ ಪಕ್ಷ';
            let name = `Tithi ${kNo}`;
            let nameKn = `ತಿಥಿ ${kNo}`;
            if (kNo === 15) {
                name = 'Purnima';
                nameKn = 'ಹುಣ್ಣಿಮೆ';
            } else if (kNo === 30) {
                name = 'Amavasya';
                nameKn = 'ಅಮಾವಾಸ್ಯೆ';
            } else {
                const idx = (kNo - 1) % 15;
                if (Array.isArray(tithiEnList) && tithiEnList[idx]) name = tithiEnList[idx];
                if (Array.isArray(tithiKnList) && tithiKnList[idx]) nameKn = tithiKnList[idx];
            }
            kshayaTithi = {
                no: kNo,
                name,
                nameKn,
                paksha,
                pakshaKn,
                startJD: endJD,
                endJD: secondEndJD
            };
        }
    }

    return {
        sunriseTithiNo: tithiNo,
        startJD,
        endJD,
        isAdhika,
        isKshaya,
        kshayaTithi
    };
}

/**
 * In-Memory Calculation Caching / Memoization Layer keyed by `(JulianDay, Latitude, Longitude)`
 * and active Ayanamsa system ID. Avoids redundant trigonometric & ephemeris evaluations
 * across UI tab switches.
 */
const EphemerisCache = (() => {
    const _store = new Map();
    const MAX_ENTRIES = 4096;
    let _hits = 0;
    let _misses = 0;

    /**
     * Build a canonical cache key from `(category, jd, lat, lon, extra)`.
     * @param {string} category - Calculation namespace ('panchanga', 'grahas', 'lagnas', 'sunrise').
     * @param {number|string} jd - Julian Day or date token.
     * @param {number} [lat=12.9716] - Latitude.
     * @param {number} [lon=77.5946] - Longitude.
     * @param {string} [extra=''] - Optional discriminator (e.g., 'fast' or 'full').
     * @returns {string}
     */
    function makeKey(category, jd, lat = DEFAULT_COORDINATES.lat, lon = DEFAULT_COORDINATES.lon, extra = '') {
        const ayanId = (typeof getActiveAyanamsaId === 'function') ? getActiveAyanamsaId() : 'LAHIRI';
        const jdToken = typeof jd === 'number' ? jd.toFixed(6) : String(jd);
        const latToken = Number.isFinite(lat) ? Number(lat).toFixed(4) : '12.9716';
        const lonToken = Number.isFinite(lon) ? Number(lon).toFixed(4) : '77.5946';
        return `${category}|${jdToken}|${latToken}|${lonToken}|${ayanId}|${extra}`;
    }

    /**
     * Retrieve a cached computation or execute `computeFn` and store the result.
     * @template T
     * @param {string} category
     * @param {number|string} jd
     * @param {number} lat
     * @param {number} lon
     * @param {function(): T} computeFn
     * @param {string} [extra='']
     * @returns {T}
     */
    function getOrCompute(category, jd, lat, lon, computeFn, extra = '') {
        const key = makeKey(category, jd, lat, lon, extra);
        if (_store.has(key)) {
            _hits++;
            return _store.get(key);
        }
        _misses++;
        const val = computeFn();
        if (val !== undefined && val !== null) {
            if (_store.size >= MAX_ENTRIES) {
                const oldestKey = _store.keys().next().value;
                if (oldestKey !== undefined) _store.delete(oldestKey);
            }
            _store.set(key, val);
        }
        return val;
    }

    /**
     * Clear all memoized calculations (e.g. when user switches Ayanamsa).
     */
    function clear() {
        _store.clear();
        _hits = 0;
        _misses = 0;
    }

    /**
     * Return cache hit/miss telemetry.
     * @returns {{ size: number, hits: number, misses: number }}
     */
    function getStats() {
        return { size: _store.size, hits: _hits, misses: _misses };
    }

    return {
        makeKey,
        getOrCompute,
        clear,
        getStats
    };
})();

/**
 * Retrieve current Ephemeris engine status and cache diagnostics.
 * @returns {object}
 */
function getEphemerisStatus() {
    return {
        ...EPHEMERIS_INFO,
        activeAyanamsa: (typeof getActiveAyanamsaId === 'function') ? getActiveAyanamsaId() : 'LAHIRI',
        astronomyLoaded: typeof Astronomy !== 'undefined',
        cacheStats: EphemerisCache.getStats()
    };
}

if (typeof window !== 'undefined') {
    window.EPHEMERIS_INFO = EPHEMERIS_INFO;
    window.DEFAULT_COORDINATES = DEFAULT_COORDINATES;
    window.validateCoordinates = validateCoordinates;
    window.isValidIANATimezone = isValidIANATimezone;
    window.resolveTimezoneFromCoords = resolveTimezoneFromCoords;
    window.getDynamicTzOffsetHours = getDynamicTzOffsetHours;
    window.findExactBoundaryJD = findExactBoundaryJD;
    window.detectKshayaAndAdhikaTithi = detectKshayaAndAdhikaTithi;
    window.EphemerisCache = EphemerisCache;
    window.getEphemerisStatus = getEphemerisStatus;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        EPHEMERIS_INFO,
        DEFAULT_COORDINATES,
        validateCoordinates,
        isValidIANATimezone,
        resolveTimezoneFromCoords,
        getDynamicTzOffsetHours,
        findExactBoundaryJD,
        detectKshayaAndAdhikaTithi,
        EphemerisCache,
        getEphemerisStatus
    };
}
