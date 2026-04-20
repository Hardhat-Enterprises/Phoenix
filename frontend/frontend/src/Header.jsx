import React from "react";

const Header = () => {
  return (
    <header style={{
      backgroundColor: "#0b2a4a",
      color: "white",
      padding: "15px",
      display: "flex",
      alignItems: "center"
    }}>
      
      <img 
        src="https://via.placeholder.com/50" 
        alt="logo" 
        style={{ marginRight: "10px" }}
      />

      <div>
        <h1 style={{ margin: 0 }}>PHOENIX</h1>
        <p style={{ margin: 0 }}>
          Safeguarding Communities from Cyber Threats
        </p>
      </div>

    </header>
  );
};

export default Header;