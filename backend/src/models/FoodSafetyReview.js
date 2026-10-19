
const mongoose = require("mongoose");

const foodSafetyReviewSchema = new mongoose.Schema(
  {
    food: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "FoodInventory",
      required: true,
      index: true,
    },

    reviewStatus: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
      required: true,
    },

    storageVerified: {
      type: Boolean,
      default: false,
    },

    packagingVerified: {
      type: Boolean,
      default: false,
    },

    handlingVerified: {
      type: Boolean,
      default: false,
    },

    reviewedBy: {
      type: String,
      trim: true,
      default: "",
    },

    reviewNotes: {
      type: String,
      trim: true,
      default: "",
    },

    reviewedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

foodSafetyReviewSchema.index(
  { food: 1, createdAt: -1 }
);

module.exports = mongoose.model(
  "FoodSafetyReview",
  foodSafetyReviewSchema
);
