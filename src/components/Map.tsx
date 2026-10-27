import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { money } from "../api";
import type { Coordinates, Place } from "../types";
export function FoodMap({
  places,
  center,
  selected,
  onSelect,
  onPoint,
}: {
  places: Place[];
  center: Coordinates;
  selected?: string;
  onSelect?: (id: string) => void;
  onPoint?: (point: Coordinates) => void;
}) {
  const container = useRef<HTMLDivElement>(null),
    map = useRef<L.Map | null>(null),
    markers = useRef<L.LayerGroup | null>(null),
    user = useRef<L.CircleMarker | null>(null),
    pointHandler = useRef(onPoint),
    [tileError, setTileError] = useState(false);
  pointHandler.current = onPoint;
  useEffect(() => {
    if (!container.current) return;
    const instance = L.map(container.current, {
      center: [center.lat, center.lng],
      zoom: 14,
      scrollWheelZoom: false,
    });
    map.current = instance;
    L.tileLayer(
      import.meta.env.VITE_MAP_TILE_URL ||
        "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
      {
        attribution:
          import.meta.env.VITE_MAP_ATTRIBUTION ||
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      },
    )
      .on("tileerror", () => setTileError(true))
      .addTo(instance);
    markers.current = L.layerGroup().addTo(instance);
    user.current = L.circleMarker([center.lat, center.lng], {
      radius: 8,
      color: "#FEF3E2",
      weight: 3,
      fillColor: "#D4621A",
      fillOpacity: 1,
    })
      .addTo(instance)
      .bindTooltip("Your search location");
    instance.on("click", (e) =>
      pointHandler.current?.({ lat: e.latlng.lat, lng: e.latlng.lng }),
    );
    const observer = new ResizeObserver(() => instance.invalidateSize());
    observer.observe(container.current);
    return () => {
      observer.disconnect();
      instance.remove();
      map.current = null;
    };
    // The map is created once; location and pins update independently below.
  }, []);
  useEffect(() => {
    map.current?.setView([center.lat, center.lng], 14);
    user.current?.setLatLng([center.lat, center.lng]);
  }, [center.lat, center.lng]);
  useEffect(() => {
    if (!markers.current) return;
    markers.current.clearLayers();
    for (const p of places) {
      const marker = L.marker([p.lat, p.lng], {
        title: p.name,
        keyboard: true,
        icon: L.divIcon({
          className: `price-pin ${selected === p.id ? "active" : ""}`,
          html: money(p.price),
          iconSize: [76, 36],
          iconAnchor: [38, 36],
        }),
      });
      marker.on("click", () => onSelect?.(p.id));
      marker.addTo(markers.current);
    }
  }, [places, selected, onSelect]);
  return (
    <div className="map-shell">
      <div
        ref={container}
        className="food-map"
        role="region"
        aria-label="Food locations on OpenStreetMap"
      />
      {tileError && (
        <div className="map-notice" role="status">
          Map tiles could not load. Your food list is still available.
        </div>
      )}
      <div className="map-tip">
        Select a price pin to explore a place
        {onPoint ? " · Click the map to search another area" : ""}
      </div>
    </div>
  );
}
