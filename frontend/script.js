/* ═══════════════════════════════════════════════════════════════
   THEME TOGGLE
   ═══════════════════════════════════════════════════════════════ */
(function initTheme() {
  const saved = localStorage.getItem('gradematrix-theme');
  if (saved === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
  }
})();

function toggleTheme() {
  const root = document.documentElement;
  const icon = document.getElementById('theme-icon');
  const isDark = root.getAttribute('data-theme') === 'dark';

  // Spin-out animation
  icon.classList.add('spin');

  setTimeout(() => {
    if (isDark) {
      root.removeAttribute('data-theme');
      icon.textContent = '🌙';
      localStorage.setItem('gradematrix-theme', 'light');
    } else {
      root.setAttribute('data-theme', 'dark');
      icon.textContent = '☀️';
      localStorage.setItem('gradematrix-theme', 'dark');
    }
    // Spin-in
    icon.classList.remove('spin');
  }, 250);
}

// Sync icon on DOM ready (in case theme was set before icon existed)
document.addEventListener('DOMContentLoaded', () => {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const icon = document.getElementById('theme-icon');
  if (icon) icon.textContent = isDark ? '☀️' : '🌙';
});

/* ═══════════════════════════════════════════════════════════════
   CONSTANTS & STATE
   ═══════════════════════════════════════════════════════════════ */
const API = 'http://localhost:5000/api';

// Prolog query definitions
const QUERIES = [
  { type: 'sgpa', label: 'SGPA', icon: '🎓', desc: 'Semester Grade Point Average', unit: '/ 10', formatVal: v => typeof v === 'number' ? v.toFixed(2) : v },
  { type: 'cgpa', label: 'CGPA', icon: '🏆', desc: 'Cumulative GPA', unit: '/ 10', evenOnly: true, formatVal: v => typeof v === 'number' ? v.toFixed(2) : v },
  { type: 'total_credits', label: 'Total Credits', icon: '⭐', desc: 'Credits earned', unit: 'credits', formatVal: v => v },
  { type: 'grace_used', label: 'Grace Used', icon: '🕊️', desc: 'Grace marks applied (max 6)', unit: 'marks', formatVal: v => v },
  { type: 'result_status', label: 'Result Status', icon: '📊', desc: 'PASS / ATKT / FAIL', unit: null, formatVal: v => v },
  { type: 'number_of_backlogs', label: 'Backlogs', icon: '⚠️', desc: 'Number of failed subjects', unit: 'subject(s)', formatVal: v => v },
  { type: 'next_year_eligible', label: 'Next Year Eligibility', icon: '🎯', desc: 'Check if eligible for next year', unit: null, formatVal: v => { if (typeof v === 'string' && v.includes('|')) { return v.split('|')[0]; } return v; } },
];

let prologResults = {};    // { query_type: result_obj }
let prologAnalysis = [];   // subject-level analysis
let prologStudents = [];   // cached students list
let editModalCallback = null;
let currentComponents = []; // components for currently selected subject in marks form

/* ═══════════════════════════════════════════════════════════════
   TAB SWITCHING
   ═══════════════════════════════════════════════════════════════ */
function switchTab(tab) {
  ['student', 'subject', 'component', 'marks'].forEach(t => {
    document.getElementById('form-' + t).classList.toggle('hidden', t !== tab);
    document.getElementById('tab-' + t).classList.toggle('active', t === tab);
  });
  // Remember the active tab so it survives page reloads
  sessionStorage.setItem('gradematrix-active-tab', tab);
  // Load subjects into component form dropdown when switching to component tab
  if (tab === 'component') {
    loadAllSubjectsDropdown();
  }
}

// Restore the last active tab on page load (e.g. after Live Server reload)
document.addEventListener('DOMContentLoaded', () => {
  const savedTab = sessionStorage.getItem('gradematrix-active-tab');
  if (savedTab && ['student', 'subject', 'component', 'marks'].includes(savedTab)) {
    switchTab(savedTab);
  }
});

/* ═══════════════════════════════════════════════════════════════
   ALERT HELPER
   ═══════════════════════════════════════════════════════════════ */
function showDataAlert(msg, type) {
  const el = document.getElementById('data-alert');
  el.className = 'alert alert-' + type;
  el.innerHTML = '<span>' + (type === 'success' ? '✅' : '❌') + '</span>' + msg;
  el.classList.remove('hidden');
  setTimeout(() => el.classList.add('hidden'), 4000);
}

/* ═══════════════════════════════════════════════════════════════
   LIVE TOTAL (Component-Based)
   ═══════════════════════════════════════════════════════════════ */
function updateLiveTotal() {
  const inputs = document.querySelectorAll('#marksContainer input[type="number"]');
  let total = 0;
  let maxTotal = 0;
  inputs.forEach(inp => {
    total += parseInt(inp.value) || 0;
    maxTotal += parseInt(inp.getAttribute('data-max')) || 0;
  });
  const el = document.getElementById('live-total');
  if (el) el.textContent = total + ' / ' + maxTotal;
}

/* ═══════════════════════════════════════════════════════════════
   LOAD ALL SUBJECTS INTO DROPDOWN (for component form)
   ═══════════════════════════════════════════════════════════════ */
async function loadAllSubjectsDropdown() {
  const sel = document.getElementById('comp-subid');
  try {
    const res = await fetch(API + '/subjects');
    const data = await res.json();
    sel.innerHTML = '<option value="">— Select subject —</option>';
    if (Array.isArray(data)) {
      data.forEach(s => {
        const opt = document.createElement('option');
        opt.value = s.subject_id;
        opt.textContent = '[' + s.subject_id + '] ' + s.subject_name + ' (Sem ' + s.semester + ')';
        sel.appendChild(opt);
      });
    }
  } catch {
    sel.innerHTML = '<option value="">Error loading subjects</option>';
  }
}

/* ═══════════════════════════════════════════════════════════════
   LOAD SEMESTER SUBJECTS FOR MARKS FORM
   ═══════════════════════════════════════════════════════════════ */
async function loadSemesterSubjects() {
  const sem = document.getElementById('m-sem').value;
  const sel = document.getElementById('m-subid');
  sel.innerHTML = '';
  // Clear components when semester changes
  document.getElementById('marksContainer').innerHTML = '';
  document.getElementById('live-total-wrapper').classList.add('hidden');
  currentComponents = [];

  if (!sem) {
    sel.innerHTML = '<option value="">— Select semester first —</option>';
    sel.disabled = true;
    return;
  }
  try {
    const res = await fetch(API + '/subjects?semester=' + sem);
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) {
      sel.innerHTML = '<option value="">No subjects for this semester</option>';
      sel.disabled = true;
      return;
    }
    sel.innerHTML = '<option value="">— Select subject —</option>';
    data.forEach(s => {
      const opt = document.createElement('option');
      opt.value = s.subject_id;
      opt.textContent = '[' + s.subject_id + '] ' + s.subject_name + ' (' + s.credits + ' cr)';
      sel.appendChild(opt);
    });
    sel.disabled = false;
  } catch {
    sel.innerHTML = '<option value="">Error loading subjects</option>';
    sel.disabled = true;
  }
}

/* ═══════════════════════════════════════════════════════════════
   LOAD SUBJECT COMPONENTS — Dynamic Input Rendering
   ═══════════════════════════════════════════════════════════════ */
async function loadSubjectComponents() {
  const subjectId = document.getElementById('m-subid').value;
  const container = document.getElementById('marksContainer');
  container.innerHTML = '';
  currentComponents = [];

  if (!subjectId) {
    document.getElementById('live-total-wrapper').classList.add('hidden');
    return;
  }

  try {
    const res = await fetch(API + '/components/' + subjectId);
    const data = await res.json();

    if (!Array.isArray(data) || data.length === 0) {
      container.innerHTML = '<div style="padding:0.75rem;color:#94a3b8;font-size:0.82rem;border:1px dashed var(--border-main);border-radius:6px;text-align:center;">⚠️ No components defined for this subject. Add components first in the Component tab.</div>';
      document.getElementById('live-total-wrapper').classList.add('hidden');
      return;
    }

    currentComponents = data;

    const grid = document.createElement('div');
    grid.className = 'form-grid';
    grid.style.marginBottom = '0.85rem';

    data.forEach(comp => {
      const div = document.createElement('div');
      div.className = 'form-group';
      const passInfo = comp.passing_marks > 0 ? ' · Pass: ' + comp.passing_marks : '';
      div.innerHTML =
        '<label for="comp-mark-' + comp.component_id + '">' + comp.component_name + ' (Max: ' + comp.max_marks + passInfo + ')</label>' +
        '<input type="number" id="comp-mark-' + comp.component_id + '" ' +
        'name="comp_' + comp.component_id + '" ' +
        'min="0" max="' + comp.max_marks + '" ' +
        'data-max="' + comp.max_marks + '" ' +
        'data-compid="' + comp.component_id + '" ' +
        'placeholder="0 – ' + comp.max_marks + '" required ' +
        'oninput="updateLiveTotal()">';
      grid.appendChild(div);
    });

    container.appendChild(grid);
    document.getElementById('live-total-wrapper').classList.remove('hidden');
    updateLiveTotal();
  } catch {
    container.innerHTML = '<div style="padding:0.75rem;color:#dc2626;font-size:0.82rem;">❌ Error loading components</div>';
  }
}

/* ═══════════════════════════════════════════════════════════════
   SUBMIT FORMS (ADD)
   ═══════════════════════════════════════════════════════════════ */
async function submitStudent(e) {
  e.preventDefault();
  try {
    const res = await fetch(API + '/student', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        roll_no: document.getElementById('s-roll').value,
        name: document.getElementById('s-name').value,
        seat_no: document.getElementById('s-seat').value,
        category: document.getElementById('s-cat').value,
        year: document.getElementById('s-year').value,
        semester: document.getElementById('s-sem').value,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    showDataAlert('Student added & Prolog KB updated! ✨', 'success');
    e.target.reset();
    loadPrologStudents(); // Refresh the Prolog student dropdown
  } catch (err) { showDataAlert(err.message, 'error'); }
}

async function submitSubject(e) {
  e.preventDefault();
  try {
    const res = await fetch(API + '/subject', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subject_id: document.getElementById('sub-id').value,
        subject_name: document.getElementById('sub-name').value,
        credits: document.getElementById('sub-credits').value,
        semester: document.getElementById('sub-sem').value,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    showDataAlert('Subject added & Prolog KB updated! ✨', 'success');
    e.target.reset();
  } catch (err) { showDataAlert(err.message, 'error'); }
}

async function submitComponent(e) {
  e.preventDefault();
  try {
    const res = await fetch(API + '/component', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subject_id: document.getElementById('comp-subid').value,
        component_name: document.getElementById('comp-name').value,
        max_marks: document.getElementById('comp-max').value,
        passing_marks: document.getElementById('comp-pass').value || 0,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    showDataAlert('Component added & Prolog KB updated! ✨', 'success');
    // Reset only the component-specific fields, keep subject selected
    document.getElementById('comp-name').value = '';
    document.getElementById('comp-max').value = '';
    document.getElementById('comp-pass').value = '0';
  } catch (err) { showDataAlert(err.message, 'error'); }
}

async function submitMarks(e) {
  e.preventDefault();

  // Collect dynamic component marks
  const marksList = [];
  const inputs = document.querySelectorAll('#marksContainer input[type="number"]');
  inputs.forEach(inp => {
    marksList.push({
      component_id: inp.getAttribute('data-compid'),
      obtained_marks: inp.value,
    });
  });

  if (marksList.length === 0) {
    showDataAlert('No components to submit marks for. Select a subject with components.', 'error');
    return;
  }

  try {
    const res = await fetch(API + '/marks', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        roll_no: document.getElementById('m-roll').value,
        subject_id: document.getElementById('m-subid').value,
        semester: document.getElementById('m-sem').value,
        credits_earned: document.getElementById('m-credits').value,
        marks: marksList,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    showDataAlert('Marks added & Prolog KB updated! ✨', 'success');
    // Only clear the obtained marks inputs — keep form selections intact
    inputs.forEach(inp => inp.value = '');
    updateLiveTotal();
  } catch (err) { showDataAlert(err.message, 'error'); }
}

/* ═══════════════════════════════════════════════════════════════
   FETCH & RENDER ALL DATA TABLES
   ═══════════════════════════════════════════════════════════════ */
async function fetchAllData() {
  const btn = document.getElementById('show-data-btn');
  btn.disabled = true;
  btn.textContent = '⏳ Loading...';
  try {
    const [students, subjects, components, marks, results] = await Promise.all([
      fetch(API + '/students').then(r => r.json()),
      fetch(API + '/subjects').then(r => r.json()),
      fetch(API + '/components').then(r => r.json()),
      fetch(API + '/marks').then(r => r.json()),
      fetch(API + '/results').then(r => r.json()),
    ]);
    renderStudentsTable(Array.isArray(students) ? students : []);
    renderSubjectsTable(Array.isArray(subjects) ? subjects : [], Array.isArray(components) ? components : []);
    renderComponentsTable(Array.isArray(components) ? components : []);
    renderMarksTable(Array.isArray(marks) ? marks : []);
    renderResultsTable(Array.isArray(results) ? results : []);
    document.getElementById('data-tables').classList.remove('hidden');
    btn.textContent = '🔄 Refresh Data';
    loadPrologStudents(); // Refresh Prolog dropdown too
  } catch {
    showDataAlert('Failed to fetch data. Is the backend running?', 'error');
    btn.textContent = '👁 Show Data';
  }
  btn.disabled = false;
}

function renderStudentsTable(data) {
  const tbody = document.getElementById('students-tbody');
  document.getElementById('students-count').textContent = data.length + ' record' + (data.length !== 1 ? 's' : '');
  if (data.length === 0) { tbody.innerHTML = '<tr><td colspan="7" class="empty-table">No students added yet.</td></tr>'; return; }
  tbody.innerHTML = data.map(s => `<tr>
    <td>${s.roll_no}</td><td>${s.name}</td><td>${s.seat_no}</td><td>${s.category}</td><td>${s.year}</td><td>${s.semester}</td>
    <td class="actions-cell">
      <button class="btn btn-edit btn-sm" onclick='editStudent(${JSON.stringify(s).replace(/'/g,"&#39;")})'>✏️</button>
      <button class="btn btn-danger btn-sm" onclick="deleteStudent(${s.roll_no})">🗑️</button>
    </td>
  </tr>`).join('');
}

function renderSubjectsTable(data, components) {
  const tbody = document.getElementById('subjects-tbody');
  document.getElementById('subjects-count').textContent = data.length + ' record' + (data.length !== 1 ? 's' : '');
  if (data.length === 0) { tbody.innerHTML = '<tr><td colspan="6" class="empty-table">No subjects added yet.</td></tr>'; return; }

  // Build component summary per subject
  const compMap = {};
  if (Array.isArray(components)) {
    components.forEach(c => {
      if (!compMap[c.subject_id]) compMap[c.subject_id] = [];
      compMap[c.subject_id].push(c.component_name + '(' + c.max_marks + ')');
    });
  }

  tbody.innerHTML = data.map(s => {
    const compStr = compMap[s.subject_id] ? compMap[s.subject_id].join(', ') : '<span style="color:#94a3b8">None</span>';
    return `<tr>
    <td>${s.subject_id}</td><td>${s.subject_name}</td><td>${s.credits}</td><td>${s.semester}</td>
    <td style="font-size:0.78rem;">${compStr}</td>
    <td class="actions-cell">
      <button class="btn btn-edit btn-sm" onclick='editSubject(${JSON.stringify(s).replace(/'/g,"&#39;")})'>✏️</button>
      <button class="btn btn-danger btn-sm" onclick="deleteSubject('${s.subject_id}')">🗑️</button>
    </td>
  </tr>`;
  }).join('');
}

function renderComponentsTable(data) {
  const tbody = document.getElementById('components-tbody');
  document.getElementById('components-count').textContent = data.length + ' record' + (data.length !== 1 ? 's' : '');
  if (data.length === 0) { tbody.innerHTML = '<tr><td colspan="6" class="empty-table">No components added yet.</td></tr>'; return; }
  tbody.innerHTML = data.map(c => `<tr>
    <td>${c.component_id}</td>
    <td>[${c.subject_id}] ${c.subject_name || ''}</td>
    <td><strong>${c.component_name}</strong></td>
    <td>${c.max_marks}</td>
    <td>${c.passing_marks || 0}</td>
    <td class="actions-cell">
      <button class="btn btn-edit btn-sm" onclick='editComponent(${JSON.stringify(c).replace(/'/g,"&#39;")})'>✏️</button>
      <button class="btn btn-danger btn-sm" onclick="deleteComponent(${c.component_id})">🗑️</button>
    </td>
  </tr>`).join('');
}

function renderMarksTable(data) {
  const tbody = document.getElementById('marks-tbody');
  document.getElementById('marks-count').textContent = data.length + ' record' + (data.length !== 1 ? 's' : '');
  if (data.length === 0) { tbody.innerHTML = '<tr><td colspan="9" class="empty-table">No marks added yet.</td></tr>'; return; }
  tbody.innerHTML = data.map(m => {
    return `<tr>
      <td>${m.roll_no}</td><td>${m.student_name}</td>
      <td>[${m.subject_id}] ${m.subject_name}</td>
      <td><strong>${m.component_name}</strong></td>
      <td>${m.semester}</td>
      <td>${m.obtained_marks}</td>
      <td>${m.max_marks}</td>
      <td><strong style="color:#0891b2">${m.credits_earned}</strong></td>
      <td class="actions-cell">
        <button class="btn btn-danger btn-sm" onclick="deleteMarkEntry(${m.mark_id})">🗑️</button>
      </td>
    </tr>`;
  }).join('');
}

function renderResultsTable(data) {
  const tbody = document.getElementById('results-tbody');
  const section = document.getElementById('results-section');
  document.getElementById('results-count').textContent = data.length + ' record' + (data.length !== 1 ? 's' : '');
  if (data.length === 0) { section.style.display = 'none'; return; }
  section.style.display = '';
  tbody.innerHTML = data.map(r => {
    const v = (r.result_status || '').toString().toUpperCase();
    let cls = 'badge-pass';
    if (v.includes('FAIL')) cls = 'badge-fail';
    else if (v.includes('ATKT')) cls = 'badge-atkt';
    else if (v.includes('GRACE')) cls = 'badge-grace';
    return `<tr>
      <td>${r.roll_no}</td><td>${r.student_name}</td><td>${r.semester}</td>
      <td><strong style="color:#6366f1">${r.sgpa != null ? Number(r.sgpa).toFixed(2) : '—'}</strong></td>
      <td>${r.total_credits ?? '—'}</td><td>${r.grace_used ?? 0}</td><td>${r.number_of_backlogs ?? 0}</td>
      <td><span class="result-status-badge ${cls}">${r.result_status || '—'}</span></td>
    </tr>`;
  }).join('');
}

/* ═══════════════════════════════════════════════════════════════
   DELETE HANDLERS
   ═══════════════════════════════════════════════════════════════ */
async function deleteStudent(rollNo) {
  if (!confirm('Delete student ' + rollNo + '? This will also delete their marks and results.')) return;
  try {
    const res = await fetch(API + '/student/' + rollNo, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    showDataAlert(data.message, 'success');
    fetchAllData();
    loadPrologStudents(); // Refresh Prolog dropdown
  } catch (err) { showDataAlert(err.message, 'error'); }
}

async function deleteSubject(subjectId) {
  if (!confirm('Delete subject ' + subjectId + '? This will also delete all components and marks for this subject.')) return;
  try {
    const res = await fetch(API + '/subject/' + subjectId, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    showDataAlert(data.message, 'success');
    fetchAllData();
  } catch (err) { showDataAlert(err.message, 'error'); }
}

async function deleteComponent(componentId) {
  if (!confirm('Delete component ' + componentId + '? This will also delete all marks for this component.')) return;
  try {
    const res = await fetch(API + '/component/' + componentId, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    showDataAlert(data.message, 'success');
    fetchAllData();
  } catch (err) { showDataAlert(err.message, 'error'); }
}

async function deleteMarks(rollNo, subjectId, semester) {
  if (!confirm('Delete all marks for Roll ' + rollNo + ', Subject ' + subjectId + ', Sem ' + semester + '?')) return;
  try {
    const res = await fetch(API + '/marks/' + rollNo + '/' + subjectId + '/' + semester, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    showDataAlert(data.message, 'success');
    fetchAllData();
  } catch (err) { showDataAlert(err.message, 'error'); }
}

async function deleteMarkEntry(markId) {
  if (!confirm('Delete this mark entry?')) return;
  try {
    // Use a simple fetch to delete by mark_id — we need a small workaround
    // since the backend doesn't have a single-mark delete endpoint by mark_id directly,
    // we'll call the general marks endpoint
    const res = await fetch(API + '/marks', { method: 'GET' });
    const allMarks = await res.json();
    const mark = allMarks.find(m => m.mark_id === markId);
    if (!mark) { showDataAlert('Mark entry not found', 'error'); return; }

    // Delete all marks for this student+subject+semester, then re-add the others
    const siblingMarks = allMarks.filter(m =>
      m.roll_no === mark.roll_no &&
      m.subject_id === mark.subject_id &&
      m.semester === mark.semester &&
      m.mark_id !== markId
    );

    // Delete all for this subject
    const delRes = await fetch(API + '/marks/' + mark.roll_no + '/' + mark.subject_id + '/' + mark.semester, { method: 'DELETE' });
    if (!delRes.ok) { const d = await delRes.json(); throw new Error(d.error); }

    // Re-add siblings if any
    if (siblingMarks.length > 0) {
      const reAddRes = await fetch(API + '/marks', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roll_no: mark.roll_no,
          subject_id: mark.subject_id,
          semester: mark.semester,
          credits_earned: siblingMarks[0].credits_earned,
          marks: siblingMarks.map(m => ({ component_id: m.component_id, obtained_marks: m.obtained_marks })),
        }),
      });
      if (!reAddRes.ok) { const d = await reAddRes.json(); throw new Error(d.error); }
    }

    showDataAlert('Mark entry deleted & Prolog KB updated.', 'success');
    fetchAllData();
  } catch (err) { showDataAlert(err.message, 'error'); }
}

/* ═══════════════════════════════════════════════════════════════
   EDIT MODAL
   ═══════════════════════════════════════════════════════════════ */
function openEditModal(title, fields, callback) {
  document.getElementById('edit-modal-title').textContent = title;
  const container = document.getElementById('edit-modal-fields');
  container.innerHTML = '';
  fields.forEach(f => {
    const div = document.createElement('div');
    div.className = 'form-group';
    let inputHTML = '';
    if (f.type === 'select') {
      inputHTML = '<select id="edit-' + f.key + '" ' + (f.disabled ? 'disabled' : '') + '>' +
        f.options.map(o => '<option value="' + o.value + '"' + (o.value == f.value ? ' selected' : '') + '>' + o.label + '</option>').join('') +
        '</select>';
    } else {
      inputHTML = '<input id="edit-' + f.key + '" type="' + (f.type || 'text') + '"' +
        ' value="' + (f.value ?? '') + '"' +
        (f.min != null ? ' min="' + f.min + '"' : '') +
        (f.max != null ? ' max="' + f.max + '"' : '') +
        (f.disabled ? ' disabled' : '') +
        (f.required !== false ? ' required' : '') + '>';
    }
    div.innerHTML = '<label for="edit-' + f.key + '">' + f.label + '</label>' + inputHTML;
    container.appendChild(div);
  });
  editModalCallback = callback;
  document.getElementById('edit-modal').classList.remove('hidden');
}

function closeEditModal() {
  document.getElementById('edit-modal').classList.add('hidden');
  editModalCallback = null;
}

async function submitEditModal(e) {
  e.preventDefault();
  if (editModalCallback) await editModalCallback();
}

/* ─── Edit Student ─── */
function editStudent(s) {
  openEditModal('Edit Student — Roll ' + s.roll_no, [
    { key: 'roll_no', label: 'Roll Number', type: 'number', value: s.roll_no, disabled: true },
    { key: 'name', label: 'Full Name', value: s.name },
    { key: 'seat_no', label: 'Seat Number', value: s.seat_no },
    { key: 'category', label: 'Category', type: 'select', value: s.category,
      options: ['General','OBC','SC','ST','EWS'].map(c => ({ value: c, label: c })) },
    { key: 'year', label: 'Year', type: 'select', value: s.year,
      options: [1,2,3,4].map(y => ({ value: y, label: 'Year ' + y })) },
    { key: 'semester', label: 'Semester', type: 'select', value: s.semester,
      options: [1,2,3,4,5,6,7,8].map(x => ({ value: x, label: 'Semester ' + x })) },
  ], async () => {
    try {
      const res = await fetch(API + '/student/' + s.roll_no, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: document.getElementById('edit-name').value,
          seat_no: document.getElementById('edit-seat_no').value,
          category: document.getElementById('edit-category').value,
          year: document.getElementById('edit-year').value,
          semester: document.getElementById('edit-semester').value,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showDataAlert(data.message, 'success');
      closeEditModal();
      fetchAllData();
      loadPrologStudents(); // Refresh Prolog dropdown
    } catch (err) { showDataAlert(err.message, 'error'); }
  });
}

/* ─── Edit Subject ─── */
function editSubject(s) {
  openEditModal('Edit Subject — ' + s.subject_id, [
    { key: 'subject_id', label: 'Subject ID', value: s.subject_id, disabled: true },
    { key: 'subject_name', label: 'Subject Name', value: s.subject_name },
    { key: 'credits', label: 'Credits', type: 'number', value: s.credits, min: 1, max: 6 },
    { key: 'semester', label: 'Semester', type: 'select', value: s.semester,
      options: [1,2,3,4,5,6,7,8].map(x => ({ value: x, label: 'Semester ' + x })) },
  ], async () => {
    try {
      const res = await fetch(API + '/subject/' + s.subject_id, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject_name: document.getElementById('edit-subject_name').value,
          credits: document.getElementById('edit-credits').value,
          semester: document.getElementById('edit-semester').value,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showDataAlert(data.message, 'success');
      closeEditModal();
      fetchAllData();
    } catch (err) { showDataAlert(err.message, 'error'); }
  });
}

/* ─── Edit Component ─── */
function editComponent(c) {
  openEditModal('Edit Component — ID ' + c.component_id, [
    { key: 'component_id', label: 'Component ID', type: 'number', value: c.component_id, disabled: true },
    { key: 'subject_id', label: 'Subject', value: c.subject_id + ' — ' + (c.subject_name || ''), disabled: true },
    { key: 'component_name', label: 'Component Name', value: c.component_name },
    { key: 'max_marks', label: 'Max Marks', type: 'number', value: c.max_marks, min: 1 },
    { key: 'passing_marks', label: 'Passing Marks', type: 'number', value: c.passing_marks || 0, min: 0 },
  ], async () => {
    try {
      const res = await fetch(API + '/component/' + c.component_id, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          component_name: document.getElementById('edit-component_name').value,
          max_marks: document.getElementById('edit-max_marks').value,
          passing_marks: document.getElementById('edit-passing_marks').value,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showDataAlert(data.message, 'success');
      closeEditModal();
      fetchAllData();
    } catch (err) { showDataAlert(err.message, 'error'); }
  });
}

/* ═══════════════════════════════════════════════════════════════
   PROLOG — SETUP & INTERACTION
   ═══════════════════════════════════════════════════════════════ */

// Build query buttons
function buildQueryButtons() {
  const grid = document.getElementById('query-grid');
  grid.innerHTML = QUERIES.map(q => {
    return `<button class="query-btn" id="query-btn-${q.type}" onclick="runPrologQuery('${q.type}')"
      disabled title="${q.desc}">
      <span class="q-icon">${q.icon}</span>
      <span class="q-label">${q.label}</span>
    </button>`;
  }).join('');
}
buildQueryButtons();

// Load students into prolog selector
async function loadPrologStudents() {
  try {
    const res = await fetch(API + '/students');
    if (!res.ok) throw new Error('API returned ' + res.status);
    const data = await res.json();
    prologStudents = Array.isArray(data) ? data : [];
    const sel = document.getElementById('p-student');
    const prevVal = sel.value; // Preserve current selection
    sel.innerHTML = '<option value="">— Choose a student —</option>';
    prologStudents.forEach(s => {
      const opt = document.createElement('option');
      opt.value = s.roll_no;
      opt.textContent = '[' + s.roll_no + '] ' + s.name;
      sel.appendChild(opt);
    });
    // Restore previous selection if it still exists
    if (prevVal && prologStudents.some(s => String(s.roll_no) === String(prevVal))) {
      sel.value = prevVal;
    }
  } catch (err) {
    console.warn('loadPrologStudents failed:', err.message);
    // Retry after 3 seconds if this was the initial load
    if (!loadPrologStudents._retried) {
      loadPrologStudents._retried = true;
      setTimeout(loadPrologStudents, 3000);
    }
  }
}
loadPrologStudents();

function onPrologStudentChange() {
  prologResults = {};
  updatePrologUI();
  fetchPrologAnalysis();
}

function onPrologSemChange() {
  prologResults = {};
  updatePrologUI();
  fetchPrologAnalysis();
}

async function fetchPrologAnalysis() {
  const roll = document.getElementById('p-student').value;
  const sem = document.getElementById('p-sem').value;
  if (!roll || !sem) { prologAnalysis = []; return; }
  try {
    const res = await fetch(API + '/student/' + roll + '/analysis?semester=' + sem);
    const data = await res.json();
    prologAnalysis = Array.isArray(data) ? data : [];
  } catch { prologAnalysis = []; }
}

function updatePrologUI() {
  const roll = document.getElementById('p-student').value;
  const sem = document.getElementById('p-sem').value;
  const hasSelection = roll && sem;
  const isEvenSem = sem && parseInt(sem) % 2 === 0;

  // Student info chip
  const infoEl = document.getElementById('prolog-student-info');
  if (roll) {
    const s = prologStudents.find(x => String(x.roll_no) === String(roll));
    if (s) {
      infoEl.innerHTML = [['Roll No', s.roll_no], ['Name', s.name], ['Seat', s.seat_no], ['Category', s.category], ['Year', s.year]]
        .map(([k, v]) => '<span><span class="info-label">' + k + ': </span><span class="info-value">' + v + '</span></span>').join(' ');
      infoEl.classList.remove('hidden');
    }
  } else {
    infoEl.classList.add('hidden');
  }

  // Enable/disable query buttons
  QUERIES.forEach(q => {
    const btn = document.getElementById('query-btn-' + q.type);
    const disabled = !hasSelection || (q.evenOnly && !isEvenSem);
    btn.disabled = disabled;

    // Even-only chip
    let evenChip = btn.querySelector('.even-only-chip');
    if (q.evenOnly && !isEvenSem && hasSelection) {
      if (!evenChip) {
        evenChip = document.createElement('span');
        evenChip.className = 'even-only-chip';
        evenChip.textContent = 'Even sem only';
        btn.appendChild(evenChip);
      }
    } else if (evenChip) {
      evenChip.remove();
    }

    // Done chip
    let doneChip = btn.querySelector('.done-chip');
    if (prologResults[q.type] && prologResults[q.type].success) {
      if (!doneChip) {
        doneChip = document.createElement('span');
        doneChip.className = 'done-chip';
        doneChip.textContent = 'Done ✓';
        btn.appendChild(doneChip);
      }
      btn.classList.add('done');
    } else {
      if (doneChip) doneChip.remove();
      btn.classList.remove('done');
    }
  });

  // Empty states
  document.getElementById('prolog-empty-selection').classList.toggle('hidden', hasSelection);
  const hasAny = Object.keys(prologResults).length > 0;
  document.getElementById('prolog-empty-results').classList.toggle('hidden', !hasSelection || hasAny);

  // Results panel
  if (hasAny) {
    renderPrologResults();
  } else {
    document.getElementById('prolog-results').classList.add('hidden');
  }
}

/* ─── Run Prolog Query ─── */
async function runPrologQuery(queryType) {
  const roll = document.getElementById('p-student').value;
  const sem = document.getElementById('p-sem').value;
  if (!roll || !sem) {
    document.getElementById('prolog-error').textContent = '❌ Please select a student and semester first.';
    document.getElementById('prolog-error').classList.remove('hidden');
    return;
  }
  document.getElementById('prolog-error').classList.add('hidden');

  // Show loading
  const btn = document.getElementById('query-btn-' + queryType);
  const origIcon = btn.querySelector('.q-icon').textContent;
  btn.querySelector('.q-icon').textContent = '⏳';
  btn.disabled = true;

  try {
    const res = await fetch(API + '/prolog/query', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query_type: queryType, roll_no: parseInt(roll), semester: parseInt(sem) }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Query failed');
    prologResults[queryType] = data.result;
  } catch (err) {
    document.getElementById('prolog-error').textContent = '❌ ' + err.message;
    document.getElementById('prolog-error').classList.remove('hidden');
  }

  btn.querySelector('.q-icon').textContent = origIcon;
  btn.disabled = false;
  updatePrologUI();
}

/* ─── Render Prolog Results ─── */
function renderPrologResults() {
  const roll = document.getElementById('p-student').value;
  const sem = document.getElementById('p-sem').value;
  const s = prologStudents.find(x => String(x.roll_no) === String(roll));
  const panel = document.getElementById('prolog-results');
  panel.classList.remove('hidden');

  document.getElementById('prolog-results-title').textContent = 'Query Results — ' + (s ? s.name : roll) + ' · Semester ' + sem;

  const list = document.getElementById('prolog-results-list');
  list.innerHTML = '';

  QUERIES.forEach(q => {
    const res = prologResults[q.type];
    if (!res) return;

    const card = document.createElement('div');
    card.className = 'result-card';

    // Result display
    let resultHTML = '';
    if (res.success) {
      const val = q.formatVal(res.value);
      if (q.type === 'result_status') {
        resultHTML = statusBadgeHTML(val);
      } else if (q.type === 'next_year_eligible') {
        resultHTML = statusBadgeHTML(val === 'YES' ? 'ELIGIBLE' : 'NOT ELIGIBLE');
      } else {
        resultHTML = '<div style="display:flex;align-items:baseline;gap:8px;">' +
          '<div class="result-value">' + val + '</div>' +
          (q.unit ? '<span style="font-size:0.78rem;color:#94a3b8;">' + q.unit + '</span>' : '') +
          '</div>';
      }
    } else {
      resultHTML = '<div style="color:#dc2626;font-size:0.8rem;margin-top:4px;">❌ ' + (res.error || 'Query failed') + '</div>';
    }

    card.innerHTML = '<div class="result-display"><div class="result-label">' + q.icon + ' ' + q.label + '</div>' + resultHTML + '</div>';

    // Reasoning
    if (res.success) {
      const reasoning = buildReasoning(q.type);
      if (reasoning) card.innerHTML += reasoning;
    }

    list.appendChild(card);
  });
}

function statusBadgeHTML(val) {
  const v = (val || '').toString().toUpperCase();
  let cls = 'badge-pass', emoji = '✅';
  if (v.includes('FAIL') || v.includes('NOT')) { cls = 'badge-fail'; emoji = '❌'; }
  else if (v.includes('ATKT')) { cls = 'badge-atkt'; emoji = '⚡'; }
  else if (v.includes('GRACE')) { cls = 'badge-grace'; emoji = '🕊️'; }
  return '<span class="result-status-badge ' + cls + '">' + emoji + ' ' + val + '</span>';
}

/* ─── Reasoning Builder (Component-Based) ─── */
function buildReasoning(queryType) {
  const a = prologAnalysis;
  if (!a || a.length === 0) return '';

  switch (queryType) {
    case 'sgpa': {
      const totalW = a.reduce((s, x) => s + x.weighted_gp, 0);
      const totalCr = a.reduce((s, x) => s + x.credits, 0);
      let rows = a.map(x => {
        const compStr = (x.components || []).map(c => c.component_name + ':' + c.obtained_marks + '/' + c.max_marks).join(', ');
        return '<tr><td>' + x.subject_name + '</td><td style="font-size:0.72rem;">' + compStr + '</td><td>' + x.total_marks + '/' + x.max_marks + '</td><td>' + x.percentage + '%</td><td>' + x.grade_points + '</td><td>' + x.credits + '</td><td><strong>' + x.weighted_gp + '</strong></td></tr>';
      }).join('');
      rows += '<tr class="reasoning-total-row"><td colspan="5"><strong>Total</strong></td><td><strong>' + totalCr + '</strong></td><td><strong>' + totalW + '</strong></td></tr>';
      return '<div class="reasoning-box"><div class="reasoning-title">📐 Calculation Breakdown</div>' +
        '<table class="reasoning-table"><thead><tr><th>Subject</th><th>Components</th><th>Total</th><th>%</th><th>GP</th><th>Cr</th><th>GP×Cr</th></tr></thead><tbody>' + rows + '</tbody></table>' +
        '<div class="reasoning-formula">SGPA = ' + totalW + ' ÷ ' + totalCr + ' = <strong>' + (totalCr > 0 ? (totalW / totalCr).toFixed(2) : '—') + '</strong></div></div>';
    }
    case 'cgpa':
      return '<div class="reasoning-box"><div class="reasoning-title">📐 How CGPA is Calculated</div>' +
        '<div class="reasoning-text">CGPA = Σ(SGPA × Credits) ÷ Σ(Credits) across all completed semesters.</div></div>';
    case 'total_credits': {
      const passed = a.filter(x => x.passed);
      const failed = a.filter(x => !x.passed);
      let html = '<div class="reasoning-box"><div class="reasoning-title">📐 Credits Breakdown</div>';
      if (passed.length) html += '<div class="reasoning-text"><strong>✅ Passed (' + passed.reduce((s, x) => s + x.credits, 0) + ' credits):</strong> ' + passed.map(x => x.subject_name + ' (' + x.credits + 'cr)').join(', ') + '</div>';
      if (failed.length) html += '<div class="reasoning-text" style="color:#dc2626"><strong>❌ Failed (' + failed.reduce((s, x) => s + x.credits, 0) + ' credits lost):</strong> ' + failed.map(x => x.subject_name + ' (' + x.credits + 'cr)').join(', ') + '</div>';
      return html + '</div>';
    }
    case 'grace_used': {
      const graceSubjects = a.filter(x => !x.passed && x.grace_eligible);
      const failedNoGrace = a.filter(x => !x.passed && !x.grace_eligible);
      let html = '<div class="reasoning-box"><div class="reasoning-title">📐 Grace Marks Analysis</div>';
      if (graceSubjects.length) {
        graceSubjects.forEach(x => {
          html += '<div class="reasoning-text">🕊️ <strong>' + x.subject_name + '</strong>: Needed ' + x.grace_needed + ' grace mark(s) to pass.';
          if (x.reasons.length) html += ' (' + x.reasons.join('; ') + ')';
          html += '</div>';
        });
      } else if (failedNoGrace.length) {
        html += '<div class="reasoning-text">Grace not applicable — failed components need more than 6 marks total to pass.</div>';
      } else {
        html += '<div class="reasoning-text">All subjects passed — no grace marks needed.</div>';
      }
      return html + '</div>';
    }
    case 'result_status': {
      const failed = a.filter(x => !x.passed);
      let html = '<div class="reasoning-box"><div class="reasoning-title">📐 Status Reasoning</div>';
      if (failed.length === 0) {
        html += '<div class="reasoning-text">✅ All subjects cleared — student has <strong>passed</strong>.</div>';
      } else {
        failed.forEach(x => {
          html += '<div class="reasoning-text" style="color:#dc2626">❌ <strong>' + x.subject_name + '</strong>: Failed — ' + x.reasons.join('; ') +
            (x.grace_eligible ? ' <span style="color:#0891b2">(Grace eligible: needs ' + x.grace_needed + ' marks)</span>' : '') + '</div>';
        });
        if (failed.length === 1 && failed[0].grace_eligible) {
          html += '<div class="reasoning-text" style="color:#16a34a">→ Only 1 backlog with grace ≤ 6 — result is <strong>PASS (Grace)</strong>.</div>';
        } else if (failed.length === 1 && !failed[0].grace_eligible) {
          html += '<div class="reasoning-text" style="color:#b45309">→ 1 backlog but grace not applicable (needs &gt;6 marks) — result is <strong>ATKT</strong>.</div>';
        } else if (failed.length > 1) {
          html += '<div class="reasoning-text" style="color:#dc2626">→ ' + failed.length + ' backlogs — result is <strong>FAIL</strong>.</div>';
        }
      }
      return html + '</div>';
    }
    case 'number_of_backlogs': {
      const failed = a.filter(x => !x.passed);
      let html = '<div class="reasoning-box"><div class="reasoning-title">📐 Backlog Details</div>';
      if (failed.length === 0) {
        html += '<div class="reasoning-text">✅ No backlogs — all subjects passed.</div>';
      } else {
        failed.forEach(x => {
          const compDetails = (x.components || []).map(c => {
            const pass = c.passing_marks > 0;
            const ok = !pass || c.obtained_marks >= c.passing_marks;
            return c.component_name + ' = ' + c.obtained_marks + '/' + c.max_marks + (pass ? (ok ? ' ✓' : ' ⚠ (need ≥' + c.passing_marks + ')') : '');
          }).join(', ');
          html += '<div class="reasoning-text" style="color:#dc2626">❌ <strong>' + x.subject_name + ' (' + x.subject_id + ')</strong>: ' + compDetails + '</div>';
        });
      }
      return html + '</div>';
    }
    case 'next_year_eligible': {
      const resVal = prologResults[queryType]?.value || '';
      if (typeof resVal === 'string' && resVal.includes('|')) {
        const [eligible, backlogs, credits, minCredits] = resVal.split('|');
        const backlogOk = parseInt(backlogs) <= 3;
        const creditOk = parseInt(credits) >= parseInt(minCredits);
        let html = '<div class="reasoning-box"><div class="reasoning-title">📐 Eligibility Reasoning (Both criteria must be met)</div>';
        html += '<div class="reasoning-text"><strong>Criteria 1 — Backlogs:</strong> Maximum 3 ATKTs allowed → You have <strong style="color:' + (backlogOk ? '#16a34a' : '#dc2626') + '">' + backlogs + ' backlog(s)</strong>' + (backlogOk ? ' ✅' : ' ❌') + '</div>';
        html += '<div class="reasoning-text"><strong>Criteria 2 — Credits:</strong> Minimum ' + minCredits + ' credits required → You earned <strong style="color:' + (creditOk ? '#16a34a' : '#dc2626') + '">' + credits + ' credits</strong>' + (creditOk ? ' ✅' : ' ❌') + '</div>';
        html += '<div class="reasoning-text" style="margin-top:0.5rem;font-weight:600;color:' + (eligible === 'YES' ? '#16a34a' : '#dc2626') + '">';
        if (eligible === 'YES') {
          html += '✅ Both criteria met — Student is ELIGIBLE for next year.';
        } else {
          html += '❌ Student is NOT ELIGIBLE — ' + (!backlogOk && !creditOk ? 'both criteria failed' : !backlogOk ? 'too many backlogs' : 'insufficient credits') + '.';
        }
        html += '</div></div>';
        return html;
      }
      return '';
    }
    default: return '';
  }
}

/* ═══════════════════════════════════════════════════════════════
   CLOSE MODAL ON OUTSIDE CLICK
   ═══════════════════════════════════════════════════════════════ */
document.getElementById('edit-modal').addEventListener('click', function(e) {
  if (e.target === this) closeEditModal();
});
