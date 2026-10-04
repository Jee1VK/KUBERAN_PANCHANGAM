const fs = require('fs');
let code = fs.readFileSync('\\\\KUBERAN-NAS\\Kuberan\\Jeevan\\Gemini Projects\\KUBERAN_PANCHANGAM\\docs\\index.html', 'utf8');

const oldCss = '.bottom-nav button.active { color: var(--gold); }';
const newCss = '.bottom-nav button.active { color: var(--gold); font-weight: 700; position: relative; }\n            .bottom-nav button.active::after { content: ""; position: absolute; top: -1px; left: 50%; transform: translateX(-50%); width: 24px; height: 3px; background: var(--gold); border-radius: 2px; }';
code = code.replace(oldCss, newCss);

// Also make the icons in the bottom nav slightly larger
const oldIconCss = '.bottom-nav button {';
const newIconCss = '.bottom-nav button {\n                gap: 4px;'; // add gap between icon and text
code = code.replace(oldIconCss, newIconCss);

fs.writeFileSync('\\\\KUBERAN-NAS\\Kuberan\\Jeevan\\Gemini Projects\\KUBERAN_PANCHANGAM\\docs\\index.html', code, 'utf8');
