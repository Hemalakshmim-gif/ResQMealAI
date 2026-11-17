const express = require("express");
const {
  startDeliveryTracking,
  getTrackingRoute,
  getTrackingSnapshot,
  updateTrackingLocation
} = require("../controllers/trackingController");
const {
  authenticateTrackingUser
} = require("../middleware/trackingAuthMiddleware");

const router = express.Router();

router.use(authenticateTrackingUser);
router.post("/deliveries/:deliveryId/start", startDeliveryTracking);
router.post(
  "/deliveries/:deliveryId/location",
  updateTrackingLocation
);
router.get("/deliveries/:deliveryId", getTrackingSnapshot);
router.get("/deliveries/:deliveryId/route", getTrackingRoute);

module.exports = router;
