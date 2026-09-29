/**
 * Astral Foundry - Save System
 * Handles versioned persistence via localStorage, autosave,
 * base64 export/import, and safe validation.
 */

import { CONFIG, BUILDINGS_DATA } from '../config.js';
import { createDefaultState } from '../state.js';

export class SaveSystem {
    constructor(gameState) {
        this.gameState = gameState;
        this.lastSaveTime = Date.now();
    }

    /**
     * Save current state to localStorage
     * @returns {boolean}
     */
    save() {
        try {
            const state = this.gameState.getState();
            state.lastTick = Date.now();
            const serialized = JSON.stringify(state);
            localStorage.setItem(CONFIG.SAVE_KEY, serialized);
            this.lastSaveTime = Date.now();
            this.gameState.emit('save:success', { time: this.lastSaveTime });
            return true;
        } catch (err) {
            console.error('Failed to save Astral Foundry state:', err);
            this.gameState.emit('save:error', err);
            return false;
        }
    }

    /**
     * Load state from localStorage
     * @returns {boolean} true if state was loaded
     */
    load() {
        try {
            const raw = localStorage.getItem(CONFIG.SAVE_KEY);
            if (!raw) return false;

            const parsed = JSON.parse(raw);
            const migrated = this.migrate(parsed);
            this.gameState.setState(migrated);
            return true;
        } catch (err) {
            console.error('Failed to load Astral Foundry state:', err);
            return false;
        }
    }

    /**
     * Migrate and validate loaded state against current schema
     */
    migrate(loaded) {
        const defaultState = createDefaultState();
        if (!loaded || typeof loaded !== 'object') return defaultState;

        const state = Object.assign({}, defaultState, loaded);

        // Ensure all buildings exist
        state.buildings = Object.assign({}, defaultState.buildings, loaded.buildings || {});

        // Ensure arrays
        state.upgrades = Array.isArray(loaded.upgrades) ? loaded.upgrades : [];
        state.researchedNodes = Array.isArray(loaded.researchedNodes) ? loaded.researchedNodes : [];
        state.unlockedMilestones = Array.isArray(loaded.unlockedMilestones) ? loaded.unlockedMilestones : [];
        state.ascensionPerks = Object.assign({}, loaded.ascensionPerks || {});

        // Ensure automation settings
        state.automation = Object.assign({}, defaultState.automation, loaded.automation || {});

        // Ensure settings
        state.settings = Object.assign({}, defaultState.settings, loaded.settings || {});

        // Numeric sanitization
        state.aether = Number.isFinite(state.aether) ? Math.max(0, state.aether) : 0;
        state.lifetimeAether = Number.isFinite(state.lifetimeAether) ? Math.max(0, state.lifetimeAether) : 0;
        state.totalLifetimeAether = Number.isFinite(state.totalLifetimeAether) ? Math.max(0, state.totalLifetimeAether) : 0;
        state.astralShards = Number.isFinite(state.astralShards) ? Math.max(0, state.astralShards) : 0;
        state.totalAstralShards = Number.isFinite(state.totalAstralShards) ? Math.max(0, state.totalAstralShards) : 0;
        state.ascensionCount = Number.isFinite(state.ascensionCount) ? Math.max(0, state.ascensionCount) : 0;

        state.version = 1;
        return state;
    }

    /**
     * Export save to Base64 string
     */
    exportSave() {
        try {
            const state = this.gameState.getState();
            state.lastTick = Date.now();
            const json = JSON.stringify(state);
            return btoa(encodeURIComponent(json));
        } catch (err) {
            console.error('Export failed:', err);
            return null;
        }
    }

    /**
     * Import save from Base64 string
     */
    importSave(encodedStr) {
        try {
            if (!encodedStr || typeof encodedStr !== 'string') return false;
            const decodedJson = decodeURIComponent(atob(encodedStr.trim()));
            const parsed = JSON.parse(decodedJson);
            if (!parsed || typeof parsed !== 'object') return false;

            const migrated = this.migrate(parsed);
            this.gameState.setState(migrated);
            this.save();
            return true;
        } catch (err) {
            console.error('Import failed:', err);
            return false;
        }
    }

    /**
     * Delete save and reset state
     */
    reset() {
        try {
            localStorage.removeItem(CONFIG.SAVE_KEY);
            this.gameState.hardReset();
            return true;
        } catch (err) {
            console.error('Reset failed:', err);
            return false;
        }
    }
}
