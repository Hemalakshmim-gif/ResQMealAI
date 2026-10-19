
const mongoose = require("mongoose");

const deliverySchema = new mongoose.Schema(
  {
    donation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Donation",
      required: [true, "Donation reference is required"]
    },

    driver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Driver",
      default: null
    },

    status: {
      type: String,
      enum: [
        "pending",
        "assigned",
        "picked_up",
        "in_transit",
        "delivered",
        "failed",
        "cancelled"
      ],
      default: "pending"
    },

    pickupAddress: {
      type: String,
      required: [true, "Pickup address is required"],
      trim: true
    },

    deliveryAddress: {
      type: String,
      required: [true, "Delivery address is required"],
      trim: true
    },

    plannedPickupAt: {
      type: Date,
      default: null
    },

    pickedUpAt: {
      type: Date,
      default: null
    },

    deliveredAt: {
      type: Date,
      default: null
    },

    failureReason: {
      type: String,
      trim: true,
      default: ""
    },

    notes: {
      type: String,
      trim: true,
      default: ""
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("Delivery", deliverySchema);
