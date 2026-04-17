import React from 'react';

const Footer = () => {
  return (
    <footer className="footer">
      <div className="footer-content">
        <p>&copy; {new Date().getFullYear()} Phoenix</p>
        <ul className="footer-links">
          <Link to ="/AboutUs">About Us System Purpose Phoenix supports disaster management by combining hazard monitoring, cyber threat visibility and alert based insights in a single dashboard. It's purpose is to improve awareness of physical and digital risks during disaster events.</Link>
          </ul>
      </div>
    </footer>
  );
};

export default Footer;