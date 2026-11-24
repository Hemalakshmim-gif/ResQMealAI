const mongoose = require("mongoose");
const Delivery = require("../models/Delivery");
const Driver = require("../models/Driver");
const {
  RoutingError,
  isValidCoordinates,
  getDrivingRouteSequence,
  getTrafficMatrix
} = require("./routingService");
const { proposeStopOrder } = require("../agents/routeOptimizationAI");

const MAX_OPTIMIZED_DELIVERIES = 6;
const DRIVER_LOCATION_MAX_AGE_MS = 10 * 60 * 1000;
const ESTIMATED_SPEED_METERS_PER_SECOND = 7;

function routeError(message, statusCode, code) {
  return new RoutingError(message, statusCode, code);
}

function haversineMeters(first, second) {
  const radians = (degrees) => degrees * Math.PI / 180;
  const lat1 = radians(first.latitude);
  const lat2 = radians(second.latitude);
  const dLat = lat2 - lat1;
  const dLon = radians(second.longitude - first.longitude);
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function locationFromDelivery(delivery) {
  const location = delivery.latestLocation;
  if (!isValidCoordinates(location)) return null;
  const updatedAt = new Date(location.updatedAt);
  if (
    Number.isNaN(updatedAt.getTime()) ||
    Date.now() - updatedAt.getTime() > DRIVER_LOCATION_MAX_AGE_MS
  ) return null;
  return location;
}

function buildEstimatedDurationMatrix(coordinates, trafficMatrix) {
  return coordinates.map((origin, originIndex) =>
    coordinates.map((destination, destinationIndex) => {
      const trafficDuration = trafficMatrix?.durations?.[originIndex]?.[destinationIndex];
      if (Number.isFinite(trafficDuration)) return trafficDuration;
      return haversineMeters(origin, destination) / ESTIMATED_SPEED_METERS_PER_SECOND;
    })
  );
}

function evaluateStopOrder({ order, stopByKey, matrixIndexByStop, durationMatrix, initiallyPickedUp }) {
  const allKeys = [...stopByKey.keys()];
  if (
    !Array.isArray(order) ||
    order.length !== allKeys.length ||
    new Set(order).size !== allKeys.length ||
    order.some((key) => !stopByKey.has(key))
  ) return null;

  const pickedUp = new Set(initiallyPickedUp);
  let currentIndex = 0;
  let durationSeconds = 0;
  let missedExpiryCount = 0;
  const startTime = Date.now();
  for (const key of order) {
    const stop = stopByKey.get(key);
    if (stop.kind === "dropoff" && !pickedUp.has(stop.deliveryId)) return null;
    const nextIndex = matrixIndexByStop.get(key);
    durationSeconds += durationMatrix[currentIndex]?.[nextIndex] ?? Number.POSITIVE_INFINITY;
    if (stop.kind === "pickup") pickedUp.add(stop.deliveryId);
    if (
      stop.kind === "dropoff" &&
      stop.expiryTime &&
      startTime + durationSeconds * 1000 >= new Date(stop.expiryTime).getTime()
    ) missedExpiryCount++;
    currentIndex = nextIndex;
  }
  return { durationSeconds, missedExpiryCount };
}

async function optimizeDriverRoute({ driverId, deliveryIds }) {
  if (!Array.isArray(deliveryIds) || deliveryIds.length < 1 || deliveryIds.length > MAX_OPTIMIZED_DELIVERIES) {
    throw routeError(`Provide between 1 and ${MAX_OPTIMIZED_DELIVERIES} delivery IDs.`, 400, "INVALID_DELIVERY_SET");
  }
  const uniqueIds = [...new Set(deliveryIds.map(String))];
  if (uniqueIds.some((id) => !mongoose.isValidObjectId(id))) {
    throw routeError("A valid delivery ID is required.", 400, "INVALID_DELIVERY_ID");
  }
  if (uniqueIds.length !== deliveryIds.length) {
    throw routeError("Delivery IDs must not contain duplicates.", 400, "DUPLICATE_DELIVERY_ID");
  }

  const [driver, deliveries] = await Promise.all([
    Driver.findById(driverId).select("status capacityMeals").lean(),
    Delivery.find({
    _id: { $in: uniqueIds },
    driver: driverId,
    status: { $in: ["assigned", "picked_up", "in_transit"] }
  })
    .populate({
      path: "donation",
      select: "quantity food",
      populate: { path: "food", select: "foodName expiryTime" }
    })
      .lean()
  ]);
  if (!driver) throw routeError("Driver account was not found.", 404, "DRIVER_NOT_FOUND");
  if (driver.status === "unavailable") {
    throw routeError("Driver is marked unavailable.", 409, "DRIVER_UNAVAILABLE");
  }
  if (deliveries.length !== uniqueIds.length) {
    throw routeError("One or more deliveries are not active assignments for this driver.", 403, "DELIVERY_ACCESS_DENIED");
  }
  const totalMeals = deliveries.reduce(
    (total, delivery) => total + (Number(delivery.donation?.quantity) || 0),
    0
  );
  if (totalMeals > Number(driver.capacityMeals)) {
    throw routeError("The selected deliveries exceed this driver's meal capacity.", 409, "DRIVER_CAPACITY_EXCEEDED");
  }

  const latestLocationRecord = await Delivery.findOne({
    driver: driverId,
    "latestLocation.updatedAt": {
      $gte: new Date(Date.now() - DRIVER_LOCATION_MAX_AGE_MS)
    }
  })
    .select("latestLocation")
    .sort({ "latestLocation.updatedAt": -1 })
    .lean();
  const startLocation = latestLocationRecord
    ? locationFromDelivery(latestLocationRecord)
    : null;
  if (!startLocation) {
    throw routeError("A fresh GPS location is required to optimize this route.", 409, "LOCATION_UNAVAILABLE");
  }

  const startingCoordinates = {
    latitude: startLocation.latitude,
    longitude: startLocation.longitude
  };
  const current = { ...startingCoordinates };
  const pendingStops = [];
  for (const delivery of deliveries) {
    const isPickedUp = ["picked_up", "in_transit"].includes(delivery.status);
    if (!isPickedUp) {
      if (!isValidCoordinates(delivery.pickupCoordinates)) {
        throw routeError("A delivery is missing pickup coordinates.", 422, "PICKUP_COORDINATES_MISSING");
      }
      pendingStops.push({
        key: `${delivery._id}:pickup`,
        deliveryId: String(delivery._id),
        kind: "pickup",
        coordinates: delivery.pickupCoordinates,
        foodName: delivery.donation?.food?.foodName || "Food",
        expiryTime: delivery.donation?.food?.expiryTime || null,
        quantity: Number(delivery.donation?.quantity) || 0,
        requiresPickup: true
      });
    }
    if (!isValidCoordinates(delivery.deliveryCoordinates)) {
      throw routeError("A delivery is missing recipient coordinates.", 422, "DELIVERY_COORDINATES_MISSING");
    }
    pendingStops.push({
      key: `${delivery._id}:dropoff`,
      deliveryId: String(delivery._id),
      kind: "dropoff",
      coordinates: delivery.deliveryCoordinates,
      foodName: delivery.donation?.food?.foodName || "Food",
      expiryTime: delivery.donation?.food?.expiryTime || null,
      quantity: Number(delivery.donation?.quantity) || 0,
      requiresPickup: !isPickedUp
    });
  }

  const scheduled = [];
  const remaining = new Map(pendingStops.map((stop) => [stop.key, stop]));
  const matrixCoordinates = [startingCoordinates, ...pendingStops.map((stop) => stop.coordinates)];
  const matrixIndexByStop = new Map(
    pendingStops.map((stop, index) => [stop.key, index + 1])
  );
  const trafficMatrix = process.env.MAPBOX_ACCESS_TOKEN && matrixCoordinates.length <= 10
    ? await getTrafficMatrix({ coordinates: matrixCoordinates })
    : null;
  const estimatedDurationMatrix = buildEstimatedDurationMatrix(matrixCoordinates, trafficMatrix);
  const stopByKey = new Map(pendingStops.map((stop) => [stop.key, stop]));
  const initiallyPickedUp = new Set(
    deliveries
      .filter((delivery) => ["picked_up", "in_transit"].includes(delivery.status))
      .map((delivery) => String(delivery._id))
  );
  let currentMatrixIndex = 0;
  const pickedUp = new Set(initiallyPickedUp);
  let elapsedEstimateSeconds = 0;
  while (remaining.size > 0) {
    const eligible = [...remaining.values()].filter((stop) =>
      stop.kind === "pickup" || pickedUp.has(stop.deliveryId)
    );
    const ranked = eligible.map((stop) => {
      const targetMatrixIndex = matrixIndexByStop.get(stop.key);
      const trafficDuration = trafficMatrix?.durations?.[currentMatrixIndex]?.[targetMatrixIndex];
      const approximateSeconds = Number.isFinite(trafficDuration)
        ? trafficDuration
        : haversineMeters(current, stop.coordinates) / ESTIMATED_SPEED_METERS_PER_SECOND;
      const expiry = stop.expiryTime ? new Date(stop.expiryTime).getTime() : NaN;
      const slackSeconds = Number.isFinite(expiry)
        ? expiry / 1000 - Date.now() / 1000 - elapsedEstimateSeconds - approximateSeconds
        : Number.POSITIVE_INFINITY;
      return { stop, approximateSeconds, slackSeconds };
    }).sort((first, second) =>
      first.slackSeconds - second.slackSeconds ||
      first.approximateSeconds - second.approximateSeconds
    );
    const selected = ranked[0];
    const stop = selected.stop;
    currentMatrixIndex = matrixIndexByStop.get(stop.key);
    remaining.delete(stop.key);
    if (stop.kind === "pickup") pickedUp.add(stop.deliveryId);
    scheduled.push({
      ...stop,
      approximateArrivalAt: new Date(Date.now() +
        (elapsedEstimateSeconds + selected.approximateSeconds) * 1000),
      approximateExpirySlackSeconds: Number.isFinite(selected.slackSeconds)
        ? Math.round(selected.slackSeconds)
        : null
    });
    elapsedEstimateSeconds += selected.approximateSeconds;
    current.latitude = stop.coordinates.latitude;
    current.longitude = stop.coordinates.longitude;
  }

  let aiOptimizationUsed = false;
  let aiOptimizationStatus = process.env.GEMINI_API_KEY ? "fallback" : "not_configured";
  if (process.env.GEMINI_API_KEY && scheduled.length > 1) {
    try {
      const aiOrder = await proposeStopOrder({
        stops: pendingStops.map((stop) => ({
          key: stop.key,
          deliveryId: stop.deliveryId,
          kind: stop.kind,
          foodName: stop.foodName,
          quantity: stop.quantity,
          expiryTime: stop.expiryTime,
          coordinateIndex: matrixIndexByStop.get(stop.key),
          pickupAlreadyCompleted: initiallyPickedUp.has(stop.deliveryId)
        })),
        durationMatrix: estimatedDurationMatrix
      });
      const baselineMetrics = evaluateStopOrder({
        order: scheduled.map((stop) => stop.key),
        stopByKey,
        matrixIndexByStop,
        durationMatrix: estimatedDurationMatrix,
        initiallyPickedUp
      });
      const aiMetrics = evaluateStopOrder({
        order: aiOrder,
        stopByKey,
        matrixIndexByStop,
        durationMatrix: estimatedDurationMatrix,
        initiallyPickedUp
      });
      const acceptableExpiry = aiMetrics && baselineMetrics &&
        aiMetrics.missedExpiryCount <= baselineMetrics.missedExpiryCount;
      const acceptableTravel = aiMetrics && baselineMetrics &&
        (aiMetrics.missedExpiryCount < baselineMetrics.missedExpiryCount ||
          aiMetrics.durationSeconds <= baselineMetrics.durationSeconds * 1.35);
      if (acceptableExpiry && acceptableTravel) {
        scheduled.splice(0, scheduled.length, ...aiOrder.map((key) => stopByKey.get(key)));
        aiOptimizationUsed = true;
        aiOptimizationStatus = "accepted";
      } else {
        aiOptimizationStatus = aiOrder ? "rejected_by_constraints" : "unavailable";
      }
    } catch (error) {
      aiOptimizationStatus = "fallback_after_error";
      console.error("AI route ordering failed; using validated heuristic:", error.message);
    }
  }

  const route = await getDrivingRouteSequence({
    points: [startingCoordinates, ...scheduled.map((stop) => stop.coordinates)]
  });
  const legs = [];
  let totalDurationSeconds = 0;
  for (const [index, stop] of scheduled.entries()) {
    const leg = route.legs[index];
    totalDurationSeconds += leg.durationSeconds;
    const eta = new Date(Date.now() + totalDurationSeconds * 1000);
    legs.push({
      deliveryId: stop.deliveryId,
      kind: stop.kind,
      foodName: stop.foodName,
      quantity: stop.quantity,
      coordinates: stop.coordinates,
      distanceMeters: leg.distanceMeters,
      durationSeconds: leg.durationSeconds,
      eta,
      expiryTime: stop.expiryTime,
      expiryFeasible: stop.kind === "dropoff" && stop.expiryTime
        ? eta.getTime() < new Date(stop.expiryTime).getTime()
        : null
    });
  }

  return {
    driverId: String(driverId),
    optimizedAt: new Date(),
    optimizationMethod: aiOptimizationUsed
      ? `AI stop ordering with ${trafficMatrix ? "traffic-matrix" : "estimated distance"} costs and hard pickup/expiry checks`
      : trafficMatrix
        ? "traffic-matrix heuristic with pickup precedence and expiry urgency"
        : "nearest-stop distance heuristic with pickup precedence and expiry urgency",
    aiOptimizationUsed,
    aiOptimizationStatus,
    trafficAware: route.trafficAware,
    trafficAwareStopOrdering: Boolean(trafficMatrix),
    startLocation: startingCoordinates,
    stops: legs,
    coordinates: route.coordinates,
    totalDistanceMeters: route.distanceMeters,
    totalDurationSeconds,
    estimatedCompletionAt: new Date(Date.now() + totalDurationSeconds * 1000)
  };
}

module.exports = { optimizeDriverRoute, MAX_OPTIMIZED_DELIVERIES };
