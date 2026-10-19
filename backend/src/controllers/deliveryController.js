
const mongoose = require("mongoose");

const Delivery = require("../models/Delivery");
const Donation = require("../models/Donation");
const Driver = require("../models/Driver");
const FoodInventory = require("../models/FoodInventory");

// CREATE: Create a delivery for an existing donation
const createDelivery = async (req, res) => {
  let claimedDriverId = null;

  try {
    const {
      donation,
      driver,
      pickupAddress,
      deliveryAddress,
      plannedPickupAt,
      notes
    } = req.body;

    if (!mongoose.isValidObjectId(donation)) {
      return res.status(400).json({
        success: false,
        message: "A valid donation ID is required"
      });
    }

    if (
      typeof pickupAddress !== "string" ||
      !pickupAddress.trim() ||
      typeof deliveryAddress !== "string" ||
      !deliveryAddress.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Pickup and delivery addresses are required"
      });
    }

    const donationRecord = await Donation.findById(donation);

    if (!donationRecord) {
      return res.status(404).json({
        success: false,
        message: "Donation not found"
      });
    }

    if (
      ["delivered", "cancelled", "rejected"].includes(
        donationRecord.status
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "This donation cannot receive a new delivery"
      });
    }

    if (
      plannedPickupAt &&
      Number.isNaN(Date.parse(plannedPickupAt))
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid planned pickup date"
      });
    }

    let driverId = null;

    if (driver !== undefined && driver !== null && driver !== "") {
      if (!mongoose.isValidObjectId(driver)) {
        return res.status(400).json({
          success: false,
          message: "Invalid driver ID"
        });
      }

      // Atomically claim the driver only if still available.
      const claimedDriver = await Driver.findOneAndUpdate(
        {
          _id: driver,
          status: "available"
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
        const existingDriver = await Driver.findById(driver);

        if (!existingDriver) {
          return res.status(404).json({
            success: false,
            message: "Driver not found"
          });
        }

        return res.status(400).json({
          success: false,
          message: "Driver is not available"
        });
      }

      driverId = claimedDriver._id;
      claimedDriverId = claimedDriver._id;
    }

    let delivery;

    try {
      delivery = await Delivery.create({
        donation,
        driver: driverId,
        pickupAddress: pickupAddress.trim(),
        deliveryAddress: deliveryAddress.trim(),
        plannedPickupAt: plannedPickupAt || null,
        notes: notes || "",
        status: driverId ? "assigned" : "pending"
      });
    } catch (error) {
      // Release the driver if delivery creation fails.
      if (claimedDriverId) {
        await Driver.findOneAndUpdate(
          {
            _id: claimedDriverId,
            status: "assigned"
          },
          {
            $set: { status: "available" }
          }
        );

        claimedDriverId = null;
      }

      throw error;
    }

    const result = await Delivery.findById(delivery._id)
      .populate("donation")
      .populate("driver");

    return res.status(201).json({
      success: true,
      message: "Delivery created successfully",
      data: result
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Could not create delivery",
      error: error.message
    });
  }
};

// READ: Get all deliveries
const getAllDeliveries = async (req, res) => {
  try {
    const deliveries = await Delivery.find()
      .populate("donation")
      .populate("driver")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: deliveries.length,
      data: deliveries
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Could not retrieve deliveries",
      error: error.message
    });
  }
};

// READ: Get one delivery
const getDeliveryById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid delivery ID"
      });
    }

    const delivery = await Delivery.findById(id)
      .populate("donation")
      .populate("driver");

    if (!delivery) {
      return res.status(404).json({
        success: false,
        message: "Delivery not found"
      });
    }

    return res.status(200).json({
      success: true,
      data: delivery
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Could not retrieve delivery",
      error: error.message
    });
  }
};

// UPDATE: Update delivery status and notes
const updateDelivery = async (req, res) => {
  let claimedDriverId = null;

  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid delivery ID"
      });
    }

    const allowedFields = [
      "status",
      "notes",
      "failureReason",
      "plannedPickupAt"
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

    const currentDelivery = await Delivery.findById(id);

    if (!currentDelivery) {
      return res.status(404).json({
        success: false,
        message: "Delivery not found"
      });
    }

    const allowedTransitions = {
      pending: ["assigned", "cancelled", "failed"],
      assigned: ["picked_up", "cancelled", "failed"],
      picked_up: ["in_transit", "delivered", "failed"],
      in_transit: ["delivered", "failed"],
      failed: ["pending", "assigned", "cancelled"],
      delivered: [],
      cancelled: []
    };

    if (updates.status) {
      const currentStatus = currentDelivery.status;

      if (
        !allowedTransitions[currentStatus]?.includes(updates.status)
      ) {
        return res.status(400).json({
          success: false,
          message: `Cannot change delivery status from ${currentStatus} to ${updates.status}`
        });
      }

      if (updates.status === "picked_up") {
        updates.pickedUpAt = new Date();
      }

      if (updates.status === "delivered") {
        updates.deliveredAt = new Date();
      }

      if (
        updates.status === "failed" &&
        !(
          typeof updates.failureReason === "string" &&
          updates.failureReason.trim()
        ) &&
        !(
          typeof currentDelivery.failureReason === "string" &&
          currentDelivery.failureReason.trim()
        )
      ) {
        return res.status(400).json({
          success: false,
          message: "Provide a failureReason when marking delivery as failed"
        });
      }

      // An assigned delivery must have a linked driver.
      if (updates.status === "assigned" && !currentDelivery.driver) {
        return res.status(400).json({
          success: false,
          message: "Cannot assign this delivery because it has no linked driver"
        });
      }
    }

    // Validate donation transitions before changing delivery status.
    let linkedDonation = null;

    if (
      updates.status === "picked_up" ||
      updates.status === "delivered"
    ) {
      linkedDonation = await Donation.findById(
        currentDelivery.donation
      );

      if (!linkedDonation) {
        return res.status(409).json({
          success: false,
          message: "Linked donation not found"
        });
      }

      if (
        updates.status === "picked_up" &&
        !["accepted", "preparing", "picked_up"].includes(
          linkedDonation.status
        )
      ) {
        return res.status(400).json({
          success: false,
          message: `Cannot mark delivery as picked up while donation status is '${linkedDonation.status}'`
        });
      }

      if (
        updates.status === "delivered" &&
        !["picked_up", "delivered"].includes(linkedDonation.status)
      ) {
        return res.status(400).json({
          success: false,
          message: `Cannot complete delivery while donation status is '${linkedDonation.status}'`
        });
      }
    }

    // Claim the linked driver when assigning or reassigning a delivery.
    if (updates.status === "assigned") {
      const claimedDriver = await Driver.findOneAndUpdate(
        {
          _id: currentDelivery.driver,
          status: "available"
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
        const existingDriver = await Driver.findById(
          currentDelivery.driver
        );

        if (!existingDriver) {
          return res.status(404).json({
            success: false,
            message: "Linked driver not found"
          });
        }

        return res.status(400).json({
          success: false,
          message: "Linked driver is not available for reassignment"
        });
      }

      claimedDriverId = claimedDriver._id;
    }

    let delivery;

    try {
      delivery = await Delivery.findByIdAndUpdate(
        id,
        { $set: updates },
        {
          returnDocument: "after",
          runValidators: true
        }
      );

      if (!delivery) {
        throw new Error("Delivery not found during update");
      }
    } catch (error) {
      // Release a newly claimed driver if the delivery update fails.
      if (claimedDriverId) {
        await Driver.findOneAndUpdate(
          {
            _id: claimedDriverId,
            status: "assigned"
          },
          {
            $set: { status: "available" }
          }
        );

        claimedDriverId = null;
      }

      throw error;
    }

    // Synchronize the linked donation with delivery progress.
    if (
      linkedDonation &&
      updates.status === "picked_up"
    ) {
      if (linkedDonation.status === "accepted") {
        linkedDonation.status = "preparing";
        await linkedDonation.save();
      }

      if (linkedDonation.status === "preparing") {
        linkedDonation.status = "picked_up";
        await linkedDonation.save();
      }
    }

    if (
      linkedDonation &&
      updates.status === "delivered"
    ) {
      if (linkedDonation.status === "picked_up") {
        linkedDonation.status = "delivered";
        linkedDonation.deliveredAt = new Date();
        await linkedDonation.save();
      }
    }

    // Release the linked driver when a delivery ends or fails.
    if (
      ["delivered", "cancelled", "failed"].includes(updates.status) &&
      currentDelivery.driver
    ) {
      await Driver.findOneAndUpdate(
        {
          _id: currentDelivery.driver,
          status: "assigned"
        },
        {
          $set: { status: "available" }
        }
      );
    }

    // Fetch fresh populated data so the response shows current driver status.
    const result = await Delivery.findById(delivery._id)
      .populate("donation")
      .populate("driver");

    return res.status(200).json({
      success: true,
      message: "Delivery updated successfully",
      data: result
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Could not update delivery",
      error: error.message
    });
  }
};

// DELETE: Delete a test delivery
const deleteDelivery = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid delivery ID"
      });
    }

    const delivery = await Delivery.findById(id);

    if (!delivery) {
      return res.status(404).json({
        success: false,
        message: "Delivery not found"
      });
    }

    // Only unassigned pending deliveries may be deleted.
    if (delivery.status !== "pending" || delivery.driver) {
      return res.status(400).json({
        success: false,
        message:
          "Only pending deliveries without an assigned driver can be deleted"
      });
    }

    await Delivery.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: "Pending delivery deleted successfully",
      data: delivery
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Could not delete delivery",
      error: error.message
    });
  }
};


const assignDelivery = async (req, res) => {
  let claimedDriverId = null;
  let assignmentCompleted = false;

  try {
    const { id } = req.params;
    const { driverId } = req.body;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid delivery ID",
      });
    }

    if (!mongoose.isValidObjectId(driverId)) {
      return res.status(400).json({
        success: false,
        message: "A valid driver ID is required",
      });
    }

    const delivery = await Delivery.findById(id).lean();

    if (!delivery) {
      return res.status(404).json({
        success: false,
        message: "Delivery not found",
      });
    }

    if (delivery.status !== "pending" || delivery.driver) {
      return res.status(400).json({
        success: false,
        message: "Only unassigned pending deliveries can be assigned",
      });
    }

    const donation = await Donation.findById(delivery.donation)
      .populate("food")
      .lean();

    if (!donation || !donation.food) {
      return res.status(400).json({
        success: false,
        message: "Linked donation or food record is missing",
      });
    }

    if (["delivered", "cancelled", "rejected"].includes(donation.status)) {
      return res.status(400).json({
        success: false,
        message: "This donation cannot be assigned for delivery",
      });
    }

    const food = donation.food;
    const quantity = Number(donation.quantity);
    const unit = String(food.unit || "").trim().toLowerCase();
    const expiry = new Date(food.expiryTime);

    if (!Number.isFinite(quantity) || quantity <= 0) {
      return res.status(400).json({
        success: false,
        message: "Donation quantity is invalid",
      });
    }

    if (unit !== "meal" && unit !== "meals") {
      return res.status(400).json({
        success: false,
        message: "Driver capacity validation currently supports meals only",
      });
    }

    if (!["available", "reserved"].includes(food.status)) {
      return res.status(400).json({
        success: false,
        message: "Food is not available for delivery",
      });
    }

    if (Number.isNaN(expiry.getTime()) || expiry <= new Date()) {
      return res.status(400).json({
        success: false,
        message: "Food expiry is invalid or has passed",
      });
    }

    const driver = await Driver.findById(driverId).lean();

    if (!driver) {
      return res.status(404).json({
        success: false,
        message: "Driver not found",
      });
    }

    if (driver.status !== "available") {
      return res.status(400).json({
        success: false,
        message: "Driver is not available",
      });
    }

    if (
      !Number.isFinite(Number(driver.capacityMeals)) ||
      Number(driver.capacityMeals) < quantity
    ) {
      return res.status(400).json({
        success: false,
        message: "Driver capacity is insufficient for this delivery",
      });
    }

    // Atomically claim the driver so concurrent requests
    // cannot claim the same available driver.
    const claimedDriver = await Driver.findOneAndUpdate(
      {
        _id: driverId,
        status: "available",
        capacityMeals: { $gte: quantity },
      },
      {
        $set: { status: "assigned" },
      },
      {
        returnDocument: "after",
        runValidators: true,
      }
    );

    if (!claimedDriver) {
      return res.status(409).json({
        success: false,
        message: "Driver is no longer available or has insufficient capacity",
      });
    }

    claimedDriverId = claimedDriver._id;

    // Claim the delivery only if it is still pending and unassigned.
    const updatedDelivery = await Delivery.findOneAndUpdate(
      {
        _id: id,
        status: "pending",
        driver: null,
      },
      {
        $set: {
          driver: claimedDriver._id,
          status: "assigned",
        },
      },
      {
        returnDocument: "after",
        runValidators: true,
      }
    );

    if (!updatedDelivery) {
      await Driver.findOneAndUpdate(
        {
          _id: claimedDriver._id,
          status: "assigned",
        },
        {
          $set: { status: "available" },
        }
      );

      claimedDriverId = null;

      return res.status(409).json({
        success: false,
        message: "Delivery was changed by another request; no assignment was made",
      });
    }

    assignmentCompleted = true;

    const result = await Delivery.findById(updatedDelivery._id)
      .populate("donation")
      .populate("driver");

    return res.status(200).json({
      success: true,
      message: "Driver assigned successfully",
      data: result,
    });
  } catch (error) {
    if (claimedDriverId && !assignmentCompleted) {
      try {
        await Driver.findOneAndUpdate(
          {
            _id: claimedDriverId,
            status: "assigned",
          },
          {
            $set: { status: "available" },
          }
        );
      } catch (rollbackError) {
        console.error(
          "Could not release driver after assignment failure:",
          rollbackError.message
        );
      }
    }

    return res.status(500).json({
      success: false,
      message: "Could not assign driver",
      error: error.message,
    });
  }
};


module.exports = {
  createDelivery,
  getAllDeliveries,
  getDeliveryById,
  updateDelivery,
  deleteDelivery,
  assignDelivery
};
