
const mongoose = require("mongoose");
const FoodInventory = require("../models/FoodInventory");

// Validate expiry when food is marked as available.
function validateAvailableFoodExpiry(expiryTime, status) {
  if (status !== "available") {
    return null;
  }

  if (!expiryTime) {
    return "Expiry time is required for available food.";
  }

  const expiry = new Date(expiryTime);

  if (Number.isNaN(expiry.getTime())) {
    return "A valid expiry time is required for available food.";
  }

  if (expiry <= new Date()) {
    return "Expired food cannot be listed as available.";
  }

  return null;
}

// CREATE: Add a new food listing
const createFood = async (req, res) => {
  try {
    const expiryError = validateAvailableFoodExpiry(
      req.body.expiryTime,
      req.body.status || "available"
    );

    if (expiryError) {
      return res.status(400).json({
        success: false,
        message: expiryError
      });
    }

    const food = await FoodInventory.create(req.body);

    return res.status(201).json({
      success: true,
      message: "Food listing created successfully",
      data: food
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: "Could not create food listing",
      error: error.message
    });
  }
};

// READ ALL: Get all food listings
const getAllFood = async (req, res) => {
  try {
    const foods = await FoodInventory.find().sort({
      createdAt: -1
    });

    return res.status(200).json({
      success: true,
      count: foods.length,
      data: foods
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Could not retrieve food listings",
      error: error.message
    });
  }
};

// READ ONE: Get a food listing by its MongoDB ID
const getFoodById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid food listing ID"
      });
    }

    const food = await FoodInventory.findById(id);

    if (!food) {
      return res.status(404).json({
        success: false,
        message: "Food listing not found"
      });
    }

    return res.status(200).json({
      success: true,
      data: food
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Could not retrieve food listing",
      error: error.message
    });
  }
};

// UPDATE: Update selected fields of a food listing

const updateFood = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid food listing ID"
      });
    }

    // Only allow fields defined for editable inventory data.
    const allowedFields = [
      "foodName",
      "quantity",
      "unit",
      "providerName",
      "pickupAddress",
      "expiryTime",
      "foodType",
      "status",
      "description"
    ];

    const updates = {};

    for (const field of allowedFields) {
      if (Object.prototype.hasOwnProperty.call(req.body, field)) {
        updates[field] = req.body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: "Provide at least one valid field to update"
      });
    }

    // Fetch the current record so unchanged fields are also validated.
    const currentFood = await FoodInventory.findById(id);

    if (!currentFood) {
      return res.status(404).json({
        success: false,
        message: "Food listing not found"
      });
    }

    const effectiveExpiry =
      updates.expiryTime ?? currentFood.expiryTime;

    const effectiveStatus =
      updates.status ?? currentFood.status;

    const expiryError = validateAvailableFoodExpiry(
      effectiveExpiry,
      effectiveStatus
    );

    if (expiryError) {
      return res.status(400).json({
        success: false,
        message: expiryError
      });
    }

    const food = await FoodInventory.findByIdAndUpdate(
      id,
      { $set: updates },
      {
        returnDocument: "after",
        runValidators: true
      }
    );

    if (!food) {
      return res.status(404).json({
        success: false,
        message: "Food listing not found"
      });
    }

    return res.status(200).json({
      success: true,
      message: "Food listing updated successfully",
      data: food
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: "Could not update food listing",
      error: error.message
    });
  }
};

// DELETE: Delete a food listing by its MongoDB ID
const deleteFood = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid food listing ID"
      });
    }

    const food = await FoodInventory.findByIdAndDelete(id);

    if (!food) {
      return res.status(404).json({
        success: false,
        message: "Food listing not found"
      });
    }

    return res.status(200).json({
      success: true,
      message: "Food listing deleted successfully",
      data: food
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Could not delete food listing",
      error: error.message
    });
  }
};

module.exports = {
  createFood,
  getAllFood,
  getFoodById,
  updateFood,
  deleteFood
};
