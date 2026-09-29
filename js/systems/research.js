/**
 * Astral Foundry - Research System
 * Handles the 4-branch research tree:
 * Aether Engineering, Astral Biology, Temporal Mechanics, Void Studies.
 */

import { RESEARCH_BRANCHES } from '../config.js';
import { audio } from '../utils/audio.js';

export class ResearchSystem {
    constructor(gameState, resourceSystem) {
        this.gameState = gameState;
        this.resourceSystem = resourceSystem;
    }

    /**
     * Find a research node by its ID across all branches
     */
    getNode(nodeId) {
        for (const branch of RESEARCH_BRANCHES) {
            const found = branch.nodes.find(n => n.id === nodeId);
            if (found) return { node: found, branch };
        }
        return null;
    }

    /**
     * Check if a node is already researched
     */
    isResearched(nodeId) {
        return this.gameState.getState().researchedNodes.includes(nodeId);
    }

    /**
     * Check if a node's prerequisites are met
     */
    canResearch(nodeId) {
        if (this.isResearched(nodeId)) return false;
        const result = this.getNode(nodeId);
        if (!result) return false;

        const { node } = result;
        // Check prerequisites
        for (const reqId of node.requires) {
            if (!this.isResearched(reqId)) {
                return false;
            }
        }
        return true;
    }

    /**
     * Calculate effective research cost (with milestone discounts)
     */
    getEffectiveCost(node) {
        const state = this.gameState.getState();
        let mult = 1.0;
        if (state.unlockedMilestones.includes('master_codex')) {
            mult *= 0.85; // 15% discount
        }
        return Math.floor(node.cost * mult);
    }

    /**
     * Research a node
     */
    unlock(nodeId) {
        if (!this.canResearch(nodeId)) return false;
        const result = this.getNode(nodeId);
        if (!result) return false;

        const { node, branch } = result;
        const effectiveCost = this.getEffectiveCost(node);
        const state = this.gameState.getState();

        if (state.aether < effectiveCost) return false;

        if (this.resourceSystem.spend(effectiveCost)) {
            state.researchedNodes.push(nodeId);

            audio.playResearchSound();
            this.gameState.emit('research:unlock', {
                nodeId,
                node,
                branch,
                cost: effectiveCost
            });
            return true;
        }

        return false;
    }
}
