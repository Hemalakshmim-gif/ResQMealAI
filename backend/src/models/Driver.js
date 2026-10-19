
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

    vehicleType: {
      type: String,
      required: [true, "Vehicle type is required"],
      enum: [
        "bicycle",
        "motorcycle",
        "car",
        "van",
        "truck",
        "other"
      ]
    },

    capacityMeals: {
      type: Number,
      required: [true, "Vehicle capacity is required"],
      min: [1, "Capacity must be at least one meal"]
    },

    status: {
      type: String,
      enum: [
        "available",
        "assigned",
        "unavailable"
      ],
      default: "available"
    },

    currentLocation: {
      type: String,
      trim: true,
      default: ""
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("Driver", driverSchema);
