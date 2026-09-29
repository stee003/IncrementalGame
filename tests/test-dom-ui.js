/**
 * Astral Foundry - DOM & UI Integration Test Suite
 * Tests actual HTML structure, element rendering, tab switching,
 * click events, modal interactions, and view integrity in a virtual browser.
 */

import { JSDOM } from 'jsdom';
import fs from 'fs';
import path from 'path';

const htmlContent = fs.readFileSync(path.resolve('./index.html'), 'utf8');

const dom = new JSDOM(htmlContent, {
    url: 'http://localhost:3000',
    runScripts: 'outside-only',
    resources: 'usable'
});

const { window } = dom;
// window environment mocks for jsdom
globalThis.window = window;
globalThis.document = window.document;
globalThis.HTMLElement = window.HTMLElement;
globalThis.performance = window.performance;
globalThis.localStorage = window.localStorage;
globalThis.requestAnimationFrame = (cb) => setTimeout(() => cb(performance.now()), 16);

// HTMLCanvasElement mock for jsdom
window.HTMLCanvasElement.prototype.getContext = () => ({
    clearRect: () => {},
    beginPath: () => {},
    arc: () => {},
    fill: () => {},
    save: () => {},
    restore: () => {},
    createRadialGradient: () => ({ addColorStop: () => {} }),
    scale: () => {}
});
window.HTMLCanvasElement.prototype.getBoundingClientRect = () => ({
    left: 0, top: 0, width: 800, height: 600, right: 800, bottom: 600
});

async function runDOMTests() {
    console.log('✦ Testing DOM & UI Integration ✦');

    // Dynamically import systems
    const { gameState } = await import('../js/state.js');
    const { audio } = await import('../js/utils/audio.js');
    const { ProductionSystem } = await import('../js/systems/production.js');
    const { ResourceSystem } = await import('../js/systems/resource.js');
    const { BuildingSystem } = await import('../js/systems/buildings.js');
    const { UpgradeSystem } = await import('../js/systems/upgrades.js');
    const { ResearchSystem } = await import('../js/systems/research.js');
    const { AutomationSystem } = await import('../js/systems/automation.js');
    const { MilestoneSystem } = await import('../js/systems/milestones.js');
    const { PrestigeSystem } = await import('../js/systems/prestige.js');
    const { OfflineProgressSystem } = await import('../js/systems/offline.js');
    const { SaveSystem } = await import('../js/systems/save.js');
    const { FoundryCanvas } = await import('../js/visuals/foundry-canvas.js');
    const { FoundryModel } = await import('../js/visuals/foundry-model.js');
    const { FloatingTextManager } = await import('../js/ui/floating-text.js');
    const { NotificationManager } = await import('../js/ui/notifications.js');
    const { UIManager } = await import('../js/ui/ui-manager.js');

    // Instantiate systems
    const productionSystem = new ProductionSystem(gameState);
    const resourceSystem = new ResourceSystem(gameState, productionSystem);
    const buildingSystem = new BuildingSystem(gameState, resourceSystem);
    const upgradeSystem = new UpgradeSystem(gameState, resourceSystem);
    const researchSystem = new ResearchSystem(gameState, resourceSystem);
    const automationSystem = new AutomationSystem(gameState, resourceSystem, buildingSystem, upgradeSystem);
    const milestoneSystem = new MilestoneSystem(gameState);
    const prestigeSystem = new PrestigeSystem(gameState);
    const saveSystem = new SaveSystem(gameState);
    const offlineSystem = new OfflineProgressSystem(gameState, productionSystem, milestoneSystem);

    const canvasEl = document.getElementById('foundry-canvas');
    const foundryCanvas = new FoundryCanvas(canvasEl);

    const modelContainer = document.getElementById('foundry-model-container');
    const foundryModel = new FoundryModel(modelContainer, gameState);

    const floatContainer = document.getElementById('floating-text-container');
    const floatingText = new FloatingTextManager(floatContainer);

    const toastContainer = document.getElementById('notifications-container');
    const notifications = new NotificationManager(toastContainer);

    const ui = new UIManager({
        gameState,
        resourceSystem,
        buildingSystem,
        upgradeSystem,
        researchSystem,
        automationSystem,
        milestoneSystem,
        prestigeSystem,
        saveSystem,
        offlineSystem,
        foundryModel,
        foundryCanvas,
        floatingText,
        notifications
    });

    console.log('✓ UI Manager initialized without errors');

    // Test 1: Check elements rendered
    const aetherDisplay = document.getElementById('res-aether-amount');
    if (!aetherDisplay) throw new Error('Aether display missing in DOM');
    if (aetherDisplay.textContent !== '0') throw new Error(`Expected Aether 0, got ${aetherDisplay.textContent}`);
    console.log('✓ Aether display rendered: 0');

    // Test 2: Core Click
    ui.handleCoreClick();
    if (aetherDisplay.textContent === '0') throw new Error('Aether did not increase on core click');
    console.log(`✓ Aether increased after core click: ${aetherDisplay.textContent}`);

    // Check floating text spawned
    const floatingNodes = floatContainer.querySelectorAll('.floating-number');
    if (floatingNodes.length === 0) throw new Error('Floating number element not spawned in container');
    console.log('✓ Floating text spawned on click');

    // Test 3: Tab switching
    const tabs = ['overview', 'production', 'buildings', 'upgrades', 'research', 'automation', 'archive', 'ascension'];
    for (const tab of tabs) {
        ui.switchTab(tab);
        const panel = document.getElementById(`tab-${tab}`);
        if (!panel.classList.contains('active')) {
            throw new Error(`Tab panel ${tab} is not active after switch`);
        }
    }
    console.log('✓ All 8 navigation tabs switched and verified active');

    // Test 4: Building construction via DOM
    ui.switchTab('buildings');
    gameState.getState().aether = 1000;
    ui.updateBuildingsTab();

    const condenserCard = document.querySelector('[data-building-id="aether_condenser"]');
    if (!condenserCard) throw new Error('Condenser card missing in buildings tab');

    const buyBtn = condenserCard.querySelector('.buy-building-btn');
    if (buyBtn.disabled) throw new Error('Buy button should be enabled with 1000 Aether');

    buyBtn.click();
    if (gameState.getState().buildings['aether_condenser'] !== 1) {
        throw new Error('Building was not purchased upon clicking button');
    }
    console.log('✓ Building purchased through DOM button click');

    // Test 5: Check evolving foundry model has activated condenser spires
    const condenserLayer = document.getElementById('layer-condenser');
    if (!condenserLayer.classList.contains('active')) {
        throw new Error('Foundry model condenser layer did not activate');
    }
    console.log('✓ Central Foundry model layer activated for Aether Condenser');

    // Test 6: Upgrades purchase via DOM
    ui.switchTab('upgrades');
    gameState.getState().aether = 500;
    ui.updateUpgradesTab();

    const upgBuyBtn = document.querySelector('[data-upgrade-id="lens_crystallization"]');
    if (!upgBuyBtn) throw new Error('Lens Crystallization buy button missing');
    upgBuyBtn.click();

    if (!gameState.getState().upgrades.includes('lens_crystallization')) {
        throw new Error('Upgrade was not purchased upon clicking buy');
    }
    console.log('✓ Upgrade purchased through DOM button click');

    // Test 7: Research unlock via DOM
    ui.switchTab('research');
    gameState.getState().aether = 10000;
    ui.updateResearchTab();

    const researchBtn = document.querySelector('.btn-research-unlock[data-node-id="ae_1"]');
    if (!researchBtn) throw new Error('Research ae_1 button missing');
    researchBtn.click();

    if (!gameState.getState().researchedNodes.includes('ae_1')) {
        throw new Error('Research node ae_1 was not unlocked upon clicking button');
    }
    console.log('✓ Research node transcribed through DOM button click');

    // Test 8: Offline progress modal
    const mockReport = {
        rawElapsedSeconds: 7200,
        effectiveElapsed: 7200,
        efficiency: 0.5,
        aetherEarned: 45000,
        milestonesUnlocked: [],
        wasCapped: false
    };
    ui.showOfflineModal(mockReport);
    const offlineModal = document.getElementById('offline-modal');
    if (!offlineModal.classList.contains('visible')) {
        throw new Error('Offline modal is not visible after showOfflineModal');
    }
    const claimBtn = document.getElementById('btn-claim-offline');
    if (!claimBtn) throw new Error('Claim button missing in offline modal');
    claimBtn.click();
    if (offlineModal.classList.contains('visible')) {
        throw new Error('Offline modal was not dismissed after clicking claim');
    }
    console.log('✓ Offline progress modal opened and dismissed cleanly');

    // Test 9: Settings modal & Export/Import
    ui.openSettingsModal();
    const settingsModal = document.getElementById('settings-modal');
    if (!settingsModal.classList.contains('visible')) {
        throw new Error('Settings modal is not visible');
    }
    const exportBtn = document.getElementById('btn-export-save');
    exportBtn.click();
    const ioText = document.getElementById('save-io-text');
    if (!ioText || !ioText.value) throw new Error('Exported string not populated in textarea');
    console.log('✓ Settings modal export generated valid save string');

    document.getElementById('btn-close-settings').click();
    if (settingsModal.classList.contains('visible')) {
        throw new Error('Settings modal was not closed');
    }
    console.log('✓ Settings modal closed cleanly');

    // Test 10: Check for NaN or [object Object] in any visible element
    const allText = document.body.textContent;
    if (allText.includes('NaN')) throw new Error('Found NaN text in DOM!');
    if (allText.includes('undefined')) throw new Error('Found undefined text in DOM!');
    if (allText.includes('[object Object]')) throw new Error('Found [object Object] text in DOM!');
    console.log('✓ Zero NaN, undefined, or [object Object] values found in DOM');

    console.log('\n✦ ALL 10 DOM & UI INTEGRATION TESTS PASSED ✦');
}

runDOMTests().catch(err => {
    console.error('DOM Test Failed:', err);
    process.exit(1);
});
