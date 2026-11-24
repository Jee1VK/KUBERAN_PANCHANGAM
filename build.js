/**
 * @fileoverview build.js — Clean Runtime Web Asset Bundler for Capacitor & Store Releases
 * Copies strictly runtime web assets into `dist/`, excluding Python scripts, `.spec`,
 * archives (`.zip`), tests (`test_*.js`), scratch files, and native folders.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = __dirname;
const DOCS_DIR = path.join(ROOT, 'docs');
const DIST_DIR = path.join(ROOT, 'dist');

const OTA_BASE_URL = 'https://jee1vk.github.io/KUBERAN_PANCHANGAM/';
const MIN_NATIVE_VERSION_CODE = 1;

const EXCLUDED_EXTS = new Set(['.py', '.pyc', '.spec', '.zip', '.md']);
const EXCLUDED_FILE_REGEX = /^(test_.*|pytest.*|requirements\.txt|ota-manifest\.json)$/i;
const EXCLUDED_DIRS = new Set(['superpowers']);

const TEXT_EXTS = new Set(['.html', '.js', '.css', '.json', '.svg', '.txt', '.xml', '.webmanifest']);

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
    try {
        const sw = fs.readFileSync(path.join(DOCS_DIR, 'sw.js'), 'utf8');
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

function shouldCopyFile(fileName) {
    if (EXCLUDED_FILE_REGEX.test(fileName)) return false;
    const ext = path.extname(fileName).toLowerCase();
    if (EXCLUDED_EXTS.has(ext)) return false;
    return true;
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
    if (fs.existsSync(DIST_DIR)) {
        fs.rmSync(DIST_DIR, { recursive: true, force: true });
    }
    fs.mkdirSync(DIST_DIR, { recursive: true });

    const stats = { files: 0, bytes: 0 };

    // Copy runtime web bundle from docs/ (excluding markdown & non-runtime files)
    copyDirFiltered(DOCS_DIR, DIST_DIR, stats);

    // Also remove non-PWA crawler files from mobile dist/
    for (const webOnly of ['robots.txt', 'sitemap.xml']) {
        const p = path.join(DIST_DIR, webOnly);
        if (fs.existsSync(p)) {
            stats.bytes -= fs.statSync(p).size;
            stats.files--;
            fs.unlinkSync(p);
        }
    }

    // Copy JSON datasets (rules/ and profiles/) for runtime consumption
    copyJsonFolder('rules', stats);
    copyJsonFolder('profiles', stats);

    // Generate SHA-256 OTA Live Update manifest into both docs/ (for GitHub Pages) and dist/ (for native APK/IPA)
    const ota = generateOtaManifest();
    stats.files++;
    stats.bytes += ota.bytes;

    // Inject @capacitor/app backButton bridge availability verification marker if needed
    console.log(`Built clean runtime dist/ bundle: ${stats.files} files (${(stats.bytes / 1024).toFixed(1)} KB) | OTA ${ota.manifest.version} (${ota.manifest.bundleHash.slice(0, 12)}).`);
    return stats;
}

if (require.main === module) {
    runBuild();
}

module.exports = { runBuild, shouldCopyFile };
