const mongoose = require("mongoose");
const Delivery = require("../models/Delivery");
const {
  maybeNotifyRecipientEta,
  notifyRecipientOfProgress
} = require("./deliveryProgressNotificationService");

const TRACKABLE_STATUSES = ["assigned", "picked_up", "in_transit"];
const TERMINAL_STATUSES = ["delivered", "failed", "cancelled"];

class TrackingError extends Error {
  constructor(message, statusCode, code) {
    super(message);
    this.name = "TrackingError";
    this.statusCode = statusCode;
    this.code = code;
  }
}

function validateTrackingIds(deliveryId, driverId) {
  if (
    !mongoose.isValidObjectId(deliveryId) ||
    !mongoose.isValidObjectId(driverId)
  ) {
    throw new TrackingError(
      "Valid delivery and driver IDs are required.",
      400,
      "INVALID_TRACKING_ID"
    );
  }
}

function validateServerTime(now) {
  if (!(now instanceof Date) || Number.isNaN(now.getTime())) {
    throw new TrackingError(
      "The server timestamp is invalid.",
      500,
      "INVALID_SERVER_TIME"
    );
  }
}

function validateLocation(location, now = new Date()) {
  if (!location || typeof location !== "object" || Array.isArray(location)) {
    throw new TrackingError(
      "A GPS location object is required.",
      400,
      "INVALID_LOCATION"
    );
  }

  const { latitude, longitude, accuracy, heading, speed } = location;

  if (
    typeof latitude !== "number" ||
    !Number.isFinite(latitude) ||
    latitude < -90 ||
    latitude > 90
  ) {
    throw new TrackingError(
      "Latitude must be a finite number between -90 and 90.",
      400,
      "INVALID_LATITUDE"
    );
  }

  if (
    typeof longitude !== "number" ||
    !Number.isFinite(longitude) ||
    longitude < -180 ||
    longitude > 180
  ) {
    throw new TrackingError(
      "Longitude must be a finite number between -180 and 180.",
      400,
      "INVALID_LONGITUDE"
    );
  }

  if (
    typeof accuracy !== "number" ||
    !Number.isFinite(accuracy) ||
    accuracy < 0
  ) {
    throw new TrackingError(
      "GPS accuracy must be a finite, non-negative number.",
      400,
      "INVALID_ACCURACY"
    );
  }

  if (
    heading !== undefined &&
    heading !== null &&
    (
      typeof heading !== "number" ||
      !Number.isFinite(heading) ||
      heading < 0 ||
      heading > 360
    )
  ) {
    throw new TrackingError(
      "Heading must be between 0 and 360 degrees.",
      400,
      "INVALID_HEADING"
    );
  }

  if (
    speed !== undefined &&
    speed !== null &&
    (
      typeof speed !== "number" ||
      !Number.isFinite(speed) ||
      speed < 0
    )
  ) {
    throw new TrackingError(
      "Speed must be a finite, non-negative number.",
      400,
      "INVALID_SPEED"
    );
  }

  validateServerTime(now);

  const validated = {
    latitude,
    longitude,
    accuracy,
    updatedAt: now
  };

  if (heading !== undefined && heading !== null) {
    validated.heading = heading;
  }

  if (speed !== undefined && speed !== null) {
    validated.speed = speed;
  }

  return validated;
}

async function startTracking({ deliveryId, driverId, now = new Date() }) {
  validateTrackingIds(deliveryId, driverId);
  validateServerTime(now);

  const delivery = await Delivery.findOne({
    _id: deliveryId,
    driver: driverId
  });

  if (!delivery) {
    throw new TrackingError(
      "Delivery not found or not assigned to this driver.",
      404,
      "DELIVERY_NOT_FOUND"
    );
  }

  if (!TRACKABLE_STATUSES.includes(delivery.status)) {
    throw new TrackingError(
      "Tracking can only start for an assigned or active delivery.",
      409,
      "DELIVERY_NOT_TRACKABLE"
    );
  }

  if (delivery.trackingActive) {
    return delivery;
  }

  const updatedDelivery = await Delivery.findOneAndUpdate(
    {
      _id: deliveryId,
      driver: driverId,
      status: delivery.status,
      trackingActive: { $ne: true }
    },
    {
      $set: {
        trackingActive: true,
        trackingStartedAt: now,
        trackingStoppedAt: null
      }
    },
    { returnDocument: "after", runValidators: true }
  );

  if (updatedDelivery) {
    void notifyRecipientOfProgress({
      deliveryId: updatedDelivery._id,
      event: "tracking_started"
    }).catch((error) => {
      console.error("Could not create recipient tracking notification:", error.message);
    });
    return updatedDelivery;
  }

  const latestDelivery = await Delivery.findOne({
    _id: deliveryId,
    driver: driverId
  });

  if (
    latestDelivery?.trackingActive &&
    TRACKABLE_STATUSES.includes(latestDelivery.status)
  ) {
    return latestDelivery;
  }

  throw new TrackingError(
    "Delivery changed before tracking could start.",
    409,
    "TRACKING_START_CONFLICT"
  );
}

async function updateDriverLocation({
  deliveryId,
  driverId,
  location,
  now = new Date()
}) {
  validateTrackingIds(deliveryId, driverId);
  validateServerTime(now);
  const latestLocation = validateLocation(location, now);

  const delivery = await Delivery.findOneAndUpdate(
    {
      _id: deliveryId,
      driver: driverId,
      status: { $in: TRACKABLE_STATUSES },
      trackingActive: true
    },
    { $set: { latestLocation } },
    { returnDocument: "after", runValidators: true }
  );

  if (delivery) {
    void maybeNotifyRecipientEta(delivery._id).catch((error) => {
      console.error("Could not calculate recipient ETA notification:", error.message);
    });
    return delivery;
  }

  const ownedDelivery = await Delivery.findOne({
    _id: deliveryId,
    driver: driverId
  }).select("_id");

  if (!ownedDelivery) {
    throw new TrackingError(
      "Delivery not found or not assigned to this driver.",
      404,
      "DELIVERY_NOT_FOUND"
    );
  }

  throw new TrackingError(
    "Tracking is inactive or the delivery is no longer active.",
    409,
    "TRACKING_INACTIVE"
  );
}

async function stopTracking({
  deliveryId,
  driverId,
  now = new Date()
}) {
  validateTrackingIds(deliveryId, driverId);
  validateServerTime(now);

  const delivery = await Delivery.findOneAndUpdate(
    {
      _id: deliveryId,
      driver: driverId,
      status: { $in: TERMINAL_STATUSES },
      trackingActive: true
    },
    {
      $set: {
        trackingActive: false,
        trackingStoppedAt: now
      }
    },
    { returnDocument: "after", runValidators: true }
  );

  if (delivery) {
    return delivery;
  }

  const ownedDelivery = await Delivery.findOne({
    _id: deliveryId,
    driver: driverId
  });

  if (!ownedDelivery) {
    throw new TrackingError(
      "Delivery not found or not assigned to this driver.",
      404,
      "DELIVERY_NOT_FOUND"
    );
  }

  if (
    ownedDelivery.trackingActive &&
    !TERMINAL_STATUSES.includes(ownedDelivery.status)
  ) {
    throw new TrackingError(
      "Tracking can only stop after a delivery is completed or terminated.",
      409,
      "DELIVERY_STILL_ACTIVE"
    );
  }

  return ownedDelivery;
}

module.exports = {
  TRACKABLE_STATUSES,
  TrackingError,
  validateLocation,
  startTracking,
  updateDriverLocation,
  stopTracking
};
