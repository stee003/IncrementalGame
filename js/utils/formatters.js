/**
 * Astral Foundry - Number & Time Formatters
 * Formats numbers gracefully: 1,250, 12.5K, 2.35M, 8.41B, etc.
 * Avoids absurdly long unreadable floating point numbers.
 */

const SUFFIXES = [
    '', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc',
    'Ud', 'Dd', 'Td', 'Qad', 'Qid', 'Sxd', 'Spd', 'Ocd', 'Nod', 'Vg'
];

let notationMode = 'standard'; // 'standard', 'scientific', 'compact'

export function setNotationMode(mode) {
    if (['standard', 'scientific', 'compact'].includes(mode)) {
        notationMode = mode;
    }
}

export function getNotationMode() {
    return notationMode;
}

/**
 * Format a number cleanly for display
 * @param {number} num 
 * @param {number} decimals 
 * @returns {string}
 */
export function formatNumber(num, decimals = 2) {
    if (num === null || num === undefined || isNaN(num)) return '0';
    if (!isFinite(num)) return '∞';
    if (num < 0) return '-' + formatNumber(-num, decimals);
    if (num === 0) return '0';

    if (notationMode === 'scientific' && num >= 1000) {
        return num.toExponential(decimals).replace('e+', 'e');
    }

    if (num < 1000) {
        if (Number.isInteger(num)) return num.toString();
        // If it's small, show up to 1 or 2 decimals
        return num < 10 ? num.toFixed(decimals) : num.toFixed(1);
    }

    const tier = Math.floor(Math.log10(num) / 3);

    if (tier < SUFFIXES.length) {
        const suffix = SUFFIXES[tier];
        const scale = Math.pow(10, tier * 3);
        const scaled = num / scale;

        // Use appropriate decimals
        let formatted;
        if (scaled >= 100) {
            formatted = scaled.toFixed(1);
        } else if (scaled >= 10) {
            formatted = scaled.toFixed(2);
        } else {
            formatted = scaled.toFixed(2);
        }
        // Remove trailing .0 or .00
        formatted = formatted.replace(/\.00$/, '').replace(/(\.[1-9])0$/, '$1');
        return formatted + suffix;
    }

    // Fallback to scientific notation for astronomical values
    return num.toExponential(decimals).replace('e+', 'e');
}

/**
 * Format a rate (per second) with appropriate sign and precision
 * @param {number} rate 
 * @returns {string}
 */
export function formatRate(rate) {
    if (rate === null || rate === undefined || isNaN(rate)) return '+0 /s';
    if (!isFinite(rate)) return '+∞ /s';
    if (rate === 0) return '+0 /s';
    return `+${formatNumber(rate, rate < 10 ? 1 : 2)} /s`;
}

/**
 * Format percentage (e.g. 1.25 -> "+125%", 0.1 -> "+10%")
 * @param {number} mult 
 * @returns {string}
 */
export function formatMultiplier(mult) {
    if (mult === null || mult === undefined || isNaN(mult)) return '1.0x';
    return `${mult.toFixed(mult < 10 ? 2 : 1)}x`;
}

/**
 * Format seconds into human readable duration: "2h 14m 32s" or "45s"
 * @param {number} seconds 
 * @returns {string}
 */
export function formatTime(seconds) {
    if (seconds === null || seconds === undefined || isNaN(seconds) || seconds < 0) return '0s';
    seconds = Math.floor(seconds);

    const days = Math.floor(seconds / 86400);
    seconds %= 86400;
    const hours = Math.floor(seconds / 3600);
    seconds %= 3600;
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;

    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);

    return parts.join(' ');
}
