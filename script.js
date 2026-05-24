document.addEventListener("DOMContentLoaded", () => {
    const navLinks = document.querySelectorAll('.sidebar a');
    const sections = document.querySelectorAll('.manual-section');

    // --- Web Audio Synthesizer Framework ---
    let audioSystemEnabled = true;
    const audioBtn = document.getElementById('audio-toggle');

    if (audioBtn) {
        audioBtn.addEventListener('click', () => {
            audioSystemEnabled = !audioSystemEnabled;
            if (audioSystemEnabled) {
                audioBtn.classList.remove('muted');
                audioBtn.innerHTML = `<span class="audio-icon">🔊</span> AUDIO: ENABLED`;
                playSystemPulse(180, 0.04, 'sine');
            } else {
                audioBtn.classList.add('muted');
                audioBtn.innerHTML = `<span class="audio-icon">🔇</span> AUDIO: MUTED`;
            }
        });
    }

    function playSystemPulse(frequency, duration, oscillatorType = 'sine') {
        if (!audioSystemEnabled) return;
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (!AudioContext) return;
            const ctx = new AudioContext();
            
            const osc = ctx.createOscillator();
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

    // --- Dynamic Diagnostics Counter Engine ---
    function initializeHardwareCounters() {
        const targetReactor = 100; // Calibrated to Pinch 8Z full structural load output percentage
        const targetShields = 10000; // Calibrated to modded custom Shield telemetry specifications
        
        let currentReactor = 0;
        let currentShields = 0;

        const duration = 1200; // Counter sequence completes exactly in 1.2s
        const intervalTime = 20;
        const steps = duration / intervalTime;
        
        const stepReactor = targetReactor / steps;
        const stepShields = targetShields / steps;

        const counterTimer = setInterval(() => {
            currentReactor += stepReactor;
            currentShields += stepShields;

            if (currentReactor >= targetReactor) {
                document.getElementById('tick-reactor').textContent = targetReactor;
                document.getElementById('tick-shields').textContent = targetShields;
                clearInterval(counterTimer);
                playSystemPulse(220, 0.15, 'triangle'); // Final verification sound lock
            } else {
                document.getElementById('tick-reactor').textContent = Math.floor(currentReactor);
                document.getElementById('tick-shields').textContent = Math.floor(currentShields);
                if (Math.random() > 0.7) playSystemPulse(80, 0.01, 'sine');
            }
        }, intervalTime);
    }
    
    initializeHardwareCounters();

    // --- Navigation Subroutine Engine ---
    function navigateToSection(targetId) {
        if (!targetId || !targetId.startsWith('#')) return;

        navLinks.forEach(link => link.classList.remove('active'));
        sections.forEach(section => section.classList.remove('active-section'));

        const activeLink = document.querySelector(`.sidebar a[href="${targetId}"]`);
        const targetSection = document.querySelector(targetId);

        if (activeLink && targetSection) {
            activeLink.classList.add('active');
            targetSection.classList.add('active-section');
            window.scrollTo(0, 0);
        }
    }

    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
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

    // --- Interactive Lightbox Overlay Binding Subroutine ---
    const lightbox = document.getElementById('lightbox-overlay');
    const lightboxImg = document.getElementById('lightbox-display');
    const closeBtn = document.querySelector('.lightbox-close');
    const zoomableAssets = document.querySelectorAll('.zoomable-asset');

    zoomableAssets.forEach(asset => {
        asset.addEventListener('click', function() {
            playSystemPulse(150, 0.08, 'triangle');
            lightboxImg.src = this.src;
            lightboxImg.alt = this.alt;
            lightbox.classList.add('active');
            document.body.style.overflow = 'hidden';
        });
    });

    function closeLightbox() {
        playSystemPulse(90, 0.06, 'sine');
        lightbox.classList.remove('active');
        document.body.style.overflow = '';
    }

    if (closeBtn) closeBtn.addEventListener('click', closeLightbox);
    if (lightbox) {
        lightbox.addEventListener('click', function(e) {
            if (e.target === lightbox) closeLightbox();
        });
    }

    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && lightbox && lightbox.classList.contains('active')) {
            closeLightbox();
        }
    });

    
    // Attach mechanical tone feedback to outbound creation links
    const outboundLinks = document.querySelectorAll('.telemetry-link, .telemetry-link-compact, .terminal-notes-link');
    outboundLinks.forEach(link => {
        link.addEventListener('click', () => {
            playSystemPulse(240, 0.1, 'sine');
        });
    });

    // --- Integrated System Matrix Matrix Power Controller Engine ---
    const initButton = document.getElementById("system-power-btn");
    const inputs = document.querySelectorAll(".power-input");
    
    // Map system tags to their concrete display elements
    const systemTracks = {};
    document.querySelectorAll(".system-col").forEach(column => {
        const sysName = column.getAttribute("data-system");
        if (sysName) {
            systemTracks[sysName] = column.querySelector(".bar-meter-track");
        }
    });

    // Clamp values live to legal parameters (0-12) during manual keyboard entries
    inputs.forEach(input => {
        input.addEventListener("input", () => {
            let val = parseInt(input.value, 10);
            if (isNaN(val) || val < 0) val = 0;
            if (val > 12) val = 12;
            input.value = val;
        });
    });

    if (initButton) {
    initButton.addEventListener("click", () => {
        // Target the span elements instead of input elements
        const statElements = document.querySelectorAll(".power-static");
        const targetAllocations = {};
        
        statElements.forEach(stat => {
            const sys = stat.getAttribute("data-system");
            targetAllocations[sys] = parseInt(stat.textContent, 10) || 0;
        });

        initButton.disabled = true;
        initButton.innerText = "INITIALIZING CORES...";
        playSystemPulse(160, 0.12, 'sawtooth');

            // Visual reset
            Object.values(systemTracks).forEach(track => track.setAttribute("data-bars", "0"));

            let currentTickStep = 1;
            const totalSteps = 12;
            const stepDelayMs = 80;

            const sequenceInterval = setInterval(() => {
                Object.keys(targetAllocations).forEach(sysKey => {
                    const targetMax = targetAllocations[sysKey];
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
                    
                    // Unlock layout interaction cleanly
                    setTimeout(() => {
                        initButton.disabled = false;
                        inputs.forEach(input => input.disabled = false);
                        initButton.innerText = "INITIALIZE MATRIX";
                    }, 1200);
                } else {
                    currentTickStep++;
                }
            }, stepDelayMs);
        });
    }
});

function switchBlueprint(deckNumber) {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.setValueAtTime(140, ctx.currentTime);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
        osc.connect(gain); gain.connect(ctx.destination);
        osc.start(); osc.stop(ctx.currentTime + 0.04);
    } catch(e){}

    const tabs = document.querySelectorAll('.bp-tab');
    tabs.forEach((tab, index) => {
        if (index === (deckNumber - 1)) {
            tab.classList.add('active');
        } else {
            tab.classList.remove('active');
        }
    });

    const blueprintDisplay = document.getElementById('active-blueprint');
    if (blueprintDisplay) {
        blueprintDisplay.src = `assets/Blueprints/Lvl${deckNumber}.png`;
    }
}

function updateBreakdownLayer() {
    const selector = document.getElementById('lvl-select');
    if (!selector) return;
    
    const selectedLevel = selector.value;

    const imgTop = document.getElementById('view-top');
    const imgSide = document.getElementById('view-side');
    const imgBack = document.getElementById('view-back');
    const imgFront = document.getElementById('view-front');

    if (imgTop) imgTop.src = `assets/Level ${selectedLevel}/Top${selectedLevel}.png`;
    if (imgSide) imgSide.src = `assets/Level ${selectedLevel}/Side${selectedLevel}.png`;
    if (imgBack) imgBack.src = `assets/Level ${selectedLevel}/Back${selectedLevel}.png`;
    if (imgFront) imgFront.src = `assets/Level ${selectedLevel}/Front${selectedLevel}.png`;
}