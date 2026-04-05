import React from 'react'

/**
 * Reusable data table component.
 * Props:
 *   title       - section title string
 *   dotColor    - 'purple' | 'cyan' | 'green' | 'amber'
 *   columns     - array of { key, label, render? }
 *   data        - array of row objects
 *   emptyMsg    - string shown when no rows
 */
const DataTable = ({ title, dotColor = 'purple', columns, data = [], emptyMsg = 'No data yet.' }) => {
  return (
    <div className="table-section">
      <div className="table-section-header">
        <div className="table-section-title">
          <span className={`table-dot ${dotColor}`}></span>
          {title}
        </div>
        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
          {data.length} record{data.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              {columns.map(col => (
                <th key={col.key}>{col.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="empty-table">
                  {emptyMsg}
                </td>
              </tr>
            ) : (
              data.map((row, i) => (
                <tr key={i}>
                  {columns.map(col => (
                    <td key={col.key}>
                      {col.render ? col.render(row[col.key], row) : (row[col.key] ?? '—')}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default DataTable
