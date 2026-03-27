# Treddit

Treddit es una red social tipo microblogging/comunidades construida con **Next.js App Router + MySQL**. Permite publicar, comentar, seguir usuarios, crear comunidades, enviar mensajes privados/grupales, gestionar contenido sensible y operar un panel administrativo.

---

## 1) Stack técnico

- **Framework:** Next.js 15 (App Router)
- **UI:** React 19 + Tailwind CSS 4
- **Backend:** Route Handlers (`src/app/api/*`)
- **DB:** MySQL (`mysql2/promise`)
- **Auth:** JWT por cookie `treddit_token`
- **Validación:** Zod
- **Correo:** Nodemailer (recuperación de contraseña)

---

## 2) Arranque local

### Requisitos

- Node.js 20+
- pnpm (recomendado), npm, yarn o bun
- MySQL accesible

### Instalar dependencias

```bash
pnpm install
```

### Ejecutar en desarrollo

```bash
pnpm dev
```

Abre la URL que aparece en consola (normalmente `http://localhost:3000`).

### Build de producción

```bash
pnpm build
pnpm start
```

---

## 3) Variables de entorno

### Base de datos (obligatorias para modo real)

```env
DATABASE_HOST=127.0.0.1
DATABASE_USER=root
DATABASE_PASS=tu_password
DATABASE_NAME=treddit
DATABASE_POOL_SIZE=10
```

> Si faltan variables de DB, la app entra en modo degradado/demo para varias vistas.

### Sesión/JWT

```env
JWT_SECRET=una_clave_larga_y_segura
JWT_EXPIRES=7d
```

### URL base pública

```env
NEXT_PUBLIC_BASE_URL=https://tu-dominio.com
AUTH_BASE_URL=https://tu-dominio.com
GOOGLE_OAUTH_BASE_URL=https://tu-dominio.com
```

### Google OAuth

```env
GOOGLE_CLIENT_ID=xxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=xxxxx
GOOGLE_REDIRECT_URI=https://tu-dominio.com/api/auth/google/callback
GOOGLE_CALLBACK_URL=https://tu-dominio.com/api/auth/google/callback
```

### Correo SMTP (recuperación de contraseña)

```env
SMTP_HOST=mail.tu-dominio.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=usuario
SMTP_PASS=contraseña
MAIL_FROM="Treddit <no-reply@tu-dominio.com>"
APP_NAME=Treddit
SMTP_VERIFY_ON_START=false
```

### Subidas de archivos (opcional)

```env
TREDDIT_UPLOAD_DIR=/ruta/absoluta/para/uploads
```

---

## 4) Qué tiene la plataforma (visión funcional completa)

## 4.1 Feed y publicaciones

- Feed principal (`/`) con:
  - barra de historias/notas,
  - compositor de publicaciones,
  - timeline con interacciones.
- Feed popular (`/popular`) y descubrimiento (`/explorar`).
- Vista de publicación individual (`/p/[id]`).
- Edición de publicación (`/p/[id]/edit`).
- Comentarios en hilo y respuestas.
- Likes en posts y comentarios.
- Reposts.
- Guardados (bookmarks).
- Encuestas (polls) con voto.
- Menú de post con acciones contextuales.
- Soporte de media y marcado de contenido sensible.

## 4.2 Cuentas y autenticación

- Registro (`/auth/registrar`).
- Login (`/auth/login`).
- Login social con Google.
- Cierre de sesión.
- Recuperación de contraseña por código (`/auth/recuperar`) vía email.
- Lectura de sesión por API (`/api/auth/me`).

## 4.3 Perfiles

- Perfil público (`/u/[username]`).
- Pestañas de perfil (posts, respuestas, guardados/likes según privacidad).
- Perfil editable (`/u/[username]/edit`).
- Redirección rápida a edición propia (`/u/me/edit`).
- Campos del perfil:
  - nickname,
  - avatar,
  - banner,
  - biografía,
  - ubicación,
  - web,
  - país de origen,
  - fecha de nacimiento,
  - post fijado.
- Configuración de privacidad:
  - mostrar likes,
  - mostrar guardados,
  - aceptar mensajes de terceros.

## 4.4 Seguir usuarios (follow/unfollow)

- Desde recomendaciones o perfil puedes seguir/dejar de seguir.
- Listas:
  - seguidores (`/u/[username]/seguidores`),
  - siguiendo (`/u/[username]/siguiendo`).
- Reglas:
  - no puedes seguirte a ti mismo,
  - requiere sesión activa.

## 4.5 Verificación de edad

- Estado consultable por API: `/api/age-verification/status`.
- Flujo del usuario (perfil > editar > sección “Verificación de edad”):
  1. Completa **fecha de nacimiento**.
  2. Selecciona **país de origen**.
  3. Sube foto de **DNI/Carnet/Pasaporte**.
  4. Marca “Enviar solicitud”.
  5. Guarda cambios.
- Validaciones:
  - si falta uno de esos 3 datos, el backend rechaza la solicitud.
- Flujo administrativo:
  - en `/admin/users` aparecen solicitudes pendientes,
  - admins pueden aprobar o rechazar,
  - al aprobar, el usuario queda `is_age_verified=1`.
- Impacto funcional:
  - el estado de edad verificada se usa para habilitar visualización de contenido sensible cuando aplica.

## 4.6 Comunidades

- Crear comunidad (`/crear`).
- Explorar comunidades (`/explorar`).
- Vista por comunidad (`/c/[slug]`).
- Unirte/salirte de comunidad.
- Reclamar administración de comunidad (si aplica por permisos).
- Ajustes de comunidad para gestores/admin.
- Chat interno por comunidad (`/api/communities/[id]/chat`).

## 4.7 Mensajería

- Bandeja (`/mensajes`).
- Conversación directa (`/mensajes/[username]`).
- Grupos (`/mensajes/grupos/[id]`).
- Funciones:
  - enviar texto,
  - adjuntos (imagen/audio/video/archivo),
  - responder mensajes,
  - reaccionar con emoji,
  - marcar leído/no leído,
  - ocultar conversaciones,
  - previsualizaciones y objetivos para compartir.

## 4.8 Notificaciones y descubrimiento

- Centro de notificaciones (`/notificaciones`).
- Tipos comunes: follow, like, repost, mención, reply, anuncios.
- Recomendaciones de usuarios (`/api/recommendations/users`).
- Tendencias/tags en sidebar.
- Búsqueda (`/buscar`) y sección gente (`/gente`).

## 4.9 Administración

Ruta base: `/admin`.

Módulos:

- `/admin/users`: gestión de usuarios, verificación de cuentas y verificación de edad.
- `/admin/posts`: moderación de posts.
- `/admin/communities`: gestión de comunidades.
- `/admin/groups`: moderación de grupos/mensajes.
- `/admin/anuncios`: gestión de anuncios.
- `/admin/series`: búsqueda/preview de series (integración Kitsu API).

---

## 5) Cómo hacer tareas típicas

## 5.1 Seguir a alguien

1. Inicia sesión.
2. Entra a su perfil (`/u/usuario`) o ve sugerencias en el sidebar.
3. Pulsa **Seguir**.
4. Para revertir, vuelve a pulsar (estado **Siguiendo** → **Dejar de seguir** al hover).

## 5.2 Verificar edad paso a paso

1. Abre `/u/me/edit` (redirige a tu editor y foco en `#age-verification`).
2. En “Verificación de edad” carga documento válido.
3. Completa fecha de nacimiento y país de origen.
4. Activa la casilla de solicitud.
5. Guarda cambios.
6. Espera aprobación de admin.
7. Consulta estado desde UI o por `/api/age-verification/status`.

## 5.3 Recuperar contraseña

1. Ve a `/auth/recuperar`.
2. Solicita código.
3. Revisa correo (SMTP configurado).
4. Introduce código y nueva contraseña.

## 5.4 Crear comunidad

1. Ve a `/crear`.
2. Define nombre/slug y opciones.
3. Publica.
4. Administra desde la vista de comunidad y/o panel admin.

---

## 6) APIs principales (resumen)

- Auth: `/api/auth/*`
- Posts: `/api/posts`, `/api/posts/[id]`, `/api/posts/[id]/comments`, `/api/posts/repost`, `/api/posts/saved`
- Comentarios: `/api/comments`
- Likes: `/api/likes/post`, `/api/likes/comment`
- Follows: `/api/follows`
- Perfil: `/api/profile`, `/api/profile/replies`
- Edad: `/api/age-verification/status`
- Comunidades: `/api/communities/*`
- Mensajes: `/api/messages/*`
- Notificaciones: `/api/notifications`
- Descubrimiento: `/api/discovery`, `/api/recommendations/users`
- Uploads: `/api/upload`, `/api/upload/[...path]`
- Admin: `/api/admin/*`

---

## 7) Problemas comunes y solución

## 7.1 Error 400 con Google OAuth (`invalid_request`)

Revisa que:

1. `GOOGLE_CLIENT_ID` sea de tipo **Web application**.
2. En Google Cloud Console esté autorizada exactamente:
   - `https://tu-dominio.com/api/auth/google/callback`
3. `GOOGLE_REDIRECT_URI` coincida al 100% con esa URI.
4. Si OAuth está en **Testing**, agrega el usuario como **Test user**.

Prioridad de resolución de callback/base URL en backend:

1. `GOOGLE_REDIRECT_URI` o `GOOGLE_CALLBACK_URL`
2. `GOOGLE_OAUTH_BASE_URL` o `AUTH_BASE_URL`
3. `NEXT_PUBLIC_BASE_URL`
4. headers/proxy
5. fallback final: `https://treddit.com`

## 7.2 No llega correo de recuperación

- Verifica credenciales SMTP.
- Revisa firewall/puerto (587/465).
- Comprueba `MAIL_FROM` válido para tu proveedor.
- Usa `SMTP_VERIFY_ON_START=true` si quieres validar transporte al iniciar.

---

## 8) Convivencia básica recomendada

- Habla con respeto.
- Evita insultos y escalamiento de conflictos.
- Advierte antes de publicar contenido sensible.
- Usa bloqueo/reportes ante acoso.
- No compartas datos privados de terceros.

---

## 9) Scripts disponibles

```bash
pnpm dev     # desarrollo
pnpm build   # build producción
pnpm start   # correr build
pnpm lint    # lint
```

---

## 10) Notas finales

Si vas a desplegar en producción, prioriza:

- `JWT_SECRET` robusto,
- cookies seguras en HTTPS,
- backups de MySQL,
- permisos de admin mínimos,
- monitoreo de colas/carga de DB,
- almacenamiento seguro para archivos subidos.

