
const express = require("express");

const {
  registerDriver,
  loginDriver,
  updateDriverAvailability
} = require("../controllers/driverAuthController");
const { authenticateDriver } = require("../middleware/authMiddleware");

const router = express.Router();

// Independent driver registration
router.post("/register", registerDriver);

// Independent driver login
router.post("/login", loginDriver);

// Update availability using the driver identity in the verified JWT.
router.patch("/availability", authenticateDriver, updateDriverAvailability);

module.exports = router;
