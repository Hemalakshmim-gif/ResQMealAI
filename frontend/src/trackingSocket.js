import { io } from "socket.io-client";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

export function createTrackingSocket() {
  return io(API_BASE_URL, {
    autoConnect: false,
    auth: (callback) => {
      const token =
        localStorage.getItem("nourivya-driver-token") ||
        localStorage.getItem("nourivya-token");

      callback(token ? { token } : {});
    },
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 10000
  });
}
