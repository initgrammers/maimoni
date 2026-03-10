# Proposal: Eliminar Welcome Card y Modo Local

## Intent

Eliminar la barrera de entrada a la app removiendo el card de Bienvenido que exige crear cuenta o iniciar sesión. El objetivo es que usuarios nuevos puedan usar la app inmediatamente con datos locales, y luego migren a una cuenta cuando lo deseen.

## Scope

### In Scope
- Eliminar el Welcome Card de `apps/webapp/src/routes/index.tsx`
- Implementar modo local: expenses/incomes en localStorage, categorías y scan via API con token anónimo
- Sistema de login con migración de datos locales al board del usuario
- Crear usuario anónimo en DB al primer acceso (sin datos), obtener token
- Toast "Debes iniciar sesión para compartir el tablero" al intentar invitar sin sesión

### Out of Scope
- Funcionalidad offline completa (sin conexión)
- Sincronización automática entre dispositivos
- Mejoras al flujo de login existente (WhatsApp/Twilio)

## Approach

1. **Anon user flow**: Si no hay accessToken → crear usuario anónimo en DB → obtener token JWT
2. **Modo local**: Si existe anonymousId en localStorage → expenses/incomes en localStorage, categorías/scan via API con token
3. **Modo normal**: Sin anonymousId → todo desde API (dashboard con boards)
4. **Login con datos locales**: POST /api/auth/claim → migra datos locales al board del usuario
5. **Invitaciones**: Verificar sesión antes de mostrar UI de compartir

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `apps/webapp/src/routes/index.tsx` | Modified | Eliminar Welcome Card (líneas 1558-1601) |
| `apps/webapp/src/routes/index.tsx` | New | Lógica de detección modo local/anónimo |
| `apps/api/src/routes/auth.ts` | Modified | Endpoint POST /api/auth/claim para migrar datos |
| `packages/core/src/auth-claim/` | New | Use cases para claim y migración de datos |
| `packages/db/src/core.ts` | Modified | Función claimAnonymousData existente |
| `apps/webapp/src/components/` | New | Toast para "Debes iniciar sesión" |
| `packages/core/src/expenses/` | Modified | Adapter para localStorage cuando hay anonymousId |
| `packages/core/src/incomes/` | Modified | Adapter para localStorage cuando hay anonymousId |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Conflicto de datos al migrar (mismo ID de expense) | Medium | Usar timestamps como IDs locales o regenerar IDs en migración |
| Pérdida de datos si usuario borra localStorage antes de login | High | Mostrar提示 de "Guarda tus datos" o exportar a JSON |
| Comportamiento inconsistente entre modo local y API | Medium | Crear interfaz unificada que abstraiga la fuente de datos |

## Rollback Plan

1. Revertir cambios en `apps/webapp/src/routes/index.tsx` restaurando el Welcome Card
2. Eliminar lógica de anonymousId en webapp
3. Eliminar endpoint POST /api/auth/claim si no se usa
4. Ejecutar `bun run check` para verificar integridad

## Dependencies

- Función `claimAnonymousData` existente en `packages/db/src/core.ts`
- Sistema de auth con JWT (OpenAuth)
- API de categorías y scan disponibles públicamente (sin login)

## Success Criteria

- [ ] Usuario nuevo ve dashboard vacío (sin Welcome Card) al abrir la app
- [ ] Expenses e incomes se guardan en localStorage cuando hay anonymousId
- [ ] Categorías y scan funcionan con token anónimo
- [ ] Login con datos locales migra correctamente expenses/incomes al board del usuario
- [ ] Toast aparece al intentar compartir sin sesión
- [ ] Tests pasan: `bun run test:all`
