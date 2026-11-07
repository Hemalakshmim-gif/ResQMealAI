const mongoose = require("mongoose");

const driverSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Driver name is required"],
      trim: true
    },

    phone: {
      type: String,
      required: [true, "Driver phone number is required"],
      trim: true
    },

    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: ""
    },

    // Hashed password for independent driver login
    password: {
      type: String,
      select: false
    },

    vehicleType: {
      type: String,
      required: [true, "Vehicle type is required"],
      enum: ["bicycle", "motorcycle", "car", "van", "truck", "other"]
    },

    capacityMeals: {
      type: Number,
      required: [true, "Vehicle capacity is required"],
      min: [1, "Capacity must be at least one meal"]
    },

    status: {
      type: String,
      enum: ["available", "assigned", "unavailable"],
      default: "available"
    },

    currentLocation: {
      type: String,
      trim: true,
      default: ""
    },

    demoSeedKey: {
      type: String,
      select: false
    }
  },
  {
    timestamps: true
  }
);

// Enforce unique email addresses for drivers who have an email.
// Existing records with an empty email will not conflict.
driverSchema.index(
  { email: 1 },
  {
    unique: true,
    partialFilterExpression: {
      email: { $type: "string", $gt: "" }
    }
  }
);

driverSchema.index(
  { demoSeedKey: 1 },
  { unique: true, sparse: true }
);

module.exports = mongoose.model("Driver", driverSchema);