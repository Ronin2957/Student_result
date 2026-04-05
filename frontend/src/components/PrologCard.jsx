import React, { useState, useEffect } from 'react'

const API = 'http://localhost:5000/api'

/* ─── Query definitions ──────────────────────────────────────── */
const QUERIES = [
  {
    type:    'sgpa',
    label:   'SGPA',
    icon:    '🎓',
    color:   'purple',
    desc:    'Semester Grade Point Average',
    format:  (v) => typeof v === 'number' ? v.toFixed(2) : v,
    unit:    '/ 10',
  },
  {
    type:    'total_credits',
    label:   'Total Credits',
    icon:    '⭐',
    color:   'blue',
    desc:    'Credits earned (passed subjects)',
    format:  (v) => v,
    unit:    'credits',
  },
  {
    type:    'grace_used',
    label:   'Grace Used',
    icon:    '🕊️',
    color:   'cyan',
    desc:    'Grace marks applied (max 6)',
    format:  (v) => v,
    unit:    'marks',
  },
  {
    type:    'result_status',
    label:   'Result Status',
    icon:    '📊',
    color:   'green',
    desc:    'PASS / ATKT / FAIL',
    format:  (v) => v,
    unit:    null,
  },
  {
    type:    'number_of_backlogs',
    label:   'Backlogs',
    icon:    '⚠️',
    color:   'amber',
    desc:    'Number of failed subjects',
    format:  (v) => v,
    unit:    'subject(s)',
  },
]

/* ─── Status badge helper ─────────────────────────────────────── */
const StatusBadge = ({ value }) => {
  const v = (value || '').toString().toUpperCase()
  let cls = 'badge-pass', emoji = '✅'
  if (v.includes('FAIL'))  { cls = 'badge-fail';  emoji = '❌' }
  else if (v.includes('ATKT')) { cls = 'badge-atkt'; emoji = '⚡' }
  else if (v.includes('GRACE')) { cls = 'badge-grace'; emoji = '🕊️' }
  return <span className={`result-status-badge ${cls}`}>{emoji} {value}</span>
}

/* ─── PrologCard ─────────────────────────────────────────────── */
const PrologCard = () => {
  const [students, setStudents] = useState([])
  const [selectedRoll, setSelectedRoll] = useState('')
  const [selectedSem, setSelectedSem] = useState('')
  const [activeQuery, setActiveQuery] = useState(null)
  const [queryLoading, setQueryLoading] = useState(false)
  const [results, setResults] = useState({})   // { query_type: result }
  const [error, setError] = useState('')

  /* Load students on mount */
  useEffect(() => {
    fetch(`${API}/students`)
      .then(r => r.json())
      .then(data => setStudents(Array.isArray(data) ? data : []))
      .catch(() => {})
  }, [])

  const runQuery = async (queryType) => {
    if (!selectedRoll || !selectedSem) {
      setError('Please select a student and semester first.')
      return
    }
    setError('')
    setActiveQuery(queryType)
    setQueryLoading(true)

    try {
      const res = await fetch(`${API}/prolog/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query_type: queryType,
          roll_no:    parseInt(selectedRoll),
          semester:   parseInt(selectedSem),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Query failed')

      setResults(prev => ({
        ...prev,
        [queryType]: data.result,
      }))
    } catch (err) {
      setError(err.message)
    } finally {
      setQueryLoading(false)
    }
  }

  const selectedStudent = students.find(s => String(s.roll_no) === String(selectedRoll))
  const hasSelection = selectedRoll && selectedSem
  const hasAnyResult = Object.keys(results).length > 0

  return (
    <div id="prolog-section" className="card">
      {/* Header */}
      <div className="card-header">
        <div className="card-icon cyan">🧠</div>
        <div>
          <div className="card-title">Prolog Inference Engine</div>
          <div className="card-subtitle">Run knowledge-base queries on student data</div>
        </div>
      </div>

      {/* Student + Semester selector */}
      <div className="selector-row">
        <div className="form-group">
          <label htmlFor="p-student">Select Student</label>
          <select
            id="p-student"
            value={selectedRoll}
            onChange={e => { setSelectedRoll(e.target.value); setResults({}) }}
          >
            <option value="">— Choose a student —</option>
            {students.map(s => (
              <option key={s.roll_no} value={s.roll_no}>
                [{s.roll_no}] {s.name}
              </option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label htmlFor="p-sem">Select Semester</label>
          <select
            id="p-sem"
            value={selectedSem}
            onChange={e => { setSelectedSem(e.target.value); setResults({}) }}
          >
            <option value="">— Choose semester —</option>
            {[1,2,3,4,5,6,7,8].map(s => (
              <option key={s} value={s}>Semester {s}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Selected student info chip */}
      {selectedStudent && (
        <div style={{
          display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '1rem',
          padding: '10px 14px', borderRadius: 'var(--radius-sm)',
          background: 'rgba(124,58,237,0.06)', border: '1px solid rgba(124,58,237,0.15)',
        }}>
          {[
            ['Roll No', selectedStudent.roll_no],
            ['Name', selectedStudent.name],
            ['Seat', selectedStudent.seat_no],
            ['Category', selectedStudent.category],
            ['Year', selectedStudent.year],
          ].map(([k, v]) => (
            <div key={k} style={{ fontSize: '0.8rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>{k}: </span>
              <span style={{ color: 'var(--purple-400)', fontWeight: 600 }}>{v}</span>
            </div>
          ))}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="alert alert-error">
          <span>❌</span>{error}
        </div>
      )}

      {/* Divider */}
      <div className="selector-divider"></div>

      <div style={{ marginBottom: '0.75rem' }}>
        <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Prolog Queries — Click to Run
        </div>
      </div>

      {/* Query Buttons */}
      <div className="query-grid">
        {QUERIES.map(q => {
          const res = results[q.type]
          const isActive = activeQuery === q.type
          const isLoading = isActive && queryLoading
          const hasResult = res && res.success

          return (
            <button
              key={q.type}
              id={`query-btn-${q.type}`}
              className={`query-btn ${q.color} ${isActive && !queryLoading ? `active-${q.color}` : ''}`}
              onClick={() => runQuery(q.type)}
              disabled={!hasSelection || (queryLoading)}
              title={q.desc}
            >
              <span className="q-icon">
                {isLoading ? '⏳' : q.icon}
              </span>
              <span className="q-label">{q.label}</span>
              {hasResult && (
                <span style={{
                  fontSize: '0.7rem', color: 'var(--green-400)',
                  background: 'rgba(16,185,129,0.12)',
                  padding: '2px 8px', borderRadius: '100px',
                  border: '1px solid rgba(16,185,129,0.2)'
                }}>
                  Done ✓
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Results Panel */}
      {hasAnyResult && (
        <div style={{ marginTop: '2rem' }}>
          <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '1rem' }}>
            Query Results — {selectedStudent?.name || selectedRoll} · Semester {selectedSem}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.85rem' }}>
            {QUERIES.filter(q => results[q.type]).map(q => {
              const res = results[q.type]
              if (!res) return null
              const val = res.success ? q.format(res.value) : null

              return (
                <div key={q.type} className="result-display">
                  <div className="result-label">{q.icon} {q.label}</div>
                  {res.success ? (
                    q.type === 'result_status' ? (
                      <StatusBadge value={val} />
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                        <div className="result-value">{val}</div>
                        {q.unit && <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{q.unit}</span>}
                      </div>
                    )
                  ) : (
                    <div style={{ color: '#f87171', fontSize: '0.82rem', marginTop: '4px' }}>
                      ❌ {res.error || 'Query failed'}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          <div style={{ marginTop: '1rem', fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green-500)', display: 'inline-block', boxShadow: '0 0 6px var(--green-500)' }}></span>
            Results stored in database. Refresh "Show Data" in the Data Input card to see updated Result table.
          </div>
        </div>
      )}

      {/* Empty state */}
      {!hasAnyResult && hasSelection && (
        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🧠</div>
          Select a query above to run Prolog inference on the selected student's data.
        </div>
      )}

      {!hasSelection && (
        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>☝️</div>
          Select a student and semester to enable Prolog queries.
        </div>
      )}
    </div>
  )
}

export default PrologCard
