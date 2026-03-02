# SPEC: Sunburst Chart para Distribución de Gastos

## Resumen

Modificar el gráfico de dona en la página de Estadísticas para mostrar jerarquía categoría → subcategoría en un Sunburst de dos niveles.

---

## Estado Actual

- **Gráfico**: Donut SVG manual (sin librería)
- **Datos**: `DashboardExpense` solo tiene `categoryName`, `categoryEmoji`
- **Fallback**: No hay campo para subcategoría en el modelo actual

---

## Estado Deseado

### UI: Sunburst de dos anillos concéntricos

```
        ┌─────────────────────┐
        │   Categoría 40%     │  ← Outer ring
        │  ┌───────────────┐  │
        │  │ Supermercado  │  │
        │  │      20%      │  │  ← Inner ring
        │  │ Restaurantes  │  │     (subcategorías)
        │  │      10%      │  │
        │  │  Sin subcat   │  │
        │  │      10%      │  │
        │  └───────────────┘  │
        └─────────────────────┘
```

- **Anillo interno**: Subcategorías (o gastos sin subcategoría) con su %
- **Anillo externo**: Categorías padre con el total %
- **Centro**: Total de gastos (como ahora)

### Datos: Backend

```typescript
// Nuevo DashboardExpense
type DashboardExpense = {
  id: string;
  amount: string;
  categoryId: string;
  categoryName: string;
  categoryEmoji: string | null;
  subcategoryId: string | null;     // ← NUEVO
  subcategoryName: string | null;   // ← NUEVO
  subcategoryEmoji: string | null;  // ← NUEVO
  parentCategoryId: string | null;   // ← NUEVO (para gastos sin subcategoría)
  date: string | null;
};
```

### Lógica de Aggregation

1. **Gastos con subcategoría**: Se agrupan por `(categoryName, subcategoryName)`
2. **Gastos sin subcategoría**: Se agrupan por `categoryName` nomás
3. **Porcentaje de categoría padre**: Suma de todos sus gastos (con y sin subcategoría)

---

## Tareas

### Backend

- [ ] 1. Modificar `/packages/core/src/dashboard/application/ports.ts` → agregar campos de subcategoría
- [ ] 2. Modificar `/packages/core/src/dashboard/infra/repository.ts` → incluir subcategorías en el query
- [ ] 3. Modificar tipos en `/apps/webapp/src/types/index.ts` → reflejar cambios

### Frontend

- [ ] 4. Modificar `statsCategoryBreakdown` en `index.tsx` para construir datos jerárquicos
- [ ] 5. Reemplazar donut SVG por Sunburst SVG de dos anillos
- [ ] 6. Actualizar lista lateral para mostrar también jerarquía (opcional)

---

## Consideraciones

- Mantener compatibilidad hacia atrás si es posible
- No agregar nuevas dependencias si no es necesario (usar SVG manual como ahora)
- Respetar el diseño existente (colores, tipografía)

---

## Definition of Done

- [ ] El gráfico muestra subcategorías en el anillo interno
- [ ] El gráfico muestra categorías padre en el anillo externo
- [ ] Los porcentajes de categoría padre = suma de subcategorías + gastos sin subcategoría
- [ ] Centro del gráfico muestra el total de gastos
- [ ] Tests pasan antes de commit