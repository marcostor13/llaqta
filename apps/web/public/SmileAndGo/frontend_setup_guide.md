# Guía para levantar los frentes (SmileAndGo)

El proyecto cuenta con tres aplicaciones frontend desarrolladas en Flutter, ubicadas en `smileandgo-app/apps/`.

## Requisitos Previos

1. **Flutter SDK**: Asegúrate de tener Flutter instalado y configurado en tu sistema (`flutter doctor`).
2. **Backend**: El backend (`smileandgo-api`) debe estar corriendo (`deno task dev`).

## Pasos para levantar las aplicaciones

Puedes levantar cualquiera de las tres aplicaciones siguiendo estos pasos:

### 1. Entrar al directorio de la aplicación
Abre una terminal y navega a la carpeta de la app que desees:

- **Admin**: `cd smileandgo-app/apps/smileandgo-admin`
- **Especialista**: `cd smileandgo-app/apps/smileandgo-specialist`
- **Usuario**: `cd smileandgo-app/apps/smileandgo-user`

### 2. Obtener dependencias
Ejecuta el siguiente comando para descargar los paquetes necesarios:
```bash
flutter pub get
```

### 3. Ejecutar la aplicación
Para correr la aplicación en el navegador (Chrome):
```bash
flutter run -d chrome
```
*Si deseas correrla en un emulador o dispositivo físico, asegúrate de tenerlo conectado y usa `flutter run`.*

## Estructura de Proyectos
- `smileandgo-admin`: Panel de administración.
- `smileandgo-specialist`: Aplicación para odontólogos/especialistas.
- `smileandgo-user`: Aplicación para pacientes/usuarios.

> [!NOTE]
> Si es la primera vez que configuras el proyecto, asegúrate de revisar el archivo `.env.example` en la raíz de `smileandgo-app` y crear un archivo `.env` con las claves de API correspondientes (Google Maps, etc.).


deno run dev