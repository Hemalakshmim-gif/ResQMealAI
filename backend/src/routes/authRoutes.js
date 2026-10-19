
const express = require("express");
const { loginOrganization } = require("../controllers/authController");

const router = express.Router();

router.post("/login", loginOrganization);

module.exports = router;
