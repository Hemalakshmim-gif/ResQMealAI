
const mongoose = require("mongoose");

const settingsSchema = new mongoose.Schema(
  {
    userKey: {
      type: String,
      required: true,
      unique: true,
      default: "demo-admin"
    },
    profile: {
      name: { type: String, default: "" },
      email: { type: String, default: "" },
      org: { type: String, default: "" }
    },
    notifications: {
      donations: { type: Boolean, default: true },
      delivery: { type: Boolean, default: true },
      safety: { type: Boolean, default: true }
    },
    appearance: {
      theme: {
        type: String,
        enum: ["light", "dark"],
        default: "light"
      },
      density: {
        type: String,
        enum: ["comfortable", "compact"],
        default: "comfortable"
      }
    },
    food: {
      categories: {
        type: [String],
        default: ["Cooked Meals", "Vegetables", "Fruits"]
      },
      pickupTime: { type: String, default: "Any time" },
      serviceRadius: { type: Number, default: 10, min: 1 }
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Settings", settingsSchema);
