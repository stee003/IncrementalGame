/**
 * Astral Foundry - Mathematical Utilities
 * Handles idle scaling formulas, batch purchases (1, 10, 25, Max),
 * and geometric progression summation.
 */

/**
 * Calculates the cost of purchasing a specific level of a building
 * Cost = baseCost * (costMultiplier ^ currentCount)
 */
export function calculateBuildingCost(baseCost, costMult, currentCount) {
    return baseCost * Math.pow(costMult, currentCount);
}

/**
 * Calculates the total cost to buy `amount` buildings starting from `currentCount`
 * Using the geometric series sum formula:
 * Sum = baseCost * costMult^currentCount * (costMult^amount - 1) / (costMult - 1)
 */
export function calculateBatchCost(baseCost, costMult, currentCount, amount) {
    if (amount <= 0) return 0;
    if (amount === 1) return calculateBuildingCost(baseCost, costMult, currentCount);

    const firstCost = calculateBuildingCost(baseCost, costMult, currentCount);
    if (Math.abs(costMult - 1) < 1e-7) {
        return firstCost * amount;
    }
    const total = firstCost * (Math.pow(costMult, amount) - 1) / (costMult - 1);
    return Math.max(0, total);
}

/**
 * Calculates the maximum number of buildings affordable with `availableCurrency`
 * starting from `currentCount`, and the exact total cost for that amount.
 * Formula derived from inverting the geometric series sum:
 * amount = floor( log(1 + availableCurrency * (costMult - 1) / firstCost) / log(costMult) )
 */
export function calculateMaxAffordable(baseCost, costMult, currentCount, availableCurrency) {
    if (availableCurrency <= 0) {
        return { count: 0, cost: 0 };
    }

    const firstCost = calculateBuildingCost(baseCost, costMult, currentCount);
    if (availableCurrency < firstCost) {
        return { count: 0, cost: 0 };
    }

    if (Math.abs(costMult - 1) < 1e-7) {
        const count = Math.floor(availableCurrency / firstCost);
        return { count, cost: count * firstCost };
    }

    const ratio = (availableCurrency * (costMult - 1)) / firstCost;
    if (ratio < 0) return { count: 0, cost: 0 };

    const maxCount = Math.floor(Math.log(1 + ratio) / Math.log(costMult));
    const safeCount = Math.max(0, maxCount);
    const totalCost = calculateBatchCost(baseCost, costMult, currentCount, safeCount);

    return { count: safeCount, cost: totalCost };
}

/**
 * Clamp a number between min and max
 */
export function clamp(val, min, max) {
    return Math.min(Math.max(val, min), max);
}
