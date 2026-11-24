
const Driver = require("../models/Driver");
const Delivery = require("../models/Delivery");
const Donation = require("../models/Donation");
const FoodInventory = require("../models/FoodInventory");

const {
  explainDriverRankings,
} = require("./logisticsAIReasoning");
const { createAgentResult } = require("./agentResult");

const {
  analyzeFoodSafety,
} = require("./foodSafetyEligibilityAgent");
const { isValidCoordinates, getDrivingRoute } = require("../services/routingService");

const DRIVER_LOCATION_MAX_AGE_MS = 60 * 60 * 1000;

const normalize = (value) =>
  String(value || "").trim().toLowerCase();

const planMatchedDelivery = async ({
  foodId,
  foodName,
  safetyStatus,
  quantity,
  unit,
  pickupAddress,
  deliveryAddress,
  pickupCoordinates,
  deliveryCoordinates,
  expiryTime
}) => {
  const startedAt = new Date();

  if (safetyStatus !== "SAFE") {
    throw new Error("Logistics planning requires SAFE food.");
  }

  if (
    typeof quantity !== "number" ||
    !Number.isFinite(quantity) ||
    quantity <= 0 ||
    normalize(unit) !== "meals"
  ) {
    throw new Error(
      "Logistics planning requires a positive meal quantity."
    );
  }

  if (
    typeof pickupAddress !== "string" ||
    !pickupAddress.trim() ||
    typeof deliveryAddress !== "string" ||
    !deliveryAddress.trim()
  ) {
    throw new Error("Pickup and delivery addresses are required.");
  }

  const drivers = await Driver.find({ status: "available" }).lean();
  let candidates = drivers
    .filter(
      (driver) =>
        Number.isFinite(Number(driver.capacityMeals)) &&
        Number(driver.capacityMeals) >= quantity
    )
    .map((driver) => ({
      driverId: String(driver._id),
      name: driver.name,
      vehicleType: driver.vehicleType,
      capacityMeals: Number(driver.capacityMeals),
      capacityRemainder: Number(driver.capacityMeals) - quantity
    }))
    .sort(
      (first, second) =>
        first.capacityRemainder - second.capacityRemainder ||
        first.driverId.localeCompare(second.driverId)
    );

  const validExpiry = expiryTime && Number.isFinite(new Date(expiryTime).getTime())
    ? new Date(expiryTime)
    : null;
  if (
    candidates.length > 0 &&
    process.env.ROUTING_API_BASE_URL &&
    isValidCoordinates(pickupCoordinates) &&
    isValidCoordinates(deliveryCoordinates)
  ) {
    const recentCutoff = new Date(Date.now() - DRIVER_LOCATION_MAX_AGE_MS);
    const recentDeliveries = await Delivery.find({
      driver: { $in: drivers.map((driver) => driver._id) },
      "latestLocation.updatedAt": { $gte: recentCutoff }
    })
      .select("driver latestLocation")
      .sort({ "latestLocation.updatedAt": -1 })
      .lean();
    const lastLocationByDriver = new Map();
    for (const item of recentDeliveries) {
      const key = String(item.driver);
      if (!lastLocationByDriver.has(key) && isValidCoordinates(item.latestLocation)) {
        lastLocationByDriver.set(key, item.latestLocation);
      }
    }
    const deliveryLeg = await getDrivingRoute({
      origin: pickupCoordinates,
      destination: deliveryCoordinates
    }).catch(() => null);
    const now = Date.now();
    candidates = await Promise.all(candidates.map(async (candidate) => {
      const origin = lastLocationByDriver.get(candidate.driverId);
      if (!origin) return { ...candidate, routeStatus: "driver_location_unavailable" };
      const pickupLeg = await getDrivingRoute({
        origin,
        destination: pickupCoordinates
      }).catch(() => null);
      if (!pickupLeg) return { ...candidate, routeStatus: "route_unavailable" };
      const estimatedTotalSeconds = pickupLeg.durationSeconds +
        (deliveryLeg?.durationSeconds || 0);
      const estimatedArrivalAt = new Date(now + estimatedTotalSeconds * 1000);
      const expiryFeasible = validExpiry && deliveryLeg
        ? estimatedArrivalAt.getTime() < validExpiry.getTime()
        : null;
      return {
        ...candidate,
        routeStatus: deliveryLeg ? "calculated" : "pickup_route_only",
        routeToPickupMeters: pickupLeg.distanceMeters,
        routeToPickupSeconds: pickupLeg.durationSeconds,
        estimatedTotalSeconds,
        estimatedArrivalAt,
        expiryFeasible
      };
    }));
    candidates = candidates.filter((candidate) => candidate.expiryFeasible !== false);
  }

  candidates.sort((first, second) => {
    if (first.expiryFeasible !== second.expiryFeasible) {
      if (first.expiryFeasible === true) return -1;
      if (second.expiryFeasible === true) return 1;
    }
    const firstHasRoute = Number.isFinite(first.routeToPickupSeconds);
    const secondHasRoute = Number.isFinite(second.routeToPickupSeconds);
    if (firstHasRoute !== secondHasRoute) return firstHasRoute ? -1 : 1;
    if (
      firstHasRoute && secondHasRoute &&
      first.routeToPickupSeconds !== second.routeToPickupSeconds
    ) {
      return first.routeToPickupSeconds - second.routeToPickupSeconds;
    }
    return first.capacityRemainder - second.capacityRemainder ||
      first.driverId.localeCompare(second.driverId);
  });

  return createAgentResult({
    agent: "Logistics Agent",
    startedAt,
    input: {
      foodId: String(foodId || ""),
      foodName: foodName || null,
      quantity,
      unit,
      pickupAddress: pickupAddress.trim(),
      deliveryAddress: deliveryAddress.trim()
    },
    output: {
      assignmentStatus:
        candidates.length > 0
          ? "driver_candidate_found"
          : "no_available_driver",
      selectedDriver: candidates[0] || null,
      candidateDrivers: candidates,
      deliveryStatus: "pending",
      reason:
        candidates.length > 0
          ? candidates[0].routeStatus === "calculated"
            ? "Driver is ranked using availability, capacity, a recent GPS position, road-route duration, and food expiry feasibility."
            : "Driver is ranked using availability and capacity; current GPS or road-route data was unavailable."
          : "No available driver has sufficient meal capacity."
    }
  });
};

const planDeliveries = async () => {
  const [deliveries, drivers, safetyAnalysis] = await Promise.all([
    Delivery.find({
      status: "pending",
      driver: null,
    })
      .populate({
        path: "donation",
        populate: {
          path: "food",
          select: "foodName quantity unit expiryTime foodType status",
        },
      })
      .lean(),

    Driver.find({ status: "available" }).lean(),

    analyzeFoodSafety(),
  ]);

  const driverIds = drivers.map((driver) => driver._id);
  const locationCutoff = new Date(Date.now() - DRIVER_LOCATION_MAX_AGE_MS);
  const recentDriverDeliveries = driverIds.length > 0
    ? await Delivery.find({
        driver: { $in: driverIds },
        "latestLocation.updatedAt": { $gte: locationCutoff }
      })
        .select("driver latestLocation")
        .sort({ "latestLocation.updatedAt": -1 })
        .lean()
    : [];
  const latestLocationByDriver = new Map();
  for (const item of recentDriverDeliveries) {
    const driverId = String(item.driver);
    if (!latestLocationByDriver.has(driverId) && isValidCoordinates(item.latestLocation)) {
      latestLocationByDriver.set(driverId, item.latestLocation);
    }
  }

  // Map the safety result to each food record.
  const safetyByFoodId = new Map(
    (safetyAnalysis.results || []).map((result) => [
      String(result._id),
      result,
    ])
  );

  const plans = await Promise.all(deliveries.map(async (delivery) => {
    const donation = delivery.donation;
    const food = donation?.food;

    const safetyEvaluation = food
      ? safetyByFoodId.get(String(food._id)) || null
      : null;

    const quantity = Number(donation?.quantity);
    const unit = normalize(food?.unit);

    const quantityKnown =
      Number.isFinite(quantity) && quantity > 0;

    const mealUnit = unit === "meal" || unit === "meals";

    const foodExpiry = food?.expiryTime
      ? new Date(food.expiryTime)
      : null;

    const hoursUntilExpiry =
      foodExpiry && !Number.isNaN(foodExpiry.getTime())
        ? (foodExpiry.getTime() - Date.now()) / 3600000
        : null;

    let planningStatus = "candidate_drivers_found";

    // Validate delivery and inventory before considering drivers.
    if (!donation || !food) {
      planningStatus = "food_or_donation_missing";
    } else if (!quantityKnown) {
      planningStatus = "quantity_unknown";
    } else if (!mealUnit) {
      planningStatus = "unsupported_unit";
    } else if (
      food.status !== "available" &&
      food.status !== "reserved"
    ) {
      planningStatus = "food_unavailable";
    } else if (
      hoursUntilExpiry === null ||
      hoursUntilExpiry <= 0
    ) {
      planningStatus = "expiry_invalid_or_passed";
    } else if (
      safetyEvaluation?.eligibilityStatus !== "approved" ||
      safetyEvaluation?.canBeRecommended !== true
    ) {
      // Safety approval is mandatory for logistics recommendations.
      planningStatus = "food_safety_not_approved";
    }

    const canPlan =
      planningStatus === "candidate_drivers_found";

    let candidates = canPlan
      ? drivers
          .filter(
            (driver) =>
              Number.isFinite(Number(driver.capacityMeals)) &&
              Number(driver.capacityMeals) >= quantity
          )
          .map((driver) => {
            const pickup = normalize(delivery.pickupAddress);
            const location = normalize(driver.currentLocation);

            const locationMatch =
              Boolean(pickup) &&
              Boolean(location) &&
              (
                pickup.includes(location) ||
                location.includes(pickup)
              );

            const lastKnownLocation = latestLocationByDriver.get(String(driver._id));
            return {
              driverId: String(driver._id),
              driverName: driver.name,
              vehicleType: driver.vehicleType,
              capacityMeals: driver.capacityMeals,
              currentLocation: driver.currentLocation,
              lastKnownLocation: lastKnownLocation
                ? {
                    latitude: lastKnownLocation.latitude,
                    longitude: lastKnownLocation.longitude,
                    updatedAt: lastKnownLocation.updatedAt
                  }
                : null,
              remainingCapacity: Number(driver.capacityMeals) - quantity,
              locationMatch,
              routeStatus: "not_calculated",
              routeToPickupMeters: null,
              routeToPickupSeconds: null,
              estimatedTotalSeconds: null,
              expiryFeasible: null,
              reason: locationMatch
                ? "Meal capacity is sufficient and the location strings match."
                : "Meal capacity is sufficient; pickup proximity still needs verification.",
            };
          })
          .sort(
            (a, b) =>
              Number(b.locationMatch) - Number(a.locationMatch)
          )
      : [];

    if (
      canPlan &&
      process.env.ROUTING_API_BASE_URL &&
      isValidCoordinates(delivery.pickupCoordinates) &&
      isValidCoordinates(delivery.deliveryCoordinates)
    ) {
      const deliveryLeg = await getDrivingRoute({
        origin: delivery.pickupCoordinates,
        destination: delivery.deliveryCoordinates
      }).catch(() => null);

      candidates = await Promise.all(candidates.map(async (candidate) => {
        if (!candidate.lastKnownLocation) return candidate;
        const driverLeg = await getDrivingRoute({
          origin: candidate.lastKnownLocation,
          destination: delivery.pickupCoordinates
        }).catch(() => null);
        if (!driverLeg) {
          return { ...candidate, routeStatus: "unavailable" };
        }
        const estimatedTotalSeconds = driverLeg.durationSeconds +
          (deliveryLeg?.durationSeconds || 0);
        const expiryFeasible = hoursUntilExpiry !== null && deliveryLeg
          ? estimatedTotalSeconds < hoursUntilExpiry * 3600
          : null;
        return {
          ...candidate,
          routeStatus: deliveryLeg ? "calculated" : "pickup_only",
          routeToPickupMeters: driverLeg.distanceMeters,
          routeToPickupSeconds: driverLeg.durationSeconds,
          estimatedTotalSeconds,
          expiryFeasible,
          reason: expiryFeasible === false
            ? "The available route estimate exceeds the food's remaining shelf life."
            : "Ranked using the driver's recent GPS location, route duration, meal capacity, and expiry time."
        };
      }));
      candidates = candidates.filter((candidate) => candidate.expiryFeasible !== false);
    }

    candidates.sort((first, second) => {
      if (first.expiryFeasible !== second.expiryFeasible) {
        if (first.expiryFeasible === true) return -1;
        if (second.expiryFeasible === true) return 1;
      }
      if (
        Number.isFinite(first.routeToPickupSeconds) &&
        Number.isFinite(second.routeToPickupSeconds) &&
        first.routeToPickupSeconds !== second.routeToPickupSeconds
      ) {
        return first.routeToPickupSeconds - second.routeToPickupSeconds;
      }
      if (first.locationMatch !== second.locationMatch) {
        return Number(second.locationMatch) - Number(first.locationMatch);
      }
      return first.remainingCapacity - second.remainingCapacity;
    });

    if (canPlan && candidates.length === 0) {
      planningStatus = "no_suitable_driver";
    }

    return {
      deliveryId: String(delivery._id),
      donationId: donation?._id
        ? String(donation._id)
        : null,
      foodId: food?._id
        ? String(food._id)
        : null,
      foodName: food?.foodName || null,
      deliveryStatus: delivery.status,
      pickupAddress: delivery.pickupAddress,
      deliveryAddress: delivery.deliveryAddress,
      quantity: quantityKnown ? quantity : null,
      unit: unit || null,
      hoursUntilExpiry,
      planningStatus,

      // Expose the safety decision for auditing and debugging.
      foodSafetyStatus:
        safetyEvaluation?.eligibilityStatus || "unknown",

      candidateDrivers: candidates,
    };
  }));

  let aiStatus = "not_needed";
  let aiRecommendationsCount = 0;

  try {
    // The AI only receives plans and drivers that passed rule-based checks.
    const recommendations = await explainDriverRankings(plans);

    const recommendationMap = new Map(
      recommendations.map((item) => [
        `${item.deliveryId}:${item.driverId}`,
        item,
      ])
    );

    for (const plan of plans) {
      for (const driver of plan.candidateDrivers) {
        const recommendation = recommendationMap.get(
          `${plan.deliveryId}:${driver.driverId}`
        );

        if (recommendation) {
          driver.aiSuggestedRank = recommendation.suggestedRank;
          driver.aiExplanation = recommendation.explanation;
          aiRecommendationsCount++;
        }
      }

      // Expiry feasibility and calculated route time remain primary;
      // AI ranking only breaks ties after deterministic eligibility.
      plan.candidateDrivers.sort((a, b) => {
        if (a.expiryFeasible !== b.expiryFeasible) {
          if (a.expiryFeasible === true) return -1;
          if (b.expiryFeasible === true) return 1;
        }
        const aHasRoute = Number.isFinite(a.routeToPickupSeconds);
        const bHasRoute = Number.isFinite(b.routeToPickupSeconds);
        if (aHasRoute !== bHasRoute) return aHasRoute ? -1 : 1;
        if (
          aHasRoute && bHasRoute &&
          a.routeToPickupSeconds !== b.routeToPickupSeconds
        ) {
          return a.routeToPickupSeconds - b.routeToPickupSeconds;
        }
        if (a.locationMatch !== b.locationMatch) {
          return Number(b.locationMatch) - Number(a.locationMatch);
        }

        return (
          (a.aiSuggestedRank ?? Number.MAX_SAFE_INTEGER) -
          (b.aiSuggestedRank ?? Number.MAX_SAFE_INTEGER)
        );
      });
    }

    aiStatus =
      recommendations.length > 0 ? "success" : "no_candidates";
  } catch (error) {
    // Rule-based plans remain available if AI fails.
    aiStatus = "fallback";

    console.error(
      "Logistics AI ranking unavailable; using rule-based results:",
      error.message
    );
  }

  return {
    analyzedAt: new Date(),
    aiStatus,
    aiRecommendationsCount,

    summary: {
      pendingDeliveries: deliveries.length,
      availableDrivers: drivers.length,
      deliveriesWithCandidates: plans.filter(
        (plan) => plan.candidateDrivers.length > 0
      ).length,
      deliveriesWithoutCandidates: plans.filter(
        (plan) => plan.candidateDrivers.length === 0
      ).length,
    },

    plans,
  };
};

module.exports = { planDeliveries, planMatchedDelivery };
