# Historias de Usuario: Llaqta Fest

## 1. Landing Page y Venta
**Como** usuario interesado en el Llaqta Fest,
**Quiero** poder ingresar mi DNI en una landing page,
**Para** comprar mi entrada de forma rápida y segura.

**Criterios de Aceptación:**
- Formulario de captura de DNI y Correo Electrónico.
- Los datos deben persistirse en el sistema como una compra pendiente.
- Diseño visual premium y festivo.

## 2. Proceso de Pago (Yape)
**Como** comprador,
**Quiero** realizar mi pago a través de Yape,
**Para** concretar la transacción usando mi billetera digital preferida.

**Criterios de Aceptación:**
- Interfaz de simulación de pago por Yape.
- Opción de ingresar datos de validación (ej. número de teléfono/OTP).
- Confirmación inmediata al usuario de que el pago ha sido procesado.

## 3. Entrega de Entrada y QR
**Como** comprador con pago confirmado,
**Quiero** recibir mi entrada por correo electrónico con un código QR único,
**Para** poder presentarla el día del evento.

**Criterios de Aceptación:**
- El sistema genera un token/hash QR único por cada entrada.
- Envío automático de correo electrónico al finalizar el pago.
- El correo debe contener el código QR visualmente.

## 4. Validación en Backoffice (Escaneo)
**Como** personal del evento (Admin),
**Quiero** escanear el código QR de un asistente desde el backoffice,
**Para** validar su identidad y permitirle el ingreso.

**Criterios de Aceptación:**
- Interfaz de escáner usando la cámara del dispositivo.
- Al escanear, el sistema debe mostrar el DNI asociado al QR.
- El sistema debe verificar que la entrada no haya sido usada previamente.

## 5. Control de Unicidad
**Como** organizador,
**Quiero** que una entrada quede inutilizable después de su primera validación,
**Para** evitar duplicaciones o fraude.

**Criterios de Aceptación:**
- El estado del ticket cambia a "Validado" inmediatamente tras el escaneo.
- Escaneos posteriores del mismo QR deben mostrar un error de "Entrada ya utilizada".

## 6. Registro y Estadísticas
**Como** administrador del sistema,
**Quiero** tener un registro de todas las compras, invitados y QRs utilizados,
**Para** llevar el control total del evento.

**Criterios de Aceptación:**
- Lista detallada de todas las transacciones.
- Dashboard con estadísticas: Total de ventas, Invitados validados, Entradas pendientes.
