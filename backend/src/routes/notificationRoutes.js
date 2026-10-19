
const express = require("express");
const router = express.Router();

const {
  getNotifications,
  markAllNotificationsRead
} = require("../controllers/notificationController");

router.get("/", getNotifications);
router.patch("/read-all", markAllNotificationsRead);

module.exports = router;
