const waypointRows = document.querySelector("#waypointRows");
const waypointCount = document.querySelector("#waypointCount");
const airportRows = document.querySelector("#airportRows");
const airportCount = document.querySelector("#airportCount");
const airportSearchInputs = document.querySelectorAll(".airport-search-input");
const routeAirportStatus = document.querySelector("#routeAirportStatus");
const sidProcedureSelect = document.querySelector("#sidProcedureSelect");
const originAirportInput = document.querySelector('[data-route-role="origin"]');
const destinationAirportInput = document.querySelector('[data-route-role="destination"]');
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
const skpeRows = document.querySelector("#skpeRows");
const skpeCount = document.querySelector("#skpeCount");
let colombianAirports = [];
const chartIndexes = {
  ADC: null,
  ENR: null,
  GMC: null,
  IAC: null,
  SID: null,
  STAR: null,
};

async function fetchJson(path) {
  const response = await fetch(path);

  if (!response.ok) {
    throw new Error(`No se pudo leer ${path}`);
  }

  const text = await response.text();
  return JSON.parse(text.replace(/^\uFEFF/, ""));
}

function formatCoordinate(value) {
  return Number(value).toFixed(6);
}

function renderWaypoints(waypoints) {
  const visibleWaypoints = waypoints.slice(0, 80);

  waypointCount.textContent = String(waypoints.length).padStart(4, "0");
  waypointRows.innerHTML = visibleWaypoints
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

  airportCount.textContent = String(airports.length).padStart(3, "0");
  airportRows.innerHTML = airports
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

function updateChartTitle(input, titleElement, codeElement, noteElement, fallbackTitle, fallbackCode, fallbackNote) {
  if (!input || !titleElement || !codeElement || !noteElement) {
    return;
  }

  const icao = parseAirportCode(input.value);
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
}

function getChartResultBox(panel) {
  return panel === "origin" ? originChartResults : destinationChartResults;
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

  return {
    preview: destinationChartPreview,
    title: destinationPreviewTitle,
    view: destinationPreviewView,
    download: destinationPreviewDownload,
    hide: destinationPreviewHide,
    frame: destinationPreviewFrame,
  };
}

function getAirportForPanel(panel) {
  const input = panel === "origin" ? originAirportInput : destinationAirportInput;
  const icao = parseAirportCode(input?.value || "");
  return colombianAirports.find((airport) => airport.icao === icao);
}

function renderUnavailableCharts(panel, message) {
  const box = getChartResultBox(panel);
  const preview = getChartPreviewElements(panel);

  if (!box) {
    return;
  }

  box.innerHTML = `<div class="chart-empty">${message}</div>`;
  preview.preview?.classList.add("hidden-panel");
}

function isNavigationProcedureChart(item) {
  const text = `${item.fileName} ${item.title} ${item.chartName}`.toUpperCase();
  return !text.includes("TABULAR DESCRIPTION") && item.isTabular !== true;
}

function getProcedureCards(index) {
  return index.items.filter(isNavigationProcedureChart).flatMap((item) => {
    if (item.procedures) {
      return item.procedures.map((procedure) => ({
        name: procedure.name,
        code: procedure.code,
        runway: item.runway,
        filePath: item.filePath,
      }));
    }

    return [
      {
        name: item.procedureName || item.chartName || item.title || item.fileName,
        code: item.chartType || item.procedureName || item.chartName,
        runway: item.runway,
        filePath: item.filePath,
      },
    ];
  });
}

function renderChartList(panel, chartType, index) {
  const box = getChartResultBox(panel);
  const airport = getAirportForPanel(panel);

  if (!box) {
    return;
  }

  if (!airport) {
    renderUnavailableCharts(panel, "Selecciona primero un aeropuerto.");
    return;
  }

  if (airport.icao !== index.airport) {
    renderUnavailableCharts(panel, `No hay ${chartType} indexadas para ${airport.icao}.`);
    return;
  }

  const procedureCards = getProcedureCards(index);

  if (!procedureCards.length) {
    renderUnavailableCharts(panel, `No hay cartas graficas ${chartType} disponibles.`);
    return;
  }

  box.innerHTML = procedureCards
    .map(
      (procedure) => {
        const detail = [procedure.code, procedure.runway].filter(Boolean).join(" / ");
        return `
        <button class="chart-result-item" type="button" data-panel="${panel}" data-title="${procedure.name}" data-file="${encodeURI(procedure.filePath)}">
          <strong>${procedure.name}</strong>
          <span>${detail}</span>
        </button>
      `;
      },
    )
    .join("");
}

async function getChartIndex(chartType) {
  if (chartIndexes[chartType]) {
    return chartIndexes[chartType];
  }

  const pathByType = {
    ADC: "storage/metadata/adc-pdf-index.json",
    ENR: "storage/metadata/enr-pdf-index.json",
    GMC: "storage/metadata/gmc-pdf-index.json",
    IAC: "storage/metadata/iac-pdf-index.json",
    SID: "storage/metadata/sid-pdf-index.json",
    STAR: "storage/metadata/star-pdf-index.json",
  };

  chartIndexes[chartType] = await fetchJson(pathByType[chartType]);
  return chartIndexes[chartType];
}

function setupChartButtons() {
  document.querySelectorAll("[data-chart-type]").forEach((button) => {
    button.addEventListener("click", async () => {
      const chartType = button.dataset.chartType;
      const panel = button.dataset.chartPanel;

      document
        .querySelectorAll(`[data-chart-panel="${panel}"]`)
        .forEach((item) => item.classList.remove("is-active"));
      button.classList.add("is-active");

      if (!["ADC", "ENR", "GMC", "IAC", "SID", "STAR"].includes(chartType)) {
        renderUnavailableCharts(panel, `${chartType} no esta indexada todavia.`);
        return;
      }

      try {
        const index = await getChartIndex(chartType);
        renderChartList(panel, chartType, index);
      } catch (error) {
        renderUnavailableCharts(panel, `No se pudo cargar ${chartType}.`);
      }
    });
  });
}

function setupChartPreview() {
  [
    getChartPreviewElements("origin"),
    getChartPreviewElements("destination"),
  ].forEach((preview) => {
    preview.hide?.addEventListener("click", () => {
      preview.preview?.classList.add("hidden-panel");
      if (preview.frame) {
        preview.frame.src = "";
      }
    });
  });

  document.addEventListener("click", (event) => {
    const item = event.target.closest(".chart-result-item");

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

function renderAirportSuggestions(input) {
  const box = input.parentElement.querySelector(".airport-suggestions");
  const matches = findAirportMatches(input.value);

  closeAirportSuggestions(box);

  if (normalizeSearch(input.value).length < 2) {
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
        <button class="airport-suggestion-item" type="button" data-value="${airport.icao} - ${airport.name}">
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
    input.addEventListener("input", () => renderAirportSuggestions(input));
    input.addEventListener("focus", () => renderAirportSuggestions(input));

    input.parentElement.addEventListener("click", (event) => {
      const item = event.target.closest(".airport-suggestion-item");

      if (!item) {
        return;
      }

      input.value = item.dataset.value;
      closeAirportSuggestions();
      updateRouteChartTitles();
    });
  });

  originAirportInput?.addEventListener("input", updateRouteChartTitles);
  destinationAirportInput?.addEventListener("input", updateRouteChartTitles);

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

function renderSidOptions(index) {
  if (!sidProcedureSelect) {
    return;
  }

  const procedures = getProcedureCards(index);

  if (!procedures.length) {
    sidProcedureSelect.innerHTML = `<option>Sin salida disponible</option>`;
    return;
  }

  sidProcedureSelect.innerHTML = `
    <option value="">Seleccione una salida</option>
    <option value="NO_SID">Sin salida</option>
    ${procedures
      .map(
        (procedure) =>
          `<option value="${procedure.code}">${procedure.name} [${procedure.code}] / ${procedure.runway}</option>`,
      )
      .join("")}
  `;
}

async function loadWaypoints() {
  try {
    const waypoints = await fetchJson("storage/metadata/waypoints-colombia.json");
    renderWaypoints(waypoints);
  } catch (error) {
    waypointCount.textContent = "ERR";
    waypointRows.innerHTML = `
      <div class="waypoint-row">
        <code>NO DATA</code>
        <span>Archivo no disponible</span>
        <span>Ver storage/metadata</span>
      </div>
    `;
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

    airportCount.textContent = "ERR";
    airportRows.innerHTML = `
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

async function loadSidOptions() {
  if (!sidProcedureSelect) {
    return;
  }

  try {
    const index = await fetchJson("storage/metadata/sid-pdf-index.json");
    renderSidOptions(index);
  } catch (error) {
    sidProcedureSelect.innerHTML = `<option>Sin salida disponible</option>`;
  }
}

setupAirportSearch();
setupChartButtons();
setupChartPreview();
loadWaypoints();
loadAirports();
loadSkpeProcedures();
loadSidOptions();
