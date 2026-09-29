/**
 * Astral Foundry - Master UI Manager
 * Handles DOM rendering, dynamic view updates, tab switching,
 * tooltips, modals, and user interactions.
 */

import { BUILDINGS_DATA, UPGRADES_DATA, RESEARCH_BRANCHES, MILESTONES_DATA, ASCENSION_PERKS, CONFIG } from '../config.js';
import { formatNumber, formatRate, formatMultiplier, formatTime, setNotationMode, getNotationMode } from '../utils/formatters.js';
import { audio } from '../utils/audio.js';

export class UIManager {
    constructor({
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
    }) {
        this.gameState = gameState;
        this.resourceSystem = resourceSystem;
        this.buildingSystem = buildingSystem;
        this.upgradeSystem = upgradeSystem;
        this.researchSystem = researchSystem;
        this.automationSystem = automationSystem;
        this.milestoneSystem = milestoneSystem;
        this.prestigeSystem = prestigeSystem;
        this.saveSystem = saveSystem;
        this.offlineSystem = offlineSystem;
        this.foundryModel = foundryModel;
        this.foundryCanvas = foundryCanvas;
        this.floatingText = floatingText;
        this.notifications = notifications;

        this.currentTab = 'overview';
        this.buyAmount = 1; // 1, 10, 25, 'max'
        this.upgradeFilter = 'all';

        this.dom = {};
        this.cacheDOM();
        this.bindEvents();
        this.renderAll();
    }

    cacheDOM() {
        // Navigation buttons
        this.dom.navBtns = document.querySelectorAll('.nav-item');
        this.dom.tabPanels = document.querySelectorAll('.tab-panel');

        // Right Resource Panel
        this.dom.aetherDisplay = document.getElementById('res-aether-amount');
        this.dom.cpsDisplay = document.getElementById('res-cps-rate');
        this.dom.multDisplay = document.getElementById('res-global-multiplier');
        this.dom.clickPowerDisplay = document.getElementById('res-click-power');
        this.dom.shardsSection = document.getElementById('res-shards-section');
        this.dom.shardsDisplay = document.getElementById('res-shards-amount');
        this.dom.milestoneProgressFill = document.getElementById('milestone-progress-fill');
        this.dom.milestoneProgressText = document.getElementById('milestone-progress-text');
        this.dom.activeSurgeBanner = document.getElementById('active-surge-banner');

        // Center Viewport
        this.dom.coreChannelBtn = document.getElementById('astral-core-target');
        this.dom.channelActionBtn = document.getElementById('channel-action-btn');
        this.dom.foundryCanvas = document.getElementById('foundry-canvas');

        // Bottom Bar
        this.dom.quickBuildingsBar = document.getElementById('quick-buildings-bar');
        this.dom.quickUpgradeSlot = document.getElementById('quick-upgrade-slot');
        this.dom.buyAmountBtns = document.querySelectorAll('.buy-amount-btn');

        // Tab containers
        this.dom.buildingsList = document.getElementById('buildings-list-container');
        this.dom.upgradesContainer = document.getElementById('upgrades-container');
        this.dom.researchContainer = document.getElementById('research-tree-container');
        this.dom.automationContainer = document.getElementById('automation-container');
        this.dom.milestonesList = document.getElementById('milestones-list-container');
        this.dom.loreCodex = document.getElementById('lore-codex-container');
        this.dom.statsContainer = document.getElementById('stats-table-container');
        this.dom.ascensionContainer = document.getElementById('ascension-view-container');
        this.dom.productionOverview = document.getElementById('production-overview-container');

        // Modals
        this.dom.offlineModal = document.getElementById('offline-modal');
        this.dom.settingsModal = document.getElementById('settings-modal');
        this.dom.ascensionModal = document.getElementById('ascension-modal');

        // Settings inputs
        this.dom.btnSave = document.getElementById('btn-manual-save');
        this.dom.btnSettings = document.getElementById('btn-open-settings');
        this.dom.btnMute = document.getElementById('btn-toggle-sound');
    }

    bindEvents() {
        // Tab Navigation
        this.dom.navBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const tab = btn.dataset.tab;
                this.switchTab(tab);
            });
        });

        // Buy Amount Toggles (1, 10, 25, max)
        this.dom.buyAmountBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                this.dom.buyAmountBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const val = btn.dataset.amount;
                this.buyAmount = val === 'max' ? 'max' : parseInt(val, 10);
                this.updateBuildingsTab();
                this.updateQuickBar();
            });
        });

        // Core Manual Channeling Click
        if (this.dom.coreChannelBtn) {
            this.dom.coreChannelBtn.addEventListener('click', (e) => this.handleCoreClick(e));
        }
        if (this.dom.channelActionBtn) {
            this.dom.channelActionBtn.addEventListener('click', (e) => this.handleCoreClick(e));
        }

        // Sound Toggle
        if (this.dom.btnMute) {
            this.dom.btnMute.addEventListener('click', () => {
                const state = this.gameState.getState();
                state.settings.muted = !state.settings.muted;
                audio.setMuted(state.settings.muted);
                this.updateSoundButton();
            });
        }

        // Manual Save
        if (this.dom.btnSave) {
            this.dom.btnSave.addEventListener('click', () => {
                this.saveSystem.save();
                this.notifications.notifySave();
            });
        }

        // Settings Modal Open
        if (this.dom.btnSettings) {
            this.dom.btnSettings.addEventListener('click', () => this.openSettingsModal());
        }

        // Event Bus Subscriptions
        this.gameState.on('building:buy', () => {
            this.foundryModel.updateProgression();
            this.updateBuildingsTab();
            this.updateQuickBar();
            this.updateUpgradesTab();
        });

        this.gameState.on('upgrade:buy', () => {
            this.foundryModel.updateProgression();
            this.updateUpgradesTab();
            this.updateQuickBar();
            this.updateBuildingsTab();
        });

        this.gameState.on('research:unlock', (data) => {
            this.notifications.notifyResearch(data.node);
            this.updateResearchTab();
            this.updateUpgradesTab();
            this.updateBuildingsTab();
        });

        this.gameState.on('milestone:unlock', (milestone) => {
            this.notifications.notifyMilestone(milestone);
            this.updateMilestonesTab();
            this.updateLoreTab();
        });

        this.gameState.on('surge:start', (surge) => {
            this.notifications.notifySurge(surge.name, surge.multiplier);
            if (this.foundryCanvas) this.foundryCanvas.surgeActive = true;
            if (this.foundryModel && this.foundryModel.setSurge) this.foundryModel.setSurge(true);
        });

        this.gameState.on('surge:end', () => {
            if (this.foundryCanvas) this.foundryCanvas.surgeActive = false;
            if (this.foundryModel && this.foundryModel.setSurge) this.foundryModel.setSurge(false);
        });

        this.gameState.on('ascension', () => {
            this.foundryModel.updateProgression();
            this.renderAll();
            this.switchTab('overview');
        });
    }

    handleCoreClick(e) {
        const gained = this.resourceSystem.channelCore();
        this.foundryModel.pulseCore();

        // Canvas burst particles
        if (this.foundryCanvas) {
            const rect = this.dom.coreChannelBtn.getBoundingClientRect();
            const canvasRect = this.dom.foundryCanvas.getBoundingClientRect();
            const cx = (rect.left + rect.width / 2) - canvasRect.left;
            const cy = (rect.top + rect.height / 2) - canvasRect.top;
            this.foundryCanvas.spawnBurst(cx, cy, 18, !!this.gameState.getState().activeSurge);
        }

        // Floating number
        const clientX = e ? e.clientX : window.innerWidth / 2;
        const clientY = e ? e.clientY : window.innerHeight / 2;
        this.floatingText.spawn(clientX, clientY, gained, 'aether');
        this.bumpResourceValue();

        this.updateResourcePanel();
    }

    /** Restart the counter's pop animation after manual channels. */
    bumpResourceValue() {
        const el = this.dom.aetherDisplay;
        if (!el) return;
        el.classList.remove('bump');
        void el.offsetWidth; // force reflow so the animation replays
        el.classList.add('bump');
    }

    switchTab(tabId) {
        this.currentTab = tabId;
        this.gameState.getState().activeTab = tabId;

        this.dom.navBtns.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabId);
        });

        this.dom.tabPanels.forEach(panel => {
            panel.classList.toggle('active', panel.id === `tab-${tabId}`);
        });

        // Refresh tab-specific views
        if (tabId === 'buildings') this.updateBuildingsTab();
        if (tabId === 'production') this.updateProductionTab();
        if (tabId === 'research') this.updateResearchTab();
        if (tabId === 'upgrades') this.updateUpgradesTab();
        if (tabId === 'automation') this.updateAutomationTab();
        if (tabId === 'archive') {
            this.updateMilestonesTab();
            this.updateLoreTab();
            this.updateStatsTab();
        }
        if (tabId === 'ascension') this.updateAscensionTab();
    }

    renderAll() {
        this.updateResourcePanel();
        this.updateBuildingsTab();
        this.updateProductionTab();
        this.updateUpgradesTab();
        this.updateResearchTab();
        this.updateAutomationTab();
        this.updateMilestonesTab();
        this.updateLoreTab();
        this.updateStatsTab();
        this.updateAscensionTab();
        this.updateQuickBar();
        this.updateSoundButton();
        this.foundryModel.updateProgression();
    }

    updateSoundButton() {
        const state = this.gameState.getState();
        if (this.dom.btnMute) {
            // The speaker glyph is inline SVG; the .muted class swaps waves for a slash.
            this.dom.btnMute.classList.toggle('muted', !!state.settings.muted);
            this.dom.btnMute.title = state.settings.muted ? 'Unmute Sound' : 'Mute Sound';
            this.dom.btnMute.setAttribute('aria-label', state.settings.muted ? 'Unmute sound' : 'Mute sound');
        }
    }

    /**
     * Fast frame tick update (resource counts, progress bars, rates)
     */
    updateTick() {
        this.updateResourcePanel();

        // Update active tab lightweight elements
        if (this.currentTab === 'production') {
            this.updateProductionTab();
        } else if (this.currentTab === 'buildings') {
            this.updateBuildingAffordability();
        } else if (this.currentTab === 'automation') {
            this.updateAutomationTimers();
        } else if (this.currentTab === 'ascension') {
            this.updateAscensionSummary();
        }

        this.updateQuickBarAffordability();
    }

    /**
     * Update Right Resource Panel
     */
    updateResourcePanel() {
        const state = this.gameState.getState();

        if (this.dom.aetherDisplay) {
            this.dom.aetherDisplay.textContent = formatNumber(state.aether);
        }

        if (this.dom.cpsDisplay) {
            this.dom.cpsDisplay.textContent = formatRate(state.lastCalculatedCps);
        }

        if (this.dom.multDisplay) {
            // Global multiplier
            const prod = this.resourceSystem.productionSystem.calculate();
            this.dom.multDisplay.textContent = formatMultiplier(prod.globalMultiplier);
        }

        if (this.dom.clickPowerDisplay) {
            this.dom.clickPowerDisplay.textContent = `+${formatNumber(state.lastCalculatedClickPower)} / click`;
        }

        // Shards display
        if (this.dom.shardsSection) {
            const isUnlocked = this.prestigeSystem.isUnlocked();
            this.dom.shardsSection.style.display = isUnlocked ? 'block' : 'none';
            if (isUnlocked && this.dom.shardsDisplay) {
                this.dom.shardsDisplay.textContent = formatNumber(state.astralShards);
            }
        }

        // Active surge banner
        if (this.dom.activeSurgeBanner) {
            if (state.activeSurge && state.activeSurge.remainingSeconds > 0) {
                this.dom.activeSurgeBanner.style.display = 'flex';
                this.dom.activeSurgeBanner.innerHTML = `
                    <span class="surge-icon"><svg width="13" height="13" viewBox="0 0 16 16" aria-hidden="true"><path d="M9.2 1.2 3.4 9h3.4l-.8 5.8L12.6 6.6H9l.2-5.4Z" fill="currentColor" stroke="rgba(255,255,255,.55)" stroke-width=".7" stroke-linejoin="round"/></svg></span>
                    <span class="surge-title">${state.activeSurge.name}:</span>
                    <span class="surge-mult">${state.activeSurge.multiplier}x Production</span>
                    <span class="surge-time">(${state.activeSurge.remainingSeconds.toFixed(1)}s)</span>
                `;
            } else {
                this.dom.activeSurgeBanner.style.display = 'none';
            }
        }

        // Milestone Progress Bar
        const nextMilestone = this.milestoneSystem.getNextMilestone();
        if (nextMilestone) {
            if (this.dom.milestoneProgressText) {
                this.dom.milestoneProgressText.textContent = `Next: ${nextMilestone.name}`;
            }
            if (this.dom.milestoneProgressFill) {
                // Approximate progress percentage
                let pct = 0;
                if (nextMilestone.id === 'first_spark') {
                    pct = Math.min(100, (state.lifetimeAether / 1) * 100);
                } else if (nextMilestone.id === 'industrial_awakening') {
                    pct = Math.min(100, (state.lastCalculatedCps / 1000) * 100);
                } else if (nextMilestone.id === 'ascendant_horizon') {
                    pct = Math.min(100, (state.lifetimeAether / CONFIG.ASCENSION_UNLOCK_AETHER) * 100);
                } else {
                    pct = (state.unlockedMilestones.length / MILESTONES_DATA.length) * 100;
                }
                this.dom.milestoneProgressFill.style.width = `${Math.min(100, Math.max(5, pct))}%`;
            }
        } else {
            if (this.dom.milestoneProgressText) {
                this.dom.milestoneProgressText.textContent = 'All Milestones Attained!';
            }
            if (this.dom.milestoneProgressFill) {
                this.dom.milestoneProgressFill.style.width = '100%';
            }
        }
    }

    /**
     * Render / Update Buildings Tab
     */
    updateBuildingsTab() {
        if (!this.dom.buildingsList) return;
        const state = this.gameState.getState();
        const prod = this.resourceSystem.productionSystem.calculate();

        let html = '';
        BUILDINGS_DATA.forEach(b => {
            const count = state.buildings[b.id] || 0;
            const { countToBuy, totalCost } = this.buildingSystem.calculateCost(b.id, this.buyAmount);
            const canAfford = countToBuy > 0 && state.aether >= totalCost;
            const rateData = prod.buildingRates[b.id] || { total: 0 };

            html += `
                <div class="building-card ${count > 0 ? 'owned' : 'unowned'}" data-building-id="${b.id}">
                    <div class="building-header">
                        <div class="building-icon-wrap">
                            <span class="building-icon">${b.icon}</span>
                            <span class="building-count-badge">x${count}</span>
                        </div>
                        <div class="building-info">
                            <div class="building-title-row">
                                <h3 class="building-name">${b.name}</h3>
                                <span class="building-rate-badge">${formatRate(rateData.total)}</span>
                            </div>
                            <p class="building-desc">${b.desc}</p>
                        </div>
                    </div>
                    <div class="building-footer">
                        <div class="building-cost-label">
                            <span class="cost-prefix">Cost for +${countToBuy}:</span>
                            <span class="cost-value ${canAfford ? 'affordable' : 'unaffordable'}">${formatNumber(totalCost)} Aether</span>
                        </div>
                        <button class="btn-primary buy-building-btn" data-building-id="${b.id}" ${canAfford ? '' : 'disabled'}>
                            Construct +${countToBuy}
                        </button>
                    </div>
                </div>
            `;
        });

        this.dom.buildingsList.innerHTML = html;

        // Bind clicks
        this.dom.buildingsList.querySelectorAll('.buy-building-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const bId = btn.dataset.buildingId;
                this.buildingSystem.buy(bId, this.buyAmount);
                this.updateBuildingsTab();
                this.updateQuickBar();
            });
        });
    }

    /**
     * Fast check for building affordability in current view
     */
    updateBuildingAffordability() {
        if (!this.dom.buildingsList) return;
        const state = this.gameState.getState();

        this.dom.buildingsList.querySelectorAll('.building-card').forEach(card => {
            const bId = card.dataset.buildingId;
            const btn = card.querySelector('.buy-building-btn');
            const costVal = card.querySelector('.cost-value');
            if (bId && btn && costVal) {
                const { countToBuy, totalCost } = this.buildingSystem.calculateCost(bId, this.buyAmount);
                const canAfford = countToBuy > 0 && state.aether >= totalCost;
                btn.disabled = !canAfford;
                btn.textContent = `Construct +${countToBuy}`;
                costVal.textContent = `${formatNumber(totalCost)} Aether`;
                costVal.className = `cost-value ${canAfford ? 'affordable' : 'unaffordable'}`;
            }
        });
    }

    /**
     * Render / Update Production Tab
     */
    updateProductionTab() {
        if (!this.dom.productionOverview) return;
        const state = this.gameState.getState();
        const prod = this.resourceSystem.productionSystem.calculate();

        let breakdownHtml = `
            <div class="production-summary-card">
                <div class="prod-headline">
                    <div class="headline-label">Foundry Output Capacity</div>
                    <div class="headline-rate">${formatRate(prod.totalCps)}</div>
                </div>
                <div class="prod-subline">
                    Manual Channel: <strong>${formatNumber(prod.clickPower)} Aether/pulse</strong>
                </div>
            </div>

            <h3 class="section-title">Multiplier Matrix</h3>
            <div class="multiplier-grid">
                <div class="mult-item">
                    <span class="mult-label">Upgrades</span>
                    <span class="mult-val">${formatMultiplier(prod.breakdown.upgradesMult)}</span>
                </div>
                <div class="mult-item">
                    <span class="mult-label">Research</span>
                    <span class="mult-val">${formatMultiplier(prod.breakdown.researchMult)}</span>
                </div>
                <div class="mult-item">
                    <span class="mult-label">Milestones</span>
                    <span class="mult-val">${formatMultiplier(prod.breakdown.milestonesMult)}</span>
                </div>
                <div class="mult-item">
                    <span class="mult-label">Astral Shards</span>
                    <span class="mult-val">${formatMultiplier(prod.breakdown.shardsMult)}</span>
                </div>
                <div class="mult-item">
                    <span class="mult-label">Ascension Perks</span>
                    <span class="mult-val">${formatMultiplier(prod.breakdown.perksMult)}</span>
                </div>
                <div class="mult-item">
                    <span class="mult-label">Astral Surge</span>
                    <span class="mult-val">${formatMultiplier(prod.breakdown.surgeMult)}</span>
                </div>
            </div>

            <h3 class="section-title">Building Output Contribution</h3>
            <div class="building-rates-table">
        `;

        BUILDINGS_DATA.forEach(b => {
            const data = prod.buildingRates[b.id] || { count: 0, total: 0 };
            const percent = prod.totalCps > 0 ? ((data.total / prod.totalCps) * 100).toFixed(1) : '0.0';

            breakdownHtml += `
                <div class="rate-row">
                    <div class="rate-col name-col">
                        <span class="icon">${b.icon}</span>
                        <span>${b.name} (${data.count})</span>
                    </div>
                    <div class="rate-col value-col">${formatRate(data.total)}</div>
                    <div class="rate-col percent-col">
                        <div class="percent-bar-bg">
                            <div class="percent-bar-fill" style="width: ${percent}%;"></div>
                        </div>
                        <span class="percent-text">${percent}%</span>
                    </div>
                </div>
            `;
        });

        breakdownHtml += `</div>`;
        this.dom.productionOverview.innerHTML = breakdownHtml;
    }

    /**
     * Render / Update Upgrades Tab
     */
    updateUpgradesTab() {
        if (!this.dom.upgradesContainer) return;
        const state = this.gameState.getState();

        let html = `
            <div class="upgrade-category-tabs">
                <button class="filter-btn ${this.upgradeFilter === 'all' ? 'active' : ''}" data-filter="all">All</button>
                <button class="filter-btn ${this.upgradeFilter === 'production' ? 'active' : ''}" data-filter="production">Production</button>
                <button class="filter-btn ${this.upgradeFilter === 'efficiency' ? 'active' : ''}" data-filter="efficiency">Efficiency</button>
                <button class="filter-btn ${this.upgradeFilter === 'automation' ? 'active' : ''}" data-filter="automation">Automation</button>
                <button class="filter-btn ${this.upgradeFilter === 'visual' ? 'active' : ''}" data-filter="visual">Visual</button>
            </div>
            <div class="upgrades-grid">
        `;

        const filtered = UPGRADES_DATA.filter(u => {
            if (this.upgradeFilter !== 'all' && u.category !== this.upgradeFilter) return false;
            return this.upgradeSystem.isUnlocked(u);
        });

        if (filtered.length === 0) {
            html += `<div class="empty-state">No discoveries currently available in this discipline. Expand your foundry to unlock new schematics.</div>`;
        } else {
            filtered.forEach(u => {
                const purchased = this.upgradeSystem.isPurchased(u.id);
                const affordable = state.aether >= u.cost;

                html += `
                    <div class="upgrade-card ${purchased ? 'purchased' : (affordable ? 'affordable' : 'locked')}">
                        <div class="upgrade-icon">${u.icon}</div>
                        <div class="upgrade-details">
                            <div class="upgrade-name">${u.name}</div>
                            <div class="upgrade-desc">${u.desc}</div>
                            <div class="upgrade-footer">
                                ${purchased ? `
                                    <span class="badge-purchased">✓ Synchronized</span>
                                ` : `
                                    <span class="cost ${affordable ? 'can-afford' : 'cant-afford'}">${formatNumber(u.cost)} Aether</span>
                                    <button class="btn-upgrade-buy" data-upgrade-id="${u.id}" ${affordable ? '' : 'disabled'}>Forge</button>
                                `}
                            </div>
                        </div>
                    </div>
                `;
            });
        }

        html += `</div>`;
        this.dom.upgradesContainer.innerHTML = html;

        // Bind filter clicks
        this.dom.upgradesContainer.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.upgradeFilter = btn.dataset.filter;
                this.updateUpgradesTab();
            });
        });

        // Bind buy clicks
        this.dom.upgradesContainer.querySelectorAll('.btn-upgrade-buy').forEach(btn => {
            btn.addEventListener('click', () => {
                const uId = btn.dataset.upgradeId;
                this.upgradeSystem.buy(uId);
            });
        });
    }

    /**
     * Render / Update Research Tree Tab
     */
    updateResearchTab() {
        if (!this.dom.researchContainer) return;
        const state = this.gameState.getState();

        let html = `<div class="research-tree-branches">`;

        RESEARCH_BRANCHES.forEach(branch => {
            html += `
                <div class="research-branch" data-branch="${branch.id}">
                    <div class="branch-header">
                        <span class="branch-icon">${branch.icon}</span>
                        <div class="branch-meta">
                            <h3 class="branch-name">${branch.name}</h3>
                            <p class="branch-desc">${branch.desc}</p>
                        </div>
                    </div>
                    <div class="branch-nodes-list">
            `;

            branch.nodes.forEach((node, idx) => {
                const researched = this.researchSystem.isResearched(node.id);
                const canUnlock = this.researchSystem.canResearch(node.id);
                const cost = this.researchSystem.getEffectiveCost(node);
                const affordable = state.aether >= cost;

                let nodeStatusClass = 'locked';
                if (researched) nodeStatusClass = 'researched';
                else if (canUnlock && affordable) nodeStatusClass = 'available';
                else if (canUnlock) nodeStatusClass = 'prereq-met';

                html += `
                    <div class="research-node-card ${nodeStatusClass}" data-node-id="${node.id}">
                        <div class="node-icon-box">${node.icon}</div>
                        <div class="node-content">
                            <div class="node-title">${node.name}</div>
                            <div class="node-desc">${node.desc}</div>
                            <div class="node-actions">
                                ${researched ? `
                                    <span class="node-badge-researched">✦ Transcribed</span>
                                ` : `
                                    <span class="node-cost ${affordable ? 'affordable' : 'unaffordable'}">${formatNumber(cost)} Aether</span>
                                    <button class="btn-research-unlock" data-node-id="${node.id}" ${canUnlock && affordable ? '' : 'disabled'}>
                                        ${canUnlock ? 'Research' : 'Locked'}
                                    </button>
                                `}
                            </div>
                        </div>
                    </div>
                `;
            });

            html += `</div></div>`;
        });

        html += `</div>`;
        this.dom.researchContainer.innerHTML = html;

        // Bind research unlock clicks
        this.dom.researchContainer.querySelectorAll('.btn-research-unlock').forEach(btn => {
            btn.addEventListener('click', () => {
                const nodeId = btn.dataset.nodeId;
                this.researchSystem.unlock(nodeId);
            });
        });
    }

    /**
     * Render / Update Automation Tab
     */
    updateAutomationTab() {
        if (!this.dom.automationContainer) return;
        const state = this.gameState.getState();
        const auto = state.automation;

        const hasDrone = state.upgrades.includes('conduit_drone');
        const hasMatrix = state.upgrades.includes('construct_matrix');
        const hasSynthesizer = state.upgrades.includes('schematic_synthesizer');
        const hasGovernor = state.upgrades.includes('chronal_governor');

        let html = `
            <div class="automation-grid">
                <!-- Conduit Drone Card -->
                <div class="automation-card ${hasDrone ? 'unlocked' : 'locked'}">
                    <div class="auto-header">
                        <span class="auto-icon">🤖</span>
                        <div class="auto-meta">
                            <h4>Conduit Drone</h4>
                            <p>Pulses the Aether Core automatically at regular intervals.</p>
                        </div>
                    </div>
                    ${hasDrone ? `
                        <div class="auto-controls">
                            <label class="switch-toggle">
                                <input type="checkbox" id="toggle-drone" ${auto.droneEnabled ? 'checked' : ''}>
                                <span class="slider"></span>
                            </label>
                            <span class="status-text">${auto.droneEnabled ? 'Active (Pulsing every 3s)' : 'Inactive'}</span>
                        </div>
                    ` : `
                        <div class="auto-lock-msg">Requires "Conduit Drone" upgrade.</div>
                    `}
                </div>

                <!-- Construct Matrix Card -->
                <div class="automation-card ${hasMatrix ? 'unlocked' : 'locked'}">
                    <div class="auto-header">
                        <span class="auto-icon">🏗️</span>
                        <div class="auto-meta">
                            <h4>Construct Matrix</h4>
                            <p>Automatically acquires buildings when sufficient Aether is available.</p>
                        </div>
                    </div>
                    ${hasMatrix ? `
                        <div class="auto-controls">
                            <label class="switch-toggle">
                                <input type="checkbox" id="toggle-matrix" ${auto.autoBuildEnabled ? 'checked' : ''}>
                                <span class="slider"></span>
                            </label>
                            <span class="status-text">${auto.autoBuildEnabled ? 'Active' : 'Inactive'}</span>
                        </div>
                        <div class="auto-settings-row">
                            <label for="select-build-target">Priority Target:</label>
                            <select id="select-build-target" class="foundry-select">
                                <option value="cheapest" ${auto.autoBuildTarget === 'cheapest' ? 'selected' : ''}>Cheapest Affordable</option>
                                ${BUILDINGS_DATA.map(b => `<option value="${b.id}" ${auto.autoBuildTarget === b.id ? 'selected' : ''}>${b.name}</option>`).join('')}
                            </select>
                        </div>
                    ` : `
                        <div class="auto-lock-msg">Requires "Construct Matrix" upgrade.</div>
                    `}
                </div>

                <!-- Schematic Synthesizer Card -->
                <div class="automation-card ${hasSynthesizer ? 'unlocked' : 'locked'}">
                    <div class="auto-header">
                        <span class="auto-icon">📜</span>
                        <div class="auto-meta">
                            <h4>Schematic Synthesizer</h4>
                            <p>Automatically purchases unlocked upgrades from the cheapest available.</p>
                        </div>
                    </div>
                    ${hasSynthesizer ? `
                        <div class="auto-controls">
                            <label class="switch-toggle">
                                <input type="checkbox" id="toggle-synth" ${auto.autoUpgradeEnabled ? 'checked' : ''}>
                                <span class="slider"></span>
                            </label>
                            <span class="status-text">${auto.autoUpgradeEnabled ? 'Active' : 'Inactive'}</span>
                        </div>
                    ` : `
                        <div class="auto-lock-msg">Requires "Schematic Synthesizer" upgrade.</div>
                    `}
                </div>

                <!-- Chronal Governor Card -->
                <div class="automation-card ${hasGovernor ? 'unlocked' : 'locked'}">
                    <div class="auto-header">
                        <span class="auto-icon">⏱️</span>
                        <div class="auto-meta">
                            <h4>Chronal Governor</h4>
                            <p>Accelerates all autonomous subroutines by 100%.</p>
                        </div>
                    </div>
                    ${hasGovernor ? `
                        <div class="governor-active-badge">✓ Temporal Acceleration Active (2.0x Loop Rate)</div>
                    ` : `
                        <div class="auto-lock-msg">Requires "Chronal Governor" upgrade.</div>
                    `}
                </div>
            </div>
        `;

        this.dom.automationContainer.innerHTML = html;

        // Bind automation toggle events
        const droneToggle = document.getElementById('toggle-drone');
        if (droneToggle) {
            droneToggle.addEventListener('change', (e) => {
                auto.droneEnabled = e.target.checked;
            });
        }

        const matrixToggle = document.getElementById('toggle-matrix');
        if (matrixToggle) {
            matrixToggle.addEventListener('change', (e) => {
                auto.autoBuildEnabled = e.target.checked;
            });
        }

        const targetSelect = document.getElementById('select-build-target');
        if (targetSelect) {
            targetSelect.addEventListener('change', (e) => {
                auto.autoBuildTarget = e.target.value;
            });
        }

        const synthToggle = document.getElementById('toggle-synth');
        if (synthToggle) {
            synthToggle.addEventListener('change', (e) => {
                auto.autoUpgradeEnabled = e.target.checked;
            });
        }
    }

    updateAutomationTimers() {
        // Reserved for smooth animation bars if needed
    }

    /**
     * Render / Update Milestones Tab
     */
    updateMilestonesTab() {
        if (!this.dom.milestonesList) return;
        const state = this.gameState.getState();

        let html = '';
        MILESTONES_DATA.forEach(m => {
            const completed = state.unlockedMilestones.includes(m.id);

            html += `
                <div class="milestone-card ${completed ? 'completed' : 'pending'}">
                    <div class="milestone-icon">${completed ? '🏆' : '🔒'}</div>
                    <div class="milestone-info">
                        <div class="milestone-title-row">
                            <span class="milestone-name">${m.name}</span>
                            <span class="milestone-status">${completed ? 'Accomplished' : 'Awaiting'}</span>
                        </div>
                        <p class="milestone-desc">${m.desc}</p>
                        <div class="milestone-reward"><strong>Reward:</strong> ${m.rewardText}</div>
                    </div>
                </div>
            `;
        });

        this.dom.milestonesList.innerHTML = html;
    }

    /**
     * Render / Update Lore Codex Tab
     */
    updateLoreTab() {
        if (!this.dom.loreCodex) return;
        const state = this.gameState.getState();

        let html = `<div class="lore-entries">`;

        MILESTONES_DATA.forEach(m => {
            const completed = state.unlockedMilestones.includes(m.id);
            if (completed) {
                html += `
                    <div class="lore-entry">
                        <div class="lore-entry-header">
                            <span class="entry-marker">✦</span>
                            <span class="entry-title">${m.name}</span>
                        </div>
                        <div class="lore-entry-body">"${m.lore}"</div>
                    </div>
                `;
            }
        });

        if (state.unlockedMilestones.length === 0) {
            html += `<div class="empty-state">The codex remains blank. Awakening the foundry will unveil the forgotten annals of the Astral Architects.</div>`;
        }

        html += `</div>`;
        this.dom.loreCodex.innerHTML = html;
    }

    /**
     * Render / Update Statistics Tab
     */
    updateStatsTab() {
        if (!this.dom.statsContainer) return;
        const state = this.gameState.getState();
        const totalBuildings = Object.values(state.buildings).reduce((a, b) => a + b, 0);

        let html = `
            <table class="foundry-stats-table">
                <tbody>
                    <tr><td>Time Spent Attuned:</td><td>${formatTime(state.timePlayed)}</td></tr>
                    <tr><td>Aether Current:</td><td>${formatNumber(state.aether)}</td></tr>
                    <tr><td>Aether Cycle Total:</td><td>${formatNumber(state.lifetimeAether)}</td></tr>
                    <tr><td>Aether All-Time Total:</td><td>${formatNumber(state.totalLifetimeAether)}</td></tr>
                    <tr><td>Manual Core Pulses:</td><td>${formatNumber(state.manualClicks, 0)}</td></tr>
                    <tr><td>Total Structures Raised:</td><td>${totalBuildings}</td></tr>
                    <tr><td>Schematics Synchronized:</td><td>${state.upgrades.length} / ${UPGRADES_DATA.length}</td></tr>
                    <tr><td>Theorems Transcribed:</td><td>${state.researchedNodes.length} / 15</td></tr>
                    <tr><td>Milestones Inscribed:</td><td>${state.unlockedMilestones.length} / ${MILESTONES_DATA.length}</td></tr>
                    <tr><td>Ascension Cycles:</td><td>${state.ascensionCount}</td></tr>
                    <tr><td>Astral Shards Available:</td><td>${formatNumber(state.astralShards)}</td></tr>
                    <tr><td>Astral Shards Harvested All-Time:</td><td>${formatNumber(state.totalAstralShards)}</td></tr>
                </tbody>
            </table>
        `;

        this.dom.statsContainer.innerHTML = html;
    }

    /**
     * Render / Update Ascension Tab
     */
    updateAscensionTab() {
        if (!this.dom.ascensionContainer) return;
        const state = this.gameState.getState();
        const isUnlocked = this.prestigeSystem.isUnlocked();
        const pendingShards = this.prestigeSystem.calculatePendingShards();

        let html = '';
        if (!isUnlocked) {
            const reqAether = CONFIG.ASCENSION_UNLOCK_AETHER;
            const pct = Math.min(100, (state.lifetimeAether / reqAether) * 100).toFixed(1);

            html = `
                <div class="ascension-locked-card">
                    <div class="lock-icon">🌌</div>
                    <h2>The Dimensional Anchor Holds Fast</h2>
                    <p>The Astral Foundry lacks the kinetic mass to breach the celestial veil. Reach <strong>${formatNumber(reqAether)} Lifetime Aether</strong> to prepare the Ascension ritual.</p>
                    <div class="anchor-progress-bar">
                        <div class="anchor-fill" style="width: ${pct}%;"></div>
                    </div>
                    <div class="anchor-progress-label">${formatNumber(state.lifetimeAether)} / ${formatNumber(reqAether)} (${pct}%)</div>
                </div>
            `;
        } else {
            html = `
                <div class="ascension-ritual-card">
                    <div class="ritual-header">
                        <div class="ritual-badge">ASCENSION READY</div>
                        <h2>Dissolve the Material Anchor</h2>
                        <p>Sacrifice your current structures and research to distill the foundry's essence into permanent <strong>Astral Shards</strong>.</p>
                    </div>

                    <div class="shards-summary-box">
                        <div class="summary-item">
                            <span class="label">Current Astral Shards:</span>
                            <span class="val">${formatNumber(state.astralShards)}</span>
                        </div>
                        <div class="summary-item highlight">
                            <span class="label">Shards Gained on Ascension:</span>
                            <span class="val">+${formatNumber(pendingShards)}</span>
                        </div>
                        <div class="summary-item">
                            <span class="label">Permanent Shard Bonus:</span>
                            <span class="val">+${(state.astralShards * 10).toFixed(0)}% CpS</span>
                        </div>
                    </div>

                    <div class="ritual-actions">
                        <button class="btn-primary btn-ascend" id="btn-initiate-ascension" ${pendingShards > 0 ? '' : 'disabled'}>
                            ✦ Initiate Ascension Ritual (+${formatNumber(pendingShards)} Shards) ✦
                        </button>
                    </div>
                </div>

                <h3 class="section-title">Celestial Ascension Perks</h3>
                <div class="perks-grid">
            `;

            ASCENSION_PERKS.forEach(perk => {
                const currentRank = state.ascensionPerks[perk.id] || 0;
                const isMax = currentRank >= perk.maxLevel;
                const cost = this.prestigeSystem.getPerkCost(perk.id);
                const canAfford = state.astralShards >= cost && !isMax;

                html += `
                    <div class="perk-card ${isMax ? 'maxed' : (canAfford ? 'affordable' : 'locked')}">
                        <div class="perk-icon">${perk.icon}</div>
                        <div class="perk-details">
                            <div class="perk-title-row">
                                <span class="perk-name">${perk.name}</span>
                                <span class="perk-rank">Rank ${currentRank}/${perk.maxLevel}</span>
                            </div>
                            <div class="perk-desc">${perk.desc}</div>
                            <div class="perk-footer">
                                ${isMax ? `
                                    <span class="badge-maxed">MAX LEVEL</span>
                                ` : `
                                    <span class="cost ${canAfford ? 'can-afford' : 'cant-afford'}">${formatNumber(cost)} Shards</span>
                                    <button class="btn-perk-buy" data-perk-id="${perk.id}" ${canAfford ? '' : 'disabled'}>Attune</button>
                                `}
                            </div>
                        </div>
                    </div>
                `;
            });

            html += `</div>`;
        }

        this.dom.ascensionContainer.innerHTML = html;

        // Bind Ascension button
        const ascendBtn = document.getElementById('btn-initiate-ascension');
        if (ascendBtn) {
            ascendBtn.addEventListener('click', () => this.openAscensionConfirmModal());
        }

        // Bind Perk buy buttons
        this.dom.ascensionContainer.querySelectorAll('.btn-perk-buy').forEach(btn => {
            btn.addEventListener('click', () => {
                const pId = btn.dataset.perkId;
                this.prestigeSystem.buyPerk(pId);
                this.updateAscensionTab();
            });
        });
    }

    updateAscensionSummary() {
        // Fast update if ascension screen is visible
        const ascendBtn = document.getElementById('btn-initiate-ascension');
        if (ascendBtn) {
            const pending = this.prestigeSystem.calculatePendingShards();
            ascendBtn.disabled = pending <= 0;
            ascendBtn.innerHTML = `✦ Initiate Ascension Ritual (+${formatNumber(pending)} Shards) ✦`;
        }
    }

    /**
     * Render / Update Bottom Quick-Bar
     */
    updateQuickBar() {
        if (!this.dom.quickBuildingsBar) return;
        const state = this.gameState.getState();

        // 1. Buildings Quick-Buy Chips
        let buildingsHtml = '';
        BUILDINGS_DATA.forEach(b => {
            const count = state.buildings[b.id] || 0;
            const { countToBuy, totalCost } = this.buildingSystem.calculateCost(b.id, this.buyAmount);
            const canAfford = countToBuy > 0 && state.aether >= totalCost;

            buildingsHtml += `
                <button class="quick-building-chip ${canAfford ? 'affordable' : 'unaffordable'}" data-building-id="${b.id}" title="${b.name}: ${formatNumber(totalCost)} Aether">
                    <span class="chip-icon">${b.icon}</span>
                    <span class="chip-info">
                        <span class="chip-name">${b.name.split(' ')[0]}</span>
                        <span class="chip-count">x${count}</span>
                    </span>
                    <span class="chip-cost">${formatNumber(totalCost)}</span>
                </button>
            `;
        });
        this.dom.quickBuildingsBar.innerHTML = buildingsHtml;

        // Bind quick buy clicks
        this.dom.quickBuildingsBar.querySelectorAll('.quick-building-chip').forEach(btn => {
            btn.addEventListener('click', () => {
                const bId = btn.dataset.buildingId;
                this.buildingSystem.buy(bId, this.buyAmount);
                this.updateQuickBar();
                this.updateBuildingsTab();
            });
        });

        // 2. Next Recommended Upgrade Slot
        if (this.dom.quickUpgradeSlot) {
            const nextUpg = UPGRADES_DATA.find(u => !this.upgradeSystem.isPurchased(u.id) && this.upgradeSystem.isUnlocked(u));
            if (nextUpg) {
                const canAfford = state.aether >= nextUpg.cost;
                this.dom.quickUpgradeSlot.innerHTML = `
                    <button class="quick-upgrade-chip ${canAfford ? 'affordable' : 'unaffordable'}" id="quick-buy-upgrade-btn" data-upgrade-id="${nextUpg.id}">
                        <span class="upg-icon">${nextUpg.icon}</span>
                        <div class="upg-meta">
                            <span class="upg-title">${nextUpg.name}</span>
                            <span class="upg-cost">${formatNumber(nextUpg.cost)} Aether</span>
                        </div>
                    </button>
                `;
                const btn = document.getElementById('quick-buy-upgrade-btn');
                if (btn) {
                    btn.addEventListener('click', () => {
                        this.upgradeSystem.buy(nextUpg.id);
                        this.updateQuickBar();
                        this.updateUpgradesTab();
                    });
                }
            } else {
                this.dom.quickUpgradeSlot.innerHTML = `<span class="no-upgrades">✦ Schematics Synchronized</span>`;
            }
        }
    }

    updateQuickBarAffordability() {
        if (!this.dom.quickBuildingsBar) return;
        const state = this.gameState.getState();

        this.dom.quickBuildingsBar.querySelectorAll('.quick-building-chip').forEach(chip => {
            const bId = chip.dataset.buildingId;
            if (bId) {
                const { countToBuy, totalCost } = this.buildingSystem.calculateCost(bId, this.buyAmount);
                const canAfford = countToBuy > 0 && state.aether >= totalCost;
                chip.classList.toggle('affordable', canAfford);
                chip.classList.toggle('unaffordable', !canAfford);
                const costSpan = chip.querySelector('.chip-cost');
                if (costSpan) costSpan.textContent = formatNumber(totalCost);
            }
        });

        const quickUpgBtn = document.getElementById('quick-buy-upgrade-btn');
        if (quickUpgBtn) {
            const uId = quickUpgBtn.dataset.upgradeId;
            const upg = UPGRADES_DATA.find(u => u.id === uId);
            if (upg) {
                const canAfford = state.aether >= upg.cost;
                quickUpgBtn.classList.toggle('affordable', canAfford);
                quickUpgBtn.classList.toggle('unaffordable', !canAfford);
            }
        }
    }

    /**
     * Show "THE FOUNDRY AWAKENS" Modal
     */
    showOfflineModal(report) {
        if (!this.dom.offlineModal || !report) return;

        this.dom.offlineModal.innerHTML = `
            <div class="modal-backdrop"></div>
            <div class="modal-content awakening-modal-card">
                <div class="modal-header">
                    <span class="modal-icon">✦</span>
                    <h2>THE FOUNDRY AWAKENS</h2>
                    <span class="modal-icon">✦</span>
                </div>
                <div class="modal-body">
                    <p class="modal-flavor">While your consciousness drifted, the automated machinery continued harvesting the cosmic currents.</p>
                    
                    <div class="offline-stats-box">
                        <div class="stat-row">
                            <span>Absence Duration:</span>
                            <strong>${formatTime(report.rawElapsedSeconds)} ${report.wasCapped ? '(Capacity Capped)' : ''}</strong>
                        </div>
                        <div class="stat-row highlight">
                            <span>Aether Harvested:</span>
                            <strong class="aether-gain">+${formatNumber(report.aetherEarned)} Aether</strong>
                        </div>
                        <div class="stat-row">
                            <span>Condensation Efficiency:</span>
                            <strong>${(report.efficiency * 100).toFixed(0)}%</strong>
                        </div>
                        ${report.milestonesUnlocked && report.milestonesUnlocked.length > 0 ? `
                            <div class="stat-row milestones">
                                <span>Milestones Unlocked:</span>
                                <strong>${report.milestonesUnlocked.map(m => m.name).join(', ')}</strong>
                            </div>
                        ` : ''}
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-primary" id="btn-claim-offline">Channel Harvest</button>
                </div>
            </div>
        `;

        this.dom.offlineModal.classList.add('visible');

        const claimBtn = document.getElementById('btn-claim-offline');
        if (claimBtn) {
            claimBtn.addEventListener('click', () => {
                audio.playMilestoneSound();
                this.dom.offlineModal.classList.remove('visible');
                this.renderAll();
            });
        }
    }

    /**
     * Settings Modal
     */
    openSettingsModal() {
        if (!this.dom.settingsModal) return;
        const state = this.gameState.getState();

        this.dom.settingsModal.innerHTML = `
            <div class="modal-backdrop" id="settings-backdrop"></div>
            <div class="modal-content settings-modal-card">
                <div class="modal-header">
                    <h3>Foundry Configuration</h3>
                    <button class="btn-modal-close" id="btn-close-settings">×</button>
                </div>
                <div class="modal-body">
                    <div class="settings-group">
                        <h4>Audio Settings</h4>
                        <div class="setting-row">
                            <label for="vol-slider">Master Volume:</label>
                            <input type="range" id="vol-slider" min="0" max="1" step="0.05" value="${state.settings.volume}">
                        </div>
                        <div class="setting-row">
                            <label>Sound Effects:</label>
                            <label class="switch-toggle">
                                <input type="checkbox" id="setting-toggle-sound" ${!state.settings.muted ? 'checked' : ''}>
                                <span class="slider"></span>
                            </label>
                        </div>
                    </div>

                    <div class="settings-group">
                        <h4>Interface & Notation</h4>
                        <div class="setting-row">
                            <label for="notation-select">Number Notation:</label>
                            <select id="notation-select" class="foundry-select">
                                <option value="standard" ${getNotationMode() === 'standard' ? 'selected' : ''}>Standard (1.25M, 8.4B)</option>
                                <option value="scientific" ${getNotationMode() === 'scientific' ? 'selected' : ''}>Scientific (1.25e6)</option>
                            </select>
                        </div>
                        <div class="setting-row">
                            <label>Canvas Particles:</label>
                            <label class="switch-toggle">
                                <input type="checkbox" id="setting-toggle-particles" ${state.settings.particlesEnabled ? 'checked' : ''}>
                                <span class="slider"></span>
                            </label>
                        </div>
                    </div>

                    <div class="settings-group">
                        <h4>Save Management</h4>
                        <div class="save-actions-grid">
                            <button class="btn-secondary" id="btn-export-save">Export Save</button>
                            <button class="btn-secondary" id="btn-import-save">Import Save</button>
                            <button class="btn-danger" id="btn-hard-reset">Extinguish Foundry (Reset)</button>
                        </div>
                        <div id="save-io-box" class="save-io-box" style="display:none;">
                            <textarea id="save-io-text" rows="4" class="foundry-textarea" placeholder="Paste save string here..."></textarea>
                            <button class="btn-primary" id="btn-confirm-import">Apply Import</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        this.dom.settingsModal.classList.add('visible');

        // Close
        const close = () => this.dom.settingsModal.classList.remove('visible');
        document.getElementById('btn-close-settings').addEventListener('click', close);
        document.getElementById('settings-backdrop').addEventListener('click', close);

        // Volume slider
        const volSlider = document.getElementById('vol-slider');
        volSlider.addEventListener('input', (e) => {
            const v = parseFloat(e.target.value);
            state.settings.volume = v;
            audio.setVolume(v);
        });

        // Sound toggle
        const sndToggle = document.getElementById('setting-toggle-sound');
        sndToggle.addEventListener('change', (e) => {
            state.settings.muted = !e.target.checked;
            audio.setMuted(state.settings.muted);
            this.updateSoundButton();
        });

        // Notation select
        const notSelect = document.getElementById('notation-select');
        notSelect.addEventListener('change', (e) => {
            setNotationMode(e.target.value);
            state.settings.notation = e.target.value;
            this.renderAll();
        });

        // Particles toggle
        const partToggle = document.getElementById('setting-toggle-particles');
        partToggle.addEventListener('change', (e) => {
            state.settings.particlesEnabled = e.target.checked;
            if (this.foundryCanvas) this.foundryCanvas.particlesEnabled = e.target.checked;
        });

        // Export
        document.getElementById('btn-export-save').addEventListener('click', () => {
            const code = this.saveSystem.exportSave();
            const ioBox = document.getElementById('save-io-box');
            const ioText = document.getElementById('save-io-text');
            const importBtn = document.getElementById('btn-confirm-import');
            ioBox.style.display = 'block';
            importBtn.style.display = 'none';
            ioText.value = code;
            ioText.select();
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(code).then(() => {
                    this.notifications.show({ title: 'Exported', desc: 'Save data copied to clipboard!', icon: '📋' });
                }).catch(() => {});
            }
        });

        // Import
        document.getElementById('btn-import-save').addEventListener('click', () => {
            const ioBox = document.getElementById('save-io-box');
            const ioText = document.getElementById('save-io-text');
            const importBtn = document.getElementById('btn-confirm-import');
            ioBox.style.display = 'block';
            importBtn.style.display = 'inline-block';
            ioText.value = '';
            ioText.placeholder = 'Paste your exported base64 save string here...';
            ioText.focus();
        });

        document.getElementById('btn-confirm-import').addEventListener('click', () => {
            const ioText = document.getElementById('save-io-text');
            const success = this.saveSystem.importSave(ioText.value);
            if (success) {
                this.notifications.show({ title: 'Import Successful', desc: 'Foundry coordinates restored.', icon: '🌟' });
                close();
                this.renderAll();
            } else {
                alert('Invalid save string! Please ensure the data was not corrupted.');
            }
        });

        // Hard Reset
        document.getElementById('btn-hard-reset').addEventListener('click', () => {
            if (confirm('WARNING: Are you sure you wish to extinguish the Astral Foundry? ALL progress, buildings, research, and shards will be PERMANENTLY erased!')) {
                this.saveSystem.reset();
                close();
                this.renderAll();
                this.notifications.show({ title: 'Reset Complete', desc: 'The foundry slumbers once again.', icon: '🌑' });
            }
        });
    }

    /**
     * Ascension Confirmation Modal
     */
    openAscensionConfirmModal() {
        if (!this.dom.ascensionModal) return;
        const pendingShards = this.prestigeSystem.calculatePendingShards();

        this.dom.ascensionModal.innerHTML = `
            <div class="modal-backdrop" id="ascend-backdrop"></div>
            <div class="modal-content ascension-confirm-card">
                <div class="modal-header">
                    <span class="modal-icon">🌌</span>
                    <h2>INITIATE ASCENSION RITUAL</h2>
                    <span class="modal-icon">🌌</span>
                </div>
                <div class="modal-body">
                    <p class="modal-warning">The Astral Foundry will dissolve its physical hull to transition into higher astral planes.</p>
                    
                    <div class="reset-breakdown">
                        <div class="reset-column lost">
                            <h4>What Will Dissolve:</h4>
                            <ul>
                                <li>Current Aether reserves</li>
                                <li>All constructed buildings</li>
                                <li>Purchased standard upgrades</li>
                                <li>Completed research nodes</li>
                            </ul>
                        </div>
                        <div class="reset-column kept">
                            <h4>What Transcends:</h4>
                            <ul>
                                <li><strong>+${formatNumber(pendingShards)} Astral Shards</strong></li>
                                <li>All Astral Ascension Perks</li>
                                <li>Permanent Archive Milestones & Lore</li>
                                <li>Lifetime Statistics</li>
                            </ul>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-secondary" id="btn-cancel-ascend">Remain in Current Cycle</button>
                    <button class="btn-primary btn-ascend" id="btn-confirm-ascend">Ascend Now</button>
                </div>
            </div>
        `;

        this.dom.ascensionModal.classList.add('visible');

        const close = () => this.dom.ascensionModal.classList.remove('visible');
        document.getElementById('btn-cancel-ascend').addEventListener('click', close);
        document.getElementById('ascend-backdrop').addEventListener('click', close);

        document.getElementById('btn-confirm-ascend').addEventListener('click', () => {
            this.prestigeSystem.ascend();
            close();
        });
    }
}
