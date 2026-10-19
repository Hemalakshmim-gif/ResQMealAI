
require("dotenv").config();

const express = require("express");
const cors = require("cors");

const connectDB = require("./src/config/db");
const healthRoutes = require("./src/routes/healthRoutes");
const inventoryRoutes = require("./src/routes/inventoryRoutes");
const organizationRoutes = require("./src/routes/organizationRoutes");
const donationRoutes = require("./src/routes/donationRoutes");
const driverRoutes = require("./src/routes/driverRoutes");
const deliveryRoutes = require("./src/routes/deliveryRoutes");
const inventoryAgentRoutes = require("./src/routes/inventoryAgentRoutes");
const demandMatchingRoutes = require("./src/routes/demandMatchingRoutes");
const foodSafetyRoutes = require("./src/routes/foodSafetyRoutes");
const settingsRoutes = require("./src/routes/settingsRoutes");
const notificationRoutes = require("./src/routes/notificationRoutes");
const analyticsRoutes = require("./src/routes/analyticsRoutes");
const monitoringRoutes = require("./src/routes/monitoringRoutes");
const replanningRoutes = require("./src/routes/replanningRoutes");
const authRoutes = require("./src/routes/authRoutes");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/health", healthRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/organizations", organizationRoutes);
app.use("/api/donations", donationRoutes);
app.use("/api/drivers", driverRoutes);
app.use("/api/deliveries", deliveryRoutes);
app.use("/api/agents/inventory-surplus", inventoryAgentRoutes);
app.use("/api/agents/demand-matching", demandMatchingRoutes);
app.use("/api/food-safety", foodSafetyRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/monitoring", monitoringRoutes);
app.use("/api/replanning", replanningRoutes);
app.use("/api/auth", authRoutes);

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  await connectDB();

  app.listen(PORT, () => {
    console.log(`Nourivya API running on port ${PORT}`);
    console.log(`Health URL: http://localhost:${PORT}/api/health`);
  });
};

startServer();
