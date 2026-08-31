import React from "react";
import "./AboutUs.css";

const roles = [
  {
    icon: "🚒",
    iconClass: "emergency",
    kicker: "Emergency Services & Local Councils",
    title: "Coordinating response",
    description:
      "Emergency services and local councils are PHOENIX's primary users. The dashboard is designed to help them coordinate disaster response by viewing hazard information and correlated cyber risk signals in one place.",
  },
  {
    icon: "🏘️",
    iconClass: "stakeholders",
    kicker: "Communities & Residents",
    title: "Trustworthy alerts",
    description:
      "Victorian communities and residents are also a primary audience. A core goal of PHOENIX is to help the public rely on authenticated, trustworthy alerts during bushfire and flood events, rather than scams or misinformation.",
  },
  {
    icon: "🏥",
    iconClass: "analysts",
    kicker: "Critical Service Operators",
    title: "Early risk awareness",
    description:
      "Operators of critical services, such as health services, are a secondary audience who benefit from early awareness of correlated hazard and cyber risk signals affecting their operations.",
  },
];

const processSteps = [
  {
    icon: "📡",
    title: "Hazard & Threat Data Collection",
    description:
      "Real-time hazard signals (such as weather and emergency feeds) are combined with cyber threat indicators, such as scam patterns and threat intelligence.",
  },
  {
    icon: "🧮",
    title: "Risk Correlation & Scoring",
    description:
      "A lightweight, explainable risk-scoring and anomaly-detection prototype correlates hazard data with cyber threat indicators to highlight areas of concern.",
  },
  {
    icon: "🔏",
    title: "Alert Verification (Prototype)",
    description:
      "A proof-of-concept workflow explores how official communications could be verified, using simplified trust models rather than production-grade cryptography.",
  },
  {
    icon: "📊",
    title: "Insights Display",
    description:
      "The resulting insights are presented on the web dashboard for stakeholder review.",
  },
];

const capabilities = [
  "Secure sign-in with role-based session handling.",
  "Central dashboard showing live hazard, threat and risk totals.",
  "Regional anomaly detection panel that submits a request to the backend AI model and displays the result.",
  "Threat chart summarising recent threat signals by severity.",
  "Recent threat signal list with a detailed drill-down view for each item.",
  "Risk map displaying hazard markers with severity colour-coding.",
  "Location filter controls (state, local government area and suburb) built into the Risk Map, ready to narrow hazards down once location data is available.",
  "Alerts, Reports and Settings pages accessible from the main navigation.",
];

const inDevelopment = [
  "Location data: the backend does not yet have location records loaded, so the state / LGA / suburb filters have no options to choose from yet.",
  "Precise hazard-to-suburb linking: hazard records currently store only a state code, so hazards can only be matched to a location at state level for now.",
  "Full alert verification (TEAVS-inspired): the current build does not yet include a working cryptographic verification workflow — this remains a proof-of-concept goal.",
  "Broader hazard-to-cyber correlation pipeline: wider data sources beyond the current prototype feeds are still being integrated.",
  "A dedicated Help Center page has not been built yet — for now, support questions go through the contact details below.",
  "Live delivery of real-time notifications to external systems is still being finalised.",
];

export default function AboutUs({ setPage }) {
  const goTo = (target) => {
    if (typeof setPage === "function") {
      setPage(target);
    }
  };

  return (
    <div className="about-page">
      <div className="about-content">
        <h1 className="about-page-title">About PHOENIX</h1>
        <p className="about-page-subtitle">
          Safeguarding Community Trust and Critical Services from Cyber
          Threats in Bushfire and Flood Disasters
        </p>

        <section className="about-card" aria-labelledby="about-what-is">
          <h2 className="about-card-title" id="about-what-is">
            What is PHOENIX?
          </h2>

          <img
            src="/about-banner.png"
            alt="PHOENIX disaster and cyber risk monitoring dashboard banner"
            className="about-banner"
          />

          <p className="about-body-text">
            PHOENIX is a Deakin University Capstone project run with the
            Cyber Security &amp; Disaster Resilience research team. It
            explores how AI-assisted risk modelling and secure alert
            verification can help protect communities and emergency
            services from cyber threats that emerge during bushfire and
            flood events — for example, fraudulent donation sites and
            misinformation that can spread when a community is most
            vulnerable.
          </p>

          <p className="about-body-text" style={{ marginTop: "10px" }}>
            The project prototypes a system that correlates real-time
            hazard signals (such as weather and emergency feeds) with
            cyber threat indicators (such as scam patterns and threat
            intelligence), and presents the resulting insights through
            this dashboard. This site is the working prototype produced by
            a multidisciplinary student Capstone team across Frontend,
            Backend, AI/ML and Cybersecurity streams, developed within a
            12-week trimester.
          </p>
        </section>

        <section className="about-card" aria-labelledby="about-purpose">
          <h2 className="about-card-title" id="about-purpose">
            System Purpose
          </h2>

          <div className="purpose-row">
            <img
              src="/system-purpose.png"
              alt="Illustration representing PHOENIX's goal of improving situational awareness"
              className="purpose-icon"
            />

            <div className="purpose-content">
              <h3 className="purpose-heading">
                Two Components, One Prototype
              </h3>
              <p className="about-body-text">
                PHOENIX focuses on two proof-of-concept components: an
                AI-assisted hazard-to-cyber risk modelling module (inspired
                by ADCRS), and a secure alert verification workflow
                (inspired by TEAVS). Together, the goal is to improve
                awareness of physical and digital risks during disaster
                events, and to help build community trust in official
                alerts and communications.
              </p>
            </div>
          </div>
        </section>

        <section className="about-card" aria-labelledby="about-who-uses">
          <h2 className="about-card-title" id="about-who-uses">
            Who Uses This System?
          </h2>

          <div className="role-grid">
            {roles.map((role) => (
              <div className="role-card" key={role.kicker}>
                <div className={`role-card-icon ${role.iconClass}`} aria-hidden="true">
                  {role.icon}
                </div>
                <div className="role-card-body">
                  <p className="role-kicker">{role.kicker}</p>
                  <h3 className="role-title">{role.title}</h3>
                  <p className="role-desc">{role.description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="about-card" aria-labelledby="about-how-it-works">
          <h2 className="about-card-title" id="about-how-it-works">
            How PHOENIX Works
          </h2>

          <div className="process-list">
            {processSteps.map((step) => (
              <div className="process-step" key={step.title}>
                <div className="process-icon" aria-hidden="true">
                  {step.icon}
                </div>
                <div>
                  <h3 className="process-title">{step.title}</h3>
                  <p className="process-desc">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="about-card" aria-labelledby="about-capabilities">
          <h2 className="about-card-title" id="about-capabilities">
            Current Capabilities
            <span className="status-badge done">Available now</span>
          </h2>

          <ul className="about-list">
            {capabilities.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>

        <section className="about-card" aria-labelledby="about-in-development">
          <h2 className="about-card-title" id="about-in-development">
            Features in Development
            <span className="status-badge progress">In progress</span>
          </h2>

          <p className="about-body-text" style={{ marginBottom: "10px" }}>
            PHOENIX is a prototype under active development. The items
            below are known gaps that have not been completed yet, so
            results in these areas should not be treated as final:
          </p>

          <ul className="about-list">
            {inDevelopment.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>

        <section
          className="about-card about-support-card"
          aria-labelledby="support-contact-heading"
          id="support-contact"
        >
          <h2 className="about-card-title" id="support-contact-heading">
            Support &amp; Contact
          </h2>

          <p className="about-body-text">
            For assistance, reach out to{" "}
            <a href="mailto:support@phoenixdashboard.com" className="support-link">
              support@phoenixdashboard.com
            </a>
            . A dedicated Help Center page is planned but not built yet —
            see Features in Development above.
          </p>

          <div className="quick-links">
            <button
              type="button"
              className="quick-link-button"
              onClick={() => goTo("dashboard")}
            >
              Go to Dashboard
            </button>

            <button
              type="button"
              className="quick-link-button"
              onClick={() => goTo("reports")}
            >
              Go to Reports
            </button>

            <a href="#support-contact" className="quick-link-button">
              Help &amp; Support
            </a>
          </div>
        </section>
      </div>
    </div>
  );
}

