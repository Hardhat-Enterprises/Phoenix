# Notification Service – Member 4 Test Results

**Role:** Member 4 – Observability, Documentation and Quality Assurance
**Project:** Phoenix Backend / Team Project B
**Last updated:** 12 September 2026

---

## 1. Test Execution Summary

This document records the testing and QA work completed for the Phoenix Notification Service and related backend services.

Testing covered:

- Docker service availability
- Notification Service startup and recovery
- Notification API endpoints
- API Gateway error handling and logging
- Swagger/OpenAPI verification
- Structured logging
- RabbitMQ connectivity and consumer monitoring
- RabbitMQ failure and recovery
- RabbitMQ message processing
- RabbitMQ → database integration
- Invalid and duplicate message scenarios
- Health endpoints
- Authentication protection
- Jest/TypeScript unit testing
- TypeScript build verification
- Final Docker environment verification

The testing was performed in the local Phoenix backend Docker environment.

---

## 2. Latest Verification Summary

| Verification | Result |
|---|---|
| Automated unit tests | **6/6 PASS** |
| Test suites | **2/2 PASS** |
| TypeScript build (`npm run build`) | **PASS** |
| Docker Compose final status | **PASS** |
| RabbitMQ container health | **HEALTHY** |
| Redis container health | **HEALTHY** |
| Notification API health | **PASS** |
| Notification API retrieval endpoint | **PASS** |
| Swagger/OpenAPI verification | **PASS** |
| Authentication protection | **PASS** |
| RabbitMQ failure detection | **PASS** |
| RabbitMQ recovery after ingestion restart | **PASS** |
| RabbitMQ automatic reconnection | **GAP / NOT IMPLEMENTED** |
| Duplicate message prevention | **GAP / NOT IMPLEMENTED** |
| Notification database retrieval | **PARTIAL** |
| Authenticated API → DB test | **BLOCKED** |

---

## 3. Test Results

| Test ID | Test Scenario | Expected Result | Actual Result | Status |
|---|---|---|---|---|
| T01 | Docker services start successfully | Required services start without errors | All required containers were running; RabbitMQ and Redis were healthy | PASS |
| T02 | Notification service startup | Notification service starts and gRPC server listens on port 50052 | gRPC server started successfully on port 50052 | PASS |
| T03 | Notification structured startup logging | Startup event is recorded using shared structured logging | Winston logger recorded service startup information | PASS |
| T04 | Notification health endpoint | Health endpoint returns HTTP 200 when service is available | `/api/notifications/health` returned HTTP 200 | PASS |
| T05 | Get notifications endpoint | Notification endpoint returns a successful response | `/api/notifications` returned HTTP 200 with an empty notifications array | PASS |
| T06 | Notification service unavailable | API Gateway handles unavailable Notification Service safely | Endpoint returned HTTP 500 with a safe error message | PASS |
| T07 | Notification service recovery | API works after Notification Service recovery | Notification Service was restarted and health returned HTTP 200 | PASS |
| T08 | API Gateway error logging | Dependency failure is logged | gRPC `UNAVAILABLE` error was recorded using the shared logger | PASS |
| T09 | API Gateway recovery logging | Successful recovery is logged | Successful Notification Service response was recorded | PASS |
| T10 | Swagger notification documentation | Notification endpoints are documented and executable | Both notification endpoints were available and tested through Swagger UI | PASS |
| T11 | Ingestion service health | Ingestion health endpoint responds when service is operational | Returned HTTP 200 | PASS |
| T12 | Storage service health | Storage health endpoint responds | Returned HTTP 200 | PASS |
| T13 | User service health | User health endpoint responds | Returned HTTP 200 | PASS |
| T14 | RabbitMQ connectivity | Data Ingestion Service connects to RabbitMQ | RabbitMQ connection established successfully | PASS |
| T15 | RabbitMQ queue consumers | Required queues have active consumers | Hazard, cyber and core queues each had one active consumer | PASS |
| T16 | RabbitMQ unavailable | Ingestion health detects required RabbitMQ dependency failure | RabbitMQ was stopped; ingestion health returned HTTP 503 with RabbitMQ unavailable message | PASS |
| T17 | RabbitMQ automatic recovery | Consumers reconnect when RabbitMQ becomes available | Consumers remained at 0 after RabbitMQ restart until ingestion service was restarted | GAP |
| T18 | RabbitMQ recovery after ingestion restart | Consumers become active after ingestion service restart | All three queues returned to one active consumer | PASS |
| T19 | Core ingestion authentication | Protected endpoint rejects unauthenticated requests | `/api/ingestion/core` returned HTTP 401 when no token was provided | PASS |
| T20 | Invalid RabbitMQ message | Malformed message is safely handled and does not crash the consumer | Invalid JSON was received, error logged, then message was acknowledged and discarded | PASS |
| T21 | Notification database retrieval | Notification endpoint retrieves records from database | Endpoint returns successfully, but current implementation returns a static response rather than querying notification records | PARTIAL |
| T22 | RabbitMQ consumer structured logging | Consumer events use shared structured logger | Consumer lifecycle and processing events use the shared logger | PASS |
| T23 | Duplicate RabbitMQ message handling | Duplicate event should not be processed more than once | Same valid message was processed twice; no idempotency mechanism is currently implemented | GAP |
| T24 | RabbitMQ → database hazard ingestion | Valid RabbitMQ hazard message is persisted successfully | Valid message with numeric `hazard_severity` was processed successfully | PASS |
| T25 | Storage upload authentication | Protected upload endpoint rejects requests without token | `POST /api/storage/upload` returned HTTP 401 `No token provided` | PASS |
| T26 | Storage Upload Swagger documentation | Upload endpoint documents authentication and multipart file input | Swagger showed bearer authentication, required `file` field, multipart/form-data and documented responses | PASS |
| T27 | Jest Notification Service unit tests | Notification service logic passes automated unit tests | Notification service tests passed | PASS |
| T28 | Jest gRPC handler unit tests | gRPC success and error paths pass automated tests | gRPC handler tests passed, including error handling | PASS |
| T29 | Full Jest test command | All configured tests pass using `npm test` | 2 suites and 6 tests passed | PASS |
| T30 | TypeScript build | Backend compiles without TypeScript errors | `npm run build` completed successfully | PASS |
| T31 | Final Docker verification | All required services remain operational after changes | All services were Up; RabbitMQ and Redis were healthy | PASS |

---

# 4. Detailed Test Results

## T01 – Docker Services

**Objective:** Verify that the required backend environment is running successfully.

**Test Procedure:**

```text
docker compose ps
```

**Expected Result:** All required backend services should be running.

**Actual Result:** The final Docker Compose status showed:

- API Gateway – Up
- Data Ingestion Service – Up
- Notification Service – Up
- Storage Service – Up
- User Service – Up
- RabbitMQ – Up and healthy
- Redis – Up and healthy

**Status:** PASS

**Evidence:** Final `docker compose ps` screenshot.

---

## T02 – Notification Service Startup

**Objective:** Verify that the Notification Service starts successfully and exposes its gRPC service.

**Expected Result:** The Notification Service should start successfully and listen on port `50052`.

**Actual Result:** The Notification Service successfully started its gRPC server on port `50052`.

**Status:** PASS

---

## T03 – Structured Startup Logging

**Objective:** Verify that Notification Service startup events use the shared structured logger.

**Expected Result:** Startup information should include useful operational logging such as timestamp, level, service and message.

**Actual Result:** Notification Service startup uses the shared Winston logger and records the startup event.

**Status:** PASS

---

## T04 – Notification Health Endpoint

**Objective:** Verify that the Notification Service health endpoint responds when the service is available.

**Endpoint:**

```text
GET /api/notifications/health
```

**Expected Result:** HTTP 200 when the Notification Service is available.

**Actual Result:**

```json
{
  "message": "Notification service is running"
}
```

The endpoint returned HTTP 200.

**Status:** PASS

---

## T05 – Get Notifications Endpoint

**Objective:** Verify that the notification retrieval endpoint responds successfully.

**Endpoint:**

```text
GET /api/notifications
```

**Actual Result:**

```json
{
  "message": "Notifications fetched successfully",
  "notifications": []
}
```

The endpoint returned HTTP 200.

**Status:** PASS

**Important Limitation:** The current `getNotifications()` implementation returns a static response and does not demonstrate an actual PostgreSQL notification query. Therefore this is an API functionality pass, not a full database-retrieval pass.

---

## T06 – Notification Service Failure

**Objective:** Verify API behaviour when the Notification Service is unavailable.

**Test Procedure:** The Notification Service container was stopped and the notification health endpoint was called through the API Gateway.

**Expected Result:** API Gateway should handle the unavailable dependency safely.

**Actual Result:** The API returned HTTP 500 with a safe error message:

```json
{
  "message": "Error fetching notification health"
}
```

**Status:** PASS

---

## T07 – Notification Service Recovery

**Objective:** Verify that the API works after Notification Service recovery.

**Test Procedure:** The Notification Service container was restarted.

**Expected Result:** Notification health should return HTTP 200 again.

**Actual Result:** The health endpoint returned HTTP 200 after the service was restarted.

**Status:** PASS

---

## T08 – API Gateway Error Logging

**Objective:** Verify that dependency failures are recorded by the API Gateway.

**Expected Result:** The dependency failure should be logged without exposing sensitive information.

**Actual Result:** The API Gateway recorded the gRPC dependency failure using the shared logger.

**Status:** PASS

---

## T09 – API Gateway Recovery Logging

**Objective:** Verify that successful dependency recovery is logged.

**Expected Result:** A successful response should be recorded after the Notification Service becomes available.

**Actual Result:** The API Gateway recorded the successful notification health response.

**Status:** PASS

---

## T10 – Swagger/OpenAPI Verification

**Objective:** Verify that the Notification API is documented and executable through Swagger UI.

**Swagger URL:**

```text
http://localhost:3001/api/docs/
```

**Verified endpoints:**

```text
GET /api/notifications/health
GET /api/notifications
```

**Expected Result:** Both endpoints should be documented and executable.

**Actual Result:** Both endpoints were available through Swagger UI and successfully tested.

**Status:** PASS

---

## T11 – Ingestion Service Health

**Objective:** Verify the Data Ingestion Service health endpoint.

**Expected Result:** HTTP 200 when operational.

**Actual Result:** Health endpoint returned HTTP 200.

**Status:** PASS

---

## T12 – Storage Service Health

**Objective:** Verify the Storage Service health endpoint.

**Expected Result:** HTTP 200 when operational.

**Actual Result:** Storage health endpoint returned HTTP 200.

**Status:** PASS

---

## T13 – User Service Health

**Objective:** Verify the User Service health endpoint.

**Expected Result:** HTTP 200 when operational.

**Actual Result:** User health endpoint returned HTTP 200.

**Status:** PASS

**Note:** A previous database connection issue was observed during testing. The current health endpoint does not necessarily prove that every external dependency is healthy.

---

## T14 – RabbitMQ Connectivity

**Objective:** Verify that the Data Ingestion Service can connect to RabbitMQ.

**Expected Result:** Successful RabbitMQ connection.

**Actual Result:** The service successfully connected to RabbitMQ and recorded the connection using the shared logger.

**Status:** PASS

---

## T15 – RabbitMQ Queue Consumers

**Objective:** Verify that the required RabbitMQ queues have active consumers.

**Expected Result:** Required queues should have active consumers.

**Actual Result:**

```text
cyber_data_creation_queue          1 consumer
core_model_integration_queue       1 consumer
hazard_data_creation_queue         1 consumer
```

**Status:** PASS

---

## T16 – RabbitMQ Unavailable

**Objective:** Verify ingestion health behaviour when RabbitMQ becomes unavailable.

**Test Procedure:** RabbitMQ was stopped using Docker:

```text
docker stop phoenix-rabbitmq
```

The ingestion health endpoint was then tested.

**Expected Result:** The health endpoint should identify RabbitMQ as unavailable because it is a required dependency for message processing.

**Actual Result:**

```text
HTTP 503
Data ingestion service is unhealthy: RabbitMQ is unavailable
```

The service also recorded RabbitMQ connection closure and the health-check failure.

**Status:** PASS

---

## T17 – RabbitMQ Automatic Recovery

**Objective:** Verify whether RabbitMQ consumers automatically reconnect after RabbitMQ becomes available again.

**Test Procedure:** RabbitMQ was restarted after the failure test.

**Expected Result:** Consumers should automatically reconnect if automatic recovery is implemented.

**Actual Result:** RabbitMQ became healthy again, but the Data Ingestion Service remained disconnected and queue consumers remained at 0 until the ingestion service was restarted.

**Status:** GAP

**Finding:** Automatic RabbitMQ reconnection/consumer recovery is not currently implemented or is not functioning reliably.

**Recommendation:** Consider implementing connection recovery and consumer re-registration after RabbitMQ connection loss.

---

## T18 – RabbitMQ Recovery After Ingestion Restart

**Objective:** Verify recovery after restarting the Data Ingestion Service.

**Test Procedure:**

```text
docker restart ingestion-service
```

**Expected Result:** RabbitMQ connection and consumers should be restored.

**Actual Result:** All three queues returned to one active consumer and the ingestion health endpoint returned HTTP 200.

**Status:** PASS

---

## T19 – Core Ingestion Authentication

**Objective:** Verify that the protected Core Model Integration endpoint rejects unauthenticated requests.

**Endpoint:**

```text
POST /api/ingestion/core
```

**Expected Result:** HTTP 401 when no token is provided.

**Actual Result:**

```text
HTTP 401 Unauthorized
No token provided
```

**Status:** PASS

---

## T20 – Invalid RabbitMQ Message

**Objective:** Verify that malformed Core Model RabbitMQ messages are safely handled.

**Test Procedure:** A malformed message containing invalid JSON was published to:

```text
core_model_integration_queue
```

**Expected Result:** The consumer should not crash. The invalid message should be handled safely.

**Actual Result:** The consumer logged the processing failure and then acknowledged and discarded the malformed message.

Observed behaviour:

```text
RabbitMQ message received from queue: core_model_integration_queue
RabbitMQ core model message processing failed ...
RabbitMQ core model invalid message acknowledged and discarded ...
```

**Status:** PASS

---

## T21 – Notification Database Retrieval

**Objective:** Verify that the Notification Service retrieves notification records from PostgreSQL.

**Expected Result:** The service should query the database and return stored notification records.

**Actual Result:** The endpoint returned successfully, but inspection of the current implementation showed that `getNotifications()` currently returns a static response rather than performing a database query.

**Status:** PARTIAL

**Finding:** API endpoint functionality is operational, but actual Notification Service → PostgreSQL retrieval has not been demonstrated.

---

## T22 – RabbitMQ Consumer Structured Logging

**Objective:** Verify that RabbitMQ consumer lifecycle and processing events use the shared structured logger.

**Expected Result:** Consumer startup, message receipt, success, failure and invalid-message events should use the shared logger.

**Actual Result:** The current consumer implementation uses the shared logger for consumer startup, message receipt, successful processing, failures and invalid-message handling.

**Status:** PASS

---

## T23 – Duplicate RabbitMQ Message Handling

**Objective:** Verify that the same event is not processed multiple times.

**Test Procedure:** The same valid Core Model message was published twice to:

```text
core_model_integration_queue
```

**Expected Result:** If duplicate prevention/idempotency is implemented, the duplicate event should not be processed twice.

**Actual Result:** Both messages were processed and the Core Model inference was executed twice.

**Status:** GAP

**Finding:** No idempotency or duplicate-event prevention mechanism is currently implemented.

**Recommendation:** The development team should define an event/message ID and idempotency strategy before implementing duplicate prevention.

---

## T24 – RabbitMQ → Database Hazard Ingestion

**Objective:** Verify that a valid hazard message can flow from RabbitMQ through the ingestion service and into PostgreSQL.

**Test Procedure:** A valid hazard payload was published with a numeric `hazard_severity` value.

**Expected Result:** The message should be consumed and persisted successfully.

**Actual Result:** The service logged successful hazard processing and successful RabbitMQ acknowledgement.

**Status:** PASS

**Note:** Earlier invalid payloads were also tested:

- Missing `hazard_severity` → database `notNull` validation failure.
- String `hazard_severity` such as `"medium"` → numeric conversion/database validation failure.
- Numeric `hazard_severity: 0.5` → successful processing.

These tests demonstrated database input validation.

---

## T25 – Storage Upload Authentication

**Objective:** Verify that the protected Storage Upload endpoint rejects unauthenticated requests.

**Endpoint:**

```text
POST /api/storage/upload
```

**Expected Result:** HTTP 401 when no bearer token is provided.

**Actual Result:**

```text
HTTP 401
No token provided
```

**Status:** PASS

---

## T26 – Storage Upload Swagger Documentation

**Objective:** Verify the Storage Upload API documentation.

**Verified endpoint:**

```text
POST /api/storage/upload
```

Swagger showed:

- Bearer authentication
- Required request body
- `multipart/form-data`
- Required `file` field
- Binary file input
- 201 response
- 400 response
- 401 response
- 500 response

**Status:** PASS

---

# 5. Unit Testing

## Jest Configuration

A Jest/TypeScript testing setup was added to the backend.

Files added:

```text
jest.config.js
tsconfig.jest.json
```

The root `package.json` now includes:

```json
"test": "jest --runInBand"
```

---

## Unit Test Files

### Notification Service tests

```text
notification-service/src/notification.service.test.ts
```

Tests include:

- `getHealth()` success
- `getNotifications()` success

### gRPC handler tests

```text
notification-service/src/grpc/notification.handler.test.ts
```

Tests include:

- Health response success
- Notifications response success
- Health handler error handling
- Notifications handler error handling

---

## Latest Jest Result

Command:

```text
npm test
```

Result:

```text
PASS notification-service/src/grpc/notification.handler.test.ts
PASS notification-service/src/notification.service.test.ts

Test Suites: 2 passed, 2 total
Tests:       6 passed, 6 total
Snapshots:   0 total
```

**Status: PASS — 6/6 tests passed**

---

# 6. TypeScript Build Verification

Command:

```text
npm run build
```

Result:

```text
> build
> tsc -b
```

The command completed without TypeScript errors.

**Status: PASS**

---

# 7. Final Docker Verification

Command:

```text
docker compose ps
```

Final environment showed:

```text
api-gateway              Up
ingestion-service        Up
notification-service     Up
phoenix-rabbitmq         Up (healthy)
phoenix-redis            Up (healthy)
storage-service          Up
user-service             Up
```

**Status: PASS**

---

# 8. API → Database Testing Status

An authenticated Storage Upload test was prepared to verify:

```text
API Gateway
    ↓
Authentication
    ↓
Storage Service
    ↓
PostgreSQL
```

A test file was created for the upload test.

However, the available old test credentials were rejected with:

```text
401 Invalid username or password
```

Repository searches did not identify a valid project-level test account or seed fixture that could be safely used.

The database was not modified simply to manufacture a passing test.

**Status:** BLOCKED

**Reason:** No valid test credentials were available.

---

# 9. Failure and Reliability Findings

## F01 – RabbitMQ Automatic Reconnection

**Status:** GAP

After RabbitMQ was restarted, the ingestion service did not automatically reconnect until the ingestion service itself was restarted.

**Impact:** Message processing can remain unavailable after a RabbitMQ outage.

**Recommendation:** Implement RabbitMQ connection recovery and consumer re-registration.

---

## F02 – Duplicate Message Handling

**Status:** GAP

Publishing the same valid event twice resulted in two processing operations.

**Impact:** Duplicate events could potentially result in duplicate processing or records.

**Recommendation:** Define an event/message ID and implement idempotency according to the team's agreed data model.

---

## F03 – Notification Database Retrieval

**Status:** PARTIAL

The Notification API responds successfully, but the current notification retrieval service returns a static response instead of querying notification records from PostgreSQL.

**Impact:** API availability does not currently prove notification persistence/retrieval.

**Recommendation:** Implement or verify the required notification repository/database retrieval functionality.

---

## F04 – Database Failure Acknowledgement Semantics

**Status:** GAP

Some ingestion service database errors are caught in service-level functions without necessarily being propagated back to the RabbitMQ consumer.

**Impact:** A failed database operation could potentially be acknowledged as successfully processed.

**Recommendation:** Define clear error propagation and acknowledgement/retry behaviour for database failures.

---

## F05 – Authenticated API → DB Test

**Status:** BLOCKED

The authenticated Storage Upload → PostgreSQL test could not be completed because no valid test credentials were available.

**Recommendation:** Provide a safe test account or test fixture through the project team.

---

## F06 – TEAVS / ADCRS Direct Communication

**Status:** NOT IMPLEMENTED / TO BE DEFINED

The existing Core Model integration endpoint can receive payloads and perform XGBoost risk analysis, but a dedicated direct TEAVS → ADCRS communication implementation was not identified.

**Recommendation:** The team should define the required TEAVS/ADCRS interface, request/response structure, authentication, error handling and synchronous/asynchronous communication model.

---

# 10. Evidence to Retain

The following screenshots/log outputs should be retained as QA evidence:

1. `npm test` showing **6/6 tests passed**.
2. `npm run build` completing successfully.
3. Final `docker compose ps` showing all services Up.
4. RabbitMQ and Redis showing healthy.
5. Notification health endpoint returning HTTP 200.
6. Get notifications endpoint returning HTTP 200.
7. Notification service failure returning HTTP 500.
8. Notification service recovery returning HTTP 200.
9. Notification/API Gateway structured logging.
10. RabbitMQ queue consumer counts.
11. RabbitMQ stopped → ingestion health returning HTTP 503.
12. RabbitMQ restart → consumers remaining at 0.
13. Ingestion restart → consumers returning to 1.
14. Invalid RabbitMQ message being acknowledged and discarded.
15. Valid RabbitMQ hazard message being successfully processed.
16. Duplicate message test showing both messages processed.
17. Core ingestion authentication returning HTTP 401.
18. Storage Upload authentication returning HTTP 401.
19. Swagger notification endpoint documentation.
20. Swagger Storage Upload documentation.

---

# 11. Overall QA Status

## Main Member 4 QA Work: SUBSTANTIALLY COMPLETE

The main Observability, Documentation and Quality Assurance activities have been completed and verified.

The current evidence demonstrates:

- Notification Service availability
- Notification API functionality
- API Gateway error handling
- Structured logging
- RabbitMQ connectivity
- RabbitMQ consumer monitoring
- RabbitMQ failure detection
- RabbitMQ recovery after service restart
- RabbitMQ message validation
- RabbitMQ → database processing
- Authentication protection
- Swagger/OpenAPI documentation
- Automated unit testing
- Error-path unit testing
- Successful TypeScript build
- Successful Docker environment verification

The QA process also identified several genuine implementation gaps and limitations:

1. RabbitMQ automatic reconnection is not currently implemented.
2. Duplicate message prevention/idempotency is not currently implemented.
3. Notification database retrieval is currently static rather than demonstrated through a database query.
4. Some database failure acknowledgement behaviour requires clearer error propagation.
5. Authenticated API → DB testing is blocked by unavailable valid test credentials.
6. Direct TEAVS/ADCRS communication remains to be defined/implemented.

These findings should be communicated to the relevant development owners and tracked as follow-up items rather than being reported as successful tests.

---

# 12. Definition of Completion

From the Member 4 QA perspective, the following work has been completed:

- [x] Notification Service startup verification
- [x] Notification Service structured logging
- [x] Notification gRPC error handling
- [x] API Gateway notification logging and error handling
- [x] Notification health endpoint verification
- [x] Notification API verification
- [x] Swagger/OpenAPI verification
- [x] RabbitMQ connectivity verification
- [x] RabbitMQ consumer monitoring
- [x] RabbitMQ failure testing
- [x] RabbitMQ recovery testing
- [x] Invalid RabbitMQ message testing
- [x] RabbitMQ → database hazard ingestion testing
- [x] Authentication protection testing
- [x] Storage Upload Swagger verification
- [x] Jest/TypeScript unit-test setup
- [x] Success-path unit tests
- [x] Error-path unit tests
- [x] `npm test` verification — 6/6 PASS
- [x] `npm run build` verification
- [x] Final Docker verification
- [x] Failure scenarios documented
- [x] Known limitations documented
- [x] Test evidence identified

The following remain as **known gaps/follow-up items**, rather than unfinished Member 4 testing work:

- [ ] RabbitMQ automatic reconnection
- [ ] Duplicate message/idempotency mechanism
- [ ] Full Notification Service database retrieval
- [ ] Improved database error propagation/acknowledgement semantics
- [ ] Authenticated API → DB test when valid test credentials are provided
- [ ] Direct TEAVS/ADCRS integration definition and implementation

---

# 13. Conclusion

The Member 4 Observability, Documentation and QA work has reached the final verification stage. The latest automated unit-test run passed all 6 tests, the TypeScript build completed successfully, and the final Docker environment showed all required services running with RabbitMQ and Redis healthy.

The testing also identified real reliability and integration gaps, including RabbitMQ automatic reconnection, duplicate event handling, notification database retrieval, database error acknowledgement behaviour, and the currently unavailable authenticated API → DB test account. These findings have been documented so that the team has a clear record of the current system state and the remaining follow-up work.
