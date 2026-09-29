/**
 * Astral Foundry - Main Game Entry Point
 * Orchestrates systems, game loop, delta-time accumulation,
 * offline calculation, and background tab execution.
 */

import { gameState } from './state.js';
import { audio } from './utils/audio.js';
import { setNotationMode } from './utils/formatters.js';
import { ProductionSystem } from './systems/production.js';
import { ResourceSystem } from './systems/resource.js';
import { BuildingSystem } from './systems/buildings.js';
import { UpgradeSystem } from './systems/upgrades.js';
import { ResearchSystem } from './systems/research.js';
import { AutomationSystem } from './systems/automation.js';
import { MilestoneSystem } from './systems/milestones.js';
import { PrestigeSystem } from './systems/prestige.js';
import { OfflineProgressSystem } from './systems/offline.js';
import { SaveSystem } from './systems/save.js';

import { FoundryCanvas } from './visuals/foundry-canvas.js';
import { FoundryModel } from './visuals/foundry-model.js';
import { FloatingTextManager } from './ui/floating-text.js';
import { NotificationManager } from './ui/notifications.js';
import { UIManager } from './ui/ui-manager.js';

class AstralFoundryGame {
    constructor() {
        this.productionSystem = new ProductionSystem(gameState);
        this.resourceSystem = new ResourceSystem(gameState, this.productionSystem);
        this.buildingSystem = new BuildingSystem(gameState, this.resourceSystem);
        this.upgradeSystem = new UpgradeSystem(gameState, this.resourceSystem);
        this.researchSystem = new ResearchSystem(gameState, this.resourceSystem);
        this.automationSystem = new AutomationSystem(gameState, this.resourceSystem, this.buildingSystem, this.upgradeSystem);
        this.milestoneSystem = new MilestoneSystem(gameState);
        this.prestigeSystem = new PrestigeSystem(gameState);
        this.saveSystem = new SaveSystem(gameState);
        this.offlineSystem = new OfflineProgressSystem(gameState, this.productionSystem, this.milestoneSystem);

        this.lastFrameTime = performance.now();
        this.autosaveTimer = 0;
        this.isRunning = false;
        this.isTabHidden = false;
    }

    init() {
        console.log('✦ Initializing Astral Foundry ✦');

        // 1. Initialize Visual Components
        const canvasEl = document.getElementById('foundry-canvas');
        this.foundryCanvas = new FoundryCanvas(canvasEl);

        const modelContainer = document.getElementById('foundry-model-container');
        this.foundryModel = new FoundryModel(modelContainer, gameState, this.foundryCanvas);

        const floatContainer = document.getElementById('floating-text-container');
        this.floatingText = new FloatingTextManager(floatContainer);

        const toastContainer = document.getElementById('notifications-container');
        this.notifications = new NotificationManager(toastContainer);

        // 2. Load Save Data
        const hasLoaded = this.saveSystem.load();
        const state = gameState.getState();

        // Apply settings
        if (state.settings) {
            audio.setVolume(state.settings.volume ?? 0.5);
            audio.setMuted(state.settings.muted ?? false);
            setNotationMode(state.settings.notation ?? 'standard');
            this.foundryCanvas.particlesEnabled = state.settings.particlesEnabled ?? true;
        }

        // 3. Check Offline Progress
        const offlineReport = this.offlineSystem.checkOfflineProgress();

        // 4. Initialize UI Manager
        this.uiManager = new UIManager({
            gameState,
            resourceSystem: this.resourceSystem,
            buildingSystem: this.buildingSystem,
            upgradeSystem: this.upgradeSystem,
            researchSystem: this.researchSystem,
            automationSystem: this.automationSystem,
            milestoneSystem: this.milestoneSystem,
            prestigeSystem: this.prestigeSystem,
            saveSystem: this.saveSystem,
            offlineSystem: this.offlineSystem,
            foundryModel: this.foundryModel,
            foundryCanvas: this.foundryCanvas,
            floatingText: this.floatingText,
            notifications: this.notifications
        });

        // 5. If returning from absence, show "The Foundry Awakens" modal
        if (offlineReport && offlineReport.aetherEarned > 0) {
            this.uiManager.showOfflineModal(offlineReport);
        }

        // 6. Setup Visibility and Inactive Tab Listeners
        this.setupTabVisibilityHandler();

        // 7. Setup Keyboard Shortcuts
        this.setupKeyboardShortcuts();

        // 8. Start Game Loop
        this.lastFrameTime = performance.now();
        this.isRunning = true;
        requestAnimationFrame((t) => this.gameLoop(t));

        // Background ticker for when rAF is throttled in inactive tab
        setInterval(() => this.backgroundHeartbeat(), 1000);

        console.log('✦ Astral Foundry is Online ✦');
    }

    /**
     * Primary Animation & Simulation Loop
     */
    gameLoop(currentTime) {
        if (!this.isRunning) return;

        const deltaSeconds = Math.max(0, (currentTime - this.lastFrameTime) / 1000);
        this.lastFrameTime = currentTime;

        // Skip simulation tick here if inactive tab heartbeat already processed it
        if (!this.isTabHidden) {
            this.updateSimulation(deltaSeconds);
        }

        // Render dynamic canvas particles & stars
        this.foundryCanvas.render(deltaSeconds);

        // Ease the visual state of the foundry structure (parallax, intensity)
        this.foundryModel.tick(deltaSeconds);

        // Update UI
        this.uiManager.updateTick();

        requestAnimationFrame((t) => this.gameLoop(t));
    }

    /**
     * Advance game simulation by deltaSeconds
     */
    updateSimulation(deltaSeconds) {
        if (deltaSeconds <= 0) return;

        // 1. Advance Resource generation & surges
        this.resourceSystem.tick(deltaSeconds);

        // 2. Advance Automation routines
        this.automationSystem.tick(deltaSeconds);

        // 3. Check for Milestones
        this.milestoneSystem.checkMilestones();

        // 4. Autosave timer
        this.autosaveTimer += deltaSeconds;
        if (this.autosaveTimer >= 30) { // Every 30 seconds
            this.autosaveTimer = 0;
            this.saveSystem.save();
        }
    }

    /**
     * Fallback timer for when browser tab is inactive / backgrounded
     */
    backgroundHeartbeat() {
        if (!this.isTabHidden) return;

        const now = performance.now();
        const deltaSeconds = Math.max(0, (now - this.lastFrameTime) / 1000);
        this.lastFrameTime = now;

        this.updateSimulation(deltaSeconds);
    }

    setupTabVisibilityHandler() {
        document.addEventListener('visibilitychange', () => {
            this.isTabHidden = document.hidden;
            if (!this.isTabHidden) {
                // Just focused back: refresh timestamp
                this.lastFrameTime = performance.now();
                this.uiManager.renderAll();
            }
        });

        // Save on window unload
        window.addEventListener('beforeunload', () => {
            this.saveSystem.save();
        });
    }

    setupKeyboardShortcuts() {
        window.addEventListener('keydown', (e) => {
            // Ignore if typing in input / textarea
            if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;

            if (e.code === 'Space') {
                e.preventDefault();
                this.uiManager.handleCoreClick();
            } else if (e.code === 'KeyM') {
                const state = gameState.getState();
                state.settings.muted = !state.settings.muted;
                audio.setMuted(state.settings.muted);
                this.uiManager.updateSoundButton();
            } else if (e.code === 'KeyS' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                this.saveSystem.save();
                this.notifications.notifySave();
            }
        });
    }
}

// Bootstrap when DOM is ready
window.addEventListener('DOMContentLoaded', () => {
    const game = new AstralFoundryGame();
    game.init();
    window.__ASTRAL_FOUNDRY__ = game;
});
