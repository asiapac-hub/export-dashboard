const MONTHS_ES = {
  1: 'Enero',
  2: 'Febrero',
  3: 'Marzo',
  4: 'Abril',
  5: 'Mayo',
  6: 'Junio',
  7: 'Julio',
  8: 'Agosto',
  9: 'Septiembre',
  10: 'Octubre',
  11: 'Noviembre',
  12: 'Diciembre',
};

const FIELD_CONFIG = [
  { key: 'empresa_ecuador', label: 'EMPRESA ECUADOR', color: '#393E4D', defaultSelected: true },
  { key: 'empresa_exterior', label: 'EMPRESA EXTERIOR', color: '#FC4A1D', defaultSelected: false },
  { key: 'puerto_ecuador', label: 'PUERTO ECUADOR', color: '#585D6C', defaultSelected: false },
  { key: 'puerto_destino', label: 'PUERTO DESTINO', color: '#6C7488', defaultSelected: false },
  { key: 'pais_destino', label: 'PAÍS DESTINO', color: '#2F5D7C', defaultSelected: false },
  { key: 'commodity', label: 'COMMODITY', color: '#8D5A2B', defaultSelected: false },
  { key: 'empresa_transporte', label: 'EMPRESA DE TRANSPORTE', color: '#4E7B5C', defaultSelected: false },
  { key: 'freight_forwarder_destino', label: 'FREIGHT FORWARDER DESTINO', color: '#7C4D79', defaultSelected: false },
  { key: 'freight_forwarder_origen', label: 'FREIGHT FORWARDER ORIGEN', color: '#A0573A', defaultSelected: false },
];

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
    empresaTransporte: '',
    forwarderOrigen: '',
    refrigerada: '',
  },
  selectedFields: FIELD_CONFIG.filter(f => f.defaultSelected).map(f => f.key),
};

const dictionaryFiles = {
  empresa_ecuador_id: 'empresa_ecuador.json',
  empresa_exterior_id: 'empresa_exterior.json',
  pais_destino_id: 'pais_destino.json',
  commodity_id: 'commodity.json',
  puerto_destino_id: 'puerto_destino.json',
  puerto_ecuador_id: 'puerto_ecuador.json',
  empresa_transporte_id: 'empresa_transporte.json',
  freight_forwarder_destino_id: 'freight_forwarder_destino.json',
  freight_forwarder_origen_id: 'freight_forwarder_origen.json',
};

const els = {
  loadingStatus: document.getElementById('loadingStatus'),
  activeFiltersLabel: document.getElementById('activeFiltersLabel'),
  detailTableBody: document.getElementById('detailTableBody'),
  fieldPicker: document.getElementById('fieldPicker'),
  selectedFieldsList: document.getElementById('selectedFieldsList'),
  kpiTeus: document.getElementById('kpiTeus'),
  kpiCont: document.getElementById('kpiCont'),
  kpi20: document.getElementById('kpi20'),
  kpi40HC: document.getElementById('kpi40HC'),
  kpi40RF: document.getElementById('kpi40RF'),
  kpiEmpresas: document.getElementById('kpiEmpresas'),
  kpiPaises: document.getElementById('kpiPaises'),
  filterAnio: document.getElementById('filterAnio'),
  filterMes: document.getElementById('filterMes'),
  filterPais: document.getElementById('filterPais'),
  filterCommodity: document.getElementById('filterCommodity'),
  filterPuertoDestino: document.getElementById('filterPuertoDestino'),
  filterPuertoEcuador: document.getElementById('filterPuertoEcuador'),
  filterEmpresaEcuador: document.getElementById('filterEmpresaEcuador'),
  filterEmpresaTransporte: document.getElementById('filterEmpresaTransporte'),
  filterForwarderOrigen: document.getElementById('filterForwarderOrigen'),
  filterRefrigerada: document.getElementById('filterRefrigerada'),
  resetFiltersBtn: document.getElementById('resetFiltersBtn'),
};

function formatNumber(value, decimals = 0) {
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: decimals,
    minimumFractionDigits: decimals
  }).format(value || 0);
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
  const entries = await Promise.all(
    Object.entries(dictionaryFiles).map(async ([key, file]) => {
      const payload = await loadJson(`data/diccionarios/${file}`);
      const map = new Map(payload.map(item => [String(item.id), item.label]));
      return [key, map];
    })
  );
  state.dictionaries = Object.fromEntries(entries);
}

function normalizeId(value) {
  if (value === null || value === undefined || value === '') return '';
  return String(Math.trunc(Number(value)));
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
          empresa_exterior_id: normalizeId(row.empresa_exterior_id),
          puerto_ecuador_id: normalizeId(row.puerto_ecuador_id),
          puerto_destino_id: normalizeId(row.puerto_destino_id),
          pais_destino_id: normalizeId(row.pais_destino_id),
          commodity_id: normalizeId(row.commodity_id),
          empresa_transporte_id: normalizeId(row.empresa_transporte_id),
          freight_forwarder_destino_id: normalizeId(row.freight_forwarder_destino_id),
          freight_forwarder_origen_id: normalizeId(row.freight_forwarder_origen_id),
          teus_fcl: Number(row.teus_fcl) || 0,
          cont: Number(row.cont) || 0,
          c20: Number(row.c20) || 0,
          c40_total: Number(row.c40) || 0,
          c40rf: Number(row['40_ft_temp_cont']) || 0,
        })).filter(row => row.anio > 0 && row.mes > 0);

        rows.forEach(row => {
          row.c40hc = Math.max(0, row.c40_total - row.c40rf);
        });

        resolve(rows);
      },
      error: reject,
    });
  });
}

function decodeLabel(field, id) {
  return state.dictionaries[field]?.get(String(id)) || '';
}

function enrichRows(rows) {
  return rows.map(row => ({
    ...row,
    empresa_ecuador: decodeLabel('empresa_ecuador_id', row.empresa_ecuador_id),
    empresa_exterior: decodeLabel('empresa_exterior_id', row.empresa_exterior_id),
    pais_destino: decodeLabel('pais_destino_id', row.pais_destino_id),
    commodity: decodeLabel('commodity_id', row.commodity_id),
    puerto_destino: decodeLabel('puerto_destino_id', row.puerto_destino_id),
    puerto_ecuador: decodeLabel('puerto_ecuador_id', row.puerto_ecuador_id),
    empresa_transporte: decodeLabel('empresa_transporte_id', row.empresa_transporte_id),
    freight_forwarder_destino: decodeLabel('freight_forwarder_destino_id', row.freight_forwarder_destino_id),
    freight_forwarder_origen: decodeLabel('freight_forwarder_origen_id', row.freight_forwarder_origen_id),
    mes_label: MONTHS_ES[row.mes] || String(row.mes),
  }));
}

function uniqueSorted(values) {
  return [...new Set(values.filter(Boolean))].sort((a, b) => String(a).localeCompare(String(b), 'es'));
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
    option.value = item.value;
    option.textContent = item.label;
    selectEl.appendChild(option);
  });

  if ([...selectEl.options].some(option => option.value === current)) {
    selectEl.value = current;
  }
}

function populateFilters() {
  const rows = state.rows;

  setOptions(
    els.filterAnio,
    uniqueSorted(rows.map(r => r.anio)).map(value => ({ value: String(value), label: String(value) })),
    'Todos'
  );

  setOptions(
    els.filterMes,
    uniqueSorted(rows.map(r => r.mes)).map(value => ({
      value: String(value),
      label: MONTHS_ES[value] || String(value)
    })),
    'Todos'
  );

  setOptions(
    els.filterPais,
    uniqueSorted(rows.map(r => r.pais_destino)).map(value => ({ value, label: value })),
    'Todos'
  );

  setOptions(
    els.filterCommodity,
    uniqueSorted(rows.map(r => r.commodity)).map(value => ({ value, label: value })),
    'Todos'
  );

  setOptions(
    els.filterPuertoDestino,
    uniqueSorted(rows.map(r => r.puerto_destino)).map(value => ({ value, label: value })),
    'Todos'
  );

  setOptions(
    els.filterPuertoEcuador,
    uniqueSorted(rows.map(r => r.puerto_ecuador)).map(value => ({ value, label: value })),
    'Todos'
  );

  setOptions(
    els.filterEmpresaEcuador,
    uniqueSorted(rows.map(r => r.empresa_ecuador)).map(value => ({ value, label: value })),
    'Todos'
  );

  setOptions(
    els.filterEmpresaTransporte,
    uniqueSorted(rows.map(r => r.empresa_transporte)).map(value => ({ value, label: value })),
    'Todos'
  );

  setOptions(
    els.filterForwarderOrigen,
    uniqueSorted(rows.map(r => r.freight_forwarder_origen)).map(value => ({ value, label: value })),
    'Todos'
  );
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
    if (state.filters.empresaTransporte && row.empresa_transporte !== state.filters.empresaTransporte) return false;
    if (state.filters.forwarderOrigen && row.freight_forwarder_origen !== state.filters.forwarderOrigen) return false;
    if (state.filters.refrigerada === 'si' && !(row.c40rf > 0)) return false;
    if (state.filters.refrigerada === 'no' && !(row.c40rf === 0)) return false;
    return true;
  });
}

function updateKPIs(rows) {
  const teus = rows.reduce((sum, row) => sum + row.teus_fcl, 0);
  const cont = rows.reduce((sum, row) => sum + row.cont, 0);
  const c20 = rows.reduce((sum, row) => sum + row.c20, 0);
  const c40rf = rows.reduce((sum, row) => sum + row.c40rf, 0);
  const c40hc = rows.reduce((sum, row) => sum + row.c40hc, 0);
  const empresas = new Set(rows.map(r => r.empresa_ecuador).filter(Boolean)).size;
  const paises = new Set(rows.map(r => r.pais_destino).filter(Boolean)).size;

  els.kpiTeus.textContent = formatNumber(teus);
  els.kpiCont.textContent = formatNumber(cont);
  els.kpi20.textContent = formatNumber(c20);
  els.kpi40HC.textContent = formatNumber(c40hc);
  els.kpi40RF.textContent = formatNumber(c40rf);
  els.kpiEmpresas.textContent = formatNumber(empresas);
  els.kpiPaises.textContent = formatNumber(paises);
}

function buildSeries(rows) {
  const map = new Map();

  rows.forEach(row => {
    const key = `${row.anio}-${String(row.mes).padStart(2, '0')}`;
    if (!map.has(key)) {
      map.set(key, {
        label: `${MONTHS_ES[row.mes] || row.mes} ${row.anio}`,
        value: 0
      });
    }
    map.get(key).value += row.teus_fcl;
  });

  return [...map.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([, payload]) => payload);
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
        borderColor: '#FC4A1D',
        backgroundColor: type === 'line'
          ? 'rgba(252, 74, 29, 0.14)'
          : 'rgba(57, 62, 77, 0.84)',
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
        tooltip: {
          backgroundColor: '#393E4D',
          titleColor: '#ffffff',
          bodyColor: '#ffffff',
          borderColor: 'rgba(252,74,29,.35)',
          borderWidth: 1,
        },
      },
      scales: {
        x: {
          ticks: { color: '#585D6C' },
          grid: { display: false }
        },
        y: {
          beginAtZero: true,
          ticks: {
            color: '#585D6C',
            callback: value => formatNumber(value)
          },
          grid: { color: 'rgba(88,93,108,.14)' }
        },
      }
    }
  });
}

function updateCharts(rows) {
  const series = buildSeries(rows);
  createOrUpdateChart(
    'series',
    'chartSeries',
    'line',
    series.map(x => x.label),
    series.map(x => x.value),
    'TEUs'
  );

  const topPaises = groupSum(rows, 'pais_destino', 'teus_fcl', 10);
  createOrUpdateChart(
    'paises',
    'chartPaises',
    'bar',
    topPaises.map(x => x.label),
    topPaises.map(x => x.value),
    'TEUs'
  );

  const topCommodities = groupSum(rows, 'commodity', 'teus_fcl', 10);
  createOrUpdateChart(
    'commodities',
    'chartCommodities',
    'bar',
    topCommodities.map(x => x.label),
    topCommodities.map(x => x.value),
    'TEUs'
  );

  const topPuertos = groupSum(rows, 'puerto_destino', 'teus_fcl', 10);
  createOrUpdateChart(
    'puertos',
    'chartPuertos',
    'bar',
    topPuertos.map(x => x.label),
    topPuertos.map(x => x.value),
    'TEUs'
  );
}

function getFilterLabel(key, value) {
  if (!value) return '';
  if (key === 'mes') return MONTHS_ES[Number(value)] || value;
  if (key === 'refrigerada') return value === 'si' ? 'Carga refrigerada: Sí' : 'Carga refrigerada: No';
  return value;
}

function updateActiveFiltersLabel() {
  const tags = [];

  Object.entries(state.filters).forEach(([key, value]) => {
    if (!value) return;
    tags.push(getFilterLabel(key, value));
  });

  els.activeFiltersLabel.textContent = tags.length ? tags.join(' • ') : 'Sin filtros';
}

function renderFieldPicker() {
  els.fieldPicker.innerHTML = FIELD_CONFIG.map(field => `
    <label class="field-item">
      <input
        type="checkbox"
        value="${field.key}"
        ${state.selectedFields.includes(field.key) ? 'checked' : ''}
      />
      <span>${field.label}</span>
    </label>
  `).join('');

  els.fieldPicker.querySelectorAll('input[type="checkbox"]').forEach(input => {
    input.addEventListener('change', event => {
      const key = event.target.value;

      if (event.target.checked) {
        if (!state.selectedFields.includes(key)) state.selectedFields.push(key);
      } else {
        state.selectedFields = state.selectedFields.filter(item => item !== key);
        if (state.selectedFields.length === 0) {
          state.selectedFields = ['empresa_ecuador'];
          renderFieldPicker();
        }
      }

      renderSelectedFields();
      render();
    });
  });
}

function renderSelectedFields() {
  const selectedConfigs = state.selectedFields
    .map(key => FIELD_CONFIG.find(field => field.key === key))
    .filter(Boolean);

  els.selectedFieldsList.innerHTML = selectedConfigs.map(field => `
    <div
      class="selected-field-chip"
      draggable="true"
      data-key="${field.key}"
      style="background:${field.color}"
    >
      <span>${field.label}</span>
    </div>
  `).join('');

  let dragKey = null;

  els.selectedFieldsList.querySelectorAll('.selected-field-chip').forEach(chip => {
    chip.addEventListener('dragstart', event => {
      dragKey = chip.dataset.key;
      chip.classList.add('dragging');
      event.dataTransfer.effectAllowed = 'move';
    });

    chip.addEventListener('dragend', () => {
      chip.classList.remove('dragging');
    });

    chip.addEventListener('dragover', event => {
      event.preventDefault();
      event.dataTransfer.dropEffect = 'move';
    });

    chip.addEventListener('drop', event => {
      event.preventDefault();
      const targetKey = chip.dataset.key;
      if (!dragKey || dragKey === targetKey) return;

      const current = [...state.selectedFields];
      const fromIndex = current.indexOf(dragKey);
      const toIndex = current.indexOf(targetKey);

      current.splice(fromIndex, 1);
      current.splice(toIndex, 0, dragKey);
      state.selectedFields = current;

      renderSelectedFields();
      render();
    });
  });
}

function buildDetailRows(rows) {
  const selectedFields = state.selectedFields.length ? state.selectedFields : ['empresa_ecuador'];
  const map = new Map();

  rows.forEach(row => {
    const path = selectedFields.map(key => row[key] || 'Sin dato');
    const pathKey = path.join('|||');

    if (!map.has(pathKey)) {
      map.set(pathKey, {
        path,
        c20: 0,
        c40hc: 0,
        c40rf: 0,
        teus: 0,
      });
    }

    const bucket = map.get(pathKey);
    bucket.c20 += row.c20;
    bucket.c40hc += row.c40hc;
    bucket.c40rf += row.c40rf;
    bucket.teus += row.teus_fcl;
  });

  return [...map.values()]
    .sort((a, b) => b.teus - a.teus)
    .slice(0, 100);
}

function renderDetailTable(rows) {
  const result = buildDetailRows(rows);

  if (!result.length) {
    els.detailTableBody.innerHTML = `
      <tr>
        <td colspan="5" class="empty-table">No hay resultados para los filtros actuales.</td>
      </tr>
    `;
    return;
  }

  els.detailTableBody.innerHTML = result.map(item => {
    const detailHtml = item.path.map((value, index) => {
      const fieldKey = state.selectedFields[index];
      const config = FIELD_CONFIG.find(field => field.key === fieldKey);
      return `
        <div class="detail-line">
          <span class="detail-tag" style="background:${config.color}">${config.label}</span>
          <span class="detail-value">${value}</span>
        </div>
      `;
    }).join('');

    return `
      <tr>
        <td>
          <div class="detail-cell">${detailHtml}</div>
        </td>
        <td class="num">${formatNumber(item.c20)}</td>
        <td class="num">${formatNumber(item.c40hc)}</td>
        <td class="num">${formatNumber(item.c40rf)}</td>
        <td class="num">${formatNumber(item.teus)}</td>
      </tr>
    `;
  }).join('');
}

function render() {
  const filteredRows = getFilteredRows();
  updateKPIs(filteredRows);
  updateCharts(filteredRows);
  renderDetailTable(filteredRows);
  updateActiveFiltersLabel();
  els.loadingStatus.textContent = `Datos listos, ${formatNumber(filteredRows.length)} filas activas`;
}

function resetFilters() {
  state.filters = {
    anio: '',
    mes: '',
    pais: '',
    commodity: '',
    puertoDestino: '',
    puertoEcuador: '',
    empresaEcuador: '',
    empresaTransporte: '',
    forwarderOrigen: '',
    refrigerada: '',
  };

  [
    els.filterAnio,
    els.filterMes,
    els.filterPais,
    els.filterCommodity,
    els.filterPuertoDestino,
    els.filterPuertoEcuador,
    els.filterEmpresaEcuador,
    els.filterEmpresaTransporte,
    els.filterForwarderOrigen,
    els.filterRefrigerada,
  ].forEach(el => {
    el.value = '';
  });

  render();
}

function attachEvents() {
  els.filterAnio.addEventListener('change', e => {
    state.filters.anio = e.target.value;
    render();
  });

  els.filterMes.addEventListener('change', e => {
    state.filters.mes = e.target.value;
    render();
  });

  els.filterPais.addEventListener('change', e => {
    state.filters.pais = e.target.value;
    render();
  });

  els.filterCommodity.addEventListener('change', e => {
    state.filters.commodity = e.target.value;
    render();
  });

  els.filterPuertoDestino.addEventListener('change', e => {
    state.filters.puertoDestino = e.target.value;
    render();
  });

  els.filterPuertoEcuador.addEventListener('change', e => {
    state.filters.puertoEcuador = e.target.value;
    render();
  });

  els.filterEmpresaEcuador.addEventListener('change', e => {
    state.filters.empresaEcuador = e.target.value;
    render();
  });

  els.filterEmpresaTransporte.addEventListener('change', e => {
    state.filters.empresaTransporte = e.target.value;
    render();
  });

  els.filterForwarderOrigen.addEventListener('change', e => {
    state.filters.forwarderOrigen = e.target.value;
    render();
  });

  els.filterRefrigerada.addEventListener('change', e => {
    state.filters.refrigerada = e.target.value;
    render();
  });

  els.resetFiltersBtn.addEventListener('click', resetFilters);
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
    renderFieldPicker();
    renderSelectedFields();
    render();
  } catch (error) {
    console.error(error);
    els.loadingStatus.textContent = 'Error cargando datos. Revisa rutas o consola.';
  }
}

init();
