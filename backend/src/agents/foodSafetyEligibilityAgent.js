
const FoodInventory = require("../models/FoodInventory");
const FoodSafetyReview = require("../models/FoodSafetyReview");

const ALLOWED_FOOD_TYPES = [
  "cooked",
  "raw",
  "packaged",
  "bakery",
  "dairy",
  "produce",
  "other",
];

const ALLOWED_UNITS = [
  "kg",
  "grams",
  "litres",
  "meals",
  "packets",
];

const evaluateFoodSafety = (food, now = new Date(), review = null) => {
  const reasons = [];
  const reviewFlags = [];

  // Validate the food record.
  if (!food || typeof food !== "object") {
    return {
      eligibilityStatus: "ineligible",
      safetyStatus: "not_verified",
      canBeRecommended: false,
      reasons: ["A valid food record is required."],
      reviewFlags: [],
    };
  }

  if (!food.foodName || !String(food.foodName).trim()) {
    reasons.push("Food name is missing.");
  }

  if (
    food.quantity === null ||
    food.quantity === undefined ||
    food.quantity === "" ||
    !Number.isFinite(Number(food.quantity)) ||
    Number(food.quantity) <= 0
  ) {
    reasons.push("Food quantity must be greater than zero.");
  }

  if (!ALLOWED_UNITS.includes(food.unit)) {
    reasons.push("Food unit is missing or unsupported.");
  }

  if (!ALLOWED_FOOD_TYPES.includes(food.foodType)) {
    reasons.push("Food type is missing or unsupported.");
  }

  if (food.status !== "available") {
    reasons.push(
      `Food status is '${food.status}', not 'available'.`
    );
  }

  // Validate expiry time.
  if (!food.expiryTime) {
    reasons.push("Expiry information is missing.");
  } else {
    const expiryTime = new Date(food.expiryTime);

    if (Number.isNaN(expiryTime.getTime())) {
      reasons.push("Expiry information is invalid.");
    } else if (expiryTime.getTime() <= now.getTime()) {
      reasons.push("The recorded expiry time has passed.");
    }
  }

  // Invalid inventory cannot be approved.
  if (reasons.length > 0) {
    return {
      eligibilityStatus: "ineligible",
      safetyStatus: "not_verified",
      canBeRecommended: false,
      reasons,
      reviewFlags,
    };
  }

  // A rejected safety review blocks eligibility.
  if (review && review.reviewStatus === "rejected") {
    return {
      eligibilityStatus: "ineligible",
      safetyStatus: "rejected",
      canBeRecommended: false,
      reasons: ["Food safety review was rejected."],
      reviewFlags: [],
    };
  }

  const reviewedAt = review && review.reviewedAt
    ? new Date(review.reviewedAt)
    : null;

  // Approval requires all verification checks and reviewer details.
  const verificationComplete =
    review?.reviewStatus === "approved" &&
    review.storageVerified === true &&
    review.packagingVerified === true &&
    review.handlingVerified === true &&
    typeof review.reviewedBy === "string" &&
    Boolean(review.reviewedBy.trim()) &&
    reviewedAt !== null &&
    !Number.isNaN(reviewedAt.getTime()) &&
    reviewedAt.getTime() <= now.getTime();

  if (verificationComplete) {
    return {
      eligibilityStatus: "approved",
      safetyStatus: "verified_by_review",
      canBeRecommended: true,
      reasons: [],
      reviewFlags: [],
    };
  }

  // Check provider and pickup information.
  if (!food.providerName || !String(food.providerName).trim()) {
    reviewFlags.push("Provider information is missing.");
  }

  if (!food.pickupAddress || !String(food.pickupAddress).trim()) {
    reviewFlags.push("Pickup address is missing.");
  }

  // Check whether a safety review exists.
  if (!review) {
    reviewFlags.push("No safety review record exists.");
  }

  // Check incomplete or invalid approval details.
  if (review?.reviewStatus === "approved") {
    if (review.storageVerified !== true) {
      reviewFlags.push("Storage conditions require verification.");
    }

    if (review.packagingVerified !== true) {
      reviewFlags.push("Packaging integrity requires verification.");
    }

    if (review.handlingVerified !== true) {
      reviewFlags.push("Food handling requires verification.");
    }

    if (
      typeof review.reviewedBy !== "string" ||
      !review.reviewedBy.trim()
    ) {
      reviewFlags.push("A named reviewer is required.");
    }

    if (!reviewedAt || Number.isNaN(reviewedAt.getTime())) {
      reviewFlags.push("A valid review timestamp is required.");
    } else if (reviewedAt.getTime() > now.getTime()) {
      reviewFlags.push("The review timestamp cannot be in the future.");
    }
  } else {
    if (review?.storageVerified !== true) {
      reviewFlags.push("Storage conditions require verification.");
    }

    if (review?.packagingVerified !== true) {
      reviewFlags.push("Packaging integrity requires verification.");
    }

    if (review?.handlingVerified !== true) {
      reviewFlags.push("Food handling requires verification.");
    }

    if (
      typeof review?.reviewedBy !== "string" ||
      !review.reviewedBy.trim()
    ) {
      reviewFlags.push("A named reviewer is required.");
    }

    if (review?.reviewStatus === "pending") {
      reviewFlags.push("Safety review is still pending.");
    }
  }

  return {
    eligibilityStatus: "requires_safety_review",
    safetyStatus: "not_verified",
    canBeRecommended: false,
    reasons: [],
    reviewFlags,
  };
};

const analyzeFoodSafety = async () => {
  const now = new Date();

  // Read inventory without modifying existing records.
  const foods = await FoodInventory.find().lean();

  // Retrieve safety reviews for the inventory records.
  const reviews = await FoodSafetyReview.find({
    food: { $in: foods.map((food) => food._id) },
  })
    .sort({ createdAt: -1, _id: -1 })
    .lean();

  // Select the latest review for each food item.
  const latestReviewByFoodId = new Map();

  for (const review of reviews) {
    const foodId = String(review.food);

    if (!latestReviewByFoodId.has(foodId)) {
      latestReviewByFoodId.set(foodId, review);
    }
  }

  const results = foods.map((food) => {
    const review =
      latestReviewByFoodId.get(String(food._id)) || null;

    return {
      _id: food._id,
      foodName: food.foodName,
      quantity: food.quantity,
      unit: food.unit,
      foodType: food.foodType,
      status: food.status,
      ...evaluateFoodSafety(food, now, review),
      reviewId: review ? review._id : null,
      reviewStatus: review ? review.reviewStatus : "pending",
    };
  });

  return {
    analyzedAt: now,
    summary: {
      totalRecords: results.length,
      approved: results.filter(
        (food) => food.eligibilityStatus === "approved"
      ).length,
      ineligible: results.filter(
        (food) => food.eligibilityStatus === "ineligible"
      ).length,
      requiresSafetyReview: results.filter(
        (food) =>
          food.eligibilityStatus === "requires_safety_review"
      ).length,
    },
    results,
  };
};

module.exports = {
  evaluateFoodSafety,
  analyzeFoodSafety,
};
