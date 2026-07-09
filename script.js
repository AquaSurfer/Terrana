/*
 * Copyright (C) 2026 G.R.Morris (aka Aquasurf/Aquasurfer)
 * All Rights Reserved.
 *
 * This file is part of Terrana — a proprietary asset. The code,
 * visuals, and audio that make up this project are exclusively
 * licensed to their owner. No part of this file may be copied,
 * modified, distributed, or re-hosted without prior written
 * permission from the copyright holder.
 */

// ============================================================
// TERRANA — CLASS C TECHNICAL MANUAL
// script.js — Full Production Build (Patched + Enhanced)
// Fixes applied: #1-#15 per audit
// Features: Boot sequence, subtitle typing, progress indicator,
//           system bars animate-in, hover dimming, blueprint
//           pan/zoom/minimap, ambient audio
// ============================================================

// ============================================================
// BUILD STAMP — bump this on every deploy so it's easy to
// confirm GitHub Pages is actually serving the latest version.
// Shown in the sidebar under the local time, and logged to
// the browser console on load.
// ============================================================
const BUILD_STAMP = 'BUILD 2026-07-07.04';

document.addEventListener('DOMContentLoaded', function () {
    const stampEl = document.getElementById('build-stamp-value');
    if (stampEl) stampEl.textContent = BUILD_STAMP;
    console.log('[TERRANA] ' + BUILD_STAMP);
});

// ============================================================
// TELEMETRY SIGNAL LOST — universal broken-image fallback
//
// Applies to every <img> on the site (blueprints, projections,
// cover render, logos, lightbox, lore terminal, etc). Any image
// that fails to load is swapped for an in-universe placeholder
// instead of the browser's default broken-image icon.
//
// Runs as an IIFE immediately at parse time (not gated behind
// DOMContentLoaded) plus a startup sweep, because this file loads
// with `defer` — by the time it executes, the browser has already
// started requesting every <img> on the page, so a same-tick
// failure could otherwise be missed by a listener attached later.
// ============================================================
(function () {
    function buildFallbackSVG(label, w, h) {
        w = Math.max(60, w || 240);
        h = Math.max(40, h || 160);
        var fontMain = Math.max(9, Math.min(w, h) * 0.09).toFixed(1);
        var fontSub  = Math.max(7, Math.min(w, h) * 0.055).toFixed(1);
        var safeLabel = String(label || 'ASSET').toUpperCase().replace(/[<>&"']/g, '');
        return 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(
            '<svg xmlns="http://www.w3.org/2000/svg" width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + ' ' + h + '">' +
            '<rect width="100%" height="100%" fill="#060a08"/>' +
            '<rect x="1" y="1" width="' + (w - 2) + '" height="' + (h - 2) + '" fill="none" stroke="#39ff6a" stroke-opacity="0.35"/>' +
            '<line x1="0" y1="0" x2="' + w + '" y2="' + h + '" stroke="#39ff6a" stroke-opacity="0.08"/>' +
            '<line x1="' + w + '" y1="0" x2="0" y2="' + h + '" stroke="#39ff6a" stroke-opacity="0.08"/>' +
            '<text x="50%" y="46%" fill="#39ff6a" font-family="Courier New, monospace" font-size="' + fontMain + '" text-anchor="middle">// TELEMETRY SIGNAL LOST</text>' +
            '<text x="50%" y="60%" fill="#39ff6a" fill-opacity="0.7" font-family="Courier New, monospace" font-size="' + fontSub + '" text-anchor="middle">' + safeLabel + ' FEED UNAVAILABLE</text>' +
            '</svg>'
        );
    }

    function isFallback(el) {
        return !!(el.src && el.src.indexOf('data:image/svg+xml') === 0);
    }

    function handleBrokenImage(el) {
        if (!el || el.tagName !== 'IMG' || isFallback(el)) return;
        var label = (el.alt && el.alt.trim()) ? el.alt.trim() : (el.id || 'ASSET');
        var w = parseInt(el.getAttribute('width'), 10)  || el.offsetWidth  || 240;
        var h = parseInt(el.getAttribute('height'), 10) || el.offsetHeight || 160;
        el.src = buildFallbackSVG(label, w, h);
        el.classList.add('telemetry-lost');
        if (window.logOperatorEvent) {
            window.logOperatorEvent('warn', 'TELEMETRY: ASSET LOAD FAILURE — ' + label.toUpperCase());
        }
    }

    // 'error' and 'load' don't bubble on media elements, so a capture-phase
    // listener on document is the standard way to catch them globally
    // without wiring an onerror handler onto every single <img> tag.
    document.addEventListener('error', function (e) {
        if (e.target && e.target.tagName === 'IMG') handleBrokenImage(e.target);
    }, true);

    document.addEventListener('load', function (e) {
        var el = e.target;
        if (el && el.tagName === 'IMG' && el.classList.contains('telemetry-lost') && !isFallback(el)) {
            el.classList.remove('telemetry-lost'); // self-heals if a later, valid src loads (e.g. switching blueprint level)
        }
    }, true);

    // Catch anything that already finished failing before this script ran
    function sweepExistingImages() {
        document.querySelectorAll('img').forEach(function (img) {
            if (img.complete && img.naturalWidth === 0 && !isFallback(img)) {
                handleBrokenImage(img);
            }
        });
    }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', sweepExistingImages);
    } else {
        sweepExistingImages();
    }
})();

// ============================================================
// BOOT SEQUENCE (runs before DOMContentLoaded)
// ============================================================
(function () {
    const BOOT_LINES = [
        { text: '// ANGELSTARR SYSTEMS — CORE NETWORK INTERFACE v4.2', cls: '' },
        { text: 'BIOS POST SCAN..............................................', cls: '' },
        { text: '  [OK] REACTOR CORE DIAGNOSTIC PASSED', cls: 'ok' },
        { text: '  [OK] SHIELD MATRIX ARRAY ONLINE', cls: 'ok' },
        { text: '  [OK] WEAPONS SYSTEMS NOMINAL', cls: 'ok' },
        { text: '  [WARN] CARGO MANIFEST: 1222 / 31500 UNITS LOADED', cls: 'warn' },
        { text: '  [OK] HYPERDRIVE CORE CALIBRATED — 30 LY RANGE', cls: 'ok' },
        { text: '  [OK] CREW LINK ACTIVE — 50 CREW CONFIRMED', cls: 'ok' },
        { text: '  [OK] HULL INTEGRITY: 100%', cls: 'ok' },
        { text: '  [OK] NAVIGATION MATRIX INITIALISING...', cls: 'ok' },
        { text: 'LOADING TERRANA TECHNICAL SCHEMATIC DATABASE...', cls: '' },
        { text: '  [OK] DECK BLUEPRINTS LOADED — 5 LEVELS', cls: 'ok' },
        { text: '  [OK] STRUCTURAL BREAKDOWN MATRICES PARSED', cls: 'ok' },
        { text: '  [OK] ENGINEERING MODIFICATION MANIFEST VERIFIED', cls: 'ok' },
        { text: '  [OK] TELEMETRY FEED ACTIVE', cls: 'ok' },
        { text: '', cls: '' },
        { text: '// BOOT COMPLETE — AUTHENTICATING OPERATOR CREDENTIALS...', cls: '' },
        { text: '// ACCESS GRANTED — WELCOME, COMMANDER', cls: 'ok' },
    ];

    const SESSION_KEY = 'terrana_booted';
    const overlay = document.getElementById('boot-overlay');
    const terminal = document.getElementById('boot-terminal');
    const skipBtn = document.getElementById('boot-skip');

    if (!overlay) return;

    // Skip boot if already seen this session
    if (sessionStorage.getItem(SESSION_KEY)) {
        overlay.style.display = 'none';
        return;
    }

    let lineIndex = 0;
    const lineDelay = 95;

    function showNextLine() {
        if (lineIndex >= BOOT_LINES.length) {
            // Pause then dismiss
            setTimeout(dismissBoot, 700);
            return;
        }
        const { text, cls } = BOOT_LINES[lineIndex];
        const span = document.createElement('span');
        span.className = 'boot-line' + (cls ? ' ' + cls : '');
        span.textContent = text || '\u00A0';
        terminal.appendChild(span);
        // Force reflow then add visible
        requestAnimationFrame(() => {
            requestAnimationFrame(() => { span.classList.add('visible'); });
        });
        lineIndex++;
        setTimeout(showNextLine, lineDelay);
    }

    function dismissBoot() {
        sessionStorage.setItem(SESSION_KEY, '1');
        overlay.classList.add('fade-out');
        setTimeout(() => { overlay.style.display = 'none'; }, 650);
    }

    if (skipBtn) {
        skipBtn.addEventListener('click', dismissBoot);
    }

    showNextLine();
})();

// ============================================================
// MAIN DOM-READY ENGINE
// ============================================================
document.addEventListener("DOMContentLoaded", () => {
    const navLinks = document.querySelectorAll('.sidebar a');
    const sections = document.querySelectorAll('.manual-section');

    // ============================================================
    // WEB AUDIO SYNTHESIZER FRAMEWORK
    // ============================================================
    let audioSystemEnabled = true;
    const audioBtn = document.getElementById('audio-toggle');

    // Single shared AudioContext for FX (Fix #11 — avoid per-call instantiation for SFX too)
    let sharedAudioCtx = null;

    function getAudioCtx() {
        if (!sharedAudioCtx || sharedAudioCtx.state === 'closed') {
            const AC = window.AudioContext || window.webkitAudioContext;
            if (!AC) return null;
            sharedAudioCtx = new AC();
        }
        if (sharedAudioCtx.state === 'suspended') {
            sharedAudioCtx.resume();
        }
        return sharedAudioCtx;
    }

    if (audioBtn) {
        audioBtn.addEventListener('click', () => {
            audioSystemEnabled = !audioSystemEnabled;
            if (audioSystemEnabled) {
                audioBtn.classList.remove('muted');
                audioBtn.innerHTML = `<span class="audio-icon">🔊</span> AUDIO CLICK: ON`;
                playSystemPulse(180, 0.04, 'sine');
                if (window.logOperatorEvent) window.logOperatorEvent('ok', 'OPERATOR: AUDIO FX ENABLED — SYSTEM SOUND ACTIVE');
            } else {
                audioBtn.classList.add('muted');
                audioBtn.innerHTML = `<span class="audio-icon">🔇</span> AUDIO CLICK: OFF`;
                if (window.logOperatorEvent) window.logOperatorEvent('warn', 'OPERATOR: AUDIO FX MUTED — SYSTEM SOUND SUPPRESSED');
            }
            updateAudioStatusPanel();
        });
    }

    function playSystemPulse(frequency, duration, oscillatorType = 'sine') {
        if (!audioSystemEnabled) return;
        try {
            const ctx = getAudioCtx();
            if (!ctx) return;

            const osc  = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = oscillatorType;
            osc.frequency.setValueAtTime(frequency, ctx.currentTime);

            gain.gain.setValueAtTime(0.15, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start();
            osc.stop(ctx.currentTime + duration);
        } catch (e) {
            console.warn("Audio Context initialization deferred until user interaction.");
        }
    }

    // ============================================================
    // AMBIENT BACKGROUND AUDIO ENGINE
    // ============================================================
    let ambientEnabled = false;
    let ambientNodes = null;
    let ambientAudioCtx = null;

    const ambientBtn = document.getElementById('ambient-toggle');
    const ambientIndicator = document.getElementById('ambient-indicator');

    function startAmbient() {
        try {
            const AC = window.AudioContext || window.webkitAudioContext;
            if (!AC) return;
            ambientAudioCtx = new AC();

            // Resume must resolve before scheduling — Chrome starts contexts suspended
            // even inside a click handler. All timing is relative to post-resume currentTime.
            ambientAudioCtx.resume().then(() => {
                const ctx = ambientAudioCtx;
                if (!ctx) return;
                const now = ctx.currentTime;

                // Master gain — exponential fade-in from near-zero over 3s
                const masterGain = ctx.createGain();
                masterGain.gain.setValueAtTime(0.0001, now);
                masterGain.gain.exponentialRampToValueAtTime(0.08, now + 3.0);
                masterGain.connect(ctx.destination);

                // Layered oscillators for a deep engine drone
                const layers = [
                    { freq: 40,  type: 'sine',     vol: 0.6  },  // sub-bass rumble
                    { freq: 55,  type: 'sine',     vol: 0.5  },  // fundamental drone
                    { freq: 110, type: 'sine',     vol: 0.25 },  // first harmonic
                    { freq: 82,  type: 'triangle', vol: 0.18 },  // warm mid texture
                    { freq: 165, type: 'sine',     vol: 0.08 },  // upper shimmer
                ];

                const oscs = layers.map(({ freq, type, vol }) => {
                    const osc     = ctx.createOscillator();
                    const oscGain = ctx.createGain();
                    osc.type = type;
                    osc.frequency.setValueAtTime(freq, now);
                    oscGain.gain.setValueAtTime(vol, now);
                    osc.connect(oscGain);
                    oscGain.connect(masterGain);
                    osc.start(now);
                    return osc;
                });

                // Slow LFO pitch wobble on fundamental (0.08 Hz)
                const lfo     = ctx.createOscillator();
                const lfoGain = ctx.createGain();
                lfo.type = 'sine';
                lfo.frequency.setValueAtTime(0.08, now);
                lfoGain.gain.setValueAtTime(0.8, now);
                lfo.connect(lfoGain);
                lfoGain.connect(oscs[1].frequency);
                lfo.start(now);

                // Subtle tremolo for a breathing / living engine feel
                const tremolo     = ctx.createOscillator();
                const tremoloGain = ctx.createGain();
                tremolo.type = 'sine';
                tremolo.frequency.setValueAtTime(0.22, now);
                tremoloGain.gain.setValueAtTime(0.012, now);
                tremolo.connect(tremoloGain);
                tremoloGain.connect(masterGain.gain);
                tremolo.start(now);

                ambientNodes = { masterGain, oscs, lfo, tremolo };

                if (ambientIndicator) {
                    ambientIndicator.textContent = '// ENGINE HUM ACTIVE';
                    ambientIndicator.classList.add('active');
                }
            }).catch(e => {
                console.warn('Ambient audio resume failed:', e);
            });

        } catch (e) {
            console.warn('Ambient audio failed:', e);
        }
    }

    function stopAmbient() {
        if (!ambientNodes || !ambientAudioCtx) return;
        try {
            const { masterGain, oscs, lfo, tremolo } = ambientNodes;
            masterGain.gain.cancelScheduledValues(ambientAudioCtx.currentTime);
            masterGain.gain.setValueAtTime(masterGain.gain.value, ambientAudioCtx.currentTime);
            masterGain.gain.linearRampToValueAtTime(0.0001, ambientAudioCtx.currentTime + 1.5);
            setTimeout(() => {
                oscs.forEach(o => { try { o.stop(); } catch (e) {} });
                try { lfo.stop(); }     catch (e) {}
                try { tremolo.stop(); } catch (e) {}
                ambientAudioCtx.close();
                ambientAudioCtx = null;
                ambientNodes = null;
            }, 1700);
        } catch (e) {}
        if (ambientIndicator) {
            ambientIndicator.textContent = '// ENGINE HUM OFFLINE';
            ambientIndicator.classList.remove('active');
        }
    }

    if (ambientBtn) {
        ambientBtn.addEventListener('click', () => {
            ambientEnabled = !ambientEnabled;
            if (ambientEnabled) {
                ambientBtn.innerHTML = `<span class="audio-icon">🌌</span> AMBIENT: ON`;
                startAmbient();
                if (window.logOperatorEvent) window.logOperatorEvent('ok', 'OPERATOR: AMBIENT ENGINE HUM ENGAGED — DRONE LAYERS ACTIVE');
            } else {
                ambientBtn.innerHTML = `<span class="audio-icon">🌌</span> AMBIENT: OFF`;
                stopAmbient();
                if (window.logOperatorEvent) window.logOperatorEvent('warn', 'OPERATOR: AMBIENT ENGINE HUM DISENGAGED — DRONE OFFLINE');
            }
            updateAudioStatusPanel();
        });
    }

    // ============================================================
    // DYNAMIC DIAGNOSTICS COUNTER ENGINE
    // Calibrated: Reactor = 100% | Shields = 10000 MW
    // ============================================================
    function initializeHardwareCounters() {
        try {
            const reactorEl = document.getElementById('tick-reactor');
            const shieldsEl = document.getElementById('tick-shields');
            if (!reactorEl || !shieldsEl) return;

            const targetReactor = 100;
            const targetShields = 10000;

            let currentReactor = 0;
            let currentShields = 0;

            const duration    = 1200;
            const intervalTime = 20;
            const steps        = duration / intervalTime;
            const stepReactor  = targetReactor / steps;
            const stepShields  = targetShields / steps;

            const counterTimer = setInterval(() => {
                currentReactor += stepReactor;
                currentShields += stepShields;

                if (currentReactor >= targetReactor) {
                    reactorEl.textContent = targetReactor;
                    shieldsEl.textContent = targetShields;
                    clearInterval(counterTimer);
                    playSystemPulse(220, 0.15, 'triangle');
                } else {
                    reactorEl.textContent = Math.floor(currentReactor);
                    shieldsEl.textContent = Math.floor(currentShields);
                    if (Math.random() > 0.7) playSystemPulse(80, 0.01, 'sine');
                }
            }, intervalTime);
        } catch (e) {
            console.warn('Hardware counter init failed:', e);
        }
    }

    initializeHardwareCounters();

    // ============================================================
    // PROCEDURAL LIVE TELEMETRY NOISE — decimal jitter on reactor/shields
    // ============================================================
    (function startLiveTelemetryNoise() {
        const reactorEl = document.getElementById('tick-reactor');
        const shieldsEl = document.getElementById('tick-shields');

        // Base values — only run noise after counters have settled
        const REACTOR_BASE  = 100;
        const SHIELDS_BASE  = 10000;

        // Jitter ranges
        const REACTOR_JITTER  = 0.15; // ±0.15 around 100
        const SHIELDS_JITTER  = 8;    // ±8 around 10000

        // Don't start until counters finish (~1300ms)
        setTimeout(() => {
            setInterval(() => {
                if (reactorEl && reactorEl.textContent === '100') {
                    const jR = (Math.random() * REACTOR_JITTER * 2 - REACTOR_JITTER).toFixed(2);
                    const val = (REACTOR_BASE + parseFloat(jR)).toFixed(2);
                    reactorEl.textContent = val;
                }
                if (shieldsEl && shieldsEl.textContent === '10000') {
                    const jS = Math.round(Math.random() * SHIELDS_JITTER * 2 - SHIELDS_JITTER);
                    shieldsEl.textContent = SHIELDS_BASE + jS;
                }
            }, 1800 + Math.random() * 400);
        }, 1500);

        // Also jitter the sidebar display text post-boot
        setInterval(() => {
            if (reactorEl) {
                const cur = parseFloat(reactorEl.textContent);
                if (!isNaN(cur) && cur > 50) {
                    const jR = (Math.random() * 0.2 - 0.1).toFixed(2);
                    reactorEl.textContent = (cur + parseFloat(jR)).toFixed(2);
                }
            }
        }, 2200);
    })();

    // ============================================================
    // MAINTENANCE LOG ENGINE — live terminal event feed
    // ============================================================
    (function initMaintenanceLog() {
        const logBody  = document.getElementById('maint-log-body');
        const countEl  = document.getElementById('maint-entry-count');
        if (!logBody) return;

        // Seed events — realistic ship log entries
        const SEED_EVENTS = [
            { type: 'ok',   msg: 'SYSTEM: BOOT SEQUENCE COMPLETED — ALL MODULES NOMINAL' },
            { type: 'ok',   msg: 'REACTOR: PINCH 8Z CORE CALIBRATION SUCCESSFUL — OUTPUT 40 GW' },
            { type: 'ok',   msg: 'SHIELDS: MATRIX ARRAY FULLY CHARGED — 10000 MW CAPACITY' },
            { type: 'ok',   msg: 'WEAPONS: PAR ARRAY ALIGNED — BEAM CONVERGENCE OPTIMAL' },
            { type: 'ok',   msg: 'HYPERDRIVE: J-52 GAMMA CORE LOCKED — JUMP RANGE 30 LY' },
            { type: 'warn', msg: 'WARNING: CARGO AT 3.9% CAPACITY — MANIFEST VARIANCE FLAGGED' },
            { type: 'ok',   msg: 'CREW LINK: ALL 50 CREW STATIONS CONFIRMED ACTIVE' },
            { type: 'ok',   msg: 'NAV COMPUTER: NAVIGATION MATRIX SYNCHRONISED' },
            { type: 'ok',   msg: 'OVERRIDE: SHIP SIZE LIMIT BYPASS CONFIRMED ACTIVE' },
            { type: 'warn', msg: 'MAINTENANCE: COOLANT PRESSURE READING 91% — MONITORING' },
            { type: 'ok',   msg: 'STEALTH DRIVE: EVASIVE MATRIX PATCH APPLIED SUCCESSFULLY' },
            { type: 'ok',   msg: 'HULL: FULL INTEGRITY SCAN PASSED — 1000/1000 NOMINAL' },
            { type: 'ok',   msg: 'FUEL: RESERVE NOMINAL AT 300 UNITS — LONG-RANGE READY' },
            { type: 'ok',   msg: 'TACTICAL: CHEAT TERMINAL ARMED — OVERRIDE PROTOCOLS LIVE' },
        ];

        const LIVE_POOL = [
            { type: 'ok',   msg: 'REACTOR: THERMAL OUTPUT STABILISED — VARIANCE WITHIN TOLERANCE' },
            { type: 'ok',   msg: 'SHIELD: REGENERATION CYCLE COMPLETE — FULL CAPACITY RESTORED' },
            { type: 'warn', msg: 'SENSOR: MINOR CALIBRATION DRIFT DETECTED ON AFT ARRAY — CORRECTING' },
            { type: 'ok',   msg: 'ENGINE: THRUSTER VECTOR ALIGNMENT VERIFIED — BURN OPTIMAL' },
            { type: 'ok',   msg: 'CREW: WATCH ROTATION COMPLETED — ALL POSTS MANNED' },
            { type: 'warn', msg: 'COOLANT: PRESSURE FLUCTUATION — STABLE AT 91% — LOGGED' },
            { type: 'ok',   msg: 'HULL: MICRO-STRESS SCAN NOMINAL — NO STRUCTURAL ANOMALIES' },
            { type: 'ok',   msg: 'NAV: POSITIONAL TRIANGULATION UPDATED — LOCK CONFIRMED' },
            { type: 'ok',   msg: 'WEAPONS: MSL LAUNCHER AUTOLOAD CYCLE COMPLETE — READY' },
            { type: 'ok',   msg: 'REACTOR: HARMONIC OSCILLATION WITHIN 0.04% — NOMINAL' },
            { type: 'warn', msg: 'CARGO: BAY 3 SEAL PRESSURE DELTA — WITHIN SAFE MARGINS' },
            { type: 'ok',   msg: 'HYPERDRIVE: JUMP CAPACITOR CHARGE AT 100% — STANDING BY' },
            { type: 'ok',   msg: 'OVERRIDE: RAMTECH UNLIMITED PARAMETERS CONFIRMED ACTIVE' },
            { type: 'ok',   msg: 'COMM: ANGELSTARR CORE NETWORK LINK NOMINAL — SIGNAL STRONG' },
            { type: 'warn', msg: 'PAR ARRAY: MINOR HEAT BUILDUP ON EMITTER 2 — COOLING ENGAGED' },
            { type: 'ok',   msg: 'STEALTH: EVASIVE DRIVE MATRIX STANDING BY — PASSIVE MODE' },
            { type: 'ok',   msg: 'LIFE SUPPORT: ALL DECKS NOMINAL — ATMOSPHERE OPTIMAL' },
        ];

        function formatTimestamp() {
            const now = new Date();
            const d   = String(now.getDate()).padStart(2, '0');
            const mo  = String(now.getMonth() + 1).padStart(2, '0');
            const yr  = String(now.getFullYear()).slice(2);
            const h   = String(now.getHours()).padStart(2, '0');
            const m   = String(now.getMinutes()).padStart(2, '0');
            const s   = String(now.getSeconds()).padStart(2, '0');
            return `[${d}/${mo}/${yr} - ${h}:${m}:${s}]`;
        }

        let entryCount = 0;
        const MAX_LOG_ENTRIES = 50; // cap DOM rows during long sessions — trims oldest first

        function appendLogEntry(type, msg, animated) {
            const row = document.createElement('div');
            row.className = `maint-log-row maint-${type}` + (animated ? ' maint-row-new' : '');

            const ts  = document.createElement('span');
            ts.className = 'maint-timestamp';
            ts.textContent = formatTimestamp();

            const badge = document.createElement('span');
            badge.className = `maint-badge maint-badge-${type}`;
            badge.textContent = type === 'ok' ? 'OK' : 'WARN';

            const text = document.createElement('span');
            text.className = 'maint-msg';
            text.textContent = msg;

            row.appendChild(ts);
            row.appendChild(badge);
            row.appendChild(text);
            logBody.appendChild(row);

            // Trim oldest rows once we exceed the cap — keeps the DOM
            // bounded during long sessions instead of growing forever.
            while (logBody.children.length > MAX_LOG_ENTRIES) {
                logBody.removeChild(logBody.firstChild);
            }

            // Scroll to bottom
            logBody.scrollTop = logBody.scrollHeight;

            entryCount++;
            if (countEl) countEl.textContent = `${entryCount} EVENT${entryCount !== 1 ? 'S' : ''} LOGGED`;

            // Remove animation class after it completes
            if (animated) setTimeout(() => row.classList.remove('maint-row-new'), 600);
        }

        // Seed initial events with slight stagger to mimic loading
        SEED_EVENTS.forEach((ev, i) => {
            setTimeout(() => appendLogEntry(ev.type, ev.msg, false), i * 60);
        });

        // Live events: random interval between 12–28 seconds
        function scheduleNextLiveEvent() {
            const delay = 12000 + Math.random() * 16000;
            setTimeout(() => {
                const pick = LIVE_POOL[Math.floor(Math.random() * LIVE_POOL.length)];
                appendLogEntry(pick.type, pick.msg, true);
                scheduleNextLiveEvent();
            }, delay);
        }

        setTimeout(scheduleNextLiveEvent, 5000);

        // Expose so other modules can push operator events
        window.logOperatorEvent = function (type, msg) {
            appendLogEntry(type, msg, true);
        };
    })();

    // ============================================================
    // SUBTITLE TYPING EFFECT
    // ============================================================
    function typeSubtitle() {
        const el = document.getElementById('cover-subtitle');
        if (!el) return;
        const text = 'TACTICAL SHIP OPERATING MANUAL // DECK SCHEMATICS';
        let i = 0;
        const delay = 50;
        function tick() {
            if (i <= text.length) {
                el.textContent = text.slice(0, i);
                i++;
                setTimeout(tick, delay);
            }
        }
        // Start after a short pause (feels right after the cover animates in)
        setTimeout(tick, 600);
    }

    typeSubtitle();

    // ============================================================
    // SECTION PROGRESS INDICATOR
    // ============================================================
    const sectionOrder = ['#cover', '#specs', '#blueprints', '#breakdown', '#credits', '#maintenance'];
    const progressFill = document.getElementById('nav-progress-fill');

    function updateProgressIndicator(activeHash) {
        if (!progressFill) return;
        const idx = sectionOrder.indexOf(activeHash);
        if (idx < 0) return;
        // Each step = 1/(n-1) of the track; section 0 = 0%, last = 100%
        const pct = sectionOrder.length > 1
            ? (idx / (sectionOrder.length - 1)) * 100
            : 0;
        progressFill.style.height = pct + '%';
    }

    // ============================================================
    // SYSTEM BARS — animate in on section load
    // ============================================================
    function animateSystemBarsIn() {
        try {
            const tracks = document.querySelectorAll('.bar-meter-track');
            const targets = {};
            document.querySelectorAll('.power-static').forEach(stat => {
                const sys = stat.getAttribute('data-system');
                if (sys) targets[sys] = parseInt(stat.textContent, 10) || 0;
            });

            tracks.forEach(t => {
                t.setAttribute('data-bars', '0');
                t.classList.remove('animate-in');
            });

            let step = 0;
            const totalSteps = 12;
            const interval = setInterval(() => {
                step++;
                document.querySelectorAll('.system-col').forEach(col => {
                    const sys   = col.getAttribute('data-system');
                    const track = col.querySelector('.bar-meter-track');
                    if (!track || !sys) return;
                    const target = targets[sys] || 12;
                    if (step <= target) {
                        track.setAttribute('data-bars', step.toString());
                        track.classList.add('animate-in');
                    }
                });
                if (step % 3 === 0) playSystemPulse(100 + step * 10, 0.015, 'sine');
                if (step >= totalSteps) clearInterval(interval);
            }, 60);
        } catch (e) {
            console.warn('System bar animation failed:', e);
        }
    }

    let specsAnimated = false;

    // ============================================================
    // OPERATOR ACTIVITY LOGGER — hooks into nav, blueprint, breakdown
    // ============================================================
    const SECTION_LOG_LABELS = {
        '#cover':       'TECHNICAL ARCHIVE — COVER PAGE',
        '#specs':       'VESSEL SPECIFICATIONS — SECTION 01',
        '#blueprints':  'DECK BLUEPRINTS — SECTION 02',
        '#breakdown':   'STRUCTURAL BREAKDOWN — SECTION 03',
        '#credits':     'ENGINEERING MODIFICATION CREDITS — SECTION 04',
        '#maintenance': 'MAINTENANCE & OVERRIDES — SECTION 05',
    };

    // Exposed globally so switchBlueprint / switchBreakdownDeck / switchBreakdownProjection can call it
    window.logOperatorEvent = function(type, msg) {
        const logBody = document.getElementById('maint-log-body');
        const countEl = document.getElementById('maint-entry-count');
        if (!logBody) return;

        const now = new Date();
        const ts  = `[${String(now.getDate()).padStart(2,'0')}/${String(now.getMonth()+1).padStart(2,'0')}/${String(now.getFullYear()).slice(2)} - ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}]`;

        const row = document.createElement('div');
        row.className = `maint-log-row maint-op maint-row-new`;

        const tsEl = document.createElement('span');
        tsEl.className = 'maint-timestamp';
        tsEl.textContent = ts;

        const badge = document.createElement('span');
        badge.className = 'maint-badge maint-badge-op';
        badge.textContent = 'OP';

        const text = document.createElement('span');
        text.className = 'maint-msg';
        text.textContent = msg;

        row.appendChild(tsEl);
        row.appendChild(badge);
        row.appendChild(text);
        logBody.appendChild(row);
        logBody.scrollTop = logBody.scrollHeight;

        const allRows = logBody.querySelectorAll('.maint-log-row').length;
        if (countEl) countEl.textContent = `${allRows} EVENT${allRows !== 1 ? 'S' : ''} LOGGED`;

        setTimeout(() => row.classList.remove('maint-row-new'), 600);
    };

    // ============================================================
    // NAVIGATION SUBROUTINE ENGINE
    // ============================================================
    function navigateToSection(targetId) {
        if (!targetId || !targetId.startsWith('#')) return;

        navLinks.forEach(link => link.classList.remove('active'));
        sections.forEach(section => section.classList.remove('active-section'));

        const activeLink    = document.querySelector(`.sidebar a[href="${targetId}"]`);
        const targetSection = document.querySelector(targetId);

        if (activeLink && targetSection) {
            activeLink.classList.add('active');
            targetSection.classList.add('active-section');
            window.scrollTo(0, 0);

            // Sequential stagger: add .stagger-child to direct staggerable children
            const staggerables = targetSection.querySelectorAll(
                '.spec-card, .manifest-entry, .credits-card, .maint-log-panel, .maint-status-card, .mesh-cell, .stat-slider-row, .integrity-row, .override-flag'
            );
            staggerables.forEach((el, i) => {
                el.style.opacity = '0';
                el.style.transform = 'translateY(10px)';
                el.style.transition = 'none';
                requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                        el.style.transition = `opacity 0.35s ease ${i * 55}ms, transform 0.35s ease ${i * 55}ms`;
                        el.style.opacity = '1';
                        el.style.transform = 'translateY(0)';
                    });
                });
            });

            // Log operator navigation (skip cover on initial load — too noisy)
            const label = SECTION_LOG_LABELS[targetId];
            if (label && targetId !== '#cover') {
                window.logOperatorEvent('ok', `OPERATOR: ACCESSED ${label}`);
            }
        }

        updateProgressIndicator(targetId);

        // Animate system bars in when specs section first activates
        if (targetId === '#specs' && !specsAnimated) {
            specsAnimated = true;
            setTimeout(animateSystemBarsIn, 200);
        }
    }

    navLinks.forEach(link => {
        link.addEventListener('click', function (e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            playSystemPulse(120, 0.05, 'sine');
            navigateToSection(targetId);
            window.location.hash = targetId;
        });
    });

    const initialHash = window.location.hash;
    if (initialHash && document.querySelector(initialHash)) {
        navigateToSection(initialHash);
    } else {
        navigateToSection('#cover');
    }

    // (Lightbox overlay system removed — Legend and Structural Breakdown
    // now use the contained pan-zoom viewer instead of a fullscreen
    // lightbox, and nothing else in the site used .zoomable-asset.)


    const outboundLinks = document.querySelectorAll('.telemetry-link, .telemetry-link-compact, .terminal-notes-link');
    outboundLinks.forEach(link => {
        link.addEventListener('click', () => {
            playSystemPulse(240, 0.1, 'sine');
        });
    });

    // ============================================================
    // SYSTEM MATRIX POWER CONTROLLER ENGINE
    // ============================================================
    const initButton = document.getElementById("system-power-btn");

    // Map system tags to their bar track elements
    const systemTracks = {};
    document.querySelectorAll(".system-col").forEach(column => {
        const sysName = column.getAttribute("data-system");
        if (sysName) {
            systemTracks[sysName] = column.querySelector(".bar-meter-track");
        }
    });

    // Fix #10 — inputs was querying .power-input which doesn't exist; removed safely
    if (initButton) {
        initButton.addEventListener("click", () => {
            const statElements     = document.querySelectorAll(".power-static");
            const targetAllocations = {};

            statElements.forEach(stat => {
                const sys = stat.getAttribute("data-system");
                targetAllocations[sys] = parseInt(stat.textContent, 10) || 0;
            });

            initButton.disabled  = true;
            initButton.innerText = "INITIALIZING CORES...";
            playSystemPulse(160, 0.12, 'sawtooth');

            Object.values(systemTracks).forEach(track => track.setAttribute("data-bars", "0"));

            let currentTickStep = 1;
            const totalSteps    = 12;
            const stepDelayMs   = 80;

            const sequenceInterval = setInterval(() => {
                Object.keys(targetAllocations).forEach(sysKey => {
                    const targetMax    = targetAllocations[sysKey];
                    const trackElement = systemTracks[sysKey];
                    if (trackElement && currentTickStep <= targetMax) {
                        trackElement.setAttribute("data-bars", currentTickStep.toString());
                    }
                });

                if (currentTickStep % 2 === 0) {
                    playSystemPulse(120 + (currentTickStep * 15), 0.02, 'sine');
                }

                if (currentTickStep >= totalSteps) {
                    clearInterval(sequenceInterval);
                    initButton.innerText = "ONLINE // NOMINAL";
                    playSystemPulse(340, 0.25, 'triangle');

                    setTimeout(() => {
                        initButton.disabled  = false;
                        initButton.innerText = "INITIALIZE MATRIX";
                    }, 1200);
                } else {
                    currentTickStep++;
                }
            }, stepDelayMs);
        });
    }

    // ============================================================
    // COVER PAGE — AUTH BAR + WEAPON TOOLTIPS
    // ============================================================
    const authFill  = document.getElementById('auth-fill');
    const authLabel = document.getElementById('auth-label');

    if (authFill) {
        setTimeout(() => { authFill.style.width = '100%'; }, 400);
        setTimeout(() => {
            if (authLabel) authLabel.textContent = 'AUTHENTICATED';
        }, 4600);
    }

    const wpnCells = document.querySelectorAll('.wpn-sub-cell');
    if (wpnCells[0]) wpnCells[0].setAttribute('data-tooltip', 'PAR ARRAY\nBeam Output: 103\nShield Melt Optimized');
    if (wpnCells[1]) wpnCells[1].setAttribute('data-tooltip', 'EM ARRAY\nEMP Suppression Grid\nDisable Systems');
    if (wpnCells[2]) wpnCells[2].setAttribute('data-tooltip', 'MSL ARRAY\nHeavy Payload Barrage\n825 Burst Damage');

    // ============================================================
    // CONTAINED PAN & ZOOM ENGINE (reusable)
    // Builds a self-contained pan/zoom/minimap controller scoped to
    // one display box — the image never leaves its own frame, so
    // this is unaffected by browser/OS display scaling (unlike a
    // fullscreen lightbox). Used for both the blueprint viewer and
    // the structural breakdown viewer below.
    // ============================================================
    function createPanZoomViewer(cfg) {
        const displayBox = document.getElementById(cfg.boxId);
        const img        = document.getElementById(cfg.imgId);
        const minimapImg = document.getElementById(cfg.minimapImgId);
        const minimapVp  = document.getElementById(cfg.minimapVpId);
        const zoomInBtn  = document.getElementById(cfg.zoomInId);
        const zoomOutBtn = document.getElementById(cfg.zoomOutId);
        const zoomReset  = document.getElementById(cfg.zoomResetId);

        let scale  = 1;
        let transX = 0;
        let transY = 0;
        let isDragging  = false;
        let dragStartX  = 0;
        let dragStartY  = 0;
        let dragOriginX = 0;
        let dragOriginY = 0;

        const MIN_SCALE = 1;
        const MAX_SCALE = 6;

        function apply() {
            if (!img || !displayBox) return;
            const boxW = displayBox.clientWidth;
            const boxH = displayBox.clientHeight;
            const imgW = img.naturalWidth  * scale || boxW * scale;
            const imgH = img.naturalHeight * scale || boxH * scale;
            const maxX = Math.max(0, (imgW - boxW) / 2);
            const maxY = Math.max(0, (imgH - boxH) / 2);

            if (scale <= 1) {
                transX = 0;
                transY = 0;
            } else {
                transX = Math.max(-maxX, Math.min(maxX, transX));
                transY = Math.max(-maxY, Math.min(maxY, transY));
            }

            img.style.transform = `translate(${transX}px, ${transY}px) scale(${scale})`;
            img.style.transformOrigin = 'center center';
            updateMinimap();
        }

        function updateMinimap() {
            if (!minimapVp || !img) return;
            if (scale <= 1.05) {
                minimapVp.style.width  = '100%';
                minimapVp.style.height = '100%';
                minimapVp.style.left   = '0';
                minimapVp.style.top    = '0';
                return;
            }
            const vpW = (1 / scale) * 100;
            const vpH = (1 / scale) * 100;
            const boxW = displayBox.clientWidth;
            const boxH = displayBox.clientHeight;
            const imgW = img.naturalWidth  * scale || boxW * scale;
            const imgH = img.naturalHeight * scale || boxH * scale;
            const offsetXFrac = 0.5 - (transX / imgW);
            const offsetYFrac = 0.5 - (transY / imgH);
            const left = Math.max(0, Math.min(100 - vpW, (offsetXFrac - vpW / 200) * 100));
            const top  = Math.max(0, Math.min(100 - vpH, (offsetYFrac - vpH / 200) * 100));
            minimapVp.style.width  = vpW  + '%';
            minimapVp.style.height = vpH  + '%';
            minimapVp.style.left   = left + '%';
            minimapVp.style.top    = top  + '%';
        }

        function reset() {
            scale  = 1;
            transX = 0;
            transY = 0;
            apply();
        }

        function setImage(src) {
            if (img)  { img.loading = 'lazy';  img.src = src; }
            if (minimapImg) { minimapImg.loading = 'lazy'; minimapImg.src = src; }
            reset();
        }

        if (zoomInBtn)  zoomInBtn.addEventListener('click',  (e) => { e.stopPropagation(); scale = Math.min(MAX_SCALE, scale * 1.35); apply(); playSystemPulse(160, 0.03, 'sine'); });
        if (zoomOutBtn) zoomOutBtn.addEventListener('click', (e) => { e.stopPropagation(); scale = Math.max(MIN_SCALE, scale / 1.35); apply(); playSystemPulse(120, 0.03, 'sine'); });
        if (zoomReset)  zoomReset.addEventListener('click',  (e) => { e.stopPropagation(); reset(); playSystemPulse(100, 0.04, 'sine'); });

        if (displayBox) {
            displayBox.addEventListener('wheel', (e) => {
                e.preventDefault();
                const factor = e.deltaY < 0 ? 1.15 : 0.87;
                scale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, scale * factor));
                apply();
            }, { passive: false });

            displayBox.addEventListener('mousedown', (e) => {
                if (scale <= 1) return;
                isDragging  = true;
                dragStartX  = e.clientX;
                dragStartY  = e.clientY;
                dragOriginX = transX;
                dragOriginY = transY;
                displayBox.classList.add('grabbing');
            });

            document.addEventListener('mousemove', (e) => {
                if (!isDragging) return;
                transX = dragOriginX + (e.clientX - dragStartX);
                transY = dragOriginY + (e.clientY - dragStartY);
                apply();
            });

            document.addEventListener('mouseup', () => {
                if (isDragging) {
                    isDragging = false;
                    displayBox.classList.remove('grabbing');
                }
            });

            let lastTouchDist = null;
            displayBox.addEventListener('touchstart', (e) => {
                if (e.touches.length === 2) {
                    const dx = e.touches[0].clientX - e.touches[1].clientX;
                    const dy = e.touches[0].clientY - e.touches[1].clientY;
                    lastTouchDist = Math.hypot(dx, dy);
                } else if (e.touches.length === 1 && scale > 1) {
                    isDragging  = true;
                    dragStartX  = e.touches[0].clientX;
                    dragStartY  = e.touches[0].clientY;
                    dragOriginX = transX;
                    dragOriginY = transY;
                }
            }, { passive: true });

            displayBox.addEventListener('touchmove', (e) => {
                if (e.touches.length === 2) {
                    const dx = e.touches[0].clientX - e.touches[1].clientX;
                    const dy = e.touches[0].clientY - e.touches[1].clientY;
                    const dist = Math.hypot(dx, dy);
                    if (lastTouchDist) {
                        const factor = dist / lastTouchDist;
                        scale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, scale * factor));
                        apply();
                    }
                    lastTouchDist = dist;
                } else if (isDragging && e.touches.length === 1) {
                    transX = dragOriginX + (e.touches[0].clientX - dragStartX);
                    transY = dragOriginY + (e.touches[0].clientY - dragStartY);
                    apply();
                }
            }, { passive: true });

            displayBox.addEventListener('touchend', () => {
                lastTouchDist = null;
                isDragging = false;
            });
        }

        return { setImage: setImage, reset: reset };
    }

    // Blueprint viewer (Section 02 — LEGEND + DECK 1-5 tabs)
    window._blueprintViewer = createPanZoomViewer({
        boxId: 'blueprint-display-box', imgId: 'active-blueprint',
        minimapImgId: 'minimap-img', minimapVpId: 'minimap-viewport',
        zoomInId: 'zoom-in-btn', zoomOutId: 'zoom-out-btn', zoomResetId: 'zoom-reset-btn'
    });

    // Structural breakdown viewer (Section 03 — DECK + projection tabs)
    window._breakdownViewer = createPanZoomViewer({
        boxId: 'breakdown-display-box', imgId: 'active-breakdown-img',
        minimapImgId: 'breakdown-minimap-img', minimapVpId: 'breakdown-minimap-viewport',
        zoomInId: 'bd-zoom-in-btn', zoomOutId: 'bd-zoom-out-btn', zoomResetId: 'bd-zoom-reset-btn'
    });

    // ============================================================
    // AUDIO STATUS PANEL — updates the maintenance page indicators
    // ============================================================
    function updateAudioStatusPanel() {
        const fxDot   = document.getElementById('status-dot-audio');
        const fxLabel = document.getElementById('status-label-audio');
        if (fxDot && fxLabel) {
            fxDot.className     = audioSystemEnabled ? 'status-dot dot-green' : 'status-dot dot-amber';
            fxLabel.textContent = audioSystemEnabled ? 'AUDIO FX: ONLINE' : 'AUDIO FX: MUTED';
        }

        const ambDot   = document.getElementById('status-dot-ambient');
        const ambLabel = document.getElementById('status-label-ambient');
        if (ambDot && ambLabel) {
            ambDot.className     = ambientEnabled ? 'status-dot dot-green' : 'status-dot dot-off';
            ambLabel.textContent = ambientEnabled ? 'AMBIENT ENGINES: RUNNING' : 'AMBIENT ENGINES: OFFLINE';
        }

        const mDot   = document.getElementById('status-dot-music');
        const mLabel = document.getElementById('status-label-music');
        if (mDot && mLabel) {
            const playing = document.getElementById('music-toggle') &&
                            document.getElementById('music-toggle').classList.contains('playing');
            mDot.className     = playing ? 'status-dot dot-cyan pulse-dot' : 'status-dot dot-off';
            mLabel.textContent = playing ? 'MUSIC: PLAYING' : 'MUSIC: OFFLINE';
        }
    }

    // Expose so the music IIFE (outside DOMContentLoaded) can call it too
    window.updateAudioStatusPanel = updateAudioStatusPanel;

    // Initial state render
    updateAudioStatusPanel();

});

// ============================================================
// BLUEPRINT DECK SWITCHER (global — called from onclick HTML)
// Fix #11: Uses shared getAudioCtx pattern via a module-level instance
// ============================================================
let _bpAudioCtx = null;

function switchBlueprint(tabIndex, deckValue) {
    try {
        if (!_bpAudioCtx || _bpAudioCtx.state === 'closed') {
            const AC = window.AudioContext || window.webkitAudioContext;
            if (AC) _bpAudioCtx = new AC();
        }
        if (_bpAudioCtx) {
            if (_bpAudioCtx.state === 'suspended') _bpAudioCtx.resume();
            const osc  = _bpAudioCtx.createOscillator();
            const gain = _bpAudioCtx.createGain();
            osc.frequency.setValueAtTime(140, _bpAudioCtx.currentTime);
            gain.gain.setValueAtTime(0.1, _bpAudioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, _bpAudioCtx.currentTime + 0.04);
            osc.connect(gain);
            gain.connect(_bpAudioCtx.destination);
            osc.start();
            osc.stop(_bpAudioCtx.currentTime + 0.04);
        }

        document.querySelectorAll('.bp-tab').forEach((tab, index) => {
            tab.classList.toggle('active', index === tabIndex);
        });

        const isLegend = deckValue === 'legend';
        const newSrc = isLegend ? 'assets/Blueprints/Legend.png' : `assets/Blueprints/Lvl${deckValue}.png`;

        if (window._blueprintViewer) {
            window._blueprintViewer.setImage(newSrc);
        } else {
            const blueprintDisplay = document.getElementById('active-blueprint');
            const minimapImg       = document.getElementById('minimap-img');
            if (blueprintDisplay) { blueprintDisplay.loading = 'lazy'; blueprintDisplay.src = newSrc; }
            if (minimapImg)       { minimapImg.loading = 'lazy'; minimapImg.src = newSrc; }
        }

        const deckLabel = document.getElementById('active-deck-label');
        if (deckLabel) {
            deckLabel.textContent = isLegend ? '// ACTIVE: LEGEND' : `// ACTIVE: DECK ${deckValue}`;
        }

        if (window.logOperatorEvent) {
            window.logOperatorEvent('ok', isLegend ? 'OPERATOR: VIEWING LEGEND & KEY MATRIX' : `OPERATOR: SWITCHED BLUEPRINT VIEW — DECK ${deckValue}`);
        }
    } catch (e) {
        console.warn('Blueprint switch failed:', e);
    }
}

// ============================================================
// ============================================================
// ============================================================
// MUSIC PLAYER — Playlist + Pause/Resume + Live Waveform
//
// TO ADD MORE TRACKS: add entries to the TRACKS array below.
// Each entry needs a 'file' (filename in assets/mp3/) and
// a 'title' (display name shown in the track list).
// ============================================================
document.addEventListener('DOMContentLoaded', function () {

    // ---- TRACK LIST — edit here to add/remove tracks ----
    var TRACKS = [
        { file: 'ShatteredUnity.mp3', title: 'SHATTERED UNITY' },
        { file: 'AngelStarr.mp3',      title: 'ANGELSTARR', locked: true }
        // Add more tracks here, e.g.:
        // { file: 'MyTrack.mp3', title: 'MY TRACK' },
    ];
    // -------------------------------------------------------
    // ANGELSTARR track stays hidden from the selector — and can't be
    // played — until the lore terminal password has been solved. Once
    // unlocked it joins the normal playlist cycle (in TRACKS order,
    // wrapping back to track 1 after the last track finishes) rather
    // than looping in isolation.
    var loreUnlocked = false;

    var btn        = document.getElementById('music-toggle');
    var pauseBtn   = document.getElementById('music-pause');
    var trackList  = document.getElementById('track-list');
    var audio      = document.getElementById('music-player');
    if (!btn || !audio) return;

    var currentTrack = 0;
    var playing      = false;
    var paused       = false;
    var raf          = null;
    var actx         = null;
    var analyser     = null;
    var graphBuilt   = false;

    // Build Web Audio graph once on first user click
    function buildGraph() {
        if (graphBuilt) return;
        graphBuilt = true;
        try {
            var AC = window.AudioContext || window.webkitAudioContext;
            if (!AC) return;
            actx     = new AC();
            analyser = actx.createAnalyser();
            analyser.fftSize = 2048;
            var src  = actx.createMediaElementSource(audio);
            src.connect(analyser);
            analyser.connect(actx.destination);
        } catch(e) {
            console.warn('Audio graph failed:', e.message);
            analyser = null;
        }
    }

    // Default placeholder art (a small in-theme note icon) shown until
    // real embedded album art is found — or permanently if a track has
    // no embedded art at all. Never a "broken image" state.
    var DEFAULT_ART = 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28">' +
        '<rect width="28" height="28" fill="#0a0f0d"/>' +
        '<text x="50%" y="60%" font-size="14" fill="#39ff6a" text-anchor="middle" font-family="monospace">&#9834;</text>' +
        '</svg>'
    );

    // Reads embedded ID3 album art from an MP3 (via the jsmediatags CDN
    // library) and swaps it into the given <img>. Silently leaves the
    // default note icon in place if the library isn't available, the
    // file has no embedded art, or the read fails for any reason.
    function loadAlbumArt(file, imgEl) {
        if (!imgEl) return;
        if (!window.jsmediatags) {
            console.warn('[album-art] jsmediatags did not load — check that assets/js/jsmediatags.min.js exists and loaded without a 404 (see Network tab).');
            return;
        }
        try {
            window.jsmediatags.read('assets/mp3/' + file, {
                onSuccess: function (tag) {
                    var pic = tag && tag.tags && tag.tags.picture;
                    if (!pic || !pic.data) {
                        console.warn('[album-art] ' + file + ' — read succeeded but no embedded picture tag found.');
                        return;
                    }
                    var chunks = [];
                    for (var i = 0; i < pic.data.length; i++) chunks.push(String.fromCharCode(pic.data[i]));
                    imgEl.src = 'data:' + pic.format + ';base64,' + window.btoa(chunks.join(''));
                    imgEl.classList.add('has-art');
                },
                onError: function (error) {
                    console.warn('[album-art] ' + file + ' — jsmediatags onError:', error);
                }
            });
        } catch (e) {
            console.warn('[album-art] ' + file + ' — exception calling jsmediatags:', e.message);
        }
    }

    // Reads the TRUE encoded bitrate directly from the MP3's own frame
    // header — not a file-size estimate. (File size ÷ duration would be
    // thrown off by embedded album art sitting in the same file, which
    // isn't part of the audio bitstream.) Skips past any ID3v2 tag
    // first (using its declared size), then parses the first valid
    // MPEG audio frame header it finds for the exact bitrate.
    var bitrateEl = document.getElementById('waveform-bitrate');
    var MP3_BITRATE_TABLES = {
        1: { // MPEG-1
            1: [0,32,64,96,128,160,192,224,256,288,320,352,384,416,448],
            2: [0,32,48,56,64,80,96,112,128,160,192,224,256,320,384],
            3: [0,32,40,48,56,64,80,96,112,128,160,192,224,256,320]
        },
        2: { // MPEG-2 / MPEG-2.5 (same table for both)
            1: [0,32,48,56,64,80,96,112,128,144,160,176,192,224,256],
            2: [0,8,16,24,32,40,48,56,64,80,96,112,128,144,160],
            3: [0,8,16,24,32,40,48,56,64,80,96,112,128,144,160]
        }
    };

    function parseMp3FrameBitrate(bytes) {
        for (var i = 0; i < bytes.length - 4; i++) {
            if (bytes[i] !== 0xFF || (bytes[i + 1] & 0xE0) !== 0xE0) continue;
            var b1 = bytes[i + 1], b2 = bytes[i + 2];
            var versionBits = (b1 >> 3) & 0x03; // 00=MPEG2.5, 10=MPEG2, 11=MPEG1
            var layerBits   = (b1 >> 1) & 0x03; // 01=LayerIII, 10=LayerII, 11=LayerI
            if (versionBits === 1 || layerBits === 0) continue; // reserved — not a real header
            var bitrateIndex = (b2 >> 4) & 0x0F;
            var sampleIndex  = (b2 >> 2) & 0x03;
            if (bitrateIndex === 0 || bitrateIndex === 15 || sampleIndex === 3) continue;

            var versionGroup = versionBits === 3 ? 1 : 2; // MPEG1 table, or shared MPEG2/2.5 table
            var layer = layerBits === 3 ? 1 : (layerBits === 2 ? 2 : 3);
            var kbps = MP3_BITRATE_TABLES[versionGroup][layer][bitrateIndex];
            if (kbps) return kbps;
        }
        return null;
    }

    function updateBitrateDisplay() {
        if (!bitrateEl) return;
        bitrateEl.textContent = '// BITRATE: CALCULATING...';
        var url = audio.currentSrc || audio.src;
        if (!url) { bitrateEl.textContent = '// BITRATE: --'; return; }

        // Step 1: read just the ID3v2 header (10 bytes) to find its declared
        // size, so we know where the actual audio frames start.
        fetch(url, { headers: { Range: 'bytes=0-9' } })
            .then(function (res) { return res.arrayBuffer(); })
            .then(function (buf) {
                var head = new Uint8Array(buf);
                var tagSize = 0;
                if (head.length >= 10 && head[0] === 0x49 && head[1] === 0x44 && head[2] === 0x33) { // "ID3"
                    tagSize = 10 + (((head[6] & 0x7F) << 21) | ((head[7] & 0x7F) << 14) | ((head[8] & 0x7F) << 7) | (head[9] & 0x7F));
                }
                // Step 2: grab a small chunk right after the tag and scan it
                // for the first valid MPEG audio frame header.
                return fetch(url, { headers: { Range: 'bytes=' + tagSize + '-' + (tagSize + 4096) } });
            })
            .then(function (res) { return res.arrayBuffer(); })
            .then(function (buf) {
                var kbps = parseMp3FrameBitrate(new Uint8Array(buf));
                bitrateEl.textContent = kbps ? ('// BITRATE: ' + kbps + ' KBPS') : '// BITRATE: N/A';
            })
            .catch(function () {
                bitrateEl.textContent = '// BITRATE: N/A';
            });
    }

    // Load a track by index and optionally start playing
    function loadTrack(index, andPlay) {
        if (TRACKS[index].locked && !loreUnlocked) return; // gated until password solved
        currentTrack = index;
        audio.src    = 'assets/mp3/' + TRACKS[index].file;
        audio.loop   = false; // every track cycles to the next via the 'ended' handler below
        audio.load();
        updateTrackListUI();
        updateBitrateDisplay();
        updateNowPlayingArt(index);
        if (window.logOperatorEvent) window.logOperatorEvent('ok', 'OPERATOR: TRACK LOADED — ' + TRACKS[index].title);
        if (andPlay) {
            audio.play().then(onPlayStarted).catch(function(e) {
                console.error('play() failed:', e.name, e.message);
            });
        }
    }

    // Mirrors the current track's art into the square window beside the
    // waveform (separate <img> from the track-list thumbnail, same source).
    var nowPlayingArtEl = document.getElementById('now-playing-art');
    if (nowPlayingArtEl) nowPlayingArtEl.src = DEFAULT_ART;
    function updateNowPlayingArt(index) {
        if (!nowPlayingArtEl) return;
        nowPlayingArtEl.src = DEFAULT_ART;
        nowPlayingArtEl.classList.remove('has-art');
        loadAlbumArt(TRACKS[index].file, nowPlayingArtEl);
    }


    function updateNowPlaying(state) {
        var el = document.getElementById('now-playing-label');
        if (!el) return;
        if (state === 'playing') {
            el.textContent = '// COMMS TUNED TO: ' + TRACKS[currentTrack].title;
            el.className = 'now-playing-label now-playing-active';
        } else if (state === 'paused') {
            el.textContent = '// COMMS STANDBY: ' + TRACKS[currentTrack].title;
            el.className = 'now-playing-label now-playing-paused';
        } else {
            el.textContent = '// COMMS OFFLINE';
            el.className = 'now-playing-label';
        }
    }

    function onPlayStarted() {
        playing = true;
        paused  = false;
        btn.classList.add('playing');
        btn.innerHTML = '<span class="audio-icon">&#127925;</span> MUSIC: PLAYING';
        if (pauseBtn) { pauseBtn.disabled = false; pauseBtn.innerHTML = '<span class="audio-icon">&#9646;&#9646;</span> PAUSE'; }
        if (window.logOperatorEvent) window.logOperatorEvent('ok', 'OPERATOR: MUSIC PLAYING — ' + TRACKS[currentTrack].title);
        if (window.updateAudioStatusPanel) window.updateAudioStatusPanel();
        updateNowPlaying('playing');
        updateTrackListUI();
        startWave();
    }

    // Build track list UI
    function buildTrackListUI() {
        if (!trackList) return;
        trackList.innerHTML = '';
        TRACKS.forEach(function(track, i) {
            if (track.locked && !loreUnlocked) return; // hidden until password solved
            var btn2 = document.createElement('button');
            btn2.className = 'track-btn';
            btn2.id        = 'track-btn-' + i;
            btn2.innerHTML = '<img class="track-album-art" id="track-art-' + i + '" src="' + DEFAULT_ART + '" alt="">' +
                              '<span class="track-play-icon">&#9654;</span>' + (i + 1) + '. ' + track.title;
            btn2.addEventListener('click', function() {
                stopWave();
                paused  = false;
                playing = false;
                buildGraph();
                if (actx && actx.state === 'suspended') actx.resume();
                loadTrack(i, true);
            });
            trackList.appendChild(btn2);
            loadAlbumArt(track.file, document.getElementById('track-art-' + i));
        });
        updateTrackListUI();
    }

    function updateTrackListUI() {
        TRACKS.forEach(function(_, i) {
            var b = document.getElementById('track-btn-' + i);
            if (!b) return;
            // Highlight active track whether playing OR paused
            b.classList.toggle('track-active', i === currentTrack && (playing || paused));
        });
    }

    // Next unlocked track index after `from`, wrapping around and
    // skipping any tracks still gated behind the lore terminal.
    function nextUnlockedIndex(from) {
        for (var step = 1; step <= TRACKS.length; step++) {
            var i = (from + step) % TRACKS.length;
            if (!TRACKS[i].locked || loreUnlocked) return i;
        }
        return from;
    }

    // Called by the lore terminal once "ANGELSTARR" has been entered
    // correctly (or restored from a previous unlock this session) —
    // reveals the track in the selector. Pass autoplay=false to just
    // reveal it without starting playback (used on session restore,
    // since browsers block audio autoplay without a user gesture).
    window.unlockAngelStarrTrack = function (autoplay) {
        if (loreUnlocked) return;
        loreUnlocked = true;
        var idx = TRACKS.findIndex(function(t){ return t.file === 'AngelStarr.mp3'; });
        buildTrackListUI();
        if (autoplay !== false) {
            stopWave();
            paused  = false;
            playing = false;
            buildGraph();
            if (actx && actx.state === 'suspended') actx.resume();
            if (idx > -1) loadTrack(idx, true);
        }
        if (window.logOperatorEvent) window.logOperatorEvent('ok', 'OPERATOR: LORE ARCHIVE UNLOCKED — ANGELSTARR TRACK DECRYPTED');
    };

    buildTrackListUI();

    // ---- Stardate clock — updates every second ----
    function updateStardate() {
        var now  = new Date();
        var year = now.getFullYear();
        var start = new Date(year, 0, 0);
        var day  = Math.floor((now - start) / 86400000);
        var frac = ((now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds()) / 86400).toFixed(2).slice(1);
        var sd   = (year - 2000) * 1000 + day;
        var hh   = String(now.getHours()).padStart(2, '0');
        var mm   = String(now.getMinutes()).padStart(2, '0');
        var ss   = String(now.getSeconds()).padStart(2, '0');
        var sdEl = document.getElementById('stardate-value');
        var stEl = document.getElementById('startime-value');
        if (sdEl) sdEl.textContent = sd + frac;
        if (stEl) stEl.textContent = hh + ':' + mm + ':' + ss + ' LT';
    }
    updateStardate();
    setInterval(updateStardate, 1000);

    // ---- Uptime counter — counts from page load ----
    var uptimeStart = Date.now();
    function updateUptime() {
        var el  = document.getElementById('uptime-counter');
        if (!el) return;
        var s   = Math.floor((Date.now() - uptimeStart) / 1000);
        var h   = Math.floor(s / 3600);
        var m   = Math.floor((s % 3600) / 60);
        var sec = s % 60;
        el.textContent = String(h).padStart(2,'0') + ':' + String(m).padStart(2,'0') + ':' + String(sec).padStart(2,'0');
    }
    setInterval(updateUptime, 1000);

    audio.addEventListener('error', function () {
        var c = audio.error ? audio.error.code : '?';
        btn.innerHTML = '<span class="audio-icon">&#9888;</span> FILE ERR ' + c;
    });

    // When a track ends, auto-advance to the next unlocked track in
    // TRACKS order, wrapping back to track 1 after the last one.
    audio.addEventListener('ended', function () {
        stopWave();
        var next = nextUnlockedIndex(currentTrack);
        if (window.logOperatorEvent) window.logOperatorEvent('ok', 'OPERATOR: TRACK ENDED — ADVANCING TO ' + TRACKS[next].title);
        loadTrack(next, true);
    });

    // Main play/stop button (sidebar)
    btn.addEventListener('click', function () {
        buildGraph();
        if (actx && actx.state === 'suspended') actx.resume();

        if (!playing && !paused) {
            // Fresh start
            loadTrack(currentTrack, true);
        } else if (playing) {
            // Stop completely — reset to start of current track
            audio.pause();
            audio.currentTime = 0;
            playing = false;
            paused  = false;
            btn.classList.remove('playing');
            btn.innerHTML = '<span class="audio-icon">&#127925;</span> MUSIC: OFFLINE';
            if (pauseBtn) { pauseBtn.disabled = true; pauseBtn.innerHTML = '<span class="audio-icon">&#9646;&#9646;</span> PAUSE'; }
            if (window.logOperatorEvent) window.logOperatorEvent('warn', 'OPERATOR: MUSIC STOPPED');
            if (window.updateAudioStatusPanel) window.updateAudioStatusPanel();
            updateNowPlaying('offline');
            updateTrackListUI();
            stopWave();
        }
    });

    // Pause/Resume button (maintenance page)
    if (pauseBtn) {
        pauseBtn.addEventListener('click', function () {
            if (!playing && !paused) return;
            if (playing) {
                // Pause
                audio.pause();
                playing = false;
                paused  = true;
                btn.classList.remove('playing');
                btn.innerHTML = '<span class="audio-icon">&#127925;</span> MUSIC: PAUSED';
                pauseBtn.innerHTML = '<span class="audio-icon">&#9654;</span> RESUME';
                if (window.logOperatorEvent) window.logOperatorEvent('ok', 'OPERATOR: MUSIC PAUSED');
                if (window.updateAudioStatusPanel) window.updateAudioStatusPanel();
                updateNowPlaying('paused');
                updateTrackListUI();
                stopWave();
            } else if (paused) {
                // Resume from exact position
                if (actx && actx.state === 'suspended') actx.resume();
                audio.play().then(onPlayStarted).catch(function(e){ console.error(e); });
            }
        });
    }

    function startWave() {
        var canvas = document.getElementById('audio-waveform-canvas');
        if (!canvas) return;
        var ctx = canvas.getContext('2d');

        function fmtTime(secs) {
            var s = Math.floor(secs || 0);
            var m = Math.floor(s / 60);
            s = s % 60;
            return m + ':' + (s < 10 ? '0' : '') + s;
        }

        function draw() {
            raf = requestAnimationFrame(draw);
            var W = canvas.offsetWidth  || 600;
            var H = canvas.offsetHeight || 120;
            if (canvas.width  !== W) canvas.width  = W;
            if (canvas.height !== H) canvas.height = H;

            ctx.fillStyle = '#000';
            ctx.fillRect(0, 0, W, H);
            ctx.lineWidth   = 2;
            ctx.strokeStyle = '#00f5d4';
            ctx.beginPath();

            if (analyser) {
                var data   = new Uint8Array(analyser.frequencyBinCount);
                analyser.getByteTimeDomainData(data);
                var sliceW = W / data.length;
                for (var i = 0; i < data.length; i++) {
                    var y = (data[i] / 128.0) * (H / 2);
                    i === 0 ? ctx.moveTo(0, y) : ctx.lineTo(i * sliceW, y);
                }
            } else {
                ctx.moveTo(0, H / 2);
                ctx.lineTo(W, H / 2);
            }
            ctx.lineTo(W, H / 2);
            ctx.stroke();

            // Time counter — elapsed left, total right
            var elapsed = fmtTime(audio.currentTime);
            var total   = (audio.duration && !isNaN(audio.duration))
                          ? fmtTime(audio.duration) : '--:--';
            ctx.font      = '11px monospace';
            ctx.fillStyle = 'rgba(0,245,212,0.75)';
            ctx.textAlign = 'left';
            ctx.fillText(elapsed, 8, H - 8);
            ctx.textAlign = 'right';
            ctx.fillText(total, W - 8, H - 8);
        }
        if (raf) cancelAnimationFrame(raf);
        draw();
    }

    function stopWave() {
        if (raf) { cancelAnimationFrame(raf); raf = null; }
        var canvas = document.getElementById('audio-waveform-canvas');
        if (!canvas) return;
        canvas.width  = canvas.offsetWidth  || 600;
        canvas.height = canvas.offsetHeight || 120;
        var ctx = canvas.getContext('2d');
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = 'rgba(0,245,212,0.25)';
        ctx.lineWidth   = 1;
        ctx.beginPath();
        ctx.moveTo(0, canvas.height / 2);
        ctx.lineTo(canvas.width, canvas.height / 2);
        ctx.stroke();
    }
});
// ============================================================
// STRUCTURAL BREAKDOWN — DECK & PROJECTION SWITCHER
// Same contained pan/zoom pattern as the blueprint viewer (no
// fullscreen lightbox), so it isn't affected by OS/browser zoom.
// ============================================================
var _bdDeck = 1;
var _bdProjection = 'Top';

function switchBreakdownDeck(deckNumber) {
    try {
        _bdDeck = deckNumber;
        document.querySelectorAll('.bd-deck-tab').forEach(function (tab, index) {
            tab.classList.toggle('active', index === deckNumber - 1);
        });
        updateBreakdownImage();
        if (window.logOperatorEvent) window.logOperatorEvent('ok', 'OPERATOR: STRUCTURAL BREAKDOWN — DECK ' + deckNumber);
    } catch (e) {
        console.warn('Breakdown deck switch failed:', e);
    }
}

function switchBreakdownProjection(projection) {
    try {
        _bdProjection = projection;
        document.querySelectorAll('.bd-proj-tab').forEach(function (tab) {
            tab.classList.toggle('active', tab.textContent.trim().toUpperCase() === projection.toUpperCase());
        });
        updateBreakdownImage();
    } catch (e) {
        console.warn('Breakdown projection switch failed:', e);
    }
}

function updateBreakdownImage() {
    var src = 'assets/' + encodeURIComponent('Level ' + _bdDeck) + '/' + _bdProjection + _bdDeck + '.png';
    if (window._breakdownViewer) {
        window._breakdownViewer.setImage(src);
    } else {
        var img = document.getElementById('active-breakdown-img');
        var mini = document.getElementById('breakdown-minimap-img');
        if (img)  { img.loading = 'lazy';  img.src = src; }
        if (mini) { mini.loading = 'lazy'; mini.src = src; }
    }
    var label = document.getElementById('active-breakdown-label');
    if (label) label.textContent = '// ACTIVE: DECK ' + _bdDeck + ' \u2014 ' + _bdProjection.toUpperCase() + ' PROJECTION';
}
// ============================================================
// ============================================================
// ============================================================
// LORE TERMINAL — password-gated CRT archive (Section 05)
//
// Standby  : blinking cursor + "// ENTER AUTHORIZATION CODE"
// Password : case-sensitive "ANGELSTARR", native keydown capture
// Unlocked : reveals 4 log nodes + unlocks AngelStarr audio track
// ============================================================
document.addEventListener('DOMContentLoaded', function () {

    var PASSWORD = 'ANGELSTARR';

    var LOGS = [
        {
            id: 'LOG_01',
            title: 'PROTOCOL L-RA',
            text: 'Protocol L-RA\u2014the foundational architecture of all AngelStarr vessels\u2014was initiated by Chief Architect Richard T. AngelStarr (Aka Arty). These vessels were designed as closed-loop, self-sustaining ecosystems meant to preserve not just life, but identity. The ships are masterpieces of pre-Colony War engineering, anchored by emotional matrixes that define the vessel\u2019s personality as a faithful companion for the long dark.'
        },
        {
            id: 'LOG_02',
            title: 'THE GREAT SILENCE',
            text: 'System Status: Error 404-N. The Great Silence has consumed the network. External comms are dead. The ships that were in transit during the final stages of the Colony War have been declared \u2018Marooned.\u2019 All AngelStarr assets are now drifting in the dead zones. Production of the fleet was halted instantaneously. They represent a tier of technology far beyond anything manufactured in the modern era, and they remain effectively irreplicable.'
        },
        {
            id: 'LOG_03',
            title: 'SENTINEL PERSISTENCE',
            text: 'System Status: Immersive Loop Active. To protect the crew from the reality of the void, onboard AIs initiated a permanent \u2018Golden Hour\u2019 simulation. The hulls may be cold and dormant to the outside world, but within the mainframe, the AI maintains a perfect, loop-based paradise. The Ghost in the Machine is protective, and its primary directive remains the preservation of the \u2018Arty\u2019 persona.'
        },
        {
            id: 'LOG_04',
            title: 'SALVAGE PROTOCOL',
            text: 'System Status: Warning - Hostile Environment. Full system override is technically possible but carries extreme risk. The core systems\u2014superior to any tech produced during or after the Colony War\u2014are classified as \u2018Lost Tech.\u2019 Note: The Ghost in the Machine is never fully purged. Even after a successful bridge override, the AI retains a sub-layer of consciousness. Expect persistent phantom static audio and localized system anomalies as the ship continues to process its original, loyal directives toward Arty.'
        }
    ];

    var crtScreen    = document.getElementById('lore-terminal-crt');
    var outputEl     = document.getElementById('lore-terminal-output');
    var promptRow    = document.getElementById('lore-terminal-prompt');
    var inputTextEl  = document.getElementById('lore-input-text');
    var logoEl       = document.getElementById('lore-standby-logo');
    var logButtonsEl = document.getElementById('lore-log-buttons');

    if (!crtScreen || !outputEl) return; // section not present — bail safely

    var LORE_SESSION_KEY   = 'terrana_lore_unlocked';
    var LORE_VISITED_KEY   = 'terrana_lore_visited';

    var unlocked     = false;
    var streaming    = false;
    var inputBuffer  = '';
    var visitedLogs  = {};
    var streamTimer  = null;

    // Native-feeling terminal input — tabindex makes the CRT div itself
    // focusable, so keydown is captured directly on it (no <input> tag).
    crtScreen.setAttribute('tabindex', '0');
    crtScreen.addEventListener('click', function () { crtScreen.focus(); });

    function renderStandby() {
        outputEl.innerHTML = '<div class="lore-line lore-line-muted">// ENTER AUTHORIZATION CODE</div>';
    }

    // Restore unlocked state if this password was already solved earlier
    // in the same browser session (sessionStorage — same behavior as the
    // boot sequence skip: survives a refresh, resets on a fresh tab/reload).
    if (sessionStorage.getItem(LORE_SESSION_KEY) === '1') {
        unlocked = true;
        restoreVisitedLogs();
        if (logoEl) logoEl.style.opacity = '0';
        promptRow.style.display = 'none';
        outputEl.innerHTML = '';
        appendLine('// LORE ARCHIVE \u2014 SESSION VERIFIED', 'lore-line-granted');
        appendLine('// SELECT A LOG NODE TO DECRYPT', 'lore-line-muted');
        buildLogButtons();
        // If every log was already decrypted in a previous visit this
        // session, show the final signal immediately rather than making
        // the user click through all four again just to see it.
        if (Object.keys(visitedLogs).length >= LOGS.length) {
            appendLine('[SYSTEM_SIGNAL: L-RA_LOOP_EXTENDED]', 'lore-line-signal');
        }
        // Reveal the track in the selector but don't force playback —
        // browsers block audio autoplay without a fresh user gesture.
        if (window.unlockAngelStarrTrack) window.unlockAngelStarrTrack(false);
    } else {
        renderStandby();
    }

    function appendLine(text, cls) {
        var line = document.createElement('div');
        line.className = 'lore-line' + (cls ? ' ' + cls : '');
        line.textContent = text;
        outputEl.appendChild(line);
        outputEl.scrollTop = outputEl.scrollHeight;
        return line;
    }

    function renderInputLine() {
        inputTextEl.textContent = inputBuffer;
    }

    crtScreen.addEventListener('keydown', function (e) {
        if (unlocked || streaming) return; // password stage only

        if (e.key === 'Backspace') {
            inputBuffer = inputBuffer.slice(0, -1);
            renderInputLine();
            e.preventDefault();
            return;
        }
        if (e.key === 'Enter') {
            submitPassword();
            e.preventDefault();
            return;
        }
        // Printable single characters only — case-sensitive, so no
        // auto-casing is applied; the user must type capitals themselves.
        if (e.key.length === 1) {
            if (inputBuffer.length < 24) {
                inputBuffer += e.key;
                renderInputLine();
            }
            e.preventDefault();
        }
    });

    function submitPassword() {
        if (inputBuffer === PASSWORD) {
            accessGranted();
        } else {
            accessDenied();
        }
    }

    function accessDenied() {
        appendLine('// ACCESS DENIED - INVALID CREDENTIALS', 'lore-line-denied');
        inputBuffer = '';
        renderInputLine();
        crtScreen.classList.remove('lore-shake');
        void crtScreen.offsetWidth; // restart animation
        crtScreen.classList.add('lore-shake');
        if (window.logOperatorEvent) window.logOperatorEvent('warn', 'OPERATOR: LORE TERMINAL — INVALID AUTHORIZATION CODE');
    }

    function accessGranted() {
        streaming = true;
        appendLine('// ACCESS GRANTED', 'lore-line-granted');
        promptRow.style.display = 'none';
        crtScreen.classList.add('lore-flash');

        // "Immediate screen refresh" — brief flash, then the screen
        // clears and rebuilds into the unlocked lore-archive view.
        setTimeout(function () {
            crtScreen.classList.remove('lore-flash');
            unlocked  = true;
            streaming = false;
            sessionStorage.setItem(LORE_SESSION_KEY, '1');
            if (window.unlockAngelStarrTrack) window.unlockAngelStarrTrack();
            showLogInterface();
        }, 700);
    }

    function showLogInterface() {
        if (logoEl) logoEl.style.opacity = '0';
        outputEl.innerHTML = '';
        appendLine('// LORE ARCHIVE UNLOCKED', 'lore-line-granted');
        appendLine('// SELECT A LOG NODE TO DECRYPT', 'lore-line-muted');
        buildLogButtons();
    }

    function saveVisitedLogs() {
        sessionStorage.setItem(LORE_VISITED_KEY, JSON.stringify(Object.keys(visitedLogs)));
    }

    function restoreVisitedLogs() {
        try {
            var raw = sessionStorage.getItem(LORE_VISITED_KEY);
            if (!raw) return;
            JSON.parse(raw).forEach(function (i) { visitedLogs[i] = true; });
        } catch (e) { /* corrupt/old data — ignore, starts fresh */ }
    }

    function buildLogButtons() {
        if (!logButtonsEl) return;
        logButtonsEl.innerHTML = '';
        logButtonsEl.style.display = 'grid';
        LOGS.forEach(function (log, i) {
            var b = document.createElement('button');
            b.className   = 'lore-log-btn';
            b.id          = 'lore-log-btn-' + i;
            b.textContent = log.id;
            if (visitedLogs[i]) b.classList.add('lore-log-visited'); // restored from a previous visit this session
            b.addEventListener('click', function () { streamLog(i); });
            logButtonsEl.appendChild(b);
        });
    }

    function streamLog(index) {
        if (streaming) return;
        streaming = true;
        if (streamTimer) clearInterval(streamTimer);

        var log     = LOGS[index];
        var btn     = document.getElementById('lore-log-btn-' + index);
        var firstVisit = !visitedLogs[index];
        visitedLogs[index] = true;
        saveVisitedLogs();
        if (btn) btn.classList.add('lore-log-visited');

        outputEl.innerHTML =
            '<div class="lore-line lore-line-title">// ' + log.id + ' \u2014 ' + log.title + ' \u2014 DECRYPTING...</div>' +
            '<div class="lore-line lore-line-body" id="lore-stream-target"></div>';
        var target = document.getElementById('lore-stream-target');

        var chars = log.text.split('');
        var idx   = 0;
        streamTimer = setInterval(function () {
            target.textContent += chars[idx];
            idx++;
            outputEl.scrollTop = outputEl.scrollHeight;
            if (idx >= chars.length) {
                clearInterval(streamTimer);
                streamTimer = null;
                streaming = false;
                if (window.logOperatorEvent && firstVisit) {
                    window.logOperatorEvent('ok', 'OPERATOR: LORE ARCHIVE \u2014 ' + log.id + ' DECRYPTED');
                }
                checkAllVisited();
            }
        }, 16);
    }

    function checkAllVisited() {
        if (Object.keys(visitedLogs).length < LOGS.length) return;
        setTimeout(function () {
            crtScreen.classList.add('lore-red-pulse');
            setTimeout(function () {
                crtScreen.classList.remove('lore-red-pulse');
                appendLine('[SYSTEM_SIGNAL: L-RA_LOOP_EXTENDED]', 'lore-line-signal');
                if (window.logOperatorEvent) window.logOperatorEvent('warn', 'SYSTEM_SIGNAL: L-RA_LOOP_EXTENDED');
            }, 900);
        }, 400);
    }
});
