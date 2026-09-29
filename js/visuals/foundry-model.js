/**
 * Astral Foundry - Visual Structure Controller
 * Manages the multi-layered dynamic visual model of the Astral Foundry,
 * updating unlocked modules, conduit animation speeds, and core states.
 */

export class FoundryModel {
    constructor(containerElement, gameState) {
        this.container = containerElement;
        this.gameState = gameState;
        this.modules = {};
        this.coreElement = null;
        this.conduitElements = [];
        this.initDOM();
    }

    initDOM() {
        if (!this.container) return;

        // Construct the multi-layered visual model
        this.container.innerHTML = `
            <div class="foundry-structure-wrap">
                <!-- Celestial Aureole (Visual Upgrade 3) -->
                <div class="foundry-layer aureole-layer" id="layer-aureole">
                    <div class="aureole-ring outer"></div>
                    <div class="aureole-ring inner"></div>
                    <div class="stardust-cloud"></div>
                </div>

                <!-- Orbiting Celestial Crucible Pylons (Tier 6: Celestial Forge) -->
                <div class="foundry-layer forge-layer" id="layer-forge">
                    <div class="crucible-satellite sat-1"><div class="crucible-core"></div><div class="arc-lightning"></div></div>
                    <div class="crucible-satellite sat-2"><div class="crucible-core"></div><div class="arc-lightning"></div></div>
                    <div class="crucible-satellite sat-3"><div class="crucible-core"></div><div class="arc-lightning"></div></div>
                </div>

                <!-- Chronal Temporal Gyroscope (Tier 5: Chronal Engine) -->
                <div class="foundry-layer chronal-layer" id="layer-chronal">
                    <div class="chronal-gyroscope-outer">
                        <div class="gyro-ring"></div>
                        <div class="time-distortion-pulse"></div>
                    </div>
                </div>

                <!-- Astral Observatory Armillary (Tier 4: Astral Observatory) -->
                <div class="foundry-layer observatory-layer" id="layer-observatory">
                    <div class="observatory-tower">
                        <div class="armillary-arm">
                            <div class="armillary-sphere"></div>
                            <div class="focal-lens"></div>
                            <div class="celestial-beam"></div>
                        </div>
                    </div>
                </div>

                <!-- Floating Platform & Basalt Foundation -->
                <div class="foundry-layer platform-layer" id="layer-platform">
                    <div class="floating-island-shadow"></div>
                    <div class="floating-island-base">
                        <div class="basalt-crags"></div>
                        <div class="dais-surface">
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
                <div class="foundry-layer astrolabe-layer">
                    <div class="astrolabe-ring ring-outer"></div>
                    <div class="astrolabe-ring ring-mid"></div>
                    <div class="astrolabe-ring ring-inner"></div>
                </div>

                <!-- The Central Aether Core -->
                <div class="foundry-layer core-layer">
                    <div class="core-interactive-target" id="astral-core-target" role="button" aria-label="Channel Aether Core" tabindex="0">
                        <div class="core-aura"></div>
                        <div class="core-crystal" id="core-crystal">
                            <div class="crystal-facet facet-1"></div>
                            <div class="crystal-facet facet-2"></div>
                            <div class="crystal-facet facet-3"></div>
                            <div class="crystal-facet facet-4"></div>
                            <div class="core-inner-singularity"></div>
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

        this.coreElement = document.getElementById('astral-core-target');
        this.shockwaveElement = document.getElementById('core-shockwave');

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

    /**
     * Update visible layers according to player progression
     */
    updateProgression() {
        const state = this.gameState.getState();
        const b = state.buildings;
        const upg = state.upgrades;

        // Tier 1: Condenser
        if (this.modules.condenser) {
            this.modules.condenser.classList.toggle('active', (b['aether_condenser'] || 0) > 0);
        }

        // Tier 2: Furnace
        if (this.modules.furnace) {
            this.modules.furnace.classList.toggle('active', (b['resonance_furnace'] || 0) > 0);
        }

        // Tier 3: Garden
        if (this.modules.garden) {
            this.modules.garden.classList.toggle('active', (b['void_garden'] || 0) > 0);
        }

        // Tier 4: Observatory
        if (this.modules.observatory) {
            this.modules.observatory.classList.toggle('active', (b['astral_observatory'] || 0) > 0);
        }

        // Tier 5: Chronal Engine
        if (this.modules.chronal) {
            this.modules.chronal.classList.toggle('active', (b['chronal_engine'] || 0) > 0);
        }

        // Tier 6: Celestial Forge
        if (this.modules.forge) {
            this.modules.forge.classList.toggle('active', (b['celestial_forge'] || 0) > 0);
        }

        // Visual Upgrades
        if (this.modules.spires) {
            this.modules.spires.classList.toggle('active', upg.includes('spire_gilding'));
        }
        if (this.modules.conduits) {
            this.modules.conduits.classList.toggle('active', upg.includes('radiant_conduit_lattice'));
        }
        if (this.modules.aureole) {
            this.modules.aureole.classList.toggle('active', upg.includes('celestial_aureole'));
        }

        // Dynamic core pulse speed based on CpS
        const cps = state.lastCalculatedCps || 0;
        let pulseSpeed = 4.0; // Seconds per pulse at 0 cps
        if (cps > 10000) pulseSpeed = 0.8;
        else if (cps > 1000) pulseSpeed = 1.2;
        else if (cps > 100) pulseSpeed = 1.8;
        else if (cps > 10) pulseSpeed = 2.5;

        const crystal = document.getElementById('core-crystal');
        if (crystal) {
            crystal.style.setProperty('--core-pulse-duration', `${pulseSpeed}s`);
        }
    }
}
