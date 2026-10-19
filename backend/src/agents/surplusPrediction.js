
const { classifyFood } = require("./inventoryClassification");

/**
 * Estimate potential surplus from a supplied expected demand.
 *
 * This is a rule-based estimate, not a historical ML forecast.
 * It does not modify inventory or create donations.
 */
function predictSurplus(food, expectedDemand, now = new Date()) {
  const classification = classifyFood(food, now);

  const base = {
    foodId: String(food._id ?? food.id ?? ""),
    foodName: food.foodName,
    unit: food.unit,
    inventoryQuantity: food.quantity,
    priority: classification.priority,
    hoursUntilExpiry: classification.hoursUntilExpiry,
    estimatedSurplus: null,
    expectedDemand: null,
    predictionStatus: "insufficient_data",
    reason: ""
  };

  // Do not estimate redistributable surplus for ineligible food.
  if (classification.priority === "excluded") {
    return {
      ...base,
      predictionStatus: "excluded",
      reason: classification.reason
    };
  }

  if (
    typeof food.quantity !== "number" ||
    !Number.isFinite(food.quantity) ||
    food.quantity < 0
  ) {
    return {
      ...base,
      reason: "Inventory quantity is missing or invalid."
    };
  }

  if (
    typeof expectedDemand !== "number" ||
    !Number.isFinite(expectedDemand) ||
    expectedDemand < 0
  ) {
    return {
      ...base,
      reason:
        "A valid, non-negative expected demand is required to estimate surplus."
    };
  }

  const estimatedSurplus = Math.max(
    0,
    food.quantity - expectedDemand
  );

  return {
    ...base,
    expectedDemand,
    estimatedSurplus,
    predictionStatus: "estimated",
    reason:
      estimatedSurplus > 0
        ? "Estimated surplus is based on supplied expected demand."
        : "No surplus is estimated because expected demand meets or exceeds inventory quantity."
  };
}

module.exports = { predictSurplus };
