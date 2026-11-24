
const express = require("express");

const {
  createOrganization,
  getAllOrganizations,
  getOrganizationById,
  updateOrganization,
  deleteOrganization,
  getMyRecipientRequirements,
  updateMyRecipientRequirements
} = require("../controllers/organizationController");
const {
  authenticateOrganizationIfProvided,
  authenticateOrganization
} = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/", createOrganization);
router.get("/", getAllOrganizations);
router.get("/me/requirements", authenticateOrganization, getMyRecipientRequirements);
router.patch("/me/requirements", authenticateOrganization, updateMyRecipientRequirements);
router.get("/:id", getOrganizationById);
router.patch(
  "/:id",
  authenticateOrganizationIfProvided,
  updateOrganization
);
router.delete("/:id", deleteOrganization);

module.exports = router;
