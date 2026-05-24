import React from 'react';
import './Footer.css';

const Footer = () => {
    return (
        <footer className='footer-container'>
            <div className='footer-content'>
                <p>&copy; {new Date().getFullYear()} Phoenix</p>
                <p>Phoenix supports disaster management by combining hazard monitoring, cyber threat visibility and alert based insights in a single dashboard. It's purpose is to improve awareness of physical and digital risks during disaster events.</p>
            </div>    
        </footer>
    );
};

export default Footer;