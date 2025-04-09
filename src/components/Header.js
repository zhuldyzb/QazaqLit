import React, { useState, useEffect } from 'react';
import '../styles/Header.css';

const Header = ({ activeSection }) => {
  const [isScrolled, setIsScrolled] = useState(false);
  
  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY;
      setIsScrolled(scrollPosition > 50);
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header className={`site-header ${isScrolled ? 'scrolled' : ''}`}>
      <div className="header-container">
        <div className="logo">
          <h1>QazaqLit</h1>
          <p className="subtitle">Mapping the Soul of Kazakhstan</p>
        </div>
        
        <nav className="main-nav">
          <ul>
            <li className={activeSection === 'intro' ? 'active' : ''}>
              <a href="#intro">Introduction</a>
            </li>
            <li className={activeSection === 'topics' ? 'active' : ''}>
              <a href="#topics">Topics</a>
            </li>
            <li className={activeSection === 'evolution' ? 'active' : ''}>
              <a href="#evolution">Evolution</a>
            </li>
            <li className={activeSection === 'authors' ? 'active' : ''}>
              <a href="#authors">Authors</a>
            </li>
            <li className={activeSection === 'network' ? 'active' : ''}>
              <a href="#network">Connections</a>
            </li>
            <li className={activeSection === 'keywords' ? 'active' : ''}>
              <a href="#keywords">Keywords</a>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  );
};

export default Header;
