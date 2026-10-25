const fs = require('fs');
const assert = require('assert');

const html = fs.readFileSync('docs/index.html', 'utf8');

console.log('Testing Top Bar Redesign & Calendar Performance:');

// Check IDs
['dateInput', 'chipToday', 'chipTomorrow'].forEach(id => {
    assert(html.includes(`id="${id}"`), `Missing ID: ${id}`);
    console.log(`  ✓ ID "${id}" present`);
});

// Check handlers
[
    'stepDate(-1)',
    'stepDate(1)',
    'goToday()',
    'goTomorrow()',
    'shareTodayPanchanga()',
    'exportPanchangaImageCard()'
].forEach(h => {
    assert(html.includes(h), `Missing handler: ${h}`);
    console.log(`  ✓ Handler "${h}" wired`);
});

// Check classes and CSS specificity fixes
assert(html.includes('panchanga-controls-bar'), 'Missing panchanga-controls-bar');
assert(html.includes('align-items: stretch !important'), 'Missing align-items: stretch !important fix');
assert(html.includes('.panchanga-controls-bar input.date-picker-input'), 'Missing input specificity override');
assert(html.includes('grid-template-columns: minmax(0, 1fr) auto'), 'Missing side-by-side Row 1 grid');
assert(html.includes('controls-action-row'), 'Missing controls-action-row');
assert(html.includes('day-switcher-pill'), 'Missing day-switcher-pill');
assert(html.includes('btn-action-share'), 'Missing btn-action-share');
assert(html.includes('btn-action-card'), 'Missing btn-action-card');
console.log('  ✓ All container, alignment, and specificity fixes present');

// Verify removal of clashing styles
assert(!html.includes('btn-share-wa'), 'btn-share-wa still present');
assert(!html.includes('#25D366'), 'Clashing green color #25D366 still present');
console.log('  ✓ No clashing green gradient present');

// Verify Calendar engine caches
assert(html.includes('_sunriseCache'), 'Missing _sunriseCache');
assert(html.includes('_nmMasaCache'), 'Missing _nmMasaCache');
assert(html.includes('_tzOffsetCache'), 'Missing _tzOffsetCache');
assert(html.includes('window._upFestsTimer'), 'Missing _upFestsTimer debounce');
console.log('  ✓ Calendar & Astronomical caches present');

console.log('\nAll Top Bar & Calendar checks PASSED successfully!');
