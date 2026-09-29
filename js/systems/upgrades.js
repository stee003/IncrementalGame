/**
 * Astral Foundry - Upgrade System
 * Handles upgrade availability, prerequisite validation, and purchase execution.
 */

import { UPGRADES_DATA } from '../config.js';
import { audio } from '../utils/audio.js';

export class UpgradeSystem {
    constructor(gameState, resourceSystem) {
        this.gameState = gameState;
        this.resourceSystem = resourceSystem;
    }

    /**
     * Check if an upgrade's unlock condition is satisfied
     */
    isUnlocked(upgradeDef) {
        const state = this.gameState.getState();
        if (state.upgrades.includes(upgradeDef.id)) {
            return true; // Already owned
        }

        const req = upgradeDef.unlockedAt;
        if (!req) return true;

        if (req.lifetimeAether && state.lifetimeAether < req.lifetimeAether) {
            return false;
        }

        if (req.building) {
            const count = state.buildings[req.building] || 0;
            if (count < (req.count || 1)) {
                return false;
            }
        }

        return true;
    }

    /**
     * Check if an upgrade is already purchased
     */
    isPurchased(upgradeId) {
        return this.gameState.getState().upgrades.includes(upgradeId);
    }

    /**
     * Purchase an upgrade
     */
    buy(upgradeId) {
        const upgradeDef = UPGRADES_DATA.find(u => u.id === upgradeId);
        if (!upgradeDef) return false;

        const state = this.gameState.getState();
        if (this.isPurchased(upgradeId)) return false;
        if (!this.isUnlocked(upgradeDef)) return false;
        if (state.aether < upgradeDef.cost) return false;

        if (this.resourceSystem.spend(upgradeDef.cost)) {
            state.upgrades.push(upgradeId);

            audio.playUpgradeSound();
            this.gameState.emit('upgrade:buy', {
                upgradeId,
                upgradeDef,
                cost: upgradeDef.cost
            });

            // If it's a visual upgrade, notify foundry visual system
            if (upgradeDef.visualPart) {
                this.gameState.emit('foundry:visual_upgrade', upgradeDef.visualPart);
            }

            return true;
        }

        return false;
    }
}
