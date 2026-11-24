
const mongoose = require("mongoose");
const Donation = require("../models/Donation");
const FoodInventory = require("../models/FoodInventory");
const Organization = require("../models/Organization");
const FoodSafetyReview = require("../models/FoodSafetyReview");
const Delivery = require("../models/Delivery");
const Driver = require("../models/Driver");
const { evaluateFoodSafety } = require("../agents/foodSafetyEligibilityAgent");
const { notifyRecipientOfProgress } = require("../services/deliveryProgressNotificationService");

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

// Create or assign the delivery for a provider-prepared donation.
const dispatchPreparedDonation = async (req, res) => {
  let claimedDriverId = null;
  try {
    if (req.organization?.role !== "provider") {
      return res.status(403).json({ success: false, message: "Only the food provider can dispatch this donation." });
    }
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid donation ID." });
    }

    const donation = await Donation.findById(req.params.id)
      .populate("food")
      .populate("recipient");
    if (!donation) return res.status(404).json({ success: false, message: "Donation not found." });
    if (donation.status !== "preparing") {
      return res.status(400).json({ success: false, message: "The provider must mark the donation as preparing before dispatch." });
    }

    const food = donation.food;
    const recipient = donation.recipient;
    if (!food || !recipient) {
      return res.status(400).json({ success: false, message: "The donation is missing its food or recipient record." });
    }
    if (!food.providerOrganization || String(food.providerOrganization) !== String(req.organization.id)) {
      return res.status(403).json({ success: false, message: "This donation does not belong to your provider account." });
    }
    if (!recipient.isActive || !recipient.address || !food.pickupAddress) {
      return res.status(400).json({ success: false, message: "A valid pickup address and active recipient address are required." });
    }
    const quantity = Number(donation.quantity);
    if (String(food.unit).toLowerCase() !== "meals" || !Number.isFinite(quantity) || quantity <= 0) {
      return res.status(400).json({ success: false, message: "Dispatch currently requires a positive quantity measured in meals." });
    }
    const latestReview = await FoodSafetyReview.findOne({ food: food._id }).sort({ createdAt: -1, _id: -1 }).lean();
    const safety = evaluateFoodSafety(food.toObject(), new Date(), latestReview);
    if (!safety.canBeRecommended) {
      return res.status(400).json({ success: false, message: "Food no longer passes safety and expiry checks.", reviewFlags: safety.reviewFlags, reasons: safety.reasons });
    }

    let delivery = await Delivery.findOne({ donation: donation._id });
    if (delivery?.driver) {
      const populated = await Delivery.findById(delivery._id).populate("driver").lean();
      return res.status(200).json({ success: true, message: "A driver is already assigned.", data: populated });
    }

    const candidates = await Driver.find({ status: "available", capacityMeals: { $gte: quantity } })
      .sort({ createdAt: 1 })
      .select("_id");
    for (const candidate of candidates) {
      const claimed = await Driver.findOneAndUpdate(
        { _id: candidate._id, status: "available", capacityMeals: { $gte: quantity } },
        { $set: { status: "assigned" } },
        { returnDocument: "after", runValidators: true }
      );
      if (claimed) {
        claimedDriverId = claimed._id;
        break;
      }
    }

    const driverId = claimedDriverId || null;
    if (delivery) {
      delivery = await Delivery.findOneAndUpdate(
        { _id: delivery._id, driver: null, status: "pending" },
        { $set: { driver: driverId, status: driverId ? "assigned" : "pending" } },
        { new: true }
      );
      if (!delivery) {
        if (claimedDriverId) await Driver.findOneAndUpdate({ _id: claimedDriverId, status: "assigned" }, { $set: { status: "available" } });
        const current = await Delivery.findOne({ donation: donation._id }).populate("driver").lean();
        return res.status(200).json({ success: true, message: "Delivery assignment was updated elsewhere.", data: current });
      }
    } else {
      try {
        delivery = await Delivery.create({
          donation: donation._id,
          driver: driverId,
          pickupAddress: food.pickupAddress,
          deliveryAddress: recipient.address,
          pickupCoordinates: food.pickupCoordinates,
          deliveryCoordinates: recipient.coordinates,
          status: driverId ? "assigned" : "pending",
          notes: driverId ? "Assigned from provider donation timeline." : "Awaiting an available driver."
        });
      } catch (error) {
        if (claimedDriverId) await Driver.findOneAndUpdate({ _id: claimedDriverId, status: "assigned" }, { $set: { status: "available" } });
        throw error;
      }
    }

    await notifyRecipientOfProgress({
      deliveryId: delivery._id,
      event: driverId ? "assigned" : "awaiting_driver"
    }).catch((error) => console.error("Could not notify recipient about dispatch:", error.message));

    const populated = await Delivery.findById(delivery._id).populate("driver").lean();
    return res.status(201).json({
      success: true,
      message: driverId ? "Delivery created and driver assigned." : "Delivery created; it is awaiting an available driver.",
      data: populated
    });
  } catch (error) {
    console.error("Donation dispatch failed:", error);
    return res.status(500).json({ success: false, message: "Could not create or assign this delivery." });
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
  dispatchPreparedDonation,
  deleteDonation
};
