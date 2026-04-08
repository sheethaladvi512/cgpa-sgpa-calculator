/* ══════════════════════════════════════
   GradeFlow — SGPA & CGPA Calculator
   app.js — Full Interactive Logic
══════════════════════════════════════ */

/* ── State ── */
let gradingScale = '10';       // '10' | '4' | 'percentage'
let subjects = [];             // { id, name, credits, gradeInput, gradePoints }
let semesters = [];            // { id, label, sgpa, credits }
let idCounter = 1;

/* ── Grading Tables ── */
const GRADE_TABLE_10 = [
  { label: 'O',  min: 90, points: 10 },
  { label: 'A+', min: 80, points: 9  },
  { label: 'A',  min: 70, points: 8  },
  { label: 'B+', min: 60, points: 7  },
  { label: 'B',  min: 50, points: 6  },
  { label: 'C',  min: 40, points: 5  },
  { label: 'F',  min: 0,  points: 0  },
];

const GRADE_TABLE_4 = [
  { label: 'A+', min: 97, points: 4.0 },
  { label: 'A',  min: 93, points: 4.0 },
  { label: 'A-', min: 90, points: 3.7 },
  { label: 'B+', min: 87, points: 3.3 },
  { label: 'B',  min: 83, points: 3.0 },
  { label: 'B-', min: 80, points: 2.7 },
  { label: 'C+', min: 77, points: 2.3 },
  { label: 'C',  min: 73, points: 2.0 },
  { label: 'C-', min: 70, points: 1.7 },
  { label: 'D+', min: 67, points: 1.3 },
  { label: 'D',  min: 65, points: 1.0 },
  { label: 'F',  min: 0,  points: 0.0 },
];

/* Grade from percentage -> points */
function percentToPoints(pct, scale) {
  const tbl = scale === '4' ? GRADE_TABLE_4 : GRADE_TABLE_10;
  for (const g of tbl) if (pct >= g.min) return { points: g.points, label: g.label };
  return { points: 0, label: 'F' };
}

/* Grade letter -> points (direct entry for non-percentage mode) */
function gradeLetterToPoints(letter, scale) {
  const tbl = scale === '4' ? GRADE_TABLE_4 : GRADE_TABLE_10;
  const found = tbl.find(g => g.label.toUpperCase() === letter.trim().toUpperCase());
  return found ? { points: found.points, label: found.label } : null;
}

function getPointsFromInput(val, scale) {
  val = val.trim();
  if (!val) return null;
  // Numeric → treat as percentage or raw points
  if (!isNaN(val)) {
    const num = parseFloat(val);
    if (scale === 'percentage') return percentToPoints(num, '10');
    if (scale === '10') {
      // Ambiguous: if > 10, treat as percentage; else raw grade point
      if (num > 10) return percentToPoints(num, '10');
      return { points: Math.min(num, 10), label: pointsToLetter(Math.min(num, 10), '10') };
    }
    if (scale === '4') {
      if (num > 4) return percentToPoints(num, '4');
      return { points: Math.min(num, 4), label: pointsToLetter(Math.min(num, 4), '4') };
    }
  }
  // Letter grade
  const found = gradeLetterToPoints(val, scale);
  if (found) return found;
  return null;
}

function pointsToLetter(points, scale) {
  const tbl = scale === '4' ? GRADE_TABLE_4 : GRADE_TABLE_10;
  // Find closest
  let best = tbl[tbl.length - 1];
  for (const g of tbl) {
    if (points >= g.points - 0.001) { best = g; break; }
  }
  return best.label;
}

function cgpaToLetter(cgpa, scale) {
  if (scale === '4') {
    if (cgpa >= 3.7) return 'A / Distinction';
    if (cgpa >= 3.0) return 'B / Merit';
    if (cgpa >= 2.0) return 'C / Average';
    return 'F / Fail';
  }
  if (cgpa >= 9) return 'O — Outstanding';
  if (cgpa >= 8) return 'A+ — Excellent';
  if (cgpa >= 7) return 'A — Very Good';
  if (cgpa >= 6) return 'B+ — Good';
  if (cgpa >= 5) return 'B — Average';
  if (cgpa >= 4) return 'C — Pass';
  return 'F — Fail';
}

/* ── DOM Helpers ── */
const $ = id => document.getElementById(id);
const make = tag => document.createElement(tag);

/* ── Init ── */
document.addEventListener('DOMContentLoaded', () => {
  loadState();
  renderSubjects();
  renderSemesters();
  calculateSGPA();
  calculateCGPA();
  bindEvents();
  drawChart();
});

/* ── Event Bindings ── */
function bindEvents() {
  // Tab switch
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  // Scale change
  document.querySelectorAll('input[name="scale"]').forEach(r => {
    r.addEventListener('change', () => {
      gradingScale = r.value;
      subjects.forEach(s => s.gradeInput = '');
      renderSubjects();
      calculateSGPA();
      saveState();
    });
  });

  // Add subject
  $('addSubject').addEventListener('click', addSubject);
  // Clear SGPA
  $('clearSgpa').addEventListener('click', clearSGPA);
  // Save semester to CGPA
  $('saveSemester').addEventListener('click', saveSemesterToCGPA);
  // Export SGPA
  $('exportSgpa').addEventListener('click', () => exportData('sgpa'));

  // Add semester manual
  $('addSemesterManual').addEventListener('click', addSemesterManual);
  // Clear CGPA
  $('clearCgpa').addEventListener('click', clearCGPA);
  // Export CGPA
  $('exportCgpa').addEventListener('click', () => exportData('cgpa'));

  // Theme toggle
  $('themeToggle').addEventListener('click', toggleTheme);
}

/* ── Tab Switch ── */
function switchTab(tab) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.toggle('active', p.id === 'tab-' + tab));
  if (tab === 'cgpa') { drawChart(); }
}

/* ── Theme ── */
function toggleTheme() {
  const cur = document.documentElement.getAttribute('data-theme');
  const next = cur === 'light' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', next === 'dark' ? '' : 'light');
  localStorage.setItem('gf_theme', next);
}
(function initTheme() {
  const saved = localStorage.getItem('gf_theme');
  if (saved === 'light') document.documentElement.setAttribute('data-theme', 'light');
})();

/* ── Subject Management ── */
function addSubject() {
  subjects.push({ id: idCounter++, name: '', credits: '', gradeInput: '', points: null });
  renderSubjects();
  saveState();
  // Focus last name input
  setTimeout(() => {
    const inputs = document.querySelectorAll('.subj-name');
    if (inputs.length) inputs[inputs.length - 1].focus();
  }, 50);
}

function removeSubject(id) {
  subjects = subjects.filter(s => s.id !== id);
  renderSubjects();
  calculateSGPA();
  saveState();
}

function renderSubjects() {
  const list = $('subjectList');
  list.innerHTML = '';

  if (subjects.length === 0) {
    const empty = make('div');
    empty.style.cssText = 'padding:24px;text-align:center;color:var(--text-muted);font-family:var(--font-mono);font-size:0.85rem;';
    empty.textContent = 'No subjects yet. Click "+ Add Subject" to begin.';
    list.appendChild(empty);
    return;
  }

  subjects.forEach(s => {
    const row = make('div');
    row.className = 'subject-row';
    row.dataset.id = s.id;

    // Grade options for select (only for non-percentage)
    const gradeOptions = getGradeOptions();

    row.innerHTML = `
      <input type="text" class="subj-name" placeholder="Subject name" value="${escHtml(s.name)}" />
      <input type="number" class="subj-credits" placeholder="e.g. 4" min="0" max="10" step="0.5" value="${escHtml(s.credits)}" />
      ${gradingScale === 'percentage'
        ? `<input type="number" class="subj-grade" placeholder="Marks (0–100)" min="0" max="100" step="0.1" value="${escHtml(s.gradeInput)}" />`
        : `<select class="subj-grade-sel">
             <option value="">— Select Grade —</option>
             ${gradeOptions.map(g => `<option value="${g.label}" ${s.gradeInput === g.label ? 'selected' : ''}>${g.label} (${g.points})</option>`).join('')}
           </select>`
      }
      <div class="points-badge" id="pb-${s.id}">${s.points !== null ? s.points.toFixed(2) : '—'}</div>
      <button class="delete-btn" title="Remove">✕</button>
    `;

    // Events
    row.querySelector('.subj-name').addEventListener('input', e => {
      s.name = e.target.value; saveState();
    });
    row.querySelector('.subj-credits').addEventListener('input', e => {
      s.credits = e.target.value; calculateSGPA(); saveState();
    });

    if (gradingScale === 'percentage') {
      row.querySelector('.subj-grade').addEventListener('input', e => {
        s.gradeInput = e.target.value;
        updatePointsBadge(s);
        calculateSGPA(); saveState();
      });
    } else {
      row.querySelector('.subj-grade-sel').addEventListener('change', e => {
        s.gradeInput = e.target.value;
        updatePointsBadge(s);
        calculateSGPA(); saveState();
      });
    }

    row.querySelector('.delete-btn').addEventListener('click', () => removeSubject(s.id));

    list.appendChild(row);
  });
}

function getGradeOptions() {
  return gradingScale === '4' ? GRADE_TABLE_4 : GRADE_TABLE_10;
}

function updatePointsBadge(s) {
  const result = getPointsFromInput(s.gradeInput, gradingScale);
  s.points = result ? result.points : null;
  const badge = $(`pb-${s.id}`);
  if (badge) badge.textContent = s.points !== null ? s.points.toFixed(2) : '—';
}

/* ── SGPA Calculation ── */
function calculateSGPA() {
  let totalWeighted = 0, totalCredits = 0;
  let valid = 0;

  subjects.forEach(s => {
    const cr = parseFloat(s.credits);
    const res = getPointsFromInput(s.gradeInput, gradingScale);
    if (!isNaN(cr) && cr > 0 && res !== null) {
      s.points = res.points;
      totalWeighted += cr * res.points;
      totalCredits += cr;
      valid++;
    } else {
      s.points = null;
    }
  });

  const sgpa = totalCredits > 0 ? totalWeighted / totalCredits : null;
  displaySGPA(sgpa, totalCredits, valid, totalWeighted);
}

function displaySGPA(sgpa, credits, count, weighted) {
  const valEl = $('sgpaValue');
  const gradeEl = $('sgpaGradeLetter');
  const card = $('sgpaResult');
  const breakdown = $('sgpaBreakdown');

  if (sgpa !== null) {
    valEl.textContent = sgpa.toFixed(2);
    gradeEl.textContent = cgpaToLetter(sgpa, gradingScale);
    card.classList.add('has-result');

    breakdown.innerHTML = `
      <div class="breakdown-chip"><span class="chip-label">Subjects</span><span class="chip-val">${count}</span></div>
      <div class="breakdown-chip"><span class="chip-label">Total Credits</span><span class="chip-val">${credits}</span></div>
      <div class="breakdown-chip"><span class="chip-label">Weighted Sum</span><span class="chip-val">${weighted.toFixed(2)}</span></div>
      <div class="breakdown-chip"><span class="chip-label">Scale</span><span class="chip-val">${gradingScale === 'percentage' ? '10-pt (PCT)' : gradingScale + '-pt'}</span></div>
    `;
  } else {
    valEl.textContent = '—';
    gradeEl.textContent = '';
    card.classList.remove('has-result');
    breakdown.innerHTML = '';
  }
}

/* ── Save Semester to CGPA ── */
function saveSemesterToCGPA() {
  let totalWeighted = 0, totalCredits = 0;
  subjects.forEach(s => {
    const cr = parseFloat(s.credits);
    const res = getPointsFromInput(s.gradeInput, gradingScale);
    if (!isNaN(cr) && cr > 0 && res !== null) {
      totalWeighted += cr * res.points;
      totalCredits += cr;
    }
  });
  if (totalCredits === 0) { showToast('⚠ Add subjects with valid grades first.'); return; }

  const sgpa = totalWeighted / totalCredits;
  const num = semesters.length + 1;
  semesters.push({ id: idCounter++, label: `Semester ${num}`, sgpa: parseFloat(sgpa.toFixed(2)), credits: totalCredits });
  renderSemesters();
  calculateCGPA();
  drawChart();
  saveState();
  showToast(`✓ Semester ${num} saved (SGPA: ${sgpa.toFixed(2)})`);
  switchTab('cgpa');
}

/* ── Semester Management ── */
function addSemesterManual() {
  const num = semesters.length + 1;
  semesters.push({ id: idCounter++, label: `Semester ${num}`, sgpa: '', credits: '' });
  renderSemesters();
  saveState();
  setTimeout(() => {
    const inputs = document.querySelectorAll('.sem-label');
    if (inputs.length) inputs[inputs.length - 1].focus();
  }, 50);
}

function removeSemester(id) {
  semesters = semesters.filter(s => s.id !== id);
  renderSemesters();
  calculateCGPA();
  drawChart();
  saveState();
}

function renderSemesters() {
  const list = $('semesterList');
  list.innerHTML = '';

  if (semesters.length === 0) {
    const empty = make('div');
    empty.style.cssText = 'padding:24px;text-align:center;color:var(--text-muted);font-family:var(--font-mono);font-size:0.85rem;';
    empty.textContent = 'No semesters yet. Save from SGPA tab or add manually.';
    list.appendChild(empty);
    return;
  }

  semesters.forEach((sem, idx) => {
    const row = make('div');
    row.className = 'semester-row';

    const sgpa = parseFloat(sem.sgpa);
    const cr = parseFloat(sem.credits);
    const weighted = (!isNaN(sgpa) && !isNaN(cr)) ? (sgpa * cr).toFixed(2) : '—';

    row.innerHTML = `
      <input type="text" class="sem-label" value="${escHtml(sem.label)}" placeholder="Semester ${idx+1}" />
      <input type="number" class="sem-sgpa" value="${escHtml(sem.sgpa)}" placeholder="SGPA" min="0" step="0.01" />
      <input type="number" class="sem-credits" value="${escHtml(sem.credits)}" placeholder="Credits" min="0" step="0.5" />
      <div class="points-badge">${weighted}</div>
      <button class="delete-btn" title="Remove">✕</button>
    `;

    row.querySelector('.sem-label').addEventListener('input', e => { sem.label = e.target.value; saveState(); drawChart(); });
    row.querySelector('.sem-sgpa').addEventListener('input', e => {
      sem.sgpa = e.target.value;
      renderSemesters(); calculateCGPA(); drawChart(); saveState();
    });
    row.querySelector('.sem-credits').addEventListener('input', e => {
      sem.credits = e.target.value;
      renderSemesters(); calculateCGPA(); drawChart(); saveState();
    });
    row.querySelector('.delete-btn').addEventListener('click', () => removeSemester(sem.id));

    list.appendChild(row);
  });
}

/* ── CGPA Calculation ── */
function calculateCGPA() {
  let totalWeighted = 0, totalCredits = 0, validCount = 0;
  let highest = -Infinity, lowest = Infinity;

  semesters.forEach(sem => {
    const sgpa = parseFloat(sem.sgpa);
    const cr = parseFloat(sem.credits);
    if (!isNaN(sgpa) && !isNaN(cr) && cr > 0) {
      totalWeighted += sgpa * cr;
      totalCredits += cr;
      validCount++;
      if (sgpa > highest) highest = sgpa;
      if (sgpa < lowest) lowest = sgpa;
    }
  });

  const cgpa = totalCredits > 0 ? totalWeighted / totalCredits : null;
  displayCGPA(cgpa, totalCredits, validCount, highest, lowest);
}

function displayCGPA(cgpa, credits, count, high, low) {
  const valEl = $('cgpaValue');
  const gradeEl = $('cgpaGradeLetter');
  const card = $('cgpaResult');
  const statsEl = $('cgpaStats');

  if (cgpa !== null) {
    valEl.textContent = cgpa.toFixed(2);
    gradeEl.textContent = cgpaToLetter(cgpa, gradingScale);
    card.classList.add('has-result');

    statsEl.innerHTML = `
      <div class="stat-box"><div class="stat-val">${count}</div><div class="stat-label">Semesters</div></div>
      <div class="stat-box"><div class="stat-val">${credits}</div><div class="stat-label">Total Credits</div></div>
      <div class="stat-box"><div class="stat-val">${high !== -Infinity ? high.toFixed(2) : '—'}</div><div class="stat-label">Best SGPA</div></div>
      <div class="stat-box"><div class="stat-val">${low !== Infinity ? low.toFixed(2) : '—'}</div><div class="stat-label">Lowest SGPA</div></div>
    `;
  } else {
    valEl.textContent = '—';
    gradeEl.textContent = '';
    card.classList.remove('has-result');
    statsEl.innerHTML = '';
  }
}

/* ── Chart ── */
function drawChart() {
  const canvas = $('cgpaChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.offsetWidth || 700;
  const H = 160;
  canvas.width = W;
  canvas.height = H;

  const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
  const fg = isDark ? '#e8eaf0' : '#1a1d2e';
  const muted = isDark ? '#6b7390' : '#7a82a0';
  const accent = isDark ? '#7cffd4' : '#00a87a';
  const bg = isDark ? '#13151c' : '#ffffff';
  const gridColor = isDark ? '#252836' : '#d0d6e8';

  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  const validSems = semesters.filter(s => !isNaN(parseFloat(s.sgpa)));
  if (validSems.length === 0) {
    ctx.fillStyle = muted;
    ctx.font = `500 13px 'DM Mono', monospace`;
    ctx.textAlign = 'center';
    ctx.fillText('No semester data to chart yet.', W / 2, H / 2);
    return;
  }

  const pad = { top: 24, right: 24, bottom: 40, left: 40 };
  const chartW = W - pad.left - pad.right;
  const chartH = H - pad.top - pad.bottom;
  const maxScale = gradingScale === '4' ? 4 : 10;
  const vals = validSems.map(s => parseFloat(s.sgpa));

  // Grid lines
  const gridLines = 5;
  for (let i = 0; i <= gridLines; i++) {
    const y = pad.top + chartH - (i / gridLines) * chartH;
    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(W - pad.right, y); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = muted;
    ctx.font = `11px 'DM Mono', monospace`;
    ctx.textAlign = 'right';
    ctx.fillText(((i / gridLines) * maxScale).toFixed(1), pad.left - 6, y + 4);
  }

  // Line
  const xStep = validSems.length > 1 ? chartW / (validSems.length - 1) : chartW / 2;
  const toX = i => pad.left + (validSems.length > 1 ? i * xStep : chartW / 2);
  const toY = v => pad.top + chartH - (v / maxScale) * chartH;

  // Area fill
  const grad = ctx.createLinearGradient(0, pad.top, 0, pad.top + chartH);
  grad.addColorStop(0, isDark ? 'rgba(124,255,212,0.25)' : 'rgba(0,168,122,0.2)');
  grad.addColorStop(1, 'transparent');
  ctx.beginPath();
  ctx.moveTo(toX(0), toY(vals[0]));
  for (let i = 1; i < vals.length; i++) ctx.lineTo(toX(i), toY(vals[i]));
  ctx.lineTo(toX(vals.length - 1), pad.top + chartH);
  ctx.lineTo(toX(0), pad.top + chartH);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();

  // Line stroke
  ctx.beginPath();
  ctx.moveTo(toX(0), toY(vals[0]));
  for (let i = 1; i < vals.length; i++) ctx.lineTo(toX(i), toY(vals[i]));
  ctx.strokeStyle = accent;
  ctx.lineWidth = 2.5;
  ctx.lineJoin = 'round';
  ctx.stroke();

  // Dots + labels
  vals.forEach((v, i) => {
    const x = toX(i), y = toY(v);
    ctx.beginPath();
    ctx.arc(x, y, 5, 0, Math.PI * 2);
    ctx.fillStyle = accent;
    ctx.fill();
    ctx.strokeStyle = bg;
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // X label
    ctx.fillStyle = muted;
    ctx.font = `11px 'DM Mono', monospace`;
    ctx.textAlign = 'center';
    const shortLabel = (validSems[i].label || `S${i+1}`).replace('Semester ', 'S');
    ctx.fillText(shortLabel, x, H - 8);

    // Value
    ctx.fillStyle = fg;
    ctx.font = `bold 11px 'DM Mono', monospace`;
    ctx.fillText(v.toFixed(2), x, y - 10);
  });
}

/* ── Clear ── */
function clearSGPA() {
  if (!confirm('Clear all subjects?')) return;
  subjects = [];
  renderSubjects();
  calculateSGPA();
  saveState();
  showToast('Cleared all subjects.');
}

function clearCGPA() {
  if (!confirm('Clear all semesters?')) return;
  semesters = [];
  renderSemesters();
  calculateCGPA();
  drawChart();
  saveState();
  showToast('Cleared all semesters.');
}

/* ── Export ── */
function exportData(type) {
  let content = '';
  if (type === 'sgpa') {
    let tw = 0, tc = 0;
    content += 'GradeFlow — SGPA Export\n';
    content += '═══════════════════════════\n';
    content += `Grading Scale: ${gradingScale}\n\n`;
    content += `${'Subject'.padEnd(24)} ${'Credits'.padEnd(8)} ${'Grade'.padEnd(8)} Points\n`;
    content += '─'.repeat(54) + '\n';
    subjects.forEach(s => {
      const cr = parseFloat(s.credits);
      const res = getPointsFromInput(s.gradeInput, gradingScale);
      if (!isNaN(cr) && cr > 0 && res) {
        tw += cr * res.points;
        tc += cr;
        content += `${(s.name||'—').padEnd(24)} ${String(cr).padEnd(8)} ${res.label.padEnd(8)} ${res.points.toFixed(2)}\n`;
      }
    });
    const sgpa = tc > 0 ? tw / tc : 0;
    content += '─'.repeat(54) + '\n';
    content += `Total Credits: ${tc}    SGPA: ${sgpa.toFixed(4)}\n`;
    content += `Grade: ${cgpaToLetter(sgpa, gradingScale)}\n`;
  } else {
    let tw = 0, tc = 0;
    content += 'GradeFlow — CGPA Export\n';
    content += '═══════════════════════════\n\n';
    content += `${'Semester'.padEnd(16)} ${'SGPA'.padEnd(8)} ${'Credits'.padEnd(10)} Weighted\n`;
    content += '─'.repeat(50) + '\n';
    semesters.forEach(sem => {
      const sgpa = parseFloat(sem.sgpa);
      const cr = parseFloat(sem.credits);
      if (!isNaN(sgpa) && !isNaN(cr)) {
        tw += sgpa * cr; tc += cr;
        content += `${(sem.label||'—').padEnd(16)} ${sgpa.toFixed(2).padEnd(8)} ${String(cr).padEnd(10)} ${(sgpa*cr).toFixed(2)}\n`;
      }
    });
    const cgpa = tc > 0 ? tw / tc : 0;
    content += '─'.repeat(50) + '\n';
    content += `Total Credits: ${tc}    CGPA: ${cgpa.toFixed(4)}\n`;
    content += `Grade: ${cgpaToLetter(cgpa, gradingScale)}\n`;
  }

  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = make('a');
  a.href = url; a.download = `gradeflow-${type}-${Date.now()}.txt`;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast('✓ Exported successfully!');
}

/* ── Persist State ── */
function saveState() {
  try {
    localStorage.setItem('gf_subjects', JSON.stringify(subjects));
    localStorage.setItem('gf_semesters', JSON.stringify(semesters));
    localStorage.setItem('gf_scale', gradingScale);
    localStorage.setItem('gf_counter', idCounter);
  } catch(e) {}
}

function loadState() {
  try {
    const subj = localStorage.getItem('gf_subjects');
    const sems = localStorage.getItem('gf_semesters');
    const scale = localStorage.getItem('gf_scale');
    const cnt = localStorage.getItem('gf_counter');
    if (subj) subjects = JSON.parse(subj);
    if (sems) semesters = JSON.parse(sems);
    if (scale) {
      gradingScale = scale;
      const radio = document.querySelector(`input[name="scale"][value="${scale}"]`);
      if (radio) radio.checked = true;
    }
    if (cnt) idCounter = parseInt(cnt);
  } catch(e) {}
}

/* ── Toast ── */
function showToast(msg, duration = 2500) {
  const t = $('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove('show'), duration);
}

/* ── Utils ── */
function escHtml(str) {
  return String(str ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/* ── Resize chart on window resize ── */
let resizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(drawChart, 120);
});
