
const express = require("express");

const {
  createDonation,
  getAllDonations,
  getDonationById,
  updateDonation,
  deleteDonation
} = require("../controllers/donationController");

const router = express.Router();

router.post("/", createDonation);
router.get("/", getAllDonations);
router.get("/:id", getDonationById);
router.patch("/:id", updateDonation);
router.delete("/:id", deleteDonation);

module.exports = router;
