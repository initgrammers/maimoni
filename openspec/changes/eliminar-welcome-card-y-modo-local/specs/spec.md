# Delta for Modo Local y Eliminación de Welcome Card

## ADDED Requirements

### Requirement: Dashboard Displays Directly Without Welcome Card

The system SHALL display the dashboard directly to new users without requiring them to create an account or log in first.

The dashboard MUST:
- Load immediately on application start
- Check for anonymousId in localStorage to determine mode
- Show empty state if no data exists (neither local nor remote)

#### Scenario: New user opens app for the first time

- GIVEN the user has no accessToken in storage
- AND the user has no anonymousId in localStorage
- WHEN the application loads
- THEN the dashboard SHALL display directly
- AND an anonymous user SHALL be created in the database
- AND a JWT token SHALL be obtained for the anonymous user
- AND the anonymousId SHALL be stored in localStorage

#### Scenario: User opens app with existing anonymousId

- GIVEN the user has anonymousId in localStorage
- AND the user has no accessToken
- WHEN the application loads
- THEN the dashboard SHALL operate in local mode
- AND expenses/incomes SHALL be read from/written to localStorage
- AND categories/scan SHALL use the anonymous token for API calls

### Requirement: Anonymous User Creation and Token Acquisition

The system MUST create an anonymous user in the database and obtain a JWT token when no authenticated session exists.

The flow MUST:
1. Check if accessToken exists in storage
2. If not, check if anonymousId exists in localStorage
3. If no anonymousId, call API to create anonymous user
4. Store the returned anonymousId in localStorage
5. Store the returned JWT token for API calls

#### Scenario: Anonymous user creation succeeds

- GIVEN the user has no accessToken and no anonymousId
- WHEN the system calls POST /api/auth/anonymous
- THEN the API SHALL create a new anonymous user in the database
- AND return an anonymousId and JWT token
- AND the webapp SHALL store these values

#### Scenario: Anonymous user creation fails

- GIVEN the user has no accessToken and no anonymousId
- WHEN the system calls POST /api/auth/anonymous and it fails
- THEN the system SHALL display an error message
- AND the user SHALL be able to retry

### Requirement: Local Mode Data Storage

When operating in local mode (anonymousId exists but no accessToken), the system SHALL store expenses and incomes in localStorage instead of making API calls.

The local mode MUST:
- Store expenses array in localStorage under key "expenses"
- Store incomes array in localStorage under key "incomes"
- Generate unique IDs for local items using timestamp + random
- Read from localStorage on dashboard load
- Write to localStorage on create/update/delete operations

#### Scenario: User creates expense in local mode

- GIVEN the user is in local mode (anonymousId exists)
- WHEN the user creates a new expense
- THEN the expense SHALL be stored in localStorage
- AND the expense SHALL appear in the dashboard movements list

#### Scenario: User creates income in local mode

- GIVEN the user is in local mode (anonymousId exists)
- WHEN the user creates a new income
- THEN the income SHALL be stored in localStorage
- AND the income SHALL appear in the dashboard movements list

#### Scenario: User refreshes page in local mode

- GIVEN the user has expenses stored in localStorage
- WHEN the user refreshes the page
- THEN the expenses SHALL be loaded from localStorage
- AND the dashboard SHALL display the same data

### Requirement: Categories and Scan Use Anonymous Token

The system SHALL use the anonymous JWT token for categories and scan API calls when in local mode.

Categories and scan operations MUST:
- Use the anonymous token obtained during initialization
- Make API calls to /api/categories and /api/scan endpoints
- Handle authentication errors gracefully

#### Scenario: Categories load with anonymous token

- GIVEN the user is in local mode
- WHEN the dashboard loads categories
- THEN the API call SHALL include the anonymous JWT token
- AND categories SHALL be retrieved from the API

#### Scenario: Receipt scan works with anonymous token

- GIVEN the user is in local mode
- WHEN the user scans a receipt
- THEN the scan API SHALL be called with the anonymous JWT token
- AND the extracted data SHALL be used to create a local expense

### Requirement: Login with Local Data Migration

The system SHALL provide a mechanism to migrate local data (expenses/incomes) to a user's board when they log in.

The migration flow MUST:
1. Accept local expenses/incomes data
2. Create or use the authenticated user's board
3. Migrate all local items to the user's board
4. Clear localStorage after successful migration
5. Switch from local mode to authenticated mode

#### Scenario: User logs in with existing local data

- GIVEN the user has expenses and incomes in localStorage
- AND the user initiates WhatsApp authentication
- WHEN the authentication completes successfully
- THEN the system SHALL call POST /api/auth/claim
- AND pass the local expenses and incomes data
- AND the API SHALL migrate each item to the user's board
- AND localStorage SHALL be cleared
- AND the dashboard SHALL reload with the user's board data

#### Scenario: Migration handles duplicate data

- GIVEN the user has local data
- AND the user has previously claimed/migrated data
- WHEN the user logs in again
- THEN the system SHALL handle duplicates appropriately
- AND not create duplicate entries for the same timestamp/amount

### Requirement: Invitation Without Session Shows Toast

The system SHALL display a toast message when a user attempts to share a board without being logged in.

The toast MUST:
- Display the message "Debes iniciar sesión para compartir el tablero"
- Appear when the user taps "Compartir tablero" without accessToken
- Be dismissible

#### Scenario: User tries to share board without being logged in

- GIVEN the user has anonymousId (local mode) or no session
- WHEN the user taps "Compartir tablero" in the board drawer
- THEN a toast SHALL appear with message "Debes iniciar sesión para compartir el tablero"
- AND the share modal SHALL NOT open

#### Scenario: User shares board while logged in

- GIVEN the user has a valid accessToken
- WHEN the user taps "Compartir tablero"
- THEN the share modal SHALL open normally

## MODIFIED Requirements

### Requirement: Dashboard Entry Point

(Previously: Dashboard required login via Welcome Card)

The dashboard SHALL be accessible without authentication. The Welcome Card that required account creation or login SHALL be removed.

#### Scenario: Dashboard loads without authentication

- GIVEN the user opens the application URL
- WHEN the page loads
- THEN the dashboard SHALL render immediately
- AND no Welcome Card SHALL be displayed
- AND the system SHALL determine the mode (local or authenticated) automatically

### Requirement: Expense Storage Abstraction

(Previously: Expenses were stored only via API)

The expense storage SHALL be modified to support both API storage (authenticated mode) and localStorage (local mode).

The storage abstraction MUST:
- Detect the current mode based on anonymousId presence
- Route create/read/update/delete operations to appropriate backend
- Provide consistent interface regardless of storage location

#### Scenario: Expense CRUD in authenticated mode

- GIVEN the user has a valid accessToken
- WHEN the user creates/reads/updates/deletes an expense
- THEN the operation SHALL be performed via API
- AND the data SHALL be stored in the database

### Requirement: Income Storage Abstraction

(Previously: Incomes were stored only via API)

The income storage SHALL be modified to support both API storage (authenticated mode) and localStorage (local mode).

The storage abstraction MUST:
- Detect the current mode based on anonymousId presence
- Route create/read/update/delete operations to appropriate backend
- Provide consistent interface regardless of storage location

#### Scenario: Income CRUD in authenticated mode

- GIVEN the user has a valid accessToken
- WHEN the user creates/reads/updates/deletes an income
- THEN the operation SHALL be performed via API
- AND the data SHALL be stored in the database

### Requirement: Board Invitation Permission Check

(Previously: Invitation UI was always available based on role)

The invitation functionality SHALL now also verify user authentication status before allowing access.

#### Scenario: Authenticated user with viewer role tries to share

- GIVEN the user is logged in with accessToken
- AND the user has viewer role on the board
- WHEN the user taps "Compartir tablero"
- THEN the share button SHALL NOT be visible (existing behavior)

## REMOVED Requirements

### Requirement: Welcome Card Display

(Reason: Eliminated to provide frictionless entry to the app)

The Welcome Card component that displays on the index route requiring account creation or login SHALL be removed.

Previously:
- Users saw a "Bienvenido a Maimoni" card
- Card had "Crear cuenta" and "Iniciar sesión" buttons
- Dashboard was not accessible without action

The new behavior:
- Dashboard displays immediately
- Authentication is optional for basic usage

### Requirement: Mandatory Authentication for Dashboard

(Reason: Replaced by optional local mode)

The requirement that users must authenticate before accessing the dashboard SHALL be removed.

## Scenarios Summary

| Scenario | Type | Description |
|----------|------|-------------|
| New user opens app for first time | Happy Path | Anonymous user created, dashboard shown |
| User opens app with existing anonymousId | Happy Path | Local mode activated, data from localStorage |
| Anonymous user creation succeeds | Happy Path | Token obtained, ID stored |
| Anonymous user creation fails | Edge Case | Error shown, retry available |
| User creates expense in local mode | Happy Path | Stored in localStorage |
| User creates income in local mode | Happy Path | Stored in localStorage |
| User refreshes page in local mode | Happy Path | Data persisted across refresh |
| Categories load with anonymous token | Happy Path | API called with token |
| Receipt scan works with anonymous token | Happy Path | Scan API called with token |
| User logs in with existing local data | Happy Path | Data migrated to user's board |
| Migration handles duplicate data | Edge Case | No duplicates created |
| User tries to share board without session | Happy Path | Toast displayed |
| User shares board while logged in | Happy Path | Modal opens normally |
| Dashboard loads without authentication | Happy Path | No Welcome Card shown |
| Expense CRUD in authenticated mode | Happy Path | API storage used |
| Income CRUD in authenticated mode | Happy Path | API storage used |
