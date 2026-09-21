import React from "react";
import { Link } from "react-router-dom";
import "./AboutUs.css";

// Where the "Help and Support" link goes. It must match the route in src/config/routes.js.
const HELP_PATH = "/help";

const glance = [
  {
    label: "What it is",
    text: "A working prototype dashboard that shows hazard information, such as bushfire and flood signals, alongside related cyber risk signals.",
  },
  {
    label: "The problem",
    text: "During bushfires and floods, cyber threats such as fraudulent donation sites and misinformation can spread when a community is most vulnerable.",
  },
  {
    label: "Who it is for",
    text: "Emergency services and local councils first, then Victorian communities and residents, and operators of critical services such as health services.",
  },
  {
    label: "What it gives them",
    text: "Hazard and cyber risk signals in one place, to help response teams spot areas of concern, and a prototype for exploring how official alerts could be verified.",
  },
];

const components = [
  {
    title: "Hazard-to-cyber risk modelling (inspired by ADCRS).",
    description:
      "An AI-assisted module that looks at hazard data together with cyber threat indicators to highlight areas of concern.",
  },
  {
    title: "Secure alert verification (inspired by TEAVS).",
    description:
      "A workflow that explores how official alerts and communications could be verified, so that communities can trust them.",
  },
];

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
  "Threat chart summarising recent threat signals by severity.",
  "Recent threat signal list with a detailed drill-down view for each item.",
  "Risk map displaying hazard markers with severity colour-coding.",
  "Location filter controls (state, local government area and suburb) built into the Risk Map, ready to narrow hazards down once location data is available.",
  "Alerts, Reports and Settings pages accessible from the main navigation.",
];

const inDevelopment = [
  "Location data: the backend does not yet have location records loaded, so the state / LGA / suburb filters have no options to choose from yet.",
  "Precise hazard-to-suburb linking: hazard records currently store only a state code, so hazards can only be matched to a location at state level for now.",
  "Regional anomaly detection: the panel is built, but its form is disabled wherever the backend anomaly-detection endpoint is not available.",
  "Full alert verification (TEAVS-inspired): the current build does not yet include a working cryptographic verification workflow. This remains a proof-of-concept goal.",
  "Broader hazard-to-cyber correlation pipeline: wider data sources beyond the current prototype feeds are still being integrated.",
  "Live delivery of real-time notifications to external systems is still being finalised.",
];

export default function AboutUs() {
  return (
    <div className="about-page">
      <div className="about-content">
        <div className="about-hero">
          <h1 className="about-page-title">About PHOENIX</h1>
          <p className="about-lead">
            PHOENIX is a prototype dashboard that helps emergency services and
            councils see disaster hazards and related cyber risks in one place.
          </p>

          <div className="about-cta-row">
            <Link to="/dashboard" className="about-cta primary">
              Open the dashboard
            </Link>
            <Link to="/reports" className="about-cta">
              View reports
            </Link>
          </div>
        </div>

        <section className="about-card" aria-labelledby="about-what-is">
          <h2 className="about-card-title" id="about-what-is">
            What PHOENIX is
          </h2>

          <dl className="about-glance">
            {glance.map((item) => (
              <div className="about-glance-item" key={item.label}>
                <dt>{item.label}</dt>
                <dd>{item.text}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="about-card" aria-labelledby="about-purpose">
          <h2 className="about-card-title" id="about-purpose">
            What PHOENIX does
          </h2>

          <img
            src="/about-banner.png"
            alt="Illustration of a central PHOENIX hub connected to satellites, servers and a dashboard of charts, on a dark blue background"
            className="about-banner"
          />

          <p className="about-body-text">
            PHOENIX brings real-time hazard signals (such as weather and
            emergency feeds) and cyber threat indicators (such as scam
            patterns and threat intelligence) into one dashboard. Together, the
            aim is to improve awareness of physical and digital risks during
            disaster events, and to help build community trust in official
            alerts and communications.
          </p>

          <div className="purpose-row">
            {/* Decorative: the heading and list beside it carry the meaning. */}
            <img src="/system-purpose.png" alt="" className="purpose-icon" />

            <div className="purpose-content">
              <h3 className="purpose-heading">
                Two proof-of-concept components
              </h3>
              <ul className="about-list">
                {components.map((item) => (
                  <li key={item.title}>
                    <strong>{item.title}</strong> {item.description}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section className="about-card" aria-labelledby="about-how-it-works">
          <h2 className="about-card-title" id="about-how-it-works">
            How PHOENIX works
          </h2>

          <ol className="process-list">
            {processSteps.map((step) => (
              <li className="process-step" key={step.title}>
                <div className="process-icon" aria-hidden="true">
                  {step.icon}
                </div>
                <div>
                  <h3 className="process-title">{step.title}</h3>
                  <p className="process-desc">{step.description}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="about-card" aria-labelledby="about-who-uses">
          <h2 className="about-card-title" id="about-who-uses">
            Who it is for
          </h2>

          <div className="role-grid">
            {roles.map((role) => (
              <div className="role-card" key={role.kicker}>
                <div
                  className={`role-card-icon ${role.iconClass}`}
                  aria-hidden="true"
                >
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

        <section className="about-card" aria-labelledby="about-capabilities">
          <h2 className="about-card-title" id="about-capabilities">
            What you can do today
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
            Still in development
            <span className="status-badge progress">In progress</span>
          </h2>

          <p className="about-body-text about-note">
            PHOENIX is a prototype under active development. The items below
            are known gaps that have not been completed yet, so results in
            these areas should not be treated as final:
          </p>

          <ul className="about-list">
            {inDevelopment.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>

        <section className="about-card" aria-labelledby="about-project">
          <h2 className="about-card-title" id="about-project">
            About this project
          </h2>

          <p className="about-body-text">
            PHOENIX is a Deakin University Capstone project run with the Cyber
            Security &amp; Disaster Resilience research team. This site is the
            working prototype built by a multidisciplinary student team across
            Frontend, Backend, AI/ML and Cybersecurity streams, within a
            12-week trimester.
          </p>
          <p className="about-body-text">
            Project title: Safeguarding Community Trust and Critical Services
            from Cyber Threats in Bushfire and Flood Disasters.
          </p>
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
            For assistance, email{" "}
            <a
              href="mailto:support@phoenixdashboard.com"
              className="support-link"
            >
              support@phoenixdashboard.com
            </a>{" "}
            or open the Help and Support page.
          </p>

          <div className="quick-links">
            <Link to={HELP_PATH} className="quick-link-button">
              Open Help and Support
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
