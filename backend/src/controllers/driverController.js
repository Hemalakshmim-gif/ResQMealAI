
const mongoose = require("mongoose");
const Driver = require("../models/Driver");

// CREATE: Register a driver
const createDriver = async (req, res) => {
  try {
    const driver = await Driver.create(req.body);

    return res.status(201).json({
      success: true,
      message: "Driver registered successfully",
      data: driver
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: "Could not register driver",
      error: error.message
    });
  }
};

// READ ALL: Get all drivers
const getAllDrivers = async (req, res) => {
  try {
    const drivers = await Driver.find().sort({
      createdAt: -1
    });

    return res.status(200).json({
      success: true,
      count: drivers.length,
      data: drivers
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Could not retrieve drivers",
      error: error.message
    });
  }
};

// READ ONE: Get a driver by ID
const getDriverById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid driver ID"
      });
    }

    const driver = await Driver.findById(id);

    if (!driver) {
      return res.status(404).json({
        success: false,
        message: "Driver not found"
      });
    }

    return res.status(200).json({
      success: true,
      data: driver
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Could not retrieve driver",
      error: error.message
    });
  }
};

// UPDATE: Update selected driver fields
const updateDriver = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid driver ID"
      });
    }

    const allowedFields = [
      "name",
      "phone",
      "email",
      "vehicleType",
      "capacityMeals",
      "status",
      "currentLocation"
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

    const driver = await Driver.findByIdAndUpdate(
      id,
      { $set: updates },
      {
        returnDocument: "after",
        runValidators: true
      }
    );

    if (!driver) {
      return res.status(404).json({
        success: false,
        message: "Driver not found"
      });
    }

    return res.status(200).json({
      success: true,
      message: "Driver updated successfully",
      data: driver
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: "Could not update driver",
      error: error.message
    });
  }
};

// DELETE: Delete a test driver
const deleteDriver = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid driver ID"
      });
    }

    const driver = await Driver.findByIdAndDelete(id);

    if (!driver) {
      return res.status(404).json({
        success: false,
        message: "Driver not found"
      });
    }

    return res.status(200).json({
      success: true,
      message: "Driver deleted successfully",
      data: driver
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Could not delete driver",
      error: error.message
    });
  }
};

module.exports = {
  createDriver,
  getAllDrivers,
  getDriverById,
  updateDriver,
  deleteDriver
};
