
const Settings = require("../models/Settings");
const Organization = require("../models/Organization");

// GET: Load settings for the authenticated organization
const getSettings = async (req, res) => {
  try {
    const organizationId = req.organization.id;

    // Find the organization associated with the verified JWT.
    const organization = await Organization.findById(organizationId);

    if (!organization) {
      return res.status(404).json({
        success: false,
        message: "Organization not found. Please log in again."
      });
    }

    // Create a separate settings document for this organization
    // if one does not exist yet.
    const settings = await Settings.findOneAndUpdate(
      { userKey: organizationId },
      {
        $setOnInsert: {
          userKey: organizationId,
          profile: {
            name: organization.contact || organization.name,
            email: organization.email,
            org: organization.name
          }
        }
      },
      {
        upsert: true,
        returnDocument: "after",
        runValidators: true,
        setDefaultsOnInsert: true
      }
    );

    return res.status(200).json({
      success: true,
      data: settings
    });
  } catch (error) {
    console.error("Get organization settings error:", error);

    return res.status(500).json({
      success: false,
      message: "Could not load settings."
    });
  }
};

// PATCH: Update settings for the authenticated organization
const updateSettings = async (req, res) => {
  try {
    const organizationId = req.organization.id;

    const allowedSections = [
      "profile",
      "notifications",
      "appearance",
      "food"
    ];

    const updates = {};

    for (const section of allowedSections) {
      const values = req.body[section];

      if (
        values &&
        typeof values === "object" &&
        !Array.isArray(values)
      ) {
        for (const [field, value] of Object.entries(values)) {
          updates[`${section}.${field}`] = value;
        }
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: "Provide at least one valid settings field."
      });
    }

    // Never accept userKey from the request body.
    // The verified token determines which settings document is updated.
    const settings = await Settings.findOneAndUpdate(
      { userKey: organizationId },
      {
        $set: updates,
        $setOnInsert: { userKey: organizationId }
      },
      {
        upsert: true,
        returnDocument: "after",
        runValidators: true,
        setDefaultsOnInsert: true
      }
    );

    return res.status(200).json({
      success: true,
      message: "Settings saved successfully.",
      data: settings
    });
  } catch (error) {
    console.error("Update organization settings error:", error);

    return res.status(400).json({
      success: false,
      message: error.message || "Could not save settings."
    });
  }
};

module.exports = { getSettings, updateSettings };
