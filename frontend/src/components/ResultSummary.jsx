import React, { useState, useEffect } from 'react'

const API = 'http://localhost:5000/api'

/* ─── Metric card definitions ───────────────────────────────── */
const METRICS = [
  { key: 'sgpa',               label: 'SGPA',           icon: '🎓', format: v => v != null ? Number(v).toFixed(2) : '—', unit: '/ 10' },
  { key: 'cgpa',               label: 'CGPA',           icon: '🏆', format: v => v != null ? Number(v).toFixed(2) : '—', unit: '/ 10' },
  { key: 'total_credits',      label: 'Credits Earned', icon: '⭐', format: v => v ?? '—', unit: 'credits' },
  { key: 'number_of_backlogs', label: 'Backlogs',       icon: '⚠️', format: v => v ?? 0, unit: 'subject(s)' },
  { key: 'result_status',      label: 'Result Status',  icon: '📊', format: v => v || '—', unit: null },
  { key: 'grace_used',         label: 'Grace Marks',    icon: '🕊️', format: v => v ?? 0, unit: 'marks (max 6)' },
]

/* ─── Status badge ──────────────────────────────────────────── */
const StatusBadge = ({ value }) => {
  const v = (value || '').toString().toUpperCase()
  let cls = 'badge-pass'
  if (v.includes('FAIL'))  cls = 'badge-fail'
  else if (v.includes('ATKT')) cls = 'badge-atkt'
  else if (v.includes('GRACE')) cls = 'badge-grace'
  return <span className={`result-status-badge ${cls}`}>{value}</span>
}

/* ─── History columns ───────────────────────────────────────── */
const historyCols = [
  { key: 'semester',           label: 'Semester' },
  { key: 'sgpa',               label: 'SGPA',
    render: v => v != null ? <strong>{Number(v).toFixed(2)}</strong> : '—' },
  { key: 'total_credits',      label: 'Credits Earned' },
  { key: 'grace_used',         label: 'Grace Used' },
  { key: 'number_of_backlogs', label: 'Backlogs' },
  { key: 'result_status',      label: 'Status',
    render: v => v ? <StatusBadge value={v} /> : '—' },
]

/* ─── ResultSummary Component ───────────────────────────────── */
const ResultSummary = ({ rollNo, semester, studentName, onClose }) => {
  const [summary, setSummary]   = useState(null)
  const [history, setHistory]   = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState('')

  useEffect(() => {
    if (!rollNo || !semester) return
    setLoading(true)
    setError('')

    Promise.all([
      fetch(`${API}/student/${rollNo}/summary?semester=${semester}`).then(r => r.json()),
      fetch(`${API}/student/${rollNo}/history`).then(r => r.json()),
    ])
      .then(([sum, hist]) => {
        if (sum.error) throw new Error(sum.error)
        setSummary(sum)
        setHistory(Array.isArray(hist) ? hist : [])
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [rollNo, semester])

  if (loading) {
    return (
      <div className="summary-section" id="result-summary">
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
          <span className="spinner" style={{ display: 'inline-block', marginBottom: '1rem' }}></span>
          <div>Loading result summary...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="summary-section" id="result-summary">
        <div className="alert alert-error"><span>❌</span>{error}</div>
      </div>
    )
  }

  if (!summary) return null

  return (
    <div className="summary-section" id="result-summary">
      {/* Header */}
      <div className="summary-header">
        <div>
          <div className="summary-title">📋 Result Summary</div>
          <div className="summary-subtitle">
            {summary.student_name || studentName} · Semester {semester}
          </div>
        </div>
        {onClose && (
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕ Close</button>
        )}
      </div>

      {/* Metric grid */}
      <div className="summary-grid">
        {METRICS.map(m => {
          const val = summary[m.key]
          return (
            <div key={m.key} className="summary-metric">
              <div className="summary-metric-icon">{m.icon}</div>
              <div className="summary-metric-label">{m.label}</div>
              {m.key === 'result_status' ? (
                <StatusBadge value={m.format(val)} />
              ) : (
                <div className="summary-metric-value">{m.format(val)}</div>
              )}
              {m.unit && m.key !== 'result_status' && (
                <div className="summary-metric-unit">{m.unit}</div>
              )}
            </div>
          )
        })}
      </div>

      {/* Grace marks transparency note */}
      {summary.grace_used > 0 && (
        <div className="alert alert-info" style={{ marginTop: '1rem' }}>
          <span>🕊️</span>
          <strong>{summary.grace_used} grace mark(s)</strong> were applied to bring the student to a passing threshold. Maximum allowed: 6.
        </div>
      )}

      {/* Semester History */}
      {history.length > 0 && (
        <div className="history-section">
          <div className="history-title">📈 Semester History (SGPA & Credit Progression)</div>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  {historyCols.map(c => <th key={c.key}>{c.label}</th>)}
                </tr>
              </thead>
              <tbody>
                {history.map((row, i) => (
                  <tr key={i} className={row.semester === semester ? 'row-highlight' : ''}>
                    {historyCols.map(c => (
                      <td key={c.key}>
                        {c.render ? c.render(row[c.key]) : (row[c.key] ?? '—')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* CGPA summary below history */}
          {summary.cgpa != null && (
            <div className="cgpa-badge">
              Cumulative CGPA: <strong>{Number(summary.cgpa).toFixed(2)}</strong>
              <span> · Total Credits: <strong>{summary.cumulative_credits}</strong></span>
            </div>
          )}
        </div>
      )}

      {history.length === 0 && (
        <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
          No semester history found. Run Prolog queries first to populate results.
        </div>
      )}
    </div>
  )
}

export default ResultSummary
