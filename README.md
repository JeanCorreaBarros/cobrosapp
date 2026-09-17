# Software de Cobro

App web completa para gestionar clientes, préstamos, cobros, mora, agenda de cobranza,
reportes de cartera/rentabilidad y configuración. Next.js 15 + Node 22 + PostgreSQL, todo en Docker.
Moneda: pesos colombianos (COP).

## Levantar el proyecto (desarrollo)

```bash
docker compose up --build
```

Abre http://localhost:3000

El primer arranque crea las tablas, el usuario administrador y las zonas base automáticamente.

**Credenciales iniciales:** `admin` / `admin123` — cámbialas en `.env` antes del primer arranque.

## Levantar en producción

```bash
cp .env.example .env   # y cambia AUTH_SECRET, contraseñas y ADMIN_PASSWORD
docker compose -f docker-compose.prod.yml up --build -d
```

Esto compila la app (`next build`, imagen `standalone`) en vez de correr el servidor de
desarrollo. Un servicio `migrate` aplica el esquema y siembra el admin antes de arrancar `web`.

Para HTTPS con dominio propio, pon un proxy delante (ver [Caddyfile.example](Caddyfile.example)
para un ejemplo con Caddy y certificado automático de Let's Encrypt).

## Comandos útiles

| Comando | Qué hace |
|---|---|
| `docker compose up` | Levanta app y base de datos (desarrollo) |
| `docker compose down` | Detiene todo (conserva los datos) |
| `docker compose down -v` | Detiene y **borra la base de datos** |
| `docker compose logs -f web` | Ver logs de la app |
| `docker compose exec web npx prisma studio` | Explorador visual de la base de datos |
| `docker compose exec db pg_dump -U cobro cobro > respaldo.sql` | Respaldo SQL completo |

La base de datos queda expuesta en el puerto `5433` del host para conectarte con pgAdmin o DBeaver.

> Si editas archivos y la app no refleja el cambio, es un problema conocido de recompilación
> en caliente de Next en este entorno: `docker compose restart web` lo soluciona siempre.

## Pestañas de trabajo

El área principal funciona como un navegador: puedes tener varias secciones abiertas a la vez
(por ejemplo Clientes, un préstamo concreto y Cobros) y saltar entre ellas sin perder el estado.

- Cada vista abierta se mantiene montada, así que filtros, scroll y formularios a medio llenar se conservan
- Arrastra las pestañas para reordenarlas
- Clic derecho sobre una pestaña: cerrar, cerrar las demás, cerrar todas
- Dashboard queda fijada y no se puede cerrar
- Máximo 10 pestañas; al superarlo se cierra la más antigua
- Las pestañas abiertas se recuerdan entre sesiones
- Cada pestaña tiene su propia URL, así que puedes compartir el enlace directo

Para añadir una sección nueva: regístrala en `src/lib/registro-vistas.ts` y mapea su
componente en `src/components/pestanas/AreaTrabajo.tsx`.

## Préstamos e interés

Cada préstamo elige su propio método de interés al crearse (no es una decisión global):

- **Interés simple**: el interés se calcula una sola vez sobre el capital y se reparte en
  cuotas iguales. Ej. $10.000 al 10% en 10 cuotas → $1.100,00 cada cuota.
- **Interés sobre saldo**: amortización francesa. La tasa se aplica cada período sobre el
  saldo pendiente; la cuota es fija pero la proporción capital/interés cambia con cada pago.

El valor por defecto se define en Configuración y el formulario de nuevo préstamo muestra una
vista previa en vivo del total a pagar y la cuota antes de guardar. La lógica vive en
`src/lib/amortizacion.ts`, sin dependencias de servidor, así que se reutiliza igual en la
vista previa del formulario que en la API.

**Interés en % o en $ fijo**: con interés simple, puedes escribir la tasa como porcentaje o,
alternando a "Definir en $ fijo", escribir directamente el interés total en pesos (ej. "$1.000
de interés" en vez de "10%"). Internamente se convierte a la tasa equivalente antes de calcular
el cronograma — mismo motor, no es un método nuevo. Con interés sobre saldo esta opción no
aplica (la tasa se aplica período a período, no como monto total de una vez) y el formulario
vuelve a modo porcentaje automáticamente si cambias de método.

**Plantillas de préstamo**: en Configuración → Plantillas, un ADMIN puede guardar combinaciones
frecuentes (monto, tasa, método, frecuencia, cuotas) con un nombre. Al crear un préstamo nuevo,
el selector "Usar una plantilla" las prellena — pero siguen siendo editables antes de guardar,
así que la creación del préstamo se mantiene dinámica.

## Cobros y mora

- Un pago se aplica automáticamente a las cuotas pendientes empezando por la más antigua, en
  orden **mora → interés → capital** (lógica en `src/lib/pagos.ts`).
- **La mora es un porcentaje único** sobre el saldo pendiente de la cuota, aplicado una sola vez
  cuando se vence (no se acumula día tras día). Es la simplificación más común en cobranza
  informal; si necesitas mora compuesta por día, es un cambio acotado en `calcularMoraCuota`.
- Cada pago genera un recibo en `/imprimir/recibo/[id]`: una página imprimible (botón
  "Imprimir / Guardar PDF" usa el diálogo de impresión del navegador) en vez de un generador de
  PDF nativo — evita dependencias binarias frágiles dentro de Docker y funciona igual de bien.
- Anular un pago revierte el saldo de las cuotas afectadas y pide un motivo (queda en auditoría).
  Un cobrador solo puede anular sus propios pagos del mismo día; un admin puede anular cualquiera.

## Reportes

- **Cartera y mora**: aging de la cartera activa en 5 rangos (al día, 1-30, 31-60, 61-90, 90+).
- **Rentabilidad por cliente**: capital prestado vs. interés+mora cobrado, con ranking.
- Ambos se exportan a **CSV** (se abre directo en Excel/Sheets) en vez de generar un `.xlsx`
  binario — mismo resultado práctico, sin librerías pesadas adicionales.

## Agenda y recordatorios

- Lista de cuotas pendientes filtrable por rango (hoy/atrasadas, 7 días, solo atrasadas) y zona.
- Botón de WhatsApp por cliente: abre `wa.me` con un mensaje de recordatorio precargado, usando
  la sesión de WhatsApp del propio cobrador — sin contratar una API de WhatsApp Business.

## Configuración

- Datos de empresa, moneda, tasa/frecuencia/mora por defecto (pestaña "Empresa y préstamos")
- Gestión de usuarios (crear, cambiar rol/zona/contraseña, activar/desactivar) — solo ADMIN
- Gestión de zonas de cobro
- **Auditoría**: todo lo que pasa en la app queda registrado — quién creó/editó/eliminó/anuló
  qué y cuándo, inicios y cierres de sesión, respaldos descargados y restaurados. Filtrable por
  entidad y búsqueda libre, con el detalle completo de cada acción (`src/app/api/auditoria`).
- **Respaldo / restauración**:
  - *Exportar*: descarga un JSON con todas las tablas (clientes, préstamos, cuotas, pagos,
    usuarios, zonas, configuración). Incluye las contraseñas ya cifradas — sin eso, al
    restaurar nadie podría volver a entrar — así que ese archivo debe guardarse con el mismo
    cuidado que la clave de un banco.
  - *Importar*: pensado exactamente para "instalé la app de nuevo y quiero recuperar todo como
    estaba". Sube el archivo, confirma que entiendes que **reemplaza todos los datos actuales**
    (no es aditivo, es una restauración completa), y la app te desconecta al terminar para que
    entres con las credenciales del respaldo. Probado de punta a punta: exportar con datos
    reales → importar → los montos, fechas y relaciones quedan idénticos.
  - Alternativa para un respaldo binario exacto de PostgreSQL: `pg_dump` (comando exacto en la
    pestaña Respaldo). Ese no lo puede restaurar la app — es para restaurar con `psql` o
    `pg_restore` directamente contra la base.

## PWA

- Instalable en el celular (`manifest.json` + service worker mínimo en `public/sw.js`)
- El service worker **solo cachea el ícono y el manifest** — nunca los datos ni la API, para
  que un cobrador nunca vea saldos o cuotas desactualizados por un caché viejo
- El ícono es un SVG (`public/icon.svg`); si más adelante quieres un logo propio en PNG,
  reemplázalo y actualiza las rutas en `public/manifest.json`

## Estructura

```
prisma/schema.prisma          Modelo de datos completo
prisma/seed.ts                 Admin, configuración y zonas base
src/app/login                  Pantalla de acceso
src/app/(app)                  Área protegida (sidebar + páginas + pestañas)
src/app/imprimir/recibo/[id]    Recibo de pago imprimible (fuera del shell de pestañas)
src/app/api/auth                Login y logout
src/app/api/clientes            CRUD de clientes
src/app/api/prestamos            CRUD de préstamos y cronograma
src/app/api/pagos                Registrar y anular pagos
src/app/api/agenda               Cuotas pendientes para la agenda
src/app/api/reportes             Cartera/mora y rentabilidad (+ export CSV)
src/app/api/dashboard             Agregados para el panel principal
src/app/api/configuracion         Configuración general
src/app/api/usuarios              Gestión de usuarios (ADMIN)
src/app/api/zonas                 Zonas de cobro
src/app/api/respaldo              Export JSON de respaldo
src/lib/auth.ts                 Sesión JWT en cookie httpOnly
src/lib/amortizacion.ts          Cálculo de interés simple y sobre saldo
src/lib/pagos.ts                 Aplicación de pagos y cálculo de mora
src/lib/whatsapp.ts              Enlaces wa.me para recordatorios
src/components/pestanas         Sistema de pestañas (contexto, barra, área de trabajo)
src/vistas                      Contenido de cada sección
src/components/ui               Primitivas de UI
middleware.ts                   Protección de rutas
Dockerfile / docker-compose.yml         Desarrollo
Dockerfile.prod / docker-compose.prod.yml  Producción (build optimizado)
```

## Estado por fases

- [x] Fase 0 — Docker, Next.js, Prisma, sistema de diseño
- [x] Fase 1 — Login, roles, rutas protegidas, shell responsive con pestañas
- [x] Fase 2 — Clientes: alta, búsqueda, filtros, ficha, referencias, baja
- [x] Fase 3 — Préstamos: interés simple y sobre saldo, tabla de amortización, cancelación
- [x] Fase 4 — Cobros: pagos, mora automática, recibo imprimible, anulación, caja del día
- [x] Fase 5 — Agenda: cobros de hoy/semana/atrasadas por zona, recordatorio por WhatsApp
- [x] Fase 6 — Reportes: aging de cartera y rentabilidad por cliente, export CSV
- [x] Fase 7 — Dashboard con datos reales (por cobrar, cobrado, en mora, ganancia del mes)
- [x] Fase 8 — Configuración: empresa, valores por defecto, usuarios, zonas, auditoría, respaldo con importar/exportar
- [x] Fase 9 — PWA instalable, recordatorios por WhatsApp, Docker de producción

**Todas las fases están completas.** Lo que sigue siendo trabajo manual/operativo (no de
software): cargar tu logo real, ajustar textos legales de los recibos si tu país lo exige, y
decidir si quieres migrar de mora plana a mora compuesta por día.

## Seguridad

- Contraseñas con bcrypt (10 rondas)
- Sesión JWT firmada en cookie `httpOnly`, 8 horas
- Bloqueo de cuenta por 15 minutos tras 5 intentos fallidos
- Bitácora de auditoría de accesos, pagos, anulaciones y cambios de configuración
- Cambia `AUTH_SECRET` y las contraseñas en `.env` antes de usar en producción
