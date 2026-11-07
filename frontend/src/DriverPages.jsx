
import { useEffect, useMemo, useState } from "react";
import {
  Truck, Package, CheckCircle2, Clock, MapPin,
  RefreshCw, AlertCircle, User, Bike, Car, Calendar,
  Navigation, ClipboardList
} from "lucide-react";

import {
  getMyDeliveries,
  updateMyDeliveryStatus,
  cancelMyDelivery,
  updateMyAvailability
} from "./api.js";

const cardStyle = {
  background: "var(--card-bg, #FFFFFF)",
  border: "1px solid var(--border-color)",
  borderRadius: "14px",
  padding: "20px",
  boxShadow: "var(--shadow-card, 0 2px 8px rgba(0,0,0,0.04))"
};

const buttonStyle = {
  border: "none",
  borderRadius: "8px",
  padding: "11px 16px",
  background: "var(--primary-green)",
  color: "#FFFFFF",
  fontWeight: "700",
  cursor: "pointer"
};

const formatDate = (value) => {
  if (!value) return "Not recorded";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Not recorded"
    : date.toLocaleString();
};

const getId = (value) => {
  if (!value) return "";
  return typeof value === "object"
    ? value._id || value.id || ""
    : value;
};

const getName = (value) => {
  if (!value) return "Not provided";
  return typeof value === "object"
    ? value.name || "Not provided"
    : value;
};

const getDonation = (delivery) => {
  return delivery.donation && typeof delivery.donation === "object"
    ? delivery.donation
    : {};
};

const fetchDriverDeliveries = async () => {
  const response = await getMyDeliveries();

  if (!response.success) {
    throw new Error(response.message || "Could not load deliveries.");
  }

  return response.data || [];
};

function StatusBadge({ status }) {
  const colors = {
    pending: ["#F1F5F9", "#475569"],
    assigned: ["#EFF6FF", "#1D4ED8"],
    picked_up: ["#FFF7ED", "#C2410C"],
    in_transit: ["#F5F3FF", "#6D28D9"],
    delivered: ["#ECFDF5", "#047857"],
    failed: ["#FEF2F2", "#B91C1C"],
    cancelled: ["#FEF2F2", "#B91C1C"]
  };

  const [background, color] =
    colors[status] || ["#F1F5F9", "#475569"];

  return (
    <span style={{
      background,
      color,
      padding: "5px 10px",
      borderRadius: "20px",
      fontSize: "11px",
      fontWeight: "800",
      textTransform: "capitalize"
    }}>
      {(status || "unknown").replaceAll("_", " ")}
    </span>
  );
}

function PageHeading({ title, subtitle, action }) {
  return (
    <div style={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      flexWrap: "wrap",
      gap: "12px",
      marginBottom: "24px"
    }}>
      <div>
        <h2 style={{
          fontSize: "24px",
          fontWeight: "800",
          color: "var(--text-primary)",
          marginBottom: "6px"
        }}>
          {title}
        </h2>
        <p style={{
          color: "var(--text-secondary)",
          fontSize: "13px"
        }}>
          {subtitle}
        </p>
      </div>
      {action}
    </div>
  );
}

function useDriverDeliveries() {
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadDeliveries = async () => {
    try {
      const data = await fetchDriverDeliveries();
      setError("");
      setDeliveries(data);
    } catch (err) {
      setError(err.message || "Could not load your deliveries.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;

    const fetchInitialDeliveries = async () => {
      try {
        const data = await fetchDriverDeliveries();

        if (active) {
          setError("");
          setDeliveries(data);
        }
      } catch (err) {
        if (active) {
          setError(err.message || "Could not load your deliveries.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    fetchInitialDeliveries();

    return () => {
      active = false;
    };
  }, []);

  return {
    deliveries,
    loading,
    error,
    refresh: loadDeliveries
  };
}

function MetricCard({ title, value, icon: Icon, color }) {
  return (
    <div style={cardStyle}>
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "18px"
      }}>
        <span style={{
          fontSize: "13px",
          color: "var(--text-secondary)",
          fontWeight: "600"
        }}>
          {title}
        </span>
        <Icon size={22} color={color} />
      </div>
      <h2 style={{
        fontSize: "29px",
        fontWeight: "800",
        color: "var(--text-primary)"
      }}>
        {value}
      </h2>
    </div>
  );
}

function DeliveryCard({ delivery, onUpdate, onCancel, busyId }) {
  const donation = getDonation(delivery);
  const food = donation.food || donation;
  const recipient = donation.recipient || delivery.recipient;

  const status = delivery.status;
  const busy = busyId === getId(delivery);

  const nextStatus = {
    assigned: "picked_up",
    picked_up: "in_transit",
    in_transit: "delivered"
  }[status];

  const nextLabel = {
    assigned: "Confirm Pickup",
    picked_up: "Start Delivery",
    in_transit: "Mark as Delivered"
  }[status];

  const foodName =
    food?.name ||
    food?.foodName ||
    donation.foodName ||
    "Food donation";

  const quantity =
    donation.quantity ??
    food?.quantity ??
    "Not provided";

  const unit =
    food?.unit ||
    donation.unit ||
    "";

  const recipientName =
    getName(recipient);

  const recipientPhone =
    recipient && typeof recipient === "object"
      ? recipient.phone
      : "";
  const pickupOrganization =
    food?.providerName ||
    donation.providerName ||
    (donation.provider && typeof donation.provider === "object"
      ? donation.provider.name
      : "") ||
    "Not provided";
  const trackingSteps = ["assigned", "picked_up", "in_transit", "delivered"];
  const currentStep = trackingSteps.indexOf(status);
  const directionsUrl =
    delivery.pickupAddress && delivery.deliveryAddress
      ? `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(delivery.pickupAddress)}&destination=${encodeURIComponent(delivery.deliveryAddress)}`
      : "";

  return (
    <div style={{ ...cardStyle, marginBottom: "18px" }}>
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: "10px",
        marginBottom: "18px"
      }}>
        <div>
          <p style={{
            fontSize: "12px",
            color: "var(--text-secondary)",
            marginBottom: "5px"
          }}>
            Delivery ID
          </p>
          <strong style={{
            fontSize: "13px",
            overflowWrap: "anywhere"
          }}>
            {getId(delivery)}
          </strong>
        </div>
        <StatusBadge status={status} />
      </div>

      <div style={{
        background: "var(--page-bg)",
        borderRadius: "10px",
        padding: "15px",
        marginBottom: "16px"
      }}>
        <h3 style={{
          fontSize: "16px",
          fontWeight: "800",
          marginBottom: "12px"
        }}>
          <Package size={17} style={{
            display: "inline",
            marginRight: "7px"
          }} />
          {foodName}
        </h3>

        <p style={{ fontSize: "13px", marginBottom: "7px" }}>
          <strong>Quantity:</strong> {quantity} {unit}
        </p>
        <p style={{ fontSize: "13px", marginBottom: "7px" }}>
          <strong>Meals:</strong>{" "}
          {["meal", "meals"].includes(unit.toLowerCase())
            ? quantity
            : "Not specified by the donation"}
        </p>
        <p style={{ fontSize: "13px", marginBottom: "7px" }}>
          <strong>Pickup organization:</strong> {pickupOrganization}
        </p>
        <p style={{ fontSize: "13px", marginBottom: "7px" }}>
          <strong>Recipient:</strong> {recipientName}
        </p>

        {recipientPhone && (
          <p style={{ fontSize: "13px" }}>
            <strong>Recipient phone:</strong> {recipientPhone}
          </p>
        )}
      </div>

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
        gap: "14px",
        marginBottom: "18px"
      }}>
        <div>
          <p style={{
            color: "var(--text-secondary)",
            fontSize: "12px",
            marginBottom: "6px"
          }}>
            <MapPin size={14} style={{ display: "inline" }} /> Pickup Address
          </p>
          <p style={{ fontSize: "13px", fontWeight: "600" }}>
            {delivery.pickupAddress || "Address not available"}
          </p>
        </div>

        <div>
          <p style={{
            color: "var(--text-secondary)",
            fontSize: "12px",
            marginBottom: "6px"
          }}>
            <Navigation size={14} style={{ display: "inline" }} /> Drop-off Address
          </p>
          <p style={{ fontSize: "13px", fontWeight: "600" }}>
            {delivery.deliveryAddress || "Address not available"}
          </p>
        </div>
      </div>

      <p style={{
        fontSize: "12px",
        color: "var(--text-secondary)",
        marginBottom: "16px"
      }}>
        <Calendar size={13} style={{ display: "inline" }} /> Planned pickup:{" "}
        {formatDate(delivery.plannedPickupAt)}
      </p>

      {delivery.failureReason && (
        <p style={{
          color: "#B91C1C",
          fontSize: "13px",
          marginBottom: "16px"
        }}>
          <strong>Failure reason:</strong> {delivery.failureReason}
        </p>
      )}

      <div style={{
        padding: "14px",
        borderRadius: "10px",
        background: "var(--page-bg)",
        marginBottom: "16px"
      }}>
        <p style={{ fontSize: "13px", fontWeight: "800", marginBottom: "10px" }}>
          Delivery progress
        </p>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
          gap: "6px",
          marginBottom: "12px"
        }}>
          {trackingSteps.map((step, index) => (
            <div key={step} style={{
              height: "5px",
              borderRadius: "5px",
              background: currentStep >= index ? "var(--primary-green)" : "var(--border-color)"
            }} />
          ))}
        </div>
        <p style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
          Picked up: {formatDate(delivery.pickedUpAt)} · Delivered: {formatDate(delivery.deliveredAt)}
        </p>
        {directionsUrl && (
          <a
            href={directionsUrl}
            target="_blank"
            rel="noreferrer"
            style={{
              display: "inline-block",
              marginTop: "10px",
              color: "var(--primary-green)",
              fontSize: "12px",
              fontWeight: "700"
            }}
          >
            Open directions
          </a>
        )}
      </div>

      <div style={{
        display: "flex",
        gap: "10px",
        flexWrap: "wrap"
      }}>
        {nextStatus && (
          <button
            disabled={busy}
            onClick={() => onUpdate(getId(delivery), nextStatus)}
            style={{
              ...buttonStyle,
              opacity: busy ? 0.6 : 1
            }}
          >
            {busy ? "Updating..." : nextLabel}
          </button>
        )}

        {status === "assigned" && (
          <button
            disabled={busy}
            onClick={() => onCancel(getId(delivery))}
            style={{
              ...buttonStyle,
              background: "#DC2626",
              opacity: busy ? 0.6 : 1
            }}
          >
            Cancel Delivery
          </button>
        )}
      </div>
    </div>
  );
}

export function DriverDashboard({ user, navigate }) {
  const {
    deliveries,
    loading,
    error,
    refresh
  } = useDriverDeliveries();

  const stats = useMemo(() => ({
    total: deliveries.length,
    pending: deliveries.filter(d => ["pending", "assigned"].includes(d.status)).length,
    completed: deliveries.filter(d => d.status === "delivered").length,
    failed: deliveries.filter(d => ["failed", "cancelled"].includes(d.status)).length
  }), [deliveries]);

  const driver = user ||
    JSON.parse(localStorage.getItem("nourivya-driver-user") || "{}");

  return (
    <div>
      <PageHeading
        title={`Welcome, ${driver.name || "Driver"}!`}
        subtitle={`Your profile is ${driver.status || "unavailable"}. Here is your delivery activity.`}
        action={
          <button style={buttonStyle} onClick={refresh}>
            <RefreshCw size={15} style={{ display: "inline", marginRight: "7px" }} />
            Refresh
          </button>
        }
      />

      {error && (
        <p style={{
          color: "#B91C1C",
          marginBottom: "18px",
          fontSize: "13px"
        }}>
          <AlertCircle size={15} style={{ display: "inline" }} /> {error}
        </p>
      )}

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
        gap: "16px",
        marginBottom: "26px"
      }}>
        <MetricCard title="Total Assigned" value={loading ? "..." : stats.total} icon={ClipboardList} color="#2563EB" />
        <MetricCard title="Pending" value={loading ? "..." : stats.pending} icon={Clock} color="#D97706" />
        <MetricCard title="Completed" value={loading ? "..." : stats.completed} icon={CheckCircle2} color="#059669" />
        <MetricCard title="Failed / Cancelled" value={loading ? "..." : stats.failed} icon={AlertCircle} color="#DC2626" />
      </div>

      <div style={cardStyle}>
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "18px"
        }}>
          <h3 style={{ fontSize: "17px", fontWeight: "800" }}>
            Recent Deliveries
          </h3>
          <button
            onClick={() => navigate("/driver/deliveries")}
            style={{
              background: "none",
              border: "none",
              color: "var(--primary-green)",
              fontWeight: "700",
              cursor: "pointer"
            }}
          >
            View All →
          </button>
        </div>

        {loading ? (
          <p>Loading your deliveries...</p>
        ) : deliveries.length === 0 ? (
          <p style={{
            color: "var(--text-secondary)",
            padding: "20px 0"
          }}>
            No deliveries have been assigned to you yet.
          </p>
        ) : (
          deliveries.slice(0, 3).map(delivery => (
            <div key={getId(delivery)} style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "12px",
              padding: "13px 0",
              borderBottom: "1px solid var(--border-color)"
            }}>
              <div>
                <p style={{ fontSize: "13px", fontWeight: "700" }}>
                  {(getDonation(delivery).food || getDonation(delivery)).name ||
                    (getDonation(delivery).food || getDonation(delivery)).foodName ||
                    "Food Delivery"}
                </p>
                <p style={{
                  fontSize: "11px",
                  color: "var(--text-secondary)",
                  marginTop: "5px"
                }}>
                  {getId(delivery)}
                </p>
              </div>
              <StatusBadge status={delivery.status} />
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export function DriverDeliveriesPage({ user, setUser }) {
  const {
    deliveries,
    loading,
    error,
    refresh
  } = useDriverDeliveries();

  const [busyId, setBusyId] = useState("");
  const [message, setMessage] = useState("");
  const [cancelTarget, setCancelTarget] = useState("");
  const [cancelReason, setCancelReason] = useState("");

  const handleUpdate = async (id, status) => {
    try {
      setBusyId(id);
      setMessage("");

      const response = await updateMyDeliveryStatus(id, status);

      if (!response.success) {
        throw new Error(response.message || "Could not update delivery.");
      }

      if (status === "delivered") {
        const updatedUser = { ...user, status: "available" };
        localStorage.setItem("nourivya-driver-user", JSON.stringify(updatedUser));
        setUser(updatedUser);
      }

      setMessage("Delivery status updated successfully.");
      await refresh();
    } catch (err) {
      setMessage(err.message || "Could not update delivery.");
    } finally {
      setBusyId("");
    }
  };

  const handleCancel = async () => {
    if (!cancelReason.trim()) {
      setMessage("Please enter a reason before cancelling.");
      return;
    }

    try {
      setBusyId(cancelTarget);
      setMessage("");

      const response = await cancelMyDelivery(
        cancelTarget,
        cancelReason.trim()
      );

      if (!response.success) {
        throw new Error(response.message || "Could not cancel delivery.");
      }

      setMessage("Delivery cancelled and released for reassignment.");
      const updatedUser = { ...user, status: "available" };
      localStorage.setItem("nourivya-driver-user", JSON.stringify(updatedUser));
      setUser(updatedUser);
      setCancelTarget("");
      setCancelReason("");
      await refresh();
    } catch (err) {
      setMessage(err.message || "Could not cancel delivery.");
    } finally {
      setBusyId("");
    }
  };

  const activeDeliveries = deliveries.filter(
    d => ["pending", "assigned", "picked_up", "in_transit"].includes(d.status)
  );

  const pastDeliveries = deliveries.filter(
    d => ["delivered", "failed", "cancelled"].includes(d.status)
  );

  return (
    <div>
      <PageHeading
        title="My Deliveries"
        subtitle="View and manage the deliveries assigned to your account."
        action={
          <button style={buttonStyle} onClick={refresh}>
            <RefreshCw size={15} style={{ display: "inline", marginRight: "7px" }} />
            Refresh
          </button>
        }
      />

      {(error || message) && (
        <div style={{
          padding: "12px",
          borderRadius: "8px",
          background: error ? "#FEF2F2" : "#ECFDF5",
          color: error ? "#B91C1C" : "#047857",
          marginBottom: "18px",
          fontSize: "13px"
        }}>
          {error || message}
        </div>
      )}

      {loading ? (
        <p>Loading your deliveries...</p>
      ) : (
        <>
          <h3 style={{
            fontSize: "17px",
            fontWeight: "800",
            marginBottom: "15px"
          }}>
            Active Deliveries ({activeDeliveries.length})
          </h3>

          {activeDeliveries.length === 0 ? (
            <div style={{ ...cardStyle, marginBottom: "25px" }}>
              <Package size={30} color="var(--text-secondary)" />
              <p style={{
                marginTop: "10px",
                color: "var(--text-secondary)"
              }}>
                You currently have no active deliveries.
              </p>
            </div>
          ) : (
            activeDeliveries.map(delivery => (
              <DeliveryCard
                key={getId(delivery)}
                delivery={delivery}
                onUpdate={handleUpdate}
                onCancel={(id) => {
                  setCancelTarget(id);
                  setCancelReason("");
                  setMessage("");
                }}
                busyId={busyId}
              />
            ))
          )}

          <h3 style={{
            fontSize: "17px",
            fontWeight: "800",
            margin: "28px 0 15px"
          }}>
            Delivery History ({pastDeliveries.length})
          </h3>

          {pastDeliveries.length === 0 ? (
            <p style={{
              color: "var(--text-secondary)",
              fontSize: "13px"
            }}>
              No completed or failed deliveries yet.
            </p>
          ) : (
            pastDeliveries.map(delivery => (
              <DeliveryCard
                key={getId(delivery)}
                delivery={delivery}
                onUpdate={handleUpdate}
                onCancel={() => {}}
                busyId={busyId}
              />
            ))
          )}
        </>
      )}

      {cancelTarget && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.45)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "20px",
          zIndex: 1000
        }}>
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="driver-cancel-title"
            style={{
            ...cardStyle,
            width: "100%",
            maxWidth: "440px"
          }}>
            <h3 style={{
              fontSize: "19px",
              fontWeight: "800",
              marginBottom: "10px"
            }} id="driver-cancel-title">
              Cancel Delivery
            </h3>

            <p style={{
              color: "var(--text-secondary)",
              fontSize: "13px",
              marginBottom: "15px"
            }}>
              Please provide a reason. This delivery will be marked as failed
              so it can be considered for reassignment.
            </p>

            <textarea
              aria-label="Cancellation reason"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Enter the reason for cancellation..."
              rows={4}
              style={{
                width: "100%",
                padding: "12px",
                border: "1px solid var(--border-color)",
                borderRadius: "8px",
                resize: "vertical",
                marginBottom: "16px",
                fontFamily: "inherit"
              }}
            />

            <div style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: "10px"
            }}>
              <button
                disabled={Boolean(busyId)}
                onClick={() => setCancelTarget("")}
                style={{
                  ...buttonStyle,
                  background: "#64748B"
                }}
              >
                Go Back
              </button>

              <button
                disabled={!cancelReason.trim() || Boolean(busyId)}
                onClick={handleCancel}
                style={{
                  ...buttonStyle,
                  background: "#DC2626",
                  opacity: !cancelReason.trim() || busyId ? 0.6 : 1
                }}
              >
                {busyId ? "Cancelling..." : "Confirm Cancellation"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function DriverProfilePage({ user, setUser, addToast }) {
  const driver = user ||
    JSON.parse(localStorage.getItem("nourivya-driver-user") || "{}");
  const [availabilityBusy, setAvailabilityBusy] = useState(false);
  const [availabilityError, setAvailabilityError] = useState("");

  const handleAvailabilityChange = async (status) => {
    try {
      setAvailabilityBusy(true);
      setAvailabilityError("");
      const response = await updateMyAvailability(status);

      if (!response.success || !response.data) {
        throw new Error(response.message || "Could not update availability.");
      }

      const updatedUser = { ...driver, ...response.data, role: "driver" };
      localStorage.setItem("nourivya-driver-user", JSON.stringify(updatedUser));
      setUser(updatedUser);
      addToast(response.message || "Availability updated.", "success");
    } catch (error) {
      setAvailabilityError(error.message || "Could not update availability.");
    } finally {
      setAvailabilityBusy(false);
    }
  };

  const vehicleIcons = {
    bicycle: Bike,
    motorcycle: Bike,
    car: Car,
    van: Truck,
    truck: Truck,
    other: Truck
  };

  const VehicleIcon = vehicleIcons[driver.vehicleType] || Truck;

  const details = [
    ["Full Name", driver.name],
    ["Email Address", driver.email],
    ["Phone Number", driver.phone],
    ["Vehicle Type", driver.vehicleType],
    ["Meal Capacity", driver.capacityMeals ? `${driver.capacityMeals} meals` : ""],
    ["Current Location", driver.currentLocation],
    ["Availability", driver.status]
  ];

  return (
    <div>
      <PageHeading
        title="Driver Profile"
        subtitle="Your registered driver account information."
      />

      <div style={{
        ...cardStyle,
        maxWidth: "720px"
      }}>
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: "16px",
          marginBottom: "25px",
          paddingBottom: "20px",
          borderBottom: "1px solid var(--border-color)"
        }}>
          <div style={{
            width: "64px",
            height: "64px",
            borderRadius: "50%",
            background: "var(--light-green)",
            color: "var(--primary-green)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}>
            <User size={30} />
          </div>

          <div>
            <h3 style={{
              fontSize: "20px",
              fontWeight: "800"
            }}>
              {driver.name || "Driver"}
            </h3>
            <p style={{
              fontSize: "12px",
              color: "var(--text-secondary)",
              textTransform: "capitalize",
              marginTop: "5px"
            }}>
              {driver.vehicleType || "Driver"} Account
            </p>
          </div>

          <VehicleIcon
            size={27}
            color="var(--primary-green)"
            style={{ marginLeft: "auto" }}
          />
        </div>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "22px"
        }}>
          {details.map(([label, value]) => (
            <div key={label}>
              <p style={{
                fontSize: "11px",
                color: "var(--text-secondary)",
                fontWeight: "700",
                marginBottom: "7px",
                textTransform: "uppercase"
              }}>
                {label}
              </p>
              <p style={{
                fontSize: "14px",
                fontWeight: "700",
                color: "var(--text-primary)",
                textTransform: "capitalize",
                overflowWrap: "anywhere"
              }}>
                {value || "Not provided"}
              </p>
            </div>
          ))}
        </div>

        {availabilityError && (
          <p role="alert" style={{
            color: "#B91C1C",
            fontSize: "13px",
            marginTop: "18px"
          }}>
            {availabilityError}
          </p>
        )}

        <div style={{
          display: "flex",
          gap: "10px",
          flexWrap: "wrap",
          marginTop: "22px"
        }}>
          {["available", "unavailable"].map(status => (
            <button
              key={status}
              type="button"
              disabled={availabilityBusy || driver.status === "assigned" || driver.status === status}
              onClick={() => handleAvailabilityChange(status)}
              style={{
                ...buttonStyle,
                background: status === "available" ? "var(--primary-green)" : "#64748B",
                opacity: availabilityBusy || driver.status === "assigned" || driver.status === status ? 0.6 : 1,
                textTransform: "capitalize"
              }}
            >
              {availabilityBusy ? "Updating..." : `Set ${status}`}
            </button>
          ))}
        </div>

        {driver.status === "assigned" && (
          <p style={{
            color: "var(--text-secondary)",
            fontSize: "12px",
            marginTop: "10px"
          }}>
            Availability cannot be changed while a delivery is assigned.
          </p>
        )}

        <div style={{
          marginTop: "25px",
          padding: "14px",
          background: "var(--page-bg)",
          borderRadius: "9px",
          fontSize: "12px",
          color: "var(--text-secondary)"
        }}>
          Profile information is read-only because the backend does not provide
          an authenticated driver profile-update endpoint. Availability changes
          are saved through the driver API.
        </div>
      </div>
    </div>
  );
}
