const {
  TrackingAuthenticationError,
  authenticateTrackingToken
} = require("../services/trackingAccess");

async function authenticateTrackingUser(req, res, next) {
  const authorization = req.headers.authorization;

  if (
    typeof authorization !== "string" ||
    !authorization.startsWith("Bearer ")
  ) {
    return res.status(401).json({
      success: false,
      code: "AUTHENTICATION_REQUIRED",
      message: "Authentication required."
    });
  }

  const token = authorization.slice("Bearer ".length).trim();

  try {
    req.trackingUser = await authenticateTrackingToken(token);
    return next();
  } catch (error) {
    if (error instanceof TrackingAuthenticationError) {
      return res.status(error.statusCode).json({
        success: false,
        code: error.code,
        message: error.message
      });
    }

    console.error("Tracking REST authentication failed:", error.message);
    return res.status(500).json({
      success: false,
      code: "AUTHENTICATION_UNAVAILABLE",
      message: "Authentication service is unavailable."
    });
  }
}

module.exports = { authenticateTrackingUser };
