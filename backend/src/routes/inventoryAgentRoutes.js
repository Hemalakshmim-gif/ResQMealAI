
const express = require("express");

const {
  analyzeInventoryController
} = require("../controllers/inventoryAgentController");

const router = express.Router();

router.get("/analyze", analyzeInventoryController);

module.exports = router;
