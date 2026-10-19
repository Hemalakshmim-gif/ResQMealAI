
const FoodInventory = require("../models/FoodInventory");
const { classifyFood } = require("./inventoryClassification");
const { predictSurplus } = require("./surplusPrediction");
const {
  explainEligibleInventory,
} = require("./inventoryAIReasoning");

const analyzeInventory = async (options = {}) => {
  const now = new Date();

  // Optional expected-demand values, keyed by food ID.
  // Example: { expectedDemandByFoodId: { "food-id": 65 } }
  const expectedDemandByFoodId =
    options.expectedDemandByFoodId || {};

  // Read inventory without modifying database records.
  const foods = await FoodInventory.find().lean();

  const recommendations = foods.map((food) => {
    const classification = classifyFood(food, now);

    const foodId = String(food._id);
    const expectedDemand =
      Object.prototype.hasOwnProperty.call(
        expectedDemandByFoodId,
        foodId
      )
        ? expectedDemandByFoodId[foodId]
        : undefined;

    const surplusPrediction = predictSurplus(
      food,
      expectedDemand,
      now
    );

    return {
      _id: food._id,
      foodName: food.foodName,
      quantity: food.quantity,
      unit: food.unit,
      providerName: food.providerName,
      pickupAddress: food.pickupAddress,
      foodType: food.foodType,
      status: food.status,
      expiryTime: food.expiryTime,
      ...classification,
      surplusPrediction,
    };
  });

  const priorityOrder = {
    urgent: 1,
    high: 2,
    medium: 3,
    normal: 4,
    excluded: 5,
  };

  recommendations.sort(
    (a, b) =>
      priorityOrder[a.priority] - priorityOrder[b.priority]
  );

  // Only eligible records are sent to Gemini.
  // Rule-based classification remains authoritative.
  let aiRecommendations = [];
  let aiStatus = "skipped";

  const eligibleFoods = recommendations.filter(
    (food) =>
      food.priority !== "excluded" &&
      Number.isFinite(food.hoursUntilExpiry) &&
      food.hoursUntilExpiry > 0
  );

  if (eligibleFoods.length > 0) {
    try {
      aiRecommendations = await explainEligibleInventory(
        eligibleFoods
      );
      aiStatus = "success";
    } catch (error) {
      // Keep the inventory endpoint usable if Gemini is unavailable.
      console.error(
        "Gemini reasoning unavailable:",
        error.message
      );
      aiStatus = "unavailable";
    }
  }

  // Attach AI explanations without changing rule-based priority.
  const aiById = new Map(
    aiRecommendations.map((item) => [item.id, item])
  );

  const enrichedRecommendations = recommendations.map((food) => {
    const ai = aiById.get(String(food._id));

    return {
      ...food,
      aiSuggestedRank: ai?.suggestedRank ?? null,
      aiExplanation: ai?.explanation ?? null,
    };
  });

  const summary = {
    totalRecords: enrichedRecommendations.length,
    urgent: enrichedRecommendations.filter(
      (f) => f.priority === "urgent"
    ).length,
    high: enrichedRecommendations.filter(
      (f) => f.priority === "high"
    ).length,
    medium: enrichedRecommendations.filter(
      (f) => f.priority === "medium"
    ).length,
    normal: enrichedRecommendations.filter(
      (f) => f.priority === "normal"
    ).length,
    excluded: enrichedRecommendations.filter(
      (f) => f.priority === "excluded"
    ).length,
  };

  return {
    analyzedAt: now,
    summary,
    aiStatus,
    aiRecommendationsCount: aiRecommendations.length,
    recommendations: enrichedRecommendations,
  };
};

module.exports = { analyzeInventory };
