/**
 * @fileoverview build.js — Clean Runtime Web Asset Bundler for Capacitor & Store Releases
 * Copies strictly runtime web assets into `dist/`, excluding Python scripts, `.spec`,
 * archives (`.zip`), tests (`test_*.js`), scratch files, and native folders.
 */

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const DOCS_DIR = path.join(ROOT, 'docs');
const DIST_DIR = path.join(ROOT, 'dist');

const EXCLUDED_EXTS = new Set(['.py', '.pyc', '.spec', '.zip', '.md']);
const EXCLUDED_FILE_REGEX = /^(test_.*|pytest.*|requirements\.txt)$/i;

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
            copyDirFiltered(srcPath, destPath, stats);
        } else if (entry.isFile() && shouldCopyFile(entry.name)) {
            fs.copyFileSync(srcPath, destPath);
            stats.files++;
            stats.bytes += fs.statSync(destPath).size;
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

    // Inject @capacitor/app backButton bridge availability verification marker if needed
    console.log(`Built clean runtime dist/ bundle: ${stats.files} files (${(stats.bytes / 1024).toFixed(1)} KB).`);
    return stats;
}

if (require.main === module) {
    runBuild();
}

module.exports = { runBuild, shouldCopyFile };
