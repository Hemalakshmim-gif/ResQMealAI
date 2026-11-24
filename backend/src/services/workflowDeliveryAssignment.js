const mongoose = require("mongoose");
const Delivery = require("../models/Delivery");
const Donation = require("../models/Donation");
const Driver = require("../models/Driver");
const FoodInventory = require("../models/FoodInventory");
const FoodSafetyReview = require("../models/FoodSafetyReview");
const Organization = require("../models/Organization");
const { evaluateFoodSafety } = require("../agents/foodSafetyEligibilityAgent");
const { notifyRecipientOfProgress } = require("./deliveryProgressNotificationService");

class AssignmentError extends Error {
  constructor(message, code) {
    super(message);
    this.name = "AssignmentError";
    this.code = code;
  }
}

async function createWorkflowDelivery({
  workflowId,
  foodId,
  providerOrganizationId,
  recipientId,
  quantity,
  pickupAddress,
  driverCandidates,
  preclaimedDriverIds = []
}) {
  if (![workflowId, foodId, providerOrganizationId, recipientId].every(
    mongoose.isValidObjectId
  )) {
    throw new AssignmentError("Workflow assignment IDs are invalid.", "INVALID_ASSIGNMENT");
  }

  const key = `${workflowId}:${foodId}:${recipientId}`;
  let donation = await Donation.findOne({ workflowAssignmentKey: key });
  let delivery = donation
    ? await Delivery.findOne({ donation: donation._id })
    : null;
  if (delivery) {
    return {
      assignmentStatus: delivery.driver ? "assigned" : "pending",
      donationId: String(donation._id),
      deliveryId: String(delivery._id),
      driverId: delivery.driver ? String(delivery.driver) : null,
      reused: true
    };
  }

  const [food, recipient, latestReview] = await Promise.all([
    FoodInventory.findOne({
      _id: foodId,
      providerOrganization: providerOrganizationId,
      status: "available"
    }).select("foodName quantity unit pickupAddress pickupCoordinates expiryTime foodType providerName status"),
    Organization.findById(recipientId).select("address coordinates isActive"),
    FoodSafetyReview.findOne({ food: foodId }).sort({ createdAt: -1, _id: -1 }).lean()
  ]);
  if (!food) {
    throw new AssignmentError("Food is no longer available from this provider.", "FOOD_UNAVAILABLE");
  }
  if (!recipient || !recipient.isActive || !recipient.address) {
    throw new AssignmentError("The matched recipient is no longer available.", "RECIPIENT_UNAVAILABLE");
  }
  if (String(food.unit).toLowerCase() !== "meals" || quantity <= 0 || quantity > food.quantity) {
    throw new AssignmentError("The matched meal quantity is no longer valid.", "INVALID_ALLOCATION");
  }
  const safety = evaluateFoodSafety(food.toObject(), new Date(), latestReview);
  if (!safety.canBeRecommended) {
    throw new AssignmentError("The food no longer passes safety eligibility checks.", "FOOD_SAFETY_CHANGED");
  }
  const allocationMatch = {
    food: food._id,
    status: { $nin: ["rejected", "cancelled"] },
    ...(donation ? { _id: { $ne: donation._id } } : {})
  };
  const allocationTotals = await Donation.aggregate([
    { $match: allocationMatch },
    { $group: { _id: null, quantity: { $sum: "$quantity" } } }
  ]);
  const alreadyAllocated = allocationTotals[0]?.quantity || 0;
  if (alreadyAllocated + quantity > food.quantity) {
    throw new AssignmentError("Other donations have used the remaining food quantity.", "FOOD_QUANTITY_ALLOCATED");
  }

  const location = pickupAddress || food.pickupAddress;
  if (!location) {
    throw new AssignmentError("The food listing has no pickup address.", "PICKUP_ADDRESS_REQUIRED");
  }

  let createdDonation = false;
  if (!donation) {
    try {
      donation = await Donation.create({
        food: food._id,
        recipient: recipient._id,
        quantity,
        status: "pending",
        notes: "Created by the food rescue agent workflow.",
        workflowAssignmentKey: key
      });
      createdDonation = true;
    } catch (error) {
      if (error.code !== 11000) throw error;
      donation = await Donation.findOne({ workflowAssignmentKey: key });
      if (!donation) throw error;
    }
  }

  const candidates = Array.isArray(driverCandidates) ? driverCandidates : [];
  const workflowClaimedDriverIds = new Set(preclaimedDriverIds.map(String));
  for (const candidate of candidates) {
    const reusingWorkflowClaim = workflowClaimedDriverIds.has(String(candidate.driverId));
    const claimed = reusingWorkflowClaim
      ? await Driver.findOne({
          _id: candidate.driverId,
          status: "assigned",
          capacityMeals: { $gte: quantity }
        })
      : await Driver.findOneAndUpdate(
          {
            _id: candidate.driverId,
            status: "available",
            capacityMeals: { $gte: quantity }
          },
          { $set: { status: "assigned" } },
          { returnDocument: "after", runValidators: true }
        );
    if (!claimed) continue;

    try {
      delivery = await Delivery.findOneAndUpdate(
        { donation: donation._id },
        {
          $setOnInsert: {
            donation: donation._id,
            driver: claimed._id,
            pickupAddress: location,
            deliveryAddress: recipient.address,
            pickupCoordinates: food.pickupCoordinates,
            deliveryCoordinates: recipient.coordinates,
            status: "assigned",
            notes: "Assigned automatically by the food rescue workflow."
          }
        },
        { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true }
      );
      if (String(delivery.driver) !== String(claimed._id)) {
        if (!reusingWorkflowClaim) {
          await Driver.findOneAndUpdate(
            { _id: claimed._id, status: "assigned" },
            { $set: { status: "available" } }
          );
        }
        return {
          assignmentStatus: delivery.driver ? "assigned" : "pending",
          donationId: String(donation._id),
          deliveryId: String(delivery._id),
          driverId: delivery.driver ? String(delivery.driver) : null,
          reused: true
        };
      }
      await notifyRecipientOfProgress({
        deliveryId: delivery._id,
        event: "assigned"
      }).catch((error) => {
        console.error("Could not create recipient assignment notification:", error.message);
      });
      return {
        assignmentStatus: "assigned",
        donationId: String(donation._id),
        deliveryId: String(delivery._id),
        driverId: String(claimed._id),
        reused: false
      };
    } catch (error) {
      if (!reusingWorkflowClaim) {
        await Driver.findOneAndUpdate(
          { _id: claimed._id, status: "assigned" },
          { $set: { status: "available" } }
        );
      }
      if (createdDonation) {
        await Donation.deleteOne({
          _id: donation._id,
          workflowAssignmentKey: key
        });
      }
      throw error;
    }
  }

  delivery = await Delivery.findOneAndUpdate(
    { donation: donation._id },
    {
      $setOnInsert: {
        donation: donation._id,
        driver: null,
        pickupAddress: location,
        deliveryAddress: recipient.address,
        pickupCoordinates: food.pickupCoordinates,
        deliveryCoordinates: recipient.coordinates,
        status: "pending",
        notes: "Awaiting an available driver for this agent matched donation."
      }
    },
    { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true }
  );

  await notifyRecipientOfProgress({
    deliveryId: delivery._id,
    event: "awaiting_driver"
  }).catch((error) => {
    console.error("Could not create recipient delivery notification:", error.message);
  });

  return {
    assignmentStatus: "no_available_driver",
    donationId: String(donation._id),
    deliveryId: String(delivery._id),
    driverId: delivery.driver ? String(delivery.driver) : null,
    reused: Boolean(delivery.createdAt && !createdDonation)
  };
}

module.exports = { createWorkflowDelivery, AssignmentError };
