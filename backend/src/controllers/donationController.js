
const mongoose = require("mongoose");
const Donation = require("../models/Donation");
const FoodInventory = require("../models/FoodInventory");
const Organization = require("../models/Organization");
const FoodSafetyReview = require("../models/FoodSafetyReview");
const { evaluateFoodSafety } = require("../agents/foodSafetyEligibilityAgent");

// CREATE: Request a donation
const createDonation = async (req, res) => {
  try {
    const { food, recipient, quantity, notes } = req.body;

    if (
      !mongoose.isValidObjectId(food) ||
      !mongoose.isValidObjectId(recipient)
    ) {
      return res.status(400).json({
        success: false,
        message: "Valid food and recipient IDs are required"
      });
    }

    const requestedQuantity = Number(quantity);

    if (
      quantity === undefined ||
      quantity === null ||
      quantity === "" ||
      !Number.isFinite(requestedQuantity) ||
      requestedQuantity <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Quantity must be a number greater than zero"
      });
    }

    const foodItem = await FoodInventory.findById(food);

    if (!foodItem) {
      return res.status(404).json({
        success: false,
        message: "Food listing not found"
      });
    }

    if (foodItem.status !== "available") {
      return res.status(400).json({
        success: false,
        message: "Food listing is not available for donation"
      });
    }

    // Enforce the existing food-safety eligibility rules.
const latestReview = await FoodSafetyReview.findOne({
  food: foodItem._id
}).sort({ createdAt: -1, _id: -1 }).lean();

const safetyResult = evaluateFoodSafety(
  foodItem.toObject(),
  new Date(),
  latestReview
);

if (!safetyResult.canBeRecommended) {
  return res.status(400).json({
    success: false,
    message: "Food has not passed the required safety review",
    eligibilityStatus: safetyResult.eligibilityStatus,
    safetyStatus: safetyResult.safetyStatus,
    reasons: safetyResult.reasons,
    reviewFlags: safetyResult.reviewFlags
  });
}

    
if (
  !foodItem.expiryTime ||
  new Date(foodItem.expiryTime).getTime() <= Date.now()
) {
  return res.status(400).json({
    success: false,
    message: "Food has expired or has no valid expiry time and cannot be donated"
  });
}


    
const existingAllocations = await Donation.aggregate([
  {
    $match: {
      food: foodItem._id,
      status: {
        $nin: ["rejected", "cancelled"]
      }
    }
  },
  {
    $group: {
      _id: null,
      totalQuantity: { $sum: "$quantity" }
    }
  }
]);

const alreadyAllocated =
  existingAllocations.length > 0
    ? existingAllocations[0].totalQuantity
    : 0;

const remainingQuantity =
  foodItem.quantity - alreadyAllocated;

if (requestedQuantity > remainingQuantity) {
  return res.status(400).json({
    success: false,
    message: "Donation quantity exceeds the remaining available food quantity",
    availableQuantity: Math.max(0, remainingQuantity),
    alreadyAllocated
  });
}


    const organization = await Organization.findById(recipient);

    if (!organization) {
      return res.status(404).json({
        success: false,
        message: "Recipient organization not found"
      });
    }

    if (!organization.isActive) {
      return res.status(400).json({
        success: false,
        message: "Recipient organization is inactive"
      });
    }

    const donation = await Donation.create({
      food,
      recipient,
      quantity: requestedQuantity,
      notes
    });

    const populatedDonation = await Donation.findById(donation._id)
      .populate("food")
      .populate("recipient");

    return res.status(201).json({
      success: true,
      message: "Donation request created successfully",
      data: populatedDonation
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: "Could not create donation",
      error: error.message
    });
  }
};

// READ ALL: Get all donation requests
const getAllDonations = async (req, res) => {
  try {
    const donations = await Donation.find()
      .populate("food")
      .populate("recipient")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: donations.length,
      data: donations
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Could not retrieve donations",
      error: error.message
    });
  }
};

// READ ONE: Get a donation by ID
const getDonationById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid donation ID"
      });
    }

    const donation = await Donation.findById(id)
      .populate("food")
      .populate("recipient");

    if (!donation) {
      return res.status(404).json({
        success: false,
        message: "Donation not found"
      });
    }

    return res.status(200).json({
      success: true,
      data: donation
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Could not retrieve donation",
      error: error.message
    });
  }
};

// UPDATE: Update donation status or notes

const updateDonation = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid donation ID"
      });
    }

    const allowedFields = ["status", "notes"];
    const updates = {};

    for (const field of allowedFields) {
      if (Object.prototype.hasOwnProperty.call(req.body, field)) {
        updates[field] = req.body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: "Provide a valid status or notes field"
      });
    }

    const donation = await Donation.findById(id);

    if (!donation) {
      return res.status(404).json({
        success: false,
        message: "Donation not found"
      });
    }

    const allowedTransitions = {
      pending: ["accepted", "rejected", "cancelled"],
      accepted: ["preparing", "cancelled"],
      preparing: ["picked_up", "cancelled"],
      picked_up: ["delivered"],
      rejected: [],
      delivered: [],
      cancelled: []
    };

    if (Object.prototype.hasOwnProperty.call(updates, "status")) {
      const nextStatus = updates.status;

      if (nextStatus !== donation.status) {
        const allowedNextStatuses =
          allowedTransitions[donation.status] || [];

        if (!allowedNextStatuses.includes(nextStatus)) {
          return res.status(400).json({
            success: false,
            message: `Cannot change donation status from '${donation.status}' to '${nextStatus}'`
          });
        }
      }

      if (nextStatus === "delivered" && !donation.deliveredAt) {
        updates.deliveredAt = new Date();
      }
    }

    const updatedDonation = await Donation.findByIdAndUpdate(
      id,
      { $set: updates },
      {
        returnDocument: "after",
        runValidators: true
      }
    )
      .populate("food")
      .populate("recipient");

    return res.status(200).json({
      success: true,
      message: "Donation updated successfully",
      data: updatedDonation
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: "Could not update donation",
      error: error.message
    });
  }
};


// DELETE: Delete a test donation record

const deleteDonation = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid donation ID"
      });
    }

    const donation = await Donation.findById(id);

    if (!donation) {
      return res.status(404).json({
        success: false,
        message: "Donation not found"
      });
    }

    const protectedStatuses = [
      "accepted",
      "preparing",
      "picked_up",
      "delivered"
    ];

    if (protectedStatuses.includes(donation.status)) {
      return res.status(400).json({
        success: false,
        message:
          "This donation cannot be deleted because it has progressed beyond the pending stage. Cancel it where permitted or preserve its history."
      });
    }

    const Delivery = require("../models/Delivery");

    const existingDelivery = await Delivery.findOne({
      donation: donation._id
    });

    if (existingDelivery) {
      return res.status(400).json({
        success: false,
        message:
          "This donation has a linked delivery record and cannot be deleted."
      });
    }

    await Donation.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: "Donation deleted successfully"
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Could not delete donation",
      error: error.message
    });
  }
};


module.exports = {
  createDonation,
  getAllDonations,
  getDonationById,
  updateDonation,
  deleteDonation
};
