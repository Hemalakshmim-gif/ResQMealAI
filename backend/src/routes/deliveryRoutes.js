
const express = require("express");

const {
  createDelivery,
  getAllDeliveries,
  getDeliveryById,
  updateDelivery,
  deleteDelivery,
  assignDelivery
} = require("../controllers/deliveryController");

const router = express.Router();

router.post("/", createDelivery);
router.get("/", getAllDeliveries);
router.get("/:id", getDeliveryById);
router.patch("/:id", updateDelivery);
router.delete("/:id", deleteDelivery);
router.patch("/:id/assign", assignDelivery);
module.exports = router;
