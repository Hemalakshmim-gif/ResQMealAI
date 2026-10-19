
const express = require("express");

const {
  analyzeDemandMatchingController,
  analyzeDemandMatchingWithSurplusController,
} = require("../controllers/demandMatchingController");

const router = express.Router();

// Existing endpoint — unchanged behavior.
router.get("/analyze", analyzeDemandMatchingController);

// New endpoint — uses expected provider demand to estimate surplus.
router.post(
  "/analyze-with-surplus",
  analyzeDemandMatchingWithSurplusController
);

module.exports = router;
