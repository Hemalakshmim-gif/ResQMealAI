const mongoose = require("mongoose");
const { Server } = require("socket.io");
const {
  TrackingError,
  startTracking,
  updateDriverLocation
} = require("./trackingService");
const {
  TrackingAuthenticationError,
  authenticateTrackingToken,
  canAccessDelivery,
  loadAuthorizedDelivery
} = require("./trackingAccess");
const { RoutingError } = require("./routingService");
const {
  getAuthorizedDeliveryRoute
} = require("./trackingRouteService");

async function authenticateSocket(socket, next) {
  const token = socket.handshake.auth?.token;

  try {
    socket.data.user = await authenticateTrackingToken(token);
    return next();
  } catch (error) {
    if (error instanceof TrackingAuthenticationError) {
      return next(new Error(error.message));
    }

    console.error("Tracking socket authentication failed:", error.message);
    return next(new Error("Authentication service is unavailable."));
  }
}

function acknowledge(socket, callback, response) {
  if (typeof callback === "function") {
    callback(response);
    return;
  }

  socket.emit("tracking:error", response);
}

function socketFailure(error) {
  if (error instanceof TrackingError || error instanceof RoutingError) {
    return {
      success: false,
      code: error.code,
      message: error.message
    };
  }

  console.error("Tracking socket operation failed:", error.message);
  return {
    success: false,
    code: "TRACKING_OPERATION_FAILED",
    message: "The tracking operation could not be completed."
  };
}

function deliveryRoom(deliveryId) {
  return `delivery:${deliveryId}`;
}

function initializeTrackingSocket(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin:
        process.env.SOCKET_CORS_ORIGIN || "http://localhost:5173",
      methods: ["GET", "POST"]
    }
  });

  io.use(authenticateSocket);

  io.on("connection", (socket) => {
    socket.on("delivery:join", async (payload, callback) => {
      try {
        const deliveryId =
          typeof payload === "string" ? payload : payload?.deliveryId;
        const snapshot = await loadAuthorizedDelivery(
          deliveryId,
          socket.data.user
        );

        await socket.join(deliveryRoom(snapshot.deliveryId));
        acknowledge(socket, callback, { success: true, data: snapshot });
      } catch (error) {
        acknowledge(socket, callback, socketFailure(error));
      }
    });

    socket.on("delivery:route", async (payload, callback) => {
      try {
        const deliveryId =
          typeof payload === "string" ? payload : payload?.deliveryId;
        const route = await getAuthorizedDeliveryRoute(
          deliveryId,
          socket.data.user
        );
        acknowledge(socket, callback, {
          success: true,
          data: route
        });
      } catch (error) {
        acknowledge(socket, callback, socketFailure(error));
      }
    });

    socket.on("delivery:leave", async (payload, callback) => {
      const deliveryId =
        typeof payload === "string" ? payload : payload?.deliveryId;

      if (!mongoose.isValidObjectId(deliveryId)) {
        acknowledge(socket, callback, {
          success: false,
          code: "INVALID_DELIVERY_ID",
          message: "A valid delivery ID is required."
        });
        return;
      }

      await socket.leave(deliveryRoom(String(deliveryId)));
      acknowledge(socket, callback, { success: true });
    });

    socket.on("tracking:start", async (payload, callback) => {
      try {
        if (socket.data.user.role !== "driver") {
          throw new TrackingError(
            "Only the assigned driver can start tracking.",
            403,
            "DRIVER_ACCESS_REQUIRED"
          );
        }

        const deliveryId =
          typeof payload === "string" ? payload : payload?.deliveryId;

        await startTracking({
          deliveryId,
          driverId: socket.data.user.id
        });

        const snapshot = await loadAuthorizedDelivery(
          deliveryId,
          socket.data.user
        );

        await socket.join(deliveryRoom(snapshot.deliveryId));
        acknowledge(socket, callback, { success: true, data: snapshot });
      } catch (error) {
        acknowledge(socket, callback, socketFailure(error));
      }
    });

    socket.on("tracking:location", async (payload, callback) => {
      try {
        if (socket.data.user.role !== "driver") {
          throw new TrackingError(
            "Only a driver can submit a GPS location.",
            403,
            "DRIVER_ACCESS_REQUIRED"
          );
        }

        if (!payload || typeof payload !== "object") {
          throw new TrackingError(
            "A delivery ID and GPS location are required.",
            400,
            "INVALID_LOCATION"
          );
        }

        const location = {
          latitude: payload.latitude,
          longitude: payload.longitude,
          accuracy: payload.accuracy,
          heading: payload.heading,
          speed: payload.speed
        };

        const delivery = await updateDriverLocation({
          deliveryId: payload.deliveryId,
          driverId: socket.data.user.id,
          location
        });

        const update = {
          deliveryId: String(delivery._id),
          location: delivery.latestLocation
        };

        io.to(deliveryRoom(update.deliveryId)).emit(
          "tracking:location",
          update
        );

        acknowledge(socket, callback, { success: true, data: update });
      } catch (error) {
        acknowledge(socket, callback, socketFailure(error));
      }
    });
  });

  return io;
}

module.exports = {
  canAccessDelivery,
  authenticateSocket,
  loadAuthorizedDelivery,
  initializeTrackingSocket
};
