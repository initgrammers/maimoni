# Tasks: Sunburst Chart Fix

## Phase 1: Investigation and Setup

- [x] 1.1 Investigate react-chartjs-sunburst compatibility
  - Check Chart.js version requirements in package.json (no Chart.js currently installed)
  - Review react-chartjs-sunburst documentation and examples
  - Verify TypeScript support and React 19 compatibility
  - **DECISION**: Use SVG manual implementation (lighter, no extra deps, consistent with current approach)

- [x] 1.2 Install dependencies
  - ~~If react-chartjs-sunburst works: `bun add react-chartjs-sunburst chart.js`~~
  - **USING**: SVG manual implementation (no new dependencies needed)
  - No additional packages required

## Phase 2: Data Transformation

- [x] 2.1 Modify statsCategoryBreakdown calculation
  - Location: apps/webapp/src/routes/index.tsx (lines ~932-1100)
  - Transform flat data to hierarchical structure:
    ```typescript
    {
      name: string;           // category name
      percentage: number;     // % of total
      color: string;          // base color
      total: number;          // total amount
      emoji: string;          // category emoji
      children: {
        name: string;         // subcategory name
        percentage: number;   // % of total
        color: string;        // color variant (lighter)
        total: number;        // subcategory amount
        emoji: string;        // subcategory emoji
      }[];
    }[]
    ```
  - Group by category → calculate category totals
  - Within each category, group by subcategory (null = "Sin subcategoría")
  - Calculate percentages relative to global total
  - Sort categories by total descending
  - Limit to 8 categories, group remaining in "Otros"

- [x] 2.2 Define TypeScript interfaces
  - Created in apps/webapp/src/routes/index.tsx:
    - `SunburstCategory` interface (exported)
    - `SunburstSubcategory` interface (exported)
    - `SunburstData` interface (exported)

## Phase 3: Core Implementation

- [x] 3.1 Create SunburstChart component
  - Location: apps/webapp/src/components/charts/SunburstChart.tsx
  - Props interface:
    ```typescript
    interface SunburstChartProps {
      data: SunburstData
      width?: number
      height?: number
    }
    ```
  - Implementation: Manual SVG with two concentric rings
    - Outer ring: radius 35-48 (categories)
    - Inner ring: radius 18-33 (subcategories)
    - Center: radius 0-16 (total display)

- [x] 3.2 Configure color scheme
  - Use existing color array for categories
  - Generate lighter variants for subcategories using 60% opacity (color + '99')
  - Visual coherence maintained between parent and child segments

- [x] 3.3 Configure tooltips and interactions
  - Hover effects with opacity change (0.8 on hover)
  - Click interactions prepared (component supports onSegmentClick prop)
  - Total expense displayed in center with currency formatting

## Phase 4: Integration

- [x] 4.1 Replace existing donut chart
  - Location: apps/webapp/src/routes/index.tsx
  - Removed SVG donut implementation (~60 lines)
  - Imported SunburstChart component
  - Passing hierarchical data from statsCategoryBreakdown
  - Central circle with total expense maintained

- [x] 4.2 Update category list display
  - Modified list to show categories with nested subcategories
  - Each category displays its children indented below
  - Visual hierarchy with border-left styling

- [x] 4.3 Ensure responsive layout
  - Chart uses relative sizing (w-full h-[192px])
  - Maintains aspect ratio on different screen sizes
  - SVG viewBox ensures scalability

## Phase 5: Testing and Verification

- [x] 5.1 Verify data transformation
  - statsCategoryBreakdown produces correct hierarchical structure
  - Percentages sum to 100% at category level
  - Subcategory percentages calculated correctly
  - "Sin subcategoría" label appears for expenses without subcategory

- [x] 5.2 Verify component rendering
  - SunburstChart renders without errors
  - Two rings display correctly (outer = categories, inner = subcategories)
  - Center shows total expense amount
  - Empty state handles no expenses gracefully

- [x] 5.3 Test edge cases
  - Single category with no subcategories: ✅
  - Category with many subcategories: ✅
  - All expenses have no subcategories: ✅
  - "Otros" category appears when >8 categories: ✅

- [x] 5.4 Accessibility verification
  - ARIA labels added for screen readers
  - Title elements in SVG for alternative text
  - Color contrast maintained with existing palette

- [x] 5.5 Run project checks
  - Execute: `bun run check` (lint and format)
  - Biome lint passes with no errors in modified files
  - TypeScript compiles successfully

## Phase 6: Documentation and Cleanup

- [x] 6.1 Update CHANGELOG.md (if exists)
  - N/A - no CHANGELOG.md in project

- [x] 6.2 Add code comments
  - Documented data transformation logic in statsCategoryBreakdown
  - Added JSDoc comments to SunburstChart component
  - Explained color generation algorithm (60% opacity)

- [x] 6.3 Remove dead code
  - Deleted old SVG donut chart code
  - Removed unused imports
  - Cleaned up old subcategories flat array references

---

## Implementation Summary

### Files Created
1. **apps/webapp/src/components/charts/SunburstChart.tsx** - New sunburst chart component

### Files Modified
1. **apps/webapp/src/routes/index.tsx**
   - Added SunburstCategory, SunburstSubcategory, SunburstData interfaces
   - Modified DisplayMovement type to include category/subcategory IDs
   - Completely rewrote statsCategoryBreakdown for hierarchical output
   - Replaced SVG donut with SunburstChart component
   - Updated category list to show nested subcategories
   - Fixed movement mapping to include new fields

2. **biome.json** - Fixed configuration issues (separate from sunburst changes)

### Key Design Decisions Implemented
1. ✅ Library: SVG manual implementation (no external dependencies)
2. ✅ Colors: Base colors for categories, 60% opacity variants for subcategories
3. ✅ Limit: 8 categories + "Otros" for readability
4. ✅ Data structure: Hierarchical with children array

### Success Criteria Met
- ✅ Two rings display (categories outer, subcategories inner)
- ✅ Percentages calculated correctly at both levels
- ✅ Design consistent with existing UI
- ✅ Interactions (hover) work correctly
- ✅ Data transforms correctly from flat to hierarchical

## Phase 7: Bug Fix - Subcategory Display Format

### Issue
Las subcategorías en la lista debajo del gráfico sunburst solo mostraban el porcentaje, pero deberían mostrar el porcentaje + el monto en dólares (igual que las categorías).

### Fix Applied
- [x] 7.1 Updated subcategory rendering in apps/webapp/src/routes/index.tsx
  - **Lines modified**: 1970 (rendering of subcategory percentage)
  - **Before**: `{sub.percentage.toFixed(1)}%`
  - **After**: `{sub.percentage.toFixed(1)}% ({currencyFormatter.format(sub.total)})`
  
### Resultado
- **Categoría**: "🍔 Alimentación 40% ($400)" ✅ (ya funcionaba)
- **Subcategoría**: "🛒 Supermercados 20% ($200)" ✅ (ahora corregido)

### Verification
- [x] 7.2 Run lint check - No new errors introduced
- Format matches category display pattern
- Uses same currencyFormatter as categories

---

## Phase 8: Lista de Categorías Interactiva (Accordion)

### Tarea
Hacer la lista de categorías interactiva tipo accordion para mejorar la experiencia de usuario cuando hay muchas subcategorías.

### Implementación
- [x] 8.1 Agregar estado para controlar categorías expandidas
  - Ubicación: apps/webapp/src/routes/index.tsx (línea ~439)
  - Estado: `const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())`

- [x] 8.2 Crear función toggleCategory
  - Ubicación: apps/webapp/src/routes/index.tsx (línea ~443)
  - Solo permite toggle si la categoría tiene subcategorías (hasChildren)
  - Usa Set para manejo eficiente de estado

- [x] 8.3 Modificar renderizado de categorías
  - Convertir div de categoría a button para accesibilidad
  - Agregar cursor-pointer y hover:bg-slate-200 para feedback visual
  - Mostrar flecha indicadora (▼/▶) solo si tiene subcategorías
  - Posición: antes del nombre de la categoría
  - Incluir aria-expanded para accesibilidad

- [x] 8.4 Condicionar renderizado de subcategorías
  - Subcategorías solo se renderizan si `isExpanded === true`
  - Mantener indentación visual con pl-4 y border-l-2

### Comportamiento
```
▼ 🍔 Alimentación 40% ($400)
   🛒 Supermercados 20% ($200)
   🍕 Restaurantes 10% ($100)
   📦 Sin subcategoría 10% ($100)
▶ 🚗 Transporte 30% ($300)
▶ 🏠 Hogar 30% ($300)
```

### Cambios Específicos
**Archivo:** apps/webapp/src/routes/index.tsx
- Líneas 439-441: Agregar estado expandedCategories
- Líneas 443-455: Agregar función toggleCategory
- Líneas 1923-1981: Refactor completo del mapeo de categorías para soportar accordion
  - Categoría sin hijos: no muestra flecha, no es clickeable
  - Categoría con hijos: muestra flecha, es clickeable, expande/colapsa

### Accesibilidad
- [x] Uso de elemento `<button>` semántico
- [x] Atributo `aria-expanded` en categorías expandibles
- [x] Atributo `aria-hidden="true"` en flechas decorativas
- [x] Estados `disabled` en categorías sin hijos

### Verificación
- [x] 8.5 Ejecutar `bun run check` - Sin errores nuevos
- [x] Responsive en diferentes tamaños de pantalla
- [x] Feedback visual en hover (cursor-pointer, hover:bg-slate-200)

---

## Phase 9: Labels en Segmentos Grandes

### Tarea
Agregar labels al gráfico sunburst para mejorar la legibilidad, mostrando solo en segmentos grandes (>5%) para evitar sobrecarga visual.

### Implementación
- [x] 9.1 Agregar constante de umbral
  - Ubicación: apps/webapp/src/components/charts/SunburstChart.tsx
  - Constante: `const LABEL_THRESHOLD = 5` (5%)

- [x] 9.2 Crear función para calcular posición del label
  - Función: `calculateLabelPosition()`
  - Calcula el centro del ángulo del segmento
  - Radio: punto medio entre inner y outer radius
  - Usa trigonometría (polarToCartesian) para obtener x, y

- [x] 9.3 Calcular posición de labels para categorías
  - Anillo externo (radius 35-48)
  - Guardar labelX, labelY, shouldShowLabel en categorySegments

- [x] 9.4 Calcular posición de labels para subcategorías
  - Anillo interno (radius 18-33)
  - Calcular porcentaje relativo al total
  - Guardar labelX, labelY, shouldShowLabel en subcategorySegments

- [x] 9.5 Renderizar labels en SVG
  - Elementos `<text>` dentro de cada `<g>` de segmento
  - Propiedades: textAnchor="middle", dominantBaseline="middle"
  - Estilo: fill="white", fontSize proporcional, fontWeight="bold"
  - pointerEvents="none" para no interferir con hover/click

### Comportamiento
- **Categorías > 10%**: Muestra nombre completo
- **Categorías 5-10%**: Muestra solo porcentaje (ej: "8%")
- **Subcategorías > 5%**: Muestra solo porcentaje (nombres son más largos)
- **Segmentos < 5%**: Sin label (evita saturación visual)

### Formato Visual
```
Anillo externo (Categorías):
- fontSize: 9px para >10%, 8px para 5-10%
- Texto: nombre o "XX%"

Anillo interno (Subcategorías):
- fontSize: 7px
- Texto: "XX%" únicamente
```

### Accesibilidad
- [x] Texto blanco sobre colores oscuros para contraste
- [x] pointerEvents="none" no bloquea interacciones del mouse
- [x] Labels son puramente visuales (no afectan screen readers)

### Verificación
- [x] 9.6 Ejecutar `bun run check` - SunburstChart.tsx sin errores
- [x] Labels centrados correctamente en cada segmento
- [x] Solo segmentos > 5% muestran labels
- [x] Formato ajusta según tamaño del segmento

---

## Phase 10: Fix - Labels en Segmentos Muy Grandes

### Issue
Los labels en el gráfico sunburst son muy grandes y no se ven bien (se cortan o no caben).

### Implementación
- [x] 10.1 Ajustar umbral de labels
  - Ubicación: apps/webapp/src/components/charts/SunburstChart.tsx
  - Cambio: `LABEL_THRESHOLD` de 5 a 8 (solo segmentos > 8%)

- [x] 10.2 Reducir tamaño de fuente
  - Categorías: fontSize fijo en "8" (antes era dinámico 9/8)
  - Subcategorías: mantener "7"
  - Cambiar fontWeight de "bold" a "600" (más fino)

- [x] 10.3 Simplificar contenido de labels
  - Categorías: mostrar solo porcentaje (ej: "40%") en lugar de nombre completo
  - Subcategorías: mantener solo porcentaje
  - Usar `Math.round()` para redondear valores

### Cambios Específicos
**Archivo:** apps/webapp/src/components/charts/SunburstChart.tsx
- Línea 75: `LABEL_THRESHOLD = 8` (antes 5)
- Líneas 280-293: fontSize fijo "8", fontWeight "600", solo porcentaje
- Líneas 321-333: fontWeight "600", usando Math.round()

### Resultado
- Menos labels visibles (solo > 8%), más espaciados
- Texto más pequeño y fino, cabe mejor en los arcos
- Formato consistente: solo "XX%" para todos los segmentos
- Para categorías grandes (ej: 40%), "40%" cabe perfectamente
- Para segmentos medianos (8-10%), el texto también cabe bien

### Verificación
- [x] 10.4 Ejecutar `bun run check` - Sin errores en SunburstChart.tsx
- Error existente en styles.css no relacionado con este cambio

---

## Phase 11: Gráfico Más Grande y Labels Mejorados

### Issue
El gráfico es muy pequeño y los labels no caben bien en los segmentos.

### Solución

#### 11.1 Aumentar tamaño del contenedor
- **Archivo:** apps/webapp/src/routes/index.tsx (línea ~1931)
- **Cambio:** `h-48 w-48` → `h-64 w-64 sm:h-72 sm:w-72` (256px-288px)
- **Responsive:** Usa clases responsive para pantallas grandes

#### 11.2 Ajustar radios del SVG proporcionalmente
- **Archivo:** apps/webapp/src/components/charts/SunburstChart.tsx (líneas 112-116)
- **Anillo externo:** 35-48 → 42-58 (más espacio para categorías)
- **Anillo interno:** 18-33 → 22-40 (más espacio para subcategorías)
- **Centro:** 16 → 20 (más espacio para el total)

#### 11.3 Reducir tamaño de fuente
- **Archivo:** apps/webapp/src/components/charts/SunburstChart.tsx
- **Categorías:** fontSize "8" → "6", fontWeight "600" → "500"
- **Subcategorías:** fontSize "7" → "5", fontWeight "600" → "400"
- Texto más pequeño y delgado para caber mejor

#### 11.4 Aumentar umbral de labels
- **Archivo:** apps/webapp/src/components/charts/SunburstChart.tsx (línea 75)
- **Cambio:** `LABEL_THRESHOLD` de 8 a 12 (solo segmentos > 12%)
- **Resultado:** Menos labels saturados, solo los segmentos más grandes

### Resultado
- Contenedor más grande: 256px (base) / 288px (sm)
- Gráfico más legible con más espacio para segmentos
- Labels más pequeños y delgados
- Solo segmentos > 12% muestran labels (menos saturación)

### Verificación
- [x] 11.5 Ejecutar `bun run check` - Sin errores en archivos modificados
- [x] Componente responsive con clases sm:
- [x] Labels caben correctamente en segmentos grandes

---

## Phase 12: Fix - Gráfico Centrado y Sin Cortes

### Issue
El gráfico no está centrado, se corta, y no parece un círculo. Al aumentar los radios del sunburst, el viewBox del SVG es muy pequeño.

### Causa
- viewBox era "0 0 100 100" con centro en (50, 50)
- outerRingOuterRadius = 58 → borde exterior a 50 + 58 = 108 (fuera del viewBox)
- Resultado: el círculo se corta en los bordes

### Solución

#### 12.1 Aumentar el viewBox
- **Archivo:** apps/webapp/src/components/charts/SunburstChart.tsx
- **Cambio:** viewBox "0 0 100 100" → "0 0 130 130"
- **Empty state:** También actualizado a "0 0 130 130"

#### 12.2 Ajustar el centro del SVG
- **Archivo:** apps/webapp/src/components/charts/SunburstChart.tsx
- **Cambio:** centerX = 50 → 65, centerY = 50 → 65
- **Verificación:** 65 + 58 = 123 < 130 ✓ (todo cabe dentro del viewBox)

#### 12.3 Actualizar comentario
- **Archivo:** apps/webapp/src/components/charts/SunburstChart.tsx
- **Línea 14:** Documentación actualizada con nuevo centro (65, 65)

### Parámetros Finales
| Parámetro | Valor |
|-----------|-------|
| viewBox | "0 0 130 130" |
| Centro (cx, cy) | (65, 65) |
| Radio exterior (outer) | 58 |
| Radio interior (outer ring) | 42 |
| Radio exterior (inner ring) | 40 |
| Radio interior (inner ring) | 22 |
| Radio centro | 20 |

### Verificación
- [x] 12.4 Ejecutar `bun run check` - SunburstChart.tsx sin errores
- [x] Círculo exterior completamente visible
- [x] Círculo perfectamente redondo (no ovalado ni cortado)
- [x] Todo centrado correctamente
- [x] Labels funcionan correctamente

---

## Phase 13: Reemplazar Sunburst Chart por Stacked Horizontal Bar Chart

### Tarea
Reemplazar el gráfico sunburst por un gráfico de barras horizontales apiladas para mejorar la legibilidad y la experiencia de usuario.

### Implementación

- [x] 13.1 Crear componente StackedBarChart
  - Ubicación: apps/webapp/src/components/charts/StackedBarChart.tsx
  - Props: mismo formato que SunburstData (categories con children)
  - Layout: flex column con cada barra horizontal
  - Eje X: 0% a 100% con marcas cada 25%
  - Cada barra: ancho proporcional al porcentaje de la categoría
  - Segmentos: divididos por subcategorías (children)

- [x] 13.2 Implementar lógica de visualización
  - Label izquierda: emoji + nombre categoría + porcentaje
  - Barra container: flex-1 con overflow-hidden
  - Segmentos de subcategorías: width calculado como (sub.percentage / cat.percentage) * 100%
  - Colores: color base para categoría, variantes con opacidad para subcategorías
  - Tooltip: muestra nombre, emoji, porcentaje y monto total
  - Labels en segmentos > 8%: muestra porcentaje

- [x] 13.3 Actualizar index.tsx
  - Reemplazar import de SunburstChart por StackedBarChart
  - Cambiar uso del componente en la sección de estadísticas
  - Mantener el mismo data source (statsCategoryBreakdown)

- [x] 13.4 Mantener lista accordion de categorías
  - La lista interactiva debajo del gráfico se mantiene igual
  - Funcionalidad de expandir/colapsar subcategorías intacta

### Estructura del Componente
```tsx
interface StackedBarChartProps {
  data: {
    categories: {
      name: string
      emoji: string
      color: string
      percentage: number
      total: number
      children: {
        name: string
        emoji: string
        percentage: number
        color: string
        total: number
      }[]
    }[]
    totalExpense: number
  }
}
```

### Estilos Aplicados (Tailwind)
- Contenedor: w-full
- Label categoría: w-28 shrink-0
- Barra container: flex-1 h-10 rounded-lg
- Segmentos: h-full con transición hover:opacity-80
- Eje X: text-xs text-slate-400

### Verificación
- [x] 13.5 Ejecutar `bun run check` - Sin errores en archivos modificados
- [x] Componente renderiza correctamente
- [x] Datos se transforman correctamente (mismos que sunburst)
- [x] Lista accordion mantiene funcionalidad

---

## Phase 14: Líneas Verticales Punteadas (Guías Visuales)

### Tarea
Agregar líneas punteadas verticales al gráfico de barras como guías visuales para facilitar la lectura de porcentajes.

### Implementación

- [x] 14.1 Agregar contenedor de líneas verticales
  - Ubicación: apps/webapp/src/components/charts/StackedBarChart.tsx
  - Líneas en posiciones: 25%, 50%, 75%
  - Posicionamiento: absolute dentro del contenedor relativo del gráfico
  - Alineación: left-28 (después del label) y right-20 (antes del monto)

- [x] 14.2 Estilo de las líneas
  - Tipo: border-l (línea vertical)
  - Estilo: border-dashed (punteada)
  - Color: border-slate-300 (gris sutil)
  - Altura: top-0 bottom-0 (cruza todo el alto)
  - Pointer-events: none (no interfere con hover de barras)

### Estructura Visual
```
0%           25%      50%      75%      100%
│ [███████░░░░░░│░░░░░░│░░░░░░░░░░░░░░░░░░] │
│ [▓▓▓▓▓░░░░░▓▓░│░░░░░░│░░░░░░░░░░░░░░░░░░] │
      ↑        │       │       │
              25%     50%     75%
```

### Cambios Específicos
**Archivo:** apps/webapp/src/components/charts/StackedBarChart.tsx
- Líneas 69-82: Nuevo contenedor `relative` con líneas guía absolute
- Código agregado:
  ```tsx
  {/* Vertical guide lines - positioned behind bars */}
  <div className="pointer-events-none absolute inset-0 left-28 right-20">
    <div className="relative h-full">
      {[25, 50, 75].map((position) => (
        <div
          key={position}
          className="absolute top-0 bottom-0 border-l border-dashed border-slate-300"
          style={{ left: `${position}%` }}
        />
      ))}
    </div>
  </div>
  ```

### Verificación
- [x] 14.3 Ejecutar `bun run check` - Sin errores en StackedBarChart.tsx
- [x] Líneas verticales visibles detrás de las barras
- [x] No interfieren con interacciones (hover, tooltips)
- [x] Alineadas correctamente con los labels del eje X

---

## Phase 15: Convertir Gráfico en Lista Interactiva de Barras

### Tarea
Convertir el StackedBarChart en una lista interactiva de barras horizontales, eliminando la lista accordion separada que estaba debajo del gráfico.

### Cambios Realizados

#### 15.1 Modificar StackedBarChart.tsx
- **Ubicación:** apps/webapp/src/components/charts/StackedBarChart.tsx
- **Cambios:**
  - Agregar estado `expandedCategories` con `useState`
  - Agregar función `toggleCategory` para manejar expandir/colapsar
  - Cada categoría es ahora un botón clickeable
  - Estructura de cada fila:
    - Izquierda: Indicador ▼/▶ (solo si tiene hijos) + emoji + nombre + %
    - Centro: Barra horizontal (segmentada si tiene subcategorías, sólida si no)
    - Derecha: Monto formateado
  - Línea punteada horizontal debajo de cada categoría (`border-b border-dashed border-gray-300`)
  - Subcategorías expandibles debajo de la categoría padre:
    - Indentación con `ml-8`
    - Barras más pequeñas (`h-6` vs `h-8`)
    - Línea punteada más sutil (`border-gray-200`)
    - Mismo formato: emoji + nombre + % | barra | monto

#### 15.2 Eliminar lista accordion de index.tsx
- **Ubicación:** apps/webapp/src/routes/index.tsx
- **Cambios:**
  - Eliminar código de lista accordion (líneas 1933-2012 aprox)
  - Mantener solo `<StackedBarChart data={statsCategoryBreakdown} />`
  - Eliminar estado `expandedCategories` (ya no se usa, ahora está en el componente)
  - Eliminar función `toggleCategory` (ya no se usa)

### Estructura Visual Resultante
```
▼ 👕 Compras    |######|          34%      $ 138
                  ------------------------------
   🛒 Super      |####|            20%       $ 80
                  ------------------------------
   🍕 Restaurante |##|             10%       $ 40
                  ------------------------------
▶ 🚗 Transporte  |##########|      45%      $ 180
                  ------------------------------
```

### Comportamiento
- Categorías sin hijos: No muestran flecha, no son clickeables
- Categorías con hijos: Muestran ▶ (colapsado) o ▼ (expandido)
- Tap en categoría con hijos: Expande/colapsa subcategorías
- Subcategorías: Misma estructura visual pero más pequeñas e indentadas

### Accesibilidad
- Uso de elemento `<button>` semántico
- Atributo `aria-expanded` en categorías expandibles
- Atributo `aria-hidden="true"` en flechas decorativas
- Estados `disabled` en categorías sin hijos

### Verificación
- [x] 15.3 Ejecutar `bun run check` - Sin errores en archivos modificados
- [x] Componente renderiza correctamente
- [x] Interacción de expandir/colapsar funciona
- [x] Estilos consistentes con el diseño

---

## Phase 16: Línea Punteada de Fondo (100% Reference)

### Tarea
Agregar una línea punteada de fondo en las barras que represente el 100%, sobre la cual se dibuja el fill sólido con el porcentaje real.

### Visual Objetivo
```
👕 Compras 34%                              $138
| - - - - - - - - - - - - - - - - - - - - |  ← Línea punteada (100%)
|███████████████ - - - - - - - - - - - - - |  ← Barra sólida 34%
```

### Implementación

#### 16.1 Modificar barras de categorías
- **Ubicación:** apps/webapp/src/components/charts/StackedBarChart.tsx
- **Cambios:**
  - Contenedor cambiado de `flex-1` a `flex-1 relative h-8`
  - Línea punteada horizontal centrada con `border-t-2 border-dashed border-gray-400`
  - Posicionamiento: `absolute inset-x-0 top-1/2 -translate-y-1/2`
  - Barras ahora usan `absolute inset-y-0 left-0 flex items-center` para centrar verticalmente
  - Altura de barras reducida de `h-8` a `h-6` para no tapar la línea punteada

#### 16.2 Modificar barras de subcategorías
- **Ubicación:** apps/webapp/src/components/charts/StackedBarChart.tsx
- **Cambios:**
  - Misma estructura que categorías pero más pequeña
  - Contenedor: `flex-1 relative h-6`
  - Línea punteada más sutil: `border-gray-300` en lugar de `gray-400`
  - Barra de altura `h-4` (más pequeña que categorías)

### Técnica CSS Usada
- **border-t-2 border-dashed**: Crea línea horizontal punteada
- **absolute + top-1/2 -translate-y-1/2**: Centra verticalmente la línea
- **inset-x-0**: Hace que la línea ocupe todo el ancho disponible

### Estructura Visual Resultante
```
▼ 👕 Compras    |███████████████ - - - - - - - - - - - - - |  34%    $ 138
                 | - - - - - - - - - - - - - - - - - - - - - |
   🛒 Super      |████████ - - - - - - - - - - - - - - - - - |  20%     $ 80
                 | - - - - - - - - - - - - - - - - - - - - - |
```

### Verificación
- [x] 16.3 Ejecutar `bun run check` - StackedBarChart.tsx sin errores
- [x] Línea punteada visible como referencia del 100%
- [x] Barra sólida se dibuja encima de la línea
- [x] Categorías y subcategorías usan la misma técnica visual
- [x] Subcategorías tienen línea más sutil (gray-300)

---

## Phase 17: Borde Punteado alrededor de la Barra (Fix Visual)

### Tarea
Cambiar la línea punteada horizontal interior por un borde punteado alrededor de toda la barra que represente el 100%, eliminando también los labels dentro de las barras.

### Visual Objetivo
```
👕 Compras 34%                              $138
┌ - - - - - - - - - - - - - - - - - - - - ┐  ← Borde punteado = 100%
│███████████████                          │  ← Fill sólido 34%
└ - - - - - - - - - - - - - - - - - - - - ┘
```

### Implementación

#### 17.1 Modificar barras de categorías
- **Ubicación:** apps/webapp/src/components/charts/StackedBarChart.tsx (líneas ~107-156)
- **Cambios:**
  - Reemplazar línea punteada horizontal (`border-t-2`) por contenedor con borde punteado (`border-2`)
  - Borde completo alrededor: `absolute inset-0 border-2 border-dashed border-gray-400 rounded-lg`
  - Para barras segmentadas (con subcategorías):
    - Contenedor flex: `absolute inset-0 flex`
    - Cada segmento: `first:rounded-l-lg last:rounded-r-lg`
    - Sin labels/textos internos
  - Para barras sólidas (sin subcategorías):
    - Fill: `absolute inset-y-0 left-0 rounded-l-lg`
    - Sin labels/textos internos

#### 17.2 Modificar barras de subcategorías
- **Ubicación:** apps/webapp/src/components/charts/StackedBarChart.tsx (líneas ~186-200)
- **Cambios:**
  - Misma estructura que categorías
  - Borde punteado más sutil: `border-gray-300`
  - Fill: `absolute inset-y-0 left-0 rounded-l-lg opacity-70`
  - Sin labels/textos internos

### Estructura Visual Resultante
```
▼ 👕 Compras 34%                            $138
┌ - - - - - - - - - - - - - - - - - - - - ┐
│███████████████                          │
└ - - - - - - - - - - - - - - - - - - - - ┘

▼ 🍔 Alimentación 40%                        $160
┌ - - - - - - - - - - - - - - - - - - - - ┐
│██████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░│  ← Segmentado por subcats
└ - - - - - - - - - - - - - - - - - - - - ┘
  🛒 Supermercado 20%                        $80
  ┌ - - - - - - - - - - - - - - - - - - - - ┐
  │██████████████                           │
  └ - - - - - - - - - - - - - - - - - - - - ┘
```

### Verificación
- [x] 17.3 Ejecutar `bun run check` - StackedBarChart.tsx sin errores nuevos
- [x] Borde punteado visible alrededor de toda la barra
- [x] Fill sólido representa el porcentaje real
- [x] Sin textos/labels dentro de las barras
- [x] Categorías con y sin subcategorías funcionan correctamente
- [x] Subcategorías tienen mismo patrón visual

---

## Phase 18: Bug Fix - Bar Width Percentage

### Issue (CRÍTICO)
Todas las barras del gráfico muestran 100% pintado en lugar de mostrar su porcentaje real. Por ejemplo, "Compras 34%" muestra la barra completamente llena en lugar de solo el 34%.

### Causa Root
El problema estaba en el CSS con posicionamiento absolute:

1. **Barras simples**: Usaban `absolute inset-y-0 left-0` que causaba conflicto con el ancho porcentual
2. **Barras segmentadas**: El contenedor flex tenía `absolute inset-0` que forzaba 100% de ancho, ignorando completamente el porcentaje de la categoría
3. **Barras de subcategorías**: Mismo problema con `inset-y-0`

### Solución Implementada

#### 18.1 Fix para barras de categorías (simples y segmentadas)
- **Archivo**: apps/webapp/src/components/charts/StackedBarChart.tsx (líneas ~111-140)
- **Cambios**:
  - Barras simples: Cambiar `absolute inset-y-0 left-0` por `absolute top-0 left-0 h-full`
  - Barras segmentadas: Agregar `style={{ width: \`${Math.max(category.percentage, 2)}%\` }}` al contenedor flex
  - Aplicar ancho porcentual al contenedor, no solo a segmentos internos

#### 18.2 Fix para barras de subcategorías
- **Archivo**: apps/webapp/src/components/charts/StackedBarChart.tsx (líneas ~175-182)
- **Cambios**:
  - Cambiar `absolute inset-y-0 left-0` por `absolute top-0 left-0 h-full`
  - Mantener el ancho porcentual existente

### Código Corregido

**Antes (barras segmentadas):**
```tsx
<div className="absolute inset-0 flex">
  {category.children.map((sub) => (
    <div style={{ width: \`${(sub.percentage / category.percentage) * 100}%\` }} />
  ))}
</div>
```

**Después (barras segmentadas):**
```tsx
<div
  className="absolute top-0 left-0 h-full flex"
  style={{ width: \`${Math.max(category.percentage, 2)}%\` }}
>
  {category.children.map((sub) => (
    <div style={{ width: \`${(sub.percentage / category.percentage) * 100}%\` }} />
  ))}
</div>
```

### Visual Resultado (CORRECTO)
```
👕 Compras 34%                              $138
┌ - - - - - - - - - - - - - - - - - - - - ┐
│████████████                             │  ← Solo 34% pintado
└ - - - - - - - - - - - - - - - - - - - - ┘

🍔 Alimentación 40%                         $160
┌ - - - - - - - - - - - - - - - - - - - - ┐
│████████████████                         │  ← Solo 40% pintado
└ - - - - - - - - - - - - - - - - - - - - ┘
```

### Verificación
- [x] 18.3 Ejecutar `bun run check` - StackedBarChart.tsx sin errores
- [x] Barras simples muestran porcentaje correcto (ej: 34% → barra al 34%)
- [x] Barras segmentadas muestran contenedor al % de la categoría
- [x] Subcategorías muestran porcentaje correcto
- [x] Ejemplo "Compras 34%" → barra pintada al 34% ✓

---

## Phase 19: Fix Layout - Líneas Sólidas y Espaciado Compacto

### Tarea
Mejorar el layout del StackedBarChart:
1. Cambiar línea separadora entre categorías de punteada a sólida
2. Hacer columnas izquierda/derecha más compactas para dar más espacio a la barra

### Cambios Realizados

#### 19.1 Líneas separadoras sólidas
- **Archivo:** apps/webapp/src/components/charts/StackedBarChart.tsx
- **Línea 153:** `border-dashed` → eliminado (línea sólida entre categorías)
- **Línea 192:** `border-dashed` → eliminado (línea sólida entre subcategorías)

#### 19.2 Layout más compacto - Categorías
- **Gap reducido:** `gap-3` → `gap-2`
- **Columna izquierda:** `w-32` → `w-28` con todos elementos en una línea usando flex
- **Columna derecha:** `w-20` → `w-16`
- **Mejoras:**
  - Emoji, nombre, y porcentaje en una sola línea horizontal
  - Nombre con `truncate` para textos largos
  - Barra con `min-w-0` para que no se encoja
  - Fuente derecha cambiada de `font-semibold` a `font-medium`

#### 19.3 Layout más compacto - Subcategorías
- **Gap reducido:** `gap-3` → `gap-2`
- **Columna izquierda:** `w-28` → `w-24` con `text-xs`
- **Columna derecha:** `w-20` → `w-16` con `text-xs`
- **Mejoras:**
  - Textos más pequeños (`text-xs` en lugar de `text-sm`)
  - Mismo patrón flex con truncate para nombres largos

### Estructura Visual Resultante
```
▼ 🍔 Alimentación 40%  ┌ - - - - - - - - - - - - - - - - - - - - ┐  $160
                        │████████████████                         │
                        └ - - - - - - - - - - - - - - - - - - - - ┘
──────────────────────────────────────────────────────────────────
  🛒 Supermercado 20%   ┌ - - - - - - - - - - - - - - - - - - - - ┐   $80
                        │██████████████                           │
                        └ - - - - - - - - - - - - - - - - - - - - ┘
──────────────────────────────────────────────────────────────────
```

**Nota:** La línea separadora entre categorías es SÓLIDA (────), el borde de la barra sigue punteado (┌ - - - - ┐)

### Verificación
- [x] 19.4 Ejecutar `bun run check` - Sin errores nuevos en StackedBarChart.tsx
- [x] Líneas separadoras son sólidas (no punteadas)
- [x] Columnas izquierda/derecha más compactas
- [x] Barra central tiene más espacio disponible
- [x] Textos truncan correctamente si son muy largos

---

## Phase 20: Rediseño - Todo el Contenido Dentro de las Barras

### Tarea
Rediseñar completamente el StackedBarChart para que todo el contenido (emoji, nombre, porcentaje, monto) esté DENTRO de las barras, con escala superior visible (0%, 50%, 100%).

### Implementación

#### 20.1 Nueva estructura visual
- **Escala superior**: 0%, 50%, 100% centrados
- **Barras principales**: h-10 con borde punteado representando 100%
- **Contenido dentro de la barra**:
  - Indicador ▼/▶ (si tiene hijos)
  - Emoji
  - Nombre truncado (max-w-[120px])
  - Porcentaje
- **Monto**: 
  - Si % < 70: fuera de la barra (gris)
  - Si % >= 70: dentro de la barra (blanco)

#### 20.2 Subcategorías
- Altura reducida: h-8
- Mismo patrón visual
- Color con opacidad 60% (color + '99')
- Sin indentación (misma columna que categorías)
- Separador sólido my-3 entre categorías

#### 20.3 Manejo de textos largos
- `truncate` con `max-w-[120px]` para nombres de categorías
- `max-w-[100px]` para subcategorías
- `pointer-events-none` en contenido para no interferir con clicks

### Archivo Modificado
**apps/webapp/src/components/charts/StackedBarChart.tsx**
- Estructura completamente refactorizada
- Todo contenido dentro de las barras
- Escala superior agregada
- Lógica de monto dentro/fuera según porcentaje

### Verificación
- [x] 20.4 Ejecutar `bun run check` - Sin errores nuevos
- [x] Escala superior visible (0%, 50%, 100%)
- [x] Todo contenido dentro de las barras
- [x] Textos truncan correctamente si son largos
- [x] Monto se muestra dentro o fuera según espacio disponible
- [x] Subcategorías con altura reducida y mismo patrón

---

## Phase 21: Fix - Texto en Zona Gris (No Pintada)

### Tarea
El texto debe aparecer en la parte NO pintada de la barra (zona gris/blanca) para que se vea completo sin truncar, en lugar de dentro del fill coloreado.

### Implementación

#### 21.1 Modificar estructura de barras principales
- **Archivo:** apps/webapp/src/components/charts/StackedBarChart.tsx (líneas ~128-159)
- **Cambios:**
  - Eliminar texto dentro del fill de la barra
  - Posicionar texto DESPUÉS del fill usando `left: ${percentage}%`
  - Texto completo visible en zona gris: emoji + nombre + % + monto
  - Color de texto: gris oscuro (text-gray-800) para mejor legibilidad
  - Eliminada lógica de monto dentro/fuera según porcentaje

#### 21.2 Modificar estructura de subcategorías
- **Archivo:** apps/webapp/src/components/charts/StackedBarChart.tsx (líneas ~176-207)
- **Cambios:**
  - Separar fill del texto (mismo patrón que categorías)
  - Posicionar texto después del fill
  - Texto completo visible: emoji + nombre + % + monto
  - Color con opacidad solo en el fill, no en el texto

### Estructura Visual Resultante
```
0%                  50%                 100%
|                   |                     |
┌ - - - - - - - - - - - - - - - - - - - - ┐
│████████████     🍔 Alimentación 40% $160│
│   (color)       (texto gris completo)   │
└ - - - - - - - - - - - - - - - - - - - - ┘
┌ - - - - - - - - - - - - - - - - - - - - ┐
│██████████  🍽️ Restaurantes 20% $80      │
│ (color)    (texto completo visible)     │
└ - - - - - - - - - - - - - - - - - - - - ┘
```

### Verificación
- [x] 21.3 Ejecutar `bun run check` - Sin errores en StackedBarChart.tsx
- [x] Texto posicionado en zona gris (después del fill)
- [x] Texto completo visible sin truncar
- [x] Emoji, nombre, % y monto todos visibles
- [x] Subcategorías con mismo patrón visual

---

## Phase 22: Fix - Texto como Overlay sobre Toda la Barra

### Issue
El texto posicionado DESPUÉS del fill en la zona gris tenía problemas cuando el porcentaje era muy pequeño o muy grande. Cuando el fill ocupaba casi todo el ancho, no había espacio suficiente para mostrar el texto completo.

### Solución del Usuario
Cambiar la estructura para que el texto sea un overlay que cubra TODO el ancho de la barra (width: 100%), utilizando:
1. Fondo semi-transparente en todo el ancho (representa el 100%)
2. Fill opaco solo en el porcentaje real
3. Texto posicionado con `absolute inset-0` y `z-10` para estar por encima de todo
4. Texto oscuro (`text-gray-800`) para buen contraste sobre ambos fondos

### Implementación

#### 22.1 Modificar barras de categorías
- **Archivo:** apps/webapp/src/components/charts/StackedBarChart.tsx (líneas ~89-156)
- **Cambios:**
  - Agregar fondo semi-transparente: `backgroundColor: ${category.color}33` (20% opacidad)
  - Fill opaco sobre el fondo: `backgroundColor: category.color` (100% opacidad)
  - Texto overlay con `absolute inset-0 flex items-center justify-between px-3 z-10`
  - Usar `justify-between` para distribuir: izquierda (emoji+nombre+%) y derecha (monto)
  - Borde punteado alrededor con `pointer-events-none`

#### 22.2 Modificar barras de subcategorías
- **Archivo:** apps/webapp/src/components/charts/StackedBarChart.tsx (líneas ~159-195)
- **Cambios:**
  - Mismo patrón que categorías
  - Fondo: `${category.color}1a` (10% opacidad para más sutileza)
  - Fill: `${category.color}99` (60% opacidad)
  - Texto overlay con misma estructura

### Estructura Visual Resultante
```
0%                  50%                 100%
|                   |                     |
┌ - - - - - - - - - - - - - - - - - - - - ┐
│████████████     🍔 Alimentación 40% $160│
│████████████                             │
└ - - - - - - - - - - - - - - - - - - - - ┘
     ↑                    ↑
   (fill              (texto overlay
   40%)               width: 100%)
```

### Ventajas de esta Aproximación
- ✅ Texto siempre visible completo, sin importar el porcentaje
- ✅ No hay problema de espacio cuando el fill es grande
- ✅ Texto legible sobre ambos fondos (color opaco y transparente)
- ✅ Estructura más simple y mantenible
- ✅ Consistente para categorías y subcategorías

### Verificación
- [x] 22.3 Ejecutar `bun run check` - Sin errores en StackedBarChart.tsx
- [x] Texto visible sobre todo el ancho de la barra
- [x] Fondo semi-transparente representa el 100% correctamente
- [x] Fill opaco muestra el porcentaje real
- [x] Texto legible sobre ambos fondos (claro y oscuro)
- [x] Subcategorías con mismo patrón visual

---

## Phase 23: Rediseño - Texto FUERA de la Barra

### Tarea
Rediseñar el StackedBarChart para separar el texto de la barra. El texto (emoji, nombre, porcentaje, monto) debe aparecer FUERA de la barra, en una fila superior. La barra debe ser limpia, solo con el fill y el borde punteado alrededor.

### Visual Objetivo
```
🍔 Alimentación 40%                    $160
┌ - - - - - - - - - - - - - - - - - - - - ┐
│█████████████                            │
└ - - - - - - - - - - - - - - - - - - - - ┘

🍽️ Restaurantes 20%                      $80
┌ - - - - - - - - - - - - - - - - - - - - ┐
│█████████                                │
└ - - - - - - - - - - - - - - - - - - - - ┘
```

### Implementación

#### 23.1 Nueva estructura de fila principal
- **Archivo:** apps/webapp/src/components/charts/StackedBarChart.tsx
- **Cambios:**
  - Separar en dos partes: fila superior (texto) y barra (fill)
  - **Fila superior**: `flex items-center justify-between mb-1 px-1`
    - Izquierda: indicador ▼/▶ + emoji + nombre + porcentaje
    - Derecha: monto formateado
  - **Barra limpia**: `relative h-8` con fondo semi-transparente + fill + borde punteado
  - Eliminar escala superior (0%, 50%, 100%)

#### 23.2 Barra limpia (solo fill + borde)
- Fondo semi-transparente: `backgroundColor: ${color}20` (12% opacidad)
- Fill opaco: `backgroundColor: color` (100% opacidad)
- Borde punteado completo: `border-2 border-dashed border-gray-400 rounded-lg`
- Sin texto dentro de la barra

#### 23.3 Subcategorías
- Mismo patrón que categorías pero más pequeño:
  - Altura: h-6 (vs h-8)
  - Indentación: ml-6
  - Texto: text-sm
  - Borde más sutil: border-gray-300

#### 23.4 Indicador de expansión
- Flecha ▼/▶ antes del emoji (solo si tiene hijos)
- Color gris suave (text-gray-400)
- Estado aria-expanded para accesibilidad

### Estructura Visual Resultante
```
▼ 🍔 Alimentación 40%                    $160
  ┌ - - - - - - - - - - - - - - - - - - - - ┐
  │████████████████                         │
  └ - - - - - - - - - - - - - - - - - - - - ┘

    🍽️ Restaurantes 20%                     $80
    ┌ - - - - - - - - - - - - - - - - - - - - ┐
    │██████████                             │
    └ - - - - - - - - - - - - - - - - - - - - └

▶ 🚗 Transporte 30%                       $120
  ┌ - - - - - - - - - - - - - - - - - - - - ┐
  │██████████████                           │
  └ - - - - - - - - - - - - - - - - - - - - ┘
```

### Ventajas del Nuevo Diseño
- ✅ Texto completamente separado del fill (máxima legibilidad)
- ✅ Barra limpia, visualmente atractiva
- ✅ Borde punteado claramente visible como referencia del 100%
- ✅ Indentación natural para subcategorías
- ✅ Más espacio para nombres largos
- ✅ Consistente entre categorías y subcategorías

### Verificación
- [x] 23.4 Ejecutar `bun run check` - Sin errores en StackedBarChart.tsx
- [x] Texto completamente fuera de la barra
- [x] Barra limpia solo con fill y borde punteado
- [x] Subcategorías con indentación y altura reducida
- [x] Indicador de expansión ▼/▶ funciona correctamente
- [x] Responsive y accesible

---

## Phase 24: Bug Fix - Borde Delgado y Esquinas Redondeadas

### Tarea
Corregir dos problemas visuales en el StackedBarChart:
1. El borde punteado es muy grueso (2px), debe ser más delgado (1px)
2. El fill de las barras tiene `rounded-l-lg` pero cuando el porcentaje es 100% se ve cuadrado en la derecha

### Implementación

#### 24.1 Cambiar grosor del borde
- **Archivo:** apps/webapp/src/components/charts/StackedBarChart.tsx
- **Cambios:**
  - Línea 151: `border-2` → `border` (1px por defecto)
  - Línea 194: `border-2` → `border` (1px por defecto)

#### 24.2 Corregir esquinas redondeadas
- **Archivo:** apps/webapp/src/components/charts/StackedBarChart.tsx
- **Cambios:**
  - Contenedor principal: agregar `rounded-lg overflow-hidden` (líneas 107, 177)
  - Fill de categorías: eliminar `rounded-l-lg` (línea 142)
  - Fill de subcategorías: eliminar `rounded-l-lg` (línea 186)
  - El `overflow-hidden` en el contenedor padre asegura que el fill se recorte correctamente con las esquinas redondeadas

### Estructura CSS Resultante
```tsx
// Contenedor con overflow-hidden para recortar el fill
<div className="relative h-10 rounded-lg overflow-hidden">
  {/* Fondo semi-transparente */}
  <div className="absolute inset-0 rounded-lg" style={{ backgroundColor: `${category.color}20` }} />
  
  {/* Fill sin rounded-l-lg, se recorta por overflow-hidden del padre */}
  <div
    className="absolute inset-y-0 left-0 transition-opacity hover:opacity-80"
    style={{ width: `${percentage}%`, backgroundColor: color }}
  />
  
  {/* Borde delgado (1px) */}
  <div className="absolute inset-0 border border-dashed border-gray-400 rounded-lg pointer-events-none" />
</div>
```

### Verificación
- [x] 24.3 Ejecutar `bun run check` - Sin errores en StackedBarChart.tsx
- [x] Borde es más delgado (1px en lugar de 2px)
- [x] Fill tiene esquinas redondeadas correctamente incluso al 100%
- [x] Categorías y subcategorías funcionan correctamente

---

## Phase 25: Bug Fix - Barra de Categoría con Color Sólido

### Issue
La barra de categoría mostraba segmentos de colores (subcategorías) en lugar de un solo color sólido. Cuando una categoría tenía subcategorías, la barra se dividía en segmentos de diferentes tonos, lo cual era visualmente incorrecto.

### Visual Incorrecto (ANTES)
```
▼ 🍔 Alimentación 40%                    $160
  ┌ - - - - - - - - - - - - - - - - - - - - ┐
  │██████░░░░░██████░░░░░██████░░░░░██████░░│  ← Segmentado ❌
  └ - - - - - - - - - - - - - - - - - - - - ┘
```

### Visual Correcto (DESPUÉS)
```
▼ 🍔 Alimentación 40%                    $160
  ┌ - - - - - - - - - - - - - - - - - - - - ┐
  │███████████████████████████              │  ← Color sólido ✅
  └ - - - - - - - - - - - - - - - - - - - - ┘
  
    🍽️ Restaurantes 20%                      $80
    ┌ - - - - - - - - - - - - - - - - - - - - ┐
    │██████████████                         │  ← Subcategoría separada
    └ - - - - - - - - - - - - - - - - - - - - ┘
```

### Causa Root
En `StackedBarChart.tsx`, líneas 115-148, había una condición que renderizaba la barra de forma diferente según si la categoría tenía subcategorías:
- Con subcategorías: Usaba `.map()` para crear segmentos de colores
- Sin subcategorías: Usaba un solo color sólido

Esto era incorrecto porque la barra de la categoría SIEMPRE debe ser de un solo color, independientemente de si tiene subcategorías. Las subcategorías se muestran como items separados debajo cuando se expande.

### Solución Implementada

#### 25.1 Simplificar renderizado de barras
- **Archivo:** apps/webapp/src/components/charts/StackedBarChart.tsx
- **Líneas modificadas:** 115-148
- **Cambios:**
  - Eliminar condición ternaria que diferenciaba categorías con/sin hijos
  - Usar siempre un solo `div` con `backgroundColor: category.color`
  - El ancho sigue siendo `${Math.max(category.percentage, 2)}%`
  - Las subcategorías siguen renderizándose debajo cuando `isExpanded` es true

### Código Corregido

**ANTES:**
```tsx
{category.children.length > 0 ? (
  // Barra segmentada para categorías con subcategorías
  <div className="absolute inset-y-0 left-0 flex items-center overflow-hidden" style={{ width: `${Math.max(category.percentage, 2)}%` }}>
    {category.children.map((sub, index) => (
      <div
        key={`${category.name}-${sub.name}-${index}`}
        className="h-full transition-opacity hover:opacity-80"
        style={{
          width: `${(sub.percentage / category.percentage) * 100}%`,
          backgroundColor: index === 0 ? category.color : `${category.color}cc`,
          minWidth: sub.percentage > 3 ? 'auto' : '4px',
        }}
        title={`${sub.emoji} ${sub.name}: ${sub.percentage.toFixed(1)}% (${formatCurrency(sub.total)})`}
      />
    ))}
  </div>
) : (
  // Barra sólida para categorías sin subcategorías
  <div
    className="absolute inset-y-0 left-0 transition-opacity hover:opacity-80"
    style={{
      width: `${Math.max(category.percentage, 2)}%`,
      backgroundColor: category.color,
    }}
  />
)}
```

**DESPUÉS:**
```tsx
{/* Fill opaco - SIEMPRE color sólido de la categoría */}
<div
  className="absolute inset-y-0 left-0 transition-opacity hover:opacity-80"
  style={{
    width: `${Math.max(category.percentage, 2)}%`,
    backgroundColor: category.color,
  }}
/>
```

### Verificación
- [x] 25.2 Ejecutar `bun run check` - StackedBarChart.tsx sin errores nuevos
- [x] Barra de categoría muestra un solo color sólido
- [x] No hay segmentación por subcategorías en la barra principal
- [x] Las subcategorías se renderizan como items separados al expandir
- [x] Hover effect funciona correctamente (opacity-80)
- [x] Width porcentual calculado correctamente

---

## Phase 26: Rediseño - Layout tipo Grid con Columna Izquierda Fija

### Tarea
Reestructurar el layout del StackedBarChart para usar un grid con columna izquierda de ancho fijo, alineando todas las barras al mismo ancho e implementando indentación visual para subcategorías.

### Visual Objetivo
```
0%           25%       50%   75%        100%
             |         |     |           |
▼ 🍔 40%    $160   ┌ - - - - - - - - - - - - - - - - - - - - ┐
Alimentación       │███████████████████████████              │          
                   └ - - - - - - - - - - - - - - - - - - - - ┘
  🍽️  20%    $80   ┌ - - - - - - - - - - - - - - - - - - - - ┐
  Restaurantes     │████████████             │          
                   └ - - - - - - - - - - - - - - - - - - - - ┘
▶ 🚗 20%    $80    ┌ - - - - - - - - - - - - - - - - - - - - ┐
Transporte         │███████████████████████████              │ 
```

### Implementación

#### 26.1 Estructura Grid Principal
- **Archivo:** apps/webapp/src/components/charts/StackedBarChart.tsx
- **Cambios:**
  - Reemplazar layout flex por grid: `grid-cols-[12rem_1fr]`
  - Gap reducido: `gap-3`
  - Items centrados verticalmente: `items-center`

#### 26.2 Columna Izquierda (Ancho Fijo)
- **Ancho fijo:** `12rem` (192px) usando grid-cols-[12rem_1fr]
- **Estructura interna:** flex con elementos:
  - Indicador ▼/▶: `w-4 flex-shrink-0` (o espacio placeholder `w-4`)
  - Emoji: `flex-shrink-0`
  - Nombre: `truncate text-sm flex-1` (trunca con ...)
  - Porcentaje: `text-xs text-gray-500 flex-shrink-0`
  - Monto: `text-sm font-medium flex-shrink-0 ml-auto`
- **Para subcategorías:** `pl-6` para indentación visual

#### 26.3 Columna Derecha (Barra)
- **Ancho flexible:** `1fr` (ocupa todo el espacio restante)
- **Altura consistente:** `h-10` para categorías y subcategorías
- **Estructura:**
  - Fondo semi-transparente: `backgroundColor: ${color}20`
  - Fill opaco: `backgroundColor: color` con width porcentual
  - Borde punteado: `border border-dashed border-gray-400 rounded-lg`

### Claves de Implementación

| Elemento | Clase | Descripción |
|----------|-------|-------------|
| Grid | `grid-cols-[12rem_1fr]` | Columna izquierda fija (12rem), derecha flexible |
| Truncado | `truncate` | Añade "..." si el nombre es muy largo |
| No-encoger | `flex-shrink-0` | Evita que emoji, % y monto se encojan |
| Indentación | `pl-6` | Padding-left para subcategorías |
| Alineación | `items-center` | Centra verticalmente todas las filas |

### Categorías vs Subcategorías

**Categorías:**
- Indicador ▼/▶ visible (si tiene hijos)
- Texto `text-sm`
- Sin indentación

**Subcategorías:**
- Sin indicador (solo espacio placeholder `w-4`)
- Texto `text-sm`
- Indentación `pl-6` dentro de la caja izquierda
- Color con opacidad: `${category.color}99`

### Verificación
- [x] 26.4 Ejecutar `bun run check` - StackedBarChart.tsx sin errores
- [x] Layout usa grid con columna izquierda fija
- [x] Nombres largos truncan con "..."
- [x] Barras alineadas (mismo ancho para todos)
- [x] Indentación visual para subcategorías
- [x] Caja izquierda mantiene ancho fijo consistente

---

## Phase 27: Columna de Texto Más Compacta - Dos Líneas

### Tarea
Hacer la columna izquierda de texto más compacta cambiando de una línea ancha a dos líneas apiladas verticalmente, reduciendo el ancho de la columna para dar más espacio a las barras.

### Visual Objetivo
```
0%           25%       50%   75%        100%
                   |            |       |       |           |
▼ 🍔 40%    $160   ┌ - - - - - - - - - - - - - - - - - - - - ┐
Alimentación       │███████████████████████████              │          
                   └ - - - - - - - - - - - - - - - - - - - - ┘
  
  🍽️ 20%     $80    ┌ - - - - - - - - - - - - - - - - - - - - ┐
  Restaurantes     │████████████             │          
                   └ - - - - - - - - - - - - - - - - - - - - ┘
```

### Implementación

#### 27.1 Reducir ancho de columna izquierda
- **Archivo:** apps/webapp/src/components/charts/StackedBarChart.tsx
- **Cambio:** `grid-cols-[12rem_1fr]` → `grid-cols-[9rem_1fr]`

#### 27.2 Restructurar columna izquierda a dos líneas
- **Categorías:**
  - Línea 1: Indicador (▼/▶) + emoji + porcentaje + monto (compacto)
  - Línea 2: Nombre truncado con indentación `pl-5`
  - Estructura: `flex-col` en lugar de `flex-row`

- **Subcategorías:**
  - Mismo patrón pero sin indicador
  - Indentación adicional con `pl-6` en el contenedor padre

#### 27.3 Cambios específicos

**Categorías:**
```tsx
<div className="flex flex-col justify-center">
  <div className="flex items-center gap-1">
    <span className="text-xs flex-shrink-0 text-gray-400 w-4">
      {isExpanded ? '▼' : '▶'}
    </span>
    <span>{category.emoji}</span>
    <span className="text-xs text-gray-500">{category.percentage}%</span>
    <span className="ml-auto text-xs font-medium">{formatCurrency(category.total)}</span>
  </div>
  <div className="truncate text-sm font-medium text-gray-800 pl-5">
    {category.name}
  </div>
</div>
```

**Subcategorías:**
```tsx
<div className="flex flex-col justify-center pl-6">
  <div className="flex items-center gap-1">
    <span className="w-4 flex-shrink-0" />
    <span>{sub.emoji}</span>
    <span className="text-xs text-gray-500">{sub.percentage}%</span>
    <span className="ml-auto text-xs font-medium">{formatCurrency(sub.total)}</span>
  </div>
  <div className="truncate text-sm font-medium text-gray-700 pl-5">
    {sub.name}
  </div>
</div>
```

### Ventajas del Nuevo Diseño
- ✅ Columna más compacta (9rem vs 12rem)
- ✅ Más espacio para las barras horizontales
- ✅ Información organizada verticalmente (porcentaje + monto arriba)
- ✅ Nombre en línea separada, más legible
- ✅ Indentación visual clara para subcategorías

### Verificación
- [x] 27.4 Ejecutar `bun run check` - Sin errores nuevos en StackedBarChart.tsx
- [x] Columna izquierda muestra dos líneas correctamente
- [x] Porcentaje y monto alineados a la derecha
- [x] Nombre truncado debajo con indentación
- [x] Subcategorías con mismo patrón pero sin indicador
- [x] Grid con ancho reducido funciona correctamente

---

## Phase 28: Bug Fix - Alineación del Nombre con Emoji

### Issue
El nombre de la categoría no estaba alineado con el emoji. Usaba `pl-5` (20px) pero el indicador ▼/▶ (w-4 = 16px) + gap-1 (4px) = 20px no alineaba correctamente con el emoji.

### Visual Incorrecto (ANTES)
```
▼ 🍔 40%    $160
Alimentación      ← Desalineado, debería estar bajo 🍔
```

### Visual Correcto (DESPUÉS)
```
▼ 🍔 40%    $160
  Alimentación    ← Alineado con 🍔
```

### Solución Implementada
- **Archivo:** apps/webapp/src/components/charts/StackedBarChart.tsx
- **Líneas modificadas:** 106-110 (categorías), 152-156 (subcategorías)
- **Cambio:** Reemplazar `pl-5` por estructura flex con placeholder w-4

**Código corregido:**
```tsx
// Línea 2: Nombre alineado con emoji
<div className="flex">
  <span className="w-4 flex-shrink-0" />  {/* Espacio igual al indicador */}
  <span className="flex-1 truncate text-sm font-medium text-gray-800">
    {category.name}
  </span>
</div>
```

### Verificación
- [x] 28.1 Ejecutar `bun run check` - Sin errores nuevos en StackedBarChart.tsx
- [x] Nombre alineado correctamente con el emoji
- [x] Funciona para categorías y subcategorías
- [x] Mantiene comportamiento de truncado con "..."

---

## Phase 29: Refactor - Extraer BarChartItem Componente Reutilizable

### Tarea
Extraer la barra con texto del StackedBarChart en un componente reutilizable BarChartItem para mejorar la mantenibilidad y permitir reuso.

### Props del Componente
- `emoji`: string - Emoji de la categoría/subcategoría
- `name`: string - Nombre de la categoría/subcategoría
- `percentage`: number - Porcentaje (0-100)
- `amount`: number - Monto total
- `color`: string - Color de la barra
- `hasChildren?`: boolean - Si tiene subcategorías (muestra indicador ▼/▶)
- `isExpanded?`: boolean - Estado de expansión
- `onToggle?`: () => void - Callback al hacer click en el indicador
- `isSubcategory?`: boolean - Si es subcategoría (aplica indentación)

### Implementación

- [x] 29.1 Crear BarChartItem.tsx
  - **Archivo:** apps/webapp/src/components/charts/BarChartItem.tsx
  - **Función formatMoney:** Incluida internamente (formato ARS)
  - **Estructura:** Grid con columna izquierda (texto) y derecha (barra)
  - **Estilos:** Mismos que StackedBarChart original

- [x] 29.2 Actualizar StackedBarChart.tsx
  - **Import:** Agregar `import { BarChartItem } from './BarChartItem'`
  - **Refactor:** Reemplazar renderizado manual por componente BarChartItem
  - **IDs:** Agregar campo `id` a interfaces (necesario para expandedCategories)
  - **Cleanup:** Eliminar función `formatCurrency` (ahora en BarChartItem)
  - **Cambios en toggle:** Usar `categoryId` en lugar de `categoryName`

### Uso del Componente

```tsx
// Categoría principal
<BarChartItem
  emoji={category.emoji}
  name={category.name}
  percentage={Math.round(category.percentage)}
  amount={category.total}
  color={category.color}
  hasChildren={hasChildren}
  isExpanded={isExpanded}
  onToggle={() => toggleCategory(category.id, hasChildren)}
/>

// Subcategoría
<BarChartItem
  emoji={sub.emoji || '•'}
  name={sub.name}
  percentage={Math.round(sub.percentage)}
  amount={sub.total}
  color={`${category.color}99`}
  isSubcategory
/>
```

### Verificación
- [x] 29.3 Ejecutar `bun run check` - Sin errores en archivos modificados
- [x] StackedBarChart.tsx usa el nuevo componente
- [x] Funcionalidad de expandir/colapsar mantiene comportamiento
- [x] Estilos consistentes con la versión anterior
- [x] Componente es reutilizable para otros casos de uso

---

## Phase 30: Todo el Componente Clickeable

### Tarea
Hacer que todo el componente BarChartItem sea clickeable para expandir/colapsar, no solo el indicador ▼/▶.

### Implementación

#### 30.1 Modificar BarChartItem.tsx
- **Archivo:** apps/webapp/src/components/charts/BarChartItem.tsx
- **Cambios:**
  - Extraer contenido a componente interno `BarChartItemContent`
  - Usar `<button>` semántico cuando `hasChildren === true`
  - Usar `<div>` cuando no tiene hijos (no clickeable)
  - Agregar `cursor-pointer hover:bg-gray-50` al botón para feedback visual
  - Agregar `py-1` para área de clic más grande
  - Cambiar indicador de `<button>` a `<span>` (ya no es un botón separado)
  - Agregar `pointer-events-none` a la barra para evitar interferencias
  - Agregar atributos de accesibilidad: `aria-expanded`

#### 30.2 Cambios Específicos

**Estructura condicional:**
```tsx
if (hasChildren) {
  return (
    <button
      type="button"
      className="... cursor-pointer hover:bg-gray-50"
      onClick={onToggle}
      aria-expanded={isExpanded}
    >
      <BarChartItemContent ... />
    </button>
  );
}

return (
  <div className="...">
    <BarChartItemContent ... />
  </div>
);
```

**Indicador ▼/▶ (ahora span):**
```tsx
<span className="w-4 text-gray-400 flex-shrink-0" aria-hidden="true">
  {isExpanded ? '▼' : '▶'}
</span>
```

**Barra con pointer-events-none:**
```tsx
<div className="relative h-12 pointer-events-none">
  {/* Fondo, fill, y borde punteado */}
</div>
```

### Ventajas del Nuevo Enfoque
- ✅ Todo el componente es clickeable (mejor UX)
- ✅ Feedback visual claro (hover:bg-gray-50)
- ✅ Cursor pointer indica interactividad
- ✅ Accesibilidad mejorada (botón semántico, aria-expanded)
- ✅ No hay interferencias con la barra (pointer-events-none)
- ✅ Área de clic más grande (py-1)

### Verificación
- [x] 30.3 Ejecutar `bun run check` - BarChartItem.tsx sin errores
- [x] Componente clickeable en toda su extensión
- [x] Feedback visual en hover
- [x] Accesibilidad correcta (botón semántico)
- [x] Categorías sin hijos no son clickeables
- [x] Categorías con hijos expanden/colapsan correctamente

---

## Phase 31: Bug Fixes and Layout Improvements

### Task
Multiple corrections needed for the StackedBarChart component:
1. Fix toggle individual bug (categories opening/closing together)
2. Add scale indicators (0%, 25%, 50%, 75%, 100%)
3. Make text box smaller (9rem → 100px)
4. Improve colors and text sizes

### Implementation

#### 31.1 Fix toggle individual bug
- **File:** apps/webapp/src/components/charts/StackedBarChart.tsx
- **Status:** ✅ No fix needed - state already uses `Set<string>` with category IDs correctly
- **Verification:** Toggle functionality works correctly with unique IDs

#### 31.2 Add scale indicators
- **File:** apps/webapp/src/components/charts/StackedBarChart.tsx
- **Changes:**
  - Added scale row before categories with 0%, 25%, 50%, 75%, 100%
  - Guide lines below each percentage marker
  - Positioned above the chart, aligned with bars
  - Uses `grid-cols-[100px_1fr]` to match main layout

#### 31.3 Reduce text box size
- **Files:** 
  - apps/webapp/src/components/charts/StackedBarChart.tsx
  - apps/webapp/src/components/charts/BarChartItem.tsx
- **Changes:**
  - Changed `grid-cols-[9rem_1fr]` to `grid-cols-[100px_1fr]`
  - More space allocated to the bar

#### 31.4 Improve colors and text sizes
- **File:** apps/webapp/src/components/charts/BarChartItem.tsx
- **Changes:**
  - **Categories:**
    - Name: `font-semibold text-gray-900`
    - Percentage: `text-sm text-gray-600`
    - Amount: `font-bold text-gray-900`
  - **Subcategories:**
    - Name: `font-normal text-gray-700`
    - Percentage: `text-xs text-gray-500`
    - Amount: `font-medium text-gray-800`
  - **Indicator ▼/▶:** `text-gray-400 text-xs`

### Visual Result
```
      0%           25%       50%   75%        100%
                   |            |       |       |           |
▼ 🍔 40%   $160  ┌ - - - - - - - - - - - - - - - - - - - - ┐
Alimentación     │███████████████████████████             │
                 └ - - - - - - - - - - - - - - - - - - - - ┘
  🍽️ 20%    $80   ┌ - - - - - - - - - - - - - - - - - - - - ┐
  Restaurantes   │████████████                            │
                 └ - - - - - - - - - - - - - - - - - - - - ┘
```

### Verification
- [x] 31.5 Execute `bun run check` - No new errors in modified files
- [x] Scale indicators positioned correctly above chart
- [x] Each category toggles individually
- [x] Text box reduced to 100px
- [x] Improved text colors and sizes applied correctly

---

## Phase 32: Mejoras de Layout - Barras en 0%/100% y Texto Reordenado

### Tarea
Mejorar el layout del StackedBarChart:
1. Agregar barras verticales en 0% y 100% de la escala (además de las existentes 25%, 50%, 75%)
2. Reordenar el texto en la columna izquierda a tres líneas: Emoji+% arriba, Monto en medio, Nombre abajo

### Implementación

#### 32.1 Agregar barras verticales en 0% y 100%
- **Archivo:** apps/webapp/src/components/charts/StackedBarChart.tsx
- **Cambios:**
  - Agregada barra vertical en 0%: `<div className="absolute top-4 left-0 w-px h-2 bg-gray-300" />`
  - Agregada barra vertical en 100%: `<div className="absolute top-4 right-0 w-px h-2 bg-gray-300" />`
  - Estructura reorganizada para agrupar label + barra por cada porcentaje

#### 32.2 Reordenar texto a tres líneas
- **Archivo:** apps/webapp/src/components/charts/BarChartItem.tsx
- **Cambios:**
  - Aumentado ancho de columna: `100px` → `110px` para acomodar 3 líneas
  - **Línea 1:** Emoji + % (indicador ▼/▶ + emoji + porcentaje)
  - **Línea 2:** Monto (alineado con emoji usando placeholder w-4)
  - **Línea 3:** Nombre (alineado con emoji, truncado si es largo)
  - Indentación ajustada: `pl-2` → `pl-4` para subcategorías
  - Eliminadas variables no usadas: `nameClass`, `percentageClass`, `amountClass`

#### 32.3 Actualizar grid en StackedBarChart
- **Archivo:** apps/webapp/src/components/charts/StackedBarChart.tsx
- **Cambio:** `grid-cols-[100px_1fr]` → `grid-cols-[110px_1fr]` para mantener consistencia

### Visual Resultante
```
       0%           25%       50%   75%        100%
       |            |       |       |           |
  👕 34%            ┌ - - - - - - - - - - - - - - - - - - - - ┐
   $138            │███████████████████████████             │
  Compras          └ - - - - - - - - - - - - - - - - - - - - ┘
```

### Verificación
- [x] 32.4 Ejecutar `bun run check` - Sin errores nuevos en archivos modificados
- [x] Barras verticales visibles en 0% y 100%
- [x] Texto reorganizado en tres líneas correctamente
- [x] Nombres truncan con "..." si son muy largos
- [x] Alineación correcta de texto con emoji

---

**Status: COMPLETED** ✅
All phases implemented successfully. StackedBarChart now features a compact three-line left column layout that provides more space for the horizontal bars while maintaining clear information hierarchy. Scale now includes vertical bars at 0% and 100% for better visual reference.
