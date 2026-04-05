import React, { useState } from 'react'
import DataTable from './DataTable'

const API = 'http://localhost:5000/api'

/* ─── Column definitions ─────────────── */
const studentCols = [
  { key: 'roll_no',  label: 'Roll No' },
  { key: 'name',     label: 'Name' },
  { key: 'seat_no',  label: 'Seat No' },
  { key: 'category', label: 'Category' },
  { key: 'year',     label: 'Year' },
  { key: 'semester', label: 'Semester' },
]

const subjectCols = [
  { key: 'subject_id',   label: 'Subject ID' },
  { key: 'subject_name', label: 'Subject Name' },
  { key: 'credits',      label: 'Credits' },
]

const marksCols = [
  { key: 'roll_no',      label: 'Roll No' },
  { key: 'student_name', label: 'Student' },
  { key: 'subject_id',   label: 'Subject ID' },
  { key: 'subject_name', label: 'Subject' },
  { key: 'semester',     label: 'Sem' },
  { key: 'cie_marks',    label: 'CIE (40)' },
  { key: 'ese_marks',    label: 'ESE (60)' },
  { key: 'total_marks',  label: 'Total (100)',
    render: (val) => <strong style={{ color: 'var(--purple-400)' }}>{val}</strong> },
  { key: '_status', label: 'Status',
    render: (_, row) => {
      const ok = row.cie_marks >= 18 && row.ese_marks >= 24
      return <span className={`chip ${ok ? 'chip-pass' : 'chip-fail'}`}>{ok ? 'Pass' : 'Fail'}</span>
    }},
]

const resultCols = [
  { key: 'roll_no',            label: 'Roll No' },
  { key: 'student_name',       label: 'Student' },
  { key: 'semester',           label: 'Sem' },
  { key: 'sgpa',               label: 'SGPA',
    render: (val) => val != null ? <strong style={{ color: 'var(--cyan-400)' }}>{Number(val).toFixed(2)}</strong> : '—' },
  { key: 'total_credits',      label: 'Credits' },
  { key: 'grace_used',         label: 'Grace' },
  { key: 'number_of_backlogs', label: 'Backlogs' },
  { key: 'result_status',      label: 'Status',
    render: (val) => {
      if (!val) return '—'
      const v = val.toString().toUpperCase()
      let cls = 'badge-pass'
      if (v.includes('FAIL')) cls = 'badge-fail'
      else if (v.includes('ATKT')) cls = 'badge-atkt'
      else if (v.includes('GRACE')) cls = 'badge-grace'
      return <span className={`result-status-badge ${cls}`}>{val}</span>
    }},
]

/* ─── Alert component ────────────────── */
const Alert = ({ msg, type }) =>
  msg ? <div className={`alert alert-${type}`}><span>{type === 'success' ? '✅' : '❌'}</span>{msg}</div> : null

/* ─── DataInputCard ──────────────────── */
const DataInputCard = () => {
  const [activeTab, setActiveTab] = useState('student')
  const [loading, setLoading] = useState(false)
  const [showData, setShowData] = useState(false)
  const [dataLoading, setDataLoading] = useState(false)
  const [alert, setAlert] = useState({ msg: '', type: 'success' })

  /* table data */
  const [students, setStudents] = useState([])
  const [subjects, setSubjects] = useState([])
  const [marks,    setMarks]    = useState([])
  const [results,  setResults]  = useState([])

  /* form states */
  const [studentForm, setStudentForm] = useState({ roll_no:'', name:'', seat_no:'', category:'General', year:'', semester:'' })
  const [subjectForm, setSubjectForm] = useState({ subject_id:'', subject_name:'', credits:'' })
  const [marksForm,   setMarksForm]   = useState({ roll_no:'', subject_id:'', semester:'', cie_marks:'', ese_marks:'' })

  const showAlert = (msg, type = 'success') => {
    setAlert({ msg, type })
    setTimeout(() => setAlert({ msg: '', type: 'success' }), 4000)
  }

  /* ── Fetch all tables ── */
  const fetchAll = async () => {
    setDataLoading(true)
    try {
      const [s, sub, m, r] = await Promise.all([
        fetch(`${API}/students`).then(r => r.json()),
        fetch(`${API}/subjects`).then(r => r.json()),
        fetch(`${API}/marks`).then(r => r.json()),
        fetch(`${API}/results`).then(r => r.json()),
      ])
      setStudents(Array.isArray(s)   ? s   : [])
      setSubjects(Array.isArray(sub) ? sub : [])
      setMarks(Array.isArray(m)      ? m   : [])
      setResults(Array.isArray(r)    ? r   : [])
      setShowData(true)
    } catch {
      showAlert('Failed to fetch data. Is the backend running?', 'error')
    } finally {
      setDataLoading(false)
    }
  }

  /* ── Submit handlers ── */
  const submitStudent = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch(`${API}/student`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(studentForm),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      showAlert('Student added & Prolog KB updated! ✨')
      setStudentForm({ roll_no:'', name:'', seat_no:'', category:'General', year:'', semester:'' })
    } catch (err) {
      showAlert(err.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  const submitSubject = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch(`${API}/subject`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subjectForm),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      showAlert('Subject added & Prolog KB updated! ✨')
      setSubjectForm({ subject_id:'', subject_name:'', credits:'' })
    } catch (err) {
      showAlert(err.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  const submitMarks = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch(`${API}/marks`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(marksForm),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      showAlert('Marks added & Prolog KB updated! ✨')
      setMarksForm({ roll_no:'', subject_id:'', semester:'', cie_marks:'', ese_marks:'' })
    } catch (err) {
      showAlert(err.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  const sf = studentForm, ssf = subjectForm, mf = marksForm

  return (
    <div id="data-input-section" className="card">
      {/* Header */}
      <div className="card-header">
        <div className="card-icon purple">📋</div>
        <div>
          <div className="card-title">Data Input</div>
          <div className="card-subtitle">Add students, subjects & marks to the database</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        {[['student','👤 Student'],['subject','📚 Subject'],['marks','📝 Marks']].map(([key,label]) => (
          <button
            key={key}
            id={`tab-${key}`}
            className={`tab-btn ${activeTab === key ? 'active' : ''}`}
            onClick={() => setActiveTab(key)}
          >{label}</button>
        ))}
      </div>

      {/* Alert */}
      <Alert msg={alert.msg} type={alert.type} />

      {/* ─── Student Form ─── */}
      {activeTab === 'student' && (
        <form onSubmit={submitStudent}>
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="s-roll">Roll Number</label>
              <input id="s-roll" type="number" placeholder="e.g. 101" required value={sf.roll_no}
                onChange={e => setStudentForm({...sf, roll_no: e.target.value})} />
            </div>
            <div className="form-group">
              <label htmlFor="s-name">Full Name</label>
              <input id="s-name" type="text" placeholder="e.g. Riya Sharma" required value={sf.name}
                onChange={e => setStudentForm({...sf, name: e.target.value})} />
            </div>
            <div className="form-group">
              <label htmlFor="s-seat">Seat Number</label>
              <input id="s-seat" type="text" placeholder="e.g. A-24" required value={sf.seat_no}
                onChange={e => setStudentForm({...sf, seat_no: e.target.value})} />
            </div>
            <div className="form-group">
              <label htmlFor="s-cat">Category</label>
              <select id="s-cat" value={sf.category} onChange={e => setStudentForm({...sf, category: e.target.value})}>
                {['General','OBC','SC','ST','EWS'].map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="s-year">Year</label>
              <select id="s-year" value={sf.year} onChange={e => setStudentForm({...sf, year: e.target.value})} required>
                <option value="">Select Year</option>
                {[1,2,3,4].map(y => <option key={y} value={y}>Year {y}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="s-sem">Semester</label>
              <select id="s-sem" value={sf.semester} onChange={e => setStudentForm({...sf, semester: e.target.value})} required>
                <option value="">Select Semester</option>
                {[1,2,3,4,5,6,7,8].map(s => <option key={s} value={s}>Semester {s}</option>)}
              </select>
            </div>
          </div>
          <div className="actions-row">
            <button id="submit-student" type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <><span className="spinner"></span>Adding...</> : '➕ Add Student'}
            </button>
          </div>
        </form>
      )}

      {/* ─── Subject Form ─── */}
      {activeTab === 'subject' && (
        <form onSubmit={submitSubject}>
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="sub-id">Subject ID</label>
              <input id="sub-id" type="text" placeholder="e.g. CS301" required value={ssf.subject_id}
                onChange={e => setSubjectForm({...ssf, subject_id: e.target.value})} />
            </div>
            <div className="form-group">
              <label htmlFor="sub-name">Subject Name</label>
              <input id="sub-name" type="text" placeholder="e.g. Data Structures" required value={ssf.subject_name}
                onChange={e => setSubjectForm({...ssf, subject_name: e.target.value})} />
            </div>
            <div className="form-group">
              <label htmlFor="sub-credits">Credits</label>
              <input id="sub-credits" type="number" min="1" max="6" placeholder="e.g. 4" required value={ssf.credits}
                onChange={e => setSubjectForm({...ssf, credits: e.target.value})} />
            </div>
          </div>
          <div className="actions-row">
            <button id="submit-subject" type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <><span className="spinner"></span>Adding...</> : '➕ Add Subject'}
            </button>
          </div>
        </form>
      )}

      {/* ─── Marks Form ─── */}
      {activeTab === 'marks' && (
        <form onSubmit={submitMarks}>
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="m-roll">Roll Number</label>
              <input id="m-roll" type="number" placeholder="e.g. 101" required value={mf.roll_no}
                onChange={e => setMarksForm({...mf, roll_no: e.target.value})} />
            </div>
            <div className="form-group">
              <label htmlFor="m-subid">Subject ID</label>
              <input id="m-subid" type="text" placeholder="e.g. CS301" required value={mf.subject_id}
                onChange={e => setMarksForm({...mf, subject_id: e.target.value})} />
            </div>
            <div className="form-group">
              <label htmlFor="m-sem">Semester</label>
              <select id="m-sem" value={mf.semester} onChange={e => setMarksForm({...mf, semester: e.target.value})} required>
                <option value="">Select Semester</option>
                {[1,2,3,4,5,6,7,8].map(s => <option key={s} value={s}>Semester {s}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="m-cie">CIE Marks (max 40)</label>
              <input id="m-cie" type="number" min="0" max="40" placeholder="0 – 40" required value={mf.cie_marks}
                onChange={e => setMarksForm({...mf, cie_marks: e.target.value})} />
            </div>
            <div className="form-group">
              <label htmlFor="m-ese">ESE Marks (max 60)</label>
              <input id="m-ese" type="number" min="0" max="60" placeholder="0 – 60" required value={mf.ese_marks}
                onChange={e => setMarksForm({...mf, ese_marks: e.target.value})} />
            </div>
            <div className="form-group" style={{ justifyContent: 'flex-end' }}>
              <label>Live Total</label>
              <div style={{ padding: '10px 14px', background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.25)', borderRadius: 'var(--radius-sm)', fontWeight: 700, color: 'var(--purple-400)', fontSize: '1rem' }}>
                {(parseInt(mf.cie_marks)||0) + (parseInt(mf.ese_marks)||0)} / 100
              </div>
            </div>
          </div>
          <div className="actions-row">
            <button id="submit-marks" type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <><span className="spinner"></span>Adding...</> : '➕ Add Marks'}
            </button>
          </div>
        </form>
      )}

      {/* ─── Show Data Button ─── */}
      <div style={{ marginTop: '2rem', borderTop: '1px solid var(--glass-border)', paddingTop: '1.5rem' }}>
        <button id="show-data-btn" className="btn btn-secondary" onClick={fetchAll} disabled={dataLoading}>
          {dataLoading ? <><span className="spinner"></span>Loading...</> : showData ? '🔄 Refresh Data' : '👁 Show Data'}
        </button>
      </div>

      {/* ─── Data Tables ─── */}
      {showData && (
        <>
          <DataTable title="Students" dotColor="purple" columns={studentCols} data={students}
            emptyMsg="No students added yet." />
          <DataTable title="Subjects" dotColor="cyan" columns={subjectCols} data={subjects}
            emptyMsg="No subjects added yet." />
          <DataTable title="Marks" dotColor="green" columns={marksCols} data={marks}
            emptyMsg="No marks added yet." />
          {results.length > 0 && (
            <DataTable title="Results (via Prolog)" dotColor="amber" columns={resultCols} data={results}
              emptyMsg="No results computed yet." />
          )}
        </>
      )}
    </div>
  )
}

export default DataInputCard
