const state = {
  rows: [],
  dictionaries: {},
  charts: {},
  filters: {
    anio: '',
    mes: '',
    pais: '',
    commodity: '',
    puertoDestino: '',
    puertoEcuador: '',
    empresaEcuador: '',
    forwarderOrigen: '',
  }
};

const dictionaryFiles = {
  empresa_ecuador_id: 'empresa_ecuador.json',
  pais_destino_id: 'pais_destino.json',
  commodity_id: 'commodity.json',
  puerto_destino_id: 'puerto_destino.json',
  puerto_ecuador_id: 'puerto_ecuador.json',
  freight_forwarder_origen_id: 'freight_forwarder_origen.json',
};

const els = {
  loadingStatus: document.getElementById('loadingStatus'),
  activeFiltersLabel: document.getElementById('activeFiltersLabel'),
  topEmpresasBody: document.getElementById('topEmpresasBody'),
  kpiTeus: document.getElementById('kpiTeus'),
  kpiCont: document.getElementById('kpiCont'),
  kpi20: document.getElementById('kpi20'),
  kpi40: document.getElementById('kpi40'),
  kpiEmpresas: document.getElementById('kpiEmpresas'),
  kpiPaises: document.getElementById('kpiPaises'),
  filterAnio: document.getElementById('filterAnio'),
  filterMes: document.getElementById('filterMes'),
  filterPais: document.getElementById('filterPais'),
  filterCommodity: document.getElementById('filterCommodity'),
  filterPuertoDestino: document.getElementById('filterPuertoDestino'),
  filterPuertoEcuador: document.getElementById('filterPuertoEcuador'),
  filterEmpresaEcuador: document.getElementById('filterEmpresaEcuador'),
  filterForwarderOrigen: document.getElementById('filterForwarderOrigen'),
  resetFiltersBtn: document.getElementById('resetFiltersBtn'),
};

function formatNumber(value, decimals = 0) {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: decimals, minimumFractionDigits: decimals }).format(value || 0);
}

function groupSum(rows, key, valueKey = 'teus_fcl', limit = 10) {
  const map = new Map();
  rows.forEach(row => {
    const label = row[key];
    if (!label) return;
    map.set(label, (map.get(label) || 0) + (Number(row[valueKey]) || 0));
  });
  return [...map.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, limit);
}

async function loadJson(path) {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`No se pudo cargar ${path}`);
  return response.json();
}

async function loadDictionaries() {
  const entries = await Promise.all(Object.entries(dictionaryFiles).map(async ([key, file]) => {
    const payload = await loadJson(`data/diccionarios/${file}`);
    const map = new Map(payload.map(item => [String(item.id), item.label]));
    return [key, map];
  }));
  state.dictionaries = Object.fromEntries(entries);
}

async function loadRows() {
  return new Promise((resolve, reject) => {
    Papa.parse('data/detalle/detalle_ids_q1_2026.csv', {
      download: true,
      header: true,
      skipEmptyLines: true,
      complete: results => {
        const rows = results.data.map(row => ({
          anio: Number(row.anio) || 0,
          mes: Number(row.mes) || 0,
          periodo: row.periodo,
          empresa_ecuador_id: normalizeId(row.empresa_ecuador_id),
          pais_destino_id: normalizeId(row.pais_destino_id),
          commodity_id: normalizeId(row.commodity_id),
          puerto_destino_id: normalizeId(row.puerto_destino_id),
          puerto_ecuador_id: normalizeId(row.puerto_ecuador_id),
          freight_forwarder_origen_id: normalizeId(row.freight_forwarder_origen_id),
          teus_fcl: Number(row.teus_fcl) || 0,
          cont: Number(row.cont) || 0,
          c20: Number(row.c20) || 0,
          c40: Number(row.c40) || 0,
        })).filter(row => row.anio > 0 && row.mes > 0);
        resolve(rows);
      },
      error: reject,
    });
  });
}

function normalizeId(value) {
  if (value === null || value === undefined || value === '') return '';
  return String(Math.trunc(Number(value)));
}

function decodeLabel(field, id) {
  return state.dictionaries[field]?.get(String(id)) || '';
}

function enrichRows(rows) {
  return rows.map(row => ({
    ...row,
    empresa_ecuador: decodeLabel('empresa_ecuador_id', row.empresa_ecuador_id),
    pais_destino: decodeLabel('pais_destino_id', row.pais_destino_id),
    commodity: decodeLabel('commodity_id', row.commodity_id),
    puerto_destino: decodeLabel('puerto_destino_id', row.puerto_destino_id),
    puerto_ecuador: decodeLabel('puerto_ecuador_id', row.puerto_ecuador_id),
    freight_forwarder_origen: decodeLabel('freight_forwarder_origen_id', row.freight_forwarder_origen_id),
  }));
}

function setOptions(selectEl, items, allLabel = 'Todos') {
  const current = selectEl.value;
  selectEl.innerHTML = '';
  const defaultOption = document.createElement('option');
  defaultOption.value = '';
  defaultOption.textContent = allLabel;
  selectEl.appendChild(defaultOption);

  items.forEach(item => {
    const option = document.createElement('option');
    option.value = item;
    option.textContent = item;
    selectEl.appendChild(option);
  });

  if ([...selectEl.options].some(option => option.value === current)) {
    selectEl.value = current;
  }
}

function populateFilters() {
  const rows = state.rows;
  setOptions(els.filterAnio, uniqueSorted(rows.map(r => r.anio)).map(String), 'Todos');
  setOptions(els.filterMes, uniqueSorted(rows.map(r => r.mes)).map(String), 'Todos');
  setOptions(els.filterPais, uniqueSorted(rows.map(r => r.pais_destino)), 'Todos');
  setOptions(els.filterCommodity, uniqueSorted(rows.map(r => r.commodity)), 'Todos');
  setOptions(els.filterPuertoDestino, uniqueSorted(rows.map(r => r.puerto_destino)), 'Todos');
  setOptions(els.filterPuertoEcuador, uniqueSorted(rows.map(r => r.puerto_ecuador)), 'Todos');
  setOptions(els.filterEmpresaEcuador, uniqueSorted(rows.map(r => r.empresa_ecuador)).slice(0, 4000), 'Todos');
  setOptions(els.filterForwarderOrigen, uniqueSorted(rows.map(r => r.freight_forwarder_origen)), 'Todos');
}

function uniqueSorted(values) {
  return [...new Set(values.filter(Boolean))].sort((a, b) => String(a).localeCompare(String(b), 'es'));
}

function getFilteredRows() {
  return state.rows.filter(row => {
    if (state.filters.anio && String(row.anio) !== state.filters.anio) return false;
    if (state.filters.mes && String(row.mes) !== state.filters.mes) return false;
    if (state.filters.pais && row.pais_destino !== state.filters.pais) return false;
    if (state.filters.commodity && row.commodity !== state.filters.commodity) return false;
    if (state.filters.puertoDestino && row.puerto_destino !== state.filters.puertoDestino) return false;
    if (state.filters.puertoEcuador && row.puerto_ecuador !== state.filters.puertoEcuador) return false;
    if (state.filters.empresaEcuador && row.empresa_ecuador !== state.filters.empresaEcuador) return false;
    if (state.filters.forwarderOrigen && row.freight_forwarder_origen !== state.filters.forwarderOrigen) return false;
    return true;
  });
}

function updateKPIs(rows) {
  const teus = rows.reduce((sum, row) => sum + row.teus_fcl, 0);
  const cont = rows.reduce((sum, row) => sum + row.cont, 0);
  const c20 = rows.reduce((sum, row) => sum + row.c20, 0);
  const c40 = rows.reduce((sum, row) => sum + row.c40, 0);
  const empresas = new Set(rows.map(r => r.empresa_ecuador).filter(Boolean)).size;
  const paises = new Set(rows.map(r => r.pais_destino).filter(Boolean)).size;

  els.kpiTeus.textContent = formatNumber(teus);
  els.kpiCont.textContent = formatNumber(cont);
  els.kpi20.textContent = formatNumber(c20);
  els.kpi40.textContent = formatNumber(c40);
  els.kpiEmpresas.textContent = formatNumber(empresas);
  els.kpiPaises.textContent = formatNumber(paises);
}

function updateTopTable(rows) {
  const top = groupSum(rows, 'empresa_ecuador', 'teus_fcl', 15);
  els.topEmpresasBody.innerHTML = top.map((item, index) => `
    <tr>
      <td>${index + 1}</td>
      <td>${item.label}</td>
      <td>${formatNumber(item.value)}</td>
    </tr>
  `).join('');
}

function buildSeries(rows) {
  const map = new Map();
  rows.forEach(row => {
    const key = `${row.anio}-${String(row.mes).padStart(2, '0')}`;
    map.set(key, (map.get(key) || 0) + row.teus_fcl);
  });
  return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([label, value]) => ({ label, value }));
}

function createOrUpdateChart(chartKey, ctxId, type, labels, data, label) {
  if (state.charts[chartKey]) {
    state.charts[chartKey].data.labels = labels;
    state.charts[chartKey].data.datasets[0].data = data;
    state.charts[chartKey].update();
    return;
  }

  const ctx = document.getElementById(ctxId);
  state.charts[chartKey] = new Chart(ctx, {
    type,
    data: {
      labels,
      datasets: [{
        label,
        data,
        borderColor: '#ff4a1c',
        backgroundColor: type === 'line' ? 'rgba(255, 74, 28, 0.15)' : 'rgba(255, 74, 28, 0.75)',
        tension: 0.25,
        fill: type === 'line',
        borderRadius: 8,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
      },
      scales: {
        y: { beginAtZero: true, ticks: { callback: value => formatNumber(value) } },
      }
    }
  });
}

function updateCharts(rows) {
  const series = buildSeries(rows);
  createOrUpdateChart('series', 'chartSeries', 'line', series.map(x => x.label), series.map(x => x.value), 'TEUs');

  const topPaises = groupSum(rows, 'pais_destino', 'teus_fcl', 10);
  createOrUpdateChart('paises', 'chartPaises', 'bar', topPaises.map(x => x.label), topPaises.map(x => x.value), 'TEUs');

  const topCommodities = groupSum(rows, 'commodity', 'teus_fcl', 10);
  createOrUpdateChart('commodities', 'chartCommodities', 'bar', topCommodities.map(x => x.label), topCommodities.map(x => x.value), 'TEUs');

  const topPuertos = groupSum(rows, 'puerto_destino', 'teus_fcl', 10);
  createOrUpdateChart('puertos', 'chartPuertos', 'bar', topPuertos.map(x => x.label), topPuertos.map(x => x.value), 'TEUs');
}

function updateActiveFiltersLabel() {
  const tags = [];
  Object.entries(state.filters).forEach(([key, value]) => {
    if (!value) return;
    tags.push(value);
  });
  els.activeFiltersLabel.textContent = tags.length ? tags.join(' • ') : 'Sin filtros';
}

function render() {
  const filteredRows = getFilteredRows();
  updateKPIs(filteredRows);
  updateCharts(filteredRows);
  updateTopTable(filteredRows);
  updateActiveFiltersLabel();
  els.loadingStatus.textContent = `Datos listos, ${formatNumber(filteredRows.length)} filas activas`;
}

function attachEvents() {
  els.filterAnio.addEventListener('change', e => { state.filters.anio = e.target.value; render(); });
  els.filterMes.addEventListener('change', e => { state.filters.mes = e.target.value; render(); });
  els.filterPais.addEventListener('change', e => { state.filters.pais = e.target.value; render(); });
  els.filterCommodity.addEventListener('change', e => { state.filters.commodity = e.target.value; render(); });
  els.filterPuertoDestino.addEventListener('change', e => { state.filters.puertoDestino = e.target.value; render(); });
  els.filterPuertoEcuador.addEventListener('change', e => { state.filters.puertoEcuador = e.target.value; render(); });
  els.filterEmpresaEcuador.addEventListener('change', e => { state.filters.empresaEcuador = e.target.value; render(); });
  els.filterForwarderOrigen.addEventListener('change', e => { state.filters.forwarderOrigen = e.target.value; render(); });
  els.resetFiltersBtn.addEventListener('click', () => {
    state.filters = {
      anio: '', mes: '', pais: '', commodity: '', puertoDestino: '', puertoEcuador: '', empresaEcuador: '', forwarderOrigen: '',
    };
    [
      els.filterAnio, els.filterMes, els.filterPais, els.filterCommodity,
      els.filterPuertoDestino, els.filterPuertoEcuador, els.filterEmpresaEcuador,
      els.filterForwarderOrigen,
    ].forEach(el => { el.value = ''; });
    render();
  });
}

async function init() {
  try {
    els.loadingStatus.textContent = 'Cargando diccionarios...';
    await loadDictionaries();
    els.loadingStatus.textContent = 'Cargando detalle optimizado...';
    const rows = await loadRows();
    state.rows = enrichRows(rows);
    populateFilters();
    attachEvents();
    render();
  } catch (error) {
    console.error(error);
    els.loadingStatus.textContent = 'Error cargando datos. Revisa rutas o consola.';
  }
}

init();
