/* ═══════════════════════════════════════════════════════════════
   ALLOCATE — app.js  (Premium Edition)
   ═══════════════════════════════════════════════════════════════ */

/* ── Constants ─────────────────────────────────────────────── */
const MONTHS     = ['January','February','March','April','May','June',
                    'July','August','September','October','November','December'];
const ABBR       = ['Jan','Feb','Mar','Apr','May','Jun',
                    'Jul','Aug','Sep','Oct','Nov','Dec'];
const YEAR       = new Date().getFullYear();
const STORAGE_KEY = `allocate_v2_${YEAR}`;
const CIRC        = 2 * Math.PI * 14; // r=14 → ≈ 87.96

const DEFAULTS = {
  savings:     { label: 'Savings',        pct: 35, color: '#7d6a4f', rgb: '125,106,79' },
  investments: { label: 'Investments',    pct: 10, color: '#9c7f67', rgb: '156,127,103' },
  expenses:    { label: 'Fixed Expenses', pct: 43, color: '#6e8069', rgb: '110,128,105' },
  lifestyle:   { label: 'Lifestyle',      pct: 12, color: '#8c7a62', rgb: '140,122,98' },
};

/* ── State ──────────────────────────────────────────────────── */
let state = {
  activeMonth:  new Date().getMonth(),
  allocs:       structuredClone(DEFAULTS),
  months:       Array(12).fill(null),
};

let charts = { bar: null, pie: null };
let prevDisplayedValues = {}; // for animated counters

/* ── Storage ────────────────────────────────────────────────── */
function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    months: state.months,
    pcts:   Object.fromEntries(Object.entries(state.allocs).map(([k,v])=>[k,v.pct])),
  }));
}

function hydrate() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return;
  try {
    const d = JSON.parse(raw);
    if (d.months) state.months = d.months;
    if (d.pcts) Object.entries(d.pcts).forEach(([k,p])=>{ if(state.allocs[k]) state.allocs[k].pct = p; });
  } catch(e) {}
}

/* ── Format ─────────────────────────────────────────────────── */
const fmt  = v => new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(v||0);
const fmt2 = v => new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',minimumFractionDigits:2}).format(v||0);

/* ── Compute ─────────────────────────────────────────────────── */
function calc(salary) {
  const r = {};
  Object.entries(state.allocs).forEach(([k,c])=> r[k] = salary * c.pct / 100);
  return r;
}

function yearTotals() {
  const t = {salary:0,savings:0,investments:0,expenses:0,lifestyle:0};
  state.months.forEach(m=>{ if(!m) return;
    t.salary+=m.salary; t.savings+=m.savings; t.investments+=m.investments;
    t.expenses+=m.expenses; t.lifestyle+=m.lifestyle;
  });
  return t;
}

/* ── Animated Number Counter ────────────────────────────────── */
function animateValue(el, from, to, duration = 500) {
  if (from === to) { el.textContent = fmt(to); return; }
  const start = performance.now();
  const diff  = to - from;
  function step(now) {
    const p  = Math.min((now - start) / duration, 1);
    const ep = 1 - Math.pow(1 - p, 3); // ease-out cubic
    el.textContent = fmt(from + diff * ep);
    if (p < 1) requestAnimationFrame(step);
    else el.textContent = fmt(to);
  }
  requestAnimationFrame(step);
}

/* ── Grain Canvas ───────────────────────────────────────────── */
function initGrain() {
  const canvas = document.getElementById('grainCanvas');
  const ctx    = canvas.getContext('2d');
  let   frame  = 0;

  function resize() {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  function drawGrain() {
    const w = canvas.width, h = canvas.height;
    const img = ctx.createImageData(w, h);
    const d   = img.data;
    // Noise with mild motion per frame
    for (let i = 0; i < d.length; i += 4) {
      const n = (Math.random() * 255) | 0;
      d[i] = d[i+1] = d[i+2] = n;
      d[i+3] = 18; // very subtle alpha
    }
    ctx.putImageData(img, 0, 0);
  }

  let lastGrain = 0;
  function loop(t) {
    if (t - lastGrain > 80) { // 12 fps grain flicker
      drawGrain();
      lastGrain = t;
    }
    requestAnimationFrame(loop);
  }

  resize();
  window.addEventListener('resize', resize);
  requestAnimationFrame(loop);
}

/* ── Month Rail (sliding pill) ──────────────────────────────── */
function buildMonthRail() {
  const nav   = document.getElementById('monthNav');
  const pill  = document.getElementById('monthPill');
  // Remove old tabs
  nav.querySelectorAll('.month-tab').forEach(el => el.remove());

  ABBR.forEach((abbr, i) => {
    const btn = document.createElement('button');
    btn.className = 'month-tab' + (i === state.activeMonth ? ' active' : '');
    if (state.months[i]) btn.classList.add('has-data');
    btn.setAttribute('role','tab');
    btn.setAttribute('aria-selected', i === state.activeMonth);

    const dot = document.createElement('span');
    dot.className = 'month-tab-dot';
    btn.textContent = abbr;
    if (state.months[i]) btn.appendChild(dot);

    btn.addEventListener('click', () => {
      state.activeMonth = i;
      renderAll();
      // Smooth scroll to entry section
      document.getElementById('entrySection')?.scrollIntoView({ behavior:'smooth', block:'nearest' });
    });
    nav.appendChild(btn);
  });

  // Position pill
  requestAnimationFrame(positionPill);
}

function positionPill() {
  const nav  = document.getElementById('monthNav');
  const pill = document.getElementById('monthPill');
  const active = nav.querySelector('.month-tab.active');
  if (!active || !pill) return;
  const navRect    = nav.getBoundingClientRect();
  const activeRect = active.getBoundingClientRect();
  pill.style.left  = (activeRect.left - navRect.left + 4) + 'px'; // offset for padding
  pill.style.width = activeRect.width + 'px';
}

/* ── Hero meta ──────────────────────────────────────────────── */
function updateHeroMeta() {
  document.getElementById('heroYear').textContent  = YEAR;
  document.getElementById('heroMonth').textContent = MONTHS[state.activeMonth];
}

/* ── Hero allocation bar ────────────────────────────────────── */
function updateHeroBar() {
  const salary = parseFloat(document.getElementById('salaryInput').value) || 0;
  const legend = document.getElementById('heroBarLegend');
  legend.innerHTML = '';

  const entries = Object.entries(state.allocs);
  const total   = entries.reduce((s,[,c])=>s+c.pct, 0) || 100;

  entries.forEach(([key, cfg]) => {
    const width = (cfg.pct / total * 100).toFixed(1);
    const seg = document.getElementById(`hbar${key.charAt(0).toUpperCase()+key.slice(1)}`);
    if (seg) {
      seg.style.width = width + '%';
      seg.title       = `${cfg.label} ${cfg.pct}%`;
    }

    // Legend item
    const amt  = salary * cfg.pct / 100;
    const item = document.createElement('div');
    item.className = 'legend-item';
    item.innerHTML = `
      <span class="legend-dot" style="background:${cfg.color}"></span>
      <span>${cfg.label}</span>
      ${salary > 0 ? `<span class="legend-val">${fmt(amt)}</span>` : `<span class="legend-val">${cfg.pct}%</span>`}
    `;
    legend.appendChild(item);
  });
}

/* ── Build allocation sliders ───────────────────────────────── */
function buildSliders() {
  const list = document.getElementById('allocationsList');
  list.innerHTML = '';

  Object.entries(state.allocs).forEach(([key, cfg]) => {
    const row = document.createElement('div');
    row.className = 'alloc-row';
    row.innerHTML = `
      <div class="alloc-row-head">
        <span class="alloc-name">
          <span class="alloc-pip" style="background:${cfg.color}"></span>
          ${cfg.label}
        </span>
        <div class="alloc-pct-wrap">
          <input type="number" class="alloc-pct-input" id="pct_${key}"
            value="${cfg.pct}" min="0" max="100" step="1"
            aria-label="${cfg.label} percentage"/>
          <span class="alloc-pct-sym">%</span>
        </div>
      </div>
      <input type="range" class="alloc-slider" id="sl_${key}"
        min="0" max="100" step="1" value="${cfg.pct}"
        style="accent-color:${cfg.color}"
        aria-label="${cfg.label} slider"/>
    `;
    list.appendChild(row);

    const sl  = row.querySelector(`#sl_${key}`);
    const inp = row.querySelector(`#pct_${key}`);

    const sync = (val) => {
      state.allocs[key].pct = val;
      sl.value = val; inp.value = val;
      updateAllocSummary();
      updateLiveTiles();
      updateHeroBar();
    };

    sl.addEventListener('input',  () => sync(parseInt(sl.value)));
    inp.addEventListener('input', () => sync(Math.min(100, Math.max(0, parseInt(inp.value)||0))));
  });
}

function updateAllocSummary() {
  const total = Object.values(state.allocs).reduce((s,c)=>s+c.pct, 0);
  const el = document.getElementById('allocTotalVal');
  if (!el) return;
  el.textContent = `${total}%`;
  el.classList.toggle('over',  total > 100);
  el.classList.toggle('exact', total === 100);
}

/* ── Live preview tiles ─────────────────────────────────────── */
function buildPreviewTiles() {
  const container = document.getElementById('previewCards');
  container.innerHTML = '';
  Object.entries(state.allocs).forEach(([key, cfg], i) => {
    const tile = document.createElement('div');
    tile.className = 'preview-tile';
    tile.dataset.cat = key;
    tile.style.animationDelay = `${i * 0.06}s`;
    tile.innerHTML = `
      <div class="tile-left">
        <span class="tile-cat">${cfg.label}</span>
        <span class="tile-pct" id="tpct_${key}">${cfg.pct}%</span>
      </div>
      <span class="tile-amount" id="tamt_${key}">$0</span>
    `;
    container.appendChild(tile);
  });
}

function updateLiveTiles() {
  const salary = parseFloat(document.getElementById('salaryInput').value) || 0;
  const alloc  = calc(salary);
  let total = 0;
  Object.entries(alloc).forEach(([key, amt]) => {
    const amtEl = document.getElementById(`tamt_${key}`);
    const pctEl = document.getElementById(`tpct_${key}`);
    if (amtEl) amtEl.textContent = fmt(amt);
    if (pctEl) pctEl.textContent = `${state.allocs[key].pct}%`;
    total += amt;
  });
  document.getElementById('previewTotal').textContent = fmt2(total);
}

/* ── Load month into form ───────────────────────────────────── */
function loadMonth() {
  const entry = state.months[state.activeMonth];
  const input = document.getElementById('salaryInput');
  if (entry) {
    input.value = entry.salary;
    if (entry.pcts) {
      Object.entries(entry.pcts).forEach(([k, p]) => {
        if (!state.allocs[k]) return;
        state.allocs[k].pct = p;
        const sl  = document.getElementById(`sl_${k}`);
        const inp = document.getElementById(`pct_${k}`);
        if (sl)  sl.value  = p;
        if (inp) inp.value = p;
      });
      updateAllocSummary();
    }
  } else {
    input.value = '';
  }
  updateLiveTiles();
  updateHeroBar();
}

/* ── Save month ─────────────────────────────────────────────── */
function saveMonth() {
  const salary = parseFloat(document.getElementById('salaryInput').value);
  if (!salary || salary <= 0) {
    const inp = document.getElementById('salaryInput');
    inp.style.animation = 'none';
    inp.offsetHeight;
    inp.style.animation = 'shake 0.4s ease';
    setTimeout(() => inp.style.animation = '', 400);
    return;
  }

  const alloc = calc(salary);
  state.months[state.activeMonth] = {
    salary,
    ...alloc,
    pcts: Object.fromEntries(Object.entries(state.allocs).map(([k,c])=>[k,c.pct])),
  };

  persist();
  renderAll();
  showToast(`${MONTHS[state.activeMonth]} saved`);
}

/* ── KPI cards ──────────────────────────────────────────────── */
function renderKPIs(totals) {
  const max = Math.max(totals.savings, totals.investments, totals.expenses, totals.lifestyle, 1);

  ['savings','investments','expenses','lifestyle'].forEach(key => {
    const val = totals[key];
    const el  = document.getElementById(`ytd${key.charAt(0).toUpperCase()+key.slice(1)}`);
    const bar = document.getElementById(`bar${key.charAt(0).toUpperCase()+key.slice(1)}`);
    const pct = state.allocs[key]?.pct || 0;

    // Animated counter
    const prev = prevDisplayedValues[key] ?? 0;
    if (el) animateValue(el, prev, val, 600);
    prevDisplayedValues[key] = val;

    // Fill bar
    if (bar) bar.style.width = `${(val/max)*100}%`;

    // SVG ring — circumference = 87.96
    const ringPct = document.getElementById(`ringPct${key.charAt(0).toUpperCase()+key.slice(1)}`);
    if (ringPct) ringPct.textContent = `${pct}%`;

    const card = document.querySelector(`.kpi-card[data-cat="${key}"]`);
    if (card) {
      const ring = card.querySelector('.ring-progress');
      if (ring) {
        const dash = (pct / 100) * CIRC;
        ring.style.transition = 'stroke-dasharray 0.9s cubic-bezier(0.22,1,0.36,1)';
        ring.setAttribute('stroke-dasharray', `${dash} ${CIRC}`);
      }
    }
  });

  // Recorded count
  const rec = state.months.filter(Boolean).length;
  const rcEl = document.getElementById('recordedCount');
  if (rcEl) rcEl.textContent = rec;
}

/* ── Charts ─────────────────────────────────────────────────── */
function cssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function chartColors() {
  return {
    savings:     cssVar('--c-savings')     || '#7d6a4f',
    investments: cssVar('--c-investments') || '#9c7f67',
    expenses:    cssVar('--c-expenses')    || '#6e8069',
    lifestyle:   cssVar('--c-lifestyle')   || '#8c7a62',
    grid:  cssVar('--border'),
    text:  cssVar('--ink-3'),
    font:  "'Instrument Sans', sans-serif",
  };
}

function renderBarChart() {
  const ctx = document.getElementById('barChart').getContext('2d');
  const c   = chartColors();

  const sets = [
    { label:'Savings',     data: state.months.map(m=>m?m.savings:0),     backgroundColor: c.savings+'bb',     borderRadius:4 },
    { label:'Investments', data: state.months.map(m=>m?m.investments:0), backgroundColor: c.investments+'bb', borderRadius:4 },
    { label:'Expenses',    data: state.months.map(m=>m?m.expenses:0),    backgroundColor: c.expenses+'bb',    borderRadius:4 },
    { label:'Lifestyle',   data: state.months.map(m=>m?m.lifestyle:0),   backgroundColor: c.lifestyle+'bb',   borderRadius:4 },
  ];

  if (charts.bar) {
    charts.bar.data.datasets.forEach((ds,i)=>{ ds.data=sets[i].data; });
    charts.bar.update('active');
    return;
  }

  charts.bar = new Chart(ctx, {
    type:'bar',
    data:{ labels: ABBR, datasets: sets },
    options:{
      responsive:true, maintainAspectRatio:false,
      plugins:{
        legend:{
          labels:{ color:c.text, font:{family:c.font,size:11},
            boxWidth:8, boxHeight:8, padding:14, usePointStyle:true, pointStyle:'circle' }
        },
        tooltip:{
          backgroundColor: cssVar('--surface-up'),
          borderColor: cssVar('--border-md'),
          borderWidth:1,
          titleColor: cssVar('--ink'),
          bodyColor:  cssVar('--ink-2'),
          padding:10,
          callbacks:{ label: ctx=>` ${ctx.dataset.label}: ${fmt(ctx.raw)}` }
        }
      },
      scales:{
        x:{ grid:{color:c.grid+'33'}, ticks:{color:c.text,font:{family:c.font,size:10}}, border:{display:false} },
        y:{ grid:{color:c.grid+'44'}, ticks:{color:c.text,font:{family:c.font,size:10},callback:v=>fmt(v)}, border:{display:false} },
      },
      animation:{ duration:700, easing:'easeOutQuart' },
    }
  });
}

function renderPieChart(totals) {
  const ctx = document.getElementById('pieChart').getContext('2d');
  const c   = chartColors();
  const data= [totals.savings, totals.investments, totals.expenses, totals.lifestyle];
  const fallback = data.every(v=>v===0);

  if (charts.pie) {
    charts.pie.data.datasets[0].data = fallback ? [35,10,43,12] : data;
    charts.pie.update('active');
    return;
  }

  charts.pie = new Chart(ctx, {
    type:'doughnut',
    data:{
      labels:['Savings','Investments','Expenses','Lifestyle'],
      datasets:[{
        data: fallback ? [35,10,43,12] : data,
        backgroundColor:[c.savings,c.investments,c.expenses,c.lifestyle],
        borderWidth: 3,
        borderColor: cssVar('--surface'),
        hoverBorderWidth: 0,
      }]
    },
    options:{
      responsive:true, maintainAspectRatio:false,
      cutout:'65%',
      plugins:{
        legend:{
          position:'bottom',
          labels:{color:c.text,font:{family:c.font,size:11},
            boxWidth:8,boxHeight:8,padding:10,usePointStyle:true,pointStyle:'circle'}
        },
        tooltip:{
          backgroundColor: cssVar('--surface-up'),
          borderColor: cssVar('--border-md'),
          borderWidth:1,
          titleColor: cssVar('--ink'),
          bodyColor:  cssVar('--ink-2'),
          callbacks:{ label: ctx=>` ${ctx.label}: ${fmt(ctx.raw)}` }
        }
      },
      animation:{ animateRotate:true, duration:800, easing:'easeOutQuart' }
    }
  });
}

/* ── Year table ─────────────────────────────────────────────── */
function renderTable(totals) {
  const tbody = document.getElementById('yearTableBody');
  tbody.innerHTML = '';

  MONTHS.forEach((name, i) => {
    const m = state.months[i];
    const tr = document.createElement('tr');
    if (i === state.activeMonth) tr.classList.add('active-row');

    tr.style.opacity = '0';
    tr.style.transform = 'translateY(8px)';
    tr.style.transition = `opacity 0.4s var(--ease) ${i*0.03}s, transform 0.4s var(--ease) ${i*0.03}s`;

    tr.addEventListener('click', () => {
      state.activeMonth = i;
      renderAll();
      document.getElementById('entrySection')?.scrollIntoView({behavior:'smooth',block:'start'});
    });

    if (m) {
      tr.innerHTML = `
        <td>${name}</td>
        <td class="num">${fmt(m.salary)}</td>
        <td class="num">${fmt(m.savings)}</td>
        <td class="num">${fmt(m.investments)}</td>
        <td class="num">${fmt(m.expenses)}</td>
        <td class="num">${fmt(m.lifestyle)}</td>
        <td><span class="badge badge-on">● Saved</span></td>
      `;
    } else {
      tr.innerHTML = `
        <td>${name}</td>
        <td>—</td><td>—</td><td>—</td><td>—</td><td>—</td>
        <td><span class="badge badge-off">○ Empty</span></td>
      `;
    }
    tbody.appendChild(tr);

    // Trigger entrance animation
    requestAnimationFrame(() => requestAnimationFrame(() => {
      tr.style.opacity = '1';
      tr.style.transform = 'translateY(0)';
    }));
  });

  // Totals row
  if (state.months.some(Boolean)) {
    const rec = state.months.filter(Boolean).length;
    const tr  = document.createElement('tr');
    tr.className = 'yr-total-row';
    tr.innerHTML = `
      <td>Year Total · ${rec} month${rec>1?'s':''}</td>
      <td class="num">${fmt(totals.salary)}</td>
      <td class="num">${fmt(totals.savings)}</td>
      <td class="num">${fmt(totals.investments)}</td>
      <td class="num">${fmt(totals.expenses)}</td>
      <td class="num">${fmt(totals.lifestyle)}</td>
      <td></td>
    `;
    tbody.appendChild(tr);
  }
}

/* ── Entry section labels ───────────────────────────────────── */
function updateEntryLabels() {
  const m = MONTHS[state.activeMonth];
  const a = ABBR[state.activeMonth];
  document.getElementById('activeMonthLabel').textContent = m;
  document.getElementById('saveMonthName').textContent    = a;
}

/* ── Scroll reveal ──────────────────────────────────────────── */
function initScrollReveal() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('revealed');
        observer.unobserve(e.target);
      }
    });
  }, { threshold: 0.08 });

  document.querySelectorAll('.section').forEach(el => observer.observe(el));
}

/* ── Toast ──────────────────────────────────────────────────── */
let toastTimeout;
function showToast(msg) {
  const toast = document.getElementById('toast');
  const text  = document.getElementById('toastMsg');
  text.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => toast.classList.remove('show'), 2400);
}

/* ── Theme ──────────────────────────────────────────────────── */
function initTheme() {
  const saved = localStorage.getItem('allocate_theme') || 'light';
  document.documentElement.setAttribute('data-theme', saved);
}

function toggleTheme() {
  const cur  = document.documentElement.getAttribute('data-theme');
  const next = cur === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('allocate_theme', next);
  // Rebuild charts for new color scheme
  Object.values(charts).forEach(c => c?.destroy());
  charts = { bar: null, pie: null };
  const t = yearTotals();
  renderBarChart();
  renderPieChart(t);
}

/* ── CSV export ─────────────────────────────────────────────── */
function exportCSV() {
  const rows = [['Month','Salary','Savings','Investments','Fixed Expenses','Lifestyle']];
  MONTHS.forEach((name,i)=>{
    const m = state.months[i];
    rows.push(m
      ? [name,m.salary.toFixed(2),m.savings.toFixed(2),m.investments.toFixed(2),m.expenses.toFixed(2),m.lifestyle.toFixed(2)]
      : [name,'','','','','']
    );
  });
  const t = yearTotals();
  rows.push(['YEAR TOTAL',t.salary.toFixed(2),t.savings.toFixed(2),t.investments.toFixed(2),t.expenses.toFixed(2),t.lifestyle.toFixed(2)]);
  const csv  = rows.map(r=>r.join(',')).join('\n');
  const blob = new Blob([csv],{type:'text/csv;charset=utf-8;'});
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = `allocate_${YEAR}.csv`; a.click();
  URL.revokeObjectURL(url);
  showToast('CSV exported');
}

/* ── Reset ──────────────────────────────────────────────────── */
function resetYear() {
  state.months = Array(12).fill(null);
  state.allocs = structuredClone(DEFAULTS);
  prevDisplayedValues = {};
  localStorage.removeItem(STORAGE_KEY);
  renderAll();
  showToast('Year reset');
}

/* ── Master render ──────────────────────────────────────────── */
function renderAll() {
  const totals = yearTotals();

  document.getElementById('heroYear').textContent  = YEAR;
  document.getElementById('heroMonth').textContent = MONTHS[state.activeMonth];
  document.getElementById('modalYear').textContent = YEAR;

  buildMonthRail();
  updateEntryLabels();
  buildSliders();
  buildPreviewTiles();
  loadMonth();
  updateAllocSummary();
  updateHeroBar();
  renderKPIs(totals);
  renderBarChart();
  renderPieChart(totals);
  renderTable(totals);
}

/* ── Boot ───────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  hydrate();
  initTheme();
  initGrain();
  initScrollReveal();
  renderAll();

  // Salary input
  document.getElementById('salaryInput').addEventListener('input', () => {
    updateLiveTiles();
    updateHeroBar();
  });

  // Save
  document.getElementById('saveMonthBtn').addEventListener('click', saveMonth);

  // Export
  document.getElementById('exportBtn').addEventListener('click', exportCSV);

  // Theme
  document.getElementById('themeToggle').addEventListener('click', toggleTheme);

  // Modal
  const modal  = document.getElementById('resetModal');
  document.getElementById('resetBtn').addEventListener('click', () => {
    modal.classList.add('open');
  });
  document.getElementById('cancelReset').addEventListener('click', () => modal.classList.remove('open'));
  document.getElementById('confirmReset').addEventListener('click', () => {
    modal.classList.remove('open');
    resetYear();
  });
  modal.addEventListener('click', e => { if(e.target===modal) modal.classList.remove('open'); });
  document.addEventListener('keydown', e => { if(e.key==='Escape') modal.classList.remove('open'); });

  // Re-position rail pill on resize
  window.addEventListener('resize', positionPill);
});