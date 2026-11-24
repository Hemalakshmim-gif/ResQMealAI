
const mongoose = require("mongoose");
const coordinatesSchema = require("./coordinatesSchema");

const locationSchema = new mongoose.Schema(
  {
    latitude: {
      type: Number,
      required: true,
      min: -90,
      max: 90
    },
    longitude: {
      type: Number,
      required: true,
      min: -180,
      max: 180
    },
    accuracy: {
      type: Number,
      required: true,
      min: 0
    },
    heading: {
      type: Number,
      min: 0,
      max: 360,
      default: undefined
    },
    speed: {
      type: Number,
      min: 0,
      default: undefined
    },
    updatedAt: {
      type: Date,
      required: true
    }
  },
  { _id: false }
);

const TERMINAL_STATUSES = new Set([
  "delivered",
  "failed",
  "cancelled"
]);

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

    pickupCoordinates: {
      type: coordinatesSchema,
      default: undefined
    },

    deliveryCoordinates: {
      type: coordinatesSchema,
      default: undefined
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

    latestLocation: {
      type: locationSchema,
      default: undefined
    },

    trackingActive: {
      type: Boolean,
      default: false
    },

    trackingStartedAt: {
      type: Date,
      default: null
    },

    trackingStoppedAt: {
      type: Date,
      default: null
    },

    lastEtaNotificationAt: {
      type: Date,
      default: null
    },

    lastEtaNotificationMinutes: {
      type: Number,
      default: null
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

deliverySchema.pre("save", function stopTrackingOnTerminalSave() {
  if (
    this.isModified("status") &&
    TERMINAL_STATUSES.has(this.status)
  ) {
    this.trackingActive = false;
    this.trackingStoppedAt = new Date();
  }
});

function stopTrackingOnTerminalUpdate() {
  const update = this.getUpdate();

  if (!update || Array.isArray(update)) {
    return;
  }

  const nextStatus = update.$set?.status ?? update.status;

  if (TERMINAL_STATUSES.has(nextStatus)) {
    update.$set = {
      ...(update.$set || {}),
      trackingActive: false,
      trackingStoppedAt: new Date()
    };
    this.setUpdate(update);
  }
}

deliverySchema.pre(
  "findOneAndUpdate",
  stopTrackingOnTerminalUpdate
);
deliverySchema.pre("updateOne", stopTrackingOnTerminalUpdate);

module.exports = mongoose.model("Delivery", deliverySchema);
