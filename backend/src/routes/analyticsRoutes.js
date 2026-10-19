
const express = require("express");
const router = express.Router();

const {
  getImpactAnalytics
} = require("../controllers/analyticsController");

router.get("/impact", getImpactAnalytics);

module.exports = router;
