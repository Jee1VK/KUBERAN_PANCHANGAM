package com.kuberansilks.panchangam;

import android.app.Activity;
import android.content.Context;
import android.content.SharedPreferences;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.content.res.AssetManager;
import android.os.Build;
import android.util.Log;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.plugin.WebView;

import org.json.JSONObject;

import java.io.BufferedInputStream;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Iterator;
import java.util.Locale;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicBoolean;

/**
 * Native PWA-style Over-The-Air (OTA) Live Updater for Kuberan Panchangam.
 *
 * - 100% Offline-First: App always boots immediately from local storage or built-in APK assets.
 * - Zero External Lock-In: Serves differential updates directly from GitHub Pages HTTPS.
 * - SHA-256 Verified: Every file is checksum-verified before atomic promotion.
 * - Crash-Safe Watchdog: Automatically rolls back to previous/built-in bundle if a new OTA
 *   bundle fails to call notifyAppReady() twice on startup.
 */
@CapacitorPlugin(name = "OtaUpdater")
public class OtaUpdaterPlugin extends Plugin {

    private static final String TAG = "KuberanOTA";
    private static final String OTA_PREFS = "KuberanOtaPrefs";
    private static final String TRUSTED_HOST = "jee1vk.github.io";
    private static final String DEFAULT_MANIFEST_URL = "https://jee1vk.github.io/KUBERAN_PANCHANGAM/ota-manifest.json";
    private static final String BUNDLES_DIR = "ota_bundles";

    private static final String KEY_ACTIVE_PATH = "activeBundlePath";
    private static final String KEY_ACTIVE_VERSION = "activeVersion";
    private static final String KEY_ACTIVE_HASH = "activeBundleHash";
    private static final String KEY_PREV_PATH = "previousBundlePath";
    private static final String KEY_STAGED_PATH = "stagedBundlePath";
    private static final String KEY_STAGED_VERSION = "stagedVersion";
    private static final String KEY_STAGED_HASH = "stagedBundleHash";
    private static final String KEY_PENDING_CONFIRM = "pendingConfirmation";
    private static final String KEY_BOOT_ATTEMPTS = "bootAttempts";
    private static final String KEY_LAST_CHECKED = "lastCheckedAt";
    private static final String KEY_LAST_BINARY_CODE = "lastKnownBinaryVersionCode";
    private static final String KEY_LAST_BUILTIN_HASH = "lastKnownBuiltInBundleHash";

    private static final int CONNECT_TIMEOUT_MS = 8000;
    private static final int READ_TIMEOUT_MS = 15000;
    private static final int MAX_FAILED_BOOTS = 2;

    private final ExecutorService executor = Executors.newSingleThreadExecutor();
    private final AtomicBoolean updateInProgress = new AtomicBoolean(false);

    /**
     * Runs inside MainActivity.onCreate() BEFORE super.onCreate(savedInstanceState),
     * so Capacitor's Bridge reads the right CapWebViewSettings.serverBasePath on boot.
     */
    public static void prepareOnAppLaunch(Context context) {
        try {
            SharedPreferences otaPrefs = context.getSharedPreferences(OTA_PREFS, Activity.MODE_PRIVATE);
            SharedPreferences capPrefs = context.getSharedPreferences(WebView.WEBVIEW_PREFS_NAME, Activity.MODE_PRIVATE);

            long currentVersionCode = getAppVersionCode(context);
            long lastBinaryCode = otaPrefs.getLong(KEY_LAST_BINARY_CODE, -1L);
            JSONObject builtInManifest = readActiveManifest(context, null);
            String currentBuiltInHash = builtInManifest != null ? builtInManifest.optString("bundleHash", "") : "";
            String lastBuiltInHash = otaPrefs.getString(KEY_LAST_BUILTIN_HASH, "");

            // 1. New native APK binary or rebuilt built-in bundle installed: reset OTA state so new built-in assets load cleanly
            if (lastBinaryCode != currentVersionCode || (!currentBuiltInHash.isEmpty() && !currentBuiltInHash.equals(lastBuiltInHash))) {
                Log.i(TAG, "New native APK detected (code " + lastBinaryCode + " -> " + currentVersionCode + ", hash " + lastBuiltInHash + " -> " + currentBuiltInHash + "). Resetting OTA state.");
                otaPrefs.edit()
                    .clear()
                    .putLong(KEY_LAST_BINARY_CODE, currentVersionCode)
                    .putString(KEY_LAST_BUILTIN_HASH, currentBuiltInHash)
                    .apply();
                capPrefs.edit().putString(WebView.CAP_SERVER_PATH, "").apply();
                deleteRecursive(new File(context.getFilesDir(), BUNDLES_DIR));
                return;
            }

            // 2. Crash-safe rollback watchdog
            boolean pendingConfirm = otaPrefs.getBoolean(KEY_PENDING_CONFIRM, false);
            int bootAttempts = otaPrefs.getInt(KEY_BOOT_ATTEMPTS, 0);
            if (pendingConfirm) {
                if (bootAttempts >= MAX_FAILED_BOOTS) {
                    String prevPath = otaPrefs.getString(KEY_PREV_PATH, "");
                    if (prevPath == null || prevPath.isEmpty() || !new File(prevPath, "index.html").exists()) {
                        prevPath = "";
                    }
                    Log.w(TAG, "OTA boot watchdog triggered after " + bootAttempts + " unconfirmed boots. Rolling back to: " + (prevPath.isEmpty() ? "builtin" : prevPath));
                    capPrefs.edit().putString(WebView.CAP_SERVER_PATH, prevPath).apply();
                    otaPrefs.edit()
                        .putString(KEY_ACTIVE_PATH, prevPath)
                        .putBoolean(KEY_PENDING_CONFIRM, false)
                        .putInt(KEY_BOOT_ATTEMPTS, 0)
                        .remove(KEY_STAGED_PATH)
                        .remove(KEY_STAGED_VERSION)
                        .remove(KEY_STAGED_HASH)
                        .apply();
                    return;
                } else {
                    otaPrefs.edit().putInt(KEY_BOOT_ATTEMPTS, bootAttempts + 1).apply();
                }
            }

            // 3. Auto-promote any previously staged OTA bundle on cold launch (PWA behavior)
            String stagedPath = otaPrefs.getString(KEY_STAGED_PATH, "");
            String activePath = otaPrefs.getString(KEY_ACTIVE_PATH, "");
            if (!pendingConfirm && stagedPath != null && !stagedPath.isEmpty()
                && !stagedPath.equals(activePath)
                && new File(stagedPath, "index.html").exists()) {

                String stagedVer = otaPrefs.getString(KEY_STAGED_VERSION, "");
                String stagedHash = otaPrefs.getString(KEY_STAGED_HASH, "");
                Log.i(TAG, "Promoting staged OTA bundle on launch: " + stagedVer);
                capPrefs.edit().putString(WebView.CAP_SERVER_PATH, stagedPath).apply();
                otaPrefs.edit()
                    .putString(KEY_PREV_PATH, activePath != null ? activePath : "")
                    .putString(KEY_ACTIVE_PATH, stagedPath)
                    .putString(KEY_ACTIVE_VERSION, stagedVer)
                    .putString(KEY_ACTIVE_HASH, stagedHash)
                    .putBoolean(KEY_PENDING_CONFIRM, true)
                    .putInt(KEY_BOOT_ATTEMPTS, 1)
                    .remove(KEY_STAGED_PATH)
                    .remove(KEY_STAGED_VERSION)
                    .remove(KEY_STAGED_HASH)
                    .apply();
            }

            // 4. Sanity check: if active path disappeared, fall back cleanly to built-in assets
            String persisted = capPrefs.getString(WebView.CAP_SERVER_PATH, "");
            if (persisted != null && !persisted.isEmpty() && !new File(persisted, "index.html").exists()) {
                Log.w(TAG, "Persisted OTA directory missing. Falling back to built-in APK assets.");
                capPrefs.edit().putString(WebView.CAP_SERVER_PATH, "").apply();
                otaPrefs.edit().putString(KEY_ACTIVE_PATH, "").apply();
            }
        } catch (Exception e) {
            Log.e(TAG, "prepareOnAppLaunch error", e);
        }
    }

    @PluginMethod
    public void getStatus(PluginCall call) {
        try {
            Context ctx = getContext();
            SharedPreferences otaPrefs = ctx.getSharedPreferences(OTA_PREFS, Activity.MODE_PRIVATE);
            String activePath = otaPrefs.getString(KEY_ACTIVE_PATH, "");
            boolean isOta = activePath != null && !activePath.isEmpty() && new File(activePath, "index.html").exists();

            JSONObject activeManifest = readActiveManifest(ctx, isOta ? activePath : null);
            String activeVersion = activeManifest != null ? activeManifest.optString("version", "") : otaPrefs.getString(KEY_ACTIVE_VERSION, "");
            String activeHash = activeManifest != null ? activeManifest.optString("bundleHash", "") : otaPrefs.getString(KEY_ACTIVE_HASH, "");

            String stagedPath = otaPrefs.getString(KEY_STAGED_PATH, "");
            boolean hasStaged = stagedPath != null && !stagedPath.isEmpty() && new File(stagedPath, "index.html").exists();

            JSObject ret = new JSObject();
            ret.put("isNative", true);
            ret.put("nativeVersionName", getAppVersionName(ctx));
            ret.put("nativeVersionCode", getAppVersionCode(ctx));
            ret.put("source", isOta ? "ota" : "builtin");
            ret.put("activeVersion", activeVersion);
            ret.put("activeBundleHash", activeHash);
            ret.put("pendingVersion", hasStaged ? otaPrefs.getString(KEY_STAGED_VERSION, "") : "");
            ret.put("hasStagedUpdate", hasStaged);
            ret.put("manifestUrl", DEFAULT_MANIFEST_URL);
            ret.put("lastCheckedAt", otaPrefs.getLong(KEY_LAST_CHECKED, 0L));
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Failed to read OTA status: " + e.getMessage(), e);
        }
    }

    @PluginMethod
    public void notifyAppReady(PluginCall call) {
        try {
            Context ctx = getContext();
            SharedPreferences otaPrefs = ctx.getSharedPreferences(OTA_PREFS, Activity.MODE_PRIVATE);
            otaPrefs.edit()
                .putBoolean(KEY_PENDING_CONFIRM, false)
                .putInt(KEY_BOOT_ATTEMPTS, 0)
                .apply();

            final String activePath = otaPrefs.getString(KEY_ACTIVE_PATH, "");
            final String stagedPath = otaPrefs.getString(KEY_STAGED_PATH, "");
            executor.execute(() -> pruneOldBundles(ctx, activePath, stagedPath));

            JSObject ret = new JSObject();
            ret.put("confirmed", true);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("notifyAppReady failed: " + e.getMessage(), e);
        }
    }

    @PluginMethod
    public void checkAndDownload(PluginCall call) {
        if (!updateInProgress.compareAndSet(false, true)) {
            JSObject busy = new JSObject();
            busy.put("status", "busy");
            busy.put("updateAvailable", false);
            busy.put("downloaded", false);
            call.resolve(busy);
            return;
        }

        executor.execute(() -> {
            File stagingDir = null;
            try {
                Context ctx = getContext();
                SharedPreferences otaPrefs = ctx.getSharedPreferences(OTA_PREFS, Activity.MODE_PRIVATE);
                otaPrefs.edit().putLong(KEY_LAST_CHECKED, System.currentTimeMillis()).apply();

                String manifestUrlStr = DEFAULT_MANIFEST_URL + "?t=" + System.currentTimeMillis();
                byte[] manifestBytes = downloadHttpsBytes(manifestUrlStr);
                String manifestJsonStr = new String(manifestBytes, StandardCharsets.UTF_8);
                JSONObject remoteManifest = new JSONObject(manifestJsonStr);

                String remoteVersion = remoteManifest.optString("version", "");
                String remoteHash = remoteManifest.optString("bundleHash", "");
                String baseUrl = remoteManifest.optString("baseUrl", "https://jee1vk.github.io/KUBERAN_PANCHANGAM/");
                int minNativeCode = remoteManifest.optInt("minNativeVersionCode", 1);
                JSONObject remoteFiles = remoteManifest.optJSONObject("files");

                if (remoteHash.isEmpty() || remoteFiles == null || remoteFiles.length() == 0) {
                    throw new IOException("Invalid remote OTA manifest");
                }
                if (!baseUrl.endsWith("/")) {
                    baseUrl = baseUrl + "/";
                }
                validateTrustedHttpsUrl(baseUrl);

                long nativeCode = getAppVersionCode(ctx);
                if (nativeCode < minNativeCode) {
                    JSObject ret = new JSObject();
                    ret.put("status", "native-update-required");
                    ret.put("updateAvailable", false);
                    ret.put("downloaded", false);
                    ret.put("remoteVersion", remoteVersion);
                    call.resolve(ret);
                    return;
                }

                String activePath = otaPrefs.getString(KEY_ACTIVE_PATH, "");
                boolean isOta = activePath != null && !activePath.isEmpty() && new File(activePath, "index.html").exists();
                JSONObject activeManifest = readActiveManifest(ctx, isOta ? activePath : null);
                String activeHash = activeManifest != null ? activeManifest.optString("bundleHash", "") : "";
                String activeVersion = activeManifest != null ? activeManifest.optString("version", "") : "";

                // Already running latest bundle
                if (remoteHash.equals(activeHash)) {
                    JSObject ret = new JSObject();
                    ret.put("status", "up-to-date");
                    ret.put("updateAvailable", false);
                    ret.put("downloaded", false);
                    ret.put("activeVersion", activeVersion);
                    ret.put("remoteVersion", remoteVersion);
                    call.resolve(ret);
                    return;
                }

                // Already staged this exact bundle
                String existingStagedPath = otaPrefs.getString(KEY_STAGED_PATH, "");
                String existingStagedHash = otaPrefs.getString(KEY_STAGED_HASH, "");
                if (remoteHash.equals(existingStagedHash) && existingStagedPath != null
                    && new File(existingStagedPath, "index.html").exists()) {
                    JSObject ret = new JSObject();
                    ret.put("status", "staged");
                    ret.put("updateAvailable", true);
                    ret.put("downloaded", true);
                    ret.put("activeVersion", activeVersion);
                    ret.put("remoteVersion", remoteVersion);
                    ret.put("filesDownloaded", 0);
                    ret.put("filesReused", remoteFiles.length());
                    ret.put("bytesDownloaded", 0);
                    call.resolve(ret);
                    return;
                }

                // Stage new bundle atomically
                File bundlesRoot = new File(ctx.getFilesDir(), BUNDLES_DIR);
                if (!bundlesRoot.exists() && !bundlesRoot.mkdirs()) {
                    throw new IOException("Unable to create OTA bundles directory");
                }
                stagingDir = new File(bundlesRoot, "staging_" + System.currentTimeMillis());
                if (!stagingDir.mkdirs()) {
                    throw new IOException("Unable to create OTA staging directory");
                }
                String stagingCanonical = stagingDir.getCanonicalPath();

                // Seed Capacitor bridge files & local rules/profiles from built-in APK assets
                copyAssetIfPresent(ctx.getAssets(), "public/cordova.js", new File(stagingDir, "cordova.js"));
                copyAssetIfPresent(ctx.getAssets(), "public/cordova_plugins.js", new File(stagingDir, "cordova_plugins.js"));
                copyAssetDirIfPresent(ctx.getAssets(), "public/rules", new File(stagingDir, "rules"));
                copyAssetDirIfPresent(ctx.getAssets(), "public/profiles", new File(stagingDir, "profiles"));

                int filesDownloaded = 0;
                int filesReused = 0;
                long bytesDownloaded = 0L;

                Iterator<String> keys = remoteFiles.keys();
                while (keys.hasNext()) {
                    String relPath = keys.next();
                    validateRelativePath(relPath);

                    JSONObject meta = remoteFiles.getJSONObject(relPath);
                    String expectedSha = meta.getString("sha256").toLowerCase(Locale.US);

                    File destFile = new File(stagingDir, relPath);
                    if (!destFile.getCanonicalPath().startsWith(stagingCanonical + File.separator)) {
                        throw new SecurityException("Blocked path traversal in OTA manifest: " + relPath);
                    }
                    File parent = destFile.getParentFile();
                    if (parent != null && !parent.exists() && !parent.mkdirs()) {
                        throw new IOException("Failed creating parent dir for " + relPath);
                    }

                    // Try differential local reuse (from active OTA dir or built-in APK assets)
                    if (tryCopyMatchingLocalFile(ctx, isOta ? activePath : null, relPath, expectedSha, destFile)) {
                        filesReused++;
                        continue;
                    }

                    // Download changed file over HTTPS & verify SHA-256 checksum
                    String fileUrl = baseUrl + relPath + "?v=" + remoteHash.substring(0, Math.min(10, remoteHash.length()));
                    long written = downloadAndVerifySha256(fileUrl, destFile, expectedSha);
                    filesDownloaded++;
                    bytesDownloaded += written;
                }

                // Ensure index.html exists in staging
                if (!new File(stagingDir, "index.html").exists()) {
                    throw new IOException("Staged OTA bundle missing index.html");
                }

                // Save verified ota-manifest.json inside staged bundle
                try (FileOutputStream fos = new FileOutputStream(new File(stagingDir, "ota-manifest.json"))) {
                    fos.write(manifestBytes);
                }

                // Atomic promote staging -> final bundle folder
                String shortHash = remoteHash.substring(0, Math.min(12, remoteHash.length()));
                File finalBundleDir = new File(bundlesRoot, "bundle_" + shortHash + "_" + System.currentTimeMillis());
                if (!stagingDir.renameTo(finalBundleDir)) {
                    throw new IOException("Failed to finalize OTA staging directory");
                }
                stagingDir = null; // Prevent finally cleanup

                otaPrefs.edit()
                    .putString(KEY_STAGED_PATH, finalBundleDir.getAbsolutePath())
                    .putString(KEY_STAGED_VERSION, remoteVersion)
                    .putString(KEY_STAGED_HASH, remoteHash)
                    .apply();

                Log.i(TAG, "OTA bundle staged: " + remoteVersion + " (downloaded=" + filesDownloaded + ", reused=" + filesReused + ", bytes=" + bytesDownloaded + ")");

                JSObject ret = new JSObject();
                ret.put("status", "downloaded");
                ret.put("updateAvailable", true);
                ret.put("downloaded", true);
                ret.put("activeVersion", activeVersion);
                ret.put("remoteVersion", remoteVersion);
                ret.put("remoteBundleHash", remoteHash);
                ret.put("filesDownloaded", filesDownloaded);
                ret.put("filesReused", filesReused);
                ret.put("bytesDownloaded", bytesDownloaded);
                call.resolve(ret);
            } catch (Exception e) {
                Log.w(TAG, "OTA check/download skipped or failed: " + e.getMessage());
                JSObject ret = new JSObject();
                ret.put("status", "offline-or-error");
                ret.put("updateAvailable", false);
                ret.put("downloaded", false);
                ret.put("error", e.getMessage());
                call.resolve(ret);
            } finally {
                if (stagingDir != null && stagingDir.exists()) {
                    deleteRecursive(stagingDir);
                }
                updateInProgress.set(false);
            }
        });
    }

    @PluginMethod
    public void applyUpdate(PluginCall call) {
        try {
            Context ctx = getContext();
            SharedPreferences otaPrefs = ctx.getSharedPreferences(OTA_PREFS, Activity.MODE_PRIVATE);
            String stagedPath = otaPrefs.getString(KEY_STAGED_PATH, "");
            String stagedVer = otaPrefs.getString(KEY_STAGED_VERSION, "");
            String stagedHash = otaPrefs.getString(KEY_STAGED_HASH, "");

            if (stagedPath == null || stagedPath.isEmpty() || !new File(stagedPath, "index.html").exists()) {
                call.reject("No staged OTA update available");
                return;
            }

            String prevPath = otaPrefs.getString(KEY_ACTIVE_PATH, "");
            SharedPreferences capPrefs = ctx.getSharedPreferences(WebView.WEBVIEW_PREFS_NAME, Activity.MODE_PRIVATE);
            capPrefs.edit().putString(WebView.CAP_SERVER_PATH, stagedPath).apply();

            otaPrefs.edit()
                .putString(KEY_PREV_PATH, prevPath != null ? prevPath : "")
                .putString(KEY_ACTIVE_PATH, stagedPath)
                .putString(KEY_ACTIVE_VERSION, stagedVer)
                .putString(KEY_ACTIVE_HASH, stagedHash)
                .putBoolean(KEY_PENDING_CONFIRM, true)
                .putInt(KEY_BOOT_ATTEMPTS, 1)
                .remove(KEY_STAGED_PATH)
                .remove(KEY_STAGED_VERSION)
                .remove(KEY_STAGED_HASH)
                .apply();

            Log.i(TAG, "Applying live OTA update now: " + stagedVer + " -> " + stagedPath);
            getBridge().setServerBasePath(stagedPath);
            if (getBridge().getWebView() != null) {
                getBridge().getWebView().post(() -> {
                    getBridge().getWebView().clearCache(true);
                    getBridge().getWebView().reload();
                });
            }

            JSObject ret = new JSObject();
            ret.put("applied", true);
            ret.put("version", stagedVer);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Failed to apply OTA update: " + e.getMessage(), e);
        }
    }

    @PluginMethod
    public void rollbackToBuiltIn(PluginCall call) {
        try {
            Context ctx = getContext();
            SharedPreferences otaPrefs = ctx.getSharedPreferences(OTA_PREFS, Activity.MODE_PRIVATE);
            SharedPreferences capPrefs = ctx.getSharedPreferences(WebView.WEBVIEW_PREFS_NAME, Activity.MODE_PRIVATE);

            capPrefs.edit().putString(WebView.CAP_SERVER_PATH, "").apply();
            otaPrefs.edit()
                .putString(KEY_ACTIVE_PATH, "")
                .putString(KEY_ACTIVE_VERSION, "")
                .putString(KEY_ACTIVE_HASH, "")
                .putString(KEY_PREV_PATH, "")
                .putBoolean(KEY_PENDING_CONFIRM, false)
                .putInt(KEY_BOOT_ATTEMPTS, 0)
                .remove(KEY_STAGED_PATH)
                .remove(KEY_STAGED_VERSION)
                .remove(KEY_STAGED_HASH)
                .apply();

            executor.execute(() -> deleteRecursive(new File(ctx.getFilesDir(), BUNDLES_DIR)));
            getBridge().setServerAssetPath("public");
            if (getBridge().getWebView() != null) {
                getBridge().getWebView().post(() -> {
                    getBridge().getWebView().clearCache(true);
                    getBridge().getWebView().reload();
                });
            }

            JSObject ret = new JSObject();
            ret.put("rolledBack", true);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Rollback failed: " + e.getMessage(), e);
        }
    }

    // =========================================================================
    // Helpers
    // =========================================================================

    private static long getAppVersionCode(Context ctx) {
        try {
            PackageInfo info = ctx.getPackageManager().getPackageInfo(ctx.getPackageName(), 0);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                return info.getLongVersionCode();
            }
            @SuppressWarnings("deprecation")
            long code = info.versionCode;
            return code;
        } catch (PackageManager.NameNotFoundException e) {
            return 1L;
        }
    }

    private static String getAppVersionName(Context ctx) {
        try {
            PackageInfo info = ctx.getPackageManager().getPackageInfo(ctx.getPackageName(), 0);
            return info.versionName != null ? info.versionName : "2.0.0";
        } catch (PackageManager.NameNotFoundException e) {
            return "2.0.0";
        }
    }

    private static JSONObject readActiveManifest(Context ctx, String otaPath) {
        try {
            if (otaPath != null && !otaPath.isEmpty()) {
                File f = new File(otaPath, "ota-manifest.json");
                if (f.exists()) {
                    return new JSONObject(new String(readFileBytes(f), StandardCharsets.UTF_8));
                }
            }
            try (InputStream is = ctx.getAssets().open("public/ota-manifest.json")) {
                return new JSONObject(new String(readStreamBytes(is), StandardCharsets.UTF_8));
            }
        } catch (Exception e) {
            return null;
        }
    }

    private static void validateTrustedHttpsUrl(String urlStr) throws IOException {
        URL u = new URL(urlStr);
        if (!"https".equalsIgnoreCase(u.getProtocol()) || !TRUSTED_HOST.equalsIgnoreCase(u.getHost())) {
            throw new SecurityException("Untrusted OTA origin blocked: " + urlStr);
        }
    }

    private static void validateRelativePath(String relPath) {
        if (relPath == null || relPath.isEmpty() || relPath.startsWith("/") || relPath.contains("\\") || relPath.contains("..")) {
            throw new SecurityException("Invalid OTA file path: " + relPath);
        }
    }

    private static byte[] downloadHttpsBytes(String urlStr) throws IOException {
        validateTrustedHttpsUrl(urlStr);
        HttpURLConnection conn = (HttpURLConnection) new URL(urlStr).openConnection();
        conn.setInstanceFollowRedirects(true);
        conn.setConnectTimeout(CONNECT_TIMEOUT_MS);
        conn.setReadTimeout(READ_TIMEOUT_MS);
        conn.setUseCaches(false);
        conn.setRequestProperty("Cache-Control", "no-cache");
        try {
            int code = conn.getResponseCode();
            if (code != HttpURLConnection.HTTP_OK) {
                throw new IOException("HTTP " + code + " fetching " + urlStr);
            }
            try (InputStream is = new BufferedInputStream(conn.getInputStream())) {
                return readStreamBytes(is);
            }
        } finally {
            conn.disconnect();
        }
    }

    private static long downloadAndVerifySha256(String urlStr, File destFile, String expectedSha256) throws Exception {
        validateTrustedHttpsUrl(urlStr);
        HttpURLConnection conn = (HttpURLConnection) new URL(urlStr).openConnection();
        conn.setInstanceFollowRedirects(true);
        conn.setConnectTimeout(CONNECT_TIMEOUT_MS);
        conn.setReadTimeout(READ_TIMEOUT_MS);
        conn.setUseCaches(false);
        conn.setRequestProperty("Cache-Control", "no-cache");
        try {
            int code = conn.getResponseCode();
            if (code != HttpURLConnection.HTTP_OK) {
                throw new IOException("HTTP " + code + " downloading " + urlStr);
            }
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            long total = 0L;
            byte[] buf = new byte[16384];
            try (InputStream is = new BufferedInputStream(conn.getInputStream());
                 FileOutputStream fos = new FileOutputStream(destFile)) {
                int read;
                while ((read = is.read(buf)) != -1) {
                    md.update(buf, 0, read);
                    fos.write(buf, 0, read);
                    total += read;
                }
            }
            String actualSha = bytesToHex(md.digest());
            if (!actualSha.equalsIgnoreCase(expectedSha256)) {
                destFile.delete();
                throw new SecurityException("SHA-256 mismatch for " + destFile.getName() + " (expected " + expectedSha256 + ", got " + actualSha + ")");
            }
            return total;
        } finally {
            conn.disconnect();
        }
    }

    private static boolean tryCopyMatchingLocalFile(Context ctx, String activeOtaPath, String relPath, String expectedSha, File destFile) {
        try {
            // 1. Check active OTA folder first
            if (activeOtaPath != null && !activeOtaPath.isEmpty()) {
                File src = new File(activeOtaPath, relPath);
                if (src.exists() && src.isFile()) {
                    try (InputStream is = new FileInputStream(src)) {
                        if (copyStreamIfShaMatches(is, expectedSha, destFile)) {
                            return true;
                        }
                    }
                }
            }
            // 2. Check built-in APK assets
            try (InputStream is = ctx.getAssets().open("public/" + relPath)) {
                if (copyStreamIfShaMatches(is, expectedSha, destFile)) {
                    return true;
                }
            }
        } catch (Exception ignored) {
        }
        return false;
    }

    private static boolean copyStreamIfShaMatches(InputStream is, String expectedSha, File destFile) throws Exception {
        MessageDigest md = MessageDigest.getInstance("SHA-256");
        byte[] buf = new byte[16384];
        try (FileOutputStream fos = new FileOutputStream(destFile)) {
            int read;
            while ((read = is.read(buf)) != -1) {
                md.update(buf, 0, read);
                fos.write(buf, 0, read);
            }
        }
        String actualSha = bytesToHex(md.digest());
        if (actualSha.equalsIgnoreCase(expectedSha)) {
            return true;
        }
        destFile.delete();
        return false;
    }

    private static void copyAssetIfPresent(AssetManager assets, String assetPath, File destFile) {
        try (InputStream is = assets.open(assetPath)) {
            File parent = destFile.getParentFile();
            if (parent != null && !parent.exists()) parent.mkdirs();
            try (FileOutputStream fos = new FileOutputStream(destFile)) {
                byte[] buf = new byte[8192];
                int read;
                while ((read = is.read(buf)) != -1) {
                    fos.write(buf, 0, read);
                }
            }
        } catch (IOException ignored) {
        }
    }

    private static void copyAssetDirIfPresent(AssetManager assets, String assetDir, File destDir) {
        try {
            String[] children = assets.list(assetDir);
            if (children == null || children.length == 0) return;
            if (!destDir.exists()) destDir.mkdirs();
            for (String child : children) {
                String childAsset = assetDir + "/" + child;
                String[] nested = assets.list(childAsset);
                if (nested != null && nested.length > 0) {
                    copyAssetDirIfPresent(assets, childAsset, new File(destDir, child));
                } else {
                    copyAssetIfPresent(assets, childAsset, new File(destDir, child));
                }
            }
        } catch (IOException ignored) {
        }
    }

    private static void pruneOldBundles(Context ctx, String activePath, String stagedPath) {
        try {
            File root = new File(ctx.getFilesDir(), BUNDLES_DIR);
            File[] children = root.listFiles();
            if (children == null) return;
            for (File f : children) {
                String p = f.getAbsolutePath();
                if (p.equals(activePath) || p.equals(stagedPath)) continue;
                deleteRecursive(f);
            }
        } catch (Exception ignored) {
        }
    }

    private static void deleteRecursive(File f) {
        if (f == null || !f.exists()) return;
        if (f.isDirectory()) {
            File[] children = f.listFiles();
            if (children != null) {
                for (File c : children) deleteRecursive(c);
            }
        }
        f.delete();
    }

    private static byte[] readFileBytes(File f) throws IOException {
        try (InputStream is = new FileInputStream(f)) {
            return readStreamBytes(is);
        }
    }

    private static byte[] readStreamBytes(InputStream is) throws IOException {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        byte[] buf = new byte[8192];
        int read;
        while ((read = is.read(buf)) != -1) {
            out.write(buf, 0, read);
        }
        return out.toByteArray();
    }

    private static String bytesToHex(byte[] bytes) {
        StringBuilder sb = new StringBuilder(bytes.length * 2);
        for (byte b : bytes) {
            sb.append(String.format(Locale.US, "%02x", b));
        }
        return sb.toString();
    }
}
