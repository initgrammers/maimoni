## 1. Objetivo de la Guía

Establecer una arquitectura y políticas transversales de testing que garanticen:

- Confiabilidad del código
- Prevención de regresiones
- Estandarización entre proyectos
- Mantenibilidad
- Integración continua con SonarQube para métricas reales de calidad

---

# 2. Estructura Estándar de Carpetas

El modelo híbrido combina lo mejor de las dos prácticas principales:

- **Tests unitarios e integración cerca del código** (co-localized)
- **Tests end-to-end en carpeta dedicada `tests/e2e`**

```
src/
  moduleA/
    service.ts
    service.spec.ts          # Unit test
    service.test.ts          # Integration test (si aplica)
  components/
    Button.tsx
    Button.spec.tsx          # Unit test
tests/
  e2e/
    login.e2e.ts
    user-flow.e2e.ts
  fixtures/
    users.json
  mocks/
    http/
      mockUserService.ts
coverage/
```

### **Carpetas Especiales**

| Carpeta | Descripción |
| --- | --- |
| `tests/e2e` | Pruebas end-to-end del sistema completo. |
| `tests/fixtures` | Datos estáticos o plantillas de prueba. |
| `tests/mocks` | Mocks reutilizables (HTTP, servicios, DB, etc.). |
| `coverage/` | Output generado automáticamente; no se versiona. |

---

# 3. Tipos de Tests

---

## **3.1 Unit Testing**

### **Objetivo**

Verificar el comportamiento aislado de una función, componente o clase.

### **Casos de uso recomendados**

- Funciones puras
- Componentes visuales sin dependencias externas
- Servicios pequeños o Helpers
- Validadores, parsers, formateadores

### **Herramientas recomendadas**

- **Bun Test** (frontend,backend)
- **Testing Library** (Frontend)
- **Jest** (para casos que no cubre bun)

### **Ejemplo**

```tsx
import { sum } from "./sum";

describe("sum()", () => {
  it("retorna la suma correcta", () => {
    expect(sum(2, 3)).toBe(5);
  });
});

```

---

## **3.2 Integration Testing**

### **Objetivo**

Probar cómo distintos módulos trabajan juntos, sin llegar a escenarios e2e.

### **Casos de uso**

- Controlador + Servicio en backend
- Componente + API mocked en frontend
- Funciones con dependencias reales internas

### **Herramientas**

- **Bun Test** (frontend,backend)
- **Testing Library** (Frontend)
- **Jest** (para casos que no cubre bun)
- **testscontainers** (para probar infraestructura en el core como db)

### **Ejemplo**

```tsx
import request from "supertest";
import app from "../app";

describe("GET /users", () => {
  it("devuelve la lista de usuarios", async () => {
    const res = await request(app).get("/users");
    expect(res.status).toBe(200);
  });
});

```

---

## **3.3 End-to-End (E2E) Testing**

### **Objetivo**

Validar el flujo completo de la aplicación desde la perspectiva del usuario.

### **Casos de uso**

- Flujo de login
- Creación/edición de entidades
- Pagos
- Navegación entre pantallas

### **Herramientas**

- **Playwright** (recomendada para web)
- **Maestro** (recomendada para mobile)
- **bun  + testscontainers**  (recomanda para probar endpoins o queries )

### **Ejemplo**

```tsx
import { test, expect } from "@playwright/test";

test("login correcto", async ({ page }) => {
  await page.goto("/login");
  await page.fill("#email", "admin@test.com");
  await page.fill("#password", "1234");
  await page.click("button[type=submit]");
  await expect(page).toHaveURL("/dashboard");
});

```

---

# 4. Convenciones de Nombres (Obligatorias)

Tipo               Extensión

---

Unit test          `*.spec.ts`

Integration test   `*.test.ts`

End-to-End (E2E)   `*.e2e.ts`

Fixtures           `*.fixture.ts`

Mocks              `*.mock.ts`

