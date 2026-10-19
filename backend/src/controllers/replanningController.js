
const mongoose = require("mongoose");
const Delivery = require("../models/Delivery");
const Driver = require("../models/Driver");
const Donation = require("../models/Donation");
const FoodInventory = require("../models/FoodInventory");

const getReplanningProposals = async (req, res) => {
  try {
    // Failed deliveries are genuine disruptions.
    const deliveries = await Delivery.find({
      status: "failed"
    })
      .populate({
        path: "donation",
        populate: { path: "food" }
      })
      .populate("driver")
      .sort({ updatedAt: -1 })
      .lean();

    const proposals = [];

    for (const delivery of deliveries) {
      const donation = delivery.donation;
      const food = donation?.food;

      if (!donation || !food) continue;

      // Do not replan donations that cannot be delivered.
      if (
        ["delivered", "cancelled", "rejected"].includes(donation.status)
      ) {
        continue;
      }

      const expiry = new Date(food.expiryTime);

      if (
        !["available", "reserved"].includes(food.status) ||
        Number.isNaN(expiry.getTime()) ||
        expiry <= new Date()
      ) {
        continue;
      }

      const quantity = Number(donation.quantity);
      const unit = String(food.unit || "").trim().toLowerCase();

      if (!Number.isFinite(quantity) || quantity <= 0) continue;

      // Driver capacity is measured in meals. Do not compare it
      // against kg, litres, packets, or other incompatible units.
      if (unit !== "meal" && unit !== "meals") continue;

      const candidates = await Driver.find({
        status: "available",
        capacityMeals: { $gte: quantity },
        ...(delivery.driver?._id
          ? { _id: { $ne: delivery.driver._id } }
          : {})
      })
        .select("name vehicleType capacityMeals currentLocation status")
        .sort({ capacityMeals: 1 })
        .lean();

      proposals.push({
        deliveryId: String(delivery._id),
        donationId: String(donation._id),
        deliveryStatus: delivery.status,
        originalDriver: delivery.driver
          ? {
              id: String(delivery.driver._id),
              name: delivery.driver.name
            }
          : null,
        pickupAddress: delivery.pickupAddress,
        deliveryAddress: delivery.deliveryAddress,
        quantity,
        unit,
        foodName: food.foodName,
        foodExpiry: food.expiryTime,
        candidates: candidates.map((driver) => ({
          id: String(driver._id),
          name: driver.name,
          vehicleType: driver.vehicleType,
          capacityMeals: driver.capacityMeals,
          currentLocation: driver.currentLocation
        }))
      });
    }

    return res.status(200).json({
      success: true,
      count: proposals.length,
      data: proposals
    });
  } catch (error) {
    console.error("Get replanning proposals error:", error);

    return res.status(500).json({
      success: false,
      message: "Could not retrieve replanning proposals",
      error: error.message
    });
  }
};

const approveReplanningProposal = async (req, res) => {
  let claimedDriverId = null;

  await Donation.updateOne(
      {
        _id: updatedDelivery.donation,
        status: "pending"
      },
      {
        $set: { status: "accepted" }
      }
    );
    
  try {
    const { deliveryId } = req.params;
    const { driverId } = req.body;

    if (!mongoose.isValidObjectId(deliveryId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid delivery ID"
      });
    }

    if (!mongoose.isValidObjectId(driverId)) {
      return res.status(400).json({
        success: false,
        message: "A valid alternative driver ID is required"
      });
    }

    const delivery = await Delivery.findById(deliveryId).lean();

    if (!delivery) {
      return res.status(404).json({
        success: false,
        message: "Delivery not found"
      });
    }

    if (delivery.status !== "failed") {
      return res.status(409).json({
        success: false,
        message: "Only currently failed deliveries can be replanned"
      });
    }

    const donation = await Donation.findById(delivery.donation)
      .populate("food")
      .lean();

    if (!donation || !donation.food) {
      return res.status(409).json({
        success: false,
        message: "Linked donation or food listing is missing"
      });
    }

    if (
      ["delivered", "cancelled", "rejected"].includes(donation.status)
    ) {
      return res.status(409).json({
        success: false,
        message: "This donation is no longer eligible for delivery"
      });
    }

    const food = donation.food;
    const expiry = new Date(food.expiryTime);
    const quantity = Number(donation.quantity);
    const unit = String(food.unit || "").trim().toLowerCase();

    if (
      !["available", "reserved"].includes(food.status) ||
      Number.isNaN(expiry.getTime()) ||
      expiry <= new Date()
    ) {
      return res.status(409).json({
        success: false,
        message: "Food is unavailable or expired; resolve food eligibility first"
      });
    }

    if (
      !Number.isFinite(quantity) ||
      quantity <= 0 ||
      (unit !== "meal" && unit !== "meals")
    ) {
      return res.status(409).json({
        success: false,
        message: "A valid meal quantity is required for driver capacity validation"
      });
    }

    // Atomically claim only a currently available, sufficiently
    // capacious alternative driver.
    const claimedDriver = await Driver.findOneAndUpdate(
      {
        _id: driverId,
        status: "available",
        capacityMeals: { $gte: quantity },
        ...(delivery.driver
          ? { _id: { $ne: delivery.driver } }
          : {})
      },
      {
        $set: { status: "assigned" }
      },
      {
        returnDocument: "after",
        runValidators: true
      }
    );

    if (!claimedDriver) {
      return res.status(409).json({
        success: false,
        message: "Alternative driver is unavailable or has insufficient capacity"
      });
    }

    claimedDriverId = claimedDriver._id;

    const auditEntry =
      `[Replanning approved ${new Date().toISOString()}] ` +
      `Reassigned failed delivery from driver ${delivery.driver || "none"} ` +
      `to driver ${claimedDriver._id} (${claimedDriver.name}).`;

    const updatedDelivery = await Delivery.findOneAndUpdate(
      {
        _id: deliveryId,
        status: "failed",
        driver: delivery.driver || null
      },
      {
        $set: {
          driver: claimedDriver._id,
          status: "assigned",
          failureReason: "",
          notes: [delivery.notes, auditEntry].filter(Boolean).join("\n")
        }
      },
      {
        returnDocument: "after",
        runValidators: true
      }
    );

    if (!updatedDelivery) {
      await Driver.findOneAndUpdate(
        { _id: claimedDriver._id, status: "assigned" },
        { $set: { status: "available" } }
      );

      claimedDriverId = null;

      return res.status(409).json({
        success: false,
        message: "Delivery changed during approval; no reassignment was made"
      });
    }

    claimedDriverId = null;

    // Release the old driver only if still marked assigned.
    if (delivery.driver) {
      await Driver.findOneAndUpdate(
        { _id: delivery.driver, status: "assigned" },
        { $set: { status: "available" } }
      );
    }

    const result = await Delivery.findById(updatedDelivery._id)
      .populate("donation")
      .populate("driver");

    return res.status(200).json({
      success: true,
      message: "Replanning approved and alternative driver assigned",
      data: result
    });
  } catch (error) {
    if (claimedDriverId) {
      try {
        await Driver.findOneAndUpdate(
          { _id: claimedDriverId, status: "assigned" },
          { $set: { status: "available" } }
        );
      } catch (rollbackError) {
        console.error(
          "Could not release driver after replanning failure:",
          rollbackError.message
        );
      }
    }

    console.error("Approve replanning error:", error);

    return res.status(500).json({
      success: false,
      message: "Could not approve replanning proposal",
      error: error.message
    });
  }
};

module.exports = {
  getReplanningProposals,
  approveReplanningProposal
};
