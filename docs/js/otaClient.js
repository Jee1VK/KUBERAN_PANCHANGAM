/**
 * @fileoverview otaClient.js — PWA-Style Over-The-Air (OTA) Live Update Client
 * Works seamlessly inside the native Android APK (via Capacitor OtaUpdaterPlugin)
 * and falls back gracefully to Service Worker updates when opened in a browser.
 */
(function (global) {
    'use strict';

    const RESUME_CHECK_COOLDOWN_MS = 30 * 60 * 1000; // 30 minutes
    let lastResumeCheckMs = 0;
    let bannerDismissed = false;
    let pendingRemoteVersion = '';

    function getNativePlugin() {
        try {
            return (global.Capacitor && global.Capacitor.Plugins && global.Capacitor.Plugins.OtaUpdater) || null;
        } catch (_) {
            return null;
        }
    }

    function ensureBannerElement() {
        if (typeof document === 'undefined' || !document.body) return null;
        let el = document.getElementById('kuberanOtaBanner');
        if (el) return el;

        el = document.createElement('div');
        el.id = 'kuberanOtaBanner';
        el.setAttribute('role', 'status');
        el.setAttribute('aria-live', 'polite');
        el.style.cssText = [
            'display:none',
            'position:fixed',
            'left:12px',
            'right:12px',
            'bottom:calc(74px + env(safe-area-inset-bottom, 0px))',
            'max-width:520px',
            'margin:0 auto',
            'z-index:99995',
            'background:linear-gradient(135deg, #6B1D2F 0%, #3E0F1B 100%)',
            'border:1.5px solid #C5A059',
            'border-radius:12px',
            'padding:12px 14px',
            'box-shadow:0 10px 28px rgba(0,0,0,0.65)',
            'color:#FAFAF7',
            'font-family:inherit',
            'align-items:center',
            'justify-content:space-between',
            'gap:10px'
        ].join(';');

        el.innerHTML =
            '<div style="flex:1;min-width:0;">' +
                '<div style="font-size:0.86rem;font-weight:700;color:#F5D47A;">Live Update Ready</div>' +
                '<div id="kuberanOtaBannerMsg" style="font-size:0.75rem;color:#FAFAF7;opacity:0.92;margin-top:2px;">A newer Panchangam version has been downloaded offline.</div>' +
            '</div>' +
            '<div style="display:flex;align-items:center;gap:6px;flex-shrink:0;">' +
                '<button id="kuberanOtaReloadBtn" type="button" style="min-height:44px;padding:0 14px;background:#C5A059;color:#1C1917;border:none;border-radius:8px;font-weight:700;font-size:0.8rem;cursor:pointer;">Reload Now</button>' +
                '<button id="kuberanOtaDismissBtn" type="button" aria-label="Dismiss update banner" style="min-width:44px;min-height:44px;background:rgba(255,255,255,0.1);color:#FAFAF7;border:1px solid rgba(197,160,89,0.45);border-radius:8px;font-size:1rem;cursor:pointer;">&times;</button>' +
            '</div>';

        document.body.appendChild(el);

        const reloadBtn = document.getElementById('kuberanOtaReloadBtn');
        const dismissBtn = document.getElementById('kuberanOtaDismissBtn');
        if (reloadBtn) {
            reloadBtn.addEventListener('click', function () {
                applyNow();
            });
        }
        if (dismissBtn) {
            dismissBtn.addEventListener('click', function () {
                bannerDismissed = true;
                el.style.display = 'none';
            });
        }
        return el;
    }

    function showUpdateBanner(versionLabel, filesDownloaded) {
        if (bannerDismissed) return;
        const el = ensureBannerElement();
        if (!el) return;
        pendingRemoteVersion = versionLabel || '';
        const msgEl = document.getElementById('kuberanOtaBannerMsg');
        if (msgEl) {
            const verText = versionLabel ? 'Version ' + versionLabel : 'A newer version';
            const deltaText = (typeof filesDownloaded === 'number' && filesDownloaded > 0)
                ? ' (' + filesDownloaded + ' updated file' + (filesDownloaded === 1 ? '' : 's') + ' verified)'
                : ' (verified offline)';
            msgEl.textContent = verText + ' ready' + deltaText + '. Tap to switch instantly.';
        }
        el.style.display = 'flex';
    }

    function setSettingsFeedback(text, color) {
        const el = document.getElementById('otaStatusFeedback');
        if (!el) return;
        el.textContent = text;
        el.style.color = color || 'var(--text-dim)';
    }

    async function refreshStatusUI() {
        const badgeEl = document.getElementById('otaActiveBundleLabel');
        const rollbackBtn = document.getElementById('btnOtaRollback');
        const applyBtn = document.getElementById('btnOtaApplyStaged');
        const plugin = getNativePlugin();

        if (!plugin) {
            if (badgeEl) badgeEl.textContent = 'Web PWA (Service Worker Auto-Sync)';
            if (rollbackBtn) rollbackBtn.style.display = 'none';
            if (applyBtn) applyBtn.style.display = 'none';
            return { isNative: false, source: 'web-pwa' };
        }

        try {
            const status = await plugin.getStatus();
            if (badgeEl) {
                const srcLabel = status.source === 'ota' ? 'Live OTA Bundle' : 'Built-in APK Bundle';
                const ver = status.activeVersion || ('v' + (status.nativeVersionName || '2.0.0'));
                const shortHash = status.activeBundleHash ? (' #' + status.activeBundleHash.slice(0, 7)) : '';
                badgeEl.textContent = ver + shortHash + ' · ' + srcLabel;
            }
            if (rollbackBtn) {
                rollbackBtn.style.display = (status.source === 'ota') ? 'inline-flex' : 'none';
            }
            if (applyBtn) {
                applyBtn.style.display = status.hasStagedUpdate ? 'inline-flex' : 'none';
                if (status.hasStagedUpdate && status.pendingVersion) {
                    applyBtn.textContent = 'Apply ' + status.pendingVersion;
                }
            }
            return status;
        } catch (err) {
            if (badgeEl) badgeEl.textContent = 'Native APK (Offline Mode)';
            return { isNative: true, error: String(err) };
        }
    }

    async function checkNow(isSilent) {
        const plugin = getNativePlugin();
        if (!plugin) {
            if (!isSilent) {
                if (typeof navigator !== 'undefined' && navigator.serviceWorker) {
                    try {
                        const reg = await navigator.serviceWorker.getRegistration();
                        if (reg) await reg.update();
                        setSettingsFeedback('Web PWA service worker checked for updates.', 'var(--green)');
                    } catch (_) {
                        setSettingsFeedback('Offline — running cached PWA bundle.', 'var(--text-dim)');
                    }
                } else {
                    setSettingsFeedback('Live OTA updates are active inside the Android APK.', 'var(--text-dim)');
                }
            }
            return null;
        }

        if (!isSilent) {
            setSettingsFeedback('Checking for live OTA updates over HTTPS...', 'var(--gold-light)');
        }

        try {
            const res = await plugin.checkAndDownload();
            if (res && res.updateAvailable && res.downloaded) {
                bannerDismissed = false;
                showUpdateBanner(res.remoteVersion, res.filesDownloaded);
                if (!isSilent) {
                    setSettingsFeedback(
                        'Update ' + (res.remoteVersion || '') + ' downloaded & SHA-256 verified. Tap Apply or Reload Now.',
                        'var(--green)'
                    );
                }
                await refreshStatusUI();
            } else if (!isSilent) {
                if (res && res.status === 'up-to-date') {
                    setSettingsFeedback('You are on the latest live version (' + (res.activeVersion || 'up to date') + ').', 'var(--green)');
                } else if (res && res.status === 'native-update-required') {
                    setSettingsFeedback('A newer APK binary is required for version ' + (res.remoteVersion || '') + '.', 'var(--orange)');
                } else {
                    setSettingsFeedback('Offline or server unreachable — app continues 100% offline.', 'var(--text-dim)');
                }
            }
            return res;
        } catch (err) {
            if (!isSilent) {
                setSettingsFeedback('Unable to check updates right now (offline safe).', 'var(--text-dim)');
            }
            return null;
        }
    }

    async function clearBrowserCachesIfPresent() {
        try {
            if (typeof global.caches !== 'undefined' && global.caches && typeof global.caches.keys === 'function') {
                const keys = await global.caches.keys();
                await Promise.all(keys.map(function (k) { return global.caches.delete(k); }));
            }
        } catch (_) {}
    }

    async function applyNow() {
        const plugin = getNativePlugin();
        if (!plugin) {
            if (typeof location !== 'undefined') location.reload();
            return;
        }
        try {
            setSettingsFeedback('Applying verified OTA update...', 'var(--gold-light)');
            await clearBrowserCachesIfPresent();
            await plugin.applyUpdate();
        } catch (err) {
            setSettingsFeedback('Could not apply update: ' + (err && err.message ? err.message : err), 'var(--red)');
        }
    }

    async function rollback() {
        const plugin = getNativePlugin();
        if (!plugin) return;
        try {
            setSettingsFeedback('Restoring built-in APK bundle...', 'var(--orange)');
            await clearBrowserCachesIfPresent();
            await plugin.rollbackToBuiltIn();
        } catch (err) {
            setSettingsFeedback('Rollback failed: ' + (err && err.message ? err.message : err), 'var(--red)');
        }
    }

    function init() {
        const plugin = getNativePlugin();
        if (!plugin) {
            // Browser PWA fallback: surface banner when a new Service Worker activates/waits
            try {
                if (typeof navigator !== 'undefined' && navigator.serviceWorker) {
                    navigator.serviceWorker.getRegistration().then(function (reg) {
                        if (!reg) return;
                        if (reg.waiting) showUpdateBanner('PWA Update', 0);
                        reg.addEventListener('updatefound', function () {
                            const nw = reg.installing;
                            if (!nw) return;
                            nw.addEventListener('statechange', function () {
                                if (nw.state === 'installed' && navigator.serviceWorker.controller) {
                                    showUpdateBanner('PWA Update', 0);
                                }
                            });
                        });
                    }).catch(function () {});
                }
            } catch (_) {}
            return;
        }

        // 1. Confirm healthy boot to native crash-rollback watchdog
        try {
            plugin.notifyAppReady().catch(function () {});
        } catch (_) {}

        // 2. Refresh status badge and run non-blocking silent OTA check 2.5s after launch
        setTimeout(function () {
            refreshStatusUI();
            checkNow(true);
        }, 2500);

        // 3. Re-check on app foreground resume (throttled to 30 min)
        try {
            const capApp = global.Capacitor && global.Capacitor.Plugins && global.Capacitor.Plugins.App;
            if (capApp && typeof capApp.addListener === 'function') {
                capApp.addListener('appStateChange', function (state) {
                    if (state && state.isActive) {
                        const now = Date.now();
                        if (now - lastResumeCheckMs >= RESUME_CHECK_COOLDOWN_MS) {
                            lastResumeCheckMs = now;
                            checkNow(true);
                        }
                    }
                });
            }
        } catch (_) {}
    }

    global.KuberanOTA = {
        init: init,
        refreshStatusUI: refreshStatusUI,
        checkNow: checkNow,
        applyNow: applyNow,
        rollback: rollback,
        getPendingVersion: function () { return pendingRemoteVersion; }
    };
})(typeof window !== 'undefined' ? window : globalThis);
