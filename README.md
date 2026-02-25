# Maimoni - AI-Powered Financial Management

Maimoni es una aplicación de gestión financiera personal con escaneo de recibos impulsado por IA y autenticación vía WhatsApp.

## Stack Tecnológico

- **Runtime**: [Bun](https://bun.com) v1.3.9+
- **Frontend**: TanStack Start (React + SSR)
- **Backend**: Hono API (local) / AWS Lambda (con SST)
- **Auth**: OpenAuth con Twilio (WhatsApp/SMS)
- **Base de datos**: PostgreSQL (Neon) + Drizzle ORM
- **AI**: LlamaIndex + Groq (extracción de recibos)
- **Infraestructura**: SST Ion (v3) - **opcional para desarrollo**

## Requisitos Previos

- [Bun](https://bun.com) instalado
- Cuenta en [Neon](https://neon.tech) (base de datos PostgreSQL)
- (Opcional) Cuenta en [Groq](https://console.groq.com) - para escaneo de recibos
- (Opcional) Cuenta en [Twilio](https://console.twilio.com) - para auth vía WhatsApp/SMS
- (Opcional) Cuenta AWS - solo si quieres usar SST para deploy/infra

## Instalación Rápida

### 1. Clonar e instalar dependencias

```bash
git clone <repo-url>
cd maimoni-app
bun install
```

### 2. Configurar variables de entorno

```bash
cp .env.example .env
```

Edita `.env` con tus valores:

**Variables obligatorias (app no arranca sin estas):**

```env
# Base de datos - SOLO soporta Neon PostgreSQL
DATABASE_URL='postgresql://user:password@host-pooler.neon.tech/neondb?sslmode=require'

# Las demás pueden usar los valores de ejemplo para desarrollo básico
AUTH_STORAGE=`{"type":"memory","options":{"persist": "./persist.json"}}`
AUTH_URL='http://localhost:3002/auth'
API_URL='http://localhost:3001/api'
```

**Variables para SST (solo si usas modo SST):**

```env
# Stage para SST - usa 'dev-tunombre' para desarrollo local
# Opciones: dev-tunombre, staging, production
STAGE='dev-juan'

# Credenciales AWS (requerido para SST)
AWS_ACCESS_KEY_ID='tu_access_key'
AWS_SECRET_ACCESS_KEY='tu_secret_key'
AWS_REGION='us-east-1'  # opcional, default: us-east-1
```

**Variables opcionales (para features específicas):**

```env
# AI - Requerido para escanear recibos
GROQ_API_KEY='tu_groq_api_key'
LLAMA_CLOUD_API_KEY='tu_llama_cloud_api_key'

# Twilio - Requerido para autenticación vía WhatsApp/SMS
TWILIO_ACCOUNT_SID='tu_account_sid'
TWILIO_AUTH_TOKEN='tu_auth_token'
TWILIO_WHATSAPP_NUMBER='whatsapp:+1234567890'
TWILIO_PHONE_NUMBER='+1234567890'
```

> **Nota**: Puedes dejar las variables opcionales con valores fake (`fake_groq_key`, etc.) y la app funcionará, pero:
> - Escaneo de recibos fallará sin las AI keys
> - Autenticación vía WhatsApp/SMS fallará sin credenciales de Twilio

### 3. Configurar base de datos

```bash
# Generar migraciones
bun env --filter='@maimoni/db' db:generate

# Aplicar migraciones
bun env --filter='@maimoni/db' db:migrate
```

> **Importante**: Usamos `bun env` para cargar las variables de entorno desde `.env` antes de ejecutar cualquier comando.

### 4. Ejecutar en local

Tenemos **dos modos** de ejecutar la aplicación en desarrollo:

#### Opción A: Modo Básico (Sin AWS) - Recomendado para empezar

Este modo ejecuta el webapp localmente usando Bun sin necesidad de AWS ni SST.

```bash
# Ejecutar solo el webapp (puerto 3000)
bun env dev
```

**Notas del modo básico:**
- No requiere cuenta de AWS
- El API y Auth deben estar disponibles (puedes usarlos de staging o configurarlos por separado)
- Útil para desarrollo frontend rápido
- URL: http://localhost:3000

#### Opción B: Modo SST (Con AWS)

Este modo levanta toda la infraestructura usando SST Ion, incluyendo Lambda para API/Auth.

**Requisitos previos:**
```bash
# Configurar credenciales de AWS en .env
AWS_ACCESS_KEY_ID='tu_access_key'
AWS_SECRET_ACCESS_KEY='tu_secret_key'
AWS_REGION='us-east-1'  # opcional, default: us-east-1
```

**Ejecutar:**
```bash
# Inicia todos los servicios con SST (carga .env automáticamente)
bun env sst dev
```

> **Nota**: Siempre usa `bun env` antes de comandos SST o de base de datos para cargar las variables de entorno desde `.env`.

**Servicios disponibles:**
- **Webapp**: http://localhost:3000
- **API**: http://localhost:3001/api
- **Auth**: http://localhost:3002/auth

## Estructura del Proyecto

```
.
├── apps/
│   ├── api/          # Hono API - endpoints REST
│   ├── auth/         # Servicio OpenAuth (WhatsApp/Twilio)
│   └── webapp/       # Frontend TanStack Start
├── infra/            # Configuración SST Ion (opcional)
├── packages/
│   ├── core/         # Lógica de negocio DDD
│   ├── ai/           # Integración LlamaIndex + Groq
│   ├── auth/         # Cliente OpenAuth compartido
│   ├── db/           # Schema Drizzle + cliente DB
│   └── utils/        # Utilidades compartidas
└── sst.config.ts     # Configuración SST (opcional)
```

## Comandos Útiles

### Desarrollo

```bash
# Modo básico - solo webapp (sin AWS)
bun env dev

# Modo SST - toda la infraestructura (requiere AWS)
bun env sst dev

# Lint y format (Biome)
bun run check        # Lint + format + auto-fix
bun run lint         # Solo verificar
bun run format       # Solo formatear
```

### Base de datos

```bash
# Generar migraciones desde schema
bun env --filter='@maimoni/db' db:generate

# Aplicar migraciones
bun env --filter='@maimoni/db' db:migrate

# Push directo (para desarrollo rápido)
bun env --filter='@maimoni/db' db:push

# Drizzle Studio (UI para la DB)
bun env --filter='@maimoni/db' db:studio
```

### Testing

```bash
# Todos los tests
bun run test:all

# Tests específicos
bun test src/middleware/auth.test.ts
bun test --cwd apps/api src/routes/boards.test.ts

# E2E con Playwright
bun run --cwd apps/webapp test:e2e
```

### Despliegue (requiere AWS)

```bash
# Desplegar a staging
bun env sst deploy --stage staging

# Desplegar a producción
bun env sst deploy --stage production
```

> **Nota**: Asegúrate de tener `STAGE` configurado en tu `.env` o pásalo explícitamente con `--stage`. El stage determina el entorno (dev-tunombre, staging, production).

## Comparación de Modos

| Característica | Modo Básico (`bun env dev`) | Modo SST (`sst dev`) |
|----------------|----------------------------|---------------------|
| Requiere AWS | ❌ No | ✅ Sí |
| Webapp | ✅ Local | ✅ Local |
| API | ⚠️ Externo/staging | ✅ Local (Lambda) |
| Auth | ⚠️ Externo/staging | ✅ Local (Lambda) |
| Infraestructura | ❌ Ninguna | ✅ Completa |
| Deploy | ❌ No disponible | ✅ Sí |
| Ideal para | Frontend dev | Full-stack / Deploy |

## Setup Mínimo vs Completo

### Setup Mínimo (pruebas básicas)

Requisitos:
1. `DATABASE_URL` real de Neon
2. Ejecutar: `bun env dev` (modo básico)
3. Las variables de AI y Twilio pueden ser fake

### Setup Completo (todas las features + deploy)

Requisitos:
- Todas las variables en `.env` con valores reales:
  - Neon (DB)
  - Groq (AI)
  - LlamaCloud (AI)
  - Twilio (WhatsApp/SMS)
  - AWS credentials (para SST)
  - `STAGE='dev-tunombre'`
- Ejecutar: `bun env sst dev`

## Troubleshooting

### Error: `DATABASE_URL is required`
- Asegúrate de tener el archivo `.env` creado
- Verifica que `DATABASE_URL` tenga una conexión válida de Neon

### Error de conexión a la base de datos
- Neon requiere `sslmode=require` en la URL
- Verifica que la base de datos exista y las credenciales sean correctas

### Escaneo de recibos no funciona
- Revisa que `GROQ_API_KEY` y `LLAMA_CLOUD_API_KEY` tengan valores reales
- Sin estas keys, el servicio de AI no puede procesar recibos

### Autenticación vía WhatsApp falla
- Revisa las credenciales de Twilio (`TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`)
- Verifica que los números de teléfono estén en formato correcto
- El número de WhatsApp debe incluir prefijo `whatsapp:`

### Error de credenciales AWS (SST)
- Si usas `bun env sst dev` y ves errores de AWS, verifica:
  - Tienes `AWS_ACCESS_KEY_ID` y `AWS_SECRET_ACCESS_KEY` en `.env`
  - Tienes configurado `STAGE` en `.env` (ej: `STAGE='dev-juan'`)
  - Las credenciales tienen permisos suficientes
  - Puedes usar `aws configure` como alternativa a las variables de entorno

### Error: Variables de entorno no cargadas
- Si ves errores como "DATABASE_URL is required" aunque esté en `.env`:
  - Asegúrate de usar `bun env` antes del comando
  - Ejemplo: `bun env sst dev` en lugar de solo `sst dev`
  - Para DB: `bun env --filter='@maimoni/db' db:migrate`

## Cómo Contribuir

¡Las contribuciones son bienvenidas! Si quieres mejorar Maimoni, sigue estos pasos:

### 1. Preparar el entorno

```bash
# Clona el repositorio
git clone https://github.com/tu-usuario/maimoni-app.git
cd maimoni-app

# Instalar dependencias
bun install

# Configurar variables de entorno
cp .env.example .env
# Edita .env con tu DATABASE_URL de Neon

# Configurar base de datos
bun env --filter='@maimoni/db' db:migrate
```

### 2. Crear una rama

```bash
# Crea una rama para tu feature/fix
git checkout -b feature/nombre-de-tu-feature
# o
git checkout -b fix/descripcion-del-bug
```

### 3. Desarrollar

- Asegúrate de pasar los checks de lint: `bun run check`
- Ejecuta tests antes de commitear: `bun run test:all`
- Sigue la estructura DDD del proyecto (domain/application/infra)
- Documenta cualquier cambio en la API o comportamiento

### 4. Commit y Push

```bash
# Commit con mensaje descriptivo
git commit -m "feat: add receipt scanning for PDF files"

# Push tu rama al repositorio
git push origin feature/nombre-de-tu-feature
```

### 5. Crear Pull Request

1. Ve al repositorio en GitHub
2. Clic en "New Pull Request"
3. Selecciona tu rama (compare) contra main (base)
4. Describe los cambios e incluye screenshots si hay cambios visuales
5. Crea el PR y espera revisión

### Guías de contribución

- ✅ Usa [Conventional Commits](https://www.conventionalcommits.org/) para mensajes
- ✅ Asegúrate de que los tests pasen
- ✅ Actualiza el README si es necesario
- ✅ Una feature por PR
- ❌ No incluyas cambios de formato junto con lógica

### Reportar bugs

Si encuentras un bug, por favor crea un issue con:
- Descripción clara del problema
- Pasos para reproducirlo
- Comportamiento esperado vs actual
- Screenshots/logs si aplica

### Licencia

Al contribuir, aceptas que tu código se licencie bajo MIT License.

## Licencia

Este proyecto está licenciado bajo la [MIT License](./LICENSE).

MIT es una licencia permisiva de código abierto que:
- ✅ Permite uso comercial
- ✅ Permite modificación y distribución
- ✅ Permite uso privado
- ✅ **Requiere atribución** - Siempre debe mantenerse el copyright y la nota de licencia

Al usar este código, debes incluir el archivo `LICENSE` original con el copyright de los contribuyentes.
