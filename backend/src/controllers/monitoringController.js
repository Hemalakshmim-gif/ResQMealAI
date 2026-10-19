
const FoodInventory = require("../models/FoodInventory");
const Donation = require("../models/Donation");
const Delivery = require("../models/Delivery");
const FoodSafetyReview = require("../models/FoodSafetyReview");

const HOUR = 60 * 60 * 1000;

const getMonitoringIncidents = async (req, res) => {
  try {
    const now = new Date();
    const expiryLimit = new Date(now.getTime() + 24 * HOUR);
    const incidents = [];

    // 1. Food that has expired or is approaching expiry.
    const foods = await FoodInventory.find({
      status: { $in: ["available", "reserved"] },
      expiryTime: { $lte: expiryLimit }
    })
      .select("foodName providerName expiryTime status")
      .lean();

    for (const food of foods) {
      const expired = new Date(food.expiryTime) <= now;

      incidents.push({
        id: `INV-${food._id}`,
        type: expired ? "Food Expired" : "Food Near Expiry",
        donationId: "—",
        sourceId: String(food._id),
        sourceType: "inventory",
        detectedAt: food.updatedAt || food.createdAt || food.expiryTime,
        severity: expired ? "Critical" : "High",
        status: "Active",
        description: `${food.foodName} from ${food.providerName} ${
          expired
            ? "has passed its expiry time."
            : "is due to expire within 24 hours."
        }`
      });
    }

    // 2. Food safety reviews needing attention.
    const reviews = await FoodSafetyReview.find({
      reviewStatus: { $in: ["pending", "rejected"] }
    })
      .populate("food", "foodName providerName")
      .lean();

    for (const review of reviews) {
      const rejected = review.reviewStatus === "rejected";

      incidents.push({
        id: `SAFE-${review._id}`,
        type: rejected
          ? "Food Safety Rejected"
          : "Food Safety Review Pending",
        donationId: "—",
        sourceId: String(review._id),
        sourceType: "foodSafety",
        detectedAt: review.updatedAt || review.createdAt || now,
        severity: rejected ? "Critical" : "Medium",
        status: rejected ? "Requires Review" : "Pending Review",
        description: `${review.food?.foodName || "Food listing"} ${
          rejected
            ? `failed its food safety review. ${review.reviewNotes || ""}`
            : "is waiting for a food safety review."
        }`.trim()
      });
    }

    // 3. Deliveries that failed or are awaiting driver assignment.
    const deliveries = await Delivery.find({
      status: { $in: ["pending", "failed"] }
    })
      .populate({
        path: "donation",
        select: "_id status"
      })
      .lean();

    for (const delivery of deliveries) {
      const failed = delivery.status === "failed";

      incidents.push({
        id: `DEL-${delivery._id}`,
        type: failed ? "Delivery Failed" : "Driver Assignment Pending",
        donationId: delivery.donation?._id
          ? String(delivery.donation._id)
          : "—",
        sourceId: String(delivery._id),
        sourceType: "delivery",
        detectedAt: delivery.updatedAt || delivery.createdAt || now,
        severity: failed ? "Critical" : "Medium",
        status: failed ? "Requires Attention" : "Awaiting Assignment",
        description: failed
          ? `Delivery failed. ${delivery.failureReason || "Please review the delivery."}`
          : `Delivery from ${delivery.pickupAddress} to ${delivery.deliveryAddress} is awaiting driver assignment.`
      });
    }

    // 4. Active deliveries assigned to a driver who is unavailable.
    const activeDeliveries = await Delivery.find({
      status: { $in: ["assigned", "picked_up", "in_transit"] },
      driver: { $ne: null }
    })
      .populate("driver", "name status")
      .populate("donation", "_id")
      .lean();

    for (const delivery of activeDeliveries) {
      if (delivery.driver?.status !== "unavailable") continue;

      incidents.push({
        id: `DRV-${delivery._id}`,
        type: "Assigned Driver Unavailable",
        donationId: delivery.donation?._id
          ? String(delivery.donation._id)
          : "—",
        sourceId: String(delivery._id),
        sourceType: "delivery",
        detectedAt: delivery.updatedAt || delivery.createdAt || now,
        severity: "Critical",
        status: "Requires Attention",
        description: `${delivery.driver.name} is marked unavailable while this delivery is active.`
      });
    }

    // Newest detected conditions first.
    incidents.sort(
      (a, b) => new Date(b.detectedAt) - new Date(a.detectedAt)
    );

    return res.status(200).json({
      success: true,
      count: incidents.length,
      data: incidents
    });
  } catch (error) {
    console.error("Monitoring incidents error:", error);

    return res.status(500).json({
      success: false,
      message: "Could not retrieve monitoring incidents",
      error: error.message
    });
  }
};

module.exports = { getMonitoringIncidents };
