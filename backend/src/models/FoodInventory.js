
const mongoose = require("mongoose");

const foodInventorySchema = new mongoose.Schema(
  {
    foodName: {
      type: String,
      required: [true, "Food name is required"],
      trim: true
    },

    quantity: {
      type: Number,
      required: [true, "Quantity is required"],
      min: [0.1, "Quantity must be greater than zero"]
    },

    unit: {
      type: String,
      enum: ["kg", "grams", "litres", "meals", "packets"],
      default: "kg"
    },

    providerName: {
      type: String,
      required: [true, "Provider name is required"],
      trim: true
    },

    pickupAddress: {
      type: String,
      required: [true, "Pickup address is required"],
      trim: true
    },

    expiryTime: {
      type: Date,
      required: [true, "Expiry time is required"]
    },

    foodType: {
      type: String,
      enum: [
        "cooked",
        "raw",
        "packaged",
        "bakery",
        "dairy",
        "produce",
        "other"
      ],
      default: "other"
    },

    status: {
      type: String,
      enum: ["available", "reserved", "collected", "expired"],
      default: "available"
    },

    description: {
      type: String,
      trim: true,
      default: ""
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model(
  "FoodInventory",
  foodInventorySchema
);
