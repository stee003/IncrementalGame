/**
 * Astral Foundry - Comprehensive Logic Test Suite
 * Tests all mathematical formulas, simulation integrity, progression rules,
 * saving, offline calculations, and prestige systems.
 */

import { CONFIG, BUILDINGS_DATA, UPGRADES_DATA, RESEARCH_BRANCHES, MILESTONES_DATA, ASCENSION_PERKS } from '../js/config.js';
import { gameState, createDefaultState } from '../js/state.js';
import { formatNumber, formatRate, formatMultiplier, formatTime } from '../js/utils/formatters.js';
import { calculateBuildingCost, calculateBatchCost, calculateMaxAffordable } from '../js/utils/math.js';
import { ProductionSystem } from '../js/systems/production.js';
import { ResourceSystem } from '../js/systems/resource.js';
import { BuildingSystem } from '../js/systems/buildings.js';
import { UpgradeSystem } from '../js/systems/upgrades.js';
import { ResearchSystem } from '../js/systems/research.js';
import { AutomationSystem } from '../js/systems/automation.js';
import { MilestoneSystem } from '../js/systems/milestones.js';
import { PrestigeSystem } from '../js/systems/prestige.js';
import { OfflineProgressSystem } from '../js/systems/offline.js';
import { SaveSystem } from '../js/systems/save.js';

// Setup Mock localStorage for Node environment
const mockStorage = {};
globalThis.localStorage = {
    getItem: (k) => mockStorage[k] || null,
    setItem: (k, v) => { mockStorage[k] = String(v); },
    removeItem: (k) => { delete mockStorage[k]; },
    clear: () => { Object.keys(mockStorage).forEach(k => delete mockStorage[k]); }
};

let testsPassed = 0;
let testsFailed = 0;

function assert(condition, message) {
    if (!condition) {
        console.error(`❌ FAILED: ${message}`);
        testsFailed++;
        throw new Error(message);
    } else {
        console.log(`✓ PASSED: ${message}`);
        testsPassed++;
    }
}

async function runTestSuite() {
    console.log('--- 1. Testing Formatters ---');
    assert(formatNumber(0) === '0', 'formatNumber(0) is 0');
    assert(formatNumber(950) === '950', 'formatNumber(950) is 950');
    assert(formatNumber(1250) === '1.25K', 'formatNumber(1250) is 1.25K');
    assert(formatNumber(2350000) === '2.35M', 'formatNumber(2350000) is 2.35M');
    assert(formatNumber(8410000000) === '8.41B', 'formatNumber(8.41B) is 8.41B');
    assert(formatTime(45) === '45s', 'formatTime(45) is 45s');
    assert(formatTime(3665) === '1h 1m 5s', 'formatTime(3665) is 1h 1m 5s');

    console.log('\n--- 2. Testing Math & Scaling ---');
    const b1Cost = calculateBuildingCost(15, 1.15, 0);
    assert(Math.abs(b1Cost - 15) < 0.001, 'Building cost at level 0 is base cost');
    const b1CostNext = calculateBuildingCost(15, 1.15, 1);
    assert(Math.abs(b1CostNext - 17.25) < 0.001, 'Building cost at level 1 is 17.25');

    const batchCost10 = calculateBatchCost(15, 1.15, 0, 10);
    assert(batchCost10 > 15 && batchCost10 < 400, 'Batch cost for 10 is calculated');

    const maxAffordable = calculateMaxAffordable(15, 1.15, 0, 100);
    assert(maxAffordable.count >= 4, `Can afford at least 4 buildings with 100 Aether (got ${maxAffordable.count})`);
    assert(maxAffordable.cost <= 100, 'Max cost does not exceed budget');

    console.log('\n--- 3. Testing Core Simulation & Resource Generation ---');
    gameState.hardReset();
    const production = new ProductionSystem(gameState);
    const resource = new ResourceSystem(gameState, production);
    const building = new BuildingSystem(gameState, resource);
    const upgrade = new UpgradeSystem(gameState, resource);
    const research = new ResearchSystem(gameState, resource);
    const automation = new AutomationSystem(gameState, resource, building, upgrade);
    const milestones = new MilestoneSystem(gameState);
    const prestige = new PrestigeSystem(gameState);
    const offline = new OfflineProgressSystem(gameState, production, milestones);
    const save = new SaveSystem(gameState);

    // Initial state check
    let state = gameState.getState();
    assert(state.aether === 0, 'Initial Aether is 0');
    assert(state.buildings['aether_condenser'] === 0, 'Initial Condensers is 0');

    // Channel core manually
    const gained = resource.channelCore();
    assert(gained >= 1, `Manual channel yielded ${gained} Aether`);
    assert(state.aether >= 1, 'Current Aether updated after click');
    assert(state.manualClicks === 1, 'Manual click count incremented');

    // Check First Spark milestone
    milestones.checkMilestones();
    assert(state.unlockedMilestones.includes('first_spark'), 'First Spark milestone achieved after click');

    // Give enough Aether to buy first Condenser
    state.aether = 100;
    const boughtCondenser = building.buy('aether_condenser', 1);
    assert(boughtCondenser, 'Bought 1 Aether Condenser');
    assert(state.buildings['aether_condenser'] === 1, 'Condenser count is 1');
    assert(state.aether < 100, 'Aether deducted');

    // Check production after 1 condenser
    const prodAfterCondenser = production.calculate();
    assert(prodAfterCondenser.totalCps > 0, `CpS is > 0 (${prodAfterCondenser.totalCps})`);

    // Advance 5 seconds
    const aetherBeforeTick = state.aether;
    resource.tick(5.0);
    assert(state.aether > aetherBeforeTick, `Aether grew over 5 seconds (from ${aetherBeforeTick} to ${state.aether})`);
    assert(!isNaN(state.aether), 'Aether is not NaN');

    console.log('\n--- 4. Testing Upgrades & Synergies ---');
    // Check Lens Crystallization upgrade (Double Condenser output)
    state.aether = 500;
    const upgDef = UPGRADES_DATA.find(u => u.id === 'lens_crystallization');
    assert(upgrade.isUnlocked(upgDef), 'Lens Crystallization is unlocked since condenser >= 1');

    const cpsBeforeUpgrade = production.calculate().totalCps;
    const boughtUpg = upgrade.buy('lens_crystallization');
    assert(boughtUpg, 'Purchased Lens Crystallization');
    assert(upgrade.isPurchased('lens_crystallization'), 'Marked as purchased');

    const cpsAfterUpgrade = production.calculate().totalCps;
    assert(cpsAfterUpgrade > cpsBeforeUpgrade, `CpS increased after upgrade (${cpsBeforeUpgrade} -> ${cpsAfterUpgrade})`);

    console.log('\n--- 5. Testing Research Tree ---');
    state.aether = 50000;
    // Research ae_1 (Fluidic Dynamics) requires nothing
    assert(research.canResearch('ae_1'), 'ae_1 can be researched');
    // Research ae_2 requires ae_1
    assert(!research.canResearch('ae_2'), 'ae_2 cannot be researched yet without ae_1');

    const unlockedAe1 = research.unlock('ae_1');
    assert(unlockedAe1, 'Unlocked ae_1 research');
    assert(research.isResearched('ae_1'), 'ae_1 is now researched');
    assert(research.canResearch('ae_2'), 'ae_2 is now unlocked for research');

    console.log('\n--- 6. Testing Automation ---');
    // Unlock Conduit Drone upgrade
    state.upgrades.push('conduit_drone');
    state.automation.droneEnabled = true;
    const clicksBefore = state.manualClicks;
    // Tick automation by 4 seconds (interval is 3s)
    automation.tick(4.0);
    assert(state.manualClicks > clicksBefore, 'Conduit Drone triggered auto-channeling');

    console.log('\n--- 7. Testing Offline Progress ---');
    // Set last tick to 1 hour (3600 seconds) ago
    state.lastTick = Date.now() - (3600 * 1000);
    const offlineReport = offline.checkOfflineProgress();
    assert(offlineReport !== null, 'Offline report generated');
    assert(offlineReport.aetherEarned > 0, `Offline Aether generated: ${offlineReport.aetherEarned}`);
    assert(offlineReport.efficiency >= 0.5, `Offline efficiency is at least 50% (${offlineReport.efficiency})`);

    console.log('\n--- 8. Testing Save & Migration ---');
    const saveSuccess = save.save();
    assert(saveSuccess, 'Saved game state to localStorage');
    const rawSaved = localStorage.getItem(CONFIG.SAVE_KEY);
    assert(rawSaved !== null && rawSaved.length > 50, 'LocalStorage contains valid serialized state');

    // Test Export / Import
    const exportedStr = save.exportSave();
    assert(typeof exportedStr === 'string' && exportedStr.length > 20, 'Exported valid base64 save string');

    // Wipe state and restore from import
    gameState.hardReset();
    assert(gameState.getState().aether === 0, 'State wiped before import');
    const importSuccess = save.importSave(exportedStr);
    assert(importSuccess, 'Successfully imported save string');
    assert(gameState.getState().buildings['aether_condenser'] === 1, 'Restored building count from save');
    assert(gameState.getState().upgrades.includes('lens_crystallization'), 'Restored upgrades from save');

    console.log('\n--- 9. Testing Prestige / Ascension ---');
    // Set lifetime aether to 10M
    state = gameState.getState();
    state.lifetimeAether = CONFIG.ASCENSION_UNLOCK_AETHER;
    assert(prestige.isUnlocked(), 'Ascension is unlocked at 10M lifetime Aether');
    const pendingShards = prestige.calculatePendingShards();
    assert(pendingShards >= 10, `Pending shards at 10M is at least 10 (got ${pendingShards})`);

    // Perform Ascension
    const ascended = prestige.ascend();
    assert(ascended, 'Ascension ritual executed successfully');
    state = gameState.getState();
    assert(state.ascensionCount === 1, 'Ascension count is 1');
    assert(state.astralShards >= 10, `Astral Shards received (${state.astralShards})`);
    assert(state.buildings['aether_condenser'] === 0, 'Buildings reset after Ascension');
    assert(state.upgrades.length === 0, 'Upgrades reset after Ascension');

    // Buy Ascension Perk
    assert(state.astralShards >= 1, 'Have shards to purchase Astral Memory');
    const boughtPerk = prestige.buyPerk('astral_memory');
    assert(boughtPerk, 'Purchased Astral Memory perk rank 1');
    assert(state.ascensionPerks['astral_memory'] === 1, 'Perk rank is 1');

    console.log(`\n================================`);
    console.log(`ALL TESTS PASSED: ${testsPassed} passed, ${testsFailed} failed.`);
    console.log(`================================`);
}

runTestSuite().catch(err => {
    console.error('Test Suite Failed:', err);
    process.exit(1);
});
