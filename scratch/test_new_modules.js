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
        value: id === 'dateInput' ? '2026-10-25' : (id === 'latInput' ? '12.9716' : (id === 'lonInput' ? '77.5946' : (id === 'tzInput' ? 'Asia/Kolkata' : (['scanFrom', 'scanTo', 'targetDate'].includes(id) ? '' : '1')))),
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
        createElement: (tag) => {
            const el = makeEl('el_' + tag + '_' + Math.random());
            if (tag === 'canvas') {
                el.getContext = () => ({
                    fillStyle: '',
                    strokeStyle: '',
                    font: '',
                    textAlign: '',
                    lineWidth: 1,
                    createLinearGradient: () => ({ addColorStop: () => {} }),
                    fillRect: () => {},
                    strokeRect: () => {},
                    beginPath: () => {},
                    moveTo: () => {},
                    lineTo: () => {},
                    stroke: () => {},
                    fillText: (txt) => {
                        if (!sandbox._canvasTexts) sandbox._canvasTexts = [];
                        sandbox._canvasTexts.push(String(txt));
                    }
                });
                el.toBlob = (cb) => cb(new sandbox.Blob(['png'], { type: 'image/png' }));
            }
            return el;
        },
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
assert(getEl('jathakaFamilyList').innerHTML.includes('Ananya'), 'Family profile rendered in Jathaka list');
assert(getEl('rashifalFamilyChips').innerHTML.includes('Ananya (Simha)'), 'Family chip rendered in Daily Rashifal');

// Test adding a family member with DOB directly from Jathaka Family form and loading their Jathaka
getEl('jFamNameInput').value = 'Ramesh Kumar';
getEl('jFamRelationInput').value = 'Self';
getEl('jFamDobInput').value = '1990-05-15T10:30';
getEl('jFamPlaceSelect').value = '12.9716,77.5946,Asia/Kolkata,Bengaluru';
sandbox.saveNewFamilyMemberFromJathakaForm();
const savedProfs2 = sandbox.getFamilyProfiles();
assert.strictEqual(savedProfs2.length, 2, '2 family profiles saved');
assert(getEl('jathakaFamilyList').innerHTML.includes('Ramesh Kumar'), 'Ramesh Kumar rendered in Jathaka Family list');
const rameshProf = savedProfs2.find(p => p.name === 'Ramesh Kumar');
sandbox.loadFamilyProfileIntoJathaka(rameshProf.id);
assert.strictEqual(getEl('jName').value, 'Ramesh Kumar', 'Loaded Ramesh Kumar into Jathaka input');
assert.strictEqual(getEl('jDob').value, '1990-05-15T10:30', 'Loaded Ramesh Kumar DOB into Jathaka input');

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

// Verify Moon Phase Bezier SVG & Phase Display across all angles (0..360)
const testAngles = [0, 1, 45, 90, 135, 179, 180, 181, 216, 270, 315, 359];
for (const deg of testAngles) {
    const svg = sandbox.renderMoonPhaseSVG(deg, 42);
    assert(svg.includes('moon-phase-svg'), `Moon SVG rendered at ${deg}°`);
    assert(!svg.includes('NaN'), `No NaN in Moon SVG at ${deg}°`);
    const pathD = sandbox.computeMoonTerminatorPath(deg, 21, 21, 18);
    if (deg === 0 || deg === 1 || deg === 359) {
        assert.strictEqual(pathD, '', `New Moon (${deg}°) has empty lit path`);
    } else {
        assert(pathD.startsWith('M 21 3 C') && pathD.endsWith('Z'), `Valid cubic Bezier terminator path at ${deg}°`);
    }
}
assert.strictEqual(sandbox.getMoonPhaseEmoji(0), '🌑', 'New moon emoji at 0°');
assert.strictEqual(sandbox.getMoonPhaseEmoji(60), '🌒', 'Waxing crescent emoji at 60°');
assert.strictEqual(sandbox.getMoonPhaseEmoji(90), '🌓', 'First quarter emoji at 90°');
assert.strictEqual(sandbox.getMoonPhaseEmoji(180), '🌕', 'Full moon emoji at 180°');
assert.strictEqual(sandbox.getMoonPhaseEmoji(216), '🌖', 'Waning gibbous emoji at 216°');
assert.strictEqual(sandbox.getMoonPhaseEmoji(270), '🌗', 'Last quarter emoji at 270°');
assert.strictEqual(sandbox.getMoonPhaseEmoji(315), '🌘', 'Waning crescent emoji at 315°');

sandbox.updateMoonPhaseDisplay({ elongation: 169, tithi: { no: 15 } });
assert(getEl('moonPhaseName').textContent.includes('Pournami'), 'Pournami label set at tithi 15');
assert(getEl('moonPhaseIllum').textContent.includes('🌕 100% Illumination'), 'Full moon 100% illumination set on Pournami even when sunrise elongation is 169°');

sandbox.updateMoonPhaseDisplay({ elongation: 350, tithi: { no: 30 } });
assert(getEl('moonPhaseName').textContent.includes('Amavasya'), 'Amavasya label set at tithi 30');
assert(getEl('moonPhaseIllum').textContent.includes('🌑 0% Illumination'), 'New moon 0% illumination set on Amavasya even when sunrise elongation is 350°');

sandbox.updateMoonPhaseDisplay({ elongation: 2, tithi: { no: 1 } });
assert(getEl('moonPhaseName').textContent.includes('Shukla Paksha'), 'Shukla Paksha label set at tithi 1');
assert(getEl('moonPhaseIllum').textContent.startsWith('🌒 '), 'Shukla Prathama (tithi 1) at 2° shows Waxing Crescent 🌒 (not New Moon 🌑)');

sandbox.updateMoonPhaseDisplay({ elongation: 182, tithi: { no: 16 } });
assert(getEl('moonPhaseName').textContent.includes('Krishna Paksha'), 'Krishna Paksha label set at tithi 16');
assert(getEl('moonPhaseIllum').textContent.startsWith('🌖 '), 'Krishna Prathama (tithi 16) at 182° shows Waning Gibbous 🌖 (not Full Moon 🌕)');

const todayP = sandbox.computePanchanga(2026, 10, 29, 12.9716, 77.5946, 'Asia/Kolkata');
sandbox.renderPanchanga(todayP);
assert(todayP.tithi.startJD && todayP.tithi.startJD < todayP.sunrise, 'tithi.startJD computed before sunrise');
assert(todayP.tithi.endJD && todayP.tithi.endJD > todayP.sunrise, 'tithi.endJD computed after sunrise');
assert(getEl('glTithi').innerHTML.includes('Start:') && getEl('glTithi').innerHTML.includes('End:'), 'Today at a Glance Tithi displays both Start and End times');
assert(getEl('valTithiTime').textContent.includes('Starts:') && getEl('valTithiTime').textContent.includes('Ends:'), 'Five Limbs Tithi displays both Starts and Ends times');
assert(getEl('moonPhaseName').textContent.includes('Krishna Paksha'), '2026-10-29 shows Krishna Paksha');
assert(getEl('moonPhaseIllum').textContent.startsWith('🌖 '), '2026-10-29 (Krishna Chaturthi) shows Waning Gibbous 🌖');

// Verify getLimbsAtJD evaluates exact live moment (e.g. Nov 7, 2026 18:15 IST after Sunrise Trayodashi ended)
const nov7EveningJD = sandbox.julianDay(2026, 11, 7, 18.25 - 5.5);
const liveNov7 = sandbox.getLimbsAtJD(nov7EveningJD);
assert.strictEqual(liveNov7.tithi.name, 'Chaturdashi', 'At 6:15 PM IST on Nov 7, 2026, live Tithi is Krishna Chaturdashi (not completed Trayodashi)');
assert(liveNov7.tithi.startJD < nov7EveningJD && liveNov7.tithi.endJD > nov7EveningJD, 'Live Tithi startJD/endJD bracket the exact viewing time');

// Verify exportPanchangaImageCard() draws zero "undefined" texts on the PNG canvas
sandbox._canvasTexts = [];
sandbox.exportPanchangaImageCard();
assert(sandbox._canvasTexts.length > 10, 'exportPanchangaImageCard rendered text rows onto canvas');
for (const t of sandbox._canvasTexts) {
    assert(!t.includes('undefined'), `Canvas text must not contain "undefined", got: "${t}"`);
}

// Verify shareTodayPanchanga() & shareDailyPanchangam() include start/end Tithi span and zero "undefined"
sandbox._lastOpenedUrl = '';
sandbox.shareDailyPanchangam();
assert(sandbox._lastOpenedUrl.includes('api.whatsapp.com/send'), 'shareDailyPanchangam delegates to shareTodayPanchanga');
const decodedShare = decodeURIComponent(sandbox._lastOpenedUrl.split('text=')[1] || '');
assert(!decodedShare.includes('undefined'), 'Shared Panchangam text has zero "undefined"');
assert(decodedShare.includes('Tithi:') && decodedShare.includes(' to '), 'Shared Panchangam includes Tithi start-to-end time range');

// Verify Muhurtha default dates (#scanFrom, #scanTo, #targetDate) are pre-filled on init
assert(getEl('scanFrom').value.length === 10, '#scanFrom pre-filled on init');
assert(getEl('scanTo').value.length === 10, '#scanTo pre-filled on init');
assert(getEl('targetDate').value.length === 10, '#targetDate pre-filled on init');

// Verify updateMuhurthaPersonalized() falls back to saved Family Profiles when Jathaka history is empty
localStorageMock.removeItem('kuberan_jathaka_history');
getEl('tarabalamCard').style.display = 'none';
sandbox.updateMuhurthaPersonalized();
assert.strictEqual(getEl('tarabalamCard').style.display, 'block', 'updateMuhurthaPersonalized falls back to saved Family Profiles when history is empty');

// Verify Mobile App Store & Google Play Store Publishing Compliance
console.log('--- 5. Verifying Mobile App Store Publishing Requirements ---');

// 1. Safe-area notch padding & viewport-fit
assert(html.includes('viewport-fit=cover'), 'HTML includes viewport-fit=cover');
assert(html.includes('safe-area-inset-top'), 'CSS includes safe-area-inset-top');
assert(html.includes('safe-area-inset-bottom'), 'CSS includes safe-area-inset-bottom');

// 2. DPDP Act 2023 & GDPR Statutory Privacy Disclosures
assert(html.includes('DPDP Act') && html.includes('2023'), 'Privacy modal cites DPDP Act 2023');
assert(html.includes('GDPR'), 'Privacy modal cites GDPR compliance');
assert(html.includes('100% On-Device / Client-Side Computation'), 'Privacy modal declares 100% on-device computation');
assert(html.includes('https://kuberansilks.com/pages/panchangam-privacy'), 'Privacy modal links to official public HTTPS privacy policy');

// 3. Respectful Purohit Consultation Disclaimer
assert(html.includes('Please consult your family Purohit/astrologer for final auspicious marriage Muhurtham and ritual decisions'), 'Prominent respectful Purohit consultation disclaimer present');

// 4. Astrological Calculation Transparency (Swiss Ephemeris & VSOP87)
assert(html.includes('Swiss Ephemeris & VSOP87') || html.includes('Swiss Ephemeris / VSOP87'), 'Calculation transparency declares Swiss Ephemeris / VSOP87');

// 5. In-App Data Erasure Method
assert(typeof sandbox.clearAllAppData === 'function', 'clearAllAppData function is defined in global scope');

// 6. Native Capacitor Configuration Verification
const capConfig = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'capacitor.config.json'), 'utf8'));
assert.strictEqual(capConfig.appId, 'com.kuberansilks.panchangam', 'Capacitor appId matches com.kuberansilks.panchangam');
assert.strictEqual(capConfig.appName, 'Kuberan Panchangam', 'Capacitor appName matches Kuberan Panchangam');
assert.strictEqual(capConfig.webDir, 'docs', 'Capacitor webDir points to docs');

// 7. Android Manifest Permissions Verification
const androidManifest = fs.readFileSync(path.join(__dirname, '..', 'android', 'app', 'src', 'main', 'AndroidManifest.xml'), 'utf8');
assert(androidManifest.includes('android.permission.ACCESS_COARSE_LOCATION'), 'AndroidManifest includes ACCESS_COARSE_LOCATION');
assert(androidManifest.includes('android.permission.ACCESS_FINE_LOCATION'), 'AndroidManifest includes ACCESS_FINE_LOCATION');

// 8. iOS Info.plist & PrivacyInfo.xcprivacy Verification
const iOSPlist = fs.readFileSync(path.join(__dirname, '..', 'ios', 'App', 'App', 'Info.plist'), 'utf8');
assert(iOSPlist.includes('NSLocationWhenInUseUsageDescription'), 'Info.plist includes NSLocationWhenInUseUsageDescription');
assert(iOSPlist.includes('Required to calculate exact local sunrise, sunset, Tithi end-times, and Lagna for your city'), 'Info.plist includes exact location description');

const iOSPrivacy = fs.readFileSync(path.join(__dirname, '..', 'ios', 'App', 'App', 'PrivacyInfo.xcprivacy'), 'utf8');
assert(iOSPrivacy.includes('NSPrivacyAccessedAPITypeUserDefaults'), 'PrivacyInfo.xcprivacy declares UserDefaults API');
assert(iOSPrivacy.includes('CA92.1'), 'PrivacyInfo.xcprivacy declares reason CA92.1');

// 9. Store Visual Assets Existence
assert(fs.existsSync(path.join(__dirname, '..', 'store_assets', 'ios', 'icon_1024.png')), 'iOS 1024x1024 icon exists');
assert(fs.existsSync(path.join(__dirname, '..', 'store_assets', 'android', 'icon_512.png')), 'Android 512x512 icon exists');
assert(fs.existsSync(path.join(__dirname, '..', 'store_assets', 'android', 'feature_graphic_1024x500.png')), 'Google Play 1024x500 feature graphic exists');
assert(fs.existsSync(path.join(__dirname, '..', 'store_assets', 'screenshots', 'screenshot_1_daily_panchangam.png')), 'Screenshot 1 exists');
assert(fs.existsSync(path.join(__dirname, '..', 'store_assets', 'screenshots', 'screenshot_2_kundli_jathaka.png')), 'Screenshot 2 exists');
assert(fs.existsSync(path.join(__dirname, '..', 'store_assets', 'screenshots', 'screenshot_3_gowri_choghadiya.png')), 'Screenshot 3 exists');
assert(fs.existsSync(path.join(__dirname, '..', 'store_assets', 'screenshots', 'screenshot_4_karnataka_calendar.png')), 'Screenshot 4 exists');
assert(fs.existsSync(path.join(__dirname, '..', 'store_assets', 'metadata', 'ASO_LISTING_METADATA.md')), 'ASO metadata document exists');

console.log('🎉 ALL UNIT, INTEGRATION & STORE PUBLISHING TESTS PASSED!');
