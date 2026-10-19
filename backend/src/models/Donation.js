
const mongoose = require("mongoose");

const donationSchema = new mongoose.Schema(
  {
    food: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "FoodInventory",
      required: [true, "Food listing is required"]
    },

    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: [true, "Recipient organization is required"]
    },

    quantity: {
      type: Number,
      required: [true, "Donation quantity is required"],
      min: [0.1, "Quantity must be greater than zero"]
    },

    status: {
      type: String,
      enum: [
        "pending",
        "accepted",
        "rejected",
        "preparing",
        "picked_up",
        "delivered",
        "cancelled"
      ],
      default: "pending"
    },

    notes: {
      type: String,
      trim: true,
      default: ""
    },

    requestedAt: {
      type: Date,
      default: Date.now
    },

    deliveredAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("Donation", donationSchema);
