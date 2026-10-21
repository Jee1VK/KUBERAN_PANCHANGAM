const fs = require('fs');
const assert = require('assert');

const html = fs.readFileSync('docs/index.html', 'utf8');

console.log('Testing Top Bar Redesign:');

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

// Check classes and structure
assert(html.includes('panchanga-controls-bar'), 'Missing panchanga-controls-bar');
assert(html.includes('controls-top-row'), 'Missing controls-top-row');
assert(html.includes('controls-action-row'), 'Missing controls-action-row');
assert(html.includes('day-switcher-pill'), 'Missing day-switcher-pill');
assert(html.includes('btn-action-share'), 'Missing btn-action-share');
assert(html.includes('btn-action-card'), 'Missing btn-action-card');
console.log('  ✓ All container and button classes present');

// Verify removal of clashing styles
assert(!html.includes('btn-share-wa'), 'btn-share-wa still present');
assert(!html.includes('#25D366'), 'Clashing green color #25D366 still present');
console.log('  ✓ No clashing green gradient present');

// Verify responsive rules
assert(html.includes('@media (max-width: 480px)'), 'Missing max-width 480px media query');
assert(html.includes('@media (min-width: 720px)'), 'Missing min-width 720px media query');
console.log('  ✓ Responsive media queries for mobile & desktop present');

console.log('\nAll Top Bar tests PASSED successfully!');
