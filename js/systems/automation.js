/**
 * Astral Foundry - Automation System
 * Handles Conduit Drone auto-clicking, Construct Matrix auto-building,
 * and Schematic Synthesizer auto-upgrading.
 */

import { BUILDINGS_DATA, UPGRADES_DATA } from '../config.js';

export class AutomationSystem {
    constructor(gameState, resourceSystem, buildingSystem, upgradeSystem) {
        this.gameState = gameState;
        this.resourceSystem = resourceSystem;
        this.buildingSystem = buildingSystem;
        this.upgradeSystem = upgradeSystem;
    }

    /**
     * Get automation speed multiplier (from Chronal Governor)
     */
    getSpeedMultiplier() {
        const state = this.gameState.getState();
        return state.upgrades.includes('chronal_governor') ? 2.0 : 1.0;
    }

    /**
     * Tick automation routines
     * @param {number} deltaSeconds 
     */
    tick(deltaSeconds) {
        const state = this.gameState.getState();
        const auto = state.automation;
        const speed = this.getSpeedMultiplier();

        // 1. Conduit Drone Auto-Clicker
        if (state.upgrades.includes('conduit_drone') && auto.droneEnabled) {
            auto.autoClickTimer = (auto.autoClickTimer || 0) + deltaSeconds * speed;
            const interval = 3.0; // Base: 1 pulse every 3s
            if (auto.autoClickTimer >= interval) {
                auto.autoClickTimer -= interval;
                // Auto click: triggers channelCore silently or with subtle tick
                this.resourceSystem.channelCore();
            }
        }

        // 2. Construct Matrix Auto-Building
        if (state.upgrades.includes('construct_matrix') && auto.autoBuildEnabled) {
            auto.autoBuildTimer = (auto.autoBuildTimer || 0) + deltaSeconds * speed;
            const buildInterval = 2.0; // Check every 2s
            if (auto.autoBuildTimer >= buildInterval) {
                auto.autoBuildTimer -= buildInterval;
                this.runAutoBuild();
            }
        }

        // 3. Schematic Synthesizer Auto-Upgrading
        if (state.upgrades.includes('schematic_synthesizer') && auto.autoUpgradeEnabled) {
            auto.autoUpgradeTimer = (auto.autoUpgradeTimer || 0) + deltaSeconds * speed;
            const upgradeInterval = 3.0; // Check every 3s
            if (auto.autoUpgradeTimer >= upgradeInterval) {
                auto.autoUpgradeTimer -= upgradeInterval;
                this.runAutoUpgrade();
            }
        }
    }

    /**
     * Attempt auto-building execution
     */
    runAutoBuild() {
        const state = this.gameState.getState();
        const target = state.automation.autoBuildTarget || 'cheapest';

        if (target === 'cheapest') {
            // Find the cheapest affordable building
            let bestBuilding = null;
            let lowestCost = Infinity;

            for (const b of BUILDINGS_DATA) {
                const { countToBuy, totalCost } = this.buildingSystem.calculateCost(b.id, 1);
                if (totalCost <= state.aether && totalCost < lowestCost) {
                    lowestCost = totalCost;
                    bestBuilding = b.id;
                }
            }

            if (bestBuilding) {
                this.buildingSystem.buy(bestBuilding, 1);
            }
        } else {
            // Target specific building
            const { countToBuy, totalCost } = this.buildingSystem.calculateCost(target, 1);
            if (countToBuy > 0 && totalCost <= state.aether) {
                this.buildingSystem.buy(target, 1);
            }
        }
    }

    /**
     * Attempt auto-upgrading execution
     */
    runAutoUpgrade() {
        const state = this.gameState.getState();
        // Find cheapest affordable unlocked unpurchased upgrade
        let bestUpgrade = null;
        let lowestCost = Infinity;

        for (const u of UPGRADES_DATA) {
            if (!this.upgradeSystem.isPurchased(u.id) && this.upgradeSystem.isUnlocked(u)) {
                if (u.cost <= state.aether && u.cost < lowestCost) {
                    lowestCost = u.cost;
                    bestUpgrade = u.id;
                }
            }
        }

        if (bestUpgrade) {
            this.upgradeSystem.buy(bestUpgrade);
        }
    }
}
