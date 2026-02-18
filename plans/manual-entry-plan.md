# Plan de Implementación: Formulario de Registro Manual

Este documento detalla el plan para habilitar el ingreso manual de gastos e ingresos en la aplicación Maimoni, conectando la interfaz existente con el backend (Hono + Drizzle).

## 1. Visión General
Actualmente, la pantalla `/add` cuenta con una interfaz funcional pero utiliza datos mockeados y no persiste la información en la base de datos. Este plan describe los pasos para implementar los endpoints necesarios en el API y la lógica de envío en la Webapp.

## 2. Requisitos de Datos (Campos)

Según el `plan.md` y el esquema de base de datos actual:

### Gastos (`expenses`)
- **Monto** (`amount`): Decimal (12,2).
- **Tipo**: Gasto.
- **Categoría** (`categoryId`): UUID de la tabla `categories`.
- **Nota** (`note`): Texto opcional.
- **Fecha** (`date`): Timestamp (por defecto ahora).
- **Tablero** (`boardId`): UUID del tablero activo del usuario.
- **Usuario** (`userId`): UUID del usuario que registra.

### Ingresos (`incomes`)
- **Monto** (`amount`): Decimal (12,2).
- **Tipo**: Ingreso.
- **Categoría** (`categoryId`): UUID.
- **Nota** (`note`): Texto opcional.
- **Fecha** (`date`): Timestamp.
- **Tablero** (`boardId`): UUID.
- **Usuario** (`userId`): UUID.

## 3. Implementación Backend (Hono API)

### 3.1. Endpoints a Crear/Actualizar

1. **`GET /api/categories`**:
   - Retorna la lista de categorías filtradas por tipo (`income` o `expense`).
   - Reemplazará los datos estáticos en la webapp.

2. **`POST /api/transactions`**:
   - Endpoint unificado o separado (`POST /api/expenses` y `POST /api/incomes`).
   - **Lógica**:
     - Validar que el `boardId` pertenezca al usuario (o sea miembro).
     - Validar que la `categoryId` sea del tipo correcto.
     - Insertar en la tabla correspondiente.
     - Retornar el objeto creado.

### 3.2. Seguridad
- Todas las rutas requieren el middleware de autenticación de OpenAuth.
- El `userId` se obtiene del token JWT.
- Se debe validar que el usuario tenga un tablero activo (usar `getOrCreateInitialBoard`).

## 4. Implementación Frontend (TanStack Start)

### 4.1. Sincronización de Categorías
- Cambiar `EXPENSE_CATEGORIES` y `INCOME_CATEGORIES` de archivos estáticos a un loader de TanStack o un hook de `useQuery` que consuma el API.

### 4.2. Lógica de Envío
- Utilizar **TanStack Start Server Functions** para manejar el envío de forma segura o realizar un `fetch` directo al API desde el componente.
- **Flujo**:
  1. El usuario completa el formulario.
  2. Al presionar "Guardar", se envía el objeto al API.
  3. Si es exitoso, mostrar un feedback visual (opcional) y navegar al dashboard (`/`).
  4. Invalidar la cache del dashboard para mostrar el nuevo movimiento inmediatamente.

### 4.3. Mejoras en la UI
- Añadir un estado de `loading` al botón de guardar.
- Manejar errores del API (ej: monto inválido, error de red).

## 5. Tareas Técnicas (Checklist)

### Fase 1: Backend
- [ ] Crear endpoint `GET /api/categories` en `apps/api`.
- [ ] Crear endpoint `POST /api/transactions` (o equivalentes) en `apps/api`.
- [ ] Implementar validación de esquema con `zod` en los handlers de Hono.
- [ ] Escribir tests de integración para la creación de transacciones.

### Fase 2: Frontend
- [ ] Crear un servicio/función para llamar a los nuevos endpoints.
- [ ] Actualizar el componente `AddMovement` en `apps/webapp/src/routes/add.tsx`:
  - [ ] Cargar categorías desde el API.
  - [ ] Implementar el `handleSubmit` real con `fetch`.
  - [ ] Añadir manejo de errores y estados de carga.
- [ ] Asegurar que el dashboard se refresque al volver de `/add`.

## 6. Consideraciones de UX
- **Velocidad**: El registro debe ser "extremadamente rápido" (Principio #1).
- **Feedback**: El usuario debe saber que el gasto se guardó correctamente.
- **Persistencia**: Si el usuario es anónimo, los datos se guardan con su `anonymousId` y se migrarán luego (según el `authentication-plan.md`).

## 7. Estrategia de Pruebas y Verificación (QA)

Siguiendo la guía definida en `authentication-plan.md`, la verificación se realizará en tres niveles utilizando **Bun** y **Playwright**.

### 7.1. Pruebas Unitarias (Bun Test)
- **Objetivo**: Validar lógica de validación de montos y tipos.
- **Foco**:
    - Validar que el monto sea positivo y con máximo 2 decimales.
    - Validar que una transacción no pueda tener una categoría de un tipo opuesto (ej: gasto con categoría de ingreso).

### 7.2. Pruebas de Integración (Bun Test + Testcontainers)
- **Objetivo**: Validar la persistencia real en PostgreSQL.
- **Escenarios Críticos**:
    - **Creación Exitosa**: Insertar un gasto/ingreso y verificar que se guarde en la tabla correcta con los IDs de usuario y tablero adecuados.
    - **Seguridad de Tablero**: Intentar registrar un gasto en un tablero al que el usuario no pertenece (debe fallar).
    - **Integridad de Categoría**: Intentar registrar con un `categoryId` inexistente.

### 7.3. Pruebas End-to-End (Playwright)
- **Objetivo**: Validar el flujo completo en la UI.
- **Flujo "Happy Path"**:
    1. El usuario navega a `/add`.
    2. Selecciona "Gasto", ingresa un monto y selecciona una categoría.
    3. Presiona "Guardar".
    4. El sistema redirige al dashboard y el nuevo gasto aparece en la lista con el monto correcto.
    5. Repetir para "Ingreso".

### 7.4. Criterios de Aceptación (DoD)
1. **Validación Zod**: El API debe rechazar payloads malformados con errores claros.
2. **Type Safety**: No usar `any` en los handlers de Hono ni en los componentes de React.
3. **Feedback Visual**: El botón de "Guardar" debe mostrar un estado de carga (disabled + spinner/texto).
4. **Refresco de Datos**: Al volver al dashboard, el balance y la lista deben estar actualizados sin necesidad de recargar manualmente.

## 8. Referencias
- Esquema de DB: `packages/db/src/schema.ts`
- Plan de Autenticación: `authentication-plan.md`
- Principios de Producto: `plan.md`
