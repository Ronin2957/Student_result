import React from 'react'

const Navbar = () => {
  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <nav className="navbar">
      <a className="navbar-brand" href="#">
        <div className="navbar-logo">G</div>
        <span className="navbar-name">GradeMatrix</span>
      </a>

      <div className="navbar-links">
        <button
          id="nav-data-input"
          className="navbar-link"
          onClick={() => scrollTo('data-input-section')}
        >
          📋 Data Input
        </button>
        <button
          id="nav-prolog"
          className="navbar-link"
          onClick={() => scrollTo('prolog-section')}
        >
          🧠 Prolog
        </button>
      </div>
    </nav>
  )
}

export default Navbar
