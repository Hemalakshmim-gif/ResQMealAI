
const express = require("express");

const {
  createFood,
  getAllFood,
  getFoodById,
  updateFood,
  deleteFood
} = require("../controllers/inventoryController");
const {
  authenticateOrganizationIfProvided
} = require("../middleware/authMiddleware");

const router = express.Router();

// Create a food listing
router.post("/", authenticateOrganizationIfProvided, createFood);

// Get all food listings
router.get("/", getAllFood);

// Get one food listing
router.get("/:id", getFoodById);

// Update selected fields
router.patch("/:id", updateFood);

// Delete a food listing
router.delete("/:id", deleteFood);

module.exports = router;
