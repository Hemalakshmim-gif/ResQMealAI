
require("dotenv").config();

const mongoose = require("mongoose");
const connectDB = require("./src/config/db");
const FoodInventory = require("./src/models/FoodInventory");
const FoodSafetyReview = require("./src/models/FoodSafetyReview");

const runTest = async () => {
  let createdReviewId;

  try {
    await connectDB();

    const food = await FoodInventory.findOne({
      foodName: "Deletion Test Meals",
    }).lean();

    if (!food) {
      throw new Error(
        "Test food not found. No review was created."
      );
    }

    const review = await FoodSafetyReview.create({
      food: food._id,
      reviewStatus: "pending",
      storageVerified: false,
      packagingVerified: false,
      handlingVerified: false,
      reviewNotes: "Initial model persistence test only.",
    });

    createdReviewId = review._id;

    console.log("\nREVIEW SAVED");
    console.log({
      reviewId: String(review._id),
      foodId: String(review.food),
      reviewStatus: review.reviewStatus,
    });

    const retrievedReview = await FoodSafetyReview.findById(
      review._id
    )
      .populate("food", "foodName status expiryTime")
      .lean();

    console.log("\nREVIEW RETRIEVED");
    console.log(JSON.stringify(retrievedReview, null, 2));

    if (
      !retrievedReview ||
      retrievedReview.reviewStatus !== "pending" ||
      !retrievedReview.food ||
      retrievedReview.food.foodName !== "Deletion Test Meals"
    ) {
      throw new Error("Saved review did not pass verification.");
    }

    console.log("\nPASS: Review saved and retrieved correctly.");
    console.log(
      "The inventory record was not modified by this test."
    );
  } catch (error) {
    console.error("\nFAIL:", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
};

runTest();
