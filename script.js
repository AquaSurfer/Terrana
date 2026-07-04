// ============================================================
// TERRANA — CLASS C TECHNICAL MANUAL
// script.js — Full Production Build (Patched + Enhanced)
// Fixes applied: #1-#15 per audit
// Features: Boot sequence, subtitle typing, progress indicator,
//           system bars animate-in, hover dimming, blueprint
//           pan/zoom/minimap, ambient audio
// ============================================================

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
                audioBtn.innerHTML = `<span class="audio-icon">🔊</span> AUDIO: ENABLED`;
                playSystemPulse(180, 0.04, 'sine');
                if (window.logOperatorEvent) window.logOperatorEvent('ok', 'OPERATOR: AUDIO FX ENABLED — SYSTEM SOUND ACTIVE');
            } else {
                audioBtn.classList.add('muted');
                audioBtn.innerHTML = `<span class="audio-icon">🔇</span> AUDIO: MUTED`;
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
                document.getElementById('tick-reactor').textContent = targetReactor;
                document.getElementById('tick-shields').textContent = targetShields;
                clearInterval(counterTimer);
                playSystemPulse(220, 0.15, 'triangle');
            } else {
                document.getElementById('tick-reactor').textContent = Math.floor(currentReactor);
                document.getElementById('tick-shields').textContent = Math.floor(currentShields);
                if (Math.random() > 0.7) playSystemPulse(80, 0.01, 'sine');
            }
        }, intervalTime);
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
        const tracks = document.querySelectorAll('.bar-meter-track');
        const targets = {};
        document.querySelectorAll('.power-static').forEach(stat => {
            targets[stat.getAttribute('data-system')] = parseInt(stat.textContent, 10) || 0;
        });

        // First reset all to 0
        tracks.forEach(t => {
            t.setAttribute('data-bars', '0');
            t.classList.remove('animate-in');
        });

        // Staggered animate in
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
    }

    let specsAnimated = false;

    // ============================================================
    // OPERATOR ACTIVITY LOGGER — hooks into nav, lightbox, blueprint, breakdown
    // ============================================================
    const SECTION_LOG_LABELS = {
        '#cover':       'TECHNICAL ARCHIVE — COVER PAGE',
        '#specs':       'VESSEL SPECIFICATIONS — SECTION 01',
        '#blueprints':  'DECK BLUEPRINTS — SECTION 02',
        '#breakdown':   'STRUCTURAL BREAKDOWN — SECTION 03',
        '#credits':     'ENGINEERING MODIFICATION CREDITS — SECTION 04',
        '#maintenance': 'MAINTENANCE & OVERRIDES — SECTION 05',
    };

    // Exposed globally so switchBlueprint / updateBreakdownLayer can call it
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
                '.spec-card, .view-card, .manifest-entry, .credits-card, .maint-log-panel, .maint-status-card, .mesh-cell, .stat-slider-row, .integrity-row, .override-flag'
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

    // ============================================================
    // LIGHTBOX OVERLAY — with zoom, pan, minimap (mirrors Section 02)
    // ============================================================
    const lightbox         = document.getElementById('lightbox-overlay');
    const lightboxImg      = document.getElementById('lightbox-display');
    const lightboxInner    = document.getElementById('lightbox-inner');
    const lightboxMiniImg  = document.getElementById('lightbox-minimap-img');
    const lightboxMiniVp   = document.getElementById('lightbox-minimap-vp');
    const lightboxProjLabel= document.getElementById('lightbox-projection-label');
    const closeBtn         = document.querySelector('.lightbox-close');
    const lbZoomIn         = document.getElementById('lb-zoom-in');
    const lbZoomOut        = document.getElementById('lb-zoom-out');
    const lbZoomReset      = document.getElementById('lb-zoom-reset');
    const zoomableAssets   = document.querySelectorAll('.zoomable-asset');

    // Lightbox zoom/pan state
    let lbScale   = 1;
    let lbTransX  = 0;
    let lbTransY  = 0;
    let lbDragging= false;
    let lbDragSX  = 0, lbDragSY  = 0;
    let lbOriginX = 0, lbOriginY = 0;
    const LB_MIN  = 1, LB_MAX = 8;

    function applyLbTransform() {
        if (!lightboxImg || !lightboxInner) return;
        const boxW = lightboxInner.clientWidth;
        const boxH = lightboxInner.clientHeight;
        // Use displayed size (constrained by the box)
        const natW = lightboxImg.naturalWidth  || boxW;
        const natH = lightboxImg.naturalHeight || boxH;
        // Fit image naturally (same as object-fit contain logic)
        const scaleToFit = Math.min(boxW / natW, boxH / natH);
        const dispW = natW * scaleToFit * lbScale;
        const dispH = natH * scaleToFit * lbScale;
        const maxX = Math.max(0, (dispW - boxW) / 2);
        const maxY = Math.max(0, (dispH - boxH) / 2);
        if (lbScale <= 1) { lbTransX = 0; lbTransY = 0; }
        else {
            lbTransX = Math.max(-maxX, Math.min(maxX, lbTransX));
            lbTransY = Math.max(-maxY, Math.min(maxY, lbTransY));
        }
        lightboxImg.style.transform = `translate(calc(-50% + ${lbTransX}px), calc(-50% + ${lbTransY}px)) scale(${lbScale})`;
        updateLbMinimap(boxW, boxH, dispW, dispH);
    }

    function updateLbMinimap(boxW, boxH, dispW, dispH) {
        if (!lightboxMiniVp) return;
        if (lbScale <= 1.05) {
            lightboxMiniVp.style.cssText = 'width:100%;height:100%;left:0;top:0;';
            return;
        }
        const vpW = (1 / lbScale) * 100;
        const vpH = (1 / lbScale) * 100;
        const offsetXFrac = 0.5 - (lbTransX / dispW);
        const offsetYFrac = 0.5 - (lbTransY / dispH);
        const left = Math.max(0, Math.min(100 - vpW, (offsetXFrac - vpW / 200) * 100));
        const top  = Math.max(0, Math.min(100 - vpH, (offsetYFrac - vpH / 200) * 100));
        lightboxMiniVp.style.width  = vpW  + '%';
        lightboxMiniVp.style.height = vpH  + '%';
        lightboxMiniVp.style.left   = left + '%';
        lightboxMiniVp.style.top    = top  + '%';
    }

    function resetLbView() { lbScale = 1; lbTransX = 0; lbTransY = 0; applyLbTransform(); }

    function openLightbox(src, alt, labelText) {
        playSystemPulse(150, 0.08, 'triangle');
        lightboxImg.src = src;
        lightboxImg.alt = alt || 'Enlarged Projection Matrix';
        if (lightboxMiniImg) lightboxMiniImg.src = src;
        if (lightboxProjLabel) lightboxProjLabel.textContent = labelText || '';
        resetLbView();
        lightbox.classList.add('active');
        document.body.style.overflow = 'hidden';
        lightboxImg.onload = () => applyLbTransform();

        // Log operator image inspection
        if (labelText) {
            window.logOperatorEvent('ok', `OPERATOR: OPENED PROJECTION VIEW — ${labelText}`);
        }
    }

    // Bind zoomable assets
    zoomableAssets.forEach(asset => {
        asset.addEventListener('click', function () {
            // Try to get projection label from parent view-card's first span
            const card = this.closest('.view-card');
            const label = card ? card.querySelector('span:first-child')?.textContent : '';
            openLightbox(this.src, this.alt, label);
        });
    });

    function closeLightbox() {
        playSystemPulse(90, 0.06, 'sine');
        lightbox.classList.remove('active');
        document.body.style.overflow = '';
        resetLbView();
    }

    if (closeBtn) closeBtn.addEventListener('click', closeLightbox);
    if (lightbox) {
        lightbox.addEventListener('click', function (e) {
            if (e.target === lightbox) closeLightbox();
        });
    }

    document.addEventListener('keydown', function (e) {
        if (lightbox && lightbox.classList.contains('active')) {
            if (e.key === 'Escape') closeLightbox();
            if (e.key === '+' || e.key === '=') { lbScale = Math.min(LB_MAX, lbScale * 1.35); applyLbTransform(); }
            if (e.key === '-') { lbScale = Math.max(LB_MIN, lbScale / 1.35); applyLbTransform(); }
        }
    });

    // Zoom buttons
    if (lbZoomIn)    lbZoomIn.addEventListener('click',    (e) => { e.stopPropagation(); lbScale = Math.min(LB_MAX, lbScale * 1.35); applyLbTransform(); playSystemPulse(160, 0.03, 'sine'); });
    if (lbZoomOut)   lbZoomOut.addEventListener('click',   (e) => { e.stopPropagation(); lbScale = Math.max(LB_MIN, lbScale / 1.35); applyLbTransform(); playSystemPulse(120, 0.03, 'sine'); });
    if (lbZoomReset) lbZoomReset.addEventListener('click', (e) => { e.stopPropagation(); resetLbView(); playSystemPulse(100, 0.04, 'sine'); });

    // Mouse wheel zoom on lightbox inner
    if (lightboxInner) {
        lightboxInner.addEventListener('wheel', (e) => {
            e.preventDefault();
            const factor = e.deltaY < 0 ? 1.15 : 0.87;
            lbScale = Math.max(LB_MIN, Math.min(LB_MAX, lbScale * factor));
            applyLbTransform();
        }, { passive: false });

        lightboxInner.addEventListener('mousedown', (e) => {
            if (lbScale <= 1) return;
            lbDragging = true;
            lbDragSX = e.clientX; lbDragSY = e.clientY;
            lbOriginX = lbTransX; lbOriginY = lbTransY;
            lightboxInner.classList.add('grabbing');
        });

        document.addEventListener('mousemove', (e) => {
            if (!lbDragging) return;
            lbTransX = lbOriginX + (e.clientX - lbDragSX);
            lbTransY = lbOriginY + (e.clientY - lbDragSY);
            applyLbTransform();
        });

        document.addEventListener('mouseup', () => {
            if (lbDragging) { lbDragging = false; lightboxInner.classList.remove('grabbing'); }
        });

        // Touch support
        let lbLastDist = null;
        lightboxInner.addEventListener('touchstart', (e) => {
            if (e.touches.length === 2) {
                const dx = e.touches[0].clientX - e.touches[1].clientX;
                const dy = e.touches[0].clientY - e.touches[1].clientY;
                lbLastDist = Math.hypot(dx, dy);
            } else if (e.touches.length === 1 && lbScale > 1) {
                lbDragging = true;
                lbDragSX = e.touches[0].clientX; lbDragSY = e.touches[0].clientY;
                lbOriginX = lbTransX; lbOriginY = lbTransY;
            }
        }, { passive: true });

        lightboxInner.addEventListener('touchmove', (e) => {
            if (e.touches.length === 2) {
                const dx = e.touches[0].clientX - e.touches[1].clientX;
                const dy = e.touches[0].clientY - e.touches[1].clientY;
                const dist = Math.hypot(dx, dy);
                if (lbLastDist) { lbScale = Math.max(LB_MIN, Math.min(LB_MAX, lbScale * (dist / lbLastDist))); applyLbTransform(); }
                lbLastDist = dist;
            } else if (lbDragging && e.touches.length === 1) {
                lbTransX = lbOriginX + (e.touches[0].clientX - lbDragSX);
                lbTransY = lbOriginY + (e.touches[0].clientY - lbDragSY);
                applyLbTransform();
            }
        }, { passive: true });

        lightboxInner.addEventListener('touchend', () => { lbLastDist = null; lbDragging = false; });
    }

    // Mechanical tone on outbound creation links
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
    // BLUEPRINT PAN & ZOOM ENGINE
    // ============================================================
    const displayBox  = document.getElementById('blueprint-display-box');
    const bpImg       = document.getElementById('active-blueprint');
    const minimapEl   = document.getElementById('blueprint-minimap');
    const minimapImg  = document.getElementById('minimap-img');
    const minimapVp   = document.getElementById('minimap-viewport');
    const zoomInBtn   = document.getElementById('zoom-in-btn');
    const zoomOutBtn  = document.getElementById('zoom-out-btn');
    const zoomReset   = document.getElementById('zoom-reset-btn');

    let bpScale  = 1;
    let bpTransX = 0;
    let bpTransY = 0;
    let isDragging = false;
    let dragStartX = 0;
    let dragStartY = 0;
    let dragOriginX = 0;
    let dragOriginY = 0;

    const MIN_SCALE = 1;
    const MAX_SCALE = 6;

    function applyBpTransform() {
        if (!bpImg || !displayBox) return;

        // Clamp translation so image doesn't leave the box
        const boxW = displayBox.clientWidth;
        const boxH = displayBox.clientHeight;
        const imgW = bpImg.naturalWidth  * bpScale || boxW * bpScale;
        const imgH = bpImg.naturalHeight * bpScale || boxH * bpScale;

        const maxX = Math.max(0, (imgW - boxW) / 2);
        const maxY = Math.max(0, (imgH - boxH) / 2);

        if (bpScale <= 1) {
            bpTransX = 0;
            bpTransY = 0;
        } else {
            bpTransX = Math.max(-maxX, Math.min(maxX, bpTransX));
            bpTransY = Math.max(-maxY, Math.min(maxY, bpTransY));
        }

        bpImg.style.transform = `translate(${bpTransX}px, ${bpTransY}px) scale(${bpScale})`;
        bpImg.style.transformOrigin = 'center center';
        updateMinimap();
    }

    function updateMinimap() {
        if (!minimapVp || !bpImg) return;

        if (bpScale <= 1.05) {
            minimapVp.style.width  = '100%';
            minimapVp.style.height = '100%';
            minimapVp.style.left   = '0';
            minimapVp.style.top    = '0';
            return;
        }

        // Calculate viewport rect as fraction of total scaled image
        const vpW = (1 / bpScale) * 100;
        const vpH = (1 / bpScale) * 100;

        // Centre position shifted by translation
        const boxW = displayBox.clientWidth;
        const boxH = displayBox.clientHeight;
        const imgW = bpImg.naturalWidth  * bpScale || boxW * bpScale;
        const imgH = bpImg.naturalHeight * bpScale || boxH * bpScale;

        const offsetXFrac = 0.5 - (bpTransX / imgW);
        const offsetYFrac = 0.5 - (bpTransY / imgH);

        const left = Math.max(0, Math.min(100 - vpW, (offsetXFrac - vpW / 200) * 100));
        const top  = Math.max(0, Math.min(100 - vpH, (offsetYFrac - vpH / 200) * 100));

        minimapVp.style.width  = vpW  + '%';
        minimapVp.style.height = vpH  + '%';
        minimapVp.style.left   = left + '%';
        minimapVp.style.top    = top  + '%';
    }

    function resetBpView() {
        bpScale  = 1;
        bpTransX = 0;
        bpTransY = 0;
        applyBpTransform();
    }

    if (zoomInBtn)  zoomInBtn.addEventListener('click',  (e) => { e.stopPropagation(); bpScale = Math.min(MAX_SCALE, bpScale * 1.35); applyBpTransform(); playSystemPulse(160, 0.03, 'sine'); });
    if (zoomOutBtn) zoomOutBtn.addEventListener('click', (e) => { e.stopPropagation(); bpScale = Math.max(MIN_SCALE, bpScale / 1.35); applyBpTransform(); playSystemPulse(120, 0.03, 'sine'); });
    if (zoomReset)  zoomReset.addEventListener('click',  (e) => { e.stopPropagation(); resetBpView(); playSystemPulse(100, 0.04, 'sine'); });

    if (displayBox) {
        // Mouse wheel zoom
        displayBox.addEventListener('wheel', (e) => {
            e.preventDefault();
            const factor = e.deltaY < 0 ? 1.15 : 0.87;
            bpScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, bpScale * factor));
            applyBpTransform();
        }, { passive: false });

        // Drag to pan
        displayBox.addEventListener('mousedown', (e) => {
            if (bpScale <= 1) return;
            isDragging = true;
            dragStartX  = e.clientX;
            dragStartY  = e.clientY;
            dragOriginX = bpTransX;
            dragOriginY = bpTransY;
            displayBox.classList.add('grabbing');
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            bpTransX = dragOriginX + (e.clientX - dragStartX);
            bpTransY = dragOriginY + (e.clientY - dragStartY);
            applyBpTransform();
        });

        document.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                displayBox.classList.remove('grabbing');
            }
        });

        // Touch support
        let lastTouchDist = null;
        displayBox.addEventListener('touchstart', (e) => {
            if (e.touches.length === 2) {
                const dx = e.touches[0].clientX - e.touches[1].clientX;
                const dy = e.touches[0].clientY - e.touches[1].clientY;
                lastTouchDist = Math.hypot(dx, dy);
            } else if (e.touches.length === 1 && bpScale > 1) {
                isDragging  = true;
                dragStartX  = e.touches[0].clientX;
                dragStartY  = e.touches[0].clientY;
                dragOriginX = bpTransX;
                dragOriginY = bpTransY;
            }
        }, { passive: true });

        displayBox.addEventListener('touchmove', (e) => {
            if (e.touches.length === 2) {
                const dx = e.touches[0].clientX - e.touches[1].clientX;
                const dy = e.touches[0].clientY - e.touches[1].clientY;
                const dist = Math.hypot(dx, dy);
                if (lastTouchDist) {
                    const factor = dist / lastTouchDist;
                    bpScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, bpScale * factor));
                    applyBpTransform();
                }
                lastTouchDist = dist;
            } else if (isDragging && e.touches.length === 1) {
                bpTransX = dragOriginX + (e.touches[0].clientX - dragStartX);
                bpTransY = dragOriginY + (e.touches[0].clientY - dragStartY);
                applyBpTransform();
            }
        }, { passive: true });

        displayBox.addEventListener('touchend', () => {
            lastTouchDist = null;
            isDragging = false;
        });
    }

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

function switchBlueprint(deckNumber) {
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
    } catch (e) {}

    document.querySelectorAll('.bp-tab').forEach((tab, index) => {
        tab.classList.toggle('active', index === deckNumber - 1);
    });

    const blueprintDisplay = document.getElementById('active-blueprint');
    const minimapImg       = document.getElementById('minimap-img');
    const newSrc           = `assets/Blueprints/Lvl${deckNumber}.png`;

    if (blueprintDisplay) blueprintDisplay.src = newSrc;
    if (minimapImg)       minimapImg.src = newSrc;

    const deckLabel = document.getElementById('active-deck-label');
    if (deckLabel) {
        deckLabel.textContent = `// ACTIVE: DECK ${deckNumber}`;
    }

    // Log operator deck switch
    if (window.logOperatorEvent) {
        window.logOperatorEvent('ok', `OPERATOR: SWITCHED BLUEPRINT VIEW — DECK ${deckNumber}`);
    }

    // Reset pan/zoom on deck switch
    const displayBox = document.getElementById('blueprint-display-box');
    const bpImg = document.getElementById('active-blueprint');
    if (bpImg) {
        bpImg.style.transform = 'translate(0px, 0px) scale(1)';
    }
    const miniVp = document.getElementById('minimap-viewport');
    if (miniVp) {
        miniVp.style.width = '100%'; miniVp.style.height = '100%';
        miniVp.style.left = '0'; miniVp.style.top = '0';
    }
}

// ============================================================
// ============================================================
// ============================================================
// MUSIC PLAYER
// crossorigin="anonymous" on the <audio> tag allows
// createMediaElementSource to read audio data without CORS
// zeroing the analyser. GitHub Pages serves with CORS headers
// so this works. Build graph on first click (user gesture).
// ============================================================
document.addEventListener('DOMContentLoaded', function () {
    var btn   = document.getElementById('music-toggle');
    var audio = document.getElementById('music-player');
    if (!btn || !audio) return;

    var actx     = null;
    var analyser = null;
    var graphBuilt = false;
    var playing  = false;
    var raf      = null;

    function buildGraph() {
        if (graphBuilt) return;
        graphBuilt = true;
        try {
            var AC = window.AudioContext || window.webkitAudioContext;
            if (!AC) return;
            actx     = new AC();
            analyser = actx.createAnalyser();
            analyser.fftSize = 2048;
            var src = actx.createMediaElementSource(audio);
            src.connect(analyser);
            analyser.connect(actx.destination);
        } catch(e) {
            console.warn('Audio graph failed:', e.message);
            analyser = null;
        }
    }

    audio.addEventListener('error', function () {
        var c = audio.error ? audio.error.code : '?';
        btn.innerHTML = '<span class="audio-icon">&#9888;</span> FILE ERR ' + c;
    });

    btn.addEventListener('click', function () {
        if (!playing) {
            buildGraph();
            if (actx && actx.state === 'suspended') actx.resume();
            audio.currentTime = 0;
            audio.play().then(function () {
                playing = true;
                btn.classList.add('playing');
                btn.innerHTML = '<span class="audio-icon">&#127925;</span> MUSIC: PLAYING';
                if (window.logOperatorEvent) window.logOperatorEvent('ok', 'OPERATOR: MUSIC PLAYBACK STARTED');
                if (window.updateAudioStatusPanel) window.updateAudioStatusPanel();
                startWave();
            }).catch(function (e) {
                btn.innerHTML = '<span class="audio-icon">&#9888;</span> ' + e.name;
                console.error('play() failed:', e.name, e.message);
            });
        } else {
            audio.pause();
            audio.currentTime = 0;
            playing = false;
            btn.classList.remove('playing');
            btn.innerHTML = '<span class="audio-icon">&#127925;</span> MUSIC: OFFLINE';
            if (window.logOperatorEvent) window.logOperatorEvent('warn', 'OPERATOR: MUSIC STOPPED');
            if (window.updateAudioStatusPanel) window.updateAudioStatusPanel();
            stopWave();
        }
    });

    audio.addEventListener('ended', function () {
        playing = false;
        btn.classList.remove('playing');
        btn.innerHTML = '<span class="audio-icon">&#127925;</span> MUSIC: OFFLINE';
        if (window.logOperatorEvent) window.logOperatorEvent('ok', 'OPERATOR: MUSIC TRACK ENDED');
        if (window.updateAudioStatusPanel) window.updateAudioStatusPanel();
        stopWave();
    });

    function startWave() {
        var canvas = document.getElementById('audio-waveform-canvas');
        if (!canvas) return;
        var ctx = canvas.getContext('2d');

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
function updateBreakdownLayer() {
    const selector = document.getElementById('lvl-select');
    if (!selector) return;

    const selectedLevel = selector.value;
    const imgTop  = document.getElementById('view-top');
    const imgPort = document.getElementById('view-port');
    const imgAft  = document.getElementById('view-aft');
    const imgFore = document.getElementById('view-fore');

    const levelFolder = encodeURIComponent(`Level ${selectedLevel}`);
    const allImgs     = [imgTop, imgPort, imgAft, imgFore];

    allImgs.forEach(img => { if (img) img.classList.add('fading'); });

    setTimeout(() => {
        if (imgTop)  imgTop.src  = `assets/${levelFolder}/Top${selectedLevel}.png`;
        if (imgPort) imgPort.src = `assets/${levelFolder}/Port${selectedLevel}.png`;
        if (imgAft)  imgAft.src  = `assets/${levelFolder}/Aft${selectedLevel}.png`;
        if (imgFore) imgFore.src = `assets/${levelFolder}/Fore${selectedLevel}.png`;

        allImgs.forEach(img => { if (img) img.classList.remove('fading'); });

        const labelTop  = document.getElementById('label-top');
        const labelPort = document.getElementById('label-port');
        const labelAft  = document.getElementById('label-aft');
        const labelFore = document.getElementById('label-fore');

        if (labelTop)  labelTop.textContent  = `TOP PROJECTION — LEVEL ${selectedLevel}`;
        if (labelPort) labelPort.textContent = `PORT PROJECTION — LEVEL ${selectedLevel}`;
        if (labelAft)  labelAft.textContent  = `AFT PROJECTION — LEVEL ${selectedLevel}`;
        if (labelFore) labelFore.textContent = `FORE PROJECTION — LEVEL ${selectedLevel}`;

        // Log operator level switch
        if (window.logOperatorEvent) {
            window.logOperatorEvent('ok', `OPERATOR: STRUCTURAL BREAKDOWN SWITCHED — LEVEL ${selectedLevel}`);
        }

    }, 260);
}