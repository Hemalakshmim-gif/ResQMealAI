
const FoodInventory = require("../models/FoodInventory");
const Donation = require("../models/Donation");
const { analyzeFoodSafety } = require("./foodSafetyEligibilityAgent");

const PRIORITY_ORDER = {
  urgent: 1,
  high: 2,
  medium: 3,
  normal: 4,
};

const normalize = (value) =>
  String(value || "").trim().toLowerCase();

const toNonNegativeNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, number) : 0;
};

const negotiateAndAllocate = async (matches) => {
  if (!Array.isArray(matches)) {
    throw new Error("Matches must be an array.");
  }

  const now = new Date();

  if (matches.length === 0) {
    return {
      analyzedAt: now,
      summary: {
        proposedAllocations: 0,
        proposedMeals: 0,
        skippedMatches: 0,
      },
      allocations: [],
      skipped: [],
    };
  }

  // Load current inventory and safety decisions.
  const [foods, safetyAnalysis, existingDonations] = await Promise.all([
    FoodInventory.find().lean(),
    analyzeFoodSafety(),
    Donation.find({
      status: { $nin: ["rejected", "cancelled"] },
    }).select("food quantity status").lean(),
  ]);

  const foodById = new Map(
    foods.map((food) => [String(food._id), food])
  );

  const safetyByFoodId = new Map(
    safetyAnalysis.results.map((result) => [
      String(result._id),
      result,
    ])
  );

  // Count existing donation quantities against each food item.
  const allocatedByFoodId = new Map();

  for (const donation of existingDonations) {
    const foodId = String(donation.food);
    const current = allocatedByFoodId.get(foodId) || 0;

    allocatedByFoodId.set(
      foodId,
      current + toNonNegativeNumber(donation.quantity)
    );
  }

  const remainingFood = new Map();

  for (const food of foods) {
    const alreadyAllocated =
      allocatedByFoodId.get(String(food._id)) || 0;

    remainingFood.set(
      String(food._id),
      Math.max(0, toNonNegativeNumber(food.quantity) - alreadyAllocated)
    );
  }

  // Track organization demand within this proposal run.
  const remainingDemand = new Map();

  for (const match of matches) {
    const organizationId = String(match?.organization?.id || "");

    if (!organizationId) {
      continue;
    }

    if (!remainingDemand.has(organizationId)) {
      remainingDemand.set(
        organizationId,
        toNonNegativeNumber(match.organization.requestedMeals)
      );
    }
  }

  const orderedMatches = [...matches].sort((a, b) => {
    const aPriority =
      PRIORITY_ORDER[a?.food?.priority] || Number.MAX_SAFE_INTEGER;

    const bPriority =
      PRIORITY_ORDER[b?.food?.priority] || Number.MAX_SAFE_INTEGER;

    return aPriority - bPriority;
  });

  const allocations = [];
  const skipped = [];

  for (const match of orderedMatches) {
    const foodId = String(match?.food?.id || "");
    const organizationId = String(match?.organization?.id || "");

    const food = foodById.get(foodId);
    const safety = safetyByFoodId.get(foodId);

    const skip = (reason) => {
      skipped.push({
        foodId,
        organizationId,
        reason,
      });
    };

    if (!food) {
      skip("Food record was not found.");
      continue;
    }

    if (!organizationId) {
      skip("Organization ID is missing.");
      continue;
    }

    if (
      safety?.eligibilityStatus !== "approved" ||
      safety?.canBeRecommended !== true
    ) {
      skip("Food has not passed the required safety review.");
      continue;
    }

    if (
      food.status !== "available" ||
      !food.expiryTime ||
      Number.isNaN(new Date(food.expiryTime).getTime()) ||
      new Date(food.expiryTime).getTime() <= now.getTime()
    ) {
      skip("Food is unavailable or expired.");
      continue;
    }

    if (normalize(food.unit) !== "meals") {
      skip("Automatic allocation currently supports meals only.");
      continue;
    }

    const inventoryLeft = remainingFood.get(foodId) || 0;
    const demandLeft = remainingDemand.get(organizationId) || 0;

    if (inventoryLeft <= 0) {
      skip("No unallocated food quantity remains.");
      continue;
    }

    if (demandLeft <= 0) {
      skip("Organization demand has already been satisfied.");
      continue;
    }

    const proposedQuantity = Math.min(
      inventoryLeft,
      demandLeft,
      toNonNegativeNumber(match?.matching?.proposedMeals)
    );

    if (proposedQuantity <= 0) {
      skip("No valid quantity can be allocated.");
      continue;
    }

    allocations.push({
      foodId,
      foodName: food.foodName,
      organizationId,
      organizationName: match.organization.name,
      quantity: proposedQuantity,
      unit: "meals",
      priority: match.food.priority,
      expiresAt: food.expiryTime,
      status: "proposed",
      reason:
        "Quantity fits the remaining inventory and organization demand; safety review is approved.",
    });

    // Update only this analysis run's local counters.
    remainingFood.set(foodId, inventoryLeft - proposedQuantity);
    remainingDemand.set(organizationId, demandLeft - proposedQuantity);
  }

  return {
    analyzedAt: now,
    summary: {
      proposedAllocations: allocations.length,
      proposedMeals: allocations.reduce(
        (total, allocation) => total + allocation.quantity,
        0
      ),
      skippedMatches: skipped.length,
    },
    allocations,
    skipped,
  };
};

module.exports = { negotiateAndAllocate };
