const OPENFREEMAP_STYLE_URL = "https://tiles.openfreemap.org/styles/liberty";
const COLOMBIA_CENTER = [-74.2973, 4.5709];
const COLOMBIA_ZOOM = 5.5;

let map = null;

async function fetchJson(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`No se pudo leer ${path}`);
  const text = await res.text();
  return JSON.parse(text.replace(/^﻿/, ""));
}

function toGeoJSON(features) {
  return { type: "FeatureCollection", features };
}

function airportsToGeoJSON(airports) {
  return toGeoJSON(
    airports.map((a) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [a.longitude, a.latitude] },
      properties: { icao: a.icao, name: a.name, runways: (a.runways || []).join(", ") },
    })),
  );
}

function waypointsToGeoJSON(waypoints) {
  return toGeoJSON(
    waypoints.map((w) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [w.longitude, w.latitude] },
      properties: { name: w.name, region: w.region },
    })),
  );
}

function setLayerVisibility(layerIds, visible) {
  layerIds.forEach((id) => {
    if (map.getLayer(id)) {
      map.setLayoutProperty(id, "visibility", visible ? "visible" : "none");
    }
  });
}

function setupLayerToggles() {
  document.getElementById("toggleAirports")?.addEventListener("click", function () {
    const active = this.classList.toggle("is-active");
    setLayerVisibility(["airports-dot", "airports-label"], active);
  });

  document.getElementById("toggleWaypoints")?.addEventListener("click", function () {
    const active = this.classList.toggle("is-active");
    setLayerVisibility(["waypoints-dot", "waypoints-label"], active);
  });
}

function addWaypointLayers(geojson) {
  map.addSource("waypoints", { type: "geojson", data: geojson });

  map.addLayer({
    id: "waypoints-dot",
    type: "circle",
    source: "waypoints",
    paint: {
      "circle-radius": ["interpolate", ["linear"], ["zoom"], 4, 2, 10, 4.5],
      "circle-color": "#67e8f9",
      "circle-opacity": 0.85,
    },
  });

  map.addLayer({
    id: "waypoints-label",
    type: "symbol",
    source: "waypoints",
    minzoom: 8,
    layout: {
      "text-field": ["get", "name"],
      "text-size": 10,
      "text-offset": [0, 1],
      "text-anchor": "top",
      "text-allow-overlap": false,
    },
    paint: {
      "text-color": "#67e8f9",
      "text-halo-color": "#020617",
      "text-halo-width": 1.2,
    },
  });
}

function addAirportLayers(geojson) {
  map.addSource("airports", { type: "geojson", data: geojson });

  map.addLayer({
    id: "airports-dot",
    type: "circle",
    source: "airports",
    paint: {
      "circle-radius": ["interpolate", ["linear"], ["zoom"], 4, 5, 12, 11],
      "circle-color": "#fbbf24",
      "circle-stroke-width": 1.5,
      "circle-stroke-color": "#020617",
    },
  });

  map.addLayer({
    id: "airports-label",
    type: "symbol",
    source: "airports",
    minzoom: 5,
    layout: {
      "text-field": ["get", "icao"],
      "text-size": 11,
      "text-offset": [0, 1.6],
      "text-anchor": "top",
      "text-allow-overlap": false,
    },
    paint: {
      "text-color": "#fbbf24",
      "text-halo-color": "#020617",
      "text-halo-width": 1.5,
    },
  });
}

function setupPopups() {
  const popup = new maplibregl.Popup({ closeButton: true, maxWidth: "260px" });

  map.on("click", "airports-dot", (e) => {
    const p = e.features[0].properties;
    const coords = e.features[0].geometry.coordinates.slice();
    popup
      .setLngLat(coords)
      .setHTML(
        `<div class="ifr-popup-inner">
          <code>${p.icao}</code>
          <strong>${p.name}</strong>
          ${p.runways ? `<span>RWY: ${p.runways}</span>` : ""}
        </div>`,
      )
      .addTo(map);
  });

  map.on("click", "waypoints-dot", (e) => {
    const p = e.features[0].properties;
    const coords = e.features[0].geometry.coordinates.slice();
    popup
      .setLngLat(coords)
      .setHTML(
        `<div class="ifr-popup-inner">
          <code>${p.name}</code>
          <span>Waypoint &bull; Region ${p.region}</span>
        </div>`,
      )
      .addTo(map);
  });

  ["airports-dot", "waypoints-dot"].forEach((layer) => {
    map.on("mouseenter", layer, () => { map.getCanvas().style.cursor = "pointer"; });
    map.on("mouseleave", layer, () => { map.getCanvas().style.cursor = ""; });
  });
}

function initMap() {
  const container = document.getElementById("mapContainer");
  if (!container || typeof maplibregl === "undefined") return;

  map = new maplibregl.Map({
    container,
    style: OPENFREEMAP_STYLE_URL,
    center: COLOMBIA_CENTER,
    zoom: COLOMBIA_ZOOM,
    attributionControl: true,
  });

  map.addControl(new maplibregl.NavigationControl(), "top-right");
  map.addControl(new maplibregl.FullscreenControl(), "top-right");
  map.addControl(new maplibregl.ScaleControl({ unit: "metric" }), "bottom-left");

  map.on("load", async () => {
    try {
      const [airports, waypoints] = await Promise.all([
        fetchJson("storage/metadata/airports-colombia-runways.json"),
        fetchJson("storage/metadata/waypoints-colombia.json"),
      ]);

      addWaypointLayers(waypointsToGeoJSON(waypoints));
      addAirportLayers(airportsToGeoJSON(airports));
      setupPopups();
      setupLayerToggles();

      const airportCount = document.getElementById("airportLayerCount");
      const waypointCount = document.getElementById("waypointLayerCount");
      if (airportCount) airportCount.textContent = String(airports.length).padStart(3, "0");
      if (waypointCount) waypointCount.textContent = String(waypoints.length).padStart(4, "0");
    } catch (err) {
      console.error("Error cargando datos del mapa:", err);
    }
  });
}

initMap();
