const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const Delivery = require("../models/Delivery");
const Driver = require("../models/Driver");
const Organization = require("../models/Organization");
const { TrackingError } = require("./trackingService");

const RECIPIENT_TYPES = new Set(["ngo", "food_bank", "shelter"]);
const PROVIDER_TYPES = new Set(["restaurant", "hotel", "supermarket"]);

class TrackingAuthenticationError extends Error {
  constructor(message, statusCode, code) {
    super(message);
    this.name = "TrackingAuthenticationError";
    this.statusCode = statusCode;
    this.code = code;
  }
}

function referenceId(reference) {
  if (!reference) {
    return "";
  }

  return String(
    typeof reference === "object" && reference._id
      ? reference._id
      : reference
  );
}

function canAccessDelivery(user, delivery) {
  if (!user || !delivery) {
    return false;
  }

  if (user.role === "driver") {
    return referenceId(delivery.driver) === String(user.id);
  }

  const donation = delivery.donation;

  if (!donation || !user.organizationId) {
    return false;
  }

  if (user.role === "recipient") {
    return (
      referenceId(donation.recipient) ===
      String(user.organizationId)
    );
  }

  if (user.role === "provider") {
    return (
      referenceId(donation.food?.providerOrganization) ===
      String(user.organizationId)
    );
  }

  return false;
}

async function authenticateTrackingToken(token) {
  if (typeof token !== "string" || !token) {
    throw new TrackingAuthenticationError(
      "Authentication required.",
      401,
      "AUTHENTICATION_REQUIRED"
    );
  }

  if (!process.env.JWT_SECRET) {
    throw new TrackingAuthenticationError(
      "Authentication service is not configured.",
      500,
      "AUTHENTICATION_NOT_CONFIGURED"
    );
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET, {
      issuer: "nourivya-api"
    });
  } catch {
    throw new TrackingAuthenticationError(
      "Invalid or expired session.",
      401,
      "INVALID_SESSION"
    );
  }

  if (decoded.role === "driver" && decoded.driverId) {
    let driver;
    try {
      driver = await Driver.findById(decoded.driverId)
        .select("_id")
        .lean();
    } catch {
      throw new TrackingAuthenticationError(
        "Could not verify the driver session.",
        500,
        "AUTHENTICATION_UNAVAILABLE"
      );
    }

    if (!driver) {
      throw new TrackingAuthenticationError(
        "Invalid or expired session.",
        401,
        "INVALID_SESSION"
      );
    }

    return {
      role: "driver",
      id: String(driver._id)
    };
  }

  if (
    decoded.organizationId &&
    ["provider", "recipient"].includes(decoded.role)
  ) {
    let organization;
    try {
      organization = await Organization.findById(
        decoded.organizationId
      )
        .select("_id type isActive")
        .lean();
    } catch {
      throw new TrackingAuthenticationError(
        "Could not verify the organization session.",
        500,
        "AUTHENTICATION_UNAVAILABLE"
      );
    }

    const actualRole = organization
      ? RECIPIENT_TYPES.has(organization.type)
        ? "recipient"
        : PROVIDER_TYPES.has(organization.type)
          ? "provider"
          : null
      : null;

    if (
      !organization ||
      organization.isActive !== true ||
      actualRole !== decoded.role
    ) {
      throw new TrackingAuthenticationError(
        "Invalid or expired session.",
        401,
        "INVALID_SESSION"
      );
    }

    return {
      role: actualRole,
      id: String(organization._id),
      organizationId: String(organization._id)
    };
  }

  throw new TrackingAuthenticationError(
    "Invalid or expired session.",
    401,
    "INVALID_SESSION"
  );
}

async function loadAuthorizedDelivery(deliveryId, user) {
  if (!mongoose.isValidObjectId(deliveryId)) {
    throw new TrackingError(
      "A valid delivery ID is required.",
      400,
      "INVALID_DELIVERY_ID"
    );
  }

  const delivery = await Delivery.findById(deliveryId)
    .select(
      "driver donation status pickupAddress deliveryAddress pickupCoordinates deliveryCoordinates trackingActive latestLocation"
    )
    .populate("driver", "name")
    .populate({
      path: "donation",
      select: "food recipient quantity",
      populate: [
        {
          path: "food",
          select: "foodName providerName providerOrganization"
        },
        {
          path: "recipient",
          select: "name isActive"
        }
      ]
    })
    .lean();

  if (!delivery) {
    throw new TrackingError(
      "Delivery not found.",
      404,
      "DELIVERY_NOT_FOUND"
    );
  }

  if (!canAccessDelivery(user, delivery)) {
    throw new TrackingError(
      "You are not authorized to view this delivery.",
      403,
      "DELIVERY_ACCESS_DENIED"
    );
  }

  return {
    deliveryId: String(delivery._id),
    status: delivery.status,
    trackingActive: delivery.trackingActive,
    latestLocation: delivery.latestLocation || null,
    driver: {
      name: delivery.driver?.name || null
    },
    pickup: {
      address: delivery.pickupAddress,
      coordinates: delivery.pickupCoordinates || null,
      providerName: delivery.donation?.food?.providerName || null
    },
    destination: {
      address: delivery.deliveryAddress,
      coordinates: delivery.deliveryCoordinates || null,
      organizationName: delivery.donation?.recipient?.name || null
    },
    donation: {
      quantity: delivery.donation?.quantity ?? null,
      foodName: delivery.donation?.food?.foodName || null
    }
  };
}

module.exports = {
  TrackingAuthenticationError,
  authenticateTrackingToken,
  canAccessDelivery,
  loadAuthorizedDelivery
};
