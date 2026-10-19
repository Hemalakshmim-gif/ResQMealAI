
const {
  explainPotentialMatches,
} = require("./demandMatchingAI");

const Organization = require("../models/Organization");
const FoodInventory = require("../models/FoodInventory");
const { classifyFood } = require("./inventoryClassification");
const { predictSurplus } = require("./surplusPrediction");
const {
  analyzeFoodSafety,
} = require("./foodSafetyEligibilityAgent");

const normalize = (value) =>
  String(value || "").trim().toLowerCase();

const matchFoodWithOrganizations = async (options = {}) => {
  const now = new Date();

  // Optional expected demand, keyed by food ID.
  const expectedDemandByFoodId =
    options.expectedDemandByFoodId || {};

  const [foods, organizations, safetyAnalysis] = await Promise.all([
    FoodInventory.find().lean(),
    Organization.find({ isActive: true }).lean(),
    analyzeFoodSafety(),
  ]);

  // Get the latest safety decision for each food record.
  const safetyByFoodId = new Map(
    safetyAnalysis.results.map((result) => [
      String(result._id),
      result,
    ])
  );

  // Apply existing classification and safety rules.
  const eligibleFoods = foods
    .map((food) => {
      const classification = classifyFood(food, now);

      return {
        ...food,
        ...classification,
        safetyEvaluation:
          safetyByFoodId.get(String(food._id)) || null,
      };
    })
    .filter(
      (food) =>
        food.status === "available" &&
        food.priority !== "excluded" &&
        Number.isFinite(food.hoursUntilExpiry) &&
        food.hoursUntilExpiry > 0 &&
        food.safetyEvaluation?.eligibilityStatus === "approved" &&
        food.safetyEvaluation?.canBeRecommended === true
    )
    .map((food) => {
      const foodId = String(food._id);

      const hasExpectedDemand =
        Object.prototype.hasOwnProperty.call(
          expectedDemandByFoodId,
          foodId
        );

      const expectedDemand = hasExpectedDemand
        ? expectedDemandByFoodId[foodId]
        : undefined;

      const surplusPrediction = predictSurplus(
        food,
        expectedDemand,
        now
      );

      // Preserve existing matching when no provider demand is supplied.
      // When supplied, estimated surplus limits the matchable quantity.
      const matchableQuantity = hasExpectedDemand
        ? surplusPrediction.predictionStatus === "estimated"
          ? Math.min(
              Number(food.quantity) || 0,
              surplusPrediction.estimatedSurplus
            )
          : 0
        : Number(food.quantity) || 0;

      return {
        ...food,
        surplusPrediction,
        matchableQuantity,
      };
    });

  const matches = [];

  // Track remaining organization demand within this analysis run.
  const remainingDemand = new Map();

  for (const organization of organizations) {
    remainingDemand.set(
      String(organization._id),
      Math.max(0, Number(organization.requestedMeals) || 0)
    );
  }

  // Prevent multiple proposals from exceeding a food record's limit.
  const remainingFoodQuantity = new Map();

  for (const food of eligibleFoods) {
    remainingFoodQuantity.set(
      String(food._id),
      Math.max(0, food.matchableQuantity)
    );
  }

  const priorityOrder = {
    urgent: 1,
    high: 2,
    medium: 3,
    normal: 4,
  };

  // Process urgent food first.
  eligibleFoods.sort(
    (a, b) =>
      priorityOrder[a.priority] - priorityOrder[b.priority]
  );

  for (const food of eligibleFoods) {
    for (const organization of organizations) {
      const acceptedTypes = (
        organization.acceptedFoodTypes || []
      ).map(normalize);

      const requestedTypes = (
        organization.requestedFoodTypes || []
      ).map(normalize);

      const foodType = normalize(food.foodType);

      if (
        !acceptedTypes.includes(foodType) ||
        !requestedTypes.includes(foodType)
      ) {
        continue;
      }

      const organizationId = String(organization._id);
      const foodId = String(food._id);

      const demandLeft = remainingDemand.get(organizationId) || 0;
      const foodLeft = remainingFoodQuantity.get(foodId) || 0;

      if (demandLeft <= 0 || foodLeft <= 0) {
        continue;
      }

      // This matching logic currently allocates only meal quantities.
      
      // Recipient demand is measured in meals.
      // Do not compare packets, kg, grams, or litres with meal demand
      // until an explicit, validated unit conversion is available.
      const foodUnit = normalize(food.unit);

      if (foodUnit !== "meals") {
        continue;
      }

      const proposedMeals = Math.min(foodLeft, demandLeft);

      if (proposedMeals <= 0) {
        continue;
      }

      const foodLocation = normalize(food.pickupAddress);
      const organizationCity = normalize(organization.city);

      const sameCity =
        Boolean(foodLocation) &&
        Boolean(organizationCity) &&
        foodLocation.includes(organizationCity);

      matches.push({
        food: {
          id: foodId,
          foodName: food.foodName,
          quantity: food.quantity,
          unit: food.unit,
          matchableQuantity: food.matchableQuantity,
          surplusPrediction: food.surplusPrediction,
          foodType: food.foodType,
          pickupAddress: food.pickupAddress,
          expiryTime: food.expiryTime,
          priority: food.priority,
          hoursUntilExpiry: food.hoursUntilExpiry,
        },

        organization: {
          id: organizationId,
          name: organization.name,
          city: organization.city,
          requestedFoodTypes: organization.requestedFoodTypes,
          requestedMeals: organization.requestedMeals,
          capacityMeals: organization.capacityMeals,
        },

        matching: {
          foodTypeMatch: true,
          demandMatch: true,
          sameCity,
          proposedMeals,
          demandBeforeMatch: demandLeft,
          priority: food.priority,
          reason: sameCity
            ? "Food type is accepted and requested; city matches."
            : "Food type is accepted and requested; location needs verification.",
        },
      });

      // Update in-memory limits only; no database writes.
      remainingDemand.set(
        organizationId,
        demandLeft - proposedMeals
      );

      remainingFoodQuantity.set(
        foodId,
        foodLeft - proposedMeals
      );
    }
  }

  let aiRecommendations = [];
  let aiStatus = "skipped";

  if (matches.length > 0) {
    try {
      aiRecommendations = await explainPotentialMatches(matches);
      aiStatus = "success";
    } catch (error) {
      console.error(
        "Gemini matching reasoning unavailable:",
        error.message
      );
      aiStatus = "unavailable";
    }
  }

  const aiByPair = new Map(
    aiRecommendations.map((item) => [
      `${item.foodId}:${item.organizationId}`,
      item,
    ])
  );

  const enrichedMatches = matches.map((match) => {
    const key = `${match.food.id}:${match.organization.id}`;
    const ai = aiByPair.get(key);

    return {
      ...match,
      matching: {
        ...match.matching,
        aiSuggestedRank: ai?.suggestedRank ?? null,
        aiExplanation: ai?.explanation ?? null,
      },
    };
  });

  return {
    analyzedAt: now,

    summary: {
      totalFoodRecords: foods.length,
      eligibleFoodRecords: eligibleFoods.length,
      activeOrganizations: organizations.length,
      totalMatches: enrichedMatches.length,

      proposedMeals: enrichedMatches.reduce(
        (total, match) =>
          total + match.matching.proposedMeals,
        0
      ),

      sameCityMatches: enrichedMatches.filter(
        (match) => match.matching.sameCity
      ).length,
    },

    aiStatus,
    aiRecommendationsCount: aiRecommendations.length,
    matches: enrichedMatches,
  };
};

module.exports = { matchFoodWithOrganizations };
