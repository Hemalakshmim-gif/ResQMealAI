const Delivery = require("../models/Delivery");
const Notification = require("../models/Notification");
const { isValidCoordinates, getDrivingRoute } = require("./routingService");

const ETA_RECHECK_INTERVAL_MS = 5 * 60 * 1000;
const ETA_NOTIFICATION_COOLDOWN_MS = 15 * 60 * 1000;
const MIN_ETA_CHANGE_MINUTES = 10;
const MAX_LOCATION_AGE_MS = 60 * 1000;
const etaCheckAtByDelivery = new Map();

const progressEvents = {
  awaiting_driver: {
    title: "Delivery awaiting a driver",
    desc: (foodName) => `${foodName} has been matched and is awaiting driver assignment.`,
    severity: "info"
  },
  assigned: {
    title: "Driver assigned",
    desc: (foodName) => `A driver has been assigned to deliver ${foodName}.`,
    severity: "info"
  },
  tracking_started: {
    title: "Delivery tracking started",
    desc: (foodName) => `Live driver tracking has started for ${foodName}.`,
    severity: "info"
  },
  picked_up: {
    title: "Food picked up",
    desc: (foodName) => `The driver picked up ${foodName}.`,
    severity: "success"
  },
  in_transit: {
    title: "Delivery on the way",
    desc: (foodName) => `${foodName} is on the way to your organization.`,
    severity: "info"
  },
  delivered: {
    title: "Food delivered",
    desc: (foodName) => `${foodName} has been marked as delivered.`,
    severity: "success"
  },
  failed: {
    title: "Delivery needs attention",
    desc: (foodName, delivery) =>
      `${foodName} could not be delivered.${delivery.failureReason ? ` ${delivery.failureReason}` : ""}`,
    severity: "critical"
  },
  cancelled: {
    title: "Delivery cancelled",
    desc: (foodName) => `The delivery for ${foodName} was cancelled.`,
    severity: "warning"
  }
};

async function getDeliveryForNotification(deliveryId) {
  return Delivery.findById(deliveryId)
    .populate({
      path: "donation",
      populate: [
        { path: "food", select: "foodName" },
        { path: "recipient", select: "_id name" }
      ]
    })
    .lean();
}

async function notifyRecipientOfProgress({ deliveryId, event }) {
  const definition = progressEvents[event];
  if (!definition) return false;
  const delivery = await getDeliveryForNotification(deliveryId);
  const recipient = delivery?.donation?.recipient;
  if (!recipient?._id) return false;

  const foodName = delivery.donation.food?.foodName || "your food donation";
  const occurrence = new Date(delivery.updatedAt || delivery.createdAt || Date.now()).getTime();
  const notification = {
    eventKey: `delivery-progress:${delivery._id}:${event}:${occurrence}`,
    title: definition.title,
    desc: definition.desc(foodName, delivery),
    category: "Delivery",
    severity: definition.severity,
    sourceType: "delivery",
    sourceId: String(delivery._id),
    recipientOrganization: recipient._id,
    occurredAt: new Date()
  };
  await Notification.updateOne(
    { eventKey: notification.eventKey },
    { $setOnInsert: notification },
    { upsert: true }
  );
  return true;
}

async function maybeNotifyRecipientEta(deliveryId) {
  const now = Date.now();
  if (!process.env.ROUTING_API_BASE_URL) return false;
  const lastCheck = etaCheckAtByDelivery.get(String(deliveryId)) || 0;
  if (now - lastCheck < ETA_RECHECK_INTERVAL_MS) return false;
  etaCheckAtByDelivery.set(String(deliveryId), now);

  const delivery = await Delivery.findById(deliveryId)
    .populate({
      path: "donation",
      populate: [
        { path: "food", select: "foodName" },
        { path: "recipient", select: "_id" }
      ]
    })
    .lean();
  if (
    !delivery?.trackingActive ||
    !delivery.donation?.recipient?._id ||
    !isValidCoordinates(delivery.latestLocation) ||
    !isValidCoordinates(delivery.deliveryCoordinates)
  ) return false;

  const locationTime = new Date(delivery.latestLocation.updatedAt).getTime();
  if (!Number.isFinite(locationTime) || now - locationTime > MAX_LOCATION_AGE_MS) {
    return false;
  }

  const route = await getDrivingRoute({
    origin: delivery.latestLocation,
    destination: delivery.deliveryCoordinates
  });
  const etaMinutes = Math.max(1, Math.round(route.durationSeconds / 60));
  const lastEtaMinutes = delivery.lastEtaNotificationMinutes;
  const lastNotifiedAt = delivery.lastEtaNotificationAt
    ? new Date(delivery.lastEtaNotificationAt).getTime()
    : null;
  if (
    Number.isFinite(lastEtaMinutes) &&
    (
      Math.abs(etaMinutes - lastEtaMinutes) < MIN_ETA_CHANGE_MINUTES ||
      (lastNotifiedAt && now - lastNotifiedAt < ETA_NOTIFICATION_COOLDOWN_MS)
    )
  ) return false;

  const bucket = Math.floor(now / ETA_NOTIFICATION_COOLDOWN_MS);
  const foodName = delivery.donation.food?.foodName || "your food donation";
  const firstEta = !Number.isFinite(lastEtaMinutes);
  const eventKey = `delivery-eta:${delivery._id}:${bucket}:${etaMinutes}`;
  await Notification.updateOne(
    { eventKey },
    {
      $setOnInsert: {
        eventKey,
        title: firstEta ? "Delivery ETA available" : "Delivery ETA updated",
        desc: firstEta
          ? `Estimated arrival for ${foodName} is about ${etaMinutes} minutes.`
          : `The updated estimated arrival for ${foodName} is about ${etaMinutes} minutes.`,
        category: "Delivery",
        severity: "info",
        sourceType: "delivery",
        sourceId: String(delivery._id),
        recipientOrganization: delivery.donation.recipient._id,
        occurredAt: new Date(now)
      }
    },
    { upsert: true }
  );
  await Delivery.updateOne(
    {
      _id: delivery._id,
      lastEtaNotificationAt: delivery.lastEtaNotificationAt || null
    },
    {
      $set: {
        lastEtaNotificationAt: new Date(now),
        lastEtaNotificationMinutes: etaMinutes
      }
    }
  );
  return true;
}

module.exports = {
  notifyRecipientOfProgress,
  maybeNotifyRecipientEta
};
