
const Donation = require("../models/Donation");
const Delivery = require("../models/Delivery");
const Driver = require("../models/Driver");
const FoodInventory = require("../models/FoodInventory");
const { evaluateFoodSafety } = require("./foodSafetyEligibilityAgent");

async function replanRecovery(options = {}) {
  const now = options.now ? new Date(options.now) : new Date();

  if (Number.isNaN(now.getTime())) {
    throw new Error("Recovery planning date is invalid.");
  }

  const [donations, deliveries, drivers, foods] = await Promise.all([
    Donation.find().lean(),
    Delivery.find().lean(),
    Driver.find().lean(),
    FoodInventory.find().lean()
  ]);

  const donationById = new Map(
    donations.map((donation) => [String(donation._id), donation])
  );

  const foodById = new Map(
    foods.map((food) => [String(food._id), food])
  );

  const deliveryByDonation = new Map();

  for (const delivery of deliveries) {
    const donationId = delivery.donation
      ? String(
          typeof delivery.donation === "object"
            ? delivery.donation._id
            : delivery.donation
        )
      : null;

    if (donationId && !deliveryByDonation.has(donationId)) {
      deliveryByDonation.set(donationId, []);
    }

    if (donationId) {
      deliveryByDonation.get(donationId).push(delivery);
    }
  }

  const actions = [];
  const skipped = [];

  function recommend(type, priority, message, reference, checks = []) {
    actions.push({
      type,
      priority,
      message,
      reference,
      requiredChecks: checks,
      automaticExecution: false
    });
  }

  for (const delivery of deliveries) {
    const deliveryId = String(delivery._id);

    const donationId = delivery.donation
      ? String(
          typeof delivery.donation === "object"
            ? delivery.donation._id
            : delivery.donation
        )
      : null;

    const donation = donationById.get(donationId);

    if (!donation) {
      skipped.push({
        deliveryId,
        reason: "Linked donation was not found."
      });
      continue;
    }

    if (delivery.status === "delivered" || donation.status === "delivered") {
      if (
        delivery.status !== "delivered" ||
        donation.status !== "delivered"
      ) {
        recommend(
          "reconcile_status",
          "high",
          "Delivery and donation disagree about whether delivery is complete. Review both records before retrying.",
          { deliveryId, donationId },
          ["Verify delivery evidence", "Verify donation status"]
        );
      }

      // Never recommend a duplicate delivery for a completed donation.
      continue;
    }

    if (["rejected", "cancelled"].includes(donation.status)) {
      if (!["cancelled", "failed"].includes(delivery.status)) {
        recommend(
          "review_inactive_donation",
          "high",
          "The donation is rejected or cancelled, but its delivery remains active.",
          { deliveryId, donationId },
          ["Review donation status", "Cancel or reconcile the delivery using validated backend operations"]
        );
      }

      continue;
    }

    const foodId = String(donation.food);
    const food = foodById.get(foodId);

    if (!food) {
      skipped.push({
        deliveryId,
        donationId,
        reason: "Food record is missing; recovery cannot be safely planned."
      });
      continue;
    }

    // Safety decisions must be checked before any retry recommendation.
    const safety = await evaluateFoodSafety(food, now);

    if (
      safety.eligibilityStatus !== "approved" ||
      safety.canBeRecommended !== true
    ) {
      if (["failed", "cancelled"].includes(delivery.status)) {
        recommend(
          "resolve_food_eligibility",
          "critical",
          "Recovery is blocked because the food is not currently eligible for recommendation.",
          { deliveryId, donationId, foodId },
          ["Review current food status and expiry", "Complete the required human food-safety review"]
        );
      }

      continue;
    }

    if (["failed", "cancelled"].includes(delivery.status)) {
      const otherActiveDeliveries = (deliveryByDonation.get(donationId) || [])
        .filter(
          (other) =>
            String(other._id) !== deliveryId &&
            !["failed", "cancelled"].includes(other.status)
        );

      if (otherActiveDeliveries.length > 0) {
        skipped.push({
          deliveryId,
          donationId,
          reason: "Another active delivery already exists for this donation."
        });
        continue;
      }

      recommend(
        "retry_delivery",
        "high",
        delivery.status === "failed"
          ? "Review the failure reason and consider retrying this delivery."
          : "Consider a replacement delivery if the donation is still eligible.",
        {
          deliveryId,
          donationId,
          previousStatus: delivery.status,
          failureReason: delivery.failureReason || ""
        },
        [
          "Confirm the donation remains eligible",
          "Check food expiry and remaining quantity",
          "Review the failure or cancellation reason",
          "Confirm no duplicate active delivery exists",
          "Use the existing delivery API to perform any approved recovery"
        ]
      );

      continue;
    }

    if (
      ["pending", "assigned", "picked_up", "in_transit"].includes(
        delivery.status
      )
    ) {
      const plannedPickup = delivery.plannedPickupAt
        ? new Date(delivery.plannedPickupAt)
        : null;

      if (
        plannedPickup &&
        !Number.isNaN(plannedPickup.getTime()) &&
        plannedPickup < now &&
        ["pending", "assigned"].includes(delivery.status)
      ) {
        recommend(
          "reschedule_pickup",
          "high",
          "The planned pickup time has passed. Review the pickup schedule and driver availability.",
          {
            deliveryId,
            donationId,
            plannedPickupAt: plannedPickup.toISOString()
          },
          ["Contact the provider or driver", "Choose and confirm a new pickup time"]
        );
      }
    }

    if (
      delivery.status === "pending" &&
      !delivery.driver
    ) {
      const quantity = Number(donation.quantity);

      const eligibleDrivers = drivers
        .filter(
          (driver) =>
            driver.status === "available" &&
            Number(driver.capacityMeals) >= quantity &&
            ["meal", "meals"].includes(
              String(food.unit || "").toLowerCase()
            )
        )
        .map((driver) => ({
          driverId: String(driver._id),
          name: driver.name,
          vehicleType: driver.vehicleType,
          capacityMeals: driver.capacityMeals,
          currentLocation: driver.currentLocation || ""
        }));

      if (eligibleDrivers.length > 0) {
        recommend(
          "suggest_driver",
          "medium",
          "An unassigned delivery has eligible drivers who may be considered for assignment.",
          { deliveryId, donationId },
          [
            "Confirm driver availability again before assignment",
            "Verify pickup and destination logistics",
            "Assign through the existing validated delivery API"
          ]
        );

        actions[actions.length - 1].candidateDrivers = eligibleDrivers;
      } else {
        recommend(
          "find_driver",
          "high",
          "No currently available driver with sufficient meal capacity was found.",
          { deliveryId, donationId },
          ["Review driver availability and capacity", "Consider a different vehicle or delivery schedule"]
        );
      }
    }
  }

  return {
    agent: "Replanning & Recovery Agent",
    generatedAt: now.toISOString(),
    readOnly: true,
    automaticExecution: false,
    summary: {
      deliveriesChecked: deliveries.length,
      donationsChecked: donations.length,
      availableDriversChecked: drivers.filter(
        (driver) => driver.status === "available"
      ).length,
      recommendedActions: actions.length,
      skippedCases: skipped.length
    },
    actions,
    skipped
  };
}

module.exports = { replanRecovery };
