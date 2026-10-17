function checkKujaDosha(birthGrahas, lagnaRashiIdx) {
    const mars = birthGrahas.find(g => g.name === 'Mars');
    const moon = birthGrahas.find(g => g.name === 'Moon');
    const venus = birthGrahas.find(g => g.name === 'Venus');
    const jupiter = birthGrahas.find(g => g.name === 'Jupiter');

    if (!mars || lagnaRashiIdx === undefined || lagnaRashiIdx === null) {
        return { isDosha: false, severity: 'None', text: 'Insufficient data' };
    }

    const marsRashi = mars.rashiIdx;
    const moonRashi = moon ? moon.rashiIdx : null;
    const venusRashi = venus ? venus.rashiIdx : null;
    const jupiterRashi = jupiter ? jupiter.rashiIdx : null;

    const DOSHA_HOUSES = [1, 2, 4, 7, 8, 12];

    // House calculation (1-indexed)
    const houseFromLagna = ((marsRashi - lagnaRashiIdx + 12) % 12) + 1;
    const houseFromMoon = moonRashi !== null ? (((marsRashi - moonRashi + 12) % 12) + 1) : null;
    const houseFromVenus = venusRashi !== null ? (((marsRashi - venusRashi + 12) % 12) + 1) : null;

    const inLagnaHouses = DOSHA_HOUSES.includes(houseFromLagna);
    const inMoonHouses = houseFromMoon !== null && DOSHA_HOUSES.includes(houseFromMoon);
    const inVenusHouses = houseFromVenus !== null && DOSHA_HOUSES.includes(houseFromVenus);

    const hasBaseDosha = inLagnaHouses || inMoonHouses || inVenusHouses;

    // Cancellation rules (Parihara / Bhanga)
    const cancellations = [];

    // 1. Own sign (Mesha / Vrischika)
    if (marsRashi === 0 || marsRashi === 7) {
        cancellations.push({
            rule: "Swa-Kshetra (Own Sign)",
            desc: "Mars is in its own sign (Aries or Scorpio), neutralizing the affliction.",
            descKn: "ಕುಜನು ಸ್ವಕ್ಷೇತ್ರದಲ್ಲಿದ್ದಾನೆ (ಮೇಷ ಅಥವಾ ವೃಶ್ಚಿಕ), ದೋಷ ಶಮನವಾಗುತ್ತದೆ."
        });
    }

    // 2. Exalted (Makara)
    if (marsRashi === 9) {
        cancellations.push({
            rule: "Uchcha (Exalted)",
            desc: "Mars is exalted in Capricorn, transforming malefic influence into strength.",
            descKn: "ಕುಜನು ಮಕರದಲ್ಲಿ ಉಚ್ಛಸ್ಥಿತಿಯಲ್ಲಿದ್ದು, ದೋಷ ಪರಿಹಾರವಾಗುತ್ತದೆ."
        });
    }

    // 3. Debilitated in Cancer (Karka)
    if (marsRashi === 3) {
        cancellations.push({
            rule: "Neecha (Debilitated)",
            desc: "Mars is debilitated in Cancer, significantly reducing dosha intensity.",
            descKn: "ಕುಜನು ಕರ್ಕಾಟಕದಲ್ಲಿ ನೀಚನಾಗಿದ್ದು, ದೋಷ ತೀವ್ರತೆ ರದ್ದಾಗುತ್ತದೆ."
        });
    }

    // 4. Jupiter's signs (Sagittarius / Pisces)
    if (marsRashi === 8 || marsRashi === 11) {
        cancellations.push({
            rule: "Guru Rashi (Jupiter Sign)",
            desc: "Mars in Sagittarius or Pisces (signs of benefic Jupiter) eliminates dosha.",
            descKn: "ಗುರು ಕ್ಷೇತ್ರವಾದ ಧನು ಅಥವಾ ಮೀನದಲ್ಲಿ ಕುಜನಿದ್ದರೆ ದೋಷವಿರುವುದಿಲ್ಲ."
        });
    }

    // 5. Conjunction / Aspect with Jupiter
    if (jupiterRashi !== null) {
        // Conjunction
        if (marsRashi === jupiterRashi) {
            cancellations.push({
                rule: "Guru-Mangala Yoga (Conjunction with Jupiter)",
                desc: "Benefic Jupiter is conjunct with Mars, fully cancelling Kuja Dosha.",
                descKn: "ಗುರು-ಮಂಗಳ ಯುತಿಯಿಂದಾಗಿ ಕುಜ ದೋಷ ಸಂಪೂರ್ಣ ಪರಿಹಾರವಾಗುತ್ತದೆ."
            });
        }
        // Jupiter's classical aspects (5th, 7th, 9th from Jupiter)
        const distFromJup = ((marsRashi - jupiterRashi + 12) % 12) + 1;
        if (distFromJup === 5 || distFromJup === 7 || distFromJup === 9) {
            cancellations.push({
                rule: "Guru Drishti (Jupiter Aspect)",
                desc: "Benefic Jupiter aspects Mars (5th, 7th, or 9th drishti), pacifying Kuja Dosha.",
                descKn: "ಗುರುವಿನ ದೃಷ್ಟಿ ಕುಜನ ಮೇಲಿರುವುದರಿಂದ ಕುಜ ದೋಷ ಪರಿಹಾರವಾಗುತ್ತದೆ."
            });
        }
    }

    // 6. Conjunction with Moon
    if (moonRashi !== null && marsRashi === moonRashi) {
        cancellations.push({
            rule: "Chandra-Mangala Yoga",
            desc: "Moon is conjunct with Mars, creating auspicious Chandra-Mangala yoga.",
            descKn: "ಚಂದ್ರ-ಮಂಗಳ ಯುತಿಯಿಂದಾಗಿ ದೋಷ ಭಂಗವಾಗುತ್ತದೆ."
        });
    }

    // 7. House-specific sign rules
    if (houseFromLagna === 2 && (marsRashi === 2 || marsRashi === 5)) {
        cancellations.push({ rule: "2nd House Exception", desc: "Mars in 2nd house in Gemini or Virgo causes no dosha.", descKn: "ಮಿಥುನ/ಕನ್ಯಾದ 2ನೇ ಮನೆಯ ಕುಜ ದೋಷ ರಹಿತ." });
    }
    if (houseFromLagna === 4 && (marsRashi === 0 || marsRashi === 7)) {
        cancellations.push({ rule: "4th House Exception", desc: "Mars in 4th house in Aries or Scorpio causes no dosha.", descKn: "ಮೇಷ/ವೃಶ್ಚಿಕದ 4ನೇ ಮನೆಯ ಕುಜ ದೋಷ ರಹಿತ." });
    }
    if (houseFromLagna === 7 && (marsRashi === 9 || marsRashi === 11)) {
        cancellations.push({ rule: "7th House Exception", desc: "Mars in 7th house in Capricorn or Pisces causes no dosha.", descKn: "ಮಕರ/ಮೀನದ 7ನೇ ಮನೆಯ ಕುಜ ದೋಷ ರಹಿತ." });
    }
    if (houseFromLagna === 8 && (marsRashi === 3 || marsRashi === 8)) {
        cancellations.push({ rule: "8th House Exception", desc: "Mars in 8th house in Cancer or Sagittarius causes no dosha.", descKn: "ಕರ್ಕಾಟಕ/ಧನುಸ್ಸಿನ 8ನೇ ಮನೆಯ ಕುಜ ದೋಷ ರಹಿತ." });
    }
    if (houseFromLagna === 12 && (marsRashi === 1 || marsRashi === 6)) {
        cancellations.push({ rule: "12th House Exception", desc: "Mars in 12th house in Taurus or Libra causes no dosha.", descKn: "ವೃಷಭ/ತುಲಾದ 12ನೇ ಮನೆಯ ಕುಜ ದೋಷ ರಹಿತ." });
    }

    let status = 'none';
    let statusText = 'No Kuja Dosha (ನಿರ್ದೋಷ)';
    let statusColor = 'var(--green)';

    if (hasBaseDosha) {
        if (cancellations.length > 0) {
            status = 'cancelled';
            statusText = 'Kuja Dosha Cancelled (ದೋಷ ಪರಿಹಾರ / ಭಂಗ)';
            statusColor = 'var(--orange)';
        } else {
            status = 'present';
            statusText = 'Kuja Dosha Present (ಕುಜ ದೋಷವಿದೆ)';
            statusColor = 'var(--red)';
        }
    }

    return {
        hasBaseDosha,
        isCancelled: cancellations.length > 0,
        status,
        statusText,
        statusColor,
        houseFromLagna,
        houseFromMoon,
        houseFromVenus,
        inLagnaHouses,
        inMoonHouses,
        inVenusHouses,
        cancellations
    };
}

// Test Kuja Dosha with sample grahas
const testGrahas = [
    { name: 'Sun', rashiIdx: 6 },
    { name: 'Moon', rashiIdx: 8 },
    { name: 'Mars', rashiIdx: 3 }, // Mars in Cancer (Karka, rashi 3)
    { name: 'Mercury', rashiIdx: 6 },
    { name: 'Jupiter', rashiIdx: 3 }, // Jupiter conjunct Mars!
    { name: 'Venus', rashiIdx: 6 },
    { name: 'Saturn', rashiIdx: 11 }
];
const lagnaIdx = 0; // Aries Lagna -> Mars in 4th house (Cancer)
const res = checkKujaDosha(testGrahas, lagnaIdx);
console.log('Kuja Dosha result:', JSON.stringify(res, null, 2));
