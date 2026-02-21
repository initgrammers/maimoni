# Plan de invitaciones a tablero (usuarios anonimos y autenticados)

## 1) Objetivo

Permitir que un usuario dueno o miembro con permiso pueda invitar personas a un tablero, y que esas personas puedan aceptar/rechazar la invitacion tanto si estan autenticadas (WhatsApp) como si aun son anonimas.

El plan busca:
- evitar perdida de datos cuando una persona anonima luego se autentica,
- evitar invitaciones duplicadas o tokens reutilizados,
- mantener reglas de seguridad claras por rol.

## 2) Supuestos del estado actual

Basado en el codigo actual:
- Ya existen tablas `boards`, `board_members`, `invitations`, `users`.
- Ya existe flujo de reclamacion anonima -> autenticado (`claimAnonymousData`).
- El backend hoy trabaja principalmente con `ownerId` para acceso a tablero.
- `invitations` aun es basica (sin token publico, sin expiracion, sin auditoria de actor, sin rol objetivo).

Conclusiones:
- Hay base para construir la funcionalidad, pero falta robustecer modelo de invitacion y autorizacion por membresia.

## 3) Modelo funcional propuesto

### 3.1 Actores
- **Owner**: control total del tablero.
- **Editor**: puede registrar y editar movimientos.
- **Viewer** (opcional): solo lectura.
- **Invitado**: usuario (autenticado o anonimo) que recibe invitacion.

### 3.2 Estados de invitacion
- `pending`: creada, aun no resuelta.
- `accepted`: aceptada y membrecia creada/activada.
- `declined`: rechazada por invitado.
- `revoked`: cancelada por owner/admin antes de aceptar.
- `expired`: vencida por tiempo.

### 3.3 Canal de invitacion
Se recomienda soportar 2 vias:
1. **Link con token** (principal, universal): funciona para anonimos y autenticados.
2. **Telefono** (opcional): para notificacion por WhatsApp y pre-llenado, pero no como unico mecanismo de autenticacion.

## 4) Cambios de datos (DB)

## 4.1 `board_members`
Agregar:
- `role` (`owner | editor | viewer`) con default `editor`.
- (Opcional) `invited_by` para trazabilidad.

Reglas:
- Un registro unico por `(board_id, user_id)` (ya existe PK compuesta).
- Si reingresa alguien eliminado: reactivar `is_active = true`.

## 4.2 `invitations`
Agregar campos:
- `invited_by_user_id` (quien crea la invitacion).
- `invite_token_hash` (nunca guardar token plano).
- `target_role` (`editor | viewer`, nunca `owner` por invitacion normal).
- `expires_at`.
- `accepted_at`, `declined_at`, `revoked_at`.
- `accepted_by_user_id` (quien acepto finalmente).
- `invitee_user_id` nullable (si se conoce desde el inicio).

Mantener:
- `invited_phone_number` y `invited_anonymous_id` como compatibilidad / estrategia mixta.

Indices recomendados:
- indice unico parcial para `invite_token_hash` en activas.
- indice por `(board_id, status)`.
- indice por `invitee_user_id`.

## 5) API propuesta

## 5.1 Gestion de invitaciones
- `POST /api/boards/:boardId/invitations`
  - crea invitacion (owner/editor con permiso).
  - input: `targetRole`, opcional `phoneNumber`, opcional `ttlHours`.
  - output: `inviteUrl` (token plano solo en respuesta de creacion).

- `GET /api/boards/:boardId/invitations`
  - lista invitaciones del tablero (filtrable por estado).

- `POST /api/invitations/:invitationId/revoke`
  - revoca invitacion pendiente.

## 5.2 Resolucion de invitacion por token
- `GET /api/invitations/resolve?token=...`
  - devuelve metadata minima: tablero, invitador, rol objetivo, estado, expiracion.
  - no expone datos sensibles.

- `POST /api/invitations/accept`
  - input: token.
  - comportamiento:
    - valida token/hash, estado y expiracion,
    - resuelve identidad actual (auth user o anonimo),
    - crea/reactiva `board_members`,
    - marca invitacion `accepted`.

- `POST /api/invitations/decline`
  - input: token.
  - marca `declined` si sigue pending.

## 5.3 Tableros por membresia
Actualizar endpoints de tablero para que permitan acceso por `board_members` activo (no solo owner).

## 6) UX y flujo de producto

## 6.1 Desde tablero (invitador)
1. Entrar a configuracion -> "Miembros e invitaciones".
2. Crear invitacion (rol, expiracion).
3. Copiar link o compartir por WhatsApp.
4. Ver estado en lista: pending/accepted/declined/revoked/expired.

## 6.2 Invitado autenticado
1. Abre link.
2. Pantalla de preview de invitacion.
3. Acepta.
4. Queda agregado al tablero y se redirige al dashboard con selector de tablero.

## 6.3 Invitado anonimo (sin login)
1. Abre link.
2. Puede aceptar como anonimo temporal.
3. Se crea membrecia para su `anonymousId`.
4. Cuando luego hace login, `claimAnonymousData` debe transferir su membrecia/invitaciones al usuario real (esto ya existe parcialmente y hay que extender reglas para invitaciones aceptadas pendientes de migracion).

## 6.4 Invitado ya miembro
Al aceptar:
- responder exito idempotente (`already_member = true`),
- marcar invitacion como `accepted` o `consumed_duplicate` (decision de negocio; recomendado `accepted` con nota interna).

## 7) Casos posibles (matriz)

1. **Token invalido** -> 404/400, mensaje claro.
2. **Token expirado** -> estado `expired`, opcion "solicitar nueva invitacion".
3. **Invitacion revocada** -> no aceptar.
4. **Invitacion ya aceptada por otro usuario** -> bloquear y auditar intento.
5. **Invitado anonimo luego autentica** -> migrar membresia sin duplicar PK.
6. **Usuario con telefono distinto al invitado por numero** -> permitir solo por token; no confiar solo en numero.
7. **Owner intenta auto-invitarse** -> bloquear.
8. **Invitador sin permisos** -> 403.
9. **Usuario removido e invitado de nuevo** -> reactivar miembro en vez de insertar duplicado.
10. **Reuso de token** -> primer uso consume, siguientes rechazados.
11. **Race condition doble accept** -> transaccion + condicion por estado pending.
12. **Board inactivo** -> no aceptar invitaciones.
13. **Usuario bloqueado/inactivo** -> no aceptar.
14. **Cambio de owner con invitaciones pendientes** -> mantener vigentes, registrar owner actual al aceptar.

## 8) Seguridad

- Token aleatorio criptografico (>= 32 bytes), guardar solo hash.
- TTL corto por defecto (ej. 7 dias).
- Rate limit para resolve/accept.
- Auditoria: `invited_by_user_id`, `accepted_by_user_id`, timestamps.
- No exponer IDs internos sensibles en links.
- Validacion estricta de permisos por board + role.

## 9) Observabilidad

Eventos recomendados:
- `invitation.created`
- `invitation.resolved`
- `invitation.accepted`
- `invitation.declined`
- `invitation.revoked`
- `invitation.expired`
- `membership.reactivated`

Metrica clave:
- tasa de aceptacion,
- tiempo medio creacion -> aceptacion,
- errores por causa (token invalido, expirado, permiso).

## 10) Plan de implementacion por fases

### Fase 1 - Modelo y API minima (MVP seguro)
1. Migraciones DB para robustecer `invitations` y roles en `board_members`.
2. Endpoints crear/listar/revocar invitaciones.
3. Endpoints resolve/accept/decline por token.
4. Autorizacion por membresia activa en consultas de tablero.

### Fase 2 - UI webapp
1. Seccion "Miembros e invitaciones".
2. Flujo de abrir link y aceptar/rechazar.
3. Estados de invitacion con feedback claro.

### Fase 3 - Flujos anonimos + claim robusto
1. Ajustar `claimAnonymousData` para cubrir nuevos campos de invitacion y rol.
2. Pruebas de migracion anonimo->autenticado con membresia existente.

### Fase 4 - Hardening
1. Rate limiting y controles anti abuso.
2. Auditoria y panel de eventos.
3. Limpieza automatica de invitaciones expiradas.

## 11) Estrategia de testing

### Unit
- validadores de payload,
- reglas de transicion de estado de invitacion,
- calculo de permisos por rol.

### Integracion API
- crear/aceptar/rechazar/revocar,
- idempotencia de accept,
- expiracion,
- acceso por owner vs member vs no miembro.

### E2E
- invitado autenticado acepta y aparece tablero,
- invitado anonimo acepta, luego login y conserva acceso,
- revocar antes de aceptar bloquea entrada.

## 12) Decisiones de negocio a cerrar (antes de construir)

1. Roles finales a exponer en MVP (`editor/viewer` o solo `editor`).
2. TTL default de invitaciones.
3. Si una invitacion aceptada debe quedar historica o archivarse.
4. Si permitiremos multiples tableros por usuario en UI inmediatamente.

---

## Recomendacion final

Implementar primero **invitacion por link con token + aceptacion para autenticados y anonimos**, y luego agregar envio por WhatsApp como capa de distribucion.

Esto reduce complejidad inicial, cubre todos los casos de identidad, y reutiliza el flujo actual de `claimAnonymousData` para migrar anonimos sin perder datos.
