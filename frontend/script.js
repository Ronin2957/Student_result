/* Scholastic Result Analysis — Both Methods (Frontend JS) */

var API = 'http://localhost:5000/api';

// ─── Tab Switching ─────────────────────────────────────────
function switchTab(tab) {
  var tabs = ['student', 'subject', 'component', 'marks'];
  for (var i = 0; i < tabs.length; i++) {
    var t = tabs[i];
    document.getElementById('form-' + t).classList.toggle('hidden', t !== tab);
    document.getElementById('tab-' + t).classList.toggle('active', t === tab);
  }
  if (tab === 'component') loadAllSubjectsDropdown();
}

// ─── Alert Helper ──────────────────────────────────────────
function showAlert(msg, type) {
  var el = document.getElementById('data-alert');
  el.className = 'alert alert-' + type;
  el.textContent = msg;
  el.classList.remove('hidden');
  setTimeout(function() { el.classList.add('hidden'); }, 3500);
}

// ─── Load Subjects Dropdown (Component form) ───────────────
function loadAllSubjectsDropdown() {
  var sel = document.getElementById('comp-subid');
  fetch(API + '/subjects')
    .then(function(res) { return res.json(); })
    .then(function(data) {
      sel.innerHTML = '<option value="">-- Select subject --</option>';
      if (Array.isArray(data)) {
        for (var i = 0; i < data.length; i++) {
          var s = data[i];
          sel.innerHTML += '<option value="' + s.subject_id + '">[' + s.subject_id + '] ' + s.subject_name + '</option>';
        }
      }
    })
    .catch(function() { sel.innerHTML = '<option value="">Error loading</option>'; });
}

// ─── Load Semester Subjects (Marks form) ───────────────────
function loadSemesterSubjects() {
  var sem = document.getElementById('m-sem').value;
  var sel = document.getElementById('m-subid');
  document.getElementById('marksContainer').innerHTML = '';

  if (!sem) {
    sel.innerHTML = '<option value="">-- Select semester first --</option>';
    sel.disabled = true;
    return;
  }
  fetch(API + '/subjects?semester=' + sem)
    .then(function(res) { return res.json(); })
    .then(function(data) {
      if (!Array.isArray(data) || data.length === 0) {
        sel.innerHTML = '<option value="">No subjects for this semester</option>';
        sel.disabled = true;
        return;
      }
      sel.innerHTML = '<option value="">-- Select subject --</option>';
      for (var i = 0; i < data.length; i++) {
        var s = data[i];
        sel.innerHTML += '<option value="' + s.subject_id + '">[' + s.subject_id + '] ' + s.subject_name + '</option>';
      }
      sel.disabled = false;
    })
    .catch(function() {
      sel.innerHTML = '<option value="">Error loading</option>';
      sel.disabled = true;
    });
}

// ─── Load Subject Components (Marks form) ──────────────────
function loadSubjectComponents() {
  var subjectId = document.getElementById('m-subid').value;
  var container = document.getElementById('marksContainer');
  container.innerHTML = '';
  if (!subjectId) return;

  fetch(API + '/components/' + subjectId)
    .then(function(res) { return res.json(); })
    .then(function(data) {
      if (!Array.isArray(data) || data.length === 0) {
        container.innerHTML = '<p style="color:#999; font-size:0.85rem;">No components defined. Add components first.</p>';
        return;
      }
      var html = '<div class="form-grid" style="margin-bottom:10px;">';
      for (var i = 0; i < data.length; i++) {
        var comp = data[i];
        var passInfo = comp.passing_marks > 0 ? ' (Pass: ' + comp.passing_marks + ')' : '';
        html += '<div class="form-group">';
        html += '<label>' + comp.component_name + ' (Max: ' + comp.max_marks + passInfo + ')</label>';
        html += '<input type="number" min="0" max="' + comp.max_marks + '" data-compid="' + comp.component_id + '" placeholder="0 - ' + comp.max_marks + '" required>';
        html += '</div>';
      }
      html += '</div>';
      container.innerHTML = html;
    })
    .catch(function() {
      container.innerHTML = '<p style="color:red; font-size:0.85rem;">Error loading components</p>';
    });
}

// ─── Submit Forms ──────────────────────────────────────────
function submitStudent(e) {
  e.preventDefault();
  fetch(API + '/student', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      roll_no: document.getElementById('s-roll').value,
      name: document.getElementById('s-name').value,
      seat_no: document.getElementById('s-seat').value,
      category: document.getElementById('s-cat').value,
      year: document.getElementById('s-year').value,
      semester: document.getElementById('s-sem').value,
    }),
  })
  .then(function(res) { return res.json().then(function(d) { return {ok: res.ok, data: d}; }); })
  .then(function(r) {
    if (!r.ok) throw new Error(r.data.error);
    showAlert('Student added successfully!', 'success');
    e.target.reset();
    loadStudentsDropdowns();
  })
  .catch(function(err) { showAlert(err.message, 'error'); });
}

function submitSubject(e) {
  e.preventDefault();
  fetch(API + '/subject', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      subject_id: document.getElementById('sub-id').value,
      subject_name: document.getElementById('sub-name').value,
      credits: document.getElementById('sub-credits').value,
      semester: document.getElementById('sub-sem').value,
    }),
  })
  .then(function(res) { return res.json().then(function(d) { return {ok: res.ok, data: d}; }); })
  .then(function(r) {
    if (!r.ok) throw new Error(r.data.error);
    showAlert('Subject added successfully!', 'success');
    e.target.reset();
  })
  .catch(function(err) { showAlert(err.message, 'error'); });
}

function submitComponent(e) {
  e.preventDefault();
  fetch(API + '/component', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      subject_id: document.getElementById('comp-subid').value,
      component_name: document.getElementById('comp-name').value,
      max_marks: document.getElementById('comp-max').value,
      passing_marks: document.getElementById('comp-pass').value || 0,
    }),
  })
  .then(function(res) { return res.json().then(function(d) { return {ok: res.ok, data: d}; }); })
  .then(function(r) {
    if (!r.ok) throw new Error(r.data.error);
    showAlert('Component added successfully!', 'success');
    document.getElementById('comp-name').value = '';
    document.getElementById('comp-max').value = '';
    document.getElementById('comp-pass').value = '0';
  })
  .catch(function(err) { showAlert(err.message, 'error'); });
}

function submitMarks(e) {
  e.preventDefault();
  var marksList = [];
  var inputs = document.querySelectorAll('#marksContainer input[type="number"]');
  for (var i = 0; i < inputs.length; i++) {
    marksList.push({
      component_id: inputs[i].getAttribute('data-compid'),
      obtained_marks: inputs[i].value,
    });
  }
  if (marksList.length === 0) {
    showAlert('No components to submit. Select a subject with components.', 'error');
    return;
  }
  fetch(API + '/marks', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      roll_no: document.getElementById('m-roll').value,
      subject_id: document.getElementById('m-subid').value,
      semester: document.getElementById('m-sem').value,
      credits_earned: document.getElementById('m-credits').value,
      marks: marksList,
    }),
  })
  .then(function(res) { return res.json().then(function(d) { return {ok: res.ok, data: d}; }); })
  .then(function(r) {
    if (!r.ok) throw new Error(r.data.error);
    showAlert('Marks added successfully!', 'success');
    for (var i = 0; i < inputs.length; i++) inputs[i].value = '';
  })
  .catch(function(err) { showAlert(err.message, 'error'); });
}

// ─── Fetch & Render All Data ───────────────────────────────
function fetchAllData() {
  var btn = document.getElementById('show-data-btn');
  btn.disabled = true;
  btn.textContent = 'Loading...';

  Promise.all([
    fetch(API + '/students').then(function(r) { return r.json(); }),
    fetch(API + '/subjects').then(function(r) { return r.json(); }),
    fetch(API + '/components').then(function(r) { return r.json(); }),
    fetch(API + '/marks').then(function(r) { return r.json(); }),
  ])
  .then(function(results) {
    renderStudents(Array.isArray(results[0]) ? results[0] : []);
    renderSubjects(Array.isArray(results[1]) ? results[1] : []);
    renderComponents(Array.isArray(results[2]) ? results[2] : []);
    renderMarks(Array.isArray(results[3]) ? results[3] : []);
    document.getElementById('data-tables').classList.remove('hidden');
    btn.textContent = 'Refresh Data';
    loadStudentsDropdowns();
  })
  .catch(function() {
    showAlert('Failed to fetch data. Is the backend running?', 'error');
    btn.textContent = 'Show Data';
  })
  .finally(function() { btn.disabled = false; });
}

function renderStudents(data) {
  var tbody = document.getElementById('students-tbody');
  if (data.length === 0) { tbody.innerHTML = '<tr><td colspan="6" class="empty-table">No students yet.</td></tr>'; return; }
  var html = '';
  for (var i = 0; i < data.length; i++) {
    var s = data[i];
    html += '<tr><td>' + s.roll_no + '</td><td>' + s.name + '</td><td>' + s.seat_no + '</td><td>' + s.category + '</td><td>' + s.year + '</td><td>' + s.semester + '</td></tr>';
  }
  tbody.innerHTML = html;
}

function renderSubjects(data) {
  var tbody = document.getElementById('subjects-tbody');
  if (data.length === 0) { tbody.innerHTML = '<tr><td colspan="4" class="empty-table">No subjects yet.</td></tr>'; return; }
  var html = '';
  for (var i = 0; i < data.length; i++) {
    var s = data[i];
    html += '<tr><td>' + s.subject_id + '</td><td>' + s.subject_name + '</td><td>' + s.credits + '</td><td>' + s.semester + '</td></tr>';
  }
  tbody.innerHTML = html;
}

function renderComponents(data) {
  var tbody = document.getElementById('components-tbody');
  if (data.length === 0) { tbody.innerHTML = '<tr><td colspan="5" class="empty-table">No components yet.</td></tr>'; return; }
  var html = '';
  for (var i = 0; i < data.length; i++) {
    var c = data[i];
    html += '<tr><td>' + c.component_id + '</td><td>[' + c.subject_id + '] ' + (c.subject_name || '') + '</td><td>' + c.component_name + '</td><td>' + c.max_marks + '</td><td>' + (c.passing_marks || 0) + '</td></tr>';
  }
  tbody.innerHTML = html;
}

function renderMarks(data) {
  var tbody = document.getElementById('marks-tbody');
  if (data.length === 0) { tbody.innerHTML = '<tr><td colspan="8" class="empty-table">No marks yet.</td></tr>'; return; }
  var html = '';
  for (var i = 0; i < data.length; i++) {
    var m = data[i];
    html += '<tr><td>' + m.roll_no + '</td><td>' + m.student_name + '</td><td>[' + m.subject_id + '] ' + m.subject_name + '</td><td>' + m.component_name + '</td><td>' + m.semester + '</td><td>' + m.obtained_marks + '</td><td>' + m.max_marks + '</td><td>' + m.credits_earned + '</td></tr>';
  }
  tbody.innerHTML = html;
}

// ─── Load Students Dropdowns (both SQL and Prolog sections) ─
function loadStudentsDropdowns() {
  fetch(API + '/students')
    .then(function(res) { return res.json(); })
    .then(function(data) {
      var selectors = ['sq-student', 'pq-student'];
      for (var s = 0; s < selectors.length; s++) {
        var sel = document.getElementById(selectors[s]);
        var prev = sel.value;
        sel.innerHTML = '<option value="">-- Choose a student --</option>';
        if (Array.isArray(data)) {
          for (var i = 0; i < data.length; i++) {
            var st = data[i];
            sel.innerHTML += '<option value="' + st.roll_no + '">[' + st.roll_no + '] ' + st.name + '</option>';
          }
        }
        if (prev) sel.value = prev;
      }
    })
    .catch(function() {});
}

// ─── Query Definitions ─────────────────────────────────────
var QUERIES = [
  { type: 'sgpa',          label: 'SGPA',          icon: 'GPA', unit: '/ 10' },
  { type: 'total_credits', label: 'Total Credits',  icon: 'CR',  unit: 'credits' },
  { type: 'backlogs',      label: 'Backlogs',       icon: 'BK',  unit: 'subject(s)' },
  { type: 'grace_marks',   label: 'Grace Marks',    icon: 'GR',  unit: 'marks' },
  { type: 'result_status', label: 'Result Status',  icon: 'RS',  unit: null },
];

// ─── Build Query Buttons for both cards ────────────────────
function buildQueryButtons() {
  var methods = ['sql', 'prolog'];
  for (var m = 0; m < methods.length; m++) {
    var method = methods[m];
    var grid = document.getElementById(method + '-query-grid');
    var html = '';
    for (var i = 0; i < QUERIES.length; i++) {
      var q = QUERIES[i];
      html += '<button class="query-btn" id="' + method + '-qbtn-' + q.type + '" onclick="runQuery(\'' + method + '\', \'' + q.type + '\')" disabled>';
      html += '<span class="q-icon">' + q.icon + '</span>';
      html += '<span>' + q.label + '</span></button>';
    }
    grid.innerHTML = html;
  }
}

// ─── Enable/disable query buttons on selection change ──────
document.addEventListener('change', function(e) {
  // SQL card
  if (e.target.id === 'sq-student' || e.target.id === 'sq-sem') {
    var hasSql = document.getElementById('sq-student').value && document.getElementById('sq-sem').value;
    for (var i = 0; i < QUERIES.length; i++) {
      document.getElementById('sql-qbtn-' + QUERIES[i].type).disabled = !hasSql;
    }
    document.getElementById('sql-query-empty').classList.toggle('hidden', hasSql);
    if (!hasSql) document.getElementById('sql-result-panel').classList.add('hidden');
  }
  // Prolog card
  if (e.target.id === 'pq-student' || e.target.id === 'pq-sem') {
    var hasProlog = document.getElementById('pq-student').value && document.getElementById('pq-sem').value;
    for (var j = 0; j < QUERIES.length; j++) {
      document.getElementById('prolog-qbtn-' + QUERIES[j].type).disabled = !hasProlog;
    }
    document.getElementById('prolog-query-empty').classList.toggle('hidden', hasProlog);
    if (!hasProlog) document.getElementById('prolog-result-panel').classList.add('hidden');
  }
});

// ─── Run Analysis Query (SQL or Prolog) ────────────────────
function runQuery(method, queryType) {
  var studentSel = method === 'sql' ? 'sq-student' : 'pq-student';
  var semSel = method === 'sql' ? 'sq-sem' : 'pq-sem';
  var roll = document.getElementById(studentSel).value;
  var sem = document.getElementById(semSel).value;
  if (!roll || !sem) return;

  var btn = document.getElementById(method + '-qbtn-' + queryType);
  btn.disabled = true;

  var endpoint = method === 'sql' ? '/query/sql' : '/query/prolog';

  fetch(API + endpoint, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query_type: queryType, roll_no: parseInt(roll), semester: parseInt(sem) }),
  })
  .then(function(res) { return res.json(); })
  .then(function(data) {
    if (data.error) throw new Error(data.error);

    var result = data.result;
    var q = null;
    for (var i = 0; i < QUERIES.length; i++) {
      if (QUERIES[i].type === queryType) { q = QUERIES[i]; break; }
    }

    document.getElementById(method + '-result-label').textContent = q.label;

    if (result.error) {
      document.getElementById(method + '-result-value').innerHTML = '<span style="color:red;">' + result.error + '</span>';
    } else if (queryType === 'result_status') {
      document.getElementById(method + '-result-value').innerHTML = statusBadge(result.value);
    } else {
      var val = queryType === 'sgpa' ? parseFloat(result.value).toFixed(2) : result.value;
      document.getElementById(method + '-result-value').textContent = val + (q.unit ? ' ' + q.unit : '');
    }

    document.getElementById(method + '-result-time').textContent = 'Execution Time: ' + result.execution_time_ms + ' ms';
    document.getElementById(method + '-result-panel').classList.remove('hidden');
    document.getElementById(method + '-query-empty').classList.add('hidden');
  })
  .catch(function(err) { showAlert('Query failed: ' + err.message, 'error'); })
  .finally(function() { btn.disabled = false; });
}

function statusBadge(val) {
  var v = (val || '').toUpperCase();
  var cls = 'badge-pass';
  if (v.indexOf('FAIL') >= 0) cls = 'badge-fail';
  else if (v.indexOf('ATKT') >= 0) cls = 'badge-atkt';
  else if (v.indexOf('GRACE') >= 0) cls = 'badge-grace';
  return '<span class="badge ' + cls + '">' + val + '</span>';
}

// Initialize on page load
window.onload = function() {
  loadStudentsDropdowns();
  buildQueryButtons();
};
