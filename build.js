/**
 * @fileoverview build.js — Hardened Production Bundler (Obfuscation + Capacitor dist/ + SHA-256 OTA)
 * 1. Compiles & obfuscates proprietary JS modules + inline engine from private `src/` -> `docs/`
 *    using `javascript-obfuscator` (Commercial Hardened Profile + Domain Lock).
 * 2. Copies strictly runtime web assets into `dist/`, excluding Python scripts, `.spec`,
 *    archives (`.zip`), tests (`test_*.js`), scratch files, `superpowers/`, and native folders.
 * 3. Generates LF-normalized SHA-256 `ota-manifest.json` in both `docs/` and `dist/`.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = __dirname;
const SRC_DIR = path.join(ROOT, 'src');
const DOCS_DIR = path.join(ROOT, 'docs');
const DIST_DIR = path.join(ROOT, 'dist');
const OBF_CONFIG_PATH = path.join(ROOT, 'obfuscator.config.json');

const OTA_BASE_URL = 'https://jee1vk.github.io/KUBERAN_PANCHANGAM/';
const MIN_NATIVE_VERSION_CODE = 1;

const EXCLUDED_EXTS = new Set(['.py', '.pyc', '.spec', '.zip', '.md']);
const EXCLUDED_FILE_REGEX = /^(test_.*|pytest.*|requirements\.txt|ota-manifest\.json)$/i;
const EXCLUDED_DIRS = new Set(['superpowers']);
// Third-party already-minified OSS library & tiny Service Worker shell are copied verbatim
const SKIP_OBFUSCATE_FILES = new Set(['js/astronomy.js', 'sw.js']);

const TEXT_EXTS = new Set(['.html', '.js', '.css', '.json', '.svg', '.txt', '.xml', '.webmanifest']);

function loadObfuscator() {
    const candidates = [
        'javascript-obfuscator',
        process.env.APPDATA ? path.join(process.env.APPDATA, 'npm', 'node_modules', 'javascript-obfuscator') : null
    ].filter(Boolean);
    for (const c of candidates) {
        try {
            return require(c);
        } catch (_) {}
    }
    throw new Error('javascript-obfuscator not found. Install via `npm install -g javascript-obfuscator` or `--save-dev`.');
}

function readNormalizedBytes(filePath) {
    const raw = fs.readFileSync(filePath);
    const ext = path.extname(filePath).toLowerCase();
    if (!TEXT_EXTS.has(ext)) return raw;
    // Normalize CRLF -> LF so SHA-256 matches GitHub Pages (Git LF blobs) identically on Windows & Linux
    return Buffer.from(raw.toString('utf8').replace(/\r\n/g, '\n'), 'utf8');
}

function sha256File(filePath) {
    const hash = crypto.createHash('sha256');
    hash.update(readNormalizedBytes(filePath));
    return hash.digest('hex');
}

function detectWebVersion() {
    let swVer = 'v66';
    const swPath = fs.existsSync(path.join(SRC_DIR, 'sw.js'))
        ? path.join(SRC_DIR, 'sw.js')
        : path.join(DOCS_DIR, 'sw.js');
    try {
        const sw = fs.readFileSync(swPath, 'utf8');
        const m = sw.match(/CACHE_NAME\s*=\s*['"]kuberan-panchangam-([^'"]+)['"]/);
        if (m) swVer = m[1];
    } catch (_) {}
    let pkgVer = '2.0.0';
    try {
        const gradle = fs.readFileSync(path.join(ROOT, 'android', 'app', 'build.gradle'), 'utf8');
        const vm = gradle.match(/versionName\s+"([^"]+)"/);
        if (vm) pkgVer = vm[1];
    } catch (_) {}
    return `${pkgVer}-${swVer}`;
}

function shouldCopyFile(fileName) {
    if (EXCLUDED_FILE_REGEX.test(fileName)) return false;
    const ext = path.extname(fileName).toLowerCase();
    if (EXCLUDED_EXTS.has(ext)) return false;
    return true;
}

function compileSrcToDocs() {
    if (!fs.existsSync(SRC_DIR)) {
        console.log('No private src/ directory found; skipping obfuscation stage and using docs/ directly.');
        return { obfuscatedJs: 0, obfuscatedInline: 0 };
    }
    const JavaScriptObfuscator = loadObfuscator();
    const obfConfig = fs.existsSync(OBF_CONFIG_PATH)
        ? JSON.parse(fs.readFileSync(OBF_CONFIG_PATH, 'utf8'))
        : { compact: true, renameGlobals: false, stringArray: true, stringArrayEncoding: ['base64'] };

    let obfuscatedJs = 0;
    let obfuscatedInline = 0;

    function walkAndCompile(srcCurr, docsCurr) {
        fs.mkdirSync(docsCurr, { recursive: true });
        for (const entry of fs.readdirSync(srcCurr, { withFileTypes: true })) {
            const srcPath = path.join(srcCurr, entry.name);
            const destPath = path.join(docsCurr, entry.name);
            if (entry.isDirectory()) {
                if (EXCLUDED_DIRS.has(entry.name.toLowerCase())) continue;
                walkAndCompile(srcPath, destPath);
                continue;
            }
            if (!entry.isFile() || !shouldCopyFile(entry.name)) continue;

            const rel = path.relative(SRC_DIR, srcPath).split(path.sep).join('/');
            const ext = path.extname(entry.name).toLowerCase();

            if (ext === '.js' && !SKIP_OBFUSCATE_FILES.has(rel)) {
                const code = readNormalizedBytes(srcPath).toString('utf8');
                // Keep full AST/string/self-defending obfuscation on UMD helper modules without browser-only domainLock
                // so Node/CommonJS test runners can require() them; index.html enforces domainLock for the entire app.
                const modCfg = { ...obfConfig, domainLock: [], domainLockRedirectUrl: 'about:blank' };
                const obf = JavaScriptObfuscator.obfuscate(code, modCfg).getObfuscatedCode();
                fs.writeFileSync(destPath, obf.replace(/\r\n/g, '\n') + '\n', 'utf8');
                obfuscatedJs++;
            } else if (ext === '.html') {
                const html = readNormalizedBytes(srcPath).toString('utf8');
                const compiledHtml = html.replace(
                    /(<script(?![^>]*\bsrc=)(?![^>]*\btype\s*=\s*["']application\/ld\+json["'])[^>]*>)([\s\S]*?)(<\/script>)/gi,
                    (match, openTag, body, closeTag) => {
                        if (body.trim().length < 200) return match;
                        // Slightly lighter flattening threshold on the 6,000-line engine for snappy mobile 365-day calendar scans
                        const inlineCfg = { ...obfConfig, controlFlowFlatteningThreshold: 0.25 };
                        const obfBody = JavaScriptObfuscator.obfuscate(body, inlineCfg).getObfuscatedCode();
                        obfuscatedInline++;
                        return `${openTag}\n${obfBody}\n${closeTag}`;
                    }
                );
                fs.writeFileSync(destPath, compiledHtml.replace(/\r\n/g, '\n'), 'utf8');
            } else {
                const normBuf = readNormalizedBytes(srcPath);
                fs.writeFileSync(destPath, normBuf);
            }
        }
    }

    walkAndCompile(SRC_DIR, DOCS_DIR);
    console.log(`Obfuscated ${obfuscatedJs} JS modules + ${obfuscatedInline} inline engine block(s) from src/ -> docs/.`);
    return { obfuscatedJs, obfuscatedInline };
}

function collectDocsFiles(baseDir, currentDir, outMap) {
    if (!fs.existsSync(currentDir)) return;
    const entries = fs.readdirSync(currentDir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name));
    for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name);
        if (entry.isDirectory()) {
            if (EXCLUDED_DIRS.has(entry.name.toLowerCase())) continue;
            collectDocsFiles(baseDir, fullPath, outMap);
        } else if (entry.isFile() && shouldCopyFile(entry.name)) {
            if (entry.name === 'robots.txt' || entry.name === 'sitemap.xml') continue;
            const rel = path.relative(baseDir, fullPath).split(path.sep).join('/');
            const normBuf = readNormalizedBytes(fullPath);
            outMap[rel] = {
                sha256: crypto.createHash('sha256').update(normBuf).digest('hex'),
                size: normBuf.length
            };
        }
    }
}

function generateOtaManifest() {
    const files = {};
    collectDocsFiles(DOCS_DIR, DOCS_DIR, files);
    const sortedKeys = Object.keys(files).sort();
    const composite = crypto.createHash('sha256');
    for (const k of sortedKeys) {
        composite.update(`${k}:${files[k].sha256}\n`);
    }
    const bundleHash = composite.digest('hex');
    const manifest = {
        schema: 1,
        appId: 'com.kuberansilks.panchangam',
        version: detectWebVersion(),
        bundleHash,
        minNativeVersionCode: MIN_NATIVE_VERSION_CODE,
        baseUrl: OTA_BASE_URL,
        builtAt: new Date().toISOString(),
        files
    };
    const json = JSON.stringify(manifest, null, 2) + '\n';
    fs.writeFileSync(path.join(DOCS_DIR, 'ota-manifest.json'), json, 'utf8');
    fs.writeFileSync(path.join(DIST_DIR, 'ota-manifest.json'), json, 'utf8');
    return { manifest, bytes: Buffer.byteLength(json, 'utf8') };
}

function copyDirFiltered(srcDir, destDir, stats) {
    if (!fs.existsSync(srcDir)) return;
    fs.mkdirSync(destDir, { recursive: true });
    for (const entry of fs.readdirSync(srcDir, { withFileTypes: true })) {
        const srcPath = path.join(srcDir, entry.name);
        const destPath = path.join(destDir, entry.name);
        if (entry.isDirectory()) {
            if (EXCLUDED_DIRS.has(entry.name.toLowerCase())) continue;
            copyDirFiltered(srcPath, destPath, stats);
        } else if (entry.isFile() && shouldCopyFile(entry.name)) {
            const normBuf = readNormalizedBytes(srcPath);
            fs.writeFileSync(destPath, normBuf);
            stats.files++;
            stats.bytes += normBuf.length;
        }
    }
}

function copyJsonFolder(folderName, stats) {
    const srcFolder = path.join(ROOT, folderName);
    const destFolder = path.join(DIST_DIR, folderName);
    if (!fs.existsSync(srcFolder)) return;
    fs.mkdirSync(destFolder, { recursive: true });
    for (const entry of fs.readdirSync(srcFolder, { withFileTypes: true })) {
        if (entry.isFile() && entry.name.toLowerCase().endsWith('.json')) {
            const srcPath = path.join(srcFolder, entry.name);
            const destPath = path.join(destFolder, entry.name);
            fs.copyFileSync(srcPath, destPath);
            stats.files++;
            stats.bytes += fs.statSync(destPath).size;
        }
    }
}

function runBuild() {
    // 1. Obfuscate private src/ -> docs/
    compileSrcToDocs();

    // 2. Rebuild clean dist/ from obfuscated docs/
    if (fs.existsSync(DIST_DIR)) {
        fs.rmSync(DIST_DIR, { recursive: true, force: true });
    }
    fs.mkdirSync(DIST_DIR, { recursive: true });

    const stats = { files: 0, bytes: 0 };
    copyDirFiltered(DOCS_DIR, DIST_DIR, stats);

    for (const webOnly of ['robots.txt', 'sitemap.xml']) {
        const p = path.join(DIST_DIR, webOnly);
        if (fs.existsSync(p)) {
            stats.bytes -= fs.statSync(p).size;
            stats.files--;
            fs.unlinkSync(p);
        }
    }

    copyJsonFolder('rules', stats);
    copyJsonFolder('profiles', stats);

    // 3. Generate SHA-256 OTA Live Update manifest into both docs/ and dist/
    const ota = generateOtaManifest();
    stats.files++;
    stats.bytes += ota.bytes;

    console.log(`Built clean obfuscated dist/ bundle: ${stats.files} files (${(stats.bytes / 1024).toFixed(1)} KB) | OTA ${ota.manifest.version} (${ota.manifest.bundleHash.slice(0, 12)}).`);
    return stats;
}

if (require.main === module) {
    runBuild();
}

module.exports = { runBuild, shouldCopyFile };
