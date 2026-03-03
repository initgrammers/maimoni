# Proposal: Sunburst Chart Fix

## Intent

Corregir la implementación del gráfico de estadísticas para mostrar jerarquía categoría/subcategoría usando un sunburst chart de dos anillos. El gráfico actual muestra categorías en un anillo único y las subcategorías en una lista separada, pero el SPEC requiere un sunburst donde el anillo externo muestre categorías padre y el interno muestre subcategorías con sus porcentajes.

## Scope

### In Scope
- Evaluar e integrar react-chartjs-sunburst
- Modificar statsCategoryBreakdown para estructura jerárquica
- Reemplazar donut chart actual por sunburst chart
- Actualizar estilos para coincidir con el diseño actual

### Out of Scope
- Cambios en el backend (ya devuelve los datos necesarios: subcategoryId, subcategoryName, subcategoryEmoji)
- Cambios en otros gráficos

## Approach

Usar la librería react-chartjs-sunburst (preferencia del usuario) para implementar el sunburst chart. Si la librería no es compatible o adecuada, hacer fallback a un SVG manual de dos anillos.

Transformar los datos planos de `statsCategoryBreakdown` a una estructura jerárquica donde:
- Anillo externo: Categorías padre con porcentaje total
- Anillo interno: Subcategorías agrupadas por categoría padre
- Ejemplo: 40% alimentación (externo) = 20% supermercados + 10% restaurantes + 10% sin subcategoría (internos)

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `apps/webapp/src/routes/index.tsx` | Modified | Componente de estadísticas y gráfico |
| `apps/webapp/package.json` | Modified | Posible nueva dependencia react-chartjs-sunburst |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Compatibilidad de react-chartjs-sunburst con Chart.js versión actual | Medium | Verificar versiones antes de instalar; usar fallback a SVG si falla |
| Rendimiento con muchas categorías/subcategorías | Low | Limitar número de elementos mostrados; agrupar elementos pequeños en "Otros" |
| Estilos inconsistentes con el diseño existente | Low | Reutilizar colores y tipografía del tema actual; mantener consistente con donut chart |

## Rollback Plan

1. Revertir cambios en `apps/webapp/src/routes/index.tsx` al donut chart anterior
2. Remover dependencia react-chartjs-sunburst de package.json si se agregó
3. Ejecutar `bun install` para actualizar lockfile

## Dependencies

- react-chartjs-sunburst (a evaluar)
- Chart.js (ya instalado)

## Success Criteria

- [ ] El gráfico muestra dos anillos (categorías en externo, subcategorías en interno)
- [ ] Los porcentajes se calculan correctamente en ambos niveles
- [ ] El diseño es consistente con la UI actual (colores, tipografía)
- [ ] Las interacciones (hover, tooltip) funcionan correctamente
- [ ] Los datos se transforman correctamente de planos a jerárquicos
