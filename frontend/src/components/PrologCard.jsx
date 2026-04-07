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
    type:    'cgpa',
    label:   'CGPA',
    icon:    '🏆',
    color:   'blue',
    desc:    'Cumulative GPA (available on even semesters)',
    format:  (v) => typeof v === 'number' ? v.toFixed(2) : v,
    unit:    '/ 10',
    evenOnly: true,
  },
  {
    type:    'total_credits',
    label:   'Total Credits',
    icon:    '⭐',
    color:   'cyan',
    desc:    'Credits earned (passed subjects)',
    format:  (v) => v,
    unit:    'credits',
  },
  {
    type:    'grace_used',
    label:   'Grace Used',
    icon:    '🕊️',
    color:   'green',
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
  {
    type:    'next_year_eligible',
    label:   'Next Year Eligibility',
    icon:    '🎯',
    color:   'green',
    desc:    'Check if eligible for next year (≤3 ATKTs + min credits)',
    format:  (v) => {
      // v is "YES|backlogs|credits|minCredits" or "NO|..."
      if (typeof v === 'string' && v.includes('|')) {
        const [eligible] = v.split('|')
        return eligible
      }
      return v
    },
    unit:    null,
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

/* ─── Reasoning component for each query type ────────────────── */
const QueryReasoning = ({ queryType, analysis, results }) => {
  if (!analysis || analysis.length === 0) return null

  // Build contextual reasoning based on query type
  switch (queryType) {
    case 'sgpa': {
      const totalWeighted = analysis.reduce((s, a) => s + a.weighted_gp, 0)
      const totalCr = analysis.reduce((s, a) => s + a.credits, 0)
      return (
        <div className="reasoning-box">
          <div className="reasoning-title">📐 Calculation Breakdown</div>
          <table className="reasoning-table">
            <thead>
              <tr>
                <th>Subject</th>
                <th>Total</th>
                <th>GP</th>
                <th>Cr</th>
                <th>GP × Cr</th>
              </tr>
            </thead>
            <tbody>
              {analysis.map(a => (
                <tr key={a.subject_id}>
                  <td>{a.subject_name}</td>
                  <td>{a.total_marks}</td>
                  <td>{a.grade_points}</td>
                  <td>{a.credits}</td>
                  <td><strong>{a.weighted_gp}</strong></td>
                </tr>
              ))}
              <tr className="reasoning-total-row">
                <td colSpan="3"><strong>Total</strong></td>
                <td><strong>{totalCr}</strong></td>
                <td><strong>{totalWeighted}</strong></td>
              </tr>
            </tbody>
          </table>
          <div className="reasoning-formula">
            SGPA = {totalWeighted} ÷ {totalCr} = <strong>{totalCr > 0 ? (totalWeighted / totalCr).toFixed(2) : '—'}</strong>
          </div>
        </div>
      )
    }

    case 'cgpa': {
      return (
        <div className="reasoning-box">
          <div className="reasoning-title">📐 How CGPA is Calculated</div>
          <div className="reasoning-text">
            CGPA = Σ(SGPA × Credits) ÷ Σ(Credits) across all completed semesters.
            CGPA is only available on <strong>even semesters</strong> as it represents the cumulative performance of paired odd+even semesters.
          </div>
        </div>
      )
    }

    case 'total_credits': {
      const passed = analysis.filter(a => a.passed)
      const failed = analysis.filter(a => !a.passed)
      return (
        <div className="reasoning-box">
          <div className="reasoning-title">📐 Credits Breakdown</div>
          {passed.length > 0 && (
            <div className="reasoning-text">
              <strong>✅ Passed ({passed.reduce((s,a) => s + a.credits, 0)} credits):</strong>{' '}
              {passed.map(a => `${a.subject_name} (${a.credits}cr)`).join(', ')}
            </div>
          )}
          {failed.length > 0 && (
            <div className="reasoning-text" style={{ color: 'var(--red-500)' }}>
              <strong>❌ Failed ({failed.reduce((s,a) => s + a.credits, 0)} credits lost):</strong>{' '}
              {failed.map(a => `${a.subject_name} (${a.credits}cr)`).join(', ')}
            </div>
          )}
        </div>
      )
    }

    case 'grace_used': {
      const graceSubjects = analysis.filter(a => !a.passed && a.grace_eligible)
      const failedNoGrace = analysis.filter(a => !a.passed && !a.grace_eligible)
      return (
        <div className="reasoning-box">
          <div className="reasoning-title">📐 Grace Marks Analysis</div>
          {graceSubjects.length > 0 ? (
            graceSubjects.map(a => (
              <div key={a.subject_id} className="reasoning-text">
                🕊️ <strong>{a.subject_name}</strong>: Needed {a.grace_needed} grace mark(s) to pass.
                {a.reasons.map((r, i) => <span key={i} className="reasoning-reason"> — {r}</span>)}
              </div>
            ))
          ) : failedNoGrace.length > 0 ? (
            <div className="reasoning-text">
              Grace not applicable — failed subjects need more than 6 marks to pass.
            </div>
          ) : (
            <div className="reasoning-text">All subjects passed — no grace marks needed.</div>
          )}
        </div>
      )
    }

    case 'result_status': {
      const failed = analysis.filter(a => !a.passed)
      if (failed.length === 0) {
        return (
          <div className="reasoning-box">
            <div className="reasoning-title">📐 Status Reasoning</div>
            <div className="reasoning-text">✅ All subjects cleared — student has <strong>passed</strong>.</div>
          </div>
        )
      }
      return (
        <div className="reasoning-box">
          <div className="reasoning-title">📐 Status Reasoning</div>
          {failed.map(a => (
            <div key={a.subject_id} className="reasoning-text" style={{ color: 'var(--red-500)' }}>
              ❌ <strong>{a.subject_name}</strong>: Failed — {a.reasons.join('; ')}
              {a.grace_eligible && <span style={{ color: 'var(--cyan-500)' }}> (Grace eligible: needs {a.grace_needed} marks)</span>}
            </div>
          ))}
          {failed.length === 1 && failed[0].grace_eligible && (
            <div className="reasoning-text" style={{ color: 'var(--green-500)' }}>
              → Only 1 backlog with grace ≤ 6 — result is <strong>PASS (Grace)</strong>.
            </div>
          )}
          {failed.length === 1 && !failed[0].grace_eligible && (
            <div className="reasoning-text" style={{ color: 'var(--amber-400)' }}>
              → 1 backlog but grace not applicable (needs &gt;6 marks) — result is <strong>ATKT</strong>.
            </div>
          )}
          {failed.length > 1 && (
            <div className="reasoning-text" style={{ color: 'var(--red-500)' }}>
              → {failed.length} backlogs — result is <strong>FAIL</strong>.
            </div>
          )}
        </div>
      )
    }

    case 'number_of_backlogs': {
      const failed = analysis.filter(a => !a.passed)
      if (failed.length === 0) {
        return (
          <div className="reasoning-box">
            <div className="reasoning-title">📐 Backlog Details</div>
            <div className="reasoning-text">✅ No backlogs — all subjects passed.</div>
          </div>
        )
      }
      return (
        <div className="reasoning-box">
          <div className="reasoning-title">📐 Backlog Details</div>
          {failed.map(a => (
            <div key={a.subject_id} className="reasoning-text" style={{ color: 'var(--red-500)' }}>
              ❌ <strong>{a.subject_name} ({a.subject_id})</strong>:
              CIE = {a.cie_marks}/40{a.cie_marks < 18 ? ` ⚠ (need ≥18)` : ' ✓'},
              ESE = {a.ese_marks}/60{a.ese_marks < 24 ? ` ⚠ (need ≥24)` : ' ✓'}
            </div>
          ))}
        </div>
      )
    }

    case 'next_year_eligible': {
      // Parse result: "YES|backlogs|credits|minCredits" or "NO|..."
      const resVal = results?.[queryType]?.value || ''
      if (typeof resVal === 'string' && resVal.includes('|')) {
        const [eligible, backlogs, credits, minCredits] = resVal.split('|')
        const backlogOk = parseInt(backlogs) <= 3
        const creditOk = parseInt(credits) >= parseInt(minCredits)
        return (
          <div className="reasoning-box">
            <div className="reasoning-title">📐 Eligibility Reasoning (Both criteria must be met)</div>
            <div className="reasoning-text">
              <strong>Criteria 1 — Backlogs:</strong> Maximum 3 ATKTs allowed → You have <strong style={{ color: backlogOk ? 'var(--green-500)' : 'var(--red-500)' }}>{backlogs} backlog(s)</strong>
              {backlogOk ? ' ✅' : ' ❌'}
            </div>
            <div className="reasoning-text">
              <strong>Criteria 2 — Credits:</strong> Minimum {minCredits} credits required (out of 46, both semesters) → You earned <strong style={{ color: creditOk ? 'var(--green-500)' : 'var(--red-500)' }}>{credits} credits</strong>
              {creditOk ? ' ✅' : ' ❌'}
            </div>
            <div className="reasoning-text" style={{ marginTop: '0.5rem', fontWeight: 600, color: eligible === 'YES' ? 'var(--green-500)' : 'var(--red-500)' }}>
              {eligible === 'YES'
                ? '✅ Both criteria met — Student is ELIGIBLE for next year.'
                : `❌ Student is NOT ELIGIBLE — ${!backlogOk && !creditOk ? 'both criteria failed' : !backlogOk ? 'too many backlogs' : 'insufficient credits'}.`}
            </div>
          </div>
        )
      }
      return null
    }

    default:
      return null
  }
}

/* ─── PrologCard ─────────────────────────────────────────────── */
const PrologCard = () => {
  const [students, setStudents] = useState([])
  const [selectedRoll, setSelectedRoll] = useState('')
  const [selectedSem, setSelectedSem] = useState('')
  const [activeQuery, setActiveQuery] = useState(null)
  const [queryLoading, setQueryLoading] = useState(false)
  const [results, setResults] = useState({})   // { query_type: result }
  const [analysis, setAnalysis] = useState([])  // subject-level analysis
  const [error, setError] = useState('')

  /* Load students on mount */
  useEffect(() => {
    fetch(`${API}/students`)
      .then(r => r.json())
      .then(data => setStudents(Array.isArray(data) ? data : []))
      .catch(() => {})
  }, [])

  /* Fetch subject analysis when student+semester are selected */
  useEffect(() => {
    if (selectedRoll && selectedSem) {
      fetch(`${API}/student/${selectedRoll}/analysis?semester=${selectedSem}`)
        .then(r => r.json())
        .then(data => setAnalysis(Array.isArray(data) ? data : []))
        .catch(() => setAnalysis([]))
    } else {
      setAnalysis([])
    }
  }, [selectedRoll, selectedSem])

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
  const isEvenSemester = selectedSem && parseInt(selectedSem) % 2 === 0

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
        <div className="student-info-chip">
          {[
            ['Roll No', selectedStudent.roll_no],
            ['Name', selectedStudent.name],
            ['Seat', selectedStudent.seat_no],
            ['Category', selectedStudent.category],
            ['Year', selectedStudent.year],
          ].map(([k, v]) => (
            <div key={k} className="info-item">
              <span className="info-label">{k}: </span>
              <span className="info-value">{v}</span>
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
        <div className="section-label">
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
          // CGPA only on even semesters
          const isDisabled = !hasSelection || queryLoading || (q.evenOnly && !isEvenSemester)

          return (
            <button
              key={q.type}
              id={`query-btn-${q.type}`}
              className={`query-btn ${q.color} ${isActive && !queryLoading ? `active-${q.color}` : ''}`}
              onClick={() => runQuery(q.type)}
              disabled={isDisabled}
              title={q.evenOnly && !isEvenSemester ? 'CGPA is only available on even semesters' : q.desc}
            >
              <span className="q-icon">
                {isLoading ? '⏳' : q.icon}
              </span>
              <span className="q-label">{q.label}</span>
              {q.evenOnly && !isEvenSemester && hasSelection && (
                <span className="even-only-chip">Even sem only</span>
              )}
              {hasResult && (
                <span className="done-chip">Done ✓</span>
              )}
            </button>
          )
        })}
      </div>

      {/* Results Panel */}
      {hasAnyResult && (
        <div style={{ marginTop: '2rem' }}>
          <div className="section-label" style={{ marginBottom: '1rem' }}>
            Query Results — {selectedStudent?.name || selectedRoll} · Semester {selectedSem}
          </div>
          <div className="results-list">
            {QUERIES.filter(q => results[q.type]).map(q => {
              const res = results[q.type]
              if (!res) return null
              const val = res.success ? q.format(res.value) : null

              return (
                <div key={q.type} className="result-card">
                  <div className="result-display">
                    <div className="result-label">{q.icon} {q.label}</div>
                    {res.success ? (
                      q.type === 'result_status' ? (
                        <StatusBadge value={val} />
                      ) : q.type === 'next_year_eligible' ? (
                        <StatusBadge value={val === 'YES' ? 'ELIGIBLE' : 'NOT ELIGIBLE'} />
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                          <div className="result-value">{val}</div>
                          {q.unit && <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{q.unit}</span>}
                        </div>
                      )
                    ) : (
                      <div style={{ color: 'var(--red-500)', fontSize: '0.82rem', marginTop: '4px' }}>
                        ❌ {res.error || 'Query failed'}
                      </div>
                    )}
                  </div>
                  {/* Reasoning section */}
                  {res.success && (
                    <QueryReasoning queryType={q.type} analysis={analysis} results={results} />
                  )}
                </div>
              )
            })}
          </div>

          <div style={{ marginTop: '1rem', fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span className="status-dot"></span>
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
