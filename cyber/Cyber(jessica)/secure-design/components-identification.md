# TEAVS and ADCRS Component Identification
The PHOENIX system consists of two main subsystems: the Artificial Intelligence-driven cyber risk modelling system (ADCRS) and the Trusted Emergency Alert Verification System (TEAVS). These components work together to detect cyber threats during disasters and deliver secure, authenticated alerts to users.
---

## ADCRS Components (AI-driven Risk Modelling System)
ADCRS is responsible for analysing hazard and cyber threat data to identify potential risks such as scams, phishing, and misinformation during bushfire and flood events.

### 1. Data Ingestion Module
Collects data from external sources such as BoM, Scamwatch, government feeds, and public reports.

### 2. Data Processing and Normalisation Module
Cleans, filters, and standardises incoming data to ensure consistency for accurate analysis.

### 3. Threat Correlation Engine
Correlates disaster-related events with cyber threat indicators to identify possible attack patterns or suspicious activities.

### Anomaly Detection Module
Uses AI techniques to detect unusual behaviour or deviations from normal patterns in real time.

### Risk Scoring Module
Assigns a risk level (e.g., low, medium, high, critical) to detected threats to prioritise response actions.

### Threat Intelligence Database
Stores collected data, processed information, and detected threats for further analysis and historical reference.

### Output Interface to TEAVS
Transfers analysed threat data and risk insights to the TEAVS system for alert generation.
---

## TEAVS Components (Secure Alert and Verification System)

TEAVS is responsible for generating, securing, verifying, and distributing trusted alerts.

### 1. Alert Creation Module
Generates alerts based on analysed threats.

### 2. Message Formatting Module
Formats alerts into a standard structure.

### 3. Digital Signature Module
Signs alerts to ensure authenticity and integrity.

### 4. Verification Module
Allows users to verify alerts.

### 5. Key Management Module
Manages cryptographic keys securely.

### 6. Alert Distribution Module
Sends alerts to users, councils, and emergency services.

### 7. Alert Logging and Audit Module
Stores logs of alerts and system activity.
---

## Component Interaction

ADCRS analyses threats and sends results to TEAVS. TEAVS then generates secure alerts and distributes them to users. This ensures reliable and trustworthy communication during disasters.