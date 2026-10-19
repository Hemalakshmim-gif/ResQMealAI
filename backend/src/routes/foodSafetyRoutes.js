
const express = require("express");
const mongoose = require("mongoose");

const FoodInventory = require("../models/FoodInventory");
const FoodSafetyReview = require("../models/FoodSafetyReview");

const {
  evaluateFoodSafety,
} = require("../agents/foodSafetyEligibilityAgent");

const router = express.Router();

// GET /api/food-safety/analyze
// Returns the latest safety decision for each food listing.
router.get("/analyze", async (req, res) => {
  try {
    const now = new Date();
    const foods = await FoodInventory.find().lean();

    const results = await Promise.all(
      foods.map(async (food) => {
        const review = await FoodSafetyReview.findOne({
          food: food._id,
        })
          .sort({ createdAt: -1, _id: -1 })
          .lean();

        const safety = evaluateFoodSafety(food, now, review);

        return {
          id: food._id,
          foodName: food.foodName,
          quantity: food.quantity,
          unit: food.unit,
          foodType: food.foodType,
          expiryTime: food.expiryTime,
          status: food.status,
          eligibilityStatus: safety.eligibilityStatus,
          canBeRecommended: safety.canBeRecommended,
          reasons: safety.reasons,
          reviewFlags: safety.reviewFlags,
          reviewId: review?._id || null,
          reviewStatus: review?.reviewStatus || "pending",
        };
      })
    );

    return res.status(200).json({
      success: true,
      count: results.length,
      data: results,
    });
  } catch (error) {
    console.error("Food safety analysis failed:", error);

    return res.status(500).json({
      success: false,
      message: "Could not analyze food safety",
    });
  }
});

// POST /api/food-safety/reviews
// Records a safety review without bypassing eligibility checks.
router.post("/reviews", async (req, res) => {
  try {
    const {
      foodId,
      reviewStatus,
      storageVerified,
      packagingVerified,
      handlingVerified,
      reviewedBy,
      reviewNotes = "",
    } = req.body;

    if (!mongoose.isValidObjectId(foodId)) {
      return res.status(400).json({
        success: false,
        message: "A valid food ID is required.",
      });
    }

    if (!["approved", "rejected", "pending"].includes(reviewStatus)) {
      return res.status(400).json({
        success: false,
        message: "Review status must be approved, rejected, or pending.",
      });
    }

    if (
      typeof reviewedBy !== "string" ||
      !reviewedBy.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Reviewer name is required.",
      });
    }

    const food = await FoodInventory.findById(foodId);

    if (!food) {
      return res.status(404).json({
        success: false,
        message: "Food listing was not found.",
      });
    }

    // Do not allow a review to make invalid or expired food eligible.
    const now = new Date();
    const inventoryCheck = evaluateFoodSafety(food, now, null);

    if (inventoryCheck.eligibilityStatus === "ineligible") {
      return res.status(400).json({
        success: false,
        message: "This food listing cannot be reviewed as eligible.",
        reasons: inventoryCheck.reasons,
      });
    }

    const allChecksPassed =
      storageVerified === true &&
      packagingVerified === true &&
      handlingVerified === true;

    if (reviewStatus === "approved" && !allChecksPassed) {
      return res.status(400).json({
        success: false,
        message:
          "Approval requires storage, packaging, and handling verification.",
      });
    }

    const review = await FoodSafetyReview.create({
      food: food._id,
      reviewStatus,
      storageVerified: storageVerified === true,
      packagingVerified: packagingVerified === true,
      handlingVerified: handlingVerified === true,
      reviewedBy: reviewedBy.trim(),
      reviewNotes:
        typeof reviewNotes === "string" ? reviewNotes.trim() : "",
      reviewedAt: now,
    });

    const safety = evaluateFoodSafety(food, now, review);

    return res.status(201).json({
      success: true,
      message: "Food safety review recorded.",
      data: {
        reviewId: review._id,
        foodId: food._id,
        foodName: food.foodName,
        reviewStatus: review.reviewStatus,
        eligibilityStatus: safety.eligibilityStatus,
        canBeRecommended: safety.canBeRecommended,
        reasons: safety.reasons,
        reviewFlags: safety.reviewFlags,
      },
    });
  } catch (error) {
    console.error("Food safety review failed:", error);

    return res.status(500).json({
      success: false,
      message: "Could not save food safety review.",
    });
  }
});

module.exports = router;
