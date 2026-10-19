
const Notification = require("../models/Notification");
const FoodInventory = require("../models/FoodInventory");
const Donation = require("../models/Donation");
const Delivery = require("../models/Delivery");
const Driver = require("../models/Driver");
const FoodSafetyReview = require("../models/FoodSafetyReview");

const HOURS = 60 * 60 * 1000;

// Build notification candidates from actual MongoDB records.
async function buildOperationalNotifications() {
  const now = new Date();
  const soon = new Date(now.getTime() + 24 * HOURS);
  const candidates = [];

  // 1. Food inventory: expired or expiring within 24 hours.
  const foods = await FoodInventory.find({
    status: { $in: ["available", "reserved"] },
    expiryTime: { $lte: soon }
  }).lean();

  for (const food of foods) {
    const expired = new Date(food.expiryTime) <= now;

    candidates.push({
      eventKey: `inventory-expiry:${food._id}:${new Date(food.expiryTime).getTime()}`,
      title: expired ? "Food listing has expired" : "Food approaching expiry",
      desc: `${food.foodName} from ${food.providerName} ${
        expired
          ? "has passed its expiry time."
          : "is due to expire within 24 hours."
      }`,
      category: "Surplus",
      severity: expired ? "critical" : "warning",
      sourceType: "inventory",
      sourceId: String(food._id),
      occurredAt: food.expiryTime
    });
  }

  // 2. Donations: current pending requests.
  const pendingDonations = await Donation.find({
    status: "pending"
  })
    .populate("food", "foodName")
    .populate("recipient", "name organizationName")
    .lean();

  for (const donation of pendingDonations) {
    const foodName = donation.food?.foodName || "Food listing";
    const recipientName =
      donation.recipient?.organizationName ||
      donation.recipient?.name ||
      "recipient organization";

    candidates.push({
      eventKey: `donation-pending:${donation._id}`,
      title: "Donation request awaiting action",
      desc: `${foodName} has a pending donation request for ${recipientName}.`,
      category: "Donation",
      severity: "info",
      sourceType: "donation",
      sourceId: String(donation._id),
      occurredAt: donation.updatedAt || donation.requestedAt || now
    });
  }

  // 3. Deliveries: failed deliveries and deliveries without a driver.
  const deliveries = await Delivery.find({
    status: { $in: ["pending", "failed"] }
  }).lean();

  for (const delivery of deliveries) {
    const failed = delivery.status === "failed";

    candidates.push({
      eventKey: `delivery-status:${delivery._id}:${delivery.status}`,
      title: failed
        ? "Delivery requires attention"
        : "Delivery awaiting driver assignment",
      desc: failed
        ? `Delivery ${delivery._id} failed. ${
            delivery.failureReason || "Please review the delivery."
          }`
        : `Delivery ${delivery._id} is pending driver assignment.`,
      category: "Delivery",
      severity: failed ? "critical" : "warning",
      sourceType: "delivery",
      sourceId: String(delivery._id),
      occurredAt: delivery.updatedAt || delivery.createdAt || now
    });
  }

  // 4. Food safety: unresolved reviews.
  const pendingReviews = await FoodSafetyReview.find({
    reviewStatus: "pending"
  })
    .populate("food", "foodName")
    .lean();

  for (const review of pendingReviews) {
    const foodName = review.food?.foodName || "Food listing";

    candidates.push({
      eventKey: `food-safety-pending:${review._id}`,
      title: "Food safety review pending",
      desc: `${foodName} requires a food safety review.`,
      category: "Food Safety",
      severity: "warning",
      sourceType: "foodSafety",
      sourceId: String(review._id),
      occurredAt: review.updatedAt || review.createdAt || now
    });
  }

  // 5. Food safety: rejected reviews.
  const rejectedReviews = await FoodSafetyReview.find({
    reviewStatus: "rejected"
  })
    .populate("food", "foodName")
    .lean();

  for (const review of rejectedReviews) {
    const foodName = review.food?.foodName || "Food listing";

    candidates.push({
      eventKey: `food-safety-rejected:${review._id}`,
      title: "Food safety review rejected",
      desc: `${foodName} did not pass its food safety review.${
        review.reviewNotes ? ` Note: ${review.reviewNotes}` : ""
      }`,
      category: "Food Safety",
      severity: "critical",
      sourceType: "foodSafety",
      sourceId: String(review._id),
      occurredAt: review.reviewedAt || review.updatedAt || now
    });
  }

  // 6. Drivers: only flag an actual assigned driver marked unavailable.
  const assignedDeliveries = await Delivery.find({
    status: { $in: ["assigned", "picked_up", "in_transit"] },
    driver: { $ne: null }
  })
    .populate("driver", "name status")
    .lean();

  for (const delivery of assignedDeliveries) {
    if (delivery.driver?.status !== "unavailable") continue;

    candidates.push({
      eventKey: `driver-unavailable:${delivery._id}:${delivery.driver._id}`,
      title: "Assigned driver unavailable",
      desc: `${delivery.driver.name} is marked unavailable while delivery ${delivery._id} is active.`,
      category: "Driver",
      severity: "critical",
      sourceType: "driver",
      sourceId: String(delivery.driver._id),
      occurredAt: delivery.updatedAt || delivery.createdAt || now
    });
  }

  return candidates;
}

// Create or refresh notifications without resetting their read status.
async function synchronizeOperationalNotifications() {
  const candidates = await buildOperationalNotifications();

  if (candidates.length > 0) {
    await Notification.bulkWrite(
      candidates.map((candidate) => ({
        updateOne: {
          filter: { eventKey: candidate.eventKey },
          update: {
            $setOnInsert: candidate
          },
          upsert: true
        }
      })),
      { ordered: false }
    );
  }

  // Remove obsolete generated alerts when their underlying condition
  // is no longer present. This applies only to generated event keys.
  const activeKeys = candidates.map((item) => item.eventKey);

  const activePrefixes = [
    "inventory-expiry:",
    "donation-pending:",
    "delivery-status:",
    "food-safety-pending:",
    "food-safety-rejected:",
    "driver-unavailable:"
  ];

  const obsoleteConditions = activePrefixes.map((prefix) => ({
    eventKey: { $regex: `^${prefix}` }
  }));

  if (activeKeys.length > 0) {
    await Notification.deleteMany({
      $and: [
        { $or: obsoleteConditions },
        { eventKey: { $nin: activeKeys } }
      ]
    });
  } else {
    await Notification.deleteMany({
      $or: obsoleteConditions
    });
  }

  return candidates.length;
}

// GET /api/notifications
const getNotifications = async (req, res) => {
  try {
    await synchronizeOperationalNotifications();

    const notifications = await Notification.find()
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();

    return res.status(200).json({
      success: true,
      count: notifications.length,
      data: notifications
    });
  } catch (error) {
    console.error("Get notifications error:", error);

    return res.status(500).json({
      success: false,
      message: "Could not retrieve notifications",
      error: error.message
    });
  }
};

// PATCH /api/notifications/read-all
const markAllNotificationsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { read: false },
      { $set: { read: true } }
    );

    return res.status(200).json({
      success: true,
      message: "All notifications marked as read"
    });
  } catch (error) {
    console.error("Mark all notifications read error:", error);

    return res.status(500).json({
      success: false,
      message: "Could not update notifications",
      error: error.message
    });
  }
};

module.exports = {
  getNotifications,
  markAllNotificationsRead
};
