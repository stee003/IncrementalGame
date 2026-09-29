/**
 * Astral Foundry - Building System
 * Manages construction, batch purchasing, cost discounts, and scaling.
 */

import { BUILDINGS_DATA } from '../config.js';
import { calculateBuildingCost, calculateBatchCost, calculateMaxAffordable } from '../utils/math.js';
import { audio } from '../utils/audio.js';

export class BuildingSystem {
    constructor(gameState, resourceSystem) {
        this.gameState = gameState;
        this.resourceSystem = resourceSystem;
    }

    /**
     * Get the effective cost scaling multiplier for buildings
     */
    getCostMultiplier() {
        const state = this.gameState.getState();
        // Research: Timeless Fabric reduces scaling from 1.15 to 1.135
        if (state.researchedNodes.includes('tm_3')) {
            return 1.135;
        }
        return 1.15;
    }

    /**
     * Get the global cost discount fraction for buildings (e.g. 0.20 = 20% off)
     */
    getCostDiscount() {
        const state = this.gameState.getState();
        let discount = 0;

        if (state.upgrades.includes('hardened_brass')) discount += 0.10;
        if (state.upgrades.includes('harmonic_conduits')) discount += 0.10;
        if (state.unlockedMilestones.includes('grand_conductor')) discount += 0.05;

        const compressionRank = state.ascensionPerks['aetheric_compression'] || 0;
        if (compressionRank > 0) {
            discount += (compressionRank * 0.05);
        }

        // Cap discount at 75% so things never become free
        return Math.min(0.75, discount);
    }

    /**
     * Get effective base cost for a building with discounts applied
     */
    getEffectiveBaseCost(buildingDef) {
        const discount = this.getCostDiscount();
        return buildingDef.baseCost * (1 - discount);
    }

    /**
     * Calculate cost to buy `amount` units of a building
     * @param {string} buildingId 
     * @param {number|string} amount 1, 10, 25, or 'max'
     * @returns {Object} { countToBuy, totalCost }
     */
    calculateCost(buildingId, amount) {
        const buildingDef = BUILDINGS_DATA.find(b => b.id === buildingId);
        if (!buildingDef) return { countToBuy: 0, totalCost: 0 };

        const state = this.gameState.getState();
        const currentCount = state.buildings[buildingId] || 0;
        const effectiveBase = this.getEffectiveBaseCost(buildingDef);
        const costMult = this.getCostMultiplier();

        if (amount === 'max') {
            const maxResult = calculateMaxAffordable(effectiveBase, costMult, currentCount, state.aether);
            return { countToBuy: maxResult.count, totalCost: maxResult.cost };
        }

        const countNum = parseInt(amount, 10) || 1;
        const totalCost = calculateBatchCost(effectiveBase, costMult, currentCount, countNum);
        return { countToBuy: countNum, totalCost };
    }

    /**
     * Purchase building(s)
     * @param {string} buildingId 
     * @param {number|string} amount 
     * @returns {boolean} true if successful
     */
    buy(buildingId, amount = 1) {
        const buildingDef = BUILDINGS_DATA.find(b => b.id === buildingId);
        if (!buildingDef) return false;

        const { countToBuy, totalCost } = this.calculateCost(buildingId, amount);
        if (countToBuy <= 0 || totalCost <= 0) return false;

        const state = this.gameState.getState();
        if (state.aether < totalCost) return false;

        if (this.resourceSystem.spend(totalCost)) {
            state.buildings[buildingId] = (state.buildings[buildingId] || 0) + countToBuy;

            // Audio & visual feedback
            audio.playBuildingSound();
            this.gameState.emit('building:buy', {
                buildingId,
                boughtCount: countToBuy,
                newTotal: state.buildings[buildingId],
                cost: totalCost
            });
            return true;
        }

        return false;
    }
}
