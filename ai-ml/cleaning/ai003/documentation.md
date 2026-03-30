# AI003 Documentation Notes

## 1. Task Overview
Task ID: AI003  
Task Name: Data Cleaning Pipeline Logic  
Workstream: 3 - Logging, Testing, and Documentation

## 2. Objective
Support the reusable data cleaning pipeline by:
- tracking transformations
- preparing test datasets
- comparing before vs after outputs
- documenting cleaning behaviour

## 3. Input Data Description
Dataset Name: Dummy AI003 test dataset  
Source: Synthetic / manually created  
Format: CSV  
Fields:
- id
- timestamp
- location
- event_type
- severity
- status

## 4. Identified Data Issues
- Missing timestamp values
- Missing location/status values
- Duplicate rows
- Timestamp inconsistencies
- Categorical inconsistencies (`phishing`, `Phishing`, `phish`)
- Invalid severity values

## 5. Logging & Traceability
Track:
- rows removed
- nulls found
- category normalisation
- other transformations

## 6. Before vs After Comparison
Compare:
- row count
- column count
- missing values
- duplicate rows

## 7. Testing
A dummy CSV dataset is used to simulate common data quality issues.

## 8. Notes
This work is currently schema-independent and will later integrate with AI001 once the schema is finalised.