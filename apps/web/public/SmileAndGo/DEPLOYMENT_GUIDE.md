# Guía de Despliegue a Producción - SmileAndGo

Esta guía detalla los pasos necesarios para llevar todo el ecosistema de SmileAndGo (Backend y Frontends) a un entorno de producción.

---

## 1. Backend (smileandgo-api)

El backend está desarrollado en Deno y utiliza una base de datos PostgreSQL.

### Requisitos en el servidor (Linux VPS recomendado)
- **Deno SDK** instalado (aunque se puede usar el binario compilado).
- **PostgreSQL 14+**.
- **PM2** o **Systemd** para mantener el proceso vivo.

### Pasos de despliegue:
1.  **Preparar el entorno**:
    Crea un archivo `.env` en la raíz con las variables de producción:
    ```env
    PORT=4000
    DATABASE_URL=postgres://usuario:password@localhost:5432/smileandgo
    JWT_SECRET=tu_secreto_super_seguro
    BASE_URL=https://api.tu-dominio.com
    # Otras variables necesarias (Firebase, SMTP, etc.)
    ```
2.  **Compilar para Linux**:
    En tu máquina local (o en el CI/CD), ejecuta:
    ```bash
    deno task release
    ```
    Esto genera un archivo binario llamado `smileandgo-api`.
3.  **Subir al servidor**:
    Sube el binario y la carpeta `uploads/` (si ya tienes contenido) al servidor.
4.  **Ejecutar con PM2**:
    ```bash
    pm2 start ./smileandgo-api --name "smileandgo-api"
    ```
5.  **Configurar Reverse Proxy (Nginx)**:
    Configura Nginx para redirigir el tráfico del puerto 80/443 al puerto 4000.

---

## 2. Aplicaciones Web (Admin, Specialist, User)

Las tres aplicaciones pueden desplegarse como sitios estáticos.

### Pasos de construcción:
Navega a cada carpeta en `smileandgo-app/apps/` y ejecuta:
```bash
flutter build web --release --dart-define=BASE_URL=https://api.tu-dominio.com
```

### Hosting recomendado:
- **Firebase Hosting**, **Netlify**, **Vercel** o un servidor **Nginx/Apache** propio.
- Los archivos generados estarán en `build/web/`.

---

## 3. Aplicaciones Móviles (User & Specialist)

### Android (Google Play Store)
1.  **Versión**: Incrementa la versión en `pubspec.yaml`.
2.  **Firma**: Asegúrate de tener configurado `android/key.properties` y el archivo `.jks`.
3.  **Build**:
    ```bash
    flutter build appbundle --release --dart-define=BASE_URL=https://api.tu-dominio.com
    ```
4.  **Subida**: Sube el archivo `.aab` generado en `build/app/outputs/bundle/release/` a Google Play Console.

### iOS (App Store)
> [!IMPORTANT]
> Requiere macOS y Xcode.
1.  **Preparar**: `flutter build ios --release --dart-define=BASE_URL=https://api.tu-dominio.com`.
2.  **Firmar**: Abre `ios/Runner.xcworkspace` en Xcode y configura el "Signing & Capabilities".
3.  **Archivo**: Selecciona "Any iOS Device" y ve a **Product > Archive**.
4.  **Distribuir**: Una vez generado el archivo, presiona "Distribute App" para subirlo a App Store Connect.

---

## 4. Resumen de comandos por App

| Módulo | Comando de Producción | Destino |
| :--- | :--- | :--- |
| **API** | `deno task release` | Linux VPS / Docker |
| **App Usuario** | `flutter build appbundle` / `ios` / `web` | Stores / Hosting Web |
| **App Especialista** | `flutter build appbundle` / `ios` / `web` | Stores / Hosting Web |
| **Panel Admin** | `flutter build web` | Hosting Web |

---

## 5. Consideraciones Finales
- **CORS**: Asegúrate de que la `BASE_URL` permitida en el backend coincida con los dominios donde despliegues la web.
- **SSL**: Todas las conexiones deben ir por HTTPS en producción.
- **Base de Datos**: Realiza un backup inicial usando el archivo `backup_final_limpio.sql` proporcionado en la raíz.
