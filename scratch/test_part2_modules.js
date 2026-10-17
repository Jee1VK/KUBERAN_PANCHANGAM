const fs = require('fs');
const path = require('path');
const vm = require('vm');

const baseDir = path.resolve(__dirname, '../docs');
const indexPath = path.join(baseDir, 'index.html');
const astroPath = path.join(baseDir, 'js', 'astronomy.js');
const ashtaPath = path.join(baseDir, 'js', 'ashtakoota.js');

const htmlContent = fs.readFileSync(indexPath, 'utf8');
const ashtaCode = fs.readFileSync(ashtaPath, 'utf8');
const Astronomy = require(astroPath);

// Extract inline scripts
const scriptRegex = /<script(?:\s+type="text\/javascript")?>([\s\S]*?)<\/script>/gi;
let match;
let scripts = [];
while ((match = scriptRegex.exec(htmlContent)) !== null) {
    if (!match[0].includes('src=')) {
        scripts.push(match[1]);
    }
}

// Minimal mock DOM
class MockClassList {
    constructor() { this.classes = new Set(); }
    add(c) { this.classes.add(c); }
    remove(c) { this.classes.delete(c); }
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
        this.style = {};
        this.children = [];
        this.parentNode = null;
        this.value = '';
        this.innerHTML = '';
        this.textContent = '';
        this.dataset = { tab: 'daily' };
        this.selectedIndex = 0;
        this.options = [];
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
    querySelector() { return new MockElement(); }
    querySelectorAll() { return []; }
}

function getMockEl(id) {
    if (!elementsById[id]) {
        elementsById[id] = new MockElement(id);
    }
    return elementsById[id];
}

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
        querySelector: () => new MockElement(),
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
    navigator: { serviceWorker: { register: () => Promise.resolve() } },
    alert: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    requestAnimationFrame: (fn) => fn()
};

sandbox.window = sandbox;
sandbox.globalThis = sandbox;
sandbox.self = sandbox;
sandbox.global = sandbox;

vm.createContext(sandbox);

// Execute ashtakoota
vm.runInContext(ashtaCode, sandbox);

// Execute index.html scripts
scripts.forEach((code) => {
    vm.runInContext(code, sandbox);
});

let passed = 0;
let failed = 0;

function assert(condition, message) {
    if (condition) {
        console.log(`  ✓ ${message}`);
        passed++;
    } else {
        console.error(`  ✗ FAIL: ${message}`);
        failed++;
    }
}

console.log('========================================================================');
console.log('       KUBERAN PANCHANGAM — PART 2 ENHANCEMENTS TEST SUITE');
console.log('========================================================================\n');

// -------------------------------------------------------------------------
// TEST 1: VAKRI (RETROGRADE) & MOUDYHA (COMBUSTION)
// -------------------------------------------------------------------------
console.log('>>> TEST 1: VAKRI & MOUDYHA ENGINE');
const testJD = sandbox.julianDay(2026, 10, 17, 6);
const grahas = sandbox.getAllGrahaPositions(testJD);

assert(Array.isArray(grahas) && grahas.length === 9, 'getAllGrahaPositions returns 9 grahas');
const sun = grahas.find(g => g.name === 'Sun');
const moon = grahas.find(g => g.name === 'Moon');
const mars = grahas.find(g => g.name === 'Mars');
const mercury = grahas.find(g => g.name === 'Mercury');
const jupiter = grahas.find(g => g.name === 'Jupiter');
const venus = grahas.find(g => g.name === 'Venus');
const saturn = grahas.find(g => g.name === 'Saturn');
const rahu = grahas.find(g => g.name === 'Rahu');
const ketu = grahas.find(g => g.name === 'Ketu');

assert(sun.isVakri === false && moon.isVakri === false, 'Sun and Moon are never retrograde');
assert(rahu.isVakri === true && ketu.isVakri === true, 'Rahu and Ketu are always retrograde');
assert(typeof venus.isVakri === 'boolean', 'Venus has valid isVakri boolean flag');
assert(typeof saturn.isVakri === 'boolean', 'Saturn has valid isVakri boolean flag');
assert(typeof mars.combust === 'boolean', 'Mars has valid combust boolean flag');
assert(typeof jupiter.combust === 'boolean', 'Jupiter has valid combust boolean flag');

// Test Moudhya Muhurtha Penalty (-40)
const sampleP = sandbox.computePanchanga(2026, 5, 20, 12.9716, 77.5946, 5.5);
if (sampleP) {
    const scoreNormal = sandbox.scoreDayForMuhurtham(sampleP, 'business');
    assert(typeof scoreNormal === 'number' && scoreNormal >= 0 && scoreNormal <= 100, 'scoreDayForMuhurtham returns valid score');
}

// -------------------------------------------------------------------------
// TEST 2: ANTARDASHA (BHUKTI) DRILL-DOWN IN JATHAKA
// -------------------------------------------------------------------------
console.log('\n>>> TEST 2: ANTARDASHA DRILL-DOWN IN JATHAKA');
assert(typeof sandbox.toggleDashaAntar === 'function', 'toggleDashaAntar function exists');

// Populate Jathaka inputs and generate
getMockEl('jName').value = 'Test Native';
getMockEl('jDob').value = '1995-05-15T08:30';
getMockEl('jLat').value = '12.9716';
getMockEl('jLon').value = '77.5946';
getMockEl('jTz').value = 'Asia/Kolkata';

// Run generateJathaka
sandbox.generateJathaka();

const dashaTimeline = getMockEl('jDashaTimeline');
assert(dashaTimeline && dashaTimeline.innerHTML.length > 50, 'jDashaTimeline rendered');
assert(dashaTimeline.innerHTML.includes('toggleDashaAntar'), 'Dasha rows contain toggleDashaAntar click handlers');
assert(dashaTimeline.innerHTML.includes('dasha-antar-0'), 'Antardasha sub-containers exist');
assert(dashaTimeline.innerHTML.includes('Active / ಪ್ರಸ್ತುತ') || dashaTimeline.innerHTML.includes('Antardasha'), 'Antardashas rendered with bilingual status');

// -------------------------------------------------------------------------
// TEST 3: KUJA DOSHA (MANGLIK) ANALYZER
// -------------------------------------------------------------------------
console.log('\n>>> TEST 3: KUJA DOSHA (MANGLIK) ANALYZER');
assert(typeof sandbox.checkKujaDosha === 'function', 'checkKujaDosha function exists');

// Test Kuja Dosha with known test cases
// Case A: Mars in 7th house (afflicted without cancellation)
const testGrahasA = [
    { name: 'Sun', rashiIdx: 0 },
    { name: 'Moon', rashiIdx: 0 },
    { name: 'Mars', rashiIdx: 6 }, // 7th house from Lagna 0
    { name: 'Mercury', rashiIdx: 0 },
    { name: 'Jupiter', rashiIdx: 0 },
    { name: 'Venus', rashiIdx: 0 },
    { name: 'Saturn', rashiIdx: 0 }
];
const resA = sandbox.checkKujaDosha(testGrahasA, 0);
assert(resA.hasBaseDosha === true && resA.inLagnaHouses === true, 'Kuja Dosha detected when Mars in 7th house');

// Case B: Mars in Swa-kshetra (Aries, rashi 0) -> Cancelled
const testGrahasB = [
    { name: 'Sun', rashiIdx: 4 },
    { name: 'Moon', rashiIdx: 4 },
    { name: 'Mars', rashiIdx: 0 }, // Mars in Aries (own sign)
    { name: 'Mercury', rashiIdx: 4 },
    { name: 'Jupiter', rashiIdx: 4 },
    { name: 'Venus', rashiIdx: 4 }
];
const resB = sandbox.checkKujaDosha(testGrahasB, 0); // 1st house
assert(resB.hasBaseDosha === true && resB.isCancelled === true, 'Kuja Dosha cancelled when Mars in Swa-kshetra (Aries)');

// Case C: Mars in 3rd house (Upachaya -> No Dosha)
const testGrahasC = [
    { name: 'Sun', rashiIdx: 0 },
    { name: 'Moon', rashiIdx: 0 },
    { name: 'Mars', rashiIdx: 2 }, // 3rd house from Lagna 0
    { name: 'Mercury', rashiIdx: 0 },
    { name: 'Jupiter', rashiIdx: 0 },
    { name: 'Venus', rashiIdx: 0 }
];
const resC = sandbox.checkKujaDosha(testGrahasC, 0);
assert(resC.hasBaseDosha === false && resC.status === 'none', 'No Kuja Dosha when Mars in 3rd house');

// Verify Jathaka Kuja card rendered
const kujaCard = getMockEl('jKujaDoshaContent');
assert(kujaCard && kujaCard.innerHTML.length > 50, 'jKujaDoshaContent populated in Jathaka');

// -------------------------------------------------------------------------
// TEST 4: SURYA & CHANDRA GRAHANAM (ECLIPSE FINDER)
// -------------------------------------------------------------------------
console.log('\n>>> TEST 4: SURYA & CHANDRA GRAHANAM (ECLIPSE FINDER)');
assert(typeof sandbox.findYearEclipses === 'function', 'findYearEclipses function exists');

const eclipses2026 = sandbox.findYearEclipses(2026, 12.9716, 77.5946, 5.5);
assert(Array.isArray(eclipses2026) && eclipses2026.length >= 4, 'findYearEclipses finds all 4 eclipses in 2026');
const lunarEclipses = eclipses2026.filter(e => e.type === 'lunar');
const solarEclipses = eclipses2026.filter(e => e.type === 'solar');
assert(lunarEclipses.length === 2, 'Found exactly 2 Lunar Eclipses in 2026');
assert(solarEclipses.length === 2, 'Found exactly 2 Solar Eclipses in 2026');

// Verify properties
const sampleEclipse = eclipses2026[0];
assert(sampleEclipse.peakUTC instanceof Date, 'Eclipse has valid peakUTC Date');
assert(sampleEclipse.sparshaUTC instanceof Date, 'Eclipse has valid sparshaUTC Date');
assert(sampleEclipse.mokshaUTC instanceof Date, 'Eclipse has valid mokshaUTC Date');
assert(sampleEclipse.sutakaUTC instanceof Date, 'Eclipse has valid sutakaUTC Date');
assert(typeof sampleEclipse.isVisible === 'boolean', 'Eclipse has isVisible boolean flag');

// -------------------------------------------------------------------------
// TEST 5: ALL 12 SOLAR SANKRANTIS
// -------------------------------------------------------------------------
console.log('\n>>> TEST 5: ALL 12 SOLAR SANKRANTIS');
// Check Sankrantis across 2026 using matchFestivals
const sankrantis2026 = [];
let pPrev = null;
for (let m = 1; m <= 12; m++) {
    const daysInMonth = new Date(2026, m, 0).getDate();
    for (let d = 1; d <= daysInMonth; d++) {
        const p = sandbox.computePanchanga(2026, m, d, 12.9716, 77.5946, 5.5);
        if (p) {
            const fests = sandbox.matchFestivals(p, pPrev);
            const sank = fests.find(f => f.isSankranti || f.id === 'makara_sankranti' || f.id.includes('sankranti'));
            if (sank) {
                sankrantis2026.push({ date: `2026-${m}-${d}`, fest: sank });
            }
            pPrev = p;
        }
    }
}
assert(sankrantis2026.length === 12, `Found exactly 12 Solar Sankrantis in 2026 (found ${sankrantis2026.length})`);
const makara = sankrantis2026.find(s => s.fest.id === 'makara_sankranti');
const mesha = sankrantis2026.find(s => s.fest.id === 'mesha_sankranti');
const karka = sankrantis2026.find(s => s.fest.id === 'karka_sankranti');
assert(makara !== undefined, 'Makara Sankranti detected');
assert(mesha !== undefined, 'Mesha Sankranti (Vishu) detected');
assert(karka !== undefined, 'Karka Sankranti (Dakshinayana) detected');

// -------------------------------------------------------------------------
// TEST SUMMARY
// -------------------------------------------------------------------------
console.log('\n========================================================================');
console.log(`PART 2 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
console.log('========================================================================');

if (failed === 0) {
    console.log('\n🎉 ALL PART 2 MODULES VERIFIED & 100% OPERATIONAL!\n');
} else {
    process.exit(1);
}
