# Renace

Iniciativa humanitaria y gratuita para sobrevivientes del terremoto del 10 de
agosto de 2026 en Colombia (M 7,4, epicentro en San José del Palmar, Chocó)
que quedaron sin vivienda.

## Qué hace

- **Landing** con el plan por fases del proyecto.
- **Estimador de daños con IA** (`/estimar`): un formulario describe la
  vivienda y los daños; Claude genera un rango preliminar del costo de
  reparación o reconstrucción en COP. Es la versión web de la Fase 1, cuyo
  objetivo final es un bot de WhatsApp que reciba fotos de los daños.
- **Modo reconstrucción** (`/reconstruccion`): la persona se registra con su
  correo y recibe por email (Resend) un enlace de votación.
- **Votación** (`/votar`): cada correo registrado vota una sola vez por el día
  hábil de la reunión con el equipo de ingenieros voluntarios. El día más
  votado queda agendado.

Las fases 2 (certificación de estimaciones por ingenieros civiles, que además
entrena el modelo) y el bot de WhatsApp están en preparación.

## Stack

- [Astro](https://astro.build) sin frameworks de UI, desplegable en Vercel
  (`@astrojs/vercel`).
- [Turso (libSQL)](https://turso.tech) para registros y votos.
- [Claude API](https://platform.claude.com) para la estimación de daños.
- [Resend](https://resend.com) para el correo con el enlace de votación
  (opcional: si no está configurado, el enlace se muestra en pantalla).

## Desarrollo

```sh
pnpm install
cp .env.example .env   # completa las variables
pnpm dev
```

## Variables de entorno

| Variable | Uso |
| --- | --- |
| `TURSO_DATABASE_URL` | URL `libsql://` de la base de datos |
| `TURSO_AUTH_TOKEN` | Token de acceso de Turso |
| `ANTHROPIC_API_KEY` | Estimador de daños con IA |
| `RESEND_API_KEY` | Envío del correo de votación (opcional) |
| `EMAIL_FROM` | Remitente verificado en Resend (por defecto `onboarding@resend.dev`) |
| `EMAIL_REPLY_TO` | Dirección personal para respuestas (opcional) |

## Despliegue en Vercel

1. Importa el repositorio en Vercel (framework: Astro, detectado
   automáticamente).
2. Configura las variables de entorno de la tabla anterior.
3. Despliega. Las tablas de la base de datos se crean solas en el primer uso.
