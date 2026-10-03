const fs = require('fs');
const swPath = '\\\\KUBERAN-NAS\\Kuberan\\Jeevan\\Gemini Projects\\KUBERAN_PANCHANGAM\\docs\\sw.js';
let sw = fs.readFileSync(swPath, 'utf8');
sw = sw.replace(/kuberan-panchangam-v\d+/, 'kuberan-panchangam-v24');
fs.writeFileSync(swPath, sw, 'utf8');
