/**
 * Astral Foundry - Resource System
 * Handles delta-time Aether accumulation, manual core channeling,
 * surge ticks, and integrity checks.
 */

import { audio } from '../utils/audio.js';

export class ResourceSystem {
    constructor(gameState, productionSystem) {
        this.gameState = gameState;
        this.productionSystem = productionSystem;
    }

    /**
     * Advance simulation by deltaSeconds
     * @param {number} deltaSeconds 
     */
    tick(deltaSeconds) {
        if (deltaSeconds <= 0 || isNaN(deltaSeconds)) return;

        // Safety clamp on single-frame delta to prevent giant frame-drop spikes
        const clampedDelta = Math.min(deltaSeconds, 5.0);
        const state = this.gameState.getState();

        // 1. Update active surge timer
        if (state.activeSurge) {
            state.activeSurge.remainingSeconds -= clampedDelta;
            if (state.activeSurge.remainingSeconds <= 0) {
                state.activeSurge = null;
                this.gameState.emit('surge:end', null);
            }
        }

        // 2. Check for Temporal Mechanics Retrospective Flux proc (tm_2: 2% chance per second)
        if (state.researchedNodes.includes('tm_2') && !state.activeSurge) {
            if (Math.random() < 0.02 * clampedDelta) {
                this.triggerSurge('Retrospective Flux', 10.0, 3.0);
            }
        }

        // 3. Compute current production
        const prod = this.productionSystem.calculate();
        const earned = prod.totalCps * clampedDelta;

        if (earned > 0 && !isNaN(earned) && isFinite(earned)) {
            state.aether += earned;
            state.lifetimeAether += earned;
            state.totalLifetimeAether += earned;
        }

        // Integrity safeguard
        if (isNaN(state.aether) || state.aether < 0) state.aether = 0;
        if (isNaN(state.lifetimeAether)) state.lifetimeAether = state.aether;

        state.timePlayed += clampedDelta;
        state.lastTick = Date.now();
    }

    /**
     * Trigger an Astral Surge
     */
    triggerSurge(name, multiplier, duration) {
        const state = this.gameState.getState();
        state.activeSurge = {
            name,
            multiplier,
            remainingSeconds: duration,
            maxDuration: duration
        };
        audio.playSurgeSound();
        this.gameState.emit('surge:start', state.activeSurge);
    }

    /**
     * Manual Core Channeling (Clicking the Astral Core)
     * @returns {number} aetherGained
     */
    channelCore() {
        const state = this.gameState.getState();
        this.productionSystem.calculate(); // Ensure cached click power is up to date

        const clickGain = Math.max(1, state.lastCalculatedClickPower);
        state.aether += clickGain;
        state.lifetimeAether += clickGain;
        state.totalLifetimeAether += clickGain;
        state.manualClicks += 1;

        // Audio feedback
        audio.playClickSound();

        // Check for Dark Astral Distillation surge proc (vs_2: 5% chance on click)
        if (state.researchedNodes.includes('vs_2') && !state.activeSurge) {
            if (Math.random() < 0.05) {
                this.triggerSurge('Astral Alignment', 1.5, 15.0);
            }
        }

        this.gameState.emit('core:channel', { amount: clickGain, aether: state.aether });
        return clickGain;
    }

    /**
     * Safely spend Aether
     * @param {number} amount 
     * @returns {boolean} true if successful
     */
    spend(amount) {
        const state = this.gameState.getState();
        if (isNaN(amount) || amount <= 0) return false;
        if (state.aether >= amount) {
            state.aether -= amount;
            this.gameState.emit('aether:change', state.aether);
            return true;
        }
        return false;
    }
}
