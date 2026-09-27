// KUBERAN PANCHANGAM - ASHTAKOOTA GUNA MILAN
// 36-Point Matchmaking Algorithm

// NAKSHATRA PROPERTIES
// Nadi: 0=Adi, 1=Madhya, 2=Antya
// Gana: 0=Deva, 1=Manushya, 2=Rakshasa
// Yoni: 0=Ashwa, 1=Gaja, 2=Aja, 3=Sarpa, 4=Shwan, 5=Marjala, 6=Mushaka, 7=Gau, 8=Mahisha, 9=Vyaghra, 10=Mriga, 11=Vanara, 12=Nakula, 13=Simha
const NAK_PROPS = [
    {nadi:0, gana:0, yoni:0},  // 1. Ashwini
    {nadi:1, gana:1, yoni:1},  // 2. Bharani
    {nadi:2, gana:2, yoni:2},  // 3. Krittika
    {nadi:2, gana:1, yoni:3},  // 4. Rohini
    {nadi:1, gana:0, yoni:3},  // 5. Mrigashira
    {nadi:0, gana:1, yoni:4},  // 6. Ardra
    {nadi:0, gana:0, yoni:5},  // 7. Punarvasu
    {nadi:1, gana:0, yoni:2},  // 8. Pushya
    {nadi:2, gana:2, yoni:5},  // 9. Ashlesha
    {nadi:2, gana:2, yoni:6},  // 10. Magha
    {nadi:1, gana:1, yoni:6},  // 11. Purva Phalguni
    {nadi:0, gana:1, yoni:7},  // 12. Uttara Phalguni
    {nadi:0, gana:0, yoni:8},  // 13. Hasta
    {nadi:1, gana:2, yoni:9},  // 14. Chitra
    {nadi:2, gana:0, yoni:8},  // 15. Swati
    {nadi:2, gana:2, yoni:9},  // 16. Vishakha
    {nadi:1, gana:0, yoni:10}, // 17. Anuradha
    {nadi:0, gana:2, yoni:10}, // 18. Jyeshtha
    {nadi:0, gana:2, yoni:4},  // 19. Mula
    {nadi:1, gana:1, yoni:11}, // 20. Purvashadha
    {nadi:2, gana:1, yoni:12}, // 21. Uttarashadha
    {nadi:2, gana:0, yoni:11}, // 22. Shravana
    {nadi:1, gana:2, yoni:13}, // 23. Dhanishta
    {nadi:0, gana:2, yoni:0},  // 24. Shatabhisha
    {nadi:0, gana:1, yoni:13}, // 25. Purva Bhadrapada
    {nadi:1, gana:1, yoni:7},  // 26. Uttara Bhadrapada
    {nadi:2, gana:0, yoni:1}   // 27. Revati
];

// RASHI PROPERTIES
// Varna: 0=Brahmin (Water), 1=Kshatriya (Fire), 2=Vaishya (Earth), 3=Shudra (Air)
// Lord: 0=Sun, 1=Moon, 2=Mars, 3=Merc, 4=Jup, 5=Ven, 6=Sat
const RASHI_PROPS = [
    {varna:1, lord:2}, // 1. Aries
    {varna:2, lord:5}, // 2. Taurus
    {varna:3, lord:3}, // 3. Gemini
    {varna:0, lord:1}, // 4. Cancer
    {varna:1, lord:0}, // 5. Leo
    {varna:2, lord:3}, // 6. Virgo
    {varna:3, lord:5}, // 7. Libra
    {varna:0, lord:2}, // 8. Scorpio
    {varna:1, lord:4}, // 9. Sagittarius
    {varna:2, lord:6}, // 10. Capricorn
    {varna:3, lord:6}, // 11. Aquarius
    {varna:0, lord:4}  // 12. Pisces
];

// YONI MATCHING MATRIX (14x14) - simplified standard table
const YONI_MATRIX = [
    [4,2,2,3,2,2,2,1,0,1,3,3,2,1], // 0. Ashwa
    [2,4,3,3,2,2,2,2,3,1,2,3,2,0], // 1. Gaja
    [2,3,4,2,1,2,1,3,3,1,2,0,3,1], // 2. Aja
    [3,3,2,4,2,1,1,1,1,2,2,2,0,2], // 3. Sarpa
    [2,2,1,2,4,2,1,2,2,1,0,2,1,1], // 4. Shwan
    [2,2,2,1,2,4,0,2,2,1,3,3,2,1], // 5. Marjala
    [2,2,1,1,1,0,4,2,2,2,2,2,1,2], // 6. Mushaka
    [1,2,3,1,2,2,2,4,3,0,3,2,2,1], // 7. Gau
    [0,3,3,1,2,2,2,3,4,1,2,2,2,1], // 8. Mahisha
    [1,1,1,2,1,1,2,0,1,4,1,1,2,1], // 9. Vyaghra
    [3,2,2,2,0,3,2,3,2,1,4,2,2,1], // 10. Mriga
    [3,3,0,2,2,3,2,2,2,1,2,4,3,2], // 11. Vanara
    [2,2,3,0,1,2,1,2,2,2,2,3,4,2], // 12. Nakula
    [1,0,1,2,1,1,2,1,1,1,1,2,2,4]  // 13. Simha
];

// GRAHA MAITRI MATRIX (7x7) - 5=Friend, 4=Neutral, 0=Enemy (approx standard)
// 0=Sun, 1=Moon, 2=Mars, 3=Merc, 4=Jup, 5=Ven, 6=Sat
const MAITRI_MATRIX = [
    [5,5,5,4,5,0,0], // Sun
    [5,5,4,0,4,4,4], // Moon (Mercury is enemy)
    [5,5,5,0,5,4,4], // Mars
    [5,0,4,5,4,5,4], // Merc
    [5,5,5,0,5,0,4], // Jup
    [0,0,4,5,4,5,5], // Ven
    [0,0,0,5,4,5,5]  // Sat
];

// GANA MATCHING MATRIX
// Boy=rows, Girl=cols. 0=Deva, 1=Manushya, 2=Rakshasa
const GANA_MATRIX = [
    [6, 6, 1], // Boy Deva
    [5, 6, 0], // Boy Manushya
    [1, 0, 6]  // Boy Rakshasa
];

// BHAKOOT DISTANCE MATCHING
// Boy to Girl distance (1-12)
const BHAKOOT_MATRIX = [0, 7, 0, 7, 7, 0, 0, 7, 0, 0, 7, 7, 0]; 
// 1=7, 2=0, 3=7, 4=7, 5=0, 6=0, 7=7, 8=0, 9=0, 10=7, 11=7, 12=0

function getRashi(nakIdx, pada) {
    return Math.floor(((nakIdx - 1) * 4 + (pada - 1)) / 9);
}

function calculateAshtakoota(boyNak, boyPada, girlNak, girlPada) {
    let result = { total: 0 };
    
    const bNak = NAK_PROPS[boyNak - 1];
    const gNak = NAK_PROPS[girlNak - 1];
    const bRashiIdx = getRashi(boyNak, boyPada);
    const gRashiIdx = getRashi(girlNak, girlPada);
    const bRashi = RASHI_PROPS[bRashiIdx];
    const gRashi = RASHI_PROPS[gRashiIdx];

    // 1. VARNA (Max 1) - Boy >= Girl varna (0 is highest, 3 is lowest)
    const varnaScore = (bRashi.varna <= gRashi.varna) ? 1 : 0;
    result.varna = { score: varnaScore, max: 1, desc: varnaScore === 1 ? 'Compatible' : 'Incompatible' };

    // 2. VASHYA (Max 2) - Based on Rashi Vashya classification
    // 0=Chatushpad(quadruped), 1=Dwipad(biped), 2=Jalchar(aquatic), 3=Vanchar(wild), 4=Keeta(insect)
    // Aries=Chatushpad, Taurus=Chatushpad, Gemini=Dwipad, Cancer=Jalchar+Keeta,
    // Leo=Vanchar, Virgo=Dwipad, Libra=Dwipad, Scorpio=Keeta,
    // Sagittarius=Dwipad(latter half), Capricorn=Jalchar(latter half), Aquarius=Dwipad, Pisces=Jalchar
    const VASHYA_TYPE = [0, 0, 1, 4, 3, 1, 1, 4, 1, 2, 1, 2]; // per rashi index
    // Vashya compatibility: same type=2, Dwipad-controls-all=2 (if boy is Dwipad),
    // complementary types=1, hostile=0
    const bV = VASHYA_TYPE[bRashiIdx];
    const gV = VASHYA_TYPE[gRashiIdx];
    let vashyaScore = 0;
    if (bV === gV) vashyaScore = 2;
    else if (bV === 1 || gV === 1) vashyaScore = 1; // Dwipad has partial control over others
    else if ((bV === 0 && gV === 3) || (bV === 3 && gV === 0)) vashyaScore = 0; // quadruped vs wild = hostile
    else if ((bV === 2 && gV === 4) || (bV === 4 && gV === 2)) vashyaScore = 1; // aquatic-insect = partial
    else vashyaScore = 0;
    result.vashya = { score: vashyaScore, max: 2, desc: vashyaScore === 2 ? 'Highly Compatible' : (vashyaScore === 1 ? 'Average' : 'Incompatible') };

    // 3. TARA (Max 3)
    let bToG = (girlNak - boyNak) % 9; if (bToG <= 0) bToG += 9;
    let gToB = (boyNak - girlNak) % 9; if (gToB <= 0) gToB += 9;
    const tScore = (t) => [3,5,7].includes(t) ? 0 : 1.5; // Janma(1) is 1.5, Vipat(3)=0, Pratyak(5)=0, Naidhana(7)=0
    const taraScore = tScore(bToG) + tScore(gToB);
    result.tara = { score: taraScore, max: 3, desc: taraScore >= 2 ? 'Good' : 'Poor' };

    // 4. YONI (Max 4)
    const yoniScore = YONI_MATRIX[bNak.yoni][gNak.yoni];
    result.yoni = { score: yoniScore, max: 4, desc: yoniScore >= 3 ? 'Excellent' : (yoniScore >= 2 ? 'Average' : 'Poor') };

    // 5. GRAHA MAITRI (Max 5)
    let maitri1 = MAITRI_MATRIX[bRashi.lord][gRashi.lord];
    let maitri2 = MAITRI_MATRIX[gRashi.lord][bRashi.lord];
    let maitriScore = 0;
    if (maitri1 === 5 && maitri2 === 5) maitriScore = 5;
    else if ((maitri1 === 5 && maitri2 === 4) || (maitri1 === 4 && maitri2 === 5)) maitriScore = 4;
    else if (maitri1 === 4 && maitri2 === 4) maitriScore = 3;
    else if ((maitri1 === 5 && maitri2 === 0) || (maitri1 === 0 && maitri2 === 5)) maitriScore = 1;
    else maitriScore = 0;
    result.maitri = { score: maitriScore, max: 5, desc: maitriScore >= 4 ? 'Friendly' : (maitriScore > 1 ? 'Neutral' : 'Inimical') };

    // 6. GANA (Max 6)
    const ganaScore = GANA_MATRIX[bNak.gana][gNak.gana];
    result.gana = { score: ganaScore, max: 6, desc: ganaScore >= 5 ? 'Excellent' : (ganaScore > 0 ? 'Acceptable' : 'Incompatible') };

    // 7. BHAKOOT (Max 7)
    let dist = (gRashiIdx - bRashiIdx) + 1;
    if (dist <= 0) dist += 12;
    const bhakootScore = BHAKOOT_MATRIX[dist];
    result.bhakoot = { score: bhakootScore, max: 7, desc: bhakootScore === 7 ? 'Auspicious' : 'Dosha Present' };

    // 8. NADI (Max 8)
    const nadiScore = (bNak.nadi !== gNak.nadi) ? 8 : 0;
    result.nadi = { score: nadiScore, max: 8, desc: nadiScore === 8 ? 'Excellent (No Dosha)' : 'Nadi Dosha' };

    result.total = result.varna.score + result.vashya.score + result.tara.score + result.yoni.score + result.maitri.score + result.gana.score + result.bhakoot.score + result.nadi.score;
    return result;
}
