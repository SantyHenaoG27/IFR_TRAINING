const waypointRows = document.querySelector("#waypointRows");
const waypointCount = document.querySelector("#waypointCount");
const airportRows = document.querySelector("#airportRows");
const airportCount = document.querySelector("#airportCount");
const airportSearchInputs = document.querySelectorAll(".airport-search-input");
const routeAirportStatus = document.querySelector("#routeAirportStatus");
const sidProcedureSelect = document.querySelector("#sidProcedureSelect");
const originRunwaySelect = document.querySelector("#originRunwaySelect");
const destinationRunwaySelect = document.querySelector("#destinationRunwaySelect");
const starProcedureSelect = document.querySelector("#starProcedureSelect");
const iacProcedureSelect = document.querySelector("#iacProcedureSelect");
const originAirportInput = document.querySelector('[data-route-role="origin"]');
const destinationAirportInput = document.querySelector('[data-route-role="destination"]');
const originAirportClear = document.querySelector("#originAirportClear");
const destinationAirportClear = document.querySelector("#destinationAirportClear");
const alternateOneInput = document.querySelector('[data-route-role="alterno1"]');
const alternateTwoInput = document.querySelector('[data-route-role="alterno2"]');
const alternateOneClear = document.querySelector("#alternateOneClear");
const alternateTwoClear = document.querySelector("#alternateTwoClear");
const originChartAirportTitle = document.querySelector("#originChartAirportTitle");
const originChartAirportCode = document.querySelector("#originChartAirportCode");
const originChartNote = document.querySelector("#originChartNote");
const originChartResults = document.querySelector("#originChartResults");
const originChartPreview = document.querySelector("#originChartPreview");
const originPreviewTitle = document.querySelector("#originPreviewTitle");
const originPreviewView = document.querySelector("#originPreviewView");
const originPreviewDownload = document.querySelector("#originPreviewDownload");
const originPreviewHide = document.querySelector("#originPreviewHide");
const originPreviewFrame = document.querySelector("#originPreviewFrame");
const destinationChartAirportTitle = document.querySelector("#destinationChartAirportTitle");
const destinationChartAirportCode = document.querySelector("#destinationChartAirportCode");
const destinationChartNote = document.querySelector("#destinationChartNote");
const destinationChartResults = document.querySelector("#destinationChartResults");
const destinationChartPreview = document.querySelector("#destinationChartPreview");
const destinationPreviewTitle = document.querySelector("#destinationPreviewTitle");
const destinationPreviewView = document.querySelector("#destinationPreviewView");
const destinationPreviewDownload = document.querySelector("#destinationPreviewDownload");
const destinationPreviewHide = document.querySelector("#destinationPreviewHide");
const destinationPreviewFrame = document.querySelector("#destinationPreviewFrame");
const customAirportInput = document.querySelector('[data-route-role="custom"]');
const customChartAirportTitle = document.querySelector("#customChartAirportTitle");
const customChartAirportCode = document.querySelector("#customChartAirportCode");
const customChartNote = document.querySelector("#customChartNote");
const customChartResults = document.querySelector("#customChartResults");
const customChartPreview = document.querySelector("#customChartPreview");
const customPreviewTitle = document.querySelector("#customPreviewTitle");
const customPreviewView = document.querySelector("#customPreviewView");
const customPreviewDownload = document.querySelector("#customPreviewDownload");
const customPreviewHide = document.querySelector("#customPreviewHide");
const customPreviewFrame = document.querySelector("#customPreviewFrame");
const enrouteChartCount = document.querySelector("#enrouteChartCount");
const enrouteTypeList = document.querySelector("#enrouteTypeList");
const enrouteChartResults = document.querySelector("#enrouteChartResults");
const skpeRows = document.querySelector("#skpeRows");
const skpeCount = document.querySelector("#skpeCount");
let colombianAirports = [];
let allWaypoints = [];
let allNavaids = [];
let dashMapInstance = null;
let routeLineGeoJSON = { type: "FeatureCollection", features: [] };
let routeWaypoints = [];
const chartCache = {};
let enrouteCharts = [];

const ENROUTE_CHART_TYPES = [
  { id: "SECTOR", label: "SECTORIZACION", match: (name) => name.includes("SECTORIZACION") },
  { id: "TMA", label: "TMA", match: (name) => name.includes("(TMA)") || name.includes("AREA TERMINAL") },
  { id: "CTA", label: "CTA", match: (name) => name.includes("CTA") },
  { id: "LOWER", label: "NIVEL INFERIOR", match: (name) => name.includes("NIVEL INFERIOR") },
  { id: "UPPER", label: "NIVEL SUPERIOR", match: (name) => name.includes("NIVEL SUPERIOR") },
];

async function fetchJson(path) {
  const separator = path.includes("?") ? "&" : "?";
  const response = await fetch(`${path}${separator}v=15`, { cache: "no-store" });

  if (!response.ok) {
    throw new Error(`No se pudo leer ${path}`);
  }

  const text = await response.text();
  return JSON.parse(text.replace(/^\uFEFF/, ""));
}

function formatCoordinate(value) {
  return Number(value).toFixed(6);
}

function normalizeFixName(value) {
  return String(value || "").trim().toUpperCase();
}

function getRouteFixByName(name) {
  const normalizedName = normalizeFixName(name);
  const waypoint = allWaypoints.find((w) => normalizeFixName(w.name) === normalizedName);
  if (waypoint) {
    return {
      name: waypoint.name,
      type: "Waypoint",
      latitude: waypoint.latitude,
      longitude: waypoint.longitude,
      detail: waypoint.region ? `Region ${waypoint.region}` : "",
    };
  }

  const navaid = allNavaids.find((n) => normalizeFixName(n.shortName) === normalizedName);
  if (navaid?.coordinates) {
    return {
      name: navaid.shortName,
      type: "Radio ayuda",
      latitude: navaid.coordinates.latitude,
      longitude: navaid.coordinates.longitude,
      detail: [navaid.longName, navaid.frequency].filter(Boolean).join(" / "),
    };
  }

  return null;
}

function getOrderedRoutePoints() {
  const origin = getAirportForPanel("origin");
  const destination = getAirportForPanel("destination");
  const orderedPoints = [];

  if (origin?.latitude != null && origin?.longitude != null) {
    orderedPoints.push({
      type: "origin",
      name: origin.icao,
      latitude: origin.latitude,
      longitude: origin.longitude,
    });
  }

  routeWaypoints.forEach((name, index) => {
    const fix = getRouteFixByName(name);
    if (fix?.latitude != null && fix?.longitude != null) {
      orderedPoints.push({
        type: "fix",
        sequence: index + 1,
        name: fix.name,
        latitude: fix.latitude,
        longitude: fix.longitude,
      });
    }
  });

  if (destination?.latitude != null && destination?.longitude != null) {
    orderedPoints.push({
      type: "destination",
      name: destination.icao,
      latitude: destination.latitude,
      longitude: destination.longitude,
    });
  }

  return orderedPoints;
}

function renderWaypoints(waypoints) {
  if (!waypointCount && !waypointRows) return;
  const visibleWaypoints = waypoints.slice(0, 80);
  if (waypointCount) waypointCount.textContent = String(waypoints.length).padStart(4, "0");
  if (waypointRows) waypointRows.innerHTML = visibleWaypoints
    .map(
      (waypoint) => `
        <div class="waypoint-row">
          <code>${waypoint.name}</code>
          <span>${formatCoordinate(waypoint.latitude)}</span>
          <span>${formatCoordinate(waypoint.longitude)}</span>
          <span>${waypoint.region}</span>
        </div>
      `,
    )
    .join("");
}

function renderAirports(airports) {
  colombianAirports = airports;
  if (routeAirportStatus) {
    routeAirportStatus.textContent = String(airports.length).padStart(3, "0");
  }

  if (airportCount) airportCount.textContent = String(airports.length).padStart(3, "0");
  if (airportRows) airportRows.innerHTML = airports
    .map(
      (airport) => `
        <div class="airport-row">
          <code>${airport.icao}</code>
          <span>${airport.name}</span>
          <span>${formatCoordinate(airport.latitude)}</span>
          <span>${formatCoordinate(airport.longitude)}</span>
          <span>${airport.runways.join(", ")}</span>
        </div>
      `,
    )
    .join("");
}

function getEnrouteChartType(chart) {
  const name = normalizeSearch(chart.internalName || chart.originalFileName || "");
  return ENROUTE_CHART_TYPES.find((type) => type.match(name)) || null;
}

function getEnrouteChartsByType(typeId) {
  return enrouteCharts.filter((chart) => getEnrouteChartType(chart)?.id === typeId);
}

function renderEnrouteCharts(typeId) {
  if (!enrouteChartResults) return;

  const type = ENROUTE_CHART_TYPES.find((item) => item.id === typeId);
  const charts = getEnrouteChartsByType(typeId);

  if (!type || !charts.length) {
    enrouteChartResults.innerHTML = `<div class="chart-empty">No hay cartas disponibles para este tipo.</div>`;
    return;
  }

  enrouteChartResults.innerHTML = charts
    .map(
      (chart) => `
        <a class="chart-result-item" href="${encodeURI(chart.path)}" target="_blank" rel="noreferrer">
          <strong>${chart.internalName}</strong>
          <span>${type.label}</span>
        </a>
      `,
    )
    .join("");
}

function renderEnrouteTypeButtons() {
  if (!enrouteTypeList) return;

  enrouteTypeList.innerHTML = ENROUTE_CHART_TYPES
    .map((type) => {
      const count = getEnrouteChartsByType(type.id).length;
      return `
        <button type="button" class="enroute-type-btn" data-enroute-type="${type.id}">
          <span>${type.label}</span>
          <code>${String(count).padStart(2, "0")}</code>
        </button>
      `;
    })
    .join("");

  if (enrouteChartCount) {
    enrouteChartCount.textContent = String(enrouteCharts.length).padStart(3, "0");
  }

  if (enrouteChartResults) {
    enrouteChartResults.innerHTML = `<div class="chart-empty">Selecciona un tipo de carta.</div>`;
  }
}

async function loadEnrouteCharts() {
  if (!enrouteTypeList || !enrouteChartResults) return;

  try {
    enrouteCharts = await fetchJson("storage/metadata/enroute-charts.json");
    renderEnrouteTypeButtons();
  } catch (error) {
    if (enrouteChartCount) enrouteChartCount.textContent = "ERR";
    enrouteChartResults.innerHTML = `<div class="chart-empty">No se pudo cargar el indice de cartas en ruta.</div>`;
  }
}

function setupEnrouteCharts() {
  enrouteTypeList?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-enroute-type]");
    if (!button) return;

    enrouteTypeList.querySelectorAll("[data-enroute-type]").forEach((item) => item.classList.remove("is-active"));
    button.classList.add("is-active");
    renderEnrouteCharts(button.dataset.enrouteType);
  });
}

function normalizeSearch(value) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .trim();
}

function findAirportMatches(query) {
  const normalizedQuery = normalizeSearch(query);

  if (normalizedQuery.length < 2) {
    return [];
  }

  return colombianAirports
    .filter((airport) => {
      const icao = normalizeSearch(airport.icao);
      const name = normalizeSearch(airport.name);
      return icao.includes(normalizedQuery) || name.includes(normalizedQuery);
    })
    .slice(0, 8);
}

function parseAirportCode(value) {
  const match = value.toUpperCase().match(/\bSK[A-Z0-9]{2}\b/);
  return match ? match[0] : "";
}

function getSelectedAirportCode(input) {
  return input?.dataset.selectedIcao || "";
}

function getExactAirportMatch(value) {
  const normalizedValue = normalizeSearch(value);
  const parsedIcao = parseAirportCode(value);

  if (!normalizedValue) {
    return null;
  }

  return (
    colombianAirports.find((airport) => {
      const icao = normalizeSearch(airport.icao);
      const name = normalizeSearch(airport.name);
      const optionLabel = normalizeSearch(`${airport.icao} - ${airport.name}`);
      return parsedIcao === airport.icao || normalizedValue === icao || normalizedValue === name || normalizedValue === optionLabel;
    }) || null
  );
}

function updateChartTitle(input, titleElement, codeElement, noteElement, fallbackTitle, fallbackCode, fallbackNote) {
  if (!input || !titleElement || !codeElement || !noteElement) {
    return;
  }

  const icao = getSelectedAirportCode(input);
  const airport = colombianAirports.find((item) => item.icao === icao);

  if (!airport) {
    titleElement.textContent = fallbackTitle;
    codeElement.textContent = fallbackCode;
    noteElement.textContent = fallbackNote;
    return;
  }

  titleElement.textContent = `${airport.icao} / ${airport.name}`;
  codeElement.textContent = airport.icao;
  noteElement.textContent = `Cartas listas para ${airport.icao}.`;
}

function updateRouteChartTitles() {
  updateChartTitle(
    originAirportInput,
    originChartAirportTitle,
    originChartAirportCode,
    originChartNote,
    "Cartas del origen",
    "ORIG",
    "Selecciona el aeropuerto de origen para preparar sus cartas disponibles.",
  );
  updateChartTitle(
    destinationAirportInput,
    destinationChartAirportTitle,
    destinationChartAirportCode,
    destinationChartNote,
    "Cartas del destino",
    "DEST",
    "Selecciona el aeropuerto de destino para preparar sus cartas disponibles.",
  );
  updateChartTitle(
    customAirportInput,
    customChartAirportTitle,
    customChartAirportCode,
    customChartNote,
    "Busqueda de aeropuerto",
    "ICAO",
    "Busca cualquier aeropuerto colombiano para consultar sus cartas disponibles.",
  );
}

function updateRouteLineOnMap() {
  const coords = getOrderedRoutePoints().map((point) => [point.longitude, point.latitude]);

  routeLineGeoJSON = coords.length >= 2
    ? { type: "FeatureCollection", features: [{ type: "Feature", geometry: { type: "LineString", coordinates: coords }, properties: {} }] }
    : { type: "FeatureCollection", features: [] };

  ensureRouteLineLayer();

  const source = dashMapInstance?.getSource("route-line");
  if (source) {
    source.setData(routeLineGeoJSON);
  } else if (dashMapInstance) {
    dashMapInstance.once("style.load", () => {
      dashMapInstance.getSource("route-line")?.setData(routeLineGeoJSON);
    });
  }
}

function ensureRouteLineLayer() {
  if (!dashMapInstance || !dashMapInstance.isStyleLoaded()) return;

  if (!dashMapInstance.getSource("route-line")) {
    dashMapInstance.addSource("route-line", { type: "geojson", data: routeLineGeoJSON });
  }

  if (!dashMapInstance.getLayer("route-line-halo")) {
    dashMapInstance.addLayer({
      id: "route-line-halo", type: "line", source: "route-line",
      layout: { "line-cap": "round", "line-join": "round" },
      paint: { "line-color": "#000000", "line-width": 7, "line-opacity": 0.45 },
    });
  }

  if (!dashMapInstance.getLayer("route-line-layer")) {
    dashMapInstance.addLayer({
      id: "route-line-layer", type: "line", source: "route-line",
      layout: { "line-cap": "round", "line-join": "round" },
      paint: { "line-color": "#e879f9", "line-width": 4 },
    });
  }
}

function updateRouteSummaryWaypoints() {
  const panel = document.getElementById("routeSummaryPanel");
  if (!panel || panel.classList.contains("hidden-panel")) return;

  const waypointItem = Array.from(panel.querySelectorAll(".rsum-item")).find((item) =>
    item.querySelector("span")?.textContent?.trim() === "Waypoints",
  );
  const value = waypointItem?.querySelector("strong");
  if (value) value.textContent = routeWaypoints.length ? routeWaypoints.join(" — ") : "—";

  const routeString = panel.querySelector(".route-string");
  if (routeString) {
    const originIcao = getSelectedAirportCode(originAirportInput);
    const destIcao = getSelectedAirportCode(destinationAirportInput);
    const originRwy = originRunwaySelect?.value || "";
    const sid = sidProcedureSelect?.value || "";
    const star = starProcedureSelect?.value || "";
    const destRwy = destinationRunwaySelect?.value || "";
    const iac = iacProcedureSelect?.value || "";

    const routeParts = [];
    if (originIcao) routeParts.push(originIcao + (originRwy ? `/${originRwy}` : ""));
    if (sid && sid !== "NO_SID") routeParts.push(sid);
    routeParts.push(...routeWaypoints);
    if (star && star !== "NO_STAR") routeParts.push(star);
    if (destIcao) routeParts.push(destIcao + (destRwy ? `/${destRwy}` : ""));
    if (iac && iac !== "NO_IAC") routeParts.push(iac);
    routeString.textContent = routeParts.join(" — ");
  }
}

function getChartResultBox(panel) {
  if (panel === "origin") return originChartResults;
  if (panel === "destination") return destinationChartResults;
  return customChartResults;
}

function getChartPreviewElements(panel) {
  if (panel === "origin") {
    return {
      preview: originChartPreview,
      title: originPreviewTitle,
      view: originPreviewView,
      download: originPreviewDownload,
      hide: originPreviewHide,
      frame: originPreviewFrame,
    };
  }

  if (panel === "destination") {
    return {
      preview: destinationChartPreview,
      title: destinationPreviewTitle,
      view: destinationPreviewView,
      download: destinationPreviewDownload,
      hide: destinationPreviewHide,
      frame: destinationPreviewFrame,
    };
  }

  return {
    preview: customChartPreview,
    title: customPreviewTitle,
    view: customPreviewView,
    download: customPreviewDownload,
    hide: customPreviewHide,
    frame: customPreviewFrame,
  };
}

function hideChartPreview(panel) {
  const preview = getChartPreviewElements(panel);
  preview.preview?.classList.add("hidden-panel");
  if (preview.frame) {
    preview.frame.src = "";
  }
}

function getAirportForPanel(panel) {
  let input;
  if (panel === "origin") input = originAirportInput;
  else if (panel === "destination") input = destinationAirportInput;
  else input = customAirportInput;
  const icao = panel === "custom" ? parseAirportCode(input?.value || "") : getSelectedAirportCode(input);
  const airport = colombianAirports.find((item) => item.icao === icao);
  return airport || (icao ? { icao, name: icao, runways: [] } : null);
}

function renderUnavailableCharts(panel, message) {
  const box = getChartResultBox(panel);

  if (!box) {
    return;
  }

  box.innerHTML = `<div class="chart-empty">${message}</div>`;
  hideChartPreview(panel);
}

function isNavigationProcedureChart(item) {
  const text = `${item.fileName} ${item.title} ${item.chartName} ${item.procedureName}`.toUpperCase();
  const stem = (item.fileName || "").replace(/\.PDF$/i, "").toUpperCase();
  const nonGraphicPatterns = [
    "TABULAR",
    "OPERATING INSTRUCTIONS",
    "TOWING INSTRUCTIONS",
  ];
  const isSupplement = /(?:^|\s)(?:T\d+|HC)$/.test(stem);
  return item.isTabular !== true && !isSupplement && !nonGraphicPatterns.some((pattern) => text.includes(pattern));
}

function uniqueByCode(procedures) {
  const seen = new Set();
  return procedures.filter((p) => {
    if (seen.has(p.code)) return false;
    seen.add(p.code);
    return true;
  });
}

function normalizeRunwayLabel(runway) {
  if (!runway) return "";
  return runway.replace(/\s+/g, " ").replace(/^RWY\s*/i, "").trim();
}

function formatProcedureOption(procedure) {
  const invalidNameFragments = [
    "ICAO STANDARD",
    "STANDARD INSTRUMENT",
    "INSTRUMENT ARRIVAL",
    "INSTRUMENT DEPARTURE",
    "CARTA DE",
    "VUELO POR INSTRUMENTOS",
    "AIRAC",
    "AIP",
  ];
  const rawName = procedure.name || "";
  const hasInvalidName = invalidNameFragments.some((fragment) => rawName.toUpperCase().includes(fragment));
  const name = rawName && rawName !== procedure.code && !hasInvalidName ? rawName : "Procedimiento";
  const runway = procedure.runways?.length ? ` - RWY ${procedure.runways.join(", ")}` : "";
  return `${name}  [${procedure.code}]${runway}`;
}

function groupProcedureOptions(procedures) {
  const grouped = new Map();

  procedures.forEach((procedure) => {
    if (!procedure.code) return;

    if (!grouped.has(procedure.code)) {
      grouped.set(procedure.code, {
        name: procedure.name || procedure.code,
        code: procedure.code,
        runways: [],
      });
    }

    const item = grouped.get(procedure.code);
    if ((!item.name || item.name === item.code) && procedure.name) {
      item.name = procedure.name;
    }

    const runway = normalizeRunwayLabel(procedure.runway);
    if (runway && !item.runways.includes(runway)) {
      item.runways.push(runway);
    }
  });

  return [...grouped.values()].sort((a, b) => a.code.localeCompare(b.code));
}

function extractProcedureCodesFromText(text) {
  const ignoredCodes = new Set(["ICAO", "RNAV", "RNP", "STAR", "SID", "RWY", "GNSS"]);
  const matches = normalizeSearch(text).match(/\b[A-Z]{3,5}\d[A-Z]\b/g) || [];
  return [...new Set(matches)].filter((code) => !ignoredCodes.has(code));
}

function getItemProcedureObjects(item) {
  const indexedProcedures = Array.isArray(item.procedures)
    ? item.procedures.filter((procedure) => procedure.name || procedure.code)
    : [];

  if (indexedProcedures.length) {
    return indexedProcedures.map((procedure) => ({
      name: procedure.name || procedure.code,
      code: procedure.code || procedure.name,
    }));
  }

  const text = `${item.title || ""} ${item.chartName || ""} ${item.procedureName || ""} ${item.fileName || ""}`;
  return extractProcedureCodesFromText(text).map((code) => ({ name: code, code }));
}

function formatProcedureList(item) {
  const procedures = getItemProcedureObjects(item);
  if (procedures.length) {
    return procedures.map((procedure) => `[${procedure.code || procedure.name}]`).join(" ");
  }

  return item.procedureName || item.chartName || item.title || item.fileName;
}

function getChartCards(index) {
  return index.items.filter(isNavigationProcedureChart).map((item) => ({
    title: item.title || item.chartName || item.procedureName || item.fileName,
    procedures: formatProcedureList(item),
    runway: item.runway,
    chartType: item.chartType,
    fileName: item.fileName,
    filePath: item.filePath,
  }));
}

function getProcedureCards(index) {
  return index.items.filter(isNavigationProcedureChart).flatMap((item) => {
    const itemProcedures = getItemProcedureObjects(item);

    if (itemProcedures.length) {
      return itemProcedures.map((procedure) => ({
        name: procedure.name,
        code: procedure.code,
        runway: item.runway,
        filePath: item.filePath,
      }));
    }

    return [
      {
        name: item.procedureName || item.chartName || item.title || item.fileName,
        code: item.procedureName || item.chartName || item.title || item.fileName,
        runway: item.runway,
        filePath: item.filePath,
      },
    ];
  });
}

function uniqueByProcedureIdentity(procedures) {
  const seen = new Set();
  return procedures.filter((procedure) => {
    const key = [procedure.code, procedure.name, procedure.runway, procedure.filePath].filter(Boolean).join("|");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function renderChartList(panel, chartType, index) {
  const box = getChartResultBox(panel);

  if (!box) {
    return;
  }

  const chartCards = getChartCards(index);

  if (!chartCards.length) {
    renderUnavailableCharts(panel, `No hay cartas graficas ${chartType} disponibles.`);
    return;
  }

  box.innerHTML = chartCards
    .map(
      (chart) => {
        const isProcedureChart = ["SID", "STAR"].includes(chartType);
        const title = isProcedureChart ? chart.procedures : chart.title;
        const detail = isProcedureChart
          ? [chartType, chart.runway].filter(Boolean).join(" / ")
          : [chart.procedures, chart.runway].filter(Boolean).join(" / ");
        return `
        <button class="chart-result-item" type="button" data-panel="${panel}" data-title="${chart.title}" data-file="${encodeURI(chart.filePath)}">
          <strong>${title}</strong>
          <span>${detail}</span>
        </button>
      `;
      },
    )
    .join("");
}

async function getChartIndex(chartType, icao) {
  const cacheKey = `${icao}-${chartType}`;

  if (chartCache[cacheKey]) {
    return chartCache[cacheKey];
  }

  const path = `storage/metadata/${icao}-${chartType.toLowerCase()}-pdf-index.json`;
  chartCache[cacheKey] = await fetchJson(path);
  return chartCache[cacheKey];
}

function setupChartButtons() {
  document.querySelectorAll("[data-chart-type]").forEach((button) => {
    button.addEventListener("click", async () => {
      const chartType = button.dataset.chartType;
      const panel = button.dataset.chartPanel;
      const airport = getAirportForPanel(panel);
      const isActive = button.classList.contains("is-active");
      hideChartPreview(panel);

      document
        .querySelectorAll(`[data-chart-panel="${panel}"]`)
        .forEach((item) => item.classList.remove("is-active"));

      if (isActive) {
        const resultBox = getChartResultBox(panel);
        if (resultBox) resultBox.innerHTML = "";
        return;
      }

      button.classList.add("is-active");

      if (!airport) {
        renderUnavailableCharts(
          panel,
          panel === "custom"
            ? "Primero ingresa un aeropuerto valido."
            : "Selecciona primero un aeropuerto de origen o destino."
        );
        return;
      }

      if (!["ADC", "ENR", "GMC", "IAC", "SID", "STAR", "VAC"].includes(chartType)) {
        renderUnavailableCharts(panel, `${chartType} no esta indexada todavia.`);
        return;
      }

      try {
        const index = await getChartIndex(chartType, airport.icao);
        renderChartList(panel, chartType, index);
        if (chartType === "SID" && panel === "origin") {
          renderSidOptions(index);
        }
        if (chartType === "STAR" && panel === "destination") {
          renderStarOptions(index, airport.icao);
        }
      } catch (error) {
        renderUnavailableCharts(panel, `No hay cartas ${chartType} disponibles para ${airport.icao}.`);
      }
    });
  });
}

function setupChartPreview() {
  [
    getChartPreviewElements("origin"),
    getChartPreviewElements("destination"),
    getChartPreviewElements("custom"),
  ].forEach((preview) => {
    preview.hide?.addEventListener("click", () => {
      preview.preview?.classList.add("hidden-panel");
      if (preview.frame) preview.frame.src = "";
    });
  });

  document.addEventListener("click", (event) => {
    const item = event.target.closest(".chart-result-item[data-panel]");

    if (!item) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    const preview = getChartPreviewElements(item.dataset.panel);
    const filePath = item.dataset.file;
    const title = item.dataset.title;

    preview.title.textContent = title;
    preview.view.href = filePath;
    preview.download.href = filePath;
    preview.download.setAttribute("download", filePath.split("/").pop());
    preview.frame.src = `${filePath}#toolbar=0&navpanes=0`;
    preview.preview.classList.remove("hidden-panel");
  });
}

function closeAirportSuggestions(exceptBox) {
  document.querySelectorAll(".airport-suggestions").forEach((box) => {
    if (box !== exceptBox) {
      box.classList.remove("is-open");
      box.innerHTML = "";
    }
  });
}

function updateRouteAirportClearButtons() {
  [
    { input: originAirportInput, button: originAirportClear },
    { input: destinationAirportInput, button: destinationAirportClear },
  ].forEach(({ input, button }) => {
    if (!input || !button) return;
    button.classList.toggle("hidden-panel", !getSelectedAirportCode(input));
  });

  [
    { input: alternateOneInput, button: alternateOneClear },
    { input: alternateTwoInput, button: alternateTwoClear },
  ].forEach(({ input, button }) => {
    if (!input || !button) return;
    button.classList.toggle("hidden-panel", !input.value.trim());
  });
}

function renderAirportSuggestions(input) {
  const box = input.parentElement.querySelector(".airport-suggestions");
  const normalizedValue = normalizeSearch(input.value);
  const matches = findAirportMatches(input.value);
  const confirmedValue = input.dataset.confirmedAirport || "";

  closeAirportSuggestions(box);

  if (normalizedValue.length < 2 || (confirmedValue && confirmedValue === normalizedValue)) {
    box.classList.remove("is-open");
    box.innerHTML = "";
    return;
  }

  if (!matches.length) {
    box.innerHTML = `<div class="airport-suggestion-empty">Sin coincidencias</div>`;
    box.classList.add("is-open");
    return;
  }

  box.innerHTML = matches
    .map(
      (airport) => `
        <button class="airport-suggestion-item" type="button" data-icao="${airport.icao}" data-value="${airport.icao} - ${airport.name}">
          <code>${airport.icao}</code>
          <span>${airport.name}</span>
          <em>${formatCoordinate(airport.latitude)}, ${formatCoordinate(airport.longitude)}</em>
        </button>
      `,
    )
    .join("");
  box.classList.add("is-open");
}

function setupAirportSearch() {
  airportSearchInputs.forEach((input) => {
    const requiresSelection = ["origin", "destination"].includes(input.dataset.routeRole);

    input.addEventListener("input", () => {
      if (input.dataset.confirmedAirport !== normalizeSearch(input.value)) {
        delete input.dataset.confirmedAirport;
      }
      if (requiresSelection) {
        delete input.dataset.selectedIcao;
      }
      renderAirportSuggestions(input);
      updateRouteAirportClearButtons();
    });
    input.addEventListener("focus", () => renderAirportSuggestions(input));
    input.addEventListener("blur", () => {
      setTimeout(() => closeAirportSuggestions(), 120);
      updateRouteAirportClearButtons();
    });
    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        closeAirportSuggestions();
        updateRouteAirportClearButtons();
      }
    });

    input.parentElement.addEventListener("click", (event) => {
      const item = event.target.closest(".airport-suggestion-item");

      if (!item) {
        return;
      }

      input.value = item.dataset.value;
      if (requiresSelection) {
        input.dataset.selectedIcao = item.dataset.icao || parseAirportCode(item.dataset.value);
      }
      input.dataset.confirmedAirport = normalizeSearch(input.value);
      closeAirportSuggestions();
      updateRouteAirportClearButtons();
      updateRouteChartTitles();
      updateRouteLineOnMap();
      loadOriginRunways();
      loadSidOptions();
      loadDestinationRunways();
      loadStarOptions();
      loadIacOptions();
    });
  });

  originAirportInput?.addEventListener("input", () => {
    updateRouteChartTitles();
    updateRouteLineOnMap();
    loadOriginRunways();
    loadSidOptions();
    updateRouteAirportClearButtons();
  });
  destinationAirportInput?.addEventListener("input", () => {
    updateRouteChartTitles();
    updateRouteLineOnMap();
    loadDestinationRunways();
    loadStarOptions();
    loadIacOptions();
    updateRouteAirportClearButtons();
  });
  customAirportInput?.addEventListener("input", updateRouteChartTitles);

  document.addEventListener("click", (event) => {
    if (!event.target.closest(".airport-combobox")) {
      closeAirportSuggestions();
    }
  });
}

function renderSkpeProcedures(data) {
  skpeCount.textContent = String(data.procedureCount).padStart(2, "0");
  skpeRows.innerHTML = data.procedures
    .map((procedure) => {
      const legs = procedure.legs
        .filter((leg) => leg.fix && leg.fix !== "0")
        .slice(0, 4)
        .map((leg) => {
          const coordinate =
            leg.latitude === null || leg.longitude === null
              ? ""
              : ` ${formatCoordinate(leg.latitude)}, ${formatCoordinate(leg.longitude)}`;
          return `<span><code>${leg.legType}</code> ${leg.fix || "-"}${coordinate}</span>`;
        })
        .join("");

      return `
        <div class="procedure-row">
          <code>${procedure.type}</code>
          <span>${procedure.name}</span>
          <span>${procedure.runwayOrTransition}</span>
          <div class="leg-stack">${legs}</div>
        </div>
      `;
    })
    .join("");
}

function loadOriginRunways() {
  if (!originRunwaySelect) return;
  const airport = getAirportForPanel("origin");
  if (!airport || !airport.runways?.length) {
    originRunwaySelect.innerHTML = `<option value="">Seleccione pista</option>`;
    return;
  }
  originRunwaySelect.innerHTML = `
    <option value="">Seleccione pista</option>
    ${airport.runways.map((rwy) => `<option value="${rwy}">${rwy}</option>`).join("")}
  `;
}

function loadDestinationRunways() {
  if (!destinationRunwaySelect) return;
  const airport = getAirportForPanel("destination");
  if (!airport || !airport.runways?.length) {
    destinationRunwaySelect.innerHTML = `<option value="">Seleccione pista</option>`;
    return;
  }
  destinationRunwaySelect.innerHTML = `
    <option value="">Seleccione pista</option>
    ${airport.runways.map((rwy) => `<option value="${rwy}">${rwy}</option>`).join("")}
  `;
}

async function loadStarOptions() {
  if (!starProcedureSelect) return;
  const airport = getAirportForPanel("destination");
  if (!airport) {
    starProcedureSelect.innerHTML = `<option value="">Selecciona primero un destino</option>`;
    return;
  }
  try {
    const index = await getChartIndex("STAR", airport.icao);
    renderStarOptions(index, airport.icao);
  } catch {
    starProcedureSelect.innerHTML = `<option value="">Sin llegada disponible para ${airport.icao}</option>`;
  }
}

function renderStarOptions(index, icao) {
  if (!starProcedureSelect) return;
  const previousValue = starProcedureSelect.value;
  const procedures = getProcedureCards(index);
  if (!procedures.length) {
    starProcedureSelect.innerHTML = `<option value="">Sin llegada disponible para ${icao}</option>`;
    return;
  }
  starProcedureSelect.innerHTML = `
    <option value="">Seleccione una llegada</option>
    <option value="NO_STAR">Sin llegada</option>
    ${groupProcedureOptions(procedures).map((p) => `<option value="${p.code}">${formatProcedureOption(p)}</option>`).join("")}
  `;
  if (previousValue && Array.from(starProcedureSelect.options).some((option) => option.value === previousValue)) {
    starProcedureSelect.value = previousValue;
  }
}

function renderSidOptions(index) {
  if (!sidProcedureSelect) {
    return;
  }

  const previousValue = sidProcedureSelect.value;
  const procedures = getProcedureCards(index);

  if (!procedures.length) {
    sidProcedureSelect.innerHTML = `<option>Sin salida disponible</option>`;
    return;
  }

  sidProcedureSelect.innerHTML = `
    <option value="">Seleccione una salida</option>
    <option value="NO_SID">Sin salida</option>
    ${groupProcedureOptions(procedures)
      .map(
        (procedure) =>
          `<option value="${procedure.code}">${formatProcedureOption(procedure)}</option>`,
      )
      .join("")}
  `;
  if (previousValue && Array.from(sidProcedureSelect.options).some((option) => option.value === previousValue)) {
    sidProcedureSelect.value = previousValue;
  }
}

async function loadWaypoints() {
  try {
    const waypoints = await fetchJson("storage/metadata/waypoints-colombia.json");
    allWaypoints = waypoints;
    renderWaypoints(waypoints);
  } catch (error) {
    if (waypointCount) waypointCount.textContent = "ERR";
    if (waypointRows) waypointRows.innerHTML = `
      <div class="waypoint-row">
        <code>NO DATA</code>
        <span>Archivo no disponible</span>
        <span>Ver storage/metadata</span>
      </div>
    `;
  }
}

async function loadNavaids() {
  try {
    allNavaids = await fetchJson("storage/metadata/navaids-colombia.json");
  } catch (error) {
    allNavaids = [];
    console.error("Error cargando radio ayudas:", error);
  }
}

async function loadAirports() {
  try {
    const airports = await fetchJson("storage/metadata/airports-colombia-runways.json");
    renderAirports(airports);
  } catch (error) {
    if (routeAirportStatus) {
      routeAirportStatus.textContent = "ERR";
    }

    if (airportCount) airportCount.textContent = "ERR";
    if (airportRows) airportRows.innerHTML = `
      <div class="airport-row">
        <code>NO DATA</code>
        <span>Archivo no disponible</span>
        <span>Ver storage/metadata</span>
        <span>-</span>
        <span>-</span>
      </div>
    `;
  }
}

async function loadSkpeProcedures() {
  if (!skpeRows || !skpeCount) {
    return;
  }

  try {
    const data = await fetchJson("storage/metadata/proc-skpe.json");
    renderSkpeProcedures(data);
  } catch (error) {
    skpeCount.textContent = "ERR";
    skpeRows.innerHTML = `
      <div class="procedure-row">
        <code>SKPE</code>
        <span>Archivo no disponible</span>
        <span>-</span>
        <div class="leg-stack"><span>Ver storage/metadata/Proc/SKPE.txt</span></div>
      </div>
    `;
  }
}

async function loadIacOptions() {
  if (!iacProcedureSelect) return;
  const airport = getAirportForPanel("destination");
  if (!airport) {
    iacProcedureSelect.innerHTML = `<option value="">Seleccione primero un aeropuerto de destino</option>`;
    return;
  }
  try {
    const index = await getChartIndex("IAC", airport.icao);
    const procedures = uniqueByProcedureIdentity(getProcedureCards(index));
    if (!procedures.length) {
      iacProcedureSelect.innerHTML = `<option value="">Sin aproximacion disponible para ${airport.icao}</option>`;
      return;
    }
    iacProcedureSelect.innerHTML = `
      <option value="">Seleccione una aproximacion</option>
      <option value="NO_IAC">Sin aproximacion</option>
      ${procedures.map((p) => `<option value="${p.code}">${p.name}${p.runway ? ` / ${p.runway}` : ""}</option>`).join("")}
    `;
  } catch {
    iacProcedureSelect.innerHTML = `<option value="">Sin aproximacion disponible para ${airport.icao}</option>`;
  }
}

async function loadSidOptions() {
  if (!sidProcedureSelect) {
    return;
  }

  const airport = getAirportForPanel("origin");

  if (!airport) {
    sidProcedureSelect.innerHTML = `<option>Selecciona primero un origen</option>`;
    return;
  }

  try {
    const index = await getChartIndex("SID", airport.icao);
    renderSidOptions(index);
  } catch (error) {
    sidProcedureSelect.innerHTML = `<option>Sin salida disponible para ${airport?.icao ?? "este aeropuerto"}</option>`;
  }
}

setupAirportSearch();
setupChartButtons();
setupChartPreview();
setupEnrouteCharts();
const waypointsReady = loadWaypoints();
const navaidsReady = loadNavaids();
const airportsReady = loadAirports();
loadEnrouteCharts();
loadSkpeProcedures();
loadSidOptions();
loadStarOptions();
loadIacOptions();
initDashboardMap(airportsReady, waypointsReady, navaidsReady);

function setupWaypointInput() {
  const input = document.querySelector("#routeWaypointsInput");
  const drop = document.querySelector("#waypointSuggestions");
  const tagsBox = document.querySelector("#waypointTags");

  if (!input || !drop || !tagsBox) return;

  function renderTags() {
    tagsBox.innerHTML = routeWaypoints
      .map(
        (name, i) => `
        <span class="waypoint-tag">
          <small>${String(i + 1).padStart(2, "0")}</small>
          ${name}
          <button type="button" data-index="${i}" aria-label="Quitar ${name}">&times;</button>
        </span>
      `,
      )
      .join("");
  }

  function addWaypoint(name) {
    const normalizedName = normalizeFixName(name);
    const fixExists = Boolean(getRouteFixByName(normalizedName));
    if (!normalizedName || !fixExists) return;

    routeWaypoints = [...routeWaypoints, normalizedName];
    renderTags();
    updateRouteLineOnMap();
    updateRouteSummaryWaypoints();
    input.value = "";
    input.focus();
  }

  function removeWaypoint(index) {
    routeWaypoints = routeWaypoints.filter((_, i) => i !== index);
    renderTags();
    updateRouteLineOnMap();
    updateRouteSummaryWaypoints();
  }

  function closeDrop() {
    drop.classList.remove("is-open");
    drop.innerHTML = "";
  }

  function showSuggestions(token) {
    const query = token.trim().toUpperCase();
    if (query.length < 2) { closeDrop(); return; }

    const waypointMatches = allWaypoints
      .filter((w) => normalizeFixName(w.name).startsWith(query))
      .map((w) => ({
        name: w.name,
        type: "Waypoint",
        latitude: w.latitude,
        longitude: w.longitude,
        detail: w.region ? `Region ${w.region}` : "",
      }));
    const navaidMatches = allNavaids
      .filter((n) => normalizeFixName(n.shortName).startsWith(query))
      .filter((n) => n.coordinates?.latitude != null && n.coordinates?.longitude != null)
      .map((n) => ({
        name: n.shortName,
        type: "Radio ayuda",
        latitude: n.coordinates?.latitude,
        longitude: n.coordinates?.longitude,
        detail: [n.longName, n.frequency].filter(Boolean).join(" / "),
      }));
    const matches = [...waypointMatches, ...navaidMatches]
      .slice(0, 10);

    if (!matches.length) { closeDrop(); return; }

    drop.innerHTML = matches
      .map(
        (w) => `
        <button class="waypoint-drop-item" type="button" data-name="${w.name}">
          <code>${w.name}</code>
          <span>${w.type} · ${Number(w.latitude).toFixed(4)}, ${Number(w.longitude).toFixed(4)}${w.detail ? ` · ${w.detail}` : ""}</span>
        </button>
      `,
      )
      .join("");
    drop.classList.add("is-open");
  }

  input.addEventListener("input", () => showSuggestions(input.value));

  input.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeDrop();
    if (e.key === "Backspace" && input.value === "" && routeWaypoints.length) {
      removeWaypoint(routeWaypoints.length - 1);
    }
  });

  drop.addEventListener("click", (e) => {
    const item = e.target.closest(".waypoint-drop-item");
    if (!item) return;
    addWaypoint(item.dataset.name);
    closeDrop();
  });

  tagsBox.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-index]");
    if (!btn) return;
    removeWaypoint(Number(btn.dataset.index));
  });

  document.addEventListener("click", (e) => {
    if (!e.target.closest(".waypoint-input-wrap") && !e.target.closest("#waypointTags")) {
      closeDrop();
    }
  });
}

setupWaypointInput();
setupCreateRouteBtn();
setupClearRouteBtn();
setupCustomScrollStrip();

function setupClearRouteBtn() {
  const btn = document.getElementById("clearRouteBtn");
  if (!btn) return;

  btn.addEventListener("click", () => {
    // Clear all airport inputs
    [originAirportInput, destinationAirportInput].forEach((input) => {
      if (input) { input.value = ""; input.dispatchEvent(new Event("input")); }
    });
    document.querySelectorAll(".airport-search-input[data-route-role='alterno1'], .airport-search-input[data-route-role='alterno2']").forEach((input) => {
      input.value = "";
    });
    // Reset all airport-combobox inputs in the route panel (catches alternos too)
    document.querySelectorAll(".flight-airports-panel .airport-search-input").forEach((input) => {
      input.value = "";
    });

    // Reset selects
    ["originRunwaySelect", "sidProcedureSelect", "destinationRunwaySelect", "starProcedureSelect", "iacProcedureSelect"].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.selectedIndex = 0;
    });

    // Clear waypoints
    routeWaypoints = [];
    const tagsBox = document.querySelector("#waypointTags");
    if (tagsBox) tagsBox.innerHTML = "";
    const wpInput = document.querySelector("#routeWaypointsInput");
    if (wpInput) wpInput.value = "";

    // Hide route summary panel
    const panel = document.getElementById("routeSummaryPanel");
    if (panel) panel.classList.add("hidden-panel");

    // Clear map line
    updateRouteLineOnMap();

    closeAirportSuggestions();
    updateRouteChartTitles();
  });
}

function setupCustomScrollStrip() {
  const inner = document.getElementById("chartCustomInner");
  const strip = document.getElementById("chartScrollStrip");
  const stripInner = document.getElementById("chartScrollStripInner");
  if (!inner || !strip || !stripInner) return;

  function constrainInnerHeight() {
    const card = inner.closest(".chart-custom-card");
    if (!card) return;
    const moduleHead = card.querySelector(".module-head");
    const cardStyle = getComputedStyle(card);
    const paddingTop = parseFloat(cardStyle.paddingTop) || 0;
    const paddingBottom = parseFloat(cardStyle.paddingBottom) || 0;
    const moduleHeadH = moduleHead ? moduleHead.offsetHeight : 0;
    const available = card.clientHeight - moduleHeadH - paddingTop - paddingBottom;
    if (available > 60) {
      inner.style.height = available + "px";
      inner.style.overflow = "hidden";
      inner.style.overflowY = "scroll";
    }
    updateStripHeight();
  }

  function updateStripHeight() {
    stripInner.style.height = inner.scrollHeight + "px";
  }

  strip.addEventListener("scroll", () => {
    inner.scrollTop = strip.scrollTop;
  });

  inner.addEventListener("scroll", () => {
    if (Math.abs(strip.scrollTop - inner.scrollTop) > 1) {
      strip.scrollTop = inner.scrollTop;
    }
  });

  const mutationObs = new MutationObserver(() => {
    updateStripHeight();
  });
  mutationObs.observe(inner, { childList: true, subtree: true });

  const resizeObs = new ResizeObserver(constrainInnerHeight);
  resizeObs.observe(inner.closest(".chart-custom-card") || inner);

  constrainInnerHeight();
}

function setupCreateRouteBtn() {
  const btn = document.getElementById("createRouteBtn");
  const panel = document.getElementById("routeSummaryPanel");
  if (!btn || !panel) return;

  btn.addEventListener("click", () => {
    const originIcao = getSelectedAirportCode(originAirportInput);
    const destIcao = getSelectedAirportCode(destinationAirportInput);
    const originAirport = colombianAirports.find((a) => a.icao === originIcao);
    const destAirport   = colombianAirports.find((a) => a.icao === destIcao);

    const originRwy = originRunwaySelect?.value || "";
    const sid       = sidProcedureSelect?.value || "";
    const star      = starProcedureSelect?.value || "";
    const destRwy   = destinationRunwaySelect?.value || "";
    const iac       = iacProcedureSelect?.value || "";
    const waypoints = [...routeWaypoints];

    const routeParts = [];
    if (originIcao) routeParts.push(originIcao + (originRwy ? `/${originRwy}` : ""));
    if (sid && sid !== "NO_SID") routeParts.push(sid);
    routeParts.push(...waypoints);
    if (star && star !== "NO_STAR") routeParts.push(star);
    if (destIcao) routeParts.push(destIcao + (destRwy ? `/${destRwy}` : ""));
    if (iac && iac !== "NO_IAC") routeParts.push(iac);

    panel.querySelector(".route-string").textContent = routeParts.join(" — ");

    const fmt = (v, fallback = "NO_SID NO_STAR NO_IAC".includes(v) ? null : v) => fallback || "—";

    panel.querySelector(".route-details").innerHTML = `
      <div class="rsum-item"><span>Origen</span><strong>${originAirport ? `${originAirport.icao} — ${originAirport.name}` : "—"}</strong></div>
      <div class="rsum-item"><span>Pista salida</span><strong>${originRwy || "—"}</strong></div>
      <div class="rsum-item"><span>SID</span><strong>${sid && sid !== "NO_SID" ? sid : "—"}</strong></div>
      <div class="rsum-item"><span>Waypoints</span><strong>${waypoints.length ? waypoints.join(" — ") : "—"}</strong></div>
      <div class="rsum-item"><span>STAR</span><strong>${star && star !== "NO_STAR" ? star : "—"}</strong></div>
      <div class="rsum-item"><span>Pista llegada</span><strong>${destRwy || "—"}</strong></div>
      <div class="rsum-item"><span>IAC / Aprox.</span><strong>${iac && iac !== "NO_IAC" ? iac : "—"}</strong></div>
      <div class="rsum-item"><span>Destino</span><strong>${destAirport ? `${destAirport.icao} — ${destAirport.name}` : "—"}</strong></div>
    `;

    panel.classList.remove("hidden-panel");
    panel.scrollIntoView({ behavior: "smooth", block: "nearest" });
  });

  panel.querySelector(".route-summary-close")?.addEventListener("click", () => {
    panel.classList.add("hidden-panel");
  });
}

function initDashboardMap(airportsReady, waypointsReady, navaidsReady) {
  const container = document.getElementById("dashMapContainer");
  if (!container || typeof maplibregl === "undefined") return;

  const DASH_STYLES = {
    liberty:   "https://tiles.openfreemap.org/styles/liberty",
    dark:      "https://tiles.openfreemap.org/styles/dark",
    satellite: {
      version: 8,
      glyphs: "https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf",
      sources: {
        "esri-sat": {
          type: "raster",
          tiles: ["https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"],
          tileSize: 256,
          maxzoom: 19,
          attribution: "Tiles &copy; Esri &mdash; Esri, DigitalGlobe, GeoEye, Earthstar Geographics, CNES/Airbus DS, USDA, USGS, AeroGRID, IGN",
        },
      },
      layers: [{ id: "sat-tiles", type: "raster", source: "esri-sat" }],
    },
  };

  const dashMap = new maplibregl.Map({
    container,
    style: DASH_STYLES.liberty,
    center: [-74.2973, 4.5709],
    zoom: 5.5,
    attributionControl: true,
  });
  dashMapInstance = dashMap;

  dashMap.addControl(new maplibregl.NavigationControl(), "top-right");
  dashMap.addControl(new maplibregl.ScaleControl({ unit: "metric" }), "bottom-left");

  // GeoJSON cache — populated once, reused on every style switch
  let normalWpGeoJSON = null;
  let gpsWpGeoJSON    = null;
  let airportGeoJSON  = null;
  let navaidGeoJSON   = null;

  const LAYER_GROUPS = {
    dashToggleAirports:    ["dash-airports-dot",     "dash-airports-label"],
    dashToggleWaypoints:   ["dash-waypoints-dot",    "dash-waypoints-label"],
    dashToggleGpsWaypoints:["dash-gps-waypoints-dot","dash-gps-waypoints-label"],
    dashToggleNavaids:     ["dash-navaids-dot",      "dash-navaids-label"],
  };

  function layerVisible(btnId) {
    return document.getElementById(btnId)?.classList.contains("is-active") ?? true;
  }

  function addDotAndLabel(sourceId, dotId, labelId, color, toggleId = "dashToggleWaypoints") {
    dashMap.addLayer({
      id: dotId, type: "circle", source: sourceId,
      layout: { "visibility": layerVisible(toggleId) ? "visible" : "none" },
      paint: {
        "circle-radius": ["interpolate", ["linear"], ["zoom"], 4, 2, 10, 4],
        "circle-color": color,
        "circle-opacity": 0.85,
      },
    });
    dashMap.addLayer({
      id: labelId, type: "symbol", source: sourceId,
      minzoom: 7,
      layout: {
        "text-field": ["get", "name"],
        "text-size": 10,
        "text-offset": [0, 1],
        "text-anchor": "top",
        "text-allow-overlap": false,
        "visibility": layerVisible(toggleId) ? "visible" : "none",
      },
      paint: { "text-color": color, "text-halo-color": "#020617", "text-halo-width": 1.2 },
    });
  }

  function addAllDashLayers() {
    if (!normalWpGeoJSON) return;

    dashMap.addSource("dash-waypoints",     { type: "geojson", data: normalWpGeoJSON });
    dashMap.addSource("dash-gps-waypoints", { type: "geojson", data: gpsWpGeoJSON });
    dashMap.addSource("dash-navaids",       { type: "geojson", data: navaidGeoJSON });
    addDotAndLabel("dash-waypoints",     "dash-waypoints-dot",     "dash-waypoints-label",     "#67e8f9", "dashToggleWaypoints");
    addDotAndLabel("dash-gps-waypoints", "dash-gps-waypoints-dot", "dash-gps-waypoints-label", "#34d399", "dashToggleGpsWaypoints");
    addDotAndLabel("dash-navaids",       "dash-navaids-dot",       "dash-navaids-label",       "#a3e635", "dashToggleNavaids");

    dashMap.addSource("dash-airports", { type: "geojson", data: airportGeoJSON });
    dashMap.addLayer({
      id: "dash-airports-dot", type: "circle", source: "dash-airports",
      layout: { "visibility": layerVisible("dashToggleAirports") ? "visible" : "none" },
      paint: {
        "circle-radius": ["interpolate", ["linear"], ["zoom"], 4, 5, 12, 10],
        "circle-color": "#fbbf24",
        "circle-stroke-width": 1.5,
        "circle-stroke-color": "#020617",
      },
    });
    dashMap.addLayer({
      id: "dash-airports-label", type: "symbol", source: "dash-airports",
      minzoom: 6,
      layout: {
        "text-field": ["get", "icao"],
        "text-size": 10,
        "text-offset": [0, 1.4],
        "text-anchor": "top",
        "text-allow-overlap": false,
        "visibility": layerVisible("dashToggleAirports") ? "visible" : "none",
      },
      paint: { "text-color": "#fbbf24", "text-halo-color": "#020617", "text-halo-width": 1.5 },
    });

  }

  function addRouteLine() {
    ensureRouteLineLayer();
    dashMap.getSource("route-line")?.setData(routeLineGeoJSON);
  }

  // Re-add layers on every style switch (and initial load)
  dashMap.on("style.load", () => {
    addAllDashLayers();
    addRouteLine();
  });

  // One-time setup after data is ready
  Promise.all([airportsReady, waypointsReady, navaidsReady]).then(() => {
    const normalWaypoints = allWaypoints.filter((w) => /^[A-Za-z]+$/.test(w.name));
    const gpsWaypoints    = allWaypoints.filter((w) => /\d/.test(w.name));

    const toGeoJSON = (list, propsFn) => ({
      type: "FeatureCollection",
      features: list.map((item) => ({
        type: "Feature",
        geometry: { type: "Point", coordinates: [item.longitude, item.latitude] },
        properties: propsFn(item),
      })),
    });

    normalWpGeoJSON = toGeoJSON(normalWaypoints, (w) => ({ name: w.name }));
    gpsWpGeoJSON    = toGeoJSON(gpsWaypoints,    (w) => ({ name: w.name }));
    airportGeoJSON  = toGeoJSON(colombianAirports, (a) => ({
      icao: a.icao, name: a.name, runways: (a.runways || []).join(", "),
    }));
    navaidGeoJSON = {
      type: "FeatureCollection",
      features: allNavaids
        .filter((n) => n.coordinates?.latitude != null && n.coordinates?.longitude != null)
        .map((n) => ({
          type: "Feature",
          geometry: { type: "Point", coordinates: [n.coordinates.longitude, n.coordinates.latitude] },
          properties: {
            name: n.shortName,
            longName: n.longName,
            frequency: n.frequency,
            elevationFt: n.elevationFt,
            region: n.region,
          },
        })),
    };

    if (dashMap.isStyleLoaded()) {
      addAllDashLayers();
      updateRouteLineOnMap();
    }

    // Popup
    const popup = new maplibregl.Popup({ closeButton: true, maxWidth: "220px" });
    dashMap.on("click", "dash-airports-dot", (e) => {
      const p = e.features[0].properties;
      popup
        .setLngLat(e.features[0].geometry.coordinates.slice())
        .setHTML(`<div class="ifr-popup-inner"><code>${p.icao}</code><strong>${p.name}</strong>${p.runways ? `<span>RWY: ${p.runways}</span>` : ""}</div>`)
        .addTo(dashMap);
    });
    dashMap.on("click", "dash-navaids-dot", (e) => {
      const p = e.features[0].properties;
      popup
        .setLngLat(e.features[0].geometry.coordinates.slice())
        .setHTML(
          `<div class="ifr-popup-inner">
            <code>${p.name}</code>
            <strong>${p.longName}</strong>
            ${p.frequency ? `<span>Frecuencia: ${p.frequency}</span>` : ""}
            ${p.elevationFt ? `<span>Elevacion: ${p.elevationFt} ft</span>` : ""}
            ${p.region ? `<span>Region ${p.region}</span>` : ""}
          </div>`,
        )
        .addTo(dashMap);
    });
    ["dash-airports-dot", "dash-waypoints-dot", "dash-gps-waypoints-dot", "dash-navaids-dot"].forEach((layer) => {
      dashMap.on("mouseenter", layer, () => { dashMap.getCanvas().style.cursor = "pointer"; });
      dashMap.on("mouseleave", layer, () => { dashMap.getCanvas().style.cursor = ""; });
    });

    // Layer toggles
    Object.entries(LAYER_GROUPS).forEach(([btnId, layerIds]) => {
      document.getElementById(btnId)?.addEventListener("click", function () {
        const active = this.classList.toggle("is-active");
        layerIds.forEach((id) => {
          if (dashMap.getLayer(id)) dashMap.setLayoutProperty(id, "visibility", active ? "visible" : "none");
        });
      });
    });

    // Style switcher
    document.querySelectorAll("[data-dash-style]").forEach((btn) => {
      btn.addEventListener("click", function () {
        document.querySelectorAll("[data-dash-style]").forEach((b) => b.classList.remove("is-active"));
        this.classList.add("is-active");
        dashMap.setStyle(DASH_STYLES[this.dataset.dashStyle]);
      });
    });

    // Counts + status
    const airportCountEl     = document.getElementById("dashAirportCount");
    const waypointCountEl    = document.getElementById("dashWaypointCount");
    const gpsWaypointCountEl = document.getElementById("dashGpsWaypointCount");
    const navaidCountEl      = document.getElementById("dashNavaidCount");
    if (airportCountEl)     airportCountEl.textContent     = String(colombianAirports.length).padStart(3, "0");
    if (waypointCountEl)    waypointCountEl.textContent    = String(normalWaypoints.length).padStart(4, "0");
    if (gpsWaypointCountEl) gpsWaypointCountEl.textContent = String(gpsWaypoints.length).padStart(4, "0");
    if (navaidCountEl)      navaidCountEl.textContent      = String(allNavaids.length).padStart(3, "0");
    const statusEl = document.getElementById("dashMapStatus");
    if (statusEl) { statusEl.textContent = "OK"; statusEl.className = "chip ok"; }

  }).catch((err) => {
    console.error("Error en mapa dashboard:", err);
    const statusEl = document.getElementById("dashMapStatus");
    if (statusEl) { statusEl.textContent = "ERR"; statusEl.className = "chip warn"; }
  });
}

document.querySelector("#customSearchClear")?.addEventListener("click", () => {
  if (customAirportInput) {
    customAirportInput.value = "";
    customAirportInput.dispatchEvent(new Event("input"));
  }
  closeAirportSuggestions();
  document.querySelectorAll('[data-chart-panel="custom"]').forEach((btn) => btn.classList.remove("is-active"));
  if (customChartResults) customChartResults.innerHTML = "";
  if (customChartPreview) {
    customChartPreview.classList.add("hidden-panel");
    if (customPreviewFrame) customPreviewFrame.src = "";
  }
  updateRouteChartTitles();
});

function resetRouteSummaryIfIncomplete() {
  if (getSelectedAirportCode(originAirportInput) && getSelectedAirportCode(destinationAirportInput)) {
    return;
  }

  document.getElementById("routeSummaryPanel")?.classList.add("hidden-panel");
}

function resetOriginFields() {
  if (originRunwaySelect) {
    originRunwaySelect.innerHTML = `<option value="">Seleccione pista</option>`;
  }
  if (sidProcedureSelect) {
    sidProcedureSelect.innerHTML = `<option>Selecciona primero un origen</option>`;
  }
}

function resetDestinationFields() {
  if (destinationRunwaySelect) {
    destinationRunwaySelect.innerHTML = `<option value="">Seleccione pista</option>`;
  }
  if (starProcedureSelect) {
    starProcedureSelect.innerHTML = `<option value="">Selecciona primero un destino</option>`;
  }
  if (iacProcedureSelect) {
    iacProcedureSelect.innerHTML = `<option value="">Seleccione primero un aeropuerto de destino</option>`;
  }
}

function clearRouteAirport(role) {
  const isOrigin = role === "origin";
  const input = isOrigin ? originAirportInput : destinationAirportInput;

  if (!input) return;

  input.value = "";
  delete input.dataset.confirmedAirport;
  delete input.dataset.selectedIcao;
  input.dispatchEvent(new Event("input"));
  closeAirportSuggestions();
  updateRouteAirportClearButtons();

  if (isOrigin) {
    resetOriginFields();
    if (originChartResults) originChartResults.innerHTML = "";
    hideChartPreview("origin");
    document.querySelectorAll('[data-chart-panel="origin"]').forEach((btn) => btn.classList.remove("is-active"));
  } else {
    resetDestinationFields();
    if (destinationChartResults) destinationChartResults.innerHTML = "";
    hideChartPreview("destination");
    document.querySelectorAll('[data-chart-panel="destination"]').forEach((btn) => btn.classList.remove("is-active"));
  }

  updateRouteLineOnMap();
  updateRouteChartTitles();
  resetRouteSummaryIfIncomplete();
}

originAirportClear?.addEventListener("click", () => clearRouteAirport("origin"));
destinationAirportClear?.addEventListener("click", () => clearRouteAirport("destination"));

function clearAlternateAirport(input) {
  if (!input) return;
  input.value = "";
  delete input.dataset.confirmedAirport;
  closeAirportSuggestions();
  updateRouteAirportClearButtons();
}

alternateOneClear?.addEventListener("click", () => clearAlternateAirport(alternateOneInput));
alternateTwoClear?.addEventListener("click", () => clearAlternateAirport(alternateTwoInput));

updateRouteAirportClearButtons();
