// ============================================================
//  js/muhurthaEngine.js — Advanced Muhurtha & Compatibility Engine
//  1. Tarabala Calculation (1-27 birth star vs target star)
//  2. Chandrabala Calculation (0-11 birth Rashi vs transit Rashi)
//  3. Panchaka Rahita Calculation (Lagna & Muhurtha purity)
//  4. Gandanta & Pushkar Navamsha Degree Detectors
// ============================================================

// 1. Tarabala Calculation (Star compatibility relative to birth star 1-27)
function calculateTarabala(birthNakshatra, targetNakshatra) {
    let diff = (targetNakshatra - birthNakshatra + 27) % 27;
    let remainder = (diff % 9) + 1;

    const taraTypes = {
        1: { remainder: 1, name: 'Janma', nameKn: 'ಜನ್ಮ ತಾರೆ', effect: 'Inauspicious (Danger to body)', auspicious: false },
        2: { remainder: 2, name: 'Vipat', nameKn: 'ವಿಪತ್ ತಾರೆ', effect: 'Inauspicious (Losses & obstacles)', auspicious: false },
        3: { remainder: 3, name: 'Kshema', nameKn: 'ಕ್ಷೇಮ ತಾರೆ', effect: 'Auspicious (Prosperity & wealth)', auspicious: true },
        4: { remainder: 4, name: 'Pratyak', nameKn: 'ಪ್ರತ್ಯಕ್ ತಾರೆ', effect: 'Inauspicious (Hindrances)', auspicious: false },
        5: { remainder: 5, name: 'Sadhana', nameKn: 'ಸಾಧನ ತಾರೆ', effect: 'Auspicious (Accomplishment)', auspicious: true },
        6: { remainder: 6, name: 'Nhana (Vadha)', nameKn: 'ವಧ ತಾರೆ', effect: 'Highly Inauspicious (Danger/Death)', auspicious: false },
        7: { remainder: 7, name: 'Mitra', nameKn: 'ಮಿತ್ರ ತಾರೆ', effect: 'Auspicious (Friendly & supportive)', auspicious: true },
        8: { remainder: 8, name: 'Ati Mitra', nameKn: 'ಅತಿ ಮಿತ್ರ ತಾರೆ', effect: 'Highly Auspicious (Great success)', auspicious: true },
        9: { remainder: 9, name: 'Parama Mitra', nameKn: 'ಪರಮ ಮಿತ್ರ ತಾರೆ', effect: 'Most Auspicious (Ultimate harmony)', auspicious: true }
    };
    return taraTypes[remainder];
}

// 2. Chandrabala Calculation (Moon transit from birth Rashi 0-11)
function calculateChandrabala(birthRashi, transitRashi) {
    let house = ((transitRashi - birthRashi + 12) % 12) + 1;
    const auspiciousHouses = [1, 3, 6, 7, 10, 11];

    if (house === 8) {
        return { house, effect: 'Chandrashtama (Strictly Avoid)', effectKn: 'ಚಂದ್ರಾಷ್ಟಮ (ಶುಭ ಕಾರ್ಯ ವರ್ಜ್ಯ)', auspicious: false };
    }
    const isGood = auspiciousHouses.includes(house);
    return {
        house,
        effect: isGood ? `Auspicious (${house}th house from Moon)` : `Unfavorable (${house}th house from Moon)`,
        effectKn: isGood ? `ಶುಭ ಚಂದ್ರಬಲ (${house}ನೇ ಮನೆ)` : `ಸಾಧಾರಣ/ಅಶುಭ (${house}ನೇ ಮನೆ)`,
        auspicious: isGood
    };
}

// 3. Panchaka Rahita Calculation (For Lagna & Muhurtha purity)
// Note: Accepts 0-indexed varaIndex (0-6), tithiIndex (0-29), nakshatraIndex (0-26), lagnaIndex (0-11)
function calculatePanchaka(varaIndex, tithiIndex, nakshatraIndex, lagnaIndex) {
    // Standard Vedic formula: Sum of (Vara + Tithi + Nakshatra + Lagna) modulo 9
    let sum = (varaIndex + 1) + (tithiIndex + 1) + (nakshatraIndex + 1) + (lagnaIndex + 1);
    let remainder = sum % 9;

    const panchakaTypes = {
        1: { remainder: 1, type: 'Mrityu Panchaka', typeKn: 'ಮೃತ್ಯು ಪಂಚಕ', result: 'Danger / Avoid for beginnings', bad: true },
        2: { remainder: 2, type: 'Agni Panchaka', typeKn: 'ಅಗ್ನಿ ಪಂಚಕ', result: 'Risk of fire / Accidents', bad: true },
        3: { remainder: 3, type: 'Raja Panchaka', typeKn: 'ರಾಜ ಪಂಚಕ', result: 'Good / Government success', bad: false },
        4: { remainder: 4, type: 'Chora Panchaka', typeKn: 'ಚೋರ ಪಂಚಕ', result: 'Risk of theft / Loss', bad: true },
        5: { remainder: 5, type: 'Roga Panchaka', typeKn: 'ರೋಗ ಪಂಚಕ', result: 'Sickness / Health issues', bad: true },
        6: { remainder: 6, type: 'Shubha / Purna', typeKn: 'ಶುಭ / ಪಂಚಕ ರಹಿತ', result: 'Auspicious & Safe', bad: false },
        7: { remainder: 7, type: 'Shubha / Purna', typeKn: 'ಶುಭ / ಪಂಚಕ ರಹಿತ', result: 'Auspicious & Safe', bad: false },
        8: { remainder: 8, type: 'Shubha / Purna', typeKn: 'ಶುಭ / ಪಂಚಕ ರಹಿತ', result: 'Auspicious & Safe', bad: false },
        0: { remainder: 0, type: 'Shubha / Purna', typeKn: 'ಶುಭ / ಪಂಚಕ ರಹಿತ', result: 'Auspicious & Safe', bad: false }
    };
    return panchakaTypes[remainder] || { remainder, type: 'Neutral', typeKn: 'ಸಾಧಾರಣ', result: 'Acceptable', bad: false };
}

// 4. Gandanta & Pushkar Navamsha Detectors
// Gandanta occurs at the 3 Water-to-Fire junctions:
// - Cancer/Leo (Ashlesha/Magha) around 120° (116.667° to 123.333°)
// - Scorpio/Sagittarius (Jyeshtha/Mula) around 240° (236.667° to 243.333°)
// - Pisces/Aries (Revati/Ashwini) around 360°/0° (356.667° to 360° and 0° to 3.333°)
function checkGandantaAndPushkar(moonSiderealLon, sunSiderealLon) {
    const lon = ((moonSiderealLon % 360) + 360) % 360;
    const SPAN = 360 / 108; // 1 Pada = 3°20' (3.3333°)

    let isGandanta = false;
    let gandantaInfo = null;

    if (lon >= 120 - SPAN && lon < 120 + SPAN) {
        isGandanta = true;
        gandantaInfo = {
            junction: 'Ashlesha–Magha (Karka–Simha)',
            junctionKn: 'ಆಶ್ಲೇಷ–ಮಘ ಗಂಡಾಂತ',
            isCore: Math.abs(lon - 120) <= 0.8,
            desc: 'Karmic water-to-fire junction (120°). Avoid major Muhurtha beginnings; perform Nakshatra Shanti if born in this zone.'
        };
    } else if (lon >= 240 - SPAN && lon < 240 + SPAN) {
        isGandanta = true;
        gandantaInfo = {
            junction: 'Jyeshtha–Mula (Vrishchika–Dhanus)',
            junctionKn: 'ಜ್ಯೇಷ್ಠ–ಮೂಲ ಗಂಡಾಂತ',
            isCore: Math.abs(lon - 240) <= 0.8,
            desc: 'Abhukta Mula / Jyeshtha junction (240°). Avoid auspicious beginnings during this window.'
        };
    } else if (lon >= 360 - SPAN || lon < SPAN) {
        isGandanta = true;
        const dist = lon >= 360 - SPAN ? (360 - lon) : lon;
        gandantaInfo = {
            junction: 'Revati–Ashwini (Meena–Mesha)',
            junctionKn: 'ರೇವತಿ–ಅಶ್ವಿನಿ ಗಂಡಾಂತ',
            isCore: dist <= 0.8,
            desc: 'Meena–Mesha water-to-fire junction (0°). Avoid commencing major ceremonies.'
        };
    }

    // Classical Pushkar Navamsha check (2 per Rashi = 24 Pushkar Navamshas)
    // Within each 30° sign, there are 9 Navamshas of 3°20' each (indices 0..8):
    // Fire signs (0, 4, 8): 7th (20°-23°20') and 9th (26°40'-30°) -> idx 6, 8
    // Earth signs (1, 5, 9): 3rd (6°40'-10°) and 5th (13°20'-16°40') -> idx 2, 4
    // Air signs (2, 6, 10): 6th (16°40'-20°) and 8th (23°20'-26°40') -> idx 5, 7
    // Water signs (3, 7, 11): 1st (0°-3°20') and 3rd (6°40'-10°) -> idx 0, 2
    const rashiIdx = Math.floor(lon / 30);
    const degInSign = lon % 30;
    const navIdxInSign = Math.floor(degInSign / SPAN); // 0..8
    const element = rashiIdx % 4; // 0=Fire, 1=Earth, 2=Air, 3=Water
    const pushkarMap = {
        0: [6, 8],
        1: [2, 4],
        2: [5, 7],
        3: [0, 2]
    };
    const isPushkarNavamsha = pushkarMap[element].includes(navIdxInSign);
    const alerts = [];
    if (isGandanta && gandantaInfo) {
        alerts.push({
            type: 'gandanta',
            label: `Gandanta (${gandantaInfo.junction})`,
            labelKn: gandantaInfo.junctionKn,
            desc: gandantaInfo.desc
        });
    }
    if (isPushkarNavamsha) {
        alerts.push({
            type: 'pushkar',
            label: 'Pushkar Navamsha',
            labelKn: 'ಪುಷ್ಕರ ನವಾಂಶ',
            desc: 'Highly nourishing micro-window for wealth, investments & auspicious beginnings.'
        });
    }

    return {
        isGandanta,
        gandantaInfo,
        isPushkar: isPushkarNavamsha,
        isPushkarNavamsha,
        pushkarDesc: isPushkarNavamsha
            ? '🌟 Pushkar Navamsha Active (ಪುಷ್ಕರ ನವಾಂಶ) — Highly nourishing micro-window for wealth, investments & auspicious beginnings.'
            : null,
        alerts
    };
}

if (typeof window !== 'undefined') {
    window.calculateTarabala = calculateTarabala;
    window.calculateChandrabala = calculateChandrabala;
    window.calculatePanchaka = calculatePanchaka;
    window.checkGandantaAndPushkar = checkGandantaAndPushkar;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        calculateTarabala,
        calculateChandrabala,
        calculatePanchaka,
        checkGandantaAndPushkar
    };
}
