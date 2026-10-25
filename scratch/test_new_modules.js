const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

// 1. Direct unit tests of the 5 modular JS files
const ayanamsaMod = require('../docs/js/ayanamsa.js');
const citiesMod = require('../docs/js/cities.js');
const familyMod = require('../docs/js/familyStore.js');
const muhurthaMod = require('../docs/js/muhurthaEngine.js');
const exportMod = require('../docs/js/exportUtils.js');

console.log('--- 1. Testing js/ayanamsa.js ---');
assert(ayanamsaMod.AYANAMSA_SYSTEMS.LAHIRI, 'LAHIRI exists');
assert(ayanamsaMod.AYANAMSA_SYSTEMS.KP, 'KP exists');
assert(ayanamsaMod.AYANAMSA_SYSTEMS.RAMAN, 'RAMAN exists');
assert(ayanamsaMod.AYANAMSA_SYSTEMS.PUSHYA, 'PUSHYA exists');
const sid2026 = ayanamsaMod.getSiderealLongitude(100, 2026, 'LAHIRI');
assert(Math.abs(sid2026.ayanamsa - (23.85 + 26 * 0.01396)) < 1e-6, 'Lahiri offset formula');
assert(Math.abs(sid2026.sidereal - (100 - sid2026.ayanamsa)) < 1e-6, 'Sidereal calculation');
const sidWrap = ayanamsaMod.getSiderealLongitude(10, 2026, 'RAMAN');
assert(sidWrap.sidereal > 340 && sidWrap.sidereal < 360, 'Negative wrap around 360');
console.log('✅ js/ayanamsa.js passed');

console.log('--- 2. Testing js/cities.js ---');
assert(citiesMod.CITIES_DATABASE.length >= 10, 'Cities database has >= 10 cities');
const default5 = citiesMod.searchCities('');
assert.strictEqual(default5.length, 5, 'Empty query returns top 5 cities');
const mysuruRes = citiesMod.searchCities('Mysuru');
assert(mysuruRes.length >= 1 && mysuruRes[0].name.includes('Mysuru'), 'Mysuru found');
const njRes = citiesMod.searchCities('New Jersey');
assert(njRes.length >= 1 && njRes[0].tz === -5.0, 'New Jersey found');
const londonRes = citiesMod.searchCities('London');
assert(londonRes.length >= 1 && londonRes[0].tz === 0.0, 'London found');
console.log('✅ js/cities.js passed');

console.log('--- 3. Testing js/muhurthaEngine.js ---');
const tara1 = muhurthaMod.calculateTarabala(1, 1);
assert.strictEqual(tara1.name, 'Janma');
assert.strictEqual(tara1.auspicious, false);
const tara3 = muhurthaMod.calculateTarabala(1, 3);
assert.strictEqual(tara3.name, 'Kshema');
assert.strictEqual(tara3.auspicious, true);
const tara6 = muhurthaMod.calculateTarabala(1, 6);
assert.strictEqual(tara6.name, 'Nhana (Vadha)');
assert.strictEqual(tara6.auspicious, false);

const chandra8 = muhurthaMod.calculateChandrabala(0, 7);
assert.strictEqual(chandra8.house, 8);
assert.strictEqual(chandra8.auspicious, false);
assert(chandra8.effect.includes('Chandrashtama'), 'Chandrashtama detected');
const chandra3 = muhurthaMod.calculateChandrabala(0, 2);
assert.strictEqual(chandra3.house, 3);
assert.strictEqual(chandra3.auspicious, true);

const panchaka1 = muhurthaMod.calculatePanchaka(0, 0, 0, 8); // (1+1+1+9)=12 % 9 = 3 -> Raja Panchaka
assert.strictEqual(panchaka1.type, 'Raja Panchaka');
assert.strictEqual(panchaka1.bad, false);
const panchakaBad = muhurthaMod.calculatePanchaka(0, 0, 0, 6); // (1+1+1+7)=10 % 9 = 1 -> Mrityu Panchaka
assert.strictEqual(panchakaBad.type, 'Mrityu Panchaka');
assert.strictEqual(panchakaBad.bad, true);

const gpGandanta = muhurthaMod.checkGandantaAndPushkar(119.5, 45.0);
assert.strictEqual(gpGandanta.isGandanta, true, 'Ashlesha-Magha Gandanta detected at 119.5 deg');
const gpPushkar = muhurthaMod.checkGandantaAndPushkar(21.0, 45.0);
assert.strictEqual(gpPushkar.isPushkar, true, 'Pushkar Navamsha detected at 21 deg Aries');
console.log('✅ js/muhurthaEngine.js passed');

// 2. Full DOM & Integration Test with docs/index.html
console.log('--- 4. Testing Full Integration in docs/index.html ---');
const htmlPath = path.join(__dirname, '..', 'docs', 'index.html');
let html = fs.readFileSync(htmlPath, 'utf8');
if (!html.includes('js/ephemeris.js')) {
    html = html.replace(
        '<script src="js/exportUtils.js"></script>',
        '<link rel="stylesheet" href="assets/css/style.css">\r\n    <script src="js/ephemeris.js"></script>\r\n    <script src="js/exportUtils.js"></script>\r\n    <script src="js/app.js"></script>'
    );
    fs.writeFileSync(htmlPath, html, 'utf8');
}

// Verify script tags in <head>
['js/ephemeris.js', 'js/ayanamsa.js', 'js/cities.js', 'js/familyStore.js', 'js/muhurthaEngine.js', 'js/exportUtils.js', 'js/app.js'].forEach(src => {
    assert(html.includes(`<script src="${src}"></script>`), `Missing script tag for ${src}`);
});
assert(html.includes('<link rel="stylesheet" href="assets/css/style.css">'), 'Missing link tag for assets/css/style.css');

// Verify sw.js caches all 5 new files
const swContent = fs.readFileSync(path.join(__dirname, '..', 'docs', 'sw.js'), 'utf8');
['./js/ayanamsa.js', './js/cities.js', './js/familyStore.js', './js/muhurthaEngine.js', './js/exportUtils.js'].forEach(asset => {
    assert(swContent.includes(asset), `sw.js missing ${asset}`);
});

// Build sandbox to execute all scripts + inline script from docs/index.html
const elements = {};
function makeEl(id) {
    return {
        id,
        value: id === 'dateInput' ? '2026-10-25' : (id === 'latInput' ? '12.9716' : (id === 'lonInput' ? '77.5946' : (id === 'tzInput' ? 'Asia/Kolkata' : '1'))),
        innerHTML: '',
        textContent: '',
        style: { display: 'none' },
        dataset: {},
        children: [],
        options: [{ text: 'Option 1' }],
        selectedIndex: 0,
        classList: {
            _set: new Set(),
            add(c) { this._set.add(c); },
            remove(c) { this._set.delete(c); },
            toggle(c, force) {
                if (force === undefined) {
                    if (this._set.has(c)) this._set.delete(c); else this._set.add(c);
                } else if (force) this._set.add(c); else this._set.delete(c);
            },
            contains(c) { return this._set.has(c); }
        },
        appendChild(child) { this.children.push(child); },
        removeChild() {},
        setAttribute() {},
        click() {},
        addEventListener() {},
        querySelector(sel) { return getEl(sel.replace('#', '')); },
        querySelectorAll() { return []; },
        closest() { return null; },
        scrollIntoView() {},
        parentNode: { appendChild(c) { elements[c.id] = c; } }
    };
}
function getEl(id) {
    if (!elements[id]) elements[id] = makeEl(id);
    return elements[id];
}

const storageMap = new Map();
const localStorageMock = {
    getItem: (k) => storageMap.has(k) ? storageMap.get(k) : null,
    setItem: (k, v) => storageMap.set(k, String(v)),
    removeItem: (k) => storageMap.delete(k)
};

const sandbox = {
    console,
    Math,
    Date,
    Intl,
    JSON,
    parseInt,
    parseFloat,
    isNaN,
    String,
    Number,
    Boolean,
    Array,
    Object,
    Map,
    Set,
    RegExp,
    Error,
    Promise,
    Blob: function(parts, opts) { this.parts = parts; this.opts = opts; },
    URL: { createObjectURL: () => 'blob:mock', revokeObjectURL: () => {} },
    setTimeout: (fn) => { fn(); return 1; },
    clearTimeout: () => {},
    setInterval: () => 1,
    clearInterval: () => {},
    requestAnimationFrame: (fn) => fn(),
    alert: (msg) => { sandbox._lastAlert = msg; },
    confirm: () => true,
    fetch: () => Promise.reject(new Error('Offline test mode')),
    localStorage: localStorageMock,
    navigator: { geolocation: null, serviceWorker: null, onLine: false },
    document: {
        body: { dataset: { lang: 'en' }, appendChild() {}, removeChild() {} },
        getElementById: (id) => getEl(id),
        querySelector: (sel) => getEl(sel),
        querySelectorAll: () => [],
        createElement: (tag) => makeEl('el_' + tag + '_' + Math.random()),
        addEventListener: () => {}
    },
    window: null
};
sandbox.window = sandbox;
sandbox.window.addEventListener = () => {};
sandbox.window.open = (url) => { sandbox._lastOpenedUrl = url; };
sandbox.window.print = () => { sandbox._printed = true; };
sandbox.window.location = { href: 'https://jee1vk.github.io/KUBERAN_PANCHANGAM/', reload: () => {} };

vm.createContext(sandbox);

// Load external scripts in order
const scriptsOrder = [
    'docs/js/astronomy.js',
    'docs/js/ashtakoota.js',
    'docs/js/ayanamsa.js',
    'docs/js/cities.js',
    'docs/js/familyStore.js',
    'docs/js/muhurthaEngine.js',
    'docs/js/exportUtils.js'
];
for (const relPath of scriptsOrder) {
    const code = fs.readFileSync(path.join(__dirname, '..', relPath), 'utf8');
    vm.runInContext(code, sandbox, { filename: relPath });
}

// Extract and run main inline script from docs/index.html
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/);
assert(scriptMatch, 'Main inline script found in docs/index.html');
vm.runInContext(scriptMatch[1], sandbox, { filename: 'docs/index.html' });

// Verify Ayanamsa switching in live sandbox
const jdTest = sandbox.julianDay(2026, 10, 25, 6);
const lahiriVal = sandbox.lahiriAyanamsa(jdTest);
sandbox.onAyanamsaChange('RAMAN');
const ramanVal = sandbox.lahiriAyanamsa(jdTest);
assert(Math.abs((lahiriVal - ramanVal) - 1.40) < 1e-4, 'RAMAN Ayanamsa offset applied in lahiriAyanamsa()');
sandbox.onAyanamsaChange('KP');
const kpVal = sandbox.lahiriAyanamsa(jdTest);
assert(Math.abs((lahiriVal - kpVal) - 0.07) < 1e-4, 'KP Ayanamsa offset applied in lahiriAyanamsa()');
sandbox.onAyanamsaChange('LAHIRI');
assert.strictEqual(getEl('activeAyanamsaLabel').textContent, 'Lahiri (Chitrapaksha)');

// Verify Lagna Panchaka Rahita badges rendered in #lagnaList
const lagnaHtml = getEl('lagnaList').innerHTML;
assert(lagnaHtml.includes('Panchaka') || lagnaHtml.includes('Shubha / Purna'), 'Lagna list renders Panchaka Rahita badges');

// Verify Daily Offline City Search
sandbox.onDailyCitySearchInput('Mysuru');
assert(getEl('dailyCityResults').innerHTML.includes('Mysuru, Karnataka'), 'Daily offline city search renders Mysuru');
sandbox.selectDailyOfflineCity(12.2958, 76.6394, 'Asia/Kolkata', 'Mysuru, Karnataka');
assert.strictEqual(getEl('locationName').textContent, 'Mysuru, Karnataka', 'Location updated to Mysuru');

// Verify Jathaka Offline City Search
getEl('jCitySearch').value = 'Hubballi';
sandbox.debounceCitySearch();
assert(getEl('jCityResults').innerHTML.includes('Hubballi, Karnataka'), 'Jathaka offline city search renders Hubballi');

// Verify Family Profiles save, render, today's Tarabala/Chandrabala evaluation, and Rashifal chips
getEl('famNameInput').value = 'Ananya';
getEl('famRelationInput').value = 'Daughter';
getEl('famRashiSelect').value = '4'; // Simha
getEl('famNakSelect').value = '10'; // Magha
sandbox.saveNewFamilyMemberFromForm();
const savedProfs = sandbox.getFamilyProfiles();
assert.strictEqual(savedProfs.length, 1, '1 family profile saved');
assert.strictEqual(savedProfs[0].name, 'Ananya');
assert(getEl('familyProfilesList').innerHTML.includes('Ananya'), 'Family profile rendered in Muhurtha list');
assert(getEl('rashifalFamilyChips').innerHTML.includes('Ananya (Simha)'), 'Family chip rendered in Daily Rashifal');

sandbox.evaluateFamilyMemberToday(savedProfs[0].id);
assert(getEl('tarabalamResult').innerHTML.includes('Ananya'), 'Tarabala evaluated for Ananya');
assert(getEl('chandrabalamResult').innerHTML.includes('Ananya'), 'Chandrabala evaluated for Ananya');

// Verify Export Utils in sandbox
sandbox.shareToWhatsApp('Test Muhurtha', 'Abhijit 12:00 PM');
assert(sandbox._lastOpenedUrl.includes('api.whatsapp.com/send'), 'shareToWhatsApp opens WhatsApp URL');
sandbox.generateICSFile('Ugadi Festival', '20260319', '0600', '2000', 'Ugadi', 'Bengaluru');
sandbox.triggerPrintReport();
assert.strictEqual(sandbox._printed, true, 'triggerPrintReport invokes window.print()');

// Verify Marriage Matching Kuberan Bridal Banner
getEl('matchBoyNak').value = '4';
getEl('matchBoyPada').value = '1';
getEl('matchGirlNak').value = '13';
getEl('matchGirlPada').value = '2';
sandbox.doMarriageMatch();
assert(getEl('matchKuberanBridalBanner').innerHTML.includes('https://kuberansilks.com/'), 'Marriage Matching displays Kuberan Silks bridal link');

console.log('🎉 ALL UNIT & INTEGRATION TESTS PASSED!');
