
const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    eventKey: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },

    title: {
      type: String,
      required: true,
      trim: true
    },

    desc: {
      type: String,
      required: true,
      trim: true
    },

    category: {
      type: String,
      required: true,
      enum: [
        "Surplus",
        "Donation",
        "Delivery",
        "Driver",
        "Food Safety",
        "System"
      ]
    },

    severity: {
      type: String,
      enum: ["info", "success", "warning", "critical"],
      default: "info"
    },

    sourceType: {
      type: String,
      enum: [
        "inventory",
        "donation",
        "delivery",
        "driver",
        "foodSafety",
        "system"
      ],
      required: true
    },

    sourceId: {
      type: String,
      default: ""
    },

    read: {
      type: Boolean,
      default: false
    },

    occurredAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

notificationSchema.index({ createdAt: -1 });

module.exports = mongoose.model(
  "Notification",
  notificationSchema
);
