# Guía Definitiva de Despliegue en Tiendas (SmileAndGo)

Este documento es una guía paso a paso actualizada para compilar y subir las aplicaciones (`smileandgo-user` y `smileandgo-specialist`) a Google Play Store (Android) y App Store (iOS mediante Appflow).

---

## 1. PREPARACIÓN DE GOOGLE PLAY (ANDROID - LOCAL)

Para que Google Play acepte el archivo de tu aplicación, debe estar firmado digitalmente por un certificado que te pertenezca. Ya he configurado los proyectos para que lean estas firmas si existen.

### Paso 1: Crear los Archivos Keystore
Abre tu consola de powershell en la carpeta raíz del proyecto y ejecuta estos comandos. Te pedirán crear una contraseña (ej. elige `sonrisas2026`) y rellenar algunos datos de tu empresa.

**Para la app de Usuario:**
```powershell
keytool -genkey -v -keystore c:\Marcos\Proyectos\SmileAndGo\smileandgo-app\apps\smileandgo-user\android\upload-keystore.jks -keyalg RSA -keysize 2048 -validity 10000 -alias upload
```

**Para la app de Especialista:**
```powershell
keytool -genkey -v -keystore c:\Marcos\Proyectos\SmileAndGo\smileandgo-app\apps\smileandgo-specialist\android\upload-keystore.jks -keyalg RSA -keysize 2048 -validity 10000 -alias upload
```

### Paso 2: Crear el archivo de configuración `key.properties`
Crea un archivo llamado `key.properties` dentro de la carpeta `android` de **cada** aplicación (`apps/smileandgo-user/android/key.properties` y `apps/smileandgo-specialist/android/key.properties`). 

Pega lo siguiente en ambos archivos (asegúrate de poner la contraseña que usaste en el paso 1):
```properties
storePassword=tu_contraseña_aqui
keyPassword=tu_contraseña_aqui
keyAlias=upload
storeFile=upload-keystore.jks
```

*(Nota: Este archivo NO debe subirse a GitHub, es un secreto estrictamente tuyo)*

### Paso 3: Compilar los App Bundles (.aab)
En tu consola, dirígete a la carpeta de cada aplicación y compila para producción:

**Usuario:**
```powershell
cd c:\Marcos\Proyectos\SmileAndGo\smileandgo-app\apps\smileandgo-user
flutter build appbundle
```
El archivo de subida lo encontrarás en: `apps/smileandgo-user/build/app/outputs/bundle/release/app-release.aab`.

**Especialista:**
```powershell
cd c:\Marcos\Proyectos\SmileAndGo\smileandgo-app\apps\smileandgo-specialist
flutter build appbundle
```
El archivo estará en: `apps/smileandgo-specialist/build/app/outputs/bundle/release/app-release.aab`.

Sube ambos archivos `.aab` a tus respectivas fichas en el [Google Play Console](https://play.google.com/console/).

---

## 2. PREPARACIÓN APP STORE (IOS - APPFLOW)

Ya que no tienes Mac y vamos a usar **Ionic Appflow**, el único momento en el que necesitas interactuar con Apple es mediante el portal web de Apple Developer. 

*(Nota: El código de ambas aplicaciones ya cuenta con los permisos de Privacidad para Cámara, Galería y Ubicación obligatorios, lo acabo de arreglar)*.

### Paso 1: Configurar Certificados Apple
1. Accede a tu cuenta de [Apple Developer](https://developer.apple.com/).
2. Crea los **App IDs** para ambas apps:
   - `pe.smileandgo.user.smileandgoUser`
   - `pe.smileandgo.specialist.smileandgoSpecialist`
3. En la sección **Certificates, Identifiers & Profiles**, genera un **Distribution Certificate**.
4. Genera un **App Store Provisioning Profile** asociado a cada uno de tus dos App IDs.

### Paso 2: Configurar Ionic Appflow
1. Inicia sesión en **Appflow**.
2. Conecta u vincula este repositorio de GitHub a Appflow.
3. Crearás **DOS (2) Aplicaciones en el Dashboard** de Appflow, una para el Usuario y otra para el Especialista. Dado que es un monorepo, aquí viene el paso vital:
   - **Para la App de Usuario:** Ve a Settings > App root directory y ponlo como: `apps/smileandgo-user`.
   - **Para la App de Especialista:** Ve a Settings > App root directory y ponlo como: `apps/smileandgo-specialist`.
4. Ve a la pestaña **Certificates** en Appflow y sube los certificados de Apple (`.p12` y Provisioning Profiles) que obtuviste en el Paso 1.

### Paso 3: Lanzar el Build
1. Desde Appflow > Builds, escoge tu último commit desde **GitHub**.
2. Selecciona **Build for iOS (App Store)**.
3. Elige los certificados correspondientes cargados en el paso previo y dale a Construir.
4. Appflow generará directamente el archivo `.ipa`. Dependiendo de tu plan, puedes enviarlo directamente a **TestFlight** / **App Store Connect** usando las automatizaciones de Appflow.
