const Astronomy = require('./docs/js/astronomy.js');

function siderealSun(jd) {
    const t = new Astronomy.AstroTime(jd - 2451545.0);
    const pos = Astronomy.GeoVector('Sun', t, true);
    let l = Math.atan2(pos.y, pos.x) * 180 / Math.PI;
    if (l < 0) l += 360;
    const ayan = (23.85 + (jd - 2451545.0) / 365.25 * (50.29 / 3600));
    let sl = l - ayan;
    if (sl < 0) sl += 360;
    return sl;
}

function siderealMoon(jd) {
    const t = new Astronomy.AstroTime(jd - 2451545.0);
    const pos = Astronomy.GeoVector('Moon', t, true);
    let l = Math.atan2(pos.y, pos.x) * 180 / Math.PI;
    if (l < 0) l += 360;
    const ayan = (23.85 + (jd - 2451545.0) / 365.25 * (50.29 / 3600));
    let sl = l - ayan;
    if (sl < 0) sl += 360;
    return sl;
}

// Find Diwali 2026
// Diwali is Nov 8, 2026. Let's find New Moon around Nov 8, 2026.
let jd = Astronomy.DayValue(new Date('2026-11-08T12:00:00Z')) + 2451545.0;
console.log('Sun Sidereal:', siderealSun(jd));
console.log('Moon Sidereal:', siderealMoon(jd));
