
const express = require("express");

const {
  createDonation,
  getAllDonations,
  getDonationById,
  updateDonation,
  dispatchPreparedDonation,
  deleteDonation
} = require("../controllers/donationController");
const { authenticateOrganization } = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/", createDonation);
router.get("/", getAllDonations);
router.get("/:id", getDonationById);
router.post("/:id/dispatch", authenticateOrganization, dispatchPreparedDonation);
router.patch("/:id", updateDonation);
router.delete("/:id", deleteDonation);

module.exports = router;
