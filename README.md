This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open the URL shown by the development server in your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.


## Configuración de redirección para login con Google

Si después de autenticar con Google te redirige a un dominio incorrecto, define explícitamente estas variables de entorno:

```
# URL base pública de tu app (prioridad para OAuth)
GOOGLE_OAUTH_BASE_URL=https://tu-dominio.com

# Alias soportado (más genérico)
AUTH_BASE_URL=https://tu-dominio.com

# Callback final exacto de Google (máxima prioridad)
GOOGLE_REDIRECT_URI=https://tu-dominio.com/api/auth/google/callback

# Alias soportado para la callback
GOOGLE_CALLBACK_URL=https://tu-dominio.com/api/auth/google/callback
```

Prioridad usada por el backend:

1. `GOOGLE_REDIRECT_URI` o `GOOGLE_CALLBACK_URL` (callback completa).
2. `GOOGLE_OAUTH_BASE_URL` o `AUTH_BASE_URL` (origen base).
3. `NEXT_PUBLIC_BASE_URL`.
4. Detección automática por headers/proxy.

Si no encuentra nada válido, cae en `https://treddit.com`.


## Solución rápida: Error 400 `invalid_request` con Google

Si Google muestra *"You can't sign in to this app because it doesn't comply with Google's OAuth 2.0 policy"*, revisa:

1. `GOOGLE_CLIENT_ID` debe ser un Client ID de tipo **Web application** (`*.apps.googleusercontent.com`).
2. En Google Cloud Console, la URI autorizada debe incluir exactamente:
   - `https://tu-dominio.com/api/auth/google/callback`
3. En tu `.env`, define `GOOGLE_REDIRECT_URI` con esa misma URL exacta.
4. Si la app OAuth está en modo **Testing**, agrega el correo del usuario como **Test user** o publica la app.

La ruta `/api/auth/google/start` ahora redirige a `/auth/login` con un mensaje de configuración cuando detecta una configuración inválida.

## Configuración de correo para recuperación de contraseña

Para que la función de recuperación por código funcione necesitas configurar un servidor SMTP mediante variables de entorno:

```
SMTP_HOST=mail.tu-dominio.com
SMTP_PORT=587
SMTP_SECURE=false # o true si usas 465
SMTP_USER=usuario
SMTP_PASS=contraseña
MAIL_FROM="Treddit <no-reply@tu-dominio.com>"
```

Opcionalmente puedes definir `APP_NAME` y `NEXT_PUBLIC_BASE_URL` para personalizar los mensajes enviados al usuario.

> Nota: la verificación activa de SMTP (`transporter.verify`) se desactiva por defecto para evitar errores en entornos sin shell del sistema (`/bin/sh`).
> Si quieres forzarla al iniciar, define `SMTP_VERIFY_ON_START=true`.
