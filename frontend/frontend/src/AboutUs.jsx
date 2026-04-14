import Sidebar from "./components/Sidebar";

// This page is only being used for testing my assigned sidebar task.
// I kept the main content simple so the sidebar can be the main focus for now.

function AboutUs() {
  return (
    <div className="about-page">
      <Sidebar />

      <main className="about-content">
        <h1>About PHOENIX</h1>
        <p>
          This page introduces the PHOENIX system and explains its purpose in
          supporting disaster and cyber risk monitoring.
        </p>
      </main>
    </div>
  );
}

export default AboutUs;