const Astronomy = require('../docs/js/astronomy.js');

function julianDay(y, m, d, h) {
    if (m <= 2) { y -= 1; m += 12; }
    const A = Math.floor(y / 100);
    const B = 2 - A + Math.floor(A / 4);
    return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + d + B - 1524.5 + (h / 24);
}

function lahiriAyanamsa(jd) {
    const T = (jd - 2451545.0) / 36525.0;
    return 23.85 + (50.29 / 3600.0) * (T * 100.0);
}

function sunLongitude(jd) {
    const t = new Astronomy.AstroTime(jd - 2451545.0);
    return Astronomy.SunPosition(t).elon;
}

function siderealSun(jd) { return ((sunLongitude(jd) - lahiriAyanamsa(jd)) % 360 + 360) % 360; }

function computeSunrise(year, month, day, lat, lon, tzOff) {
    const localMidnightJD = julianDay(year, month, day, 0) - ((tzOff || 5.5) / 24);
    const startTime = new Astronomy.AstroTime(localMidnightJD - 2451545.0);
    const obs = new Astronomy.Observer(lat, lon, 0);
    const rise = Astronomy.SearchRiseSet(Astronomy.Body.Sun, obs, 1, startTime, 1);
    const set = Astronomy.SearchRiseSet(Astronomy.Body.Sun, obs, -1, startTime, 1);
    const baseJD = julianDay(year, month, day, 0); 
    const riseJD = rise ? (rise.ut + 2451545.0) : (baseJD + 6/24);
    const setJD = set ? (set.ut + 2451545.0) : (baseJD + 18/24);
    return { rise: (riseJD - baseJD) * 24, set: (setJD - baseJD) * 24, riseJD, setJD };
}

const RASHI_EN = ["Mesha","Vrishabha","Mithuna","Karka","Simha","Kanya","Tula","Vrischika","Dhanus","Makara","Kumbha","Meena"];
const RASHI_KN = ["ಮೇಷ","ವೃಷಭ","ಮಿಥುನ","ಕರ್ಕಾಟಕ","ಸಿಂಹ","ಕನ್ಯಾ","ತುಲಾ","ವೃಶ್ಚಿಕ","ಧನುಸ್ಸು","ಮಕರ","ಕುಂಭ","ಮೀನ"];

// Test all 12 Sankrantis for 2026
const year = 2026;
let startJD = julianDay(year, 1, 1, 0);
let endJD = julianDay(year + 1, 1, 1, 0);

const sankrantisFound = [];
let prevSetJD = null;

let cur = new Date(Date.UTC(year, 0, 1));
const endDate = new Date(Date.UTC(year + 1, 0, 1));

while (cur < endDate) {
    const y = cur.getUTCFullYear();
    const m = cur.getUTCMonth() + 1;
    const d = cur.getUTCDate();
    const s = computeSunrise(y, m, d, 12.9716, 77.5946, 5.5);
    const todaySet = s.setJD;
    const yestSet = prevSetJD || (todaySet - 1.0);

    const rashi1 = Math.floor(siderealSun(yestSet) / 30);
    const rashi2 = Math.floor(siderealSun(todaySet) / 30);

    if (rashi1 !== rashi2) {
        // Find exact ingress moment by bisection
        let lo = yestSet, hi = todaySet;
        const targetDeg = rashi2 * 30;
        for (let b = 0; b < 25; b++) {
            const mid = (lo + hi) / 2;
            const diff = ((siderealSun(mid) - targetDeg + 540) % 360) - 180;
            if (diff >= 0) hi = mid; else lo = mid;
        }
        const ingressJD = (lo + hi) / 2;
        // Convert to local time
        const localHrs = ((ingressJD + 0.5 + 5.5/24) % 1) * 24;
        const hh = Math.floor(localHrs);
        const mm = Math.floor((localHrs - hh) * 60);

        sankrantisFound.push({
            date: `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`,
            rashiFrom: RASHI_EN[rashi1],
            rashiTo: RASHI_EN[rashi2],
            rashiToKn: RASHI_KN[rashi2],
            timeStr: `${String(hh).padStart(2,'0')}:${String(mm).padStart(2,'0')}`
        });
    }

    prevSetJD = todaySet;
    cur.setUTCDate(cur.getUTCDate() + 1);
}

console.log(`Found ${sankrantisFound.length} Sankrantis in ${year}:`);
sankrantisFound.forEach((s, idx) => {
    console.log(`${idx + 1}. ${s.date}: Sun enters ${s.rashiTo} (${s.rashiToKn}) at ${s.timeStr} IST`);
});
