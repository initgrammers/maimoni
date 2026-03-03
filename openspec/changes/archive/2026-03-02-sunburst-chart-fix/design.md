# Design: Sunburst Chart Fix

## Technical Approach

Reemplazar el gráfico SVG donut actual (líneas 1820-1878) por un sunburst chart de dos anillos que muestre:
- Anillo externo: Categorías padre con porcentajes agregados
- Anillo interno: Subcategorías agrupadas por categoría padre
- Centro: Total de gastos (mantener comportamiento actual)

Se evaluará react-chartjs-sunburst como librería principal. Si presenta incompatibilidades, se implementará un SVG manual de dos anillos.

## Architecture Decisions

### Decision: Librería de Visualización

**Choice**: Evaluar react-chartjs-sunburst primero, fallback a SVG manual

**Alternatives considered**:
- react-chartjs-sunburst (plugin Chart.js especializado)
- SVG manual con dos anillos concéntricos
- Recharts (librería alternativa)
- D3.js (demasiado complejo para este caso)

**Rationale**: 
- El proyecto ya usa React, por lo que react-chartjs-sunburst sería consistente
- Si falla la integración, el SVG manual da control total y no agrega dependencias
- La complejidad del sunburst es manejable con SVG (dos anillos concéntricos)

### Decision: Transformación de Datos

**Choice**: Modificar `statsCategoryBreakdown` (líneas 897-1012) para output jerárquico

**Alternatives considered**:
- Crear nuevo useMemo separado (más complejo, duplica lógica)
- Transformar en el componente del gráfico (acopla lógica de datos a UI)

**Rationale**:
- La lógica actual ya agrupa por categoría y subcategoría
- Es más limpio cambiar la estructura de salida que agregar otra capa
- Mantiene el cálculo de porcentajes y colores existente

### Decision: Esquema de Colores

**Choice**: Variantes de opacidad para subcategorías

**Alternatives considered**:
- Paleta de colores completamente diferente para subcategorías
- Colores aleatorios
- Colores basados en hash del nombre

**Rationale**:
- Mantiene coherencia visual (subcategorías relacionadas visualmente con su padre)
- Fácil de implementar con CSS opacity o HSL lightness
- Permite identificar rápidamente la relación padre-hijo

### Decision: Límite de Categorías Mostradas

**Choice**: Máximo 8 categorías + "Otros"

**Alternatives considered**:
- Mostrar todas (puede saturar el gráfico)
- Scroll en el gráfico (mala UX)

**Rationale**:
- 8 categorías es legible en mobile y desktop
- "Otros" agrupa elementos pequeños sin perder información relevante
- Consistente con mejores prácticas de visualización

## Data Flow

```
Expenses Data (movements)
    │
    ▼
statsCategoryBreakdown (useMemo)
    │
    ├── Filtrar por período (week/month/year)
    ├── Agrupar por categoryId
    │   └── Calcular total por categoría
    ├── Dentro de cada categoría:
    │   └── Agrupar por subcategoryId
    │       └── Calcular total por subcategoría
    ├── Asignar colores
    ├── Ordenar por monto (desc)
    ├── Limitar a top 8 categorías
    └── Calcular porcentajes
    │
    ▼
Hierarchical Data Structure
    │
    ├── categories[]: { name, percentage, color, total, children[] }
    │   └── children[]: { name, percentage, color, total }
    │
    ▼
SunburstChart Component
    │
    ├── Anillo externo: categories
    └── Anillo interno: children (subcategorías)
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `apps/webapp/src/routes/index.tsx` | Modify | Transformar `statsCategoryBreakdown` (líneas 897-1012) para output jerárquico |
| `apps/webapp/src/routes/index.tsx` | Modify | Reemplazar SVG donut (líneas 1820-1878) por componente SunburstChart |
| `apps/webapp/package.json` | Modify | Agregar dependencia react-chartjs-sunburst (o chart.js si no está) |
| `apps/webapp/src/components/SunburstChart.tsx` | Create | Componente reutilizable de sunburst chart |

## Interfaces / Contracts

### Data Structure

```typescript
interface SunburstCategory {
  name: string
  percentage: number
  total: number
  color: string
  emoji: string
  children: SunburstSubcategory[]
}

interface SunburstSubcategory {
  name: string
  percentage: number
  total: number
  color: string
  emoji: string
}

interface SunburstData {
  categories: SunburstCategory[]
  totalExpense: number
}
```

### Component Props

```typescript
interface SunburstChartProps {
  data: SunburstData
  width?: number
  height?: number
  onSegmentClick?: (segment: SunburstCategory | SunburstSubcategory) => void
}
```

### Chart Options (si se usa Chart.js)

```typescript
const sunburstOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      callbacks: {
        label: (context: any) => {
          const label = context.label || ''
          const value = context.raw || 0
          const amount = context.dataset.amounts?.[context.dataIndex]
          return `${label}: ${value.toFixed(1)}% (${formatCurrency(amount)})`
        }
      }
    }
  },
  elements: {
    arc: {
      borderWidth: 2,
      borderColor: '#ffffff'
    }
  }
}
```

## Implementation Details

### Paso 1: Transformación de Datos (líneas ~950-1000 en statsCategoryBreakdown)

Cambiar la estructura actual:
- Agrupar primero por `categoryName`
- Para cada categoría, calcular el total
- Dentro de cada categoría, agrupar por `subcategoryName` (null = "Sin subcategoría")
- Calcular porcentajes respecto al total global
- Ordenar categorías por total descendente
- Limitar a 8 categorías, agrupar resto en "Otros"

### Paso 2: Componente SunburstChart

Opción A (react-chartjs-sunburst):
```typescript
import { Sunburst } from 'react-chartjs-sunburst'
// Configurar datasets con estructura jerárquica
```

Opción B (SVG Manual):
```typescript
// Dos anillos concéntricos usando <circle> o <path>
// Anillo externo: radio 40-50 (categorías)
// Anillo interno: radio 20-40 (subcategorías)
// Centro: círculo blanco con total
```

### Paso 3: Colores

Para subcategorías, usar variante más clara del color padre:
```typescript
function getLighterColor(baseColor: string, level: number): string {
  // Usar HSL para ajustar lightness
  // O usar opacidad: baseColor con 60-80% opacity
}
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | Data transformation | Test `statsCategoryBreakdown` con datos mock |
| Unit | Porcentaje calculations | Verificar que sumen 100% en cada nivel |
| Unit | Color assignment | Verificar que subcategorías usen variantes del padre |
| Integration | SunburstChart rendering | Renderizar con datos de prueba, verificar SVG/Canvas |
| Integration | Interactions | Hover tooltips, click handlers |
| E2E | Visual regression | Comparar screenshot del gráfico |
| E2E | Responsive | Verificar en mobile viewport |

### Tests Específicos

1. **Test de transformación de datos**:
   - Input: Expenses con categorías y subcategorías
   - Assert: Estructura jerárquica correcta
   - Assert: Porcentajes calculados correctamente

2. **Test de "Sin subcategoría"**:
   - Input: Expense sin subcategoría
   - Assert: Se agrupa bajo "Sin subcategoría"

3. **Test de límite de categorías**:
   - Input: 10 categorías
   - Assert: Solo 8 + "Otros" en output

4. **Test de colores**:
   - Assert: Subcategorías tienen color relacionado al padre

## Migration / Rollback

### Migration
1. Implementar cambios en rama feature
2. Verificar en staging
3. Merge a main

### Rollback Plan
1. Revertir commits en `apps/webapp/src/routes/index.tsx`
2. Si se agregó dependencia: `bun remove react-chartjs-sunburst chart.js`
3. `bun install`
4. El gráfico donut original quedará restaurado

## Open Questions

- [ ] ¿Se requiere interactividad (click en segmentos) o solo visualización?
- [ ] ¿Hay límite de subcategorías por categoría que mostrar?
- [ ] ¿Se necesita leyenda fuera del gráfico o solo tooltips?
- [ ] ¿Cómo manejar categorías con muchas subcategorías (más de 10)?
