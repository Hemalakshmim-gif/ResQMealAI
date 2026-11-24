
const mongoose = require("mongoose");
const coordinatesSchema = require("./coordinatesSchema");

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
      enum: ["kg", "grams", "litres", "meals", "packets", "items"],
      default: "kg"
    },

    // Measured total edible food mass for listings counted in meals,
    // packets, or volume units. Enables weight-based impact calculations.
    weightKg: {
      type: Number,
      min: [0.001, "Measured food weight must be greater than zero"],
      default: null
    },

    providerName: {
      type: String,
      required: [true, "Provider name is required"],
      trim: true
    },

    providerOrganization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      default: null,
      index: true
    },

    pickupAddress: {
      type: String,
      required: [true, "Pickup address is required"],
      trim: true
    },

    pickupCoordinates: {
      type: coordinatesSchema,
      default: undefined
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
