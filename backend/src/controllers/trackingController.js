const {
  TrackingError,
  startTracking,
  updateDriverLocation
} = require("../services/trackingService");
const { RoutingError } = require("../services/routingService");
const { loadAuthorizedDelivery } = require("../services/trackingAccess");
const {
  getAuthorizedDeliveryRoute
} = require("../services/trackingRouteService");

function sendTrackingError(res, error) {
  if (
    error instanceof TrackingError ||
    error instanceof RoutingError
  ) {
    return res.status(error.statusCode).json({
      success: false,
      code: error.code,
      message: error.message
    });
  }

  console.error("Tracking REST operation failed:", error);
  return res.status(500).json({
    success: false,
    code: "TRACKING_OPERATION_FAILED",
    message: "The tracking request could not be completed."
  });
}

async function getTrackingSnapshot(req, res) {
  try {
    const data = await loadAuthorizedDelivery(
      req.params.deliveryId,
      req.trackingUser
    );

    return res.status(200).json({ success: true, data });
  } catch (error) {
    return sendTrackingError(res, error);
  }
}

async function getTrackingRoute(req, res) {
  try {
    const data = await getAuthorizedDeliveryRoute(
      req.params.deliveryId,
      req.trackingUser
    );

    return res.status(200).json({ success: true, data });
  } catch (error) {
    return sendTrackingError(res, error);
  }
}

function requireDriver(req, res) {
  if (req.trackingUser.role === "driver") {
    return true;
  }

  res.status(403).json({
    success: false,
    code: "DRIVER_ACCESS_REQUIRED",
    message: "Only the assigned driver can update delivery tracking."
  });
  return false;
}

async function startDeliveryTracking(req, res) {
  if (!requireDriver(req, res)) {
    return undefined;
  }

  try {
    await startTracking({
      deliveryId: req.params.deliveryId,
      driverId: req.trackingUser.id
    });

    const data = await loadAuthorizedDelivery(
      req.params.deliveryId,
      req.trackingUser
    );

    return res.status(200).json({ success: true, data });
  } catch (error) {
    return sendTrackingError(res, error);
  }
}

async function updateTrackingLocation(req, res) {
  if (!requireDriver(req, res)) {
    return undefined;
  }

  try {
    const delivery = await updateDriverLocation({
      deliveryId: req.params.deliveryId,
      driverId: req.trackingUser.id,
      location: {
        latitude: req.body?.latitude,
        longitude: req.body?.longitude,
        accuracy: req.body?.accuracy,
        heading: req.body?.heading,
        speed: req.body?.speed
      }
    });

    const update = {
      deliveryId: String(delivery._id),
      location: delivery.latestLocation
    };
    const io = req.app.get("io");

    if (!io || typeof io.to !== "function") {
      throw new Error("Tracking event service is not available.");
    }

    io.to(`delivery:${update.deliveryId}`).emit(
      "tracking:location",
      update
    );

    return res.status(200).json({ success: true, data: update });
  } catch (error) {
    return sendTrackingError(res, error);
  }
}

module.exports = {
  getTrackingSnapshot,
  getTrackingRoute,
  startDeliveryTracking,
  updateTrackingLocation
};
