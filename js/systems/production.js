/**
 * Astral Foundry - Production System
 * Accurately calculates building production rates, synergies, global multipliers,
 * click power, and active temporary surges.
 */

import { BUILDINGS_DATA, UPGRADES_DATA, RESEARCH_BRANCHES, ASCENSION_PERKS } from '../config.js';

export class ProductionSystem {
    constructor(gameState) {
        this.gameState = gameState;
    }

    /**
     * Compute full production breakdown and total Aether/sec
     * @returns {Object} { totalCps, buildingRates, globalMultiplier, clickPower, breakdown }
     */
    calculate() {
        const state = this.gameState.getState();
        const buildingRates = {};
        const breakdown = {
            upgradesMult: 1,
            researchMult: 1,
            milestonesMult: 1,
            shardsMult: 1,
            perksMult: 1,
            surgeMult: 1
        };

        // 1. Calculate Global Multipliers
        // Upgrades
        let globalUpgradeMult = 1.0;
        state.upgrades.forEach(upgId => {
            const upg = UPGRADES_DATA.find(u => u.id === upgId);
            if (upg && upg.target === 'global' && upg.multiplier) {
                globalUpgradeMult *= upg.multiplier;
            }
        });
        breakdown.upgradesMult = globalUpgradeMult;

        // Research
        let globalResearchMult = 1.0;
        if (state.researchedNodes.includes('ae_3')) {
            globalResearchMult *= 1.25; // Superconducting Lattice
        }
        breakdown.researchMult = globalResearchMult;

        // Milestones
        let globalMilestoneMult = 1.0;
        if (state.unlockedMilestones.includes('foundry_stirs')) globalMilestoneMult *= 1.05;
        if (state.unlockedMilestones.includes('bending_stream')) globalMilestoneMult *= 1.15;
        if (state.unlockedMilestones.includes('industrial_awakening')) globalMilestoneMult *= 1.10;
        if (state.unlockedMilestones.includes('beyond_time')) globalMilestoneMult *= 1.25;
        breakdown.milestonesMult = globalMilestoneMult;

        // Astral Shards (10% bonus per unspent shard)
        const shardMult = 1.0 + (state.astralShards * 0.10);
        breakdown.shardsMult = shardMult;

        // Ascension Perks
        let perksMult = 1.0;
        const memoryRank = state.ascensionPerks['astral_memory'] || 0;
        if (memoryRank > 0) {
            perksMult *= (1 + memoryRank * 0.15);
        }
        breakdown.perksMult = perksMult;

        // Active Surge (Astral Alignment or Retrospective Flux)
        let surgeMult = 1.0;
        if (state.activeSurge && state.activeSurge.remainingSeconds > 0) {
            surgeMult = state.activeSurge.multiplier;
        }
        breakdown.surgeMult = surgeMult;

        // Research: Void Chlorophyll (ab_3: +1% to all buildings per Void Garden owned)
        let gardenSynergyMult = 1.0;
        if (state.researchedNodes.includes('ab_3')) {
            const gardenCount = state.buildings['void_garden'] || 0;
            gardenSynergyMult += (gardenCount * 0.01);
        }

        const globalMultiplier = globalUpgradeMult * globalResearchMult * globalMilestoneMult * shardMult * perksMult * surgeMult * gardenSynergyMult;

        // 2. Calculate Building-Specific Rates
        let totalBaseCps = 0;
        let totalCps = 0;

        BUILDINGS_DATA.forEach(b => {
            const count = state.buildings[b.id] || 0;
            if (count === 0) {
                buildingRates[b.id] = { count: 0, baseProd: b.baseProd, total: 0, mult: 1 };
                return;
            }

            let buildingMult = 1.0;

            // Specific upgrades
            state.upgrades.forEach(upgId => {
                const upg = UPGRADES_DATA.find(u => u.id === upgId);
                if (upg && upg.target === b.id && upg.multiplier) {
                    buildingMult *= upg.multiplier;
                }
            });

            // Specific research
            if (b.id === 'aether_condenser') {
                if (state.researchedNodes.includes('ae_1')) buildingMult *= 1.5;
                if (state.researchedNodes.includes('ae_2')) {
                    const furnaceCount = state.buildings['resonance_furnace'] || 0;
                    buildingMult *= (1 + furnaceCount * 0.03);
                }
            } else if (b.id === 'resonance_furnace') {
                if (state.unlockedMilestones.includes('harmonic_vibrations')) buildingMult *= 1.10;
            } else if (b.id === 'void_garden') {
                if (state.researchedNodes.includes('ab_1')) buildingMult *= 1.5;
                if (state.unlockedMilestones.includes('cosmic_botanist')) buildingMult *= 1.10;
            } else if (b.id === 'astral_observatory') {
                if (state.researchedNodes.includes('vs_1')) buildingMult *= 1.5;
            } else if (b.id === 'chronal_engine') {
                if (state.researchedNodes.includes('tm_1')) buildingMult *= 1.5;
            } else if (b.id === 'celestial_forge') {
                if (state.researchedNodes.includes('ae_4')) buildingMult *= 2.0;
            }

            const buildingCps = count * b.baseProd * buildingMult * globalMultiplier;
            buildingRates[b.id] = {
                count,
                baseProd: b.baseProd,
                buildingMult,
                total: buildingCps
            };

            totalCps += buildingCps;
        });

        // 3. Calculate Manual Click Power
        let clickPower = 1.0;
        if (state.upgrades.includes('astral_attunement')) {
            clickPower += 3.0; // +3 flat
        }

        // Percentage of CpS added to click
        let clickCpsRatio = 0;
        if (state.upgrades.includes('focusing_pylon')) {
            clickCpsRatio += 0.03; // +3% of CpS
        }
        const sparkRank = state.ascensionPerks['transcendent_spark'] || 0;
        if (sparkRank > 0) {
            clickCpsRatio += (sparkRank * 0.015); // +1.5% per rank
        }
        clickPower += (totalCps * clickCpsRatio);

        // Research: Bioluminescent Symbiosis (ab_2: +15% of Void Garden output added to click)
        if (state.researchedNodes.includes('ab_2') && buildingRates['void_garden']) {
            clickPower += (buildingRates['void_garden'].total * 0.15);
        }

        // Cache into state
        state.lastCalculatedCps = totalCps;
        state.lastCalculatedClickPower = clickPower;

        return {
            totalCps,
            buildingRates,
            globalMultiplier,
            clickPower,
            breakdown
        };
    }
}
