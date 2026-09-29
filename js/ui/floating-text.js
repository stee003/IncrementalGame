/**
 * Astral Foundry - Floating Text System
 * Renders glowing floating numbers for manual core clicks and surges.
 */

import { formatNumber } from '../utils/formatters.js';

export class FloatingTextManager {
    constructor(containerElement) {
        this.container = containerElement || document.body;
    }

    /**
     * Spawn floating text at screen/element coordinates
     * @param {number} x 
     * @param {number} y 
     * @param {string|number} text 
     * @param {string} type 'aether' | 'surge' | 'bonus'
     */
    spawn(x, y, text, type = 'aether') {
        const el = document.createElement('div');
        el.className = `floating-number float-${type}`;

        let displayText = text;
        if (typeof text === 'number') {
            displayText = `+${formatNumber(text)} Aether`;
        }

        el.textContent = displayText;

        // Slight random horizontal offset
        const offsetX = (Math.random() - 0.5) * 40;
        const offsetY = (Math.random() - 0.5) * 20;

        el.style.left = `${x + offsetX}px`;
        el.style.top = `${y + offsetY}px`;

        this.container.appendChild(el);

        // Remove element when animation ends
        setTimeout(() => {
            if (el.parentNode) {
                el.parentNode.removeChild(el);
            }
        }, 1100);
    }
}
