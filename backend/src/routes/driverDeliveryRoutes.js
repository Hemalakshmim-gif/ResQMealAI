
const express = require("express");

const {
  getMyDeliveries,
  updateMyDeliveryStatus,
  cancelMyDelivery
} = require("../controllers/driverDeliveryController");

const {
  authenticateDriver
} = require("../middleware/authMiddleware");

const router = express.Router();

// All routes require driver authentication
router.use(authenticateDriver);

// View logged-in driver's deliveries
router.get("/my-deliveries", getMyDeliveries);

// Update delivery progress
router.patch("/:id/status", updateMyDeliveryStatus);

// Cancel an assigned delivery
router.patch("/:id/cancel", cancelMyDelivery);

module.exports = router;
