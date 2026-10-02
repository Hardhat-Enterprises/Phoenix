# Alert Lifecycle Design

## Overview
The alert lifecycle defines the stages that an alert passes through within the TEAVS system, from creation to final closure.


## Alert States

### 1. Draft
The alert has been created but not yet approved or sent.  
At this stage, the alert can still be edited.

### 2. Approved
The alert has been reviewed and approved by an authorised role.  
It is ready to be distributed.

### 3. Sent
The alert has been distributed to the intended recipients such as councils, emergency services, or the public.

### 4. Expired
The alert is no longer active because the event or threat is no longer relevant.

### 5. Revoked
The alert has been withdrawn due to error, incorrect information, or replacement by a new alert.


## Lifecycle Flow
Draft → Approved → Sent → Expired  
Draft / Approved / Sent → Revoked


## Description of Flow
- An alert begins in **Draft** status when it is first created.
- After review, it moves to **Approved**.
- Once distributed, it moves to **Sent**.
- After the threat period ends, it becomes **Expired**.
- If the alert is incorrect or must be cancelled, it can move to **Revoked**.


## Importance
Defining the alert lifecycle ensures that alerts are managed consistently, reduces misuse, and supports accountability within the TEAVS system.