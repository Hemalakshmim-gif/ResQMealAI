
const Driver = require("../models/Driver");
const Delivery = require("../models/Delivery");
const Donation = require("../models/Donation");
const FoodInventory = require("../models/FoodInventory");

const {
  explainDriverRankings,
} = require("./logisticsAIReasoning");

const {
  analyzeFoodSafety,
} = require("./foodSafetyEligibilityAgent");

const normalize = (value) =>
  String(value || "").trim().toLowerCase();

const planDeliveries = async () => {
  const [deliveries, drivers, safetyAnalysis] = await Promise.all([
    Delivery.find({
      status: "pending",
      driver: null,
    })
      .populate({
        path: "donation",
        populate: {
          path: "food",
          select: "foodName quantity unit expiryTime foodType status",
        },
      })
      .lean(),

    Driver.find({ status: "available" }).lean(),

    analyzeFoodSafety(),
  ]);

  // Map the safety result to each food record.
  const safetyByFoodId = new Map(
    (safetyAnalysis.results || []).map((result) => [
      String(result._id),
      result,
    ])
  );

  const plans = deliveries.map((delivery) => {
    const donation = delivery.donation;
    const food = donation?.food;

    const safetyEvaluation = food
      ? safetyByFoodId.get(String(food._id)) || null
      : null;

    const quantity = Number(donation?.quantity);
    const unit = normalize(food?.unit);

    const quantityKnown =
      Number.isFinite(quantity) && quantity > 0;

    const mealUnit = unit === "meal" || unit === "meals";

    const foodExpiry = food?.expiryTime
      ? new Date(food.expiryTime)
      : null;

    const hoursUntilExpiry =
      foodExpiry && !Number.isNaN(foodExpiry.getTime())
        ? (foodExpiry.getTime() - Date.now()) / 3600000
        : null;

    let planningStatus = "candidate_drivers_found";

    // Validate delivery and inventory before considering drivers.
    if (!donation || !food) {
      planningStatus = "food_or_donation_missing";
    } else if (!quantityKnown) {
      planningStatus = "quantity_unknown";
    } else if (!mealUnit) {
      planningStatus = "unsupported_unit";
    } else if (
      food.status !== "available" &&
      food.status !== "reserved"
    ) {
      planningStatus = "food_unavailable";
    } else if (
      hoursUntilExpiry === null ||
      hoursUntilExpiry <= 0
    ) {
      planningStatus = "expiry_invalid_or_passed";
    } else if (
      safetyEvaluation?.eligibilityStatus !== "approved" ||
      safetyEvaluation?.canBeRecommended !== true
    ) {
      // Safety approval is mandatory for logistics recommendations.
      planningStatus = "food_safety_not_approved";
    }

    const canPlan =
      planningStatus === "candidate_drivers_found";

    const candidates = canPlan
      ? drivers
          .filter(
            (driver) =>
              Number.isFinite(Number(driver.capacityMeals)) &&
              Number(driver.capacityMeals) >= quantity
          )
          .map((driver) => {
            const pickup = normalize(delivery.pickupAddress);
            const location = normalize(driver.currentLocation);

            const locationMatch =
              Boolean(pickup) &&
              Boolean(location) &&
              (
                pickup.includes(location) ||
                location.includes(pickup)
              );

            return {
              driverId: String(driver._id),
              driverName: driver.name,
              vehicleType: driver.vehicleType,
              capacityMeals: driver.capacityMeals,
              currentLocation: driver.currentLocation,
              locationMatch,
              reason: locationMatch
                ? "Meal capacity is sufficient and the location strings match."
                : "Meal capacity is sufficient; pickup proximity still needs verification.",
            };
          })
          .sort(
            (a, b) =>
              Number(b.locationMatch) - Number(a.locationMatch)
          )
      : [];

    if (canPlan && candidates.length === 0) {
      planningStatus = "no_suitable_driver";
    }

    return {
      deliveryId: String(delivery._id),
      donationId: donation?._id
        ? String(donation._id)
        : null,
      foodId: food?._id
        ? String(food._id)
        : null,
      foodName: food?.foodName || null,
      deliveryStatus: delivery.status,
      pickupAddress: delivery.pickupAddress,
      deliveryAddress: delivery.deliveryAddress,
      quantity: quantityKnown ? quantity : null,
      unit: unit || null,
      hoursUntilExpiry,
      planningStatus,

      // Expose the safety decision for auditing and debugging.
      foodSafetyStatus:
        safetyEvaluation?.eligibilityStatus || "unknown",

      candidateDrivers: candidates,
    };
  });

  let aiStatus = "not_needed";
  let aiRecommendationsCount = 0;

  try {
    // The AI only receives plans and drivers that passed rule-based checks.
    const recommendations = await explainDriverRankings(plans);

    const recommendationMap = new Map(
      recommendations.map((item) => [
        `${item.deliveryId}:${item.driverId}`,
        item,
      ])
    );

    for (const plan of plans) {
      for (const driver of plan.candidateDrivers) {
        const recommendation = recommendationMap.get(
          `${plan.deliveryId}:${driver.driverId}`
        );

        if (recommendation) {
          driver.aiSuggestedRank = recommendation.suggestedRank;
          driver.aiExplanation = recommendation.explanation;
          aiRecommendationsCount++;
        }
      }

      // Location matching remains the primary ranking rule.
      // AI ranking is only a tie-breaker.
      plan.candidateDrivers.sort((a, b) => {
        if (a.locationMatch !== b.locationMatch) {
          return Number(b.locationMatch) - Number(a.locationMatch);
        }

        return (
          (a.aiSuggestedRank ?? Number.MAX_SAFE_INTEGER) -
          (b.aiSuggestedRank ?? Number.MAX_SAFE_INTEGER)
        );
      });
    }

    aiStatus =
      recommendations.length > 0 ? "success" : "no_candidates";
  } catch (error) {
    // Rule-based plans remain available if AI fails.
    aiStatus = "fallback";

    console.error(
      "Logistics AI ranking unavailable; using rule-based results:",
      error.message
    );
  }

  return {
    analyzedAt: new Date(),
    aiStatus,
    aiRecommendationsCount,

    summary: {
      pendingDeliveries: deliveries.length,
      availableDrivers: drivers.length,
      deliveriesWithCandidates: plans.filter(
        (plan) => plan.candidateDrivers.length > 0
      ).length,
      deliveriesWithoutCandidates: plans.filter(
        (plan) => plan.candidateDrivers.length === 0
      ).length,
    },

    plans,
  };
};

module.exports = { planDeliveries };
