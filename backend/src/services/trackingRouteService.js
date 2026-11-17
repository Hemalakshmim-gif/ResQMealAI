const { TrackingError } = require("./trackingService");
const { loadAuthorizedDelivery } = require("./trackingAccess");
const {
  getDrivingRoute,
  isValidCoordinates
} = require("./routingService");

const ROUTE_REQUEST_COOLDOWN_MS = 15000;
const ROUTE_CACHE_RETENTION_MS = 60000;
const MAX_CACHED_DELIVERIES = 1000;
const routeRequestsByDelivery = new Map();

async function getAuthorizedDeliveryRoute(deliveryId, user) {
  const snapshot = await loadAuthorizedDelivery(deliveryId, user);

  if (!snapshot.trackingActive) {
    throw new TrackingError(
      "ETA is unavailable while driver tracking is inactive.",
      409,
      "TRACKING_INACTIVE"
    );
  }

  if (!isValidCoordinates(snapshot.latestLocation)) {
    throw new TrackingError(
      "A valid driver GPS location is required to calculate ETA.",
      409,
      "LOCATION_UNAVAILABLE"
    );
  }

  const originUpdatedAt = new Date(
    snapshot.latestLocation.updatedAt
  );
  if (
    Number.isNaN(originUpdatedAt.getTime()) ||
    Date.now() - originUpdatedAt.getTime() > 60000
  ) {
    throw new TrackingError(
      "A recent driver GPS location is required to calculate ETA.",
      409,
      "LOCATION_STALE"
    );
  }

  if (!isValidCoordinates(snapshot.destination.coordinates)) {
    throw new TrackingError(
      "A recipient destination coordinate is required to calculate ETA.",
      409,
      "DESTINATION_COORDINATES_UNAVAILABLE"
    );
  }

  const now = Date.now();
  const previousRequest =
    routeRequestsByDelivery.get(snapshot.deliveryId);

  if (
    previousRequest &&
    now - previousRequest.requestedAt < ROUTE_REQUEST_COOLDOWN_MS
  ) {
    const sameRouteInputs =
      previousRequest.originUpdatedAt === originUpdatedAt.getTime() &&
      previousRequest.destination.latitude ===
        snapshot.destination.coordinates.latitude &&
      previousRequest.destination.longitude ===
        snapshot.destination.coordinates.longitude;

    if (previousRequest.data && sameRouteInputs) {
      return previousRequest.data;
    }

    throw new TrackingError(
      "A route was calculated recently. Please wait before refreshing it.",
      429,
      "ROUTE_RATE_LIMITED"
    );
  }

  for (const [cachedDeliveryId, request] of routeRequestsByDelivery) {
    if (now - request.requestedAt >= ROUTE_CACHE_RETENTION_MS) {
      routeRequestsByDelivery.delete(cachedDeliveryId);
    }
  }

  while (
    !routeRequestsByDelivery.has(snapshot.deliveryId) &&
    routeRequestsByDelivery.size >= MAX_CACHED_DELIVERIES
  ) {
    const oldestDeliveryId =
      routeRequestsByDelivery.keys().next().value;
    routeRequestsByDelivery.delete(oldestDeliveryId);
  }

  const cacheEntry = {
    requestedAt: now,
    originUpdatedAt: originUpdatedAt.getTime(),
    destination: snapshot.destination.coordinates,
    data: null
  };
  routeRequestsByDelivery.set(snapshot.deliveryId, cacheEntry);

  const route = await getDrivingRoute({
    origin: snapshot.latestLocation,
    destination: snapshot.destination.coordinates
  });

  const routeData = {
    ...route,
    origin: {
      latitude: snapshot.latestLocation.latitude,
      longitude: snapshot.latestLocation.longitude
    },
    originUpdatedAt
  };
  cacheEntry.data = routeData;

  return routeData;
}

module.exports = { getAuthorizedDeliveryRoute };
