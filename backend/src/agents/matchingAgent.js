const mongoose = require("mongoose");
const FoodInventory = require("../models/FoodInventory");
const Donation = require("../models/Donation");
const { createAgentResult } = require("./agentResult");

const CLOSED_DONATION_STATUSES = ["rejected", "cancelled"];

function normalize(value) {
  return String(value || "").trim().toLowerCase();
}

function validCoordinates(value) {
  return (
    value &&
    Number.isFinite(value.latitude) &&
    value.latitude >= -90 &&
    value.latitude <= 90 &&
    Number.isFinite(value.longitude) &&
    value.longitude >= -180 &&
    value.longitude <= 180
  );
}

function distanceInKilometers(first, second) {
  const radians = (degrees) => (degrees * Math.PI) / 180;
  const latitudeDelta = radians(second.latitude - first.latitude);
  const longitudeDelta = radians(second.longitude - first.longitude);
  const firstLatitude = radians(first.latitude);
  const secondLatitude = radians(second.latitude);
  const a =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(firstLatitude) *
      Math.cos(secondLatitude) *
      Math.sin(longitudeDelta / 2) ** 2;

  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function foodTypeMatches(food, recipient) {
  const foodType = normalize(food.foodType);
  return (
    (recipient.acceptedFoodTypes || []).map(normalize).includes(foodType) &&
    (recipient.requestedFoodTypes || []).map(normalize).includes(foodType)
  );
}

async function runMatchingAgent({
  safeFoods,
  recipientsByFood,
  now = new Date()
}) {
  const startedAt = new Date();

  if (!Array.isArray(safeFoods) || !Array.isArray(recipientsByFood)) {
    throw new Error("safeFoods and recipientsByFood must be arrays.");
  }

  if (Number.isNaN(new Date(now).getTime())) {
    throw new Error("A valid matching time is required.");
  }

  const safeFoodIds = [
    ...new Set(
      safeFoods
        .filter((food) => food?.safetyStatus === "SAFE")
        .map((food) => String(food.foodId))
    )
  ];

  if (safeFoodIds.some((id) => !mongoose.isValidObjectId(id))) {
    throw new Error("Matching input contains an invalid food ID.");
  }

  if (safeFoodIds.length === 0) {
    return createAgentResult({
      agent: "Matching Agent",
      startedAt,
      input: { safeFoodIds: [] },
      output: {
        allocations: [],
        unmatchedFoodIds: []
      }
    });
  }

  const [foods, donations] = await Promise.all([
    FoodInventory.find({
      _id: { $in: safeFoodIds },
      status: "available"
    }).lean(),
    Donation.find({
      status: { $nin: CLOSED_DONATION_STATUSES }
    })
      .select("food recipient quantity")
      .populate("food", "unit")
      .lean()
  ]);

  const foodById = new Map(
    foods.map((food) => [String(food._id), food])
  );
  const activeQuantityByFoodId = new Map();
  const activeMealQuantityByOrganization = new Map();
  for (const donation of donations) {
    const foodId = String(donation.food?._id || donation.food);
    activeQuantityByFoodId.set(
      foodId,
      (activeQuantityByFoodId.get(foodId) || 0) +
        Math.max(0, Number(donation.quantity) || 0)
    );

    if (donation.food?.unit === "meals" && donation.recipient) {
      const organizationId = String(donation.recipient);
      activeMealQuantityByOrganization.set(
        organizationId,
        (activeMealQuantityByOrganization.get(organizationId) || 0) +
          Math.max(0, Number(donation.quantity) || 0)
      );
    }
  }

  const demandByFoodId = new Map(
    recipientsByFood.map((entry) => [
      String(entry.foodId),
      entry.recipients || []
    ])
  );
  const remainingDemandByOrganization = new Map();
  const allocations = [];
  const unmatchedFoodIds = [];
  const allocatedPairs = new Set();

  const uniqueSafeFoods = [
    ...new Map(
      safeFoods
        .filter((food) => food?.safetyStatus === "SAFE")
        .map((food) => [String(food.foodId), food])
    ).values()
  ];
  const orderedSafeFoods = uniqueSafeFoods
    .slice()
    .sort((first, second) => {
      const firstExpiry = new Date(first.expiryTime).getTime();
      const secondExpiry = new Date(second.expiryTime).getTime();
      return firstExpiry - secondExpiry;
    });

  for (const safetyRecord of orderedSafeFoods) {
    const foodId = String(safetyRecord.foodId);
    const food = foodById.get(foodId);

    if (
      !food ||
      !food.expiryTime ||
      Number.isNaN(new Date(food.expiryTime).getTime()) ||
      new Date(food.expiryTime).getTime() <= new Date(now).getTime() ||
      normalize(food.unit) !== "meals"
    ) {
      unmatchedFoodIds.push(foodId);
      continue;
    }

    const declaredQuantity = Number(food.quantity);
    const predictedQuantity = Number(safetyRecord.potentialSurplus);
    const availableQuantity = Math.max(
      0,
      Math.min(
        declaredQuantity,
        Number.isFinite(predictedQuantity) && predictedQuantity >= 0
          ? predictedQuantity
          : declaredQuantity
      ) - (activeQuantityByFoodId.get(foodId) || 0)
    );

    if (!Number.isFinite(availableQuantity) || availableQuantity <= 0) {
      unmatchedFoodIds.push(foodId);
      continue;
    }

    const candidates = (demandByFoodId.get(foodId) || [])
      .filter(
        (recipient) =>
          mongoose.isValidObjectId(recipient?.organizationId) &&
          foodTypeMatches(food, recipient)
      )
      .map((recipient) => {
        const organizationId = String(recipient.organizationId);
        const initialDemand = Number(recipient.availableMeals);

        if (!remainingDemandByOrganization.has(organizationId)) {
          const alreadyAllocated =
            activeMealQuantityByOrganization.get(organizationId) || 0;
          const requestedMeals = Number(recipient.requestedMeals);
          const capacityMeals = Number(recipient.capacityMeals);
          let demandAfterExisting = Number.isFinite(initialDemand)
            ? Math.max(0, initialDemand - alreadyAllocated)
            : 0;

          if (Number.isFinite(requestedMeals) && requestedMeals > 0) {
            demandAfterExisting = Math.min(
              demandAfterExisting,
              Math.max(0, requestedMeals - alreadyAllocated)
            );
          }

          if (Number.isFinite(capacityMeals) && capacityMeals > 0) {
            demandAfterExisting = Math.min(
              demandAfterExisting,
              Math.max(0, capacityMeals - alreadyAllocated)
            );
          }

          remainingDemandByOrganization.set(
            organizationId,
            demandAfterExisting
          );
        }

        return {
          ...recipient,
          organizationId,
          remainingDemand:
            remainingDemandByOrganization.get(organizationId)
        };
      })
      .filter((recipient) => recipient.remainingDemand > 0);

    const distances = new Map();
    const measuredDistances = [];
    for (const candidate of candidates) {
      if (
        validCoordinates(food.pickupCoordinates) &&
        validCoordinates(candidate.coordinates)
      ) {
        const distance = distanceInKilometers(
          food.pickupCoordinates,
          candidate.coordinates
        );
        distances.set(candidate.organizationId, distance);
        measuredDistances.push(distance);
      }
    }

    const minimumDistance = measuredDistances.length
      ? Math.min(...measuredDistances)
      : null;
    const maximumDistance = measuredDistances.length
      ? Math.max(...measuredDistances)
      : null;
    const canCompareProximity =
      candidates.length > 0 &&
      candidates.every((candidate) =>
        distances.has(candidate.organizationId)
      );

    const rankedCandidates = candidates
      .map((candidate) => {
        const demandCoverage = Math.min(
          1,
          candidate.remainingDemand / availableQuantity
        );
        const distance = distances.get(candidate.organizationId);
        const proximity =
          !canCompareProximity ||
          minimumDistance === null ||
          maximumDistance === null ||
          maximumDistance === minimumDistance
            ? canCompareProximity && distance !== undefined
              ? 1
              : null
            : (maximumDistance - distance) /
              (maximumDistance - minimumDistance);
        const scoreParts = [1, demandCoverage];
        if (proximity !== null) {
          scoreParts.push(proximity);
        }

        return {
          ...candidate,
          distanceKm:
            distance === undefined
              ? null
              : Number(distance.toFixed(2)),
          matchingScore: Number(
            (
              (scoreParts.reduce((total, score) => total + score, 0) /
                scoreParts.length) *
              100
            ).toFixed(2)
          )
        };
      })
      .sort((first, second) => {
        if (second.matchingScore !== first.matchingScore) {
          return second.matchingScore - first.matchingScore;
        }
        return first.organizationId.localeCompare(second.organizationId);
      });

    let remainingFood = availableQuantity;
    let allocationsForFood = 0;
    for (const candidate of rankedCandidates) {
      if (remainingFood <= 0) {
        break;
      }

      const allocatedQuantity = Math.min(
        remainingFood,
        candidate.remainingDemand
      );
      if (allocatedQuantity <= 0) {
        continue;
      }

      const pair = `${foodId}:${candidate.organizationId}`;
      if (allocatedPairs.has(pair)) {
        continue;
      }

      const remainingDemand =
        candidate.remainingDemand - allocatedQuantity;
      remainingDemandByOrganization.set(
        candidate.organizationId,
        remainingDemand
      );
      allocatedPairs.add(pair);
      remainingFood -= allocatedQuantity;
      allocationsForFood += 1;

      allocations.push({
        foodId,
        foodName: food.foodName,
        organizationId: candidate.organizationId,
        organizationName: candidate.organizationName,
        allocatedQuantity,
        unit: food.unit,
        matchingScore: candidate.matchingScore,
        distanceKm: candidate.distanceKm,
        reason:
          !canCompareProximity
            ? "Food type and unmet meal demand were scored; distance scoring was omitted because coordinates were incomplete."
            : "Food type, unmet meal demand, and relative distance among candidates were scored."
      });
    }

    if (allocationsForFood === 0) {
      unmatchedFoodIds.push(foodId);
    }
  }

  return createAgentResult({
    agent: "Matching Agent",
    startedAt,
    input: { safeFoodIds },
    output: {
      allocations,
      unmatchedFoodIds,
      scoringMethod:
        "Equal-weight mean of food-type compatibility, demand coverage, and relative proximity only when every candidate has coordinates."
    }
  });
}

module.exports = { runMatchingAgent, distanceInKilometers };
