/**
 * MINTED — Neon Vault Visual Model
 * LUXE casino vault: pedestal, press, conveyors, neon halos
 * Pointer parallax + juice: shake, combo, flash
 */

const IDLE_MODULES = [
    { key: 'condenser', id: 'layer-condenser', test: b => (b['aether_condenser'] || 0) > 0 },
    { key: 'furnace', id: 'layer-furnace', test: b => (b['resonance_furnace'] || 0) > 0 },
    { key: 'garden', id: 'layer-garden', test: b => (b['void_garden'] || 0) > 0 },
    { key: 'observatory', id: 'layer-observatory', test: b => (b['astral_observatory'] || 0) > 0 },
    { key: 'chronal', id: 'layer-chronal', test: b => (b['chronal_engine'] || 0) > 0 },
    { key: 'forge', id: 'layer-forge', test: b => (b['celestial_forge'] || 0) > 0 }
];

const VISUAL_UPGRADES = [
    { key: 'spires', id: 'layer-spires', upgrade: 'spire_gilding' },
    { key: 'conduits', id: 'layer-conduits', upgrade: 'radiant_conduit_lattice' },
    { key: 'aureole', id: 'layer-aureole', upgrade: 'celestial_aureole' }
];

export class FoundryModel {
    constructor(containerElement, gameState, foundryCanvas = null) {
        this.container = containerElement;
        this.gameState = gameState;
        this.foundryCanvas = foundryCanvas;
        this.modules = {};
        this.coreElement = null;
        this.shockwaveElement = null;
        this.conduitElements = [];

        this.pointer = { x: 0, y: 0, tx: 0, ty: 0 };
        this.surgeActive = false;
        this.intensity = 0;
        this.targetIntensity = 0;
        this.frame = 0;
        this.pointerHandler = null;
        this.leaveHandler = null;

        // combo
        this.combo = 0;
        this.comboTimer = null;
        this.lastClickMs = 0;
        this.viewportEl = null;

        this.initDOM();
        this.attachPointerParallax();
        this.attachAdaptiveScale();
    }

    initDOM() {
        if (!this.container) return;

        this.container.innerHTML = `
            <div class="foundry-structure-wrap" id="foundry-structure-wrap">
                <!-- Gold haze -->
                <div class="foundry-layer mist-layer" style="--depth-x: -14; --depth-y: -9;">
                    <div class="void-mist mist-back"></div>
                    <div class="void-mist mist-mid"></div>
                    <div class="void-mist mist-front"></div>
                </div>

                <!-- Floating cash / chips -->
                <div class="foundry-layer debris-layer" style="--depth-x: 20; --depth-y: 14;">
                    <div class="cash-bill b1"></div>
                    <div class="cash-bill b2"></div>
                    <div class="cash-bill b3"></div>
                    <div class="cash-bill b4"></div>
                    <div class="gold-chip c1"></div>
                    <div class="gold-chip c2"></div>
                </div>

                <!-- Jackpot Neon Halo (visual upgrade) -->
                <div class="foundry-layer aureole-layer" id="layer-aureole" style="--depth-x: -4; --depth-y: -3;">
                    <div class="aureole-ring outer"></div>
                    <div class="aureole-ring inner"></div>
                    <div class="stardust-cloud"></div>
                </div>

                <!-- Orbital Vault Drones (Forge) -->
                <div class="foundry-layer forge-layer" id="layer-forge" style="--depth-x: 6; --depth-y: -4;">
                    <div class="crucible-satellite sat-1"><div class="crucible-core"></div><div class="arc-lightning"></div></div>
                    <div class="crucible-satellite sat-2"><div class="crucible-core"></div><div class="arc-lightning"></div></div>
                    <div class="crucible-satellite sat-3"><div class="crucible-core"></div><div class="arc-lightning"></div></div>
                </div>

                <!-- Quantum Ring (Chronal) -->
                <div class="foundry-layer chronal-layer" id="layer-chronal" style="--depth-x: -7; --depth-y: 5;">
                    <div class="chronal-gyroscope-outer">
                        <div class="gyro-ring"></div>
                        <div class="gyro-tick tick-a"></div>
                        <div class="gyro-tick tick-b"></div>
                        <div class="gyro-tick tick-c"></div>
                        <div class="time-distortion-pulse"></div>
                    </div>
                </div>

                <!-- Laser Pylon (Observatory) -->
                <div class="foundry-layer observatory-layer" id="layer-observatory" style="--depth-x: 12; --depth-y: 8;">
                    <div class="observatory-tower">
                        <div class="armillary-arm">
                            <div class="armillary-sphere"></div>
                            <div class="focal-lens"></div>
                            <div class="celestial-beam"></div>
                        </div>
                        <div class="observatory-mast"></div>
                    </div>
                </div>

                <!-- Vault Pedestal -->
                <div class="foundry-layer platform-layer" id="layer-platform" style="--depth-x: 0; --depth-y: 0;">
                    <div class="floating-island-shadow"></div>
                    <div class="light-shafts">
                        <div class="light-shaft shaft-1"></div>
                        <div class="light-shaft shaft-2"></div>
                        <div class="light-shaft shaft-3"></div>
                    </div>
                    <div class="floating-island-base">
                        <div class="basalt-crags">
                            <div class="crag-vein vein-1"></div>
                            <div class="crag-vein vein-2"></div>
                            <div class="crag-vein vein-3"></div>
                            <div class="crag-underside"></div>
                        </div>
                        <div class="dais-surface">
                            <div class="dais-runes">
                                <div class="rune-circle rune-outer"></div>
                                <div class="rune-circle rune-inner"></div>
                                <div class="rune-core-glow"></div>
                            </div>
                            <div class="conduit-lattice-grid" id="layer-conduits"></div>
                            <div class="furnace-chambers" id="layer-furnace">
                                <div class="heat-vent left"></div>
                                <div class="heat-vent right"></div>
                                <div class="molten-core-glow"></div>
                            </div>
                            <div class="void-garden-terraces" id="layer-garden">
                                <div class="astral-flora flora-1"></div>
                                <div class="astral-flora flora-2"></div>
                            </div>
                            <div class="condenser-spires" id="layer-condenser">
                                <div class="condenser-tower left">
                                    <div class="condenser-dish"></div>
                                    <div class="vapor-plume"></div>
                                </div>
                                <div class="condenser-tower right">
                                    <div class="condenser-dish"></div>
                                    <div class="vapor-plume"></div>
                                </div>
                            </div>
                            <div class="spire-runes" id="layer-spires">
                                <div class="runic-pillar left"></div>
                                <div class="runic-pillar right"></div>
                            </div>
                        </div>
                        <div class="vault-conveyor"></div>
                    </div>
                </div>

                <!-- Vault Tumbler Rings -->
                <div class="foundry-layer astrolabe-layer" style="--depth-x: -3; --depth-y: 3;">
                    <div class="astrolabe-ring ring-outer"></div>
                    <div class="astrolabe-ring ring-mid"></div>
                    <div class="astrolabe-ring ring-inner"></div>
                </div>

                <!-- Orbiting Chips -->
                <div class="foundry-layer shard-layer" style="--depth-x: 10; --depth-y: -6;">
                    <div class="rune-shard shard-1"></div>
                    <div class="rune-shard shard-2"></div>
                    <div class="rune-shard shard-3"></div>
                </div>

                <!-- HERO: VAULT PRESS CORE -->
                <div class="foundry-layer core-layer" style="--depth-x: 0; --depth-y: 0;">
                    <div class="vault-combo" id="vault-combo"></div>
                    <div class="core-interactive-target" id="astral-core-target" role="button" aria-label="Mint Vault Core — Click to print cash" tabindex="0">
                        <div class="core-halo"></div>
                        <div class="core-aura"></div>
                        <div class="core-crystal" id="core-crystal">
                            <div class="core-inner-singularity"></div>
                            <div class="crystal-specular"></div>
                        </div>
                        <div class="core-shockwave" id="core-shockwave"></div>
                    </div>
                    <div class="core-label-prompt">
                        <span class="prompt-key">$</span>
                        <span class="prompt-text">TAP TO MINT</span>
                        <span class="prompt-key">$</span>
                    </div>
                </div>
            </div>
        `;

        this.wrap = document.getElementById('foundry-structure-wrap');
        this.coreElement = document.getElementById('astral-core-target');
        this.shockwaveElement = document.getElementById('core-shockwave');
        this.crystalElement = document.getElementById('core-crystal');
        this.comboEl = document.getElementById('vault-combo');
        this.viewportEl = document.querySelector('.center-viewport');

        this.modules = {
            condenser: document.getElementById('layer-condenser'),
            furnace: document.getElementById('layer-furnace'),
            garden: document.getElementById('layer-garden'),
            observatory: document.getElementById('layer-observatory'),
            chronal: document.getElementById('layer-chronal'),
            forge: document.getElementById('layer-forge'),
            spires: document.getElementById('layer-spires'),
            conduits: document.getElementById('layer-conduits'),
            aureole: document.getElementById('layer-aureole')
        };
    }

    attachAdaptiveScale() {
        if (!this.container || typeof window === 'undefined') return;
        this.scaleHandler = () => {
            if (!this.wrap) return;
            const rect = this.container.getBoundingClientRect
                ? this.container.getBoundingClientRect()
                : { width: 0, height: 0 };
            if (!rect.width || !rect.height) return;
            const raw = Math.min(rect.width / 720, rect.height / 640);
            const scale = Math.min(1.42, Math.max(0.72, raw));
            this.wrap.style.setProperty('--foundry-scale', scale.toFixed(3));
        };
        this.scaleHandler();
        window.addEventListener('resize', this.scaleHandler);
        if (typeof window.ResizeObserver === 'function' && this.container.parentElement) {
            this.scaleObserver = new window.ResizeObserver(() => this.scaleHandler());
            this.scaleObserver.observe(this.container.parentElement);
        }
    }

    attachPointerParallax() {
        if (!this.container || typeof window === 'undefined') return;
        if (typeof window.matchMedia === 'function'
            && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

        const onMove = (e) => {
            const rect = this.container.getBoundingClientRect
                ? this.container.getBoundingClientRect()
                : { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight };
            if (!rect.width || !rect.height) return;
            const clientX = e.clientX !== undefined ? e.clientX : (e.touches && e.touches[0] ? e.touches[0].clientX : null);
            const clientY = e.clientY !== undefined ? e.clientY : (e.touches && e.touches[0] ? e.touches[0].clientY : null);
            if (clientX === null || clientY === null) return;
            this.pointer.tx = (clientX - rect.left) / rect.width * 2 - 1;
            this.pointer.ty = (clientY - rect.top) / rect.height * 2 - 1;
            if (this.foundryCanvas) this.foundryCanvas.setPointer(this.pointer.tx, this.pointer.ty);
        };
        const onLeave = () => {
            this.pointer.tx = 0;
            this.pointer.ty = 0;
            if (this.foundryCanvas) this.foundryCanvas.setPointer(0, 0);
        };
        this.pointerHandler = onMove;
        this.leaveHandler = onLeave;
        this.container.addEventListener('pointermove', onMove);
        this.container.addEventListener('pointerleave', onLeave);
    }

    pulseCore() {
        if (!this.shockwaveElement || !this.coreElement) return;
        this.coreElement.classList.remove('channeling');
        void this.coreElement.offsetWidth;
        this.coreElement.classList.add('channeling');
        this.shockwaveElement.classList.remove('active');
        void this.shockwaveElement.offsetWidth;
        this.shockwaveElement.classList.add('active');

        // screen shake on viewport
        if (this.viewportEl) {
            this.viewportEl.classList.remove('vault-shake');
            void this.viewportEl.offsetWidth;
            this.viewportEl.classList.add('vault-shake');
            setTimeout(() => this.viewportEl && this.viewportEl.classList.remove('vault-shake'), 360);
        }

        // combo logic
        const now = Date.now();
        if (now - this.lastClickMs < 900) {
            this.combo += 1;
        } else {
            this.combo = 1;
        }
        this.lastClickMs = now;
        clearTimeout(this.comboTimer);
        this.comboTimer = setTimeout(() => { this.combo = 0; if (this.comboEl) this.comboEl.classList.remove('show'); }, 1400);

        if (this.comboEl) {
            if (this.combo >= 3) {
                let label = `COMBO x${this.combo}!`;
                if (this.combo >= 10) label = `INSANE x${this.combo}!!`;
                else if (this.combo >= 6) label = `MEGA x${this.combo}!`;
                this.comboEl.textContent = label;
                this.comboEl.classList.remove('show');
                void this.comboEl.offsetWidth;
                this.comboEl.classList.add('show');
            } else {
                this.comboEl.classList.remove('show');
            }
        }

        // haptics if available
        if (navigator && typeof navigator.vibrate === 'function' && this.combo >= 5) {
            navigator.vibrate(22);
        }

        // canvas burst is triggered by main.js via foundryCanvas.burst, but also we trigger extra gold
        if (this.foundryCanvas && typeof this.foundryCanvas.burst === 'function') {
            const amt = Math.min(3 + Math.floor(this.combo / 2), 9);
            // let canvas handle its own burst; main.js will call burst separately, but we add tiny extra via direct
            // (no-op if main already called)
        }

        // cleanup channeling class
        setTimeout(() => {
            if (this.coreElement) this.coreElement.classList.remove('channeling');
        }, 420);
    }

    setSurge(active) {
        this.surgeActive = !!active;
        if (this.wrap) this.wrap.classList.toggle('surge-active', this.surgeActive);
        if (this.viewportEl) this.viewportEl.classList.toggle('jackpot-mode', this.surgeActive);
    }

    tick(delta) {
        if (!this.wrap) return;
        const dt = typeof delta === 'number' && isFinite(delta) ? Math.min(Math.max(delta, 0), 0.05) : 0;
        const ease = Math.min(1, dt * 4);
        this.pointer.x += (this.pointer.tx - this.pointer.x) * ease;
        this.pointer.y += (this.pointer.ty - this.pointer.y) * ease;
        this.intensity += (this.targetIntensity - this.intensity) * Math.min(1, dt * 2);
        this.frame++;
        if (this.frame % 2 !== 0) return; // 30fps update for css vars is enough and smoother
        this.wrap.style.setProperty('--px', this.pointer.x.toFixed(3));
        this.wrap.style.setProperty('--py', this.pointer.y.toFixed(3));
        this.wrap.style.setProperty('--intensity', this.intensity.toFixed(3));
    }

    updateProgression() {
        const state = this.gameState.getState();
        const b = state.buildings;
        const upg = state.upgrades;
        IDLE_MODULES.forEach(mod => {
            const el = this.modules[mod.key];
            if (el) el.classList.toggle('active', !!mod.test(b));
        });
        VISUAL_UPGRADES.forEach(vu => {
            const el = this.modules[vu.key];
            if (el) el.classList.toggle('active', upg.includes(vu.upgrade));
        });
        const cps = state.lastCalculatedCps || 0;
        let pulseSpeed = 3.6;
        if (cps > 15000) pulseSpeed = 0.75;
        else if (cps > 4000) pulseSpeed = 1.0;
        else if (cps > 500) pulseSpeed = 1.5;
        else if (cps > 40) pulseSpeed = 2.2;
        else if (cps > 5) pulseSpeed = 2.8;
        if (this.crystalElement) {
            this.crystalElement.style.setProperty('--core-pulse-duration', `${pulseSpeed}s`);
        }
        this.targetIntensity = cps <= 1 ? 0 : Math.min(1, Math.log10(Math.max(1, cps)) / 4.6);
        if (this.foundryCanvas && typeof this.foundryCanvas.setActivity === 'function') {
            this.foundryCanvas.setActivity(cps);
        }
    }

    destroy() {
        if (this.container && this.pointerHandler) {
            this.container.removeEventListener('pointermove', this.pointerHandler);
            this.container.removeEventListener('pointerleave', this.leaveHandler);
        }
        if (this.scaleHandler && typeof window !== 'undefined') {
            window.removeEventListener('resize', this.scaleHandler);
        }
        if (this.scaleObserver && typeof this.scaleObserver.disconnect === 'function') {
            this.scaleObserver.disconnect();
        }
        clearTimeout(this.comboTimer);
    }
}
