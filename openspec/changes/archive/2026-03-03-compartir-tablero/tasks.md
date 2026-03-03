# Tasks: Board Sharing Redesign

## Phase 1: Foundation (State & Data)

- [x] 1.1 Add share modal state variables to `apps/webapp/src/routes/index.tsx` (after line 461): `isShareModalOpen`, `shareRole`, `sharePhone`, `shareError`, `shareSuccess`
- [x] 1.2 Add board drawer invitations query in `apps/webapp/src/routes/index.tsx` (after line 690): `boardDrawerInvitationsQuery` with query key `['board-drawer-invitations', accessToken, selectedBoardForDrawer?.id]`
- [x] 1.3 Add `boardDrawerRevokeMutation` in `apps/webapp/src/routes/index.tsx` for revoking invitations from board drawer (similar to existing `revokeInvitationMutation` but specific to board drawer)

## Phase 2: UI Implementation (Share Button & Modal)

- [x] 2.1 Add "Compartir tablero" button to board drawer DrawerFooter in `apps/webapp/src/routes/index.tsx` (around line 2650) - visible only for owner/editor roles
- [x] 2.2 Add pending invitations section to board drawer content area (after line 2614) showing count and list of pending invitations with "Eliminar" button
- [x] 2.3 Create share modal with inline conditional rendering (after line 2655) including role selector, phone input, submit button with 72h TTL, and clipboard copy logic

## Phase 3: Integration & Refinement

- [x] 3.1 Connect share modal to `createInvitationMutation` with `ttlHours: 72`
- [x] 3.2 Connect pending invitations list to `boardDrawerInvitationsQuery`
- [x] 3.3 Connect "Eliminar invitación" button to `boardDrawerRevokeMutation`
- [x] 3.4 Ensure error and success messages display correctly in share modal
- [x] 3.5 Add clipboard fallback handling when `navigator.clipboard.writeText` fails

## Phase 4: Testing

- [ ] 4.1 Manual test: Owner sees "Compartir tablero" button in board drawer
- [ ] 4.2 Manual test: Editor sees "Compartir tablero" button in board drawer
- [ ] 4.3 Manual test: Viewer does NOT see "Compartir tablero" button in board drawer
- [ ] 4.4 Manual test: Share modal displays role selector with Editor default
- [ ] 4.5 Manual test: Share modal does NOT display TTL field
- [ ] 4.6 Manual test: Creating invitation uses 72-hour TTL and copies to clipboard
- [ ] 4.7 Manual test: Pending invitations appear in board drawer
- [ ] 4.8 Manual test: Can delete/revoke invitation from board drawer
- [ ] 4.9 Verify existing Settings invitation flow still works

## Phase 5: Cleanup

- [ ] 5.1 Run `bun run check` to verify lint/format
- [ ] 5.2 Remove any unused code or temporary comments
