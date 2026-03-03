# Proposal: Redesenar flujo de compartir tablero

## Intent

El objetivo es mejorar la experiencia de usuario al compartir tableros en Maimoni. Actualmente, la funcionalidad de invitaciones está oculta en la vista de "Configuración", lo que dificulta el descubrimiento. Los usuarios deben navegar a Settings > Mis miembros e invitaciones para invitar a personas. El nuevo diseño会更清晰的将 compartir功能与 board 详情结合，让用户更容易访问。

## Scope

### In Scope
- Modificar el drawer/modal de detalle del tablero para incluir botón "Compartir tablero"
- Crear nuevo modal de compartir con campos: rol (editor/viewer) + teléfono opcional
- Eliminar campo de duración del UI (hardcodeado a 3 días = 72 horas)
- Mostrar invitaciones pendientes en el modal de detalle del tablero
- Permitir eliminar invitaciones pendientes desde el modal de detalle
- Actualizar APIs y core use-cases si es necesario

### Out of Scope
- Cambiar la lógica de negocio de invitaciones ( expiration, roles, etc)
- Sistema de notificaciones
- Historial de invitaciones aceptadas/eliminadas

## Approach

1. **Modificar UI del Board Drawer** (`apps/webapp/src/routes/index.tsx`)
   - Agregar botón "Compartir tablero" (solo para owners)
   - Agregar sección de invitaciones pendientes en el drawer
   - Agregar lógica para eliminar invitaciones desde el drawer

2. **Crear Modal de Compartir** 
   - Nuevo componente Dialog/Modal para crear invitaciones
   - Campos: selector de rol, input de teléfono (opcional)
   - TTL hardcodeado a 72 horas (3 días)
   - Integración con `createBoardInvitation` existente

3. **Ajustar API** (si es necesario)
   - El schema actual `createInvitationSchema` permite ttlHours opcional
   - El backend puede recibir el valor hardcodeado o ignorarlo

4. **Tests**
   - Actualizar tests existentes del webapp
   - Verificar flujo end-to-end

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `apps/webapp/src/routes/index.tsx` | Modified | Board drawer UI con nuevo botón Compartir y lista de invitaciones |
| `packages/core/src/invitations/application/validators.ts` | Modified | TTL ya es opcional, no requiere cambio |
| `apps/api/src/routes/invitations.ts` | No change | API actual acepta TTL opcional |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Breaking existing invitation flow in Settings view | Low | Mantener funcionalidad en Settings, solo agregar al Board Drawer |
| User confusion between Settings and Board Drawer invitations | Medium | Mostrar提示 de que ambas ubicaciones muestran las mismas invitaciones |
| Hardcoded TTL cause issues | Low | 3 días es un valor razonable, puede ajustarse después |

## Rollback Plan

1. Revertir cambios en `apps/webapp/src/routes/index.tsx`
2. Los usuarios volverá a usar Settings > Invitaciones para acceder a la funcionalidad
3. No hay cambios en API ni base de datos

## Dependencies

- Ninguna dependencia externa nueva
- Requiere que la API de invitaciones existente funcione correctamente
- Las funciones existentes `createBoardInvitation`, `revokeInvitation`, `fetchBoardInvitations` siguen siendo usadas

## Success Criteria

- [ ] Board drawer muestra botón "Compartir tablero" para owners
- [ ] Modal de compartir tiene solo campos: rol + teléfono opcional
- [ ] Campo duración no visible, hardcodeado a 72 horas
- [ ] Invitaciones pendientes visibles en board drawer
- [ ] Puede eliminar invitaciones desde el board drawer
- [ ] Tests pasan con `bun run check`
