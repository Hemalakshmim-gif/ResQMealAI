
const express = require("express");

const {
  createDriver,
  getAllDrivers,
  getDriverById,
  updateDriver,
  deleteDriver
} = require("../controllers/driverController");

const router = express.Router();

router.post("/", createDriver);
router.get("/", getAllDrivers);
router.get("/:id", getDriverById);
router.patch("/:id", updateDriver);
router.delete("/:id", deleteDriver);

module.exports = router;
