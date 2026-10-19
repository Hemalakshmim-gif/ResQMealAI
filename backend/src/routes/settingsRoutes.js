
const express = require("express");
const {
  getSettings,
  updateSettings
} = require("../controllers/settingsController");
const {
  authenticateOrganization
} = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/", authenticateOrganization, getSettings);
router.patch("/", authenticateOrganization, updateSettings);

module.exports = router;
