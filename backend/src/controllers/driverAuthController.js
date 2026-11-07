
const Driver = require("../models/Driver");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// DRIVER REGISTRATION
const registerDriver = async (req, res) => {
  try {
    const {
      name,
      phone,
      email,
      password,
      vehicleType,
      capacityMeals,
      currentLocation
    } = req.body;

    if (
      typeof name !== "string" ||
      !name.trim() ||
      typeof phone !== "string" ||
      !phone.trim() ||
      typeof email !== "string" ||
      !email.trim() ||
      typeof password !== "string" ||
      !vehicleType ||
      capacityMeals === undefined ||
      typeof currentLocation !== "string" ||
      !currentLocation.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide all required driver details."
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedPhone = phone.trim();
    const mealCapacity = Number(capacityMeals);
    const phoneDigits = normalizedPhone.replace(/\D/g, "");

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid email address."
      });
    }

    if (
      !/^\+?[0-9\s()-]{7,20}$/.test(normalizedPhone) ||
      phoneDigits.length < 7 ||
      phoneDigits.length > 15
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid phone number."
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must contain at least 8 characters."
      });
    }

    if (!Number.isInteger(mealCapacity) || mealCapacity < 1) {
      return res.status(400).json({
        success: false,
        message: "Meal capacity must be a whole number of at least one."
      });
    }

    if (!["bicycle", "motorcycle", "car", "van", "truck", "other"].includes(vehicleType)) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid vehicle type."
      });
    }

    const existingDriver = await Driver.findOne({
      email: normalizedEmail
    });

    if (existingDriver) {
      return res.status(409).json({
        success: false,
        message: "A driver account with this email already exists."
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const driver = await Driver.create({
      name,
      phone: normalizedPhone,
      email: normalizedEmail,
      password: hashedPassword,
      vehicleType,
      capacityMeals: mealCapacity,
      currentLocation: currentLocation.trim(),
      status: "available"
    });

    return res.status(201).json({
      success: true,
      message: "Driver account created successfully.",
      driver: {
        id: driver._id,
        name: driver.name,
        email: driver.email,
        phone: driver.phone,
        vehicleType: driver.vehicleType,
        capacityMeals: driver.capacityMeals,
        status: driver.status,
        currentLocation: driver.currentLocation
      }
    });
  } catch (error) {
    console.error("Driver registration error:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "This email is already registered."
      });
    }

    return res.status(500).json({
      success: false,
      message: "Unable to register driver."
    });
  }
};

// DRIVER LOGIN
const loginDriver = async (req, res) => {
  try {
    const { email, password } = req.body || {};

    if (
      typeof email !== "string" ||
      !email.trim() ||
      typeof password !== "string" ||
      !password
    ) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required."
      });
    }

    const driver = await Driver.findOne({
      email: email.trim().toLowerCase()
    }).select("+password");

    if (!driver || !driver.password) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password."
      });
    }

    const isPasswordValid = await bcrypt.compare(
      password,
      driver.password
    );

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password."
      });
    }

    if (!process.env.JWT_SECRET) {
      return res.status(500).json({
        success: false,
        message: "Authentication service is not configured."
      });
    }

    const token = jwt.sign(
      {
        driverId: driver._id.toString(),
        role: "driver"
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "2h",
        issuer: "nourivya-api"
      }
    );

    return res.status(200).json({
      success: true,
      message: "Driver login successful.",
      token,
      driver: {
        id: driver._id,
        name: driver.name,
        email: driver.email,
        phone: driver.phone,
        vehicleType: driver.vehicleType,
        capacityMeals: driver.capacityMeals,
        status: driver.status,
        currentLocation: driver.currentLocation
      }
    });
  } catch (error) {
    console.error("Driver login error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to log in driver."
    });
  }
};

const updateDriverAvailability = async (req, res) => {
  try {
    const { status } = req.body || {};

    if (!["available", "unavailable"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Availability must be available or unavailable."
      });
    }

    const driver = await Driver.findOneAndUpdate(
      {
        _id: req.driver.id,
        status: { $in: ["available", "unavailable"] }
      },
      { $set: { status } },
      {
        returnDocument: "after",
        runValidators: true
      }
    ).select("name email phone vehicleType capacityMeals status currentLocation");

    if (!driver) {
      return res.status(409).json({
        success: false,
        message: "Availability cannot be changed while you have an assigned delivery."
      });
    }

    return res.status(200).json({
      success: true,
      message: `Availability updated to ${status}.`,
      data: driver
    });
  } catch (error) {
    console.error("Driver availability update error:", error);

    return res.status(500).json({
      success: false,
      message: "Could not update driver availability."
    });
  }
};

module.exports = {
  registerDriver,
  loginDriver,
  updateDriverAvailability
};
