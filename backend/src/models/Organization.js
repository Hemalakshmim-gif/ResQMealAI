
const mongoose = require("mongoose");

const organizationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Organization name is required"],
      trim: true
    },

    type: {
      type: String,
      required: [true, "Organization type is required"],
      enum: [
        "restaurant",
        "hotel",
        "supermarket",
        "ngo",
        "food_bank",
        "shelter"
      ]
    },

    email: {
      type: String,
      required: [true, "Email is required"],
      trim: true,
      lowercase: true
    },

    
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [8, "Password must be at least 8 characters"],
      select: false
    },

    phone: {
      type: String,
      required: [true, "Phone number is required"],
      trim: true
    },

    address: {
      type: String,
      required: [true, "Address is required"],
      trim: true
    },

    city: {
      type: String,
      required: [true, "City is required"],
      trim: true
    },

    acceptedFoodTypes: {
      type: [String],
      enum: [
        "cooked",
        "raw",
        "packaged",
        "bakery",
        "dairy",
        "produce",
        "other"
      ],
      default: []
    },

    
    requestedFoodTypes: {
      type: [String],
      enum: [
        "cooked",
        "raw",
        "packaged",
        "bakery",
        "dairy",
        "produce",
        "other"
      ],
      default: []
    },

    requestedMeals: {
      type: Number,
      min: [0, "Requested meals cannot be negative"],
      default: 0
    },


    capacityMeals: {
      type: Number,
      min: [0, "Capacity cannot be negative"],
      default: 0
    },

    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model(
  "Organization",
  organizationSchema
);
