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

function moonLongitude(jd) {
    const t = new Astronomy.AstroTime(jd - 2451545.0);
    const vec = Astronomy.GeoVector(Astronomy.Body.Moon, t, true);
    const rot = Astronomy.Rotation_EQJ_ECT(t);
    const rotVec = Astronomy.RotateVector(rot, vec);
    let elon = Math.atan2(rotVec.y, rotVec.x) * (180 / Math.PI);
    if (elon < 0) elon += 360;
    return elon;
}

function siderealSun(jd) { return ((sunLongitude(jd) - lahiriAyanamsa(jd)) % 360 + 360) % 360; }
function siderealMoon(jd) { return ((moonLongitude(jd) - lahiriAyanamsa(jd)) % 360 + 360) % 360; }

function siderealPlanet(jd, planetName) {
    const t = new Astronomy.AstroTime(jd - 2451545.0);
    const body = Astronomy.Body[planetName];
    const geo = Astronomy.GeoVector(body, t, true);
    const rot = Astronomy.Rotation_EQJ_ECT(t);
    const vec = Astronomy.RotateVector(rot, geo);
    let elon = Math.atan2(vec.y, vec.x) * (180 / Math.PI);
    if (elon < 0) elon += 360;
    return ((elon - lahiriAyanamsa(jd)) % 360 + 360) % 360;
}

function rahuLongitude(jd) {
    const T = (jd - 2451545.0) / 36525.0;
    let rahu = 125.0445 - 1934.1363 * T + 0.0021 * T * T;
    return ((rahu % 360) + 360) % 360;
}
function siderealRahu(jd) { return ((rahuLongitude(jd) - lahiriAyanamsa(jd)) % 360 + 360) % 360; }
function siderealKetu(jd) { return (siderealRahu(jd) + 180) % 360; }

const RASHI_EN = ["Mesha","Vrishabha","Mithuna","Karka","Simha","Kanya","Tula","Vrischika","Dhanus","Makara","Kumbha","Meena"];
const RASHI_KN = ["ಮೇಷ","ವೃಷಭ","ಮಿಥುನ","ಕರ್ಕಾಟಕ","ಸಿಂಹ","ಕನ್ಯಾ","ತುಲಾ","ವೃಶ್ಚಿಕ","ಧನುಸ್ಸು","ಮಕರ","ಕುಂಭ","ಮೀನ"];

// 1. TEST PLANETARY SPEED, VAKRI, MOUDYHA
function getAllGrahaPositions(jd) {
    const grahas = [
        { name: 'Sun', nameKn: 'ಸೂರ್ಯ', icon: '☀️', lon: siderealSun(jd), isPlanet: false },
        { name: 'Moon', nameKn: 'ಚಂದ್ರ', icon: '🌙', lon: siderealMoon(jd), isPlanet: false },
        { name: 'Mars', nameKn: 'ಮಂಗಳ', icon: '🔴', lon: siderealPlanet(jd, 'Mars'), isPlanet: true },
        { name: 'Mercury', nameKn: 'ಬುಧ', icon: '🟢', lon: siderealPlanet(jd, 'Mercury'), isPlanet: true },
        { name: 'Jupiter', nameKn: 'ಗುರು', icon: '🟡', lon: siderealPlanet(jd, 'Jupiter'), isPlanet: true },
        { name: 'Venus', nameKn: 'ಶುಕ್ರ', icon: '⚪', lon: siderealPlanet(jd, 'Venus'), isPlanet: true },
        { name: 'Saturn', nameKn: 'ಶನಿ', icon: '🔵', lon: siderealPlanet(jd, 'Saturn'), isPlanet: true },
        { name: 'Rahu', nameKn: 'ರಾಹು', icon: '🐍', lon: siderealRahu(jd), isNode: true },
        { name: 'Ketu', nameKn: 'ಕೇತು', icon: '🔥', lon: siderealKetu(jd), isNode: true }
    ];
    const sunLon = grahas[0].lon;
    
    // Combustion limits (degrees from Sun)
    // Mars: 17, Mercury: 14 (12 if retrograde), Jupiter: 11, Venus: 10 (8 if retrograde), Saturn: 15
    const COMBUST_LIMITS = {
        'Mars': 17,
        'Mercury': 14,
        'Jupiter': 11,
        'Venus': 10,
        'Saturn': 15
    };

    grahas.forEach(g => {
        g.rashiIdx = Math.floor(g.lon / 30);
        g.rashi = RASHI_EN[g.rashiIdx];
        g.rashiKn = RASHI_KN[g.rashiIdx];
        g.deg = (g.lon % 30).toFixed(1);

        // Speed & Retrograde
        if (g.isPlanet) {
            const dt = 0.05; // ~1.2 hours
            const p1 = siderealPlanet(jd - dt, g.name);
            const p2 = siderealPlanet(jd + dt, g.name);
            const diff = ((p2 - p1 + 540) % 360) - 180;
            g.speed = diff / (2 * dt); // deg / day
            g.isVakri = g.speed < 0;
        } else if (g.isNode) {
            g.isVakri = true; // Rahu/Ketu are always retrograde
        } else {
            g.isVakri = false;
        }

        // Combustion
        if (g.isPlanet) {
            let dist = Math.abs(g.lon - sunLon);
            if (dist > 180) dist = 360 - dist;
            g.sunDist = dist;
            let limit = COMBUST_LIMITS[g.name];
            if (g.isVakri && g.name === 'Mercury') limit = 12;
            if (g.isVakri && g.name === 'Venus') limit = 8;
            g.combust = dist <= limit;
        } else {
            g.combust = false;
        }
    });
    return grahas;
}

// Test on Oct 17, 2026
const jdTest = julianDay(2026, 10, 17, 6);
const gRes = getAllGrahaPositions(jdTest);
console.log('--- Graha Sthiti on 2026-10-17 ---');
gRes.forEach(g => {
    console.log(`${g.name} (${g.rashi}): ${g.deg} deg | Vakri: ${g.isVakri} | Combust: ${g.combust}`);
});
