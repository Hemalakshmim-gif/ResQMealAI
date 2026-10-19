
const express = require("express");

const {
  createOrganization,
  getAllOrganizations,
  getOrganizationById,
  updateOrganization,
  deleteOrganization
} = require("../controllers/organizationController");

const router = express.Router();

router.post("/", createOrganization);
router.get("/", getAllOrganizations);
router.get("/:id", getOrganizationById);
router.patch("/:id", updateOrganization);
router.delete("/:id", deleteOrganization);

module.exports = router;
