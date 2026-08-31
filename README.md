# **Project Phoenix 🐦‍🔥**

## AI-Driven Disaster & Cyber Threat Intelligence Platform (Web Application)

---

## **Overview**

Project Phoenix is a **web-based platform** designed to integrate **natural disaster data** with **cyber threat intelligence** to deliver **trusted, real-time risk insights**.

It addresses a critical problem:
during disasters, **cyber threats (misinformation, phishing, scams)** increase alongside physical risks.

Phoenix provides a unified system for:

* Detecting risks
* Scoring threats
* Delivering verified alerts

---

## **Target Platform & Audience**

* **Platform:** Web Application
* **Primary Users:**

  * General Public (awareness & alerts)
  * Disaster Management Authorities (decision support)

---

## **Core Objectives**

### **AI/ML Objectives**

* Build structured hazard + cyber datasets for PHOENIX risk modelling
* Maintain the AI003 cleaning pipeline for validation, duplicate handling, missing value checks, and cleaned CSV/report generation
* Maintain the AI004 feature engineering pipeline for hazard, cyber, temporal, geo, risk, and anomaly features
* Generate synthetic hazard-cyber records for model testing and controlled scenario validation
* Use the reusable AI008 training pipeline for sklearn and PyTorch experiments, checkpoints, reports, and TensorBoard logging
* Develop and compare anomaly detection models including Autoencoder, Isolation Forest, LOF, and One-Class SVM
* Maintain the core PHOENIX risk/correlation models, including Gradient Boosting and XGBoost experiments
* Support AI013 time-series forecasting for wildfire/fire-risk prediction using daily aggregated fire and weather features
* Prepare backend-ready inference outputs and sample JSON records for risk assessment integration

---

### **Backend Objectives**

* Identify and integrate reliable data sources (BE001)
* Build ingestion and storage pipelines (BE002, BE005)
* Design scalable database architecture (BE003)
* Develop APIs to serve processed risk data (BE007)
* Enable dashboard integration and data aggregation (BE008)
* Implement monitoring, logging, and deployment systems (BE009–BE012)
* Build notification systems for alerts (BE013)

---

### **Cybersecurity Objectives**

* Threat Data Finalisation: Prepare a clean, validated, and standardised dataset of disaster-relevant threats (CY001)
* System Architecture Understanding: Analyse and document the system architecture, components, and key assets (CY002)
* Data Flow Diagram: Create a data flow diagram showing how data moves, including entry points and trust boundaries (CY003)
* Threat Identification: Identify potential attackers, vulnerabilities, and attack scenarios affecting the system (CY005)
* STRIDE Threat Modelling: Apply the STRIDE model to assess threats, risks, and corresponding mitigations (CY006)
* TEAVS API Design: Design and document the API structure, endpoints, and alert handling processes (CY007)
* Authentication & Authorisation: Define and design secure authentication and role-based access control mechanisms (CY008)
* Input Validation & Security Rules: Establish rules to validate inputs and protect against common security vulnerabilities (CY009)
* Rate Limiting & Abuse Prevention: Implement controls to limit request rates and prevent abuse or malicious activity (CY010)
* Cryptographic Design: Design secure cryptographic processes, including hashing, signatures, and key management (CY011)
* Security Architecture Design: Develop a comprehensive security architecture integrating all security components (CY012)
* API Development: Build and test the API with full functionality and database integration (CY013) 
* Authentication Implementation: Implement and test secure authentication and authorisation mechanisms (CY014)
* Cryptography Implementation: Implement and verify cryptographic features to ensure data integrity and security (CY015)
* Endpoint Security Testing: Test API endpoints for vulnerabilities and document security findings (CY016)
* Logging & Monitoring: Implement logging and monitoring to detect and respond to suspicious activity (CY017)
* Incident Response Workflow: Define a structured process for detecting, managing, and communicating incidents (CY018)
* AI/ML Integration: Integrate and secure AI/ML components within the system while validating outputs (CY019)
* Risk Scoring System: Develop and validate a system to assess and score risks based on threats (CY020)
* Governance & Compliance: Ensure the system meets privacy, ethical, and regulatory compliance requirements (CY021)
* Cyber Resilience Blueprint: Produce a comprehensive blueprint outlining system design, security, and best practices (CY022)

---

### **Frontend Objectives**

* Define user journeys for both public and authorities (FE001)
* Design intuitive low-fidelity and high-fidelity interfaces (FE002–FE006)
* Build a responsive dashboard for:

  * Risk visualisation
  * Alerts
  * Threat insights
* Ensure accessibility and usability for real-world emergency scenarios

---

## **System Architecture (High-Level)**

```text
Data Sources → Data Cleaning → Feature Engineering → AI/ML Models → Risk Engine → API → Web Dashboard
                                                     ↓
                                             Verified Alert System
```

---

## **Key Features**

* 🌍 Hazard + Cyber Data Integration
* ⚠️ Real-Time Risk Detection
* 📊 Risk Scoring & Forecasting
* 🔐 Verified & Secure Alerts
* 📡 API-driven architecture
* 🖥️ Web-based dashboard

---

## **Tech Stack**

* **Languages:** Python, JavaScript
* **AI/ML:** scikit-learn, PyTorch, XGBoost
* **Data Processing:** Pandas, NumPy, YAML/JSON configs
* **Model Types:** Random Forest, Gradient Boosting, XGBoost, Isolation Forest, LOF, One-Class SVM, Autoencoder, LSTM forecasting
* **Experimentation:** Jupyter Notebook, TensorBoard, checkpointing, model reports
* **Backend:** FastAPI / Flask
* **Frontend:** Web (React / similar)
* **Database:** PostgreSQL / MongoDB
* **Cloud:** AWS
* **Messaging:** MQTT
* **Version Control:** Git, GitHub, branch-based PR workflow

---

## **Current Status**

🚧 Active Development / Integration Phase

* AI/ML cleaning, feature engineering, synthetic data, training pipeline, anomaly detection, core model, and forecasting workstreams are in progress
* Reusable model training pipeline supports sklearn and PyTorch workflows
* Backend-ready sample records and inference structures are being prepared for integration
* Sprint-based execution continues across AI/ML, backend, cybersecurity, and frontend teams

---

## **Vision**

To build a platform that **bridges disaster intelligence and cyber security**, enabling:

* Faster and more reliable emergency response
* Reduced impact of misinformation and cyber threats
* Data-driven decision making for authorities and the public
