
const mongoose = require("mongoose");

const Delivery = require("../models/Delivery");
const Donation = require("../models/Donation");
const Driver = require("../models/Driver");

// GET DELIVERIES ASSIGNED TO THE LOGGED-IN DRIVER
const getMyDeliveries = async (req, res) => {
  try {
    const deliveries = await Delivery.find({
      driver: req.driver.id
    })
      .populate({
        path: "donation",
        populate: [
          { path: "food" },
          {
            path: "recipient",
            select: "name email phone address"
          }
        ]
      })
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: deliveries.length,
      data: deliveries
    });
  } catch (error) {
    console.error("Driver deliveries error:", error);

    return res.status(500).json({
      success: false,
      message: "Could not retrieve your deliveries."
    });
  }
};

// UPDATE DELIVERY PROGRESS
const updateMyDeliveryStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid delivery ID."
      });
    }

    const allowedStatuses = ["picked_up", "in_transit", "delivered"];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid delivery status."
      });
    }

    const delivery = await Delivery.findOne({
      _id: id,
      driver: req.driver.id
    });

    if (!delivery) {
      return res.status(404).json({
        success: false,
        message: "Delivery not found or not assigned to you."
      });
    }

    const allowedTransitions = {
      assigned: ["picked_up"],
      picked_up: ["in_transit"],
      in_transit: ["delivered"]
    };

    if (!allowedTransitions[delivery.status]?.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot change delivery status from ${delivery.status} to ${status}.`
      });
    }

    const donation = await Donation.findById(delivery.donation);

    if (!donation) {
      return res.status(404).json({
        success: false,
        message: "Linked donation not found."
      });
    }

    if (
      status === "picked_up" &&
      !["accepted", "preparing", "picked_up"].includes(donation.status)
    ) {
      return res.status(400).json({
        success: false,
        message: `This donation cannot be picked up because its status is ${donation.status}.`
      });
    }

    if (
      status === "delivered" &&
      donation.status !== "picked_up"
    ) {
      return res.status(400).json({
        success: false,
        message: "The donation must be picked up before delivery completion."
      });
    }

    const deliveryUpdates = { status };
    const updatedAt = new Date();

    if (status === "picked_up") {
      deliveryUpdates.pickedUpAt = updatedAt;
    }

    if (status === "delivered") {
      deliveryUpdates.deliveredAt = updatedAt;
    }

    // Compare-and-set prevents concurrent or repeated transitions.
    const updatedDelivery = await Delivery.findOneAndUpdate(
      {
        _id: id,
        driver: req.driver.id,
        status: delivery.status
      },
      { $set: deliveryUpdates },
      {
        returnDocument: "after",
        runValidators: true
      }
    );

    if (!updatedDelivery) {
      return res.status(409).json({
        success: false,
        message: "Delivery status changed. Please refresh and try again."
      });
    }

    if (status === "picked_up") {
      if (donation.status === "accepted") {
        donation.status = "preparing";
      }

      if (donation.status === "preparing") {
        donation.status = "picked_up";
      }

      await donation.save();
    }

    if (status === "delivered") {
      donation.status = "delivered";
      donation.deliveredAt = updatedAt;
      await donation.save();

      await Driver.findOneAndUpdate(
        {
          _id: req.driver.id,
          status: "assigned"
        },
        {
          $set: { status: "available" }
        }
      );
    }

    return res.status(200).json({
      success: true,
      message: `Delivery status updated to ${status}.`,
      data: updatedDelivery
    });
  } catch (error) {
    console.error("Driver delivery update error:", error);

    return res.status(500).json({
      success: false,
      message: "Could not update delivery status."
    });
  }
};

// CANCEL AN ASSIGNED DELIVERY
const cancelMyDelivery = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid delivery ID."
      });
    }

    if (typeof reason !== "string" || !reason.trim()) {
      return res.status(400).json({
        success: false,
        message: "Please provide a cancellation reason."
      });
    }

    const delivery = await Delivery.findOne({
      _id: id,
      driver: req.driver.id
    });

    if (!delivery) {
      return res.status(404).json({
        success: false,
        message: "Delivery not found or not assigned to you."
      });
    }

    // Cancellation is allowed before food pickup only.
    if (delivery.status !== "assigned") {
      return res.status(400).json({
        success: false,
        message: "Only assigned deliveries can be cancelled by the driver. Please contact support if the food has already been picked up."
      });
    }

    // Mark as failed so the existing adaptive replanning
    // workflow can consider this delivery for reassignment.
    const updatedDelivery = await Delivery.findOneAndUpdate(
      {
        _id: id,
        driver: req.driver.id,
        status: "assigned"
      },
      {
        $set: {
          status: "failed",
          failureReason: `Driver cancelled: ${reason.trim()}`
        }
      },
      {
        returnDocument: "after",
        runValidators: true
      }
    );

    if (!updatedDelivery) {
      return res.status(409).json({
        success: false,
        message: "Delivery status changed. Please refresh and try again."
      });
    }

    // Release the driver for another assignment.
    await Driver.findOneAndUpdate(
      {
        _id: req.driver.id,
        status: "assigned"
      },
      {
        $set: { status: "available" }
      }
    );

    return res.status(200).json({
      success: true,
      message: "Delivery cancelled. Your availability has been restored and the delivery can be considered for reassignment.",
      data: updatedDelivery
    });
  } catch (error) {
    console.error("Driver cancellation error:", error);

    return res.status(500).json({
      success: false,
      message: "Could not cancel delivery."
    });
  }
};

module.exports = {
  getMyDeliveries,
  updateMyDeliveryStatus,
  cancelMyDelivery
};
