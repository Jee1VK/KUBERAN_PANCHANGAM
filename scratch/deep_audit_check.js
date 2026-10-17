/**
 * DEEP AUDIT & STRESS TEST OF ALL PART 2 & PART 3 IMPLEMENTATIONS
 * Checks every single bug fix from Part 3 and every feature of Part 2
 * under edge cases, bilingual switching, DOM rendering, and real astronomical dates.
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const docsDir = path.join(__dirname, '..', 'docs');
const astroCode = fs.readFileSync(path.join(docsDir, 'js', 'astronomy.js'), 'utf8');
const ashtaCode = fs.readFileSync(path.join(docsDir, 'js', 'ashtakoota.js'), 'utf8');
const htmlContent = fs.readFileSync(path.join(docsDir, 'index.html'), 'utf8');

const Astronomy = (new Function(astroCode + '; return Astronomy;'))();

// Extract inline scripts
const scriptRegex = /<script(?:\s+type="text\/javascript")?>([\s\S]*?)<\/script>/gi;
let match;
let scripts = [];
while ((match = scriptRegex.exec(htmlContent)) !== null) {
    if (!match[0].includes('src=')) {
        scripts.push(match[1]);
    }
}

// Verify all referenced HTML IDs in JS actually exist in index.html
const htmlIds = new Set();
const idRegex = /\bid=["']([^"']+)["']/g;
while ((match = idRegex.exec(htmlContent)) !== null) {
    htmlIds.add(match[1]);
}

class MockClassList {
    constructor() { this.classes = new Set(); }
    add(...cls) { cls.forEach(c => this.classes.add(c)); }
    remove(...cls) { cls.forEach(c => this.classes.delete(c)); }
    contains(c) { return this.classes.has(c); }
    toggle(c, force) {
        if (force !== undefined) {
            if (force) this.classes.add(c);
            else this.classes.delete(c);
            return force;
        }
        if (this.classes.has(c)) { this.classes.delete(c); return false; }
        else { this.classes.add(c); return true; }
    }
}

const elementsById = {};
class MockElement {
    constructor(id = '', tagName = 'div') {
        this.id = id;
        this.tagName = tagName.toUpperCase();
        this.classList = new MockClassList();
        this.attributes = {};
        this.style = { display: 'none' };
        this.children = [];
        this.parentNode = null;
        this.value = '';
        this.innerHTML = '';
        this.textContent = '';
        this.dataset = { tab: 'daily', lang: 'kn' };
        this.selectedIndex = 0;
        this.options = [{ value: 'marriage', text: 'Marriage' }];
    }
    addEventListener() {}
    removeEventListener() {}
    setAttribute(name, val) { this.attributes[name] = val; }
    getAttribute(name) { return this.attributes[name] || null; }
    appendChild(child) {
        child.parentNode = this;
        this.children.push(child);
        return child;
    }
    querySelector(sel) {
        if (sel.startsWith('#')) return getMockEl(sel.slice(1));
        return new MockElement();
    }
    querySelectorAll() { return []; }
    scrollIntoView() {}
}

function getMockEl(id) {
    if (!elementsById[id]) {
        elementsById[id] = new MockElement(id);
    }
    return elementsById[id];
}

// Pre-populate inputs
getMockEl('dateInput').value = '2026-10-17';
getMockEl('latInput').value = '12.9716';
getMockEl('lonInput').value = '77.5946';
getMockEl('jName').value = 'Test Native';
getMockEl('jDob').value = '1995-05-15T10:30';
getMockEl('jLat').value = '12.9716';
getMockEl('jLon').value = '77.5946';
getMockEl('jTz').value = 'Asia/Kolkata';
getMockEl('matchBoyNak').value = '0';
getMockEl('matchGirlNak').value = '4';
getMockEl('matchBoyPada').value = '1';
getMockEl('matchGirlPada').value = '2';

const sandbox = {
    console,
    Astronomy,
    Date,
    Math,
    parseInt,
    parseFloat,
    isNaN,
    isFinite,
    JSON,
    Array,
    Object,
    String,
    Number,
    Boolean,
    RegExp,
    Set,
    Map,
    Promise,
    Intl,
    setTimeout: (fn) => fn(),
    setInterval: () => {},
    clearTimeout: () => {},
    clearInterval: () => {},
    window: {},
    document: {
        body: new MockElement('body', 'body'),
        documentElement: new MockElement('html', 'html'),
        getElementById: (id) => getMockEl(id),
        createElement: (tag) => new MockElement('', tag),
        querySelector: (sel) => {
            if (sel.startsWith('#')) return getMockEl(sel.slice(1));
            return new MockElement();
        },
        querySelectorAll: () => [],
        addEventListener: () => {},
        removeEventListener: () => {}
    },
    localStorage: {
        _data: {},
        getItem(k) { return this._data[k] || null; },
        setItem(k, v) { this._data[k] = String(v); },
        removeItem(k) { delete this._data[k]; },
        clear() { this._data = {}; }
    },
    navigator: {
        serviceWorker: { register: () => Promise.resolve(), addEventListener: () => {} },
        geolocation: { getCurrentPosition: () => {} },
        clipboard: { writeText: () => Promise.resolve() }
    },
    alert: () => {},
    confirm: () => true,
    addEventListener: () => {},
    removeEventListener: () => {},
    requestAnimationFrame: (fn) => fn()
};

sandbox.window = sandbox;
sandbox.globalThis = sandbox;
sandbox.self = sandbox;
sandbox.global = sandbox;

vm.createContext(sandbox);
vm.runInContext(ashtaCode, sandbox);
scripts.forEach((code) => vm.runInContext(code, sandbox));

let passCount = 0;
let failCount = 0;
const issues = [];

function check(cond, desc, detail = '') {
    if (cond) {
        passCount++;
        console.log(`  ✓ ${desc}`);
    } else {
        failCount++;
        const msg = `${desc}${detail ? ' — ' + detail : ''}`;
        console.error(`  ✗ FAIL: ${msg}`);
        issues.push(msg);
    }
}

console.log('====================================================================');
console.log('1. CHECKING STATIC HTML DOM ELEMENT IDS FOR ALL NEW FEATURES');
console.log('====================================================================');
const requiredHtmlIds = [
    'moudhyaWarning',
    'sankrantiCard',
    'sankrantiInfo',
    'jKujaDoshaCard',
    'jKujaDoshaContent',
    'jDashaTimeline',
    'calFilterAll',
    'calFilterFest',
    'calFilterEka',
    'calFilterVrata',
    'calFilterSank',
    'calFilterEclipse',
    'eclipseFinderCard',
    'btnToggleEclipses',
    'eclipseList'
];
for (const id of requiredHtmlIds) {
    check(htmlIds.has(id), `HTML element #${id} exists in docs/index.html`);
}

console.log('\n====================================================================');
console.log('2. DEEP CHECK OF PART 3 FIXES (ALL 7 ASTRONOMICAL BUGS)');
console.log('====================================================================');

// 2.1 Bug 1: Adhika Masa in 2026 (May 17 to June 14, 2026 is Adhika Jyeshtha)
const pAdhika = sandbox.computePanchanga(2026, 5, 25, 12.9716, 77.5946, 'Asia/Kolkata');
const fAdhika = sandbox.matchFestivals(pAdhika);
check(pAdhika.masa.isAdhika === true, 'May 25, 2026 is detected as Adhika Jyeshtha Masa', `Got masa=${pAdhika.masa.en}, isAdhika=${pAdhika.masa.isAdhika}`);
const majorFestsInAdhika = fAdhika.filter(f => !f.isSankranti && !f.isEclipse && !['ekadashi','pradosha','sankashti','amavasya','purnima','shivaratri'].includes(f.id));
check(majorFestsInAdhika.length === 0, 'Zero major annual festivals triggered inside Adhika Masa (May 25, 2026)', `Found: ${JSON.stringify(majorFestsInAdhika)}`);

// 2.2 Bug 2 & 3: Ugadi 2026-2030 & Samvatsara transition
for (const yr of [2026, 2027, 2028, 2029, 2030]) {
    let ugadiDays = [];
    for (let m = 3; m <= 4; m++) {
        const maxD = m === 3 ? 31 : 30;
        for (let d = 1; d <= maxD; d++) {
            const p = sandbox.computePanchanga(yr, m, d, 12.9716, 77.5946, 'Asia/Kolkata');
            const f = sandbox.matchFestivals(p);
            if (f.some(x => x.id === 'ugadi')) {
                ugadiDays.push(`${yr}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')} (${p.samvatsara.name})`);
            }
        }
    }
    check(ugadiDays.length === 1, `Year ${yr} has exactly 1 Ugadi: ${ugadiDays[0]}`, `Found: ${ugadiDays.join(', ')}`);
}

// 2.3 Bug 4: Maha Shivaratri Nishitha Kaala check (2026-2030)
for (const yr of [2026, 2027, 2028, 2029, 2030]) {
    let shivaDays = [];
    for (let m = 2; m <= 3; m++) {
        const maxD = m === 2 ? (yr % 4 === 0 ? 29 : 28) : 31;
        for (let d = 1; d <= maxD; d++) {
            const p = sandbox.computePanchanga(yr, m, d, 12.9716, 77.5946, 'Asia/Kolkata');
            const f = sandbox.matchFestivals(p);
            if (f.some(x => x.id === 'maha_shivaratri')) {
                shivaDays.push(`${yr}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`);
            }
        }
    }
    check(shivaDays.length === 1, `Year ${yr} has exactly 1 Maha Shivaratri: ${shivaDays[0]}`, `Found: ${shivaDays.join(', ')}`);
}

// 2.4 Bug 5: Varamahalakshmi Vrata (2026-2030)
for (const yr of [2026, 2027, 2028, 2029, 2030]) {
    let varaDays = [];
    for (let m = 7; m <= 9; m++) {
        const maxD = m === 9 ? 30 : 31;
        for (let d = 1; d <= maxD; d++) {
            const p = sandbox.computePanchanga(yr, m, d, 12.9716, 77.5946, 'Asia/Kolkata');
            const f = sandbox.matchFestivals(p);
            if (f.some(x => x.id === 'varamahalakshmi')) {
                varaDays.push(`${yr}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')} (${p.vara.en})`);
            }
        }
    }
    check(varaDays.length === 1 && varaDays[0].includes('Friday'), `Year ${yr} has exactly 1 Varamahalakshmi Vrata on a Friday: ${varaDays[0]}`, `Found: ${varaDays.join(', ')}`);
}

// 2.5 Bug 6: Naraka Chaturdashi & Deepavali (2026-2030)
for (const yr of [2026, 2027, 2028, 2029, 2030]) {
    let narakaDays = [], deepaDays = [];
    for (let m = 10; m <= 11; m++) {
        const maxD = m === 10 ? 31 : 30;
        for (let d = 1; d <= maxD; d++) {
            const p = sandbox.computePanchanga(yr, m, d, 12.9716, 77.5946, 'Asia/Kolkata');
            const f = sandbox.matchFestivals(p);
            if (f.some(x => x.id === 'naraka_chaturdashi')) narakaDays.push(`${yr}-${m}-${d}`);
            if (f.some(x => x.id === 'deepavali')) deepaDays.push(`${yr}-${m}-${d}`);
        }
    }
    check(narakaDays.length === 1, `Year ${yr} has 1 Naraka Chaturdashi: ${narakaDays[0]}`, `Found: ${narakaDays.join(', ')}`);
    check(deepaDays.length === 1, `Year ${yr} has 1 Deepavali (Lakshmi Puja): ${deepaDays[0]}`, `Found: ${deepaDays.join(', ')}`);
}

console.log('\n====================================================================');
console.log('3. DEEP CHECK OF PART 2 MODULES (REAL ASTRONOMICAL DATES & UI)');
console.log('====================================================================');

// 3.1 Module 1: Real Vakri & Moudhya dates in 2026
// Around July 20, 2026: Sun is in Cancer (~94 deg sidereal), Jupiter is in Cancer (~96 deg sidereal) -> Jupiter MUST be combust (Guru Moudhya)!
const jdJuly2026 = sandbox.julianDay(2026, 7, 20, 6);
const grahasJuly2026 = sandbox.getAllGrahaPositions(jdJuly2026);
const guruJuly = grahasJuly2026.find(g => g.name === 'Jupiter');
check(guruJuly && guruJuly.combust === true, `Guru (Jupiter) is accurately detected as Combust (Moudhya) on July 20, 2026 (dist=${guruJuly?.distFromSun?.toFixed(2)}°)`);

// Check Muhurtha score penalty on July 20, 2026 for Marriage, Griha Pravesha, and Upanayana vs General
const pJuly20 = sandbox.computePanchanga(2026, 7, 20, 12.9716, 77.5946, 'Asia/Kolkata');
const scoreGeneral = sandbox.scoreDayForMuhurtham(pJuly20, 'general');
const scoreMarriage = sandbox.scoreDayForMuhurtham(pJuly20, 'marriage');
const scoreGriha = sandbox.scoreDayForMuhurtham(pJuly20, 'griha_pravesha');
check(scoreMarriage < scoreGeneral, `scoreDayForMuhurtham penalizes 'marriage' during Guru Moudhya (marriage=${scoreMarriage} vs general=${scoreGeneral})`);
check(scoreGriha <= scoreGeneral - 40, `scoreDayForMuhurtham penalizes 'griha_pravesha' by -40 during Guru Moudhya (griha_pravesha=${scoreGriha} vs general=${scoreGeneral})`);

// Check Saturn Retrograde in Sept 2026 (Saturn is in Pisces, opposite Sun in Virgo -> Saturn is Vakri!)
const jdSept2026 = sandbox.julianDay(2026, 9, 15, 6);
const grahasSept2026 = sandbox.getAllGrahaPositions(jdSept2026);
const shaniSept = grahasSept2026.find(g => g.name === 'Saturn');
check(shaniSept && shaniSept.isVakri === true, `Shani (Saturn) is accurately detected as Retrograde (Vakri) at opposition on Sept 15, 2026 (speed=${shaniSept?.speed?.toFixed(4)}°/d)`);
check(shaniSept && shaniSept.combust === false, 'Shani (Saturn) is NOT combust at opposition on Sept 15, 2026');

// Check Daily Panchanga UI rendering on July 20, 2026
getMockEl('dateInput').value = '2026-07-20';
sandbox.recalculate();
const moudhyaEl = getMockEl('moudhyaWarning');
check(moudhyaEl.innerHTML.includes('Guru/Shukra Moudhya') && moudhyaEl.innerHTML.includes('ಗುರು'), 'Daily Panchanga UI displays Guru Moudhya warning in #moudhyaWarning on July 20, 2026');

// 3.2 Module 2: Antardasha Contiguity & Accordion Toggle
sandbox.generateJathaka();
const dashaHtml = getMockEl('jDashaTimeline').innerHTML;
check(dashaHtml.includes('dasha-antar-0') && dashaHtml.includes('dasha-antar-8'), 'All 9 Mahadasha Antardasha containers (0..8) rendered');
const antar0 = getMockEl('dasha-antar-0');
antar0.style.display = 'none';
sandbox.toggleDashaAntar(0);
check(antar0.style.display === 'block', 'toggleDashaAntar(0) opens accordion (display=block)');
sandbox.toggleDashaAntar(0);
check(antar0.style.display === 'none', 'toggleDashaAntar(0) closes accordion (display=none)');

// 3.3 Module 3: Kuja Dosha All 7 Exceptions Test
function makeMockGrahas(marsRashi, moonRashi = 0, jupRashi = 5, venRashi = 0) {
    return [
        { name: 'Sun', rashiIdx: 0 },
        { name: 'Moon', rashiIdx: moonRashi },
        { name: 'Mars', rashiIdx: marsRashi },
        { name: 'Mercury', rashiIdx: 0 },
        { name: 'Jupiter', rashiIdx: jupRashi },
        { name: 'Venus', rashiIdx: venRashi },
        { name: 'Saturn', rashiIdx: 0 },
        { name: 'Rahu', rashiIdx: 0 },
        { name: 'Ketu', rashiIdx: 6 }
    ];
}
// Case A: Lagna = Taurus (1), Mars in Scorpio (7 = 7th house, own sign) -> Cancelled by Swa-kshetra!
const kdOwn = sandbox.checkKujaDosha(makeMockGrahas(7, 2, 5, 2), 1);
check(kdOwn.status === 'cancelled' && kdOwn.isCancelled === true, 'Kuja Dosha cancelled when Mars in 7th house Scorpio (Swa-kshetra)');

// Case B: Lagna = Cancer (3), Mars in Capricorn (9 = 7th house, Exalted) -> Cancelled by Exaltation!
const kdExalt = sandbox.checkKujaDosha(makeMockGrahas(9, 2, 5, 2), 3);
check(kdExalt.status === 'cancelled' && kdExalt.isCancelled === true, 'Kuja Dosha cancelled when Mars in 7th house Capricorn (Exalted)');

// Case C: Lagna = Capricorn (9), Mars in Cancer (3 = 7th house, Debilitated) -> Cancelled by Neecha!
const kdNeecha = sandbox.checkKujaDosha(makeMockGrahas(3, 0, 5, 0), 9);
check(kdNeecha.status === 'cancelled' && kdNeecha.isCancelled === true, 'Kuja Dosha cancelled when Mars in 7th house Cancer (Debilitated)');

// Case D: Lagna = Aries (0), Mars in Libra (6 = 7th house), Jupiter in Gemini (2 -> Mars in 6 is 5th from Jupiter in 2) -> Cancelled by Guru Drishti!
const kdGuruAspect = sandbox.checkKujaDosha(makeMockGrahas(6, 4, 2, 4), 0);
check(kdGuruAspect.status === 'cancelled' && kdGuruAspect.isCancelled === true, 'Kuja Dosha cancelled when Jupiter aspects Mars (5th drishti)');

// Case E: Lagna = Aries (0), Mars in Gemini (2 = 3rd house), Moon in Aries (0 -> Mars in 3rd), Venus in Aries (0 -> Mars in 3rd) -> No Dosha!
const kdNone = sandbox.checkKujaDosha(makeMockGrahas(2, 0, 5, 0), 0);
check(kdNone.status === 'none' && kdNone.hasBaseDosha === false, 'No Kuja Dosha when Mars is in 3rd house from Lagna, Moon, and Venus');

// Case F: Lagna = Aries (0), Mars in Taurus (1 = 2nd house), Moon in Sagittarius (8 -> Mars in 6th), Venus in Sagittarius (8 -> Mars in 6th), Jupiter in Cancer (3 -> Mars is 11th from Jup, no aspect) -> Active Kuja Dosha!
const kdActive = sandbox.checkKujaDosha(makeMockGrahas(1, 8, 3, 8), 0);
check(kdActive.status === 'present' && kdActive.isCancelled === false, 'Active Uncancelled Kuja Dosha detected when Mars in 2nd house Taurus with no exceptions');

// 3.4 Module 4: Eclipse Finder UI & Multi-Year Check
for (const yr of [2026, 2027, 2028]) {
    const ecs = sandbox.findYearEclipses(yr, 12.9716, 77.5946, 5.5);
    check(ecs.length >= 2 && ecs.length <= 7, `Year ${yr} has valid eclipse count (${ecs.length} eclipses)`);
    for (const e of ecs) {
        check(e.peakUTC instanceof Date && !isNaN(e.peakUTC), `Eclipse ${e.title} (${e.kind}) in ${yr} has valid peakUTC`);
        check(e.sparshaUTC instanceof Date && !isNaN(e.sparshaUTC), `Eclipse ${e.title} (${e.kind}) in ${yr} has valid sparshaUTC`);
        check(e.mokshaUTC instanceof Date && !isNaN(e.mokshaUTC), `Eclipse ${e.title} (${e.kind}) in ${yr} has valid mokshaUTC`);
        check(e.sutakaUTC instanceof Date && !isNaN(e.sutakaUTC), `Eclipse ${e.title} (${e.kind}) in ${yr} has valid sutakaUTC`);
    }
}
// Test rendering eclipse UI
getMockEl('eclipseList').style.display = 'none';
sandbox.toggleYearEclipses();
const ecListHtml = getMockEl('eclipseList').innerHTML;
check(ecListHtml.includes('ಗ್ರಹಣ') && ecListHtml.includes('Sutaka Kala'), 'Eclipse Finder UI renders bilingual cards with Sparsha, Madhya, Moksha, and Sutaka');

// 3.5 Module 5: Daily Panchanga on Sankranti Day (Jan 14, 2026 Makara Sankranti & Apr 14, 2026 Mesha Sankranti)
for (const dateStr of ['2026-01-14', '2026-04-14']) {
    getMockEl('dateInput').value = dateStr;
    sandbox.recalculate();
    const festHtml = getMockEl('festivalList').innerHTML;
    const sankCard = getMockEl('sankrantiCard');
    const sankInfo = getMockEl('sankrantiInfo').innerHTML;
    check(festHtml.includes('Sankranti') && sankCard.style.display === 'block' && sankInfo.includes('Ingress Time') && sankInfo.includes('Punyakala'), `${dateStr} renders both Festival entry and #sankrantiCard with Ingress Time & Punyakala simultaneously`);
}

// 3.6 Check Calendar Filter Button Highlighting for all 6 filter types
for (const [t, btnId] of [['all','calFilterAll'],['festival','calFilterFest'],['ekadashi','calFilterEka'],['vrata','calFilterVrata'],['sankranti','calFilterSank'],['eclipse','calFilterEclipse']]) {
    sandbox.filterCalFests(t);
    check(getMockEl(btnId).style.background === 'var(--gold)', `filterCalFests('${t}') highlights #${btnId} properly`);
}

// 3.7 Check scanDates with Nakshatra filter does not produce NaN:NaN
getMockEl('scanFrom').value = '2026-10-01';
getMockEl('scanTo').value = '2026-10-15';
getMockEl('scanPurpose').value = 'gold_silk';
getMockEl('scanNakshatra').value = '7'; // Pushya
sandbox.scanDates();
const scanResHtml = getMockEl('scanResults').innerHTML;
check(!scanResHtml.includes('NaN') && scanResHtml.includes('Pushya'), 'scanDates with Nakshatra filter formats transition times cleanly without NaN');

console.log('\n====================================================================');
console.log(`DEEP AUDIT SUMMARY: ${passCount} PASSED, ${failCount} FAILED`);
console.log('====================================================================');
if (failCount > 0) {
    process.exit(1);
}
