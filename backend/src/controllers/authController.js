
const Organization = require("../models/Organization");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// LOGIN: Verify organization email and password
const loginOrganization = async (req, res) => {
  try {
    const { email, password } = req.body;

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

    const normalizedEmail = email.trim().toLowerCase();

    const organization = await Organization.findOne({
      email: normalizedEmail
    }).select("+password");

    if (!organization || !organization.password) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password."
      });
    }

    const passwordMatches = await bcrypt.compare(
      password,
      organization.password
    );

    if (!passwordMatches) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password."
      });
    }

    const recipientTypes = ["ngo", "food_bank", "shelter"];

    const role = recipientTypes.includes(organization.type)
      ? "recipient"
      : "provider";

    // Require a secret from the backend environment.
    if (!process.env.JWT_SECRET) {
      console.error("JWT_SECRET is not configured.");

      return res.status(500).json({
        success: false,
        message: "Login service is not configured."
      });
    }

    // Create a signed token identifying the authenticated organization.
    const token = jwt.sign(
      {
        organizationId: organization._id.toString(),
        role
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "2h",
        issuer: "nourivya-api"
      }
    );

    // Never send the password hash to the frontend.
    const safeOrganization = organization.toObject();
    delete safeOrganization.password;

    return res.status(200).json({
      success: true,
      message: "Login successful.",
      data: {
        token,
        organization: safeOrganization,
        role
      }
    });
  } catch (error) {
    console.error("Organization login error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to log in right now."
    });
  }
};

module.exports = { loginOrganization };
