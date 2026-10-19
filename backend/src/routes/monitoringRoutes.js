
const express = require("express");
const router = express.Router();

const {
  getMonitoringIncidents
} = require("../controllers/monitoringController");

router.get("/incidents", getMonitoringIncidents);

module.exports = router;
