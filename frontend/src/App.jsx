import React from 'react'
import Navbar from './components/Navbar'
import DataInputCard from './components/DataInputCard'
import PrologCard from './components/PrologCard'

function App() {
  return (
    <>
      <Navbar />

      <main className="main-container">
        {/* ── Hero ── */}
        <div className="hero">
          <div className="hero-badge">⚛️ Prolog × MySQL × React × Python</div>
          <h1>Student Result Management<br />with AI Inference</h1>
          <p>
            Enter raw student and marks data once — the system automatically
            builds a Prolog knowledge base and computes SGPA, credits, grace,
            backlogs & result status through intelligent inference.
          </p>
        </div>

        {/* ── Cards ── */}
        <DataInputCard />
        <PrologCard />
      </main>
    </>
  )
}

export default App
