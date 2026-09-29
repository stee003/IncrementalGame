/**
 * Astral Foundry - Milestone System
 * Tracks achievements, unlocks lore entries, and applies passive rewards.
 */

import { MILESTONES_DATA } from '../config.js';
import { audio } from '../utils/audio.js';

export class MilestoneSystem {
    constructor(gameState) {
        this.gameState = gameState;
    }

    /**
     * Check all locked milestones against current state
     * @returns {Array} newly unlocked milestone objects
     */
    checkMilestones() {
        const state = this.gameState.getState();
        const newlyUnlocked = [];

        for (const m of MILESTONES_DATA) {
            if (!state.unlockedMilestones.includes(m.id)) {
                if (m.condition(state)) {
                    state.unlockedMilestones.push(m.id);
                    newlyUnlocked.push(m);

                    audio.playMilestoneSound();
                    this.gameState.emit('milestone:unlock', m);
                }
            }
        }

        return newlyUnlocked;
    }

    /**
     * Get milestone progress percentage towards next unlock
     */
    getNextMilestone() {
        const state = this.gameState.getState();
        return MILESTONES_DATA.find(m => !state.unlockedMilestones.includes(m.id)) || null;
    }
}
