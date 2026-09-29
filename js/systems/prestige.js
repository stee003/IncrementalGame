/**
 * Astral Foundry - Prestige / Ascension System
 * Handles the Ascension reset ritual, Astral Shards generation,
 * and the Ascension Perks celestial store.
 */

import { CONFIG, ASCENSION_PERKS } from '../config.js';
import { audio } from '../utils/audio.js';

export class PrestigeSystem {
    constructor(gameState) {
        this.gameState = gameState;
    }

    /**
     * Check if player has unlocked the Ascension ceremony
     */
    isUnlocked() {
        const state = this.gameState.getState();
        return state.ascensionCount > 0 || state.lifetimeAether >= CONFIG.ASCENSION_UNLOCK_AETHER;
    }

    /**
     * Calculate how many Astral Shards the player would gain upon Ascending right now
     */
    calculatePendingShards() {
        const state = this.gameState.getState();
        if (state.lifetimeAether < CONFIG.ASCENSION_UNLOCK_AETHER) {
            return 0;
        }

        // Research: Cosmic Singularity Gateway increases shards by +30%
        let shardMult = 1.0;
        if (state.researchedNodes.includes('vs_3')) {
            shardMult *= 1.30;
        }

        const ratio = state.lifetimeAether / CONFIG.ASCENSION_SHARD_DIVISOR;
        const baseShards = Math.floor(10 * Math.sqrt(ratio));
        return Math.floor(baseShards * shardMult);
    }

    /**
     * Calculate cost for next rank of an Ascension Perk
     */
    getPerkCost(perkId) {
        const perk = ASCENSION_PERKS.find(p => p.id === perkId);
        if (!perk) return Infinity;

        const state = this.gameState.getState();
        const currentRank = state.ascensionPerks[perkId] || 0;
        if (currentRank >= perk.maxLevel) return Infinity;

        return Math.floor(perk.cost * Math.pow(perk.costScale, currentRank));
    }

    /**
     * Buy an Ascension Perk rank
     */
    buyPerk(perkId) {
        const perk = ASCENSION_PERKS.find(p => p.id === perkId);
        if (!perk) return false;

        const state = this.gameState.getState();
        const currentRank = state.ascensionPerks[perkId] || 0;
        if (currentRank >= perk.maxLevel) return false;

        const cost = this.getPerkCost(perkId);
        if (state.astralShards < cost) return false;

        state.astralShards -= cost;
        state.ascensionPerks[perkId] = currentRank + 1;

        audio.playUpgradeSound();
        this.gameState.emit('perk:buy', { perkId, newRank: state.ascensionPerks[perkId] });
        return true;
    }

    /**
     * Execute Ascension
     */
    ascend() {
        if (!this.isUnlocked()) return false;
        const pendingShards = this.calculatePendingShards();
        if (pendingShards <= 0) return false;

        audio.playAscensionSound();
        this.gameState.resetForAscension(pendingShards);
        return true;
    }
}
