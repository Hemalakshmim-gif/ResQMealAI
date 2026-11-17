
const jwt = require("jsonwebtoken");

// ORGANIZATION AUTHENTICATION
const authenticateOrganization = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Authentication required. Please log in."
      });
    }

    const token = authHeader.split(" ")[1];

    if (!process.env.JWT_SECRET) {
      return res.status(500).json({
        success: false,
        message: "Authentication service is not configured."
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET, {
      issuer: "nourivya-api"
    });

    if (!decoded.organizationId) {
      return res.status(403).json({
        success: false,
        message: "Organization access required."
      });
    }

    req.organization = {
      id: decoded.organizationId,
      role: decoded.role
    };

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token. Please log in again."
    });
  }
};

const authenticateOrganizationIfProvided = (req, res, next) => {
  if (!req.headers.authorization) {
    return next();
  }

  return authenticateOrganization(req, res, next);
};

// DRIVER AUTHENTICATION
const authenticateDriver = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Driver authentication required. Please log in."
      });
    }

    const token = authHeader.split(" ")[1];

    if (!process.env.JWT_SECRET) {
      return res.status(500).json({
        success: false,
        message: "Authentication service is not configured."
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET, {
      issuer: "nourivya-api"
    });

    if (decoded.role !== "driver" || !decoded.driverId) {
      return res.status(403).json({
        success: false,
        message: "Driver access only."
      });
    }

    req.driver = {
      id: decoded.driverId,
      role: decoded.role
    };

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired driver token. Please log in again."
    });
  }
};

module.exports = {
  authenticateOrganization,
  authenticateOrganizationIfProvided,
  authenticateDriver
};
