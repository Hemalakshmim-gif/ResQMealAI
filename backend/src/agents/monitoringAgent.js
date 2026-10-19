
const FoodInventory = require("../models/FoodInventory");
const Donation = require("../models/Donation");
const Delivery = require("../models/Delivery");
const { analyzeFoodSafety } = require("./foodSafetyEligibilityAgent");

const DEFAULT_THRESHOLDS = {
  pendingDonationHours: 24,
  assignedDeliveryHours: 2,
  pickedUpDeliveryHours: 2,
  inTransitDeliveryHours: 4,
  nearExpiryHours: 24
};

function hoursBetween(start, end) {
  const startDate = new Date(start);

  if (Number.isNaN(startDate.getTime())) {
    return null;
  }

  return (end.getTime() - startDate.getTime()) / (1000 * 60 * 60);
}

function createAlert(alerts, type, severity, message, reference = {}) {
  alerts.push({
    type,
    severity,
    message,
    reference
  });
}

async function monitorNourivya(options = {}) {
  const now = options.now ? new Date(options.now) : new Date();

  if (Number.isNaN(now.getTime())) {
    throw new Error("Monitoring date is invalid.");
  }

  const thresholds = {
    ...DEFAULT_THRESHOLDS,
    ...(options.thresholds || {})
  };

  for (const [key, value] of Object.entries(thresholds)) {
    if (!Number.isFinite(value) || value < 0) {
      throw new Error(`Invalid monitoring threshold: ${key}`);
    }
  }

  // Read-only database queries. No records are modified.
  const [foods, donations, deliveries] = await Promise.all([
    FoodInventory.find().lean(),
    Donation.find().lean(),
    Delivery.find().lean()
  ]);

  const alerts = [];

  // 1. Monitor food availability and expiry.
  for (const food of foods) {
    const foodId = String(food._id);
    const foodName = food.foodName || "Unnamed food";

    if (!food.expiryTime) {
      createAlert(
        alerts,
        "invalid_expiry",
        "high",
        `${foodName} has no valid expiry time.`,
        { foodId }
      );
      continue;
    }

    const expiryTime = new Date(food.expiryTime);

    if (Number.isNaN(expiryTime.getTime())) {
      createAlert(
        alerts,
        "invalid_expiry",
        "high",
        `${foodName} has an invalid expiry time.`,
        { foodId }
      );
      continue;
    }

    if (food.status === "available" && expiryTime <= now) {
      createAlert(
        alerts,
        "expired_food",
        "critical",
        `${foodName} has expired but is still marked available.`,
        { foodId }
      );
    } else if (
      food.status === "available" &&
      expiryTime > now &&
      hoursBetween(now, expiryTime) <= thresholds.nearExpiryHours
    ) {
      createAlert(
        alerts,
        "near_expiry",
        "high",
        `${foodName} is nearing expiry.`,
        { foodId, hoursUntilExpiry: hoursBetween(now, expiryTime) }
      );
    }
  }

  // 2. Monitor pending donations.
  for (const donation of donations) {
    if (donation.status !== "pending") continue;

    const requestedAt = donation.requestedAt || donation.createdAt;
    const ageHours = requestedAt
      ? hoursBetween(requestedAt, now)
      : null;

    if (
      ageHours !== null &&
      ageHours >= thresholds.pendingDonationHours
    ) {
      createAlert(
        alerts,
        "stale_donation",
        "high",
        `Donation ${donation._id} has been pending for ${ageHours.toFixed(1)} hours.`,
        {
          donationId: String(donation._id),
          ageHours: Number(ageHours.toFixed(1))
        }
      );
    }
  }

  // 3. Monitor delivery delays and stalled progress.
  for (const delivery of deliveries) {
    const deliveryId = String(delivery._id);
    const donationId = delivery.donation
      ? String(
          typeof delivery.donation === "object"
            ? delivery.donation._id
            : delivery.donation
        )
      : null;

    if (delivery.status === "failed") {
      createAlert(
        alerts,
        "failed_delivery",
        "critical",
        `Delivery ${deliveryId} has failed.`,
        {
          deliveryId,
          donationId,
          failureReason: delivery.failureReason || ""
        }
      );
      continue;
    }

    if (delivery.status === "cancelled") {
      createAlert(
        alerts,
        "cancelled_delivery",
        "medium",
        `Delivery ${deliveryId} is cancelled and may need follow-up.`,
        { deliveryId, donationId }
      );
      continue;
    }

    if (
      delivery.plannedPickupAt &&
      ["pending", "assigned"].includes(delivery.status)
    ) {
      const pickupTime = new Date(delivery.plannedPickupAt);

      if (
        !Number.isNaN(pickupTime.getTime()) &&
        pickupTime < now
      ) {
        createAlert(
          alerts,
          "overdue_pickup",
          "high",
          `Delivery ${deliveryId} has passed its planned pickup time.`,
          { deliveryId, donationId }
        );
      }
    }

    const lastUpdated = delivery.updatedAt || delivery.createdAt;
    const ageHours = lastUpdated
      ? hoursBetween(lastUpdated, now)
      : null;

    const stalledThresholds = {
      assigned: thresholds.assignedDeliveryHours,
      picked_up: thresholds.pickedUpDeliveryHours,
      in_transit: thresholds.inTransitDeliveryHours
    };

    const threshold = stalledThresholds[delivery.status];

    if (
      threshold !== undefined &&
      ageHours !== null &&
      ageHours >= threshold
    ) {
      createAlert(
        alerts,
        "stalled_delivery",
        "high",
        `Delivery ${deliveryId} has remained ${delivery.status} for ${ageHours.toFixed(1)} hours.`,
        {
          deliveryId,
          donationId,
          status: delivery.status,
          ageHours: Number(ageHours.toFixed(1))
        }
      );
    }

    if (
      ["assigned", "picked_up", "in_transit"].includes(delivery.status) &&
      !delivery.driver
    ) {
      createAlert(
        alerts,
        "missing_driver",
        "high",
        `Delivery ${deliveryId} is ${delivery.status} but has no assigned driver.`,
        { deliveryId, donationId }
      );
    }
  }

  // 4. Compare delivery and donation statuses.
  const donationById = new Map(
    donations.map((donation) => [
      String(donation._id),
      donation
    ])
  );

  for (const delivery of deliveries) {
    const donationId = delivery.donation
      ? String(
          typeof delivery.donation === "object"
            ? delivery.donation._id
            : delivery.donation
        )
      : null;

    const donation = donationById.get(donationId);

    if (!donation) {
      createAlert(
        alerts,
        "missing_donation",
        "critical",
        `Delivery ${delivery._id} references a donation that was not found.`,
        { deliveryId: String(delivery._id), donationId }
      );
      continue;
    }

    if (
      delivery.status === "delivered" &&
      donation.status !== "delivered"
    ) {
      createAlert(
        alerts,
        "status_mismatch",
        "high",
        `Delivery ${delivery._id} is delivered, but its donation is ${donation.status}.`,
        {
          deliveryId: String(delivery._id),
          donationId,
          deliveryStatus: delivery.status,
          donationStatus: donation.status
        }
      );
    }

    if (
      donation.status === "delivered" &&
      delivery.status !== "delivered"
    ) {
      createAlert(
        alerts,
        "status_mismatch",
        "high",
        `Donation ${donationId} is delivered, but its delivery is ${delivery.status}.`,
        {
          deliveryId: String(delivery._id),
          donationId,
          deliveryStatus: delivery.status,
          donationStatus: donation.status
        }
      );
    }

    if (
      ["rejected", "cancelled"].includes(donation.status) &&
      !["cancelled", "failed"].includes(delivery.status)
    ) {
      createAlert(
        alerts,
        "inactive_donation_delivery",
        "high",
        `Donation ${donationId} is ${donation.status}, but its delivery is ${delivery.status}.`,
        {
          deliveryId: String(delivery._id),
          donationId,
          deliveryStatus: delivery.status,
          donationStatus: donation.status
        }
      );
    }
  }

  // 5. Include food-safety findings from the existing safety agent.
  // If that analysis fails, keep the other monitoring results.
  let safetyMonitoring = "available";

  try {
    const safetyReport = await analyzeFoodSafety();

    function collectSafetyFindings(value) {
      if (!value || typeof value !== "object") return;

      if (Array.isArray(value)) {
        for (const item of value) {
          collectSafetyFindings(item);
        }
        return;
      }

      const status = value.eligibilityStatus;
      const foodId = value.foodId || value._id;
      const foodName = value.foodName || value.name || "Food item";

      if (status === "requiresSafetyReview") {
        createAlert(
          alerts,
          "safety_review_required",
          "high",
          `${foodName} requires a food-safety review.`,
          { foodId: foodId ? String(foodId) : null }
        );
      } else if (status === "ineligible") {
        createAlert(
          alerts,
          "food_ineligible",
          "high",
          `${foodName} is ineligible for recommendation.`,
          { foodId: foodId ? String(foodId) : null }
        );
      }

      for (const [key, child] of Object.entries(value)) {
        if (key !== "summary") {
          collectSafetyFindings(child);
        }
      }
    }

    collectSafetyFindings(safetyReport);
  } catch (error) {
    safetyMonitoring = "unavailable";
    console.error("Monitoring Agent: safety analysis failed:", error.message);
  }

  const severityCounts = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0
  };

  for (const alert of alerts) {
    severityCounts[alert.severity] += 1;
  }

  return {
    agent: "Monitoring Agent",
    generatedAt: now.toISOString(),
    readOnly: true,
    status: alerts.some((alert) => alert.severity === "critical")
      ? "critical"
      : alerts.length > 0
        ? "attention_required"
        : "healthy",
    monitoring: {
      foodsChecked: foods.length,
      donationsChecked: donations.length,
      deliveriesChecked: deliveries.length,
      safetyMonitoring
    },
    summary: {
      totalAlerts: alerts.length,
      ...severityCounts
    },
    alerts
  };
}

module.exports = {
  monitorNourivya,
  DEFAULT_THRESHOLDS
};
