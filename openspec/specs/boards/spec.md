# Board Sharing Redesign Specification

## Purpose

This specification defines the requirements for redesigning the board sharing experience in Maimoni. The goal is to improve discoverability of the invitation functionality by integrating it directly into the board detail drawer, making it easier for users to share their boards.

## Requirements

### Requirement: Board Drawer Contains Share Functionality

The board detail drawer MUST include a "Compartir tablero" button that is visible only to users with owner or editor role.

#### Scenario: Owner opens board drawer and sees share button

- GIVEN the user is viewing the dashboard with a board where they have owner role
- WHEN the user taps on the board card to open the board drawer
- THEN the drawer displays a "Compartir tablero" button

#### Scenario: Editor opens board drawer and sees share button

- GIVEN the user is viewing the dashboard with a board where they have editor role
- WHEN the user taps on the board card to open the board drawer
- THEN the drawer displays a "Compartir tablero" button

#### Scenario: Viewer opens board drawer and does not see share button

- GIVEN the user is viewing the dashboard with a board where they have viewer role
- WHEN the user taps on the board card to open the board drawer
- THEN the drawer does NOT display a "Compartir tablero" button

### Requirement: Share Modal Contains Role and Phone Fields Only

The share modal MUST display only two input fields: role selector and optional phone number. The duration field MUST NOT be visible.

#### Scenario: User opens share modal

- GIVEN the user has opened the share modal from the board drawer
- WHEN the modal is displayed
- THEN the user sees a role selector with "Editor" and "Viewer" options
- AND the user sees a phone number input field labeled "Teléfono (opcional)"
- AND the user does NOT see a duration input field

#### Scenario: Share modal defaults role to editor

- GIVEN the user has opened the share modal from the board drawer
- WHEN the modal is displayed
- THEN the role selector defaults to "Editor" selection

### Requirement: Invitation TTL is Hardcoded to 72 Hours

The system MUST create invitations with a 72-hour (3 days) TTL regardless of user input. The TTL MUST NOT be configurable through the UI.

#### Scenario: User creates invitation without specifying duration

- GIVEN the user has filled in the share modal with role and optional phone
- WHEN the user submits the invitation form
- THEN the invitation is created with TTL of 72 hours
- AND the invitation link is generated and copied to clipboard

#### Scenario: User creates invitation with phone number

- GIVEN the user has filled in the share modal with role set to "Viewer" and phone number "+593999999999"
- WHEN the user submits the invitation form
- THEN the invitation is created with targetRole "viewer"
- AND the invitation is created with invitedPhoneNumber "+593999999999"
- AND the invitation is created with TTL of 72 hours

### Requirement: Board Drawer Displays Pending Invitations

The board detail drawer MUST display a list of pending invitations for the current board.

#### Scenario: Board has pending invitations

- GIVEN the board has 2 pending invitations
- WHEN the user opens the board drawer
- THEN the drawer displays a section titled "Invitaciones pendientes (2)"
- AND each pending invitation shows the phone number or "Enlace compartido"
- AND each pending invitation shows the target role

#### Scenario: Board has no pending invitations

- GIVEN the board has no pending invitations
- WHEN the user opens the board drawer
- THEN the drawer displays a section titled "Invitaciones pendientes (0)"
- AND the section shows "No hay invitaciones pendientes"

### Requirement: User Can Delete Pending Invitations from Board Drawer

The system MUST allow users to delete (revoke) pending invitations directly from the board drawer.

#### Scenario: Owner deletes a pending invitation

- GIVEN the board drawer is open and shows pending invitations
- WHEN the owner taps "Eliminar invitación" on a pending invitation
- THEN the invitation is revoked (status changes to "revoked")
- AND the invitation list is refreshed
- AND a success message "Invitación revocada correctamente" is displayed

#### Scenario: Editor deletes a pending invitation

- GIVEN the board drawer is open and shows pending invitations
- WHEN the editor taps "Eliminar invitación" on a pending invitation
- THEN the invitation is revoked (status changes to "revoked")
- AND the invitation list is refreshed

#### Scenario: Revoke fails with error

- GIVEN the board drawer is open and shows pending invitations
- WHEN the user taps "Eliminar invitación" and the operation fails
- THEN an error message is displayed describing the failure
- AND the invitation list remains unchanged

### Requirement: Existing Settings Invitation Flow Remains Functional

The existing invitation creation interface in Profile/Settings views MUST continue to work as before.

#### Scenario: User creates invitation from Profile view

- GIVEN the user navigates to Profile view
- WHEN the user creates an invitation using the existing form
- THEN the invitation is created successfully
- AND the invitation appears in both Profile view and board drawer

## MODIFIED Requirements

### Requirement: Board Drawer Action Buttons

The board drawer MUST display action buttons based on the user's role and board state.

(Previously: Board drawer had "Editar tablero" and "Cerrar" buttons for owners only)

#### Scenario: Owner views their active board

- GIVEN the user is owner of the currently active board
- WHEN the user opens the board drawer
- THEN they see "Seleccionar tablero" (if not active), "Editar tablero", "Compartir tablero", and "Cerrar" buttons

#### Scenario: Owner views board with more than one board

- GIVEN the user is owner of a board that is not active, and has multiple boards
- WHEN the user opens the board drawer
- THEN they see "Seleccionar tablero", "Editar tablero", "Compartir tablero", "Eliminar tablero", and "Cerrar" buttons
