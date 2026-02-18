## 💰 maimonei

**App simple para seguimiento de ingresos y gastos personales o compartidos.**

### 🎯 Objetivo

Dar claridad financiera rápida mediante:

* registro fácil,
* categorización precisa,
* resúmenes claros,
* control de gasto según ingresos.

---

## 🧩 Principios del producto

✅ Registro extremadamente rápido
✅ Categorías claras (la clave del valor)
✅ Visión clara del dinero disponible
✅ Funciona para uso personal o en pareja
✅ Sin fricción ni funciones innecesarias

---

## ✍️ Registro de gastos/ingresos

### Campos mínimos

* monto
* tipo: gasto / ingreso
* categoría
* subcategoría (opcional)
* fecha
* quién lo registró
* etiquetas (opcional)
* nota (opcional)
* foto del recibo (opcional)

---

## 🧾 Categorías con emoji

### 🍔 Alimentación

* 🛒 Supermercados
* 🍽️ Restaurantes
* ☕ Cafeterías/Snacks
* 🛵 Delivery
* 🍟 Comida rápida
* 🍺 Bebidas/Alcohol

### 🚗 Transporte

* ⛽ Gasolina
* 🔧 Mantenimiento
* 🚕 Uber/Didi
* 🚌 Transporte público
* 🛣️ Peajes
* 🅿️ Estacionamiento

### 🏠 Vivienda & Servicios

* 🏡 Alquiler/Hipoteca
* 💡 Luz
* 🚿 Agua
* 🔥 Gas
* 🌐 Internet/Telefonía
* 🛠️ Mantenimiento
* 🛡️ Seguridad/Admin
* 🪑 Muebles/Jardín

### 🏥 Salud & Bienestar

* 💊 Farmacia
* 🩺 Consultas médicas
* 🦷 Dentista
* 🏋️ Gim./Deportes
* ✂️ Cuidado personal
* ❤️ Seguro salud
* 👓 Óptica

### 🎬 Entretenimiento

* 🎟️ Cine/Eventos
* 📺 Streaming
* 🍹 Bares/Discotecas
* 🎮 Hobbies/Juegos
* 💳 Suscripciones

### 🛍️ Compras & Shopping

* 👕 Ropa/Calzado
* 📱 Electrónica
* 👜 Accesorios
* 🎁 Regalos
* 🐶 Mascotas
* 🏬 Tiendas
* 📦 Compras online

### 🎓 Educación

* 📚 Cursos
* 🏫 Colegiaturas
* 📖 Libros
* ✏️ Papelería
* 💻 Software educativo

### ✈️ Viajes

* 🎫 Boletos
* 🏨 Hospedaje
* 🚙 Alq. autos
* 🧳 Gastos viaje

### 💳 Financiero & Legal

* 💳 Pago tarjeta
* 🏦 Comisiones
* 📉 Intereses
* 🧾 Impuestos
* 🛡️ Seguros
* 🏧 Cajero

### 💰 Ingresos

* 💼 Sueldo
* 🔁 Transferencias
* 💸 Reembolsos
* 📈 Intereses
* 🛒 Ventas

### 📦 Otros

---

## 🏷️ Etiquetas (tags)

Permiten agrupar gastos.

Ejemplos:

* necesario
* gustos
* inversión
* hogar
* trabajo
* viaje

---

## 📊 Resúmenes automáticos

* semanal
* mensual
* anual

### Insights clave:

* gasto total
* gasto por categoría
* balance (ingresos − gastos)

---

## 🚦 Límite de gasto inteligente

El usuario define:

👉 % máximo del ingreso mensual para gastar

Ejemplo:

* ingreso mensual: $1000
* límite: 70%
* gasto máximo recomendado: $700

---

## 👥 Uso compartido

* un tablero puede tener varios usuarios
* cada gasto muestra quién lo registró

---

## 📱 Fase 1 (MVP)

### ✔ Lista de movimientos

* cronológica
* ícono + categoría
* monto
* usuario
* fecha

### ✔ Añadir gasto rápido

**Opciones:**

1. formulario rápido
2. subir foto → IA rellena campos sugeridos

---

## ⚙️ Stack tecnológico

**Frontend**

* React + TanStack (SPA)
* Tailwind
* Mobile-first

**Backend**

* Hono
* Bun runtime

**Infraestructura**

* Neon (Postgres)
* Drizzle ORM

**IA**

* Groq (extracción desde fotos)

Autenticación

OpenAuth (login sin fricción)

WhatsApp login vía Twilio API
→ envío de código OTP
→ verificación rápida
→ ideal para uso compartido en pareja/familia

---
