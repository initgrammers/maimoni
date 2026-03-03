# Design: Board Sharing Redesign

## Technical Approach

The board sharing redesign integrates invitation functionality directly into the board detail drawer (currently at `apps/webapp/src/routes/index.tsx:2557-2703`). The approach leverages existing TanStack Query hooks for invitations that already exist in the webapp (`useQuery` for fetching, `useMutation` for creating/revoking). The share functionality will use a Dialog component to present a focused form with role selector and optional phone input, while hardcoding the TTL to 72 hours (3 days).

## Architecture Decisions

### Decision: Share Modal Implementation

**Choice**: Create inline modal using conditional rendering within the board drawer, similar to existing patterns in the file (delete confirmation)

**Alternatives considered**: 
- Create new Dialog component in `apps/webapp/src/components/ui/dialog.tsx`
- Create separate route/page for sharing

**Rationale**: The existing codebase uses inline Drawer patterns with conditional rendering (e.g., delete confirmation at lines 2602-2651). This keeps the share modal close to where it's used and avoids introducing a new UI component pattern before verifying the design works. Using the same file ensures consistency with existing code style.

### Decision: Invitation TTL Handling

**Choice**: Pass hardcoded `ttlHours: 72` to the API call, making the backend handle the value

**Alternatives considered**: 
- Modify core use-case to default to 72 hours
- Remove ttlHours parameter entirely from validators

**Rationale**: The validator already accepts optional `ttlHours` (packages/core/src/invitations/application/validators.ts:6-11). The API at apps/api/src/routes/invitations.ts passes this to the core use-case which defaults to 7 days if not provided. By passing `72` explicitly in the webapp, we avoid backend changes while achieving the spec requirement.

### Decision: Fetching Invitations for Board Drawer

**Choice**: Reuse existing `useQuery` for invitations with board-specific query key

**Alternatives considered**: 
- Create new API function to fetch invitations when drawer opens

**Rationale**: The existing invitationsQuery already fetches invitations when the user views settings (lines 602-622). We can create a second query that fetches invitations specifically when the board drawer opens with `selectedBoardForDrawer.id` as a query key parameter.

## Data Flow

```
Board Drawer Opens
       │
       ▼
┌──────────────────┐
│ Fetch Invitations│ ──► useQuery(['board-invitations', token, boardId])
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Display Pending  │ ──► Filter by status === 'pending'
│   Invitations    │
└────────┬─────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌───────┐ ┌────────────┐
│Share  │ │ Revoke     │
│Button │ │ Invitation │
└───┬───┘ └─────┬──────┘
    │           │
    ▼           ▼
┌───────────┐ ┌────────────────────┐
│ Dialog    │ │ revokeInvitation()│
│ Form      │ │ → API: POST        │
│           │ │ /api/invitations   │
│ Role      │ │ /:id/revoke        │
│ Phone     │ └────────┬───────────┘
│ (no TTL)  │          │
└─────┬─────┘          ▼
      │        ┌──────────────┐
      │        │ Invalidate   │
      │        │ Query        │
      │        └──────────────┘
      ▼
┌───────────────────┐
│ createInvitation()│
│ → API: POST       │
│ /api/boards/:id   │
│ /invitations      │
│ ttlHours: 72      │
└─────────┬─────────┘
          │
          ▼
   ┌────────────┐
   │ Copy to    │
   │ Clipboard  │
   └────────────┘
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `apps/webapp/src/routes/index.tsx` | Modify | Add share button, pending invitations section, share modal to board drawer |
| `apps/webapp/src/components/ui/dialog.tsx` | Create | New Dialog component (optional, if inline approach is insufficient) |

### Changes to `apps/webapp/src/routes/index.tsx`

1. **Add state for share modal** (around line 438):
   ```typescript
   const [isShareModalOpen, setIsShareModalOpen] = useState(false);
   const [shareRole, setShareRole] = useState<'editor' | 'viewer'>('editor');
   const [sharePhone, setSharePhone] = useState('');
   const [shareError, setShareError] = useState<string | null>(null);
   const [shareSuccess, setShareSuccess] = useState<string | null>(null);
   ```

2. **Add invitations query for board drawer** (around line 602):
   ```typescript
   const boardDrawerInvitationsQuery = useQuery<BoardInvitation[], Error>({
     enabled: !!selectedBoardForDrawer,
     queryKey: ['board-drawer-invitations', accessToken, selectedBoardForDrawer?.id],
     queryFn: () => fetchBoardInvitations(accessToken, selectedBoardForDrawer!.id),
   });
   ```

3. **Add share button to DrawerFooter** (after line 2676, for owner/editor):
   ```typescript
   <button
     type="button"
     onClick={() => setIsShareModalOpen(true)}
     className="w-full rounded-[20px] border border-slate-300 bg-white py-4 text-base font-semibold text-slate-700 transition-all active:scale-[0.98]"
   >
     Compartir tablero
   </button>
   ```

4. **Add pending invitations section to board drawer** (after line 2614):
   ```tsx
   {selectedBoardForDrawer && boardDrawerInvitationsQuery.data && (
     <div className="space-y-2 px-4">
       <p className="text-sm font-semibold text-slate-700">
         Invitaciones pendientes ({boardDrawerInvitationsQuery.data.filter(i => i.status === 'pending').length})
       </p>
       {boardDrawerInvitationsQuery.data.filter(i => i.status === 'pending').length === 0 ? (
         <p className="text-sm text-slate-500">No hay invitaciones pendientes</p>
       ) : (
         boardDrawerInvitationsQuery.data
           .filter(i => i.status === 'pending')
           .map((invitation) => (
             <div key={invitation.id} className="rounded-xl border border-slate-200 bg-white p-3">
               <p className="text-sm font-medium text-slate-800">
                 {invitation.invitedPhoneNumber || 'Enlace compartido'}
               </p>
               <p className="text-xs text-slate-500">rol {invitation.targetRole}</p>
               {(selectedBoardForDrawer.role === 'owner' || selectedBoardForDrawer.role === 'editor') && (
                 <button
                   type="button"
                   onClick={() => void revokeInvitationById(invitation.id)}
                   className="mt-2 rounded-lg border border-rose-300 bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700"
                 >
                   Eliminar invitación
                 </button>
               )}
             </div>
           ))
       )}
     </div>
   )}
   ```

5. **Add share modal** (after Drawer component, around line 2703):
   ```tsx
   {isShareModalOpen && selectedBoardForDrawer && (
     <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
       <div className="w-full max-w-sm rounded-2xl bg-white p-5">
         <h3 className="text-lg font-semibold text-slate-900">Compartir tablero</h3>
         <p className="mb-4 text-sm text-slate-500">
           Comparte "{selectedBoardForDrawer.name}" con otros usuarios.
         </p>
         
         <label className="mb-3 block space-y-1 text-sm text-slate-600">
           <span>Rol</span>
           <select
             value={shareRole}
             onChange={(e) => setShareRole(e.target.value as 'editor' | 'viewer')}
             className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
           >
             <option value="editor">Editor</option>
             <option value="viewer">Viewer</option>
           </select>
         </label>
         
         <label className="mb-4 block space-y-1 text-sm text-slate-600">
           <span>Teléfono (opcional)</span>
           <input
             type="text"
             value={sharePhone}
             onChange={(e) => setSharePhone(e.target.value)}
             placeholder="Ej: +593999999999"
             className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
           />
         </label>
         
         {shareError && (
           <p className="mb-3 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{shareError}</p>
         )}
         {shareSuccess && (
           <p className="mb-3 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{shareSuccess}</p>
         )}
         
         <div className="flex gap-3">
           <button
             type="button"
             onClick={() => {
               setIsShareModalOpen(false);
               setShareError(null);
               setShareSuccess(null);
             }}
             className="flex-1 rounded-xl border border-slate-300 py-2.5 text-sm font-semibold text-slate-700"
           >
             Cancelar
           </button>
           <button
             type="button"
             onClick={async () => {
               if (!selectedBoardForDrawer) return;
               setShareError(null);
               setShareSuccess(null);
               try {
                 const result = await createInvitationMutation.mutateAsync({
                   boardId: selectedBoardForDrawer.id,
                   targetRole: shareRole,
                   phoneNumber: sharePhone.trim() || undefined,
                   ttlHours: 72, // Hardcoded 3-day TTL
                 });
                 const inviteUrl = `${window.location.origin}/invite?token=${encodeURIComponent(result.inviteToken)}`;
                 await navigator.clipboard.writeText(inviteUrl);
                 setShareSuccess('Invitación creada y copiada al portapapeles');
                 boardDrawerInvitationsQuery.refetch();
               } catch (err) {
                 setShareError(err instanceof Error ? err.message : 'Error al crear invitación');
               }
             }}
             disabled={createInvitationMutation.isPending}
             className="flex-1 rounded-xl bg-slate-900 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
           >
             {createInvitationMutation.isPending ? 'Creando...' : 'Crear invitación'}
           </button>
         </div>
       </div>
     </div>
   )}
   ```

6. **Add revoke function for board drawer** (reuse existing `revokeInvitationById` or create board-specific version)

## Interfaces / Contracts

### New State Variables

```typescript
// Share modal state
const [isShareModalOpen, setIsShareModalOpen] = useState(false);
const [shareRole, setShareRole] = useState<'editor' | 'viewer'>('editor');
const [sharePhone, setSharePhone] = useState('');
const [shareError, setShareError] = useState<string | null>(null);
const [shareSuccess, setShareSuccess] = useState<string | null>(null);

// Board drawer invitations query
const boardDrawerInvitationsQuery = useQuery<BoardInvitation[], Error>({
  enabled: !!selectedBoardForDrawer,
  queryKey: ['board-drawer-invitations', accessToken, selectedBoardForDrawer?.id],
  queryFn: () => fetchBoardInvitations(accessToken, selectedBoardForDrawer!.id),
});
```

### API Payload (unchanged, existing)

```typescript
// POST /api/boards/:boardId/invitations
{
  targetRole: 'editor' | 'viewer',
  phoneNumber?: string,
  ttlHours?: number  // We'll pass 72
}
```

### Response (unchanged, existing)

```typescript
{
  invitation: BoardInvitation,
  inviteToken: string
}
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | Share modal state management | Test state updates for role, phone, errors |
| Integration | API call with 72h TTL | Verify API receives correct ttlHours value |
| E2E | Full share flow | Playwright: open drawer → click share → fill form → submit → verify invitation created |

### Manual Testing Checklist

- [ ] Owner sees "Compartir tablero" button in board drawer
- [ ] Editor sees "Compartir tablero" button in board drawer
- [ ] Viewer does NOT see "Compartir tablero" button in board drawer
- [ ] Share modal displays role selector (Editor/Viewer) with Editor as default
- [ ] Share modal displays optional phone input
- [ ] Share modal does NOT display TTL/duration field
- [ ] Creating invitation uses 72-hour TTL
- [ ] Invitation link is copied to clipboard after creation
- [ ] Pending invitations appear in board drawer
- [ ] Can revoke invitation from board drawer
- [ ] Existing Settings invitation flow still works

## Migration / Rollout

No migration required. This is a pure UI addition that:
- Adds new functionality to the board drawer
- Does not modify existing database schema
- Does not modify API contracts
- Maintains existing Settings invitation flow

## Open Questions

- [ ] Should the Dialog component be created as a reusable UI component, or is inline conditional rendering acceptable?
- [ ] Should the pending invitations section be collapsible to reduce visual clutter?
- [ ] How should the share modal handle the case where clipboard copy fails? (currently shows fallback message)

## Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Duplicate invitations query causes excessive API calls | Medium | Performance | Use `enabled` flag to only fetch when drawer is open |
| Clipboard API fails on some devices | Low | UX | Show fallback message with URL to copy manually |
| User confusion between Settings and Drawer invitations | Low | UX | Both show same data (single source of truth from API) |
