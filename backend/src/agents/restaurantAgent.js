const mongoose = require("mongoose");
const FoodInventory = require("../models/FoodInventory");
const { classifyFood } = require("./inventoryClassification");
const { predictSurplus } = require("./surplusPrediction");
const { createAgentResult } = require("./agentResult");

async function runRestaurantAgent({
  foodId,
  expectedDemand,
  now = new Date()
}) {
  const startedAt = new Date();

  if (!mongoose.isValidObjectId(foodId)) {
    throw new Error("A valid food ID is required.");
  }

  if (Number.isNaN(new Date(now).getTime())) {
    throw new Error("A valid prediction time is required.");
  }

  if (
    expectedDemand !== undefined &&
    (
      typeof expectedDemand !== "number" ||
      !Number.isFinite(expectedDemand) ||
      expectedDemand < 0
    )
  ) {
    throw new Error("Expected demand must be a non-negative number.");
  }

  const food = await FoodInventory.findById(foodId).lean();

  if (!food) {
    const error = new Error("Food listing was not found.");
    error.code = "FOOD_NOT_FOUND";
    throw error;
  }

  const classification = classifyFood(food, new Date(now));
  const prediction = predictSurplus(
    food,
    expectedDemand,
    new Date(now)
  );
  const eligible = classification.priority !== "excluded";
  const potentialSurplus = eligible
    ? expectedDemand === undefined
      ? food.quantity
      : prediction.estimatedSurplus
    : 0;

  const predictedSurplus =
    eligible && potentialSurplus > 0
      ? [{
          foodId: String(food._id),
          foodName: food.foodName,
          quantity: potentialSurplus,
          availableQuantity: food.quantity,
          unit: food.unit,
          foodType: food.foodType,
          pickupAddress: food.pickupAddress,
          pickupCoordinates: food.pickupCoordinates || null,
          expiryTime: food.expiryTime,
          predictionStatus:
            expectedDemand === undefined
              ? "provider_declared"
              : prediction.predictionStatus,
          predictionMethod:
            expectedDemand === undefined
              ? "provider_listed_quantity"
              : "rule_based_expected_demand",
          expectedDemand: expectedDemand ?? null,
          priority: classification.priority,
          reason:
            expectedDemand === undefined
              ? "Uses the quantity explicitly listed by the provider; no independent demand forecast was available."
              : prediction.reason
        }]
      : [];

  return createAgentResult({
    agent: "Restaurant Agent",
    status: "COMPLETED",
    startedAt,
    input: {
      foodId: String(food._id),
      expectedDemand: expectedDemand ?? null
    },
    output: {
      providerOrganizationId: food.providerOrganization
        ? String(food.providerOrganization)
        : null,
      predictedSurplus,
      excludedFood: eligible
        ? null
        : {
            foodId: String(food._id),
            reason: classification.reason
          }
    }
  });
}

module.exports = { runRestaurantAgent };
