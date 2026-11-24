
const express = require("express");
const { authenticateOrganization } = require("../middleware/authMiddleware");
const router = express.Router();

const {
  getNotifications,
  markAllNotificationsRead
} = require("../controllers/notificationController");

router.use(authenticateOrganization);
router.get("/", getNotifications);
router.patch("/read-all", markAllNotificationsRead);

module.exports = router;
