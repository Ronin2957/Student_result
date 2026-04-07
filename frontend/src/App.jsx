import React from 'react'
import Navbar from './components/Navbar'
import DataInputCard from './components/DataInputCard'
import PrologCard from './components/PrologCard'

function App() {
  return (
    <>
      <Navbar />

      <main className="main-container">
        {/* ── Cards ── */}
        <DataInputCard />
        <PrologCard />
      </main>
    </>
  )
}

export default App
