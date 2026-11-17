const mongoose = require("mongoose");
const FoodInventory = require("../models/FoodInventory");
const FoodSafetyReview = require("../models/FoodSafetyReview");
const { evaluateFoodSafety } = require("./foodSafetyEligibilityAgent");
const { createAgentResult } = require("./agentResult");

async function runSafetyAgent({
  foodIds,
  predictedSurplus = [],
  now = new Date()
}) {
  const startedAt = new Date();

  if (!Array.isArray(predictedSurplus)) {
    throw new Error("predictedSurplus must be an array.");
  }

  const requestedFoodIds = foodIds === undefined
    ? predictedSurplus.map((food) => food?.foodId)
    : foodIds;

  if (
    !Array.isArray(requestedFoodIds) ||
    requestedFoodIds.length === 0 ||
    requestedFoodIds.some((id) => !mongoose.isValidObjectId(id))
  ) {
    throw new Error("At least one valid food ID is required.");
  }

  if (Number.isNaN(new Date(now).getTime())) {
    throw new Error("A valid safety assessment time is required.");
  }

  const uniqueFoodIds = [...new Set(requestedFoodIds.map(String))];
  const predictionByFoodId = new Map(
    predictedSurplus.map((prediction) => [
      String(prediction?.foodId || ""),
      prediction
    ])
  );
  const foods = await FoodInventory.find({
    _id: { $in: uniqueFoodIds }
  }).lean();
  const reviews = await FoodSafetyReview.find({
    food: { $in: foods.map((food) => food._id) }
  })
    .sort({ createdAt: -1, _id: -1 })
    .lean();

  const latestReviewByFoodId = new Map();
  for (const review of reviews) {
    const id = String(review.food);
    if (!latestReviewByFoodId.has(id)) {
      latestReviewByFoodId.set(id, review);
    }
  }

  const foodById = new Map(
    foods.map((food) => [String(food._id), food])
  );
  const assessments = uniqueFoodIds.map((foodId) => {
    const food = foodById.get(foodId);

    if (!food) {
      return {
        foodId,
        foodName: null,
        safetyStatus: "UNSAFE",
        eligibleForDonation: false,
        eligibilityStatus: "ineligible",
        reasons: ["Food listing was not found."]
      };
    }

    const review = latestReviewByFoodId.get(foodId) || null;
    const prediction = predictionByFoodId.get(foodId);
    const evaluation = evaluateFoodSafety(
      food,
      new Date(now),
      review
    );
    const safetyStatus = evaluation.canBeRecommended
      ? "SAFE"
      : evaluation.eligibilityStatus === "requires_safety_review"
        ? "WARNING"
        : "UNSAFE";

    return {
      foodId,
      foodName: food.foodName,
      quantity: food.quantity,
      unit: food.unit,
      foodType: food.foodType,
      expiryTime: food.expiryTime,
      safetyStatus,
      eligibleForDonation: safetyStatus === "SAFE",
      potentialSurplus:
        typeof prediction?.quantity === "number"
          ? prediction.quantity
          : null,
      predictionMethod: prediction?.predictionMethod || null,
      eligibilityStatus: evaluation.eligibilityStatus,
      reviewId: review ? String(review._id) : null,
      reviewStatus: review?.reviewStatus || "pending",
      reasons: evaluation.reasons,
      reviewFlags: evaluation.reviewFlags
    };
  });

  const status = assessments.some(
    (assessment) => assessment.safetyStatus === "WARNING"
  )
    ? "WAITING_FOR_APPROVAL"
    : "COMPLETED";

  return createAgentResult({
    agent: "Safety Agent",
    status,
    startedAt,
    input: { foodIds: uniqueFoodIds },
    output: {
      assessments,
      safeFoodIds: assessments
        .filter((assessment) => assessment.safetyStatus === "SAFE")
        .map((assessment) => assessment.foodId),
      warningFoodIds: assessments
        .filter((assessment) => assessment.safetyStatus === "WARNING")
        .map((assessment) => assessment.foodId),
      unsafeFoodIds: assessments
        .filter((assessment) => assessment.safetyStatus === "UNSAFE")
        .map((assessment) => assessment.foodId)
    }
  });
}

module.exports = { runSafetyAgent };
