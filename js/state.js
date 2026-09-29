/**
 * Astral Foundry - Game State Management
 * Holds central state and event bus for decoupled reactivity.
 */

import { CONFIG, BUILDINGS_DATA } from './config.js';

export function createDefaultState() {
    const defaultBuildings = {};
    BUILDINGS_DATA.forEach(b => {
        defaultBuildings[b.id] = 0;
    });

    return {
        version: 1,
        aether: 0,
        lifetimeAether: 0,
        totalLifetimeAether: 0,
        astralShards: 0,
        totalAstralShards: 0,
        ascensionCount: 0,
        manualClicks: 0,
        timePlayed: 0,
        firstPlayed: Date.now(),
        lastTick: Date.now(),

        buildings: defaultBuildings,
        upgrades: [],
        researchedNodes: [],
        unlockedMilestones: [],
        ascensionPerks: {},

        automation: {
            droneEnabled: true,
            autoBuildEnabled: false,
            autoUpgradeEnabled: false,
            autoBuildTarget: 'cheapest',
            autoClickTimer: 0,
            autoBuildTimer: 0,
            autoUpgradeTimer: 0
        },

        activeSurge: null, // { name, multiplier, duration, maxDuration }

        settings: {
            volume: 0.5,
            muted: false,
            notation: 'standard',
            particlesEnabled: true
        },

        // Runtime cached calculations (not strictly persisted, or recomputed)
        lastCalculatedCps: 0,
        lastCalculatedClickPower: 1,
        activeTab: 'overview'
    };
}

class StateManager {
    constructor() {
        this.state = createDefaultState();
        this.listeners = new Map();
    }

    getState() {
        return this.state;
    }

    setState(newState) {
        this.state = newState;
        this.emit('state:loaded', this.state);
    }

    /**
     * Subscribe to state events:
     * 'tick', 'aether:change', 'building:buy', 'upgrade:buy',
     * 'research:unlock', 'milestone:unlock', 'ascension', etc.
     */
    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event).add(callback);
        return () => this.off(event, callback);
    }

    off(event, callback) {
        if (this.listeners.has(event)) {
            this.listeners.get(event).delete(callback);
        }
    }

    emit(event, data) {
        if (this.listeners.has(event)) {
            this.listeners.get(event).forEach(cb => {
                try {
                    cb(data);
                } catch (err) {
                    console.error(`Error in event listener for ${event}:`, err);
                }
            });
        }
    }

    /**
     * Reset progression for Ascension, retaining Shards, Perks, and Lifetime stats
     */
    resetForAscension(gainedShards) {
        const defaultBuildings = {};
        BUILDINGS_DATA.forEach(b => {
            defaultBuildings[b.id] = 0;
        });

        // Apply starting bonuses from perks if any
        const blueprintRank = this.state.ascensionPerks['cosmic_blueprint'] || 0;
        if (blueprintRank > 0) {
            defaultBuildings['aether_condenser'] = blueprintRank * 2;
            defaultBuildings['resonance_furnace'] = blueprintRank * 1;
        }

        const startingAether = this.state.unlockedMilestones.includes('beyond_time') ? 100 : 0;

        this.state.aether = startingAether;
        this.state.lifetimeAether = startingAether;
        this.state.astralShards += gainedShards;
        this.state.totalAstralShards += gainedShards;
        this.state.ascensionCount += 1;
        this.state.buildings = defaultBuildings;
        this.state.upgrades = [];
        this.state.researchedNodes = [];
        this.state.activeSurge = null;
        this.state.automation.autoClickTimer = 0;
        this.state.automation.autoBuildTimer = 0;
        this.state.automation.autoUpgradeTimer = 0;

        this.emit('ascension', { gainedShards, totalShards: this.state.astralShards });
    }

    /**
     * Complete wipe of all save data
     */
    hardReset() {
        this.state = createDefaultState();
        this.emit('hard_reset', this.state);
    }
}

export const gameState = new StateManager();
