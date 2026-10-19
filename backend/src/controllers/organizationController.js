
const mongoose = require("mongoose");
const Organization = require("../models/Organization");
const bcrypt = require("bcryptjs");
// CREATE: Register an organization
// CREATE: Register an organization securely
const createOrganization = async (req, res) => {
  try {
    const {
      name,
      contact,
      type,
      email,
      password,
      phone,
      address,
      city,
      ...otherFields
    } = req.body;

    // Validate required registration fields
    if (
      !name ||
      !contact ||
      !type ||
      !email ||
      !password ||
      !phone ||
      !address ||
      !city
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Name, contact person, organization type, email, password, phone, address, and city are required."
      });
    }

    if (typeof password !== "string" || password.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters long."
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Prevent duplicate organization accounts
    const existingOrganization = await Organization.findOne({
      email: normalizedEmail
    });

    if (existingOrganization) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists."
      });
    }

    // Hash the password before saving it
    const hashedPassword = await bcrypt.hash(password, 12);

    const organization = await Organization.create({
      name,
      contact,
      type,
      email: normalizedEmail,
      password: hashedPassword,
      phone,
      address,
      city,
      ...otherFields
    });

    // Never return the password hash
    const safeOrganization = organization.toObject();
    delete safeOrganization.password;

    return res.status(201).json({
      success: true,
      message: "Organization registered successfully",
      data: safeOrganization
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists."
      });
    }

    return res.status(400).json({
      success: false,
      message: "Could not register organization",
      error: error.message
    });
  }
};

// READ ALL: Get all organizations
const getAllOrganizations = async (req, res) => {
  try {
    const organizations = await Organization.find().sort({
      createdAt: -1
    });

    return res.status(200).json({
      success: true,
      count: organizations.length,
      data: organizations
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Could not retrieve organizations",
      error: error.message
    });
  }
};

// READ ONE: Get an organization by ID
const getOrganizationById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid organization ID"
      });
    }

    const organization = await Organization.findById(id);

    if (!organization) {
      return res.status(404).json({
        success: false,
        message: "Organization not found"
      });
    }

    return res.status(200).json({
      success: true,
      data: organization
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Could not retrieve organization",
      error: error.message
    });
  }
};

// UPDATE: Update selected organization fields
const updateOrganization = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid organization ID"
      });
    }

    
const allowedFields = [
  "name",
  "type",
  "email",
  "phone",
  "address",
  "city",
  "acceptedFoodTypes",
  "requestedFoodTypes",
  "requestedMeals",
  "capacityMeals",
  "isActive"
];


    const updates = {};

    for (const field of allowedFields) {
      if (Object.prototype.hasOwnProperty.call(req.body, field)) {
        updates[field] = req.body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: "Provide at least one valid field to update"
      });
    }

    const organization = await Organization.findByIdAndUpdate(
      id,
      { $set: updates },
      {
        returnDocument: "after",
        runValidators: true
      }
    );

    if (!organization) {
      return res.status(404).json({
        success: false,
        message: "Organization not found"
      });
    }

    return res.status(200).json({
      success: true,
      message: "Organization updated successfully",
      data: organization
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: "Could not update organization",
      error: error.message
    });
  }
};

// DELETE: Delete an organization
const deleteOrganization = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid organization ID"
      });
    }

    const organization = await Organization.findByIdAndDelete(id);

    if (!organization) {
      return res.status(404).json({
        success: false,
        message: "Organization not found"
      });
    }

    return res.status(200).json({
      success: true,
      message: "Organization deleted successfully",
      data: organization
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Could not delete organization",
      error: error.message
    });
  }
};

module.exports = {
  createOrganization,
  getAllOrganizations,
  getOrganizationById,
  updateOrganization,
  deleteOrganization
};
