import React from 'react';

const Footer = () => {
  return (
    <footer style={{
      textAlign: 'center',
      padding: '20px',
      backgroundColor: '#060606ff',
      marginTop: 'auto' // Helps keep it at the bottom
    }}>
        <p>&copy; {new Date().getFullYear()} Phoenix</p>
        <div className="footer-links">
          <p>About Us System Purpose Phoenix supports disaster management by combining hazard monitoring, cyber threat visibility and alert based insights in a single dashboard. It's purpose is to improve awareness of physical and digital risks during disaster events.</p>
        </div>
      
    </footer>
  );
};

export default Footer;