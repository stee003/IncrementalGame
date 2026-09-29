/**
 * Astral Foundry - Offline Progress System
 * Calculates earned Aether during browser absence, applies efficiency bonuses,
 * and triggers "THE FOUNDRY AWAKENS" return modal.
 */

import { CONFIG } from '../config.js';

export class OfflineProgressSystem {
    constructor(gameState, productionSystem, milestoneSystem) {
        this.gameState = gameState;
        this.productionSystem = productionSystem;
        this.milestoneSystem = milestoneSystem;
    }

    /**
     * Calculate effective offline efficiency (0.0 to 1.0)
     */
    getEfficiency() {
        const state = this.gameState.getState();
        let eff = CONFIG.BASE_OFFLINE_EFFICIENCY; // 0.50

        if (state.upgrades.includes('deep_hibernation')) {
            eff += 0.25;
        }

        if (state.researchedNodes.includes('ab_4')) {
            eff += 0.25;
        }

        const conduitRank = state.ascensionPerks['chronal_conduit'] || 0;
        if (conduitRank > 0) {
            eff += (conduitRank * 0.10);
        }

        return Math.min(1.0, eff);
    }

    /**
     * Get maximum allowable offline seconds
     */
    getMaxOfflineSeconds() {
        const state = this.gameState.getState();
        let maxSec = CONFIG.BASE_OFFLINE_MAX_SECONDS; // 12 hours
        if (state.upgrades.includes('eternal_battery')) {
            maxSec = 86400; // 24 hours
        }
        return maxSec;
    }

    /**
     * Process offline progress on game load or return
     * @returns {Object|null} Offline report if away for >= 10 seconds, else null
     */
    checkOfflineProgress() {
        const state = this.gameState.getState();
        const now = Date.now();
        const lastTick = state.lastTick || now;
        const rawElapsedSeconds = Math.max(0, (now - lastTick) / 1000);

        // Update lastTick to prevent repeated triggers
        state.lastTick = now;

        // If away for less than 10 seconds, ignore or treat as active
        if (rawElapsedSeconds < 10) {
            return null;
        }

        const maxSeconds = this.getMaxOfflineSeconds();
        const effectiveElapsed = Math.min(rawElapsedSeconds, maxSeconds);
        const efficiency = this.getEfficiency();

        // Calculate baseline production
        const prod = this.productionSystem.calculate();
        const aetherEarned = prod.totalCps * effectiveElapsed * efficiency;

        if (aetherEarned > 0 && isFinite(aetherEarned) && !isNaN(aetherEarned)) {
            state.aether += aetherEarned;
            state.lifetimeAether += aetherEarned;
            state.totalLifetimeAether += aetherEarned;
        }

        state.timePlayed += effectiveElapsed;

        // Check if any milestones were unlocked
        const newMilestones = this.milestoneSystem.checkMilestones();

        return {
            rawElapsedSeconds,
            effectiveElapsed,
            efficiency,
            aetherEarned: Math.max(0, aetherEarned),
            milestonesUnlocked: newMilestones,
            wasCapped: rawElapsedSeconds > maxSeconds
        };
    }
}
