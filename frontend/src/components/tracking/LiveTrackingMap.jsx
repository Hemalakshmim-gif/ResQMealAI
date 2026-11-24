import { useEffect, useMemo, useRef } from "react";
import L from "leaflet";
import {
  MapContainer,
  Marker,
  Polyline,
  Popup,
  TileLayer,
  useMap
} from "react-leaflet";
import "leaflet/dist/leaflet.css";

const isValidCoordinates = (coordinates) =>
  Number.isFinite(coordinates?.latitude) &&
  coordinates.latitude >= -90 &&
  coordinates.latitude <= 90 &&
  Number.isFinite(coordinates?.longitude) &&
  coordinates.longitude >= -180 &&
  coordinates.longitude <= 180;

const markerIcons = {
  driver: L.divIcon({
    className: "tracking-map-marker",
    html: '<span style="display:block;width:18px;height:18px;border:3px solid white;border-radius:50%;background:#2563EB;box-shadow:0 1px 5px #475569"></span>',
    iconSize: [24, 24],
    iconAnchor: [12, 12]
  }),
  pickup: L.divIcon({
    className: "tracking-map-marker",
    html: '<span style="display:block;width:18px;height:18px;border:3px solid white;border-radius:50%;background:#D97706;box-shadow:0 1px 5px #475569"></span>',
    iconSize: [24, 24],
    iconAnchor: [12, 12]
  }),
  destination: L.divIcon({
    className: "tracking-map-marker",
    html: '<span style="display:block;width:18px;height:18px;border:3px solid white;border-radius:50%;background:#059669;box-shadow:0 1px 5px #475569"></span>',
    iconSize: [24, 24],
    iconAnchor: [12, 12]
  })
};

function FitMapToLocations({
  points,
  routeKey,
  driverAvailable
}) {
  const map = useMap();
  const hasInitialFit = useRef(false);
  const hasFittedDriver = useRef(false);
  const previousRouteKey = useRef(routeKey);

  useEffect(() => {
    if (!points.length) {
      return;
    }

    const routeChanged = previousRouteKey.current !== routeKey;

    if (
      !hasInitialFit.current ||
      routeChanged ||
      (driverAvailable && !hasFittedDriver.current)
    ) {
      if (points.length === 1) {
        map.setView(points[0].position, 13);
      } else {
        map.fitBounds(
          L.latLngBounds(points.map((point) => point.position)),
          { padding: [36, 36], maxZoom: 14 }
        );
      }

      hasInitialFit.current = true;
      if (driverAvailable) {
        hasFittedDriver.current = true;
      }
    }

    previousRouteKey.current = routeKey;
  }, [map, points, routeKey, driverAvailable]);

  return null;
}

export default function LiveTrackingMap({ tracking, route, routePlan }) {
  const points = useMemo(() => {
    if (routePlan) {
      const routeStops = [
        {
          key: "route-start",
          type: "driver",
          label: "Route start",
          detail: "Driver's latest GPS position",
          coordinates: routePlan.startLocation
        },
        ...(routePlan.stops || []).map((stop, index) => ({
          key: `${stop.deliveryId}:${stop.kind}:${index}`,
          type: stop.kind === "pickup" ? "pickup" : "destination",
          label: stop.kind === "pickup" ? "Pickup stop" : "Delivery stop",
          detail: `${stop.foodName || "Food"} · ${stop.kind}`,
          coordinates: stop.coordinates
        }))
      ];
      return routeStops
        .filter((point) => isValidCoordinates(point.coordinates))
        .map((point) => ({
          ...point,
          position: [point.coordinates.latitude, point.coordinates.longitude]
        }));
    }

    const candidates = [
      {
        key: "driver",
        type: "driver",
        label: "Driver location",
        detail: tracking?.driver?.name || "Assigned driver",
        coordinates: tracking?.latestLocation
      },
      {
        key: "pickup",
        type: "pickup",
        label: "Food pickup",
        detail:
          tracking?.pickup?.providerName ||
          tracking?.pickup?.address ||
          "Pickup location",
        coordinates: tracking?.pickup?.coordinates
      },
      {
        key: "destination",
        type: "destination",
        label: "Recipient destination",
        detail:
          tracking?.destination?.organizationName ||
          tracking?.destination?.address ||
          "Delivery location",
        coordinates: tracking?.destination?.coordinates
      }
    ];

    return candidates
      .filter((point) => isValidCoordinates(point.coordinates))
      .map((point) => ({
        ...point,
        position: [
          point.coordinates.latitude,
          point.coordinates.longitude
        ]
      }));
  }, [tracking, routePlan]);

  const routeKey = routePlan
    ? [
        routePlan.startLocation?.latitude,
        routePlan.startLocation?.longitude,
        ...(routePlan.stops || []).flatMap((stop) => [
          stop.coordinates?.latitude,
          stop.coordinates?.longitude,
          stop.kind
        ])
      ].join(":")
    : [
    tracking?.pickup?.coordinates?.latitude,
    tracking?.pickup?.coordinates?.longitude,
    tracking?.destination?.coordinates?.latitude,
    tracking?.destination?.coordinates?.longitude
    ].join(":");
  const driverAvailable = routePlan
    ? isValidCoordinates(routePlan.startLocation)
    : isValidCoordinates(tracking?.latestLocation);

  if (!points.length) {
    return (
      <div
        role="status"
        style={{
          minHeight: "280px",
          display: "grid",
          placeItems: "center",
          padding: "24px",
          border: "1px solid var(--border-color)",
          borderRadius: "var(--radius-md)",
          color: "var(--text-secondary)",
          textAlign: "center"
        }}
      >
        No valid GPS coordinates are available for this delivery yet.
      </div>
    );
  }

  return (
    <div
      style={{
        height: "min(60vh, 520px)",
        minHeight: "300px",
        width: "100%",
        border: "1px solid var(--border-color)",
        borderRadius: "var(--radius-md)",
        overflow: "hidden"
      }}
    >
      <MapContainer
        center={points[0].position}
        zoom={12}
        scrollWheelZoom
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {Array.isArray(route?.coordinates) &&
          route.coordinates.length >= 2 && (
            <Polyline
              positions={route.coordinates}
              pathOptions={{ color: "#2563EB", weight: 5, opacity: 0.8 }}
            />
          )}
        {points.map((point) => (
          <Marker
            key={point.key}
            position={point.position}
            icon={markerIcons[point.type]}
          >
            <Popup>
              <strong>{point.label}</strong>
              <br />
              {point.detail}
            </Popup>
          </Marker>
        ))}
        <FitMapToLocations
          points={points}
          routeKey={routeKey}
          driverAvailable={driverAvailable}
        />
      </MapContainer>
    </div>
  );
}
