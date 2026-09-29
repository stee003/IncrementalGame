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
            displayText = `+${formatNumber(text)} $`;
        }

        el.textContent = displayText;

        // Slight random horizontal offset
        const offsetX = (Math.random() - 0.5) * 40;
        const offsetY = (Math.random() - 0.5) * 20;

        el.style.left = `${x + offsetX}px`;
        el.style.top = `${y + offsetY}px`;
        // extra juice: random scale and tilt for cash
        const scale = 0.92 + Math.random()*0.28;
        const rot = (Math.random()-0.5)*12;
        el.style.transform = `translate(-50%, -50%) scale(${scale}) rotate(${rot}deg)`;
        el.style.filter = `drop-shadow(0 0 8px rgba(255,201,60,0.65))`;

        this.container.appendChild(el);

        // Remove element when animation ends
        setTimeout(() => {
            if (el.parentNode) {
                el.parentNode.removeChild(el);
            }
        }, 1100);
    }
}
