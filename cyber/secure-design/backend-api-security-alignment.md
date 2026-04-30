# Backend API Security Alignment

## Overview
This document aligns the cybersecurity design with the backend API implementation for the PHOENIX system. 

The backend API is treated as the implementation baseline, and cybersecurity focuses on defining:
- endpoint access control (public, protected, internal)
- role-based permissions
- validation requirements
- rate limiting and abuse prevention
- logging and monitoring expectations

---

## Role Alignment

The backend system defines the following roles:
- System Admin
- Analyst / Dashboard User
- End User
- Data Ingestion Service
- Notification Service

### Security Mapping
- **System Admin** → full system access
- **Analyst** → read access to dashboard, hazards, threats, risk data
- **End User** → limited/public access
- **Data Ingestion Service** → internal-only data input
- **Notification Service** → internal-only communication

---

# Endpoint Security Matrix

## Authentication

| Endpoint | Method | Access | Roles | Validation | Rate Limit | Logging |
|---------|--------|--------|------|-----------|-----------|--------|
| /api/users/auth/register | POST | Restricted | Admin / controlled | email, password, role validation | Strict | Log attempts |
| /api/users/auth/login | POST | Public | All users | credentials validation | Very strict | Log failures |
| /api/users/auth/refresh | POST | Protected | Authenticated users | token validation | Moderate | Log usage |
| /api/users/auth/logout | POST | Protected | Authenticated users | token validation | Moderate | Log activity |

---

## Dashboard

| Endpoint | Method | Access | Roles | Validation | Rate Limit | Logging |
|---------|--------|--------|------|-----------|-----------|--------|
| /api/users/dashboard/overview | GET | Protected | Admin, Analyst | filters, date range | Moderate | Log access |
| /api/users/dashboard/charts | GET | Protected | Admin, Analyst | metric, group_by | Moderate | Log usage |
| /api/users/dashboard/activity | GET | Protected | Admin, Analyst | request validation | Moderate | Log access |

---

## Hazards

| Endpoint | Method | Access | Roles | Validation | Rate Limit | Logging |
|---------|--------|--------|------|-----------|-----------|--------|
| /api/users/hazards | GET | Protected | Admin, Analyst | filters, UUID, pagination | Moderate | Log queries |
| /api/users/hazards/:id | GET | Protected | Admin, Analyst | ID validation | Moderate | Log access |

---

## Threats

| Endpoint | Method | Access | Roles | Validation | Rate Limit | Logging |
|---------|--------|--------|------|-----------|-----------|--------|
| /api/users/threats | GET | Protected | Admin, Analyst | filters, enums, pagination | Moderate | Log queries |
| /api/users/threats/:id | GET | Protected | Admin, Analyst | ID validation | Moderate | Log access |

---

## Risk Assessments

| Endpoint | Method | Access | Roles | Validation | Rate Limit | Logging |
|---------|--------|--------|------|-----------|-----------|--------|
| /api/users/risk-assessments | GET | Protected | Admin, Analyst | filters, IDs, pagination | Moderate | Log queries |
| /api/users/risk-assessments/:id | GET | Protected | Admin, Analyst | ID validation | Moderate | Log access |

---

## Metadata & Locations

| Endpoint | Method | Access | Roles | Validation | Rate Limit | Logging |
|---------|--------|--------|------|-----------|-----------|--------|
| /api/data-ingestion/locations | POST | Internal | Ingestion Service | geo validation | Strict | Full log |
| /api/users/locations | GET | Protected | Admin, Analyst | query validation | Moderate | Log access |
| /api/users/meta/* | GET | Protected / Limited | Admin, Analyst | minimal validation | Low–Moderate | Log access |

---

## Data Ingestion (Critical Endpoint)

| Endpoint | Method | Access | Roles | Validation | Rate Limit | Logging |
|---------|--------|--------|------|-----------|-----------|--------|
| /api/data-ingestion/stream | POST | Internal Only | Ingestion Service | full schema validation | Strict + Throttling | Full audit log |

---

## Notes
- Public endpoints must have strict validation and rate limiting.
- Protected endpoints must enforce role-based access control (RBAC).
- Internal endpoints must not be exposed externally.
- All inputs should be treated as untrusted and validated.
- Logging must capture suspicious and abnormal activity.