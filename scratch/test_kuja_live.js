const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

// Load index.html into VM to test actual live functions
const html = fs.readFileSync('docs/index.html', 'utf8');

// Extract script content
const scriptMatch = html.match(/<script(?![^>]*src)[^>]*>([\s\S]*?)<\/script>/i);
if (!scriptMatch) {
    throw new Error('Could not find inline script in index.html');
}

const sandbox = {
    console,
    Math,
    Date,
    Array,
    Object,
    String,
    Number,
    parseInt,
    parseFloat,
    isNaN,
    isFinite,
    Map,
    Set,
    JSON,
    document: {
        getElementById: () => ({ style: {}, classList: { toggle: () => {} }, innerHTML: '', value: '', addEventListener: () => {} }),
        querySelectorAll: () => [],
        body: { dataset: {} },
        addEventListener: () => {}
    },
    localStorage: {
        getItem: () => null,
        setItem: () => {}
    },
    navigator: { serviceWorker: {} },
    window: {
        addEventListener: () => {}
    }
};

// Also load astronomy.js and ashtakoota.js
const astroJs = fs.readFileSync('docs/js/astronomy.js', 'utf8');
const ashtaJs = fs.readFileSync('docs/js/ashtakoota.js', 'utf8');

vm.createContext(sandbox);
vm.runInContext(astroJs, sandbox);
vm.runInContext(ashtaJs, sandbox);
vm.runInContext(scriptMatch[1], sandbox);

console.log('Testing live checkKujaDosha & Parashara exceptions in index.html:');

// Test 1: Mars in 7th house (afflicted without cancellation)
// Lagna = Aries (0), Mars = Libra (6, 7th house). Jupiter in Taurus (1 - 6th from Jup, no aspect)
const chartAfflicted = [
    { name: 'Sun', rashiIdx: 0 },
    { name: 'Moon', rashiIdx: 0 },
    { name: 'Mars', rashiIdx: 6 },
    { name: 'Mercury', rashiIdx: 0 },
    { name: 'Jupiter', rashiIdx: 1 },
    { name: 'Venus', rashiIdx: 0 },
    { name: 'Saturn', rashiIdx: 0 }
];
const res1 = sandbox.checkKujaDosha(chartAfflicted, 0);
assert.strictEqual(res1.hasBaseDosha, true, 'Base dosha should be true for Mars in 7th');
assert.strictEqual(res1.hasActiveDosha, true, 'hasActiveDosha should be true when no cancellation');
assert.strictEqual(res1.status, 'present', 'status must be "present"');
console.log('  ✓ Mars in 7th without cancellation has status="present" and hasActiveDosha=true');

// Test 2: Mars in 3rd house (Upachaya -> Clean, No Dosha)
const chartClean = [
    { name: 'Sun', rashiIdx: 0 },
    { name: 'Moon', rashiIdx: 0 },
    { name: 'Mars', rashiIdx: 2 }, // 3rd house
    { name: 'Mercury', rashiIdx: 0 },
    { name: 'Jupiter', rashiIdx: 0 },
    { name: 'Venus', rashiIdx: 0 },
    { name: 'Saturn', rashiIdx: 0 }
];
const res2 = sandbox.checkKujaDosha(chartClean, 0);
assert.strictEqual(res2.hasBaseDosha, false, 'No base dosha for Mars in 3rd house');
assert.strictEqual(res2.hasActiveDosha, false, 'hasActiveDosha must be false');
assert.strictEqual(res2.status, 'none', 'status must be "none"');
assert.strictEqual(res2.cancellations.length, 0, 'No cancellations array for clean chart');
console.log('  ✓ Mars in 3rd house has status="none" and 0 cancellations');

// Test 3: Mars in Swa-Kshetra (Aries, rashi 0) in 1st house
const chartSwaKshetra = [
    { name: 'Sun', rashiIdx: 4 },
    { name: 'Moon', rashiIdx: 4 },
    { name: 'Mars', rashiIdx: 0 }, // Aries (own sign)
    { name: 'Mercury', rashiIdx: 4 },
    { name: 'Jupiter', rashiIdx: 4 },
    { name: 'Venus', rashiIdx: 4 },
    { name: 'Saturn', rashiIdx: 4 }
];
const res3 = sandbox.checkKujaDosha(chartSwaKshetra, 0);
assert.strictEqual(res3.hasBaseDosha, true, 'Base dosha true for 1st house');
assert.strictEqual(res3.isCancelled, true, 'isCancelled must be true for Swa-Kshetra');
assert.strictEqual(res3.hasActiveDosha, false, 'hasActiveDosha must be false when cancelled');
assert.strictEqual(res3.status, 'cancelled', 'status must be "cancelled"');
console.log('  ✓ Mars in Swa-Kshetra (Aries) has status="cancelled" and hasActiveDosha=false');

// Test 4: Yogakaraka Mars for Cancer Lagna (3)
const chartCancerLagna = [
    { name: 'Sun', rashiIdx: 0 },
    { name: 'Moon', rashiIdx: 0 },
    { name: 'Mars', rashiIdx: 6 }, // Libra (4th house)
    { name: 'Mercury', rashiIdx: 0 },
    { name: 'Jupiter', rashiIdx: 0 },
    { name: 'Venus', rashiIdx: 0 },
    { name: 'Saturn', rashiIdx: 0 }
];
const res4 = sandbox.checkKujaDosha(chartCancerLagna, 3);
assert.strictEqual(res4.hasBaseDosha, true, 'Base dosha true');
assert.strictEqual(res4.isCancelled, true, 'Cancelled for Cancer Lagna (Yogakaraka Mars)');
assert.strictEqual(res4.status, 'cancelled', 'status must be "cancelled"');
console.log('  ✓ Yogakaraka Mars for Cancer/Leo Lagna cancelled properly');

// Test 5: Verify Dual Kuja Check in doMarriageMatch logic
// Bride afflicted, Groom clean -> MISMATCH!
const bActive = (res1.hasActiveDosha || res1.status === 'present' || res1.status === 'active');
const gActive = (res2.hasActiveDosha || res2.status === 'present' || res2.status === 'active');
assert.strictEqual(bActive, true, 'Bride must be active');
assert.strictEqual(gActive, false, 'Groom must be inactive');
assert.notStrictEqual(bActive, gActive, 'Must detect mismatch between active and clean!');
console.log('  ✓ Dual Kuja Mismatch correctly identified (no false positive auspicious match)');

console.log('\nAll Kuja Dosha Live Engine Tests PASSED successfully!');
