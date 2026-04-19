🛠️ Especificaciones Técnicas de Despliegue - SmileAndGo
1. Entorno de Servidor
SO: Linux (Ubuntu/Debian) con acceso root.

Web Server: Nginx (actuando como Reverse Proxy con terminación SSL).

SSL: Gestionado por Certbot (Let's Encrypt).

Rutas de Archivos:

API (Deno): /var/www/smileandgo.pe/api

Frontend (App): /var/www/smileandgo.pe/app (Directorio estático).

Config Nginx: /etc/nginx/sites-available/

2. Capa de API (Backend - Deno)
Runtime: Deno (Versión 1.x o 2.x).

Método de Ejecución: Binario compilado de forma autónoma.

Comando de compilación: deno compile --allow-all --output smileandgo-api main.ts

Nombre del binario: smileandgo-api

Gestión de Procesos: Systemd Service (smileandgo.service).

Puerto interno: 4000.

Variables de Entorno: Cargadas desde archivo .env en el directorio de trabajo.

Configuración del Servicio Systemd:

Ini, TOML
[Service]
WorkingDirectory=/var/www/smileandgo.pe/api
ExecStart=/var/www/smileandgo.pe/api/smileandgo-api
Restart=on-failure
RestartSec=60
3. Capa de Frontend (Web App)
Build Tool: Bun (Package Manager).

Tipo de Despliegue: SPA (Single Page Application) servida como archivos estáticos.

Configuración Crítica de Nginx:

Nginx
location / {
    try_files $uri $uri/ /index.html;
}
4. Base de Datos (PostgreSQL)
Motor: PostgreSQL 16/17/18.

Acceso: Localhost (puerto 5432 o 54322) o Supabase remoto.

Autenticación: Vía DATABASE_URL en el .env.

Usuario de App: app_smileandgo (requiere permisos de Superuser para migraciones locales).

5. Flujo de Proxy (Nginx)
Dominio API: api.smileandgo.pe -> Proxy a 127.0.0.1:4000.

CORS: Configurado mediante un map en Nginx para aceptar solo subdominios de smileandgo.pe y medandgo.pe.

Límite de Carga: client_max_body_size 10M;.