const Astronomy = require('../docs/js/astronomy.js');

function findYearEclipses(year, lat = 12.9716, lon = 77.5946, tzOff = 5.5) {
    const obs = new Astronomy.Observer(lat, lon, 920);
    const yearStartJD = 2451545.0 + (new Date(Date.UTC(year, 0, 1)).getTime() / 86400000 - 10957.5); // JD at year start
    const yearStartTime = new Astronomy.AstroTime(new Date(Date.UTC(year, 0, 1)));
    const yearEndTime = new Astronomy.AstroTime(new Date(Date.UTC(year + 1, 0, 1)));

    const eclipses = [];

    // 1. Lunar Eclipses
    let curTime = yearStartTime;
    while (true) {
        const le = Astronomy.SearchLunarEclipse(curTime);
        if (!le || le.peak.date >= yearEndTime.date) break;
        if (le.peak.date >= yearStartTime.date) {
            // Check phase timings
            const peakDate = le.peak.date;
            // Semi-durations are in minutes
            const sdMin = (le.sd_partial > 0) ? le.sd_partial : le.sd_penum;
            const sparshaDate = new Date(peakDate.getTime() - sdMin * 60000);
            const mokshaDate = new Date(peakDate.getTime() + sdMin * 60000);

            // Sutaka for Lunar Eclipse starts 3 praharas (9 hours) before Sparsha
            const sutakaDate = new Date(sparshaDate.getTime() - 9 * 3600000);

            // Visibility at observer's location: check Moon altitude during eclipse
            // Check Moon altitude at peak
            const moonEquator = Astronomy.Equator(Astronomy.Body.Moon, le.peak, obs, true, true);
            const moonHor = Astronomy.Horizon(le.peak, obs, moonEquator.ra, moonEquator.dec, 'normal');
            const isVisible = moonHor.altitude > 0;

            const kindKnMap = {
                'total': 'ಖಗ್ರಾಸ (Total)',
                'partial': 'ಖಂಡಗ್ರಾಸ (Partial)',
                'penumbral': 'ಛಾಯಾ (Penumbral)'
            };

            eclipses.push({
                type: 'lunar',
                title: 'Chandra Grahanam',
                titleKn: 'ಚಂದ್ರ ಗ್ರಹಣ',
                kind: le.kind,
                kindText: kindKnMap[le.kind] || le.kind,
                peakUTC: peakDate,
                sparshaUTC: sparshaDate,
                mokshaUTC: mokshaDate,
                sutakaUTC: sutakaDate,
                obscuration: (le.obscuration * 100).toFixed(0) + '%',
                isVisible,
                altAtPeak: moonHor.altitude.toFixed(1)
            });
        }
        // Advance time past this eclipse
        curTime = le.peak.AddDays(15);
    }

    // 2. Solar Eclipses
    curTime = yearStartTime;
    while (true) {
        const se = Astronomy.SearchGlobalSolarEclipse(curTime);
        if (!se || se.peak.date >= yearEndTime.date) break;
        if (se.peak.date >= yearStartTime.date) {
            const peakDate = se.peak.date;

            // Check if visible locally
            // Search local solar eclipse near this time
            const localSearchTime = se.peak.AddDays(-1);
            const lse = Astronomy.SearchLocalSolarEclipse(localSearchTime, obs);
            const isLocal = lse && Math.abs(lse.peak.time.date.getTime() - peakDate.getTime()) < 24 * 3600000 && lse.peak.altitude > 0;

            let sparshaDate, mokshaDate;
            if (isLocal && lse.partial_begin && lse.partial_end) {
                sparshaDate = lse.partial_begin.time.date;
                mokshaDate = lse.partial_end.time.date;
            } else {
                // Approximate global duration: ~2 hours before and after peak
                sparshaDate = new Date(peakDate.getTime() - 2 * 3600000);
                mokshaDate = new Date(peakDate.getTime() + 2 * 3600000);
            }

            // Sutaka for Solar Eclipse starts 4 praharas (12 hours) before Sparsha
            const sutakaDate = new Date(sparshaDate.getTime() - 12 * 3600000);

            const kindKnMap = {
                'total': 'ಖಗ್ರಾಸ (Total)',
                'annular': 'ಕಂಕಣ (Annular)',
                'partial': 'ಖಂಡಗ್ರಾಸ (Partial)'
            };

            eclipses.push({
                type: 'solar',
                title: 'Surya Grahanam',
                titleKn: 'ಸೂರ್ಯ ಗ್ರಹಣ',
                kind: se.kind,
                kindText: kindKnMap[se.kind] || se.kind,
                peakUTC: peakDate,
                sparshaUTC: sparshaDate,
                mokshaUTC: mokshaDate,
                sutakaUTC: sutakaDate,
                obscuration: (se.obscuration * 100).toFixed(0) + '%',
                isVisible: !!isLocal,
                localObscuration: isLocal ? (lse.obscuration * 100).toFixed(0) + '%' : '0%'
            });
        }
        curTime = se.peak.AddDays(15);
    }

    // Sort chronologically
    eclipses.sort((a, b) => a.peakUTC - b.peakUTC);
    return eclipses;
}

// Test 2026 Eclipses in Bengaluru
const e2026 = findYearEclipses(2026, 12.9716, 77.5946, 5.5);
console.log('--- Eclipses in 2026 ---');
e2026.forEach(e => {
    console.log(`\n${e.title} (${e.titleKn}) - ${e.kindText}`);
    console.log(`  Date: ${e.peakUTC.toISOString().slice(0, 10)}`);
    console.log(`  Peak (UTC): ${e.peakUTC.toISOString().slice(11, 19)}`);
    console.log(`  Sparsha: ${e.sparshaUTC.toISOString().slice(11, 19)} | Moksha: ${e.mokshaUTC.toISOString().slice(11, 19)}`);
    console.log(`  Sutaka Starts: ${e.sutakaUTC.toISOString()}`);
    console.log(`  Visible in Bengaluru: ${e.isVisible} (Obscuration: ${e.obscuration})`);
});
