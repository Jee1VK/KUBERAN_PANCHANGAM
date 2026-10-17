const DASHA_PLANET_NAMES = ['Ketu','Venus','Sun','Moon','Mars','Rahu','Jupiter','Saturn','Mercury'];
const DASHA_PLANET_KN = ['ಕೇತು','ಶುಕ್ರ','ಸೂರ್ಯ','ಚಂದ್ರ','ಮಂಗಳ','ರಾಹು','ಗುರು','ಶನಿ','ಬುಧ'];
const DASHA_YEARS = [7, 20, 6, 10, 7, 18, 16, 19, 17];

function computeAntardashas(mdIdx, mdStart, mdEnd, birthDate, isFirstDasha) {
    const mdYears = DASHA_YEARS[mdIdx];
    const antardashas = [];
    let curStart = new Date(mdStart.getTime());

    for (let j = 0; j < 9; j++) {
        const adIdx = (mdIdx + j) % 9;
        const adYears = DASHA_YEARS[adIdx];
        const adDays = (mdYears * adYears * 365.2425) / 120;
        const curEnd = new Date(curStart.getTime() + adDays * 86400000);

        // For the first dasha, only include antardashas that end after birth
        if (!isFirstDasha || curEnd > birthDate) {
            const effectiveStart = (isFirstDasha && curStart < birthDate) ? new Date(birthDate.getTime()) : new Date(curStart.getTime());
            antardashas.push({
                mdName: DASHA_PLANET_NAMES[mdIdx],
                mdNameKn: DASHA_PLANET_KN[mdIdx],
                adName: DASHA_PLANET_NAMES[adIdx],
                adNameKn: DASHA_PLANET_KN[adIdx],
                adIdx,
                startDate: effectiveStart,
                endDate: curEnd,
                isBirthAd: isFirstDasha && curStart < birthDate
            });
        }
        curStart = curEnd;
    }
    return antardashas;
}

// Test with a sample birth date and balance
const birth = new Date('1995-05-15T08:30:00Z');
const nakLordIdx = 8; // Mercury
const balanceYearsDecimal = 8.25; // 8.25 years balance
const fullYears = DASHA_YEARS[nakLordIdx]; // 17
const elapsedYears = fullYears - balanceYearsDecimal; // 8.75
const virtualStart = new Date(birth.getTime() - elapsedYears * 365.2425 * 86400000);
const balEnd = new Date(birth.getTime() + balanceYearsDecimal * 365.2425 * 86400000);

const firstAds = computeAntardashas(nakLordIdx, virtualStart, balEnd, birth, true);
console.log(`First Mahadasha (${DASHA_PLANET_NAMES[nakLordIdx]}) Antardashas active after birth:`);
firstAds.forEach(ad => {
    console.log(`  ${ad.mdName} - ${ad.adName} (${ad.mdNameKn}-${ad.adNameKn}): ${ad.startDate.toISOString().slice(0,10)} -> ${ad.endDate.toISOString().slice(0,10)} ${ad.isBirthAd ? '[At Birth]' : ''}`);
});

// Second Mahadasha (Ketu)
const nextMdIdx = (nakLordIdx + 1) % 9;
const ketuStart = balEnd;
const ketuEnd = new Date(ketuStart.getTime() + DASHA_YEARS[nextMdIdx] * 365.2425 * 86400000);
const ketuAds = computeAntardashas(nextMdIdx, ketuStart, ketuEnd, birth, false);
console.log(`\nSecond Mahadasha (${DASHA_PLANET_NAMES[nextMdIdx]}) Antardashas:`);
ketuAds.forEach(ad => {
    console.log(`  ${ad.mdName} - ${ad.adName}: ${ad.startDate.toISOString().slice(0,10)} -> ${ad.endDate.toISOString().slice(0,10)}`);
});
