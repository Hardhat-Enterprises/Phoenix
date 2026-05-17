
# CY0018 - Validate AI Data

## Scope

This plan focuses on AI input and output handling, possible system responses during
data validation and possible scenarios that may occur along with how these cases are
handled.

---

# Input Data Types

- Disaster data feeds ( Bureau of Meteorology (BoM), Country Fire Authority (CFA), etc. )
- Cybersecurity threat and scam intelligence feeds (ACCC Scamwatch, Australian Signals Directorate (ASD)), MITRE ATT&CK framework
- Social media and public data sources
- Community and authorised feedback inputs

---

## Input AI Data Validation – Before AI Processing

This stage ensures that incoming data is correctly structured, properly typed and in the
appropriate format before being processed by the AI model. This helps to prevent
validation errors, improves data quality and reduces the risk of incorrect or misleading
AI inputs.

## Validation Types – Input

- **Schema validation** – to verify structure and ensure that required fields are present in the data
- **Format validation** – ensures that it’s the correct data type and follows the expected format for the data type (email, phone numbers, datetime)
- **Deduplication** – to avoid processing repeated data and remove multiple entries
- **Source authentication** – to verify that the data source is legitimate and from trusted sources
- **Failure handling** – to retry the data if failures occur
- **Security validation** – to detect and prevent malicious, manipulated or suspicious data sources from entering the system

---

# Output AI Data Validation – After AI Processing

- Validate ai outputs, such as the format and structure of the output data
- Ensure that the output data is relevant to the input data that was processed
- Detect anomalies or unexpected outputs

---

# Data Validation Scenarios

| Validation Type | Expected Scenarios | Expected Outcome |
|---|---|---|
| **Schema validation** | Missing data attributes, fields (datetime, location) | Data will be rejected |
| **Schema validation** | Inputs containing undefined fields, patterns or formats | Data rejected or flagged for review |
| **Schema validation** | Conflicting or inconsistent field values | Data rejected due to schema requirements |
| **Schema validation** | Incomplete API responses (missing fields in data) | Data rejected or flagged as incomplete |
| **Schema validation** | Fields containing null or empty values | Data rejected or flagged for review |
| **Schema validation** | Data inputs from different sources containing inconsistent values (same event with different dates) | Data rejected or flagged for inconsistency |
| **Format validation** | Incorrect data types (datetime in text) | Data will be rejected due to invalid format |
| **Format validation** | Malformed API response (invalid JSON) | Data will be rejected |
| **Format validation** | Inconsistent formatting across sources (date or location formats) | Data will be standardised or flagged |
| **Format validation** | Special or unsupported characters (#, *) in input data | Data could be sanitised or rejected |
| **Format validation** | Incorrect field formats | Data rejected or flagged for correction |
| **Deduplication** | Exact duplicate scam reports from multiple sources | Duplicate data entries will be removed |
| **Deduplication** | Modified scam data or similar duplicate entries | Data will be flagged and filtered as duplicate | 
| **Deduplication** | Same event records from multiple platforms | Data will be consolidated into a single entry |
| **Deduplication** | Repeated submissions during disaster scenarios | Duplicate data will be filtered to prevent overloads |
| **Source authentication** | Invalid API key from external data sources | Data will be rejected |
| **Source authentication** | Expired or invalid source credentials | Data will be rejected until re-authenticated |
| **Source authentication** | Man-in-the-Middle or tampered data inputs | Data will be rejected |
| **Source authentication** | Spoofed external sources | Data will be rejected or flagged as suspicious |
| **Source authentication** | Unauthorised or unknown data sources attempts to send input | Sources will be unable to send inputs and will be denied |
| **Failure handling** | Unavailability of external APIs | System retries data fetching (exponential backoff ) |
| **Failure handling** | Network failures (during data retrieval, processing) | Retry mechanism will be triggered |
| **Failure handling** | Partial data inputs received | Data will be rejected or retried for completeness |
| **Failure handling** | Timeout or delayed response from data source | Request will be retried automatically |
| **Failure handling** | Continuous failure in fetching data | Failure will be logged, and an alert is raised |
| **Security validation** | Data poisoning attempts | Data will be flagged for review or rejected|
| **Security validation** | Malicious payloads (scripts, code injections) | Data input will be blocked or sanitised |
| **Security validation** | Irrelevant data inputs | Data will be rejected and discarded | 
| **Security validation** | Inputs designed to bypass validation or detection | Data will be flagged |
| **Security validation** | Flooding attacks – repeated inputs in high volumes | Input rates are limited or filtered so will be rejected |

