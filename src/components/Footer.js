import React from 'react';
import '../styles/Footer.css';

const Footer = () => {
  return (
    <footer className="site-footer">
      <div className="footer-container">
        <div className="footer-section about">
          <h3>About This Project</h3>
          <p>
          This visualization was created as part of a Information Technologies undergraduate diploma project 
          exploring the application of natural language processing to Kazakh literature.
          This project uses topic modeling to identify and visualize the dominant themes, their evolution
          over time, and their relationships to authors and to each other.
          </p>
        </div>
        
        <div className="footer-section methodology">
          <h3>Methodology</h3>
          <p>
          <li>Non-negative Matrix Factorization (NMF)</li>
            <li>React.js + D3.js</li>
            <li>Python for text processing</li>
          </p>
        </div>
        
       
  
      </div>
      
      <div className="copyright">
        <p>&copy; {new Date().getFullYear()} Zhuldyz Bakubay • Kazakh British Technical University</p>
      </div>
    </footer>
  );
};

export default Footer;
