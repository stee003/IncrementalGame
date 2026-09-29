/**
 * Astral Foundry - Visual Structure Controller
 *
 * Builds and animates the multi-layered dynamic visual model of the Astral
 * Foundry: unlocked modules appear as the player progresses, conduits and
 * rings spin, the core breathes faster with production, and the whole
 * structure reacts to pointer movement with a subtle 3D parallax tilt.
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

        this.initDOM();
        this.attachPointerParallax();
        this.attachAdaptiveScale();
    }

    initDOM() {
        if (!this.container) return;

        // Construct the multi-layered visual model
        this.container.innerHTML = `
            <div class="foundry-structure-wrap" id="foundry-structure-wrap">

                <!-- Ambient Void Mist beneath the island -->
                <div class="foundry-layer mist-layer" style="--depth-x: -16; --depth-y: -10;">
                    <div class="void-mist mist-back"></div>
                    <div class="void-mist mist-mid"></div>
                    <div class="void-mist mist-front"></div>
                </div>

                <!-- Drifting debris shards around the platform -->
                <div class="foundry-layer debris-layer" style="--depth-x: 22; --depth-y: 16;">
                    <div class="debris-shard d-1"></div>
                    <div class="debris-shard d-2"></div>
                    <div class="debris-shard d-3"></div>
                    <div class="debris-shard d-4"></div>
                    <div class="debris-shard d-5"></div>
                </div>

                <!-- Celestial Aureole (Visual Upgrade 3) -->
                <div class="foundry-layer aureole-layer" id="layer-aureole" style="--depth-x: -4; --depth-y: -3;">
                    <div class="aureole-ring outer"></div>
                    <div class="aureole-ring inner"></div>
                    <div class="stardust-cloud"></div>
                </div>

                <!-- Orbiting Celestial Crucible Pylons (Tier 6: Celestial Forge) -->
                <div class="foundry-layer forge-layer" id="layer-forge" style="--depth-x: 6; --depth-y: -4;">
                    <div class="crucible-satellite sat-1"><div class="crucible-core"></div><div class="arc-lightning"></div></div>
                    <div class="crucible-satellite sat-2"><div class="crucible-core"></div><div class="arc-lightning"></div></div>
                    <div class="crucible-satellite sat-3"><div class="crucible-core"></div><div class="arc-lightning"></div></div>
                </div>

                <!-- Chronal Temporal Gyroscope (Tier 5: Chronal Engine) -->
                <div class="foundry-layer chronal-layer" id="layer-chronal" style="--depth-x: -7; --depth-y: 5;">
                    <div class="chronal-gyroscope-outer">
                        <div class="gyro-ring"></div>
                        <div class="gyro-tick tick-a"></div>
                        <div class="gyro-tick tick-b"></div>
                        <div class="gyro-tick tick-c"></div>
                        <div class="time-distortion-pulse"></div>
                    </div>
                </div>

                <!-- Astral Observatory Armillary (Tier 4: Astral Observatory) -->
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

                <!-- Floating Platform & Basalt Foundation -->
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
                            <!-- Engraved rune circle on the dais floor -->
                            <div class="dais-runes">
                                <div class="rune-circle rune-outer"></div>
                                <div class="rune-circle rune-inner"></div>
                                <div class="rune-core-glow"></div>
                            </div>

                            <!-- Conduit Lattice (Visual Upgrade 2) -->
                            <div class="conduit-lattice-grid" id="layer-conduits"></div>

                            <!-- Resonance Furnace Vents (Tier 2: Resonance Furnace) -->
                            <div class="furnace-chambers" id="layer-furnace">
                                <div class="heat-vent left"></div>
                                <div class="heat-vent right"></div>
                                <div class="molten-core-glow"></div>
                            </div>

                            <!-- Void Garden Terraces (Tier 3: Void Garden) -->
                            <div class="void-garden-terraces" id="layer-garden">
                                <div class="bioluminescent-vine vine-1"></div>
                                <div class="bioluminescent-vine vine-2"></div>
                                <div class="astral-flora flora-1"></div>
                                <div class="astral-flora flora-2"></div>
                            </div>

                            <!-- Aether Condenser Spires (Tier 1: Aether Condenser) -->
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

                            <!-- Gilded Runic Spires (Visual Upgrade 1) -->
                            <div class="spire-runes" id="layer-spires">
                                <div class="runic-pillar left"></div>
                                <div class="runic-pillar right"></div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Astrolabe Gimbal Rings -->
                <div class="foundry-layer astrolabe-layer" style="--depth-x: -3; --depth-y: 3;">
                    <div class="astrolabe-ring ring-outer"></div>
                    <div class="astrolabe-ring ring-mid"></div>
                    <div class="astrolabe-ring ring-inner"></div>
                </div>

                <!-- Orbiting Rune Shards -->
                <div class="foundry-layer shard-layer" style="--depth-x: 10; --depth-y: -6;">
                    <div class="rune-shard shard-1"></div>
                    <div class="rune-shard shard-2"></div>
                    <div class="rune-shard shard-3"></div>
                </div>

                <!-- The Central Aether Core -->
                <div class="foundry-layer core-layer" style="--depth-x: 0; --depth-y: 0;">
                    <div class="core-interactive-target" id="astral-core-target" role="button" aria-label="Channel Aether Core" tabindex="0">
                        <div class="core-halo"></div>
                        <div class="core-aura"></div>
                        <div class="core-crystal" id="core-crystal">
                            <div class="crystal-facet facet-1"></div>
                            <div class="crystal-facet facet-2"></div>
                            <div class="crystal-facet facet-3"></div>
                            <div class="crystal-facet facet-4"></div>
                            <div class="core-inner-singularity"></div>
                            <div class="crystal-specular"></div>
                        </div>
                        <div class="core-shockwave" id="core-shockwave"></div>
                    </div>
                    <div class="core-label-prompt">
                        <span class="prompt-key">✦</span>
                        <span class="prompt-text">CHANNEL AETHER</span>
                        <span class="prompt-key">✦</span>
                    </div>
                </div>
            </div>
        `;

        this.wrap = document.getElementById('foundry-structure-wrap');
        this.coreElement = document.getElementById('astral-core-target');
        this.shockwaveElement = document.getElementById('core-shockwave');
        this.crystalElement = document.getElementById('core-crystal');

        // Cache module layer references
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

    /* ---------------------------------------------------------------- *
     *  Adaptive scale
     * ---------------------------------------------------------------- */

    /**
     * Fit the structure to whatever viewport it is in: the base model is
     * authored at 440px and is scaled up on roomy screens (up to ~1.35x)
     * so the foundry always feels like the centrepiece of the scene.
     */
    attachAdaptiveScale() {
        if (!this.container || typeof window === 'undefined') return;

        this.scaleHandler = () => {
            if (!this.wrap) return;
            const rect = this.container.getBoundingClientRect
                ? this.container.getBoundingClientRect()
                : { width: 0, height: 0 };
            if (!rect.width || !rect.height) return;
            const raw = Math.min(rect.width / 700, rect.height / 620);
            const scale = Math.min(1.35, Math.max(0.7, raw));
            this.wrap.style.setProperty('--foundry-scale', scale.toFixed(3));
        };

        this.scaleHandler();
        window.addEventListener('resize', this.scaleHandler);
        if (typeof window.ResizeObserver === 'function' && this.container.parentElement) {
            this.scaleObserver = new window.ResizeObserver(() => this.scaleHandler());
            this.scaleObserver.observe(this.container.parentElement);
        }
    }

    /* ---------------------------------------------------------------- *
     *  Pointer parallax
     * ---------------------------------------------------------------- */

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

    /* ---------------------------------------------------------------- *
     *  Interactions
     * ---------------------------------------------------------------- */

    /**
     * Trigger click shockwave animation on the central core
     */
    pulseCore() {
        if (!this.shockwaveElement || !this.coreElement) return;

        this.coreElement.classList.remove('channeling');
        void this.coreElement.offsetWidth; // Force reflow
        this.coreElement.classList.add('channeling');

        this.shockwaveElement.classList.remove('active');
        void this.shockwaveElement.offsetWidth; // Force reflow
        this.shockwaveElement.classList.add('active');
    }

    /** Reflect surge state across the structure (brass / crimson tint). */
    setSurge(active) {
        this.surgeActive = !!active;
        if (this.wrap) this.wrap.classList.toggle('surge-active', this.surgeActive);
    }

    /**
     * Per-frame visual easing. Cheap: only a handful of CSS custom properties
     * are written, and only every few frames.
     */
    tick(delta) {
        if (!this.wrap) return;
        const dt = typeof delta === 'number' && isFinite(delta) ? Math.min(Math.max(delta, 0), 0.05) : 0;

        const ease = Math.min(1, dt * 4);
        this.pointer.x += (this.pointer.tx - this.pointer.x) * ease;
        this.pointer.y += (this.pointer.ty - this.pointer.y) * ease;
        this.intensity += (this.targetIntensity - this.intensity) * Math.min(1, dt * 2);

        this.frame++;
        if (this.frame % 3 !== 0) return;

        this.wrap.style.setProperty('--px', this.pointer.x.toFixed(3));
        this.wrap.style.setProperty('--py', this.pointer.y.toFixed(3));
        this.wrap.style.setProperty('--intensity', this.intensity.toFixed(3));
    }

    /**
     * Update visible layers according to player progression
     */
    updateProgression() {
        const state = this.gameState.getState();
        const b = state.buildings;
        const upg = state.upgrades;

        // Buildings progressively awaken physical modules on the structure
        IDLE_MODULES.forEach(mod => {
            const el = this.modules[mod.key];
            if (el) el.classList.toggle('active', !!mod.test(b));
        });

        // Visual upgrades
        VISUAL_UPGRADES.forEach(vu => {
            const el = this.modules[vu.key];
            if (el) el.classList.toggle('active', upg.includes(vu.upgrade));
        });

        // Dynamic core pulse speed based on production rate
        const cps = state.lastCalculatedCps || 0;
        let pulseSpeed = 4.0; // seconds per pulse at 0 cps
        if (cps > 10000) pulseSpeed = 0.8;
        else if (cps > 1000) pulseSpeed = 1.2;
        else if (cps > 100) pulseSpeed = 1.8;
        else if (cps > 10) pulseSpeed = 2.5;

        if (this.crystalElement) {
            this.crystalElement.style.setProperty('--core-pulse-duration', `${pulseSpeed}s`);
        }

        // Normalised 0..1 intensity feeds the canvas bloom and the structure glow
        this.targetIntensity = cps <= 1 ? 0 : Math.min(1, Math.log10(cps) / 5);
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
    }
}
